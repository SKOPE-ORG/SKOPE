import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Use the existing TypeScript compiler and Node runner; no test dependencies.
const directory = await mkdtemp(join(tmpdir(), 'skope-tab-groups-'))
const modules = [
  'services/chromeTabGroups', 'services/chromeTabGroupSync',
  'services/workspaceTabGroups', 'services/workspaceStorage',
  'types/tabGroup', 'types/workspace',
]
for (const module of modules) {
  const source = await readFile(new URL(`../src/${module}.ts`, import.meta.url), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/from '(\.\.?\/[^']+)'/g, "from '$1.js'")
  const target = join(directory, `${module}.js`)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, output)
}
await writeFile(join(directory, 'package.json'), '{"type":"module"}')
const { queryChromeTabGroups, subscribeToChromeTabGroupChanges } = await import(pathToFileURL(join(directory, 'services/chromeTabGroups.js')))
const { ChromeTabGroupSync } = await import(pathToFileURL(join(directory, 'services/chromeTabGroupSync.js')))
const { resolveWorkspaceTabGroupLinks } = await import(pathToFileURL(join(directory, 'services/workspaceTabGroups.js')))
const { loadWorkspaceState } = await import(pathToFileURL(join(directory, 'services/workspaceStorage.js')))
after(async () => { delete globalThis.chrome; await rm(directory, { recursive: true }) })

const fingerprint = 'a'.repeat(64)
const tab = (id, groupId = 10) => ({ id, groupId, windowId: 1, active: id === 1, title: `Tab ${id}`, url: `https://example.test/${id}` })
const group = (id = 10, tabs = [tab(1), tab(2)], signature = fingerprint) => ({
  id, windowId: 1, title: 'QA', color: 'blue', collapsed: false, tabs, fingerprint: signature,
})
const snapshot = (groups = []) => ({ groups, ungroupedTabs: [], windowId: 1 })
const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}
const settle = () => new Promise((done) => setImmediate(done))
const event = () => {
  const listeners = new Set()
  return { listeners, addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn), emit: (...args) => listeners.forEach((fn) => fn(...args)) }
}
function mockChrome(groups, tabs) {
  const groupEvents = Object.fromEntries(['onCreated', 'onUpdated', 'onRemoved', 'onMoved'].map((name) => [name, event()]))
  const tabEvents = Object.fromEntries(['onCreated', 'onUpdated', 'onRemoved', 'onMoved', 'onAttached', 'onDetached', 'onActivated', 'onReplaced'].map((name) => [name, event()]))
  globalThis.chrome = {
    runtime: { id: 'test' },
    tabGroups: { ...groupEvents, TAB_GROUP_ID_NONE: -1, query: async (query) => { assert.deepEqual(query, { windowId: 1 }); return groups } },
    tabs: { ...tabEvents, query: async (query) => {
      if (query.active) { assert.deepEqual(query, { active: true, currentWindow: true }); return [tab(1)] }
      assert.deepEqual(query, { windowId: 1 }); return tabs
    } },
  }
  return { groupEvents, tabEvents }
}
function harness(t, query, onState = () => {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let changed, removed, latest, unsubscribed = false
  const sync = new ChromeTabGroupSync({
    query,
    subscribe: (onChange, onRemoved) => { changed = onChange; removed = onRemoved; return () => { unsubscribed = true } },
    onState: (state, previous) => { latest = state; onState(state, previous) },
    onStatus: () => {},
  })
  t.after(() => sync.dispose())
  sync.start()
  return { sync, change: () => changed(), remove: (id) => { removed(id); changed() }, get latest() { return latest }, get unsubscribed() { return unsubscribed } }
}

test('stale group metadata with only ungrouped tabs never becomes an active group', async () => {
  mockChrome([group()], [tab(1, -1), tab(2, -1)])
  const state = await queryChromeTabGroups()
  assert.deepEqual(state.groups, [])
  assert.equal(state.ungroupedTabs.length, 2)
})

test('one tab leaving a group keeps the actual group and remaining member', async () => {
  mockChrome([group()], [tab(1, -1), tab(2)])
  const state = await queryChromeTabGroups()
  assert.deepEqual(state.groups[0].tabs.map((item) => item.id), [2])
  assert.deepEqual(state.ungroupedTabs.map((item) => item.id), [1])
})

test('tabs referring to a missing group cannot recreate that group', async () => {
  mockChrome([], [tab(1), tab(2)])
  assert.deepEqual((await queryChromeTabGroups()).groups, [])
})

test('all group and membership events are handled and listeners are removed', () => {
  const { groupEvents, tabEvents } = mockChrome([], [])
  let changes = 0, removedId
  const unsubscribe = subscribeToChromeTabGroupChanges(() => changes++, (id) => { removedId = id })
  for (const [name, source] of Object.entries(groupEvents)) source.emit(group(name === 'onRemoved' ? 42 : 10))
  for (const [name, source] of Object.entries(tabEvents)) source.emit(1, name === 'onUpdated' ? { groupId: -1 } : {})
  assert.equal(changes, 12)
  assert.equal(removedId, 42)
  tabEvents.onUpdated.emit(1, { audible: true })
  assert.equal(changes, 12)
  unsubscribe()
  for (const source of [...Object.values(groupEvents), ...Object.values(tabEvents)]) assert.equal(source.listeners.size, 0)
})

test('onRemoved removes immediately and prevents an older query from resurrecting a group', async (t) => {
  const pending = deferred()
  let queries = 0
  const h = harness(t, () => ++queries === 1 ? Promise.resolve(snapshot([group()])) : queries === 2 ? pending.promise : Promise.resolve(snapshot()))
  await settle()
  const oldRefresh = h.sync.refresh()
  h.remove(10)
  assert.deepEqual(h.latest.groups, [])
  pending.resolve(snapshot([group()]))
  assert.equal(await oldRefresh, null)
  assert.deepEqual(h.latest.groups, [])
  t.mock.timers.tick(120)
  await settle()
  assert.deepEqual(h.latest.groups, [])
})

test('event bursts refresh within the first coalescing interval instead of indefinitely delaying', async (t) => {
  let queries = 0
  const h = harness(t, async () => { queries++; return snapshot() })
  await settle()
  h.change()
  t.mock.timers.tick(60)
  h.change()
  t.mock.timers.tick(60)
  await settle()
  assert.equal(queries, 2)
})

test('membership events invalidate an in-flight query before the next query starts', async (t) => {
  const pending = deferred()
  const h = harness(t, () => pending.promise)
  h.change()
  pending.resolve(snapshot([group()]))
  await settle()
  assert.equal(h.latest, undefined)
})

const workspace = { id: 'workspace-uuid', name: 'QA', icon: '◈', color: '#f2eefb', order: 0, createdAt: 1, updatedAt: 1, collapsed: false, tabGroupIds: ['link-uuid'] }
const links = [{ id: 'link-uuid', workspaceId: workspace.id, fingerprint, createdAt: 1, updatedAt: 1 }]

test('restored Workspace classification survives partial ungrouping while saved references survive complete removal', async (t) => {
  const savedBefore = structuredClone(links)
  let current = snapshot([group()]), bindings = {}
  const h = harness(t, async () => current, (state, previous) => {
    bindings = resolveWorkspaceTabGroupLinks(state.groups, [workspace], links,
      resolveWorkspaceTabGroupLinks(previous.groups, [workspace], links, bindings))
  })
  await settle()
  assert.equal(bindings['10'], 'link-uuid')
  current = snapshot([group(10, [tab(2)], 'b'.repeat(64))])
  h.change(); t.mock.timers.tick(120); await settle()
  assert.equal(bindings['10'], 'link-uuid')
  h.remove(10)
  assert.deepEqual(bindings, {})
  assert.deepEqual(links, savedBefore)
  assert.deepEqual(workspace.tabGroupIds, ['link-uuid'])
})

test('cold start and new browser session use only actual groups, never stored references or reused IDs', async (t) => {
  const h = harness(t, async () => snapshot())
  await settle()
  assert.deepEqual(h.latest.groups, [])
  assert.deepEqual(resolveWorkspaceTabGroupLinks([], [workspace], links, { 10: 'link-uuid' }), {})
  assert.deepEqual(resolveWorkspaceTabGroupLinks([group(10, [tab(3)], 'b'.repeat(64))], [workspace], links, {}), {})
  assert.deepEqual(resolveWorkspaceTabGroupLinks([group(99)], [workspace], links, {}), { 99: 'link-uuid' })
})

test('disposed extension context unsubscribes and cannot publish a late result', async (t) => {
  const pending = deferred()
  const h = harness(t, () => pending.promise)
  h.sync.dispose()
  pending.resolve(snapshot([group()]))
  await settle()
  assert.equal(h.latest, undefined)
  assert.equal(h.unsubscribed, true)
})

test('API failures clear active state and report an error without deleting saved storage', async () => {
  let state, status
  const sync = new ChromeTabGroupSync({ query: async () => { throw new Error('permission denied') }, onState: (next) => { state = next }, onStatus: (...next) => { status = next } })
  await sync.refresh()
  assert.deepEqual(state.groups, [])
  assert.deepEqual(status, [false, 'permission denied'])
  assert.equal(links.length, 1)
  sync.dispose()
})

test('legacy Workspace documents remain readable and are not rewritten during loading', async () => {
  const saved = { schemaVersion: 1, workspaces: [] }
  let writes = 0
  globalThis.chrome = { storage: { local: { get: async () => ({ 'skope.workspaceState.v1': saved }), set: async () => { writes++ } } } }
  assert.deepEqual(await loadWorkspaceState(), { workspaces: [], tabGroupLinks: [] })
  assert.equal(writes, 0)
  assert.deepEqual(saved, { schemaVersion: 1, workspaces: [] })
})
