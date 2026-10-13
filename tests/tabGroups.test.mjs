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
  'services/workspaceGroupColors',
  'services/workspaceGroupSession', 'services/workspaceDeletion',
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
const { queryChromeTabGroups, subscribeToChromeTabGroupChanges, createChromeTabGroup, updateChromeTabGroupColor, ungroupChromeTabGroup } = await import(pathToFileURL(join(directory, 'services/chromeTabGroups.js')))
const { ChromeTabGroupSync } = await import(pathToFileURL(join(directory, 'services/chromeTabGroupSync.js')))
const { resolveWorkspaceTabGroupLinks } = await import(pathToFileURL(join(directory, 'services/workspaceTabGroups.js')))
const { loadWorkspaceState, saveWorkspaceState } = await import(pathToFileURL(join(directory, 'services/workspaceStorage.js')))
const { workspaceColorToChromeColor, getWorkspaceGroupColorUpdates } = await import(pathToFileURL(join(directory, 'services/workspaceGroupColors.js')))
const { deleteWorkspaceAndUngroup } = await import(pathToFileURL(join(directory, 'services/workspaceDeletion.js')))
const { loadWorkspaceGroupBindings, rememberWorkspaceGroupBindings } = await import(pathToFileURL(join(directory, 'services/workspaceGroupSession.js')))
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

test('every Workspace palette maps to a supported Chrome color, including violet/purple and rose/pink', () => {
  const cases = [['#64748B', 'grey'], ['#4385E5', 'blue'], ['#2A9D8F', 'cyan'], ['#D79232', 'orange'], ['#D45C7C', 'pink'], ['#7655D7', 'purple']]
  for (const [hex, namedColor] of cases) assert.equal(workspaceColorToChromeColor(hex), namedColor)
  assert.equal(new Set(cases.map(([hex]) => workspaceColorToChromeColor(hex))).size, 6)
})

test('new Chrome groups receive distinct mapped colors rather than a fixed blue default', async () => {
  const updates = []
  mockChrome([], [tab(1, -1)])
  globalThis.chrome.tabs.group = async () => 100 + updates.length
  globalThis.chrome.tabGroups.update = async (id, changes) => { updates.push({ id, ...changes }) }
  for (const color of ['#7655D7', '#4385E5', '#D45C7C']) {
    await createChromeTabGroup([1], 1, 'QA', workspaceColorToChromeColor(color))
  }
  assert.deepEqual(updates.map((item) => item.color), ['purple', 'blue', 'pink'])
})

const violetWorkspace = { ...workspace, color: '#7655D7' }
const followingLinks = [{ ...links[0], colorMode: 'workspace' }]

test('legacy and keep-Chrome links never produce automatic recolor operations', () => {
  for (const records of [links, [{ ...links[0], colorMode: 'chrome' }]]) {
    assert.deepEqual(getWorkspaceGroupColorUpdates([violetWorkspace], records, [group()], { 10: 'link-uuid' }), [])
  }
})

test('Workspace edits recolor only explicitly following live groups and preserve other user groups', () => {
  const dataBefore = structuredClone({ workspace: violetWorkspace, links: followingLinks })
  assert.deepEqual(getWorkspaceGroupColorUpdates([violetWorkspace], followingLinks, [group(), group(88)], { 10: 'link-uuid' }), [
    { groupId: 10, linkId: 'link-uuid', color: 'purple' },
  ])
  assert.deepEqual({ workspace: violetWorkspace, links: followingLinks }, dataBefore)
  assert.deepEqual(getWorkspaceGroupColorUpdates([{ ...violetWorkspace, color: '#D45C7C' }], followingLinks, [group()], { 10: 'link-uuid' })[0].color, 'pink')
})

test('reassigning a following group uses the destination Workspace palette; preserve mode has no update', () => {
  const destination = { ...violetWorkspace, id: 'destination', color: '#D45C7C' }
  const moved = { ...followingLinks[0], workspaceId: destination.id }
  assert.equal(getWorkspaceGroupColorUpdates([destination], [moved], [group()], { 10: moved.id })[0].color, 'pink')
  assert.deepEqual(getWorkspaceGroupColorUpdates([destination], [{ ...moved, colorMode: 'chrome' }], [group()], { 10: moved.id }), [])
})

test('restart resolves a stored follow policy against fresh IDs and never recolors absent groups', () => {
  const freshGroups = [group(99)]
  const bindings = resolveWorkspaceTabGroupLinks(freshGroups, [violetWorkspace], followingLinks, {})
  assert.deepEqual(getWorkspaceGroupColorUpdates([violetWorkspace], followingLinks, freshGroups, bindings), [
    { groupId: 99, linkId: 'link-uuid', color: 'purple' },
  ])
  assert.deepEqual(getWorkspaceGroupColorUpdates([violetWorkspace], followingLinks, [], bindings), [])
})

test('color API writes only color and skips an already matching group', async () => {
  mockChrome([], [])
  const changes = []
  globalThis.chrome.tabGroups.get = async (id) => ({ id, color: id === 10 ? 'blue' : 'purple' })
  globalThis.chrome.tabGroups.update = async (id, data) => { changes.push({ id, data }) }
  await updateChromeTabGroupColor(10, 'purple')
  await updateChromeTabGroupColor(20, 'purple')
  assert.deepEqual(changes, [{ id: 10, data: { color: 'purple' } }])
})

test('missing group rejects color update without changing saved Workspace data', async () => {
  mockChrome([], [])
  let updates = 0
  globalThis.chrome.tabGroups.get = async () => { throw new Error('No group with id') }
  globalThis.chrome.tabGroups.update = async () => { updates++ }
  await assert.rejects(updateChromeTabGroupColor(10, 'purple'), /No group/)
  assert.equal(updates, 0)
  assert.equal(followingLinks[0].workspaceId, violetWorkspace.id)
})

test('stored color policies round-trip; legacy policies remain absent and invalid policies are rejected', async () => {
  let document, writes = 0
  globalThis.chrome = { storage: { local: {
    get: async () => ({ 'skope.workspaceState.v1': document }),
    set: async (data) => { document = structuredClone(data['skope.workspaceState.v1']); writes++ },
  } } }
  for (const colorMode of [undefined, 'chrome', 'workspace']) {
    const record = { ...links[0], ...(colorMode ? { colorMode } : {}) }
    await saveWorkspaceState([violetWorkspace], [record])
    const restored = await loadWorkspaceState()
    assert.deepEqual(restored.workspaces, [violetWorkspace])
    assert.deepEqual(restored.tabGroupLinks, [record])
  }
  await assert.rejects(saveWorkspaceState([violetWorkspace], [{ ...links[0], colorMode: 'invalid' }]), /invalid/)
  assert.equal(writes, 3)
})

async function deletionFixture() {
  const fixture = {
    groups: [10, 20, 30].map((id) => ({ id, title: `Group ${id}`, color: 'blue', windowId: id === 10 ? 1 : 2, collapsed: false })),
    tabs: [tab(1, 10), tab(2, 10), { ...tab(3, 20), windowId: 2 }, { ...tab(4, 30), windowId: 2 }, tab(5, -1)],
    session: {}, ungroupCalls: [], localWrites: 0, sessionWrites: 0,
    failures: new Set(), failSave: false, failQuery: false, failSessionCleanup: false, keepGroup: false,
  }
  const select = (query, items) => structuredClone(items.filter((item) =>
    (query.windowId === undefined || item.windowId === query.windowId) &&
    (query.groupId === undefined || item.groupId === query.groupId)))
  globalThis.chrome = {
    runtime: { id: 'test' },
    tabGroups: { TAB_GROUP_ID_NONE: -1, query: async (query) => {
      if (fixture.failQuery) throw new Error('Chrome unavailable')
      return select(query, fixture.groups)
    } },
    tabs: {
      query: async (query) => query.active ? [tab(1)] : select(query, fixture.tabs),
      ungroup: async (ids) => {
        const groupId = fixture.tabs.find((item) => item.id === ids[0]).groupId
        fixture.ungroupCalls.push([...ids])
        if (fixture.failures.has(groupId)) throw new Error('Ungroup failed')
        if (fixture.keepGroup) return
        fixture.tabs.forEach((item) => { if (ids.includes(item.id)) item.groupId = -1 })
        fixture.groups = fixture.groups.filter((item) => fixture.tabs.some((member) => member.groupId === item.id))
      },
    },
    storage: {
      local: {
        get: async () => ({ 'skope.workspaceState.v1': structuredClone(fixture.saved) }),
        set: async (data) => {
          if (fixture.failSave) throw new Error('Storage write failed')
          fixture.localWrites++
          fixture.saved = structuredClone(data['skope.workspaceState.v1'])
        },
      },
      session: {
        get: async (keys) => Object.fromEntries(Object.entries(structuredClone(fixture.session)).filter(([key]) => keys == null || keys.includes(key))),
        set: async (data) => { fixture.sessionWrites++; Object.assign(fixture.session, structuredClone(data)) },
        remove: async (keys) => {
          if (fixture.failSessionCleanup) throw new Error('Session write failed')
          keys.forEach((key) => { delete fixture.session[key] })
        },
      },
    },
  }
  const live = await queryChromeTabGroups('all')
  const target = { ...violetWorkspace, id: 'target', tabGroupIds: ['link-10', 'link-20'] }
  const other = { ...violetWorkspace, id: 'other', name: 'Keep', color: '#D45C7C', order: 1, tabGroupIds: ['link-30'] }
  fixture.saved = {
    schemaVersion: 1, workspaces: [target, other],
    tabGroupLinks: live.groups.map((item) => ({ id: `link-${item.id}`, workspaceId: item.id === 30 ? 'other' : 'target', fingerprint: item.fingerprint, createdAt: 1, updatedAt: 1, colorMode: 'workspace' })),
  }
  fixture.before = structuredClone(fixture.saved)
  return fixture
}

test('Workspace deletion ungroups all linked windows, preserves every tab and other Workspace groups', async () => {
  const f = await deletionFixture()
  const result = await deleteWorkspaceAndUngroup('target')
  assert.deepEqual(f.ungroupCalls.flat().sort(), [1, 2, 3])
  assert.equal(f.tabs.length, 5)
  assert.deepEqual(f.tabs.map((item) => item.groupId), [-1, -1, -1, 30, -1])
  assert.deepEqual((await queryChromeTabGroups('all')).groups.map((item) => item.id), [30])
  assert.deepEqual(result.workspaces.map((item) => item.id), ['other'])
  assert.equal(result.workspaces[0].name, 'Keep')
  assert.equal(result.workspaces[0].color, '#D45C7C')
  assert.deepEqual(result.tabGroupLinks, [f.before.tabGroupLinks[2]])
  assert.equal(f.localWrites, 1)
})

test('partial ungroup failure keeps local records; retry handles only remaining groups', async () => {
  const f = await deletionFixture()
  f.failures.add(20)
  await assert.rejects(deleteWorkspaceAndUngroup('target'), /1 of 2/)
  assert.deepEqual(f.saved, f.before)
  assert.deepEqual(f.groups.map((item) => item.id), [20, 30])
  assert.equal(f.localWrites, 0)
  f.failures.clear()
  await deleteWorkspaceAndUngroup('target')
  assert.equal(f.ungroupCalls.filter((ids) => ids.includes(1)).length, 1)
  assert.equal(f.tabs.length, 5)
  assert.deepEqual(f.saved.workspaces.map((item) => item.id), ['other'])
})

test('query failure aborts before Chrome mutations or local cleanup', async () => {
  const f = await deletionFixture()
  f.failQuery = true
  await assert.rejects(deleteWorkspaceAndUngroup('target'), /Chrome unavailable/)
  assert.deepEqual(f.ungroupCalls, [])
  assert.deepEqual(f.saved, f.before)
})

test('deleting saved-only references performs no Chrome mutation and preserves other live groups', async () => {
  const f = await deletionFixture()
  f.tabs.forEach((item) => { if (item.groupId === 10 || item.groupId === 20) item.groupId = -1 })
  f.groups = f.groups.filter((item) => item.id === 30)
  await deleteWorkspaceAndUngroup('target')
  assert.deepEqual(f.ungroupCalls, [])
  assert.equal(f.tabs.length, 5)
  assert.deepEqual(f.saved.workspaces.map((item) => item.id), ['other'])
  assert.deepEqual(f.groups.map((item) => item.id), [30])
})

test('local-save failure after ungrouping retains records and retries without touching tabs again', async () => {
  const f = await deletionFixture()
  f.failSave = true
  await assert.rejects(deleteWorkspaceAndUngroup('target'), /records could not be saved/)
  assert.deepEqual(f.saved, f.before)
  const calls = f.ungroupCalls.length
  f.failSave = false
  await deleteWorkspaceAndUngroup('target')
  assert.equal(f.ungroupCalls.length, calls)
  assert.equal(f.tabs.length, 5)
})

test('session cleanup failure does not remove Workspace records', async () => {
  const f = await deletionFixture()
  f.failSessionCleanup = true
  await assert.rejects(deleteWorkspaceAndUngroup('target'), /Session write failed/)
  assert.deepEqual(f.saved, f.before)
  f.failSessionCleanup = false
  await deleteWorkspaceAndUngroup('target')
  assert.deepEqual(f.saved.workspaces.map((item) => item.id), ['other'])
})

test('a successful API return that leaves a group intact cannot trigger saved-data deletion', async () => {
  const f = await deletionFixture()
  f.keepGroup = true
  await assert.rejects(deleteWorkspaceAndUngroup('target'), /could not be ungrouped/)
  assert.deepEqual(f.saved, f.before)
  assert.equal(f.groups.length, 3)
})

test('ambiguous identical group signatures abort before modifying any user group', async () => {
  const f = await deletionFixture()
  f.tabs.find((item) => item.id === 3).url = f.tabs.find((item) => item.id === 4).url
  const live = await queryChromeTabGroups('all')
  for (const item of live.groups) f.saved.tabGroupLinks.find((link) => link.id === `link-${item.id}`).fingerprint = item.fingerprint
  const before = structuredClone(f.saved)
  await assert.rejects(deleteWorkspaceAndUngroup('target'), /identical saved signatures/)
  assert.deepEqual(f.ungroupCalls, [])
  assert.deepEqual(f.saved, before)
})

test('session mappings identify changed group contents in another window and preserve other groups', async () => {
  const f = await deletionFixture()
  await rememberWorkspaceGroupBindings({ 10: 'link-10', 20: 'link-20', 30: 'link-30' })
  f.tabs.find((item) => item.id === 3).url = 'https://changed.example.test/'
  await deleteWorkspaceAndUngroup('target')
  assert.deepEqual(f.ungroupCalls.flat().sort(), [1, 2, 3])
  assert.deepEqual(await loadWorkspaceGroupBindings(), { 30: 'link-30' })
  assert.deepEqual(f.groups.map((item) => item.id), [30])
})

test('session cache preserves other windows and avoids repeated unchanged writes', async () => {
  const f = await deletionFixture()
  await rememberWorkspaceGroupBindings({ 20: 'link-20' })
  await rememberWorkspaceGroupBindings({ 10: 'link-10' })
  await rememberWorkspaceGroupBindings({ 10: 'link-10' })
  assert.equal(f.sessionWrites, 2)
  assert.deepEqual(await loadWorkspaceGroupBindings(), { 10: 'link-10', 20: 'link-20' })
  assert.deepEqual(f.saved, f.before)
  assert.ok(!JSON.stringify(f.saved).includes('groupId'))
})

test('a group reassigned before the operation is not ungrouped from its new Workspace', async () => {
  const f = await deletionFixture()
  let reads = 0
  const get = globalThis.chrome.storage.local.get
  globalThis.chrome.storage.local.get = async () => {
    if (++reads === 2) {
      f.saved.tabGroupLinks.find((link) => link.id === 'link-10').workspaceId = 'other'
      f.saved.workspaces[0].tabGroupIds = ['link-20']
      f.saved.workspaces[1].tabGroupIds.push('link-10')
    }
    return get()
  }
  await assert.rejects(deleteWorkspaceAndUngroup('target'), /could not be ungrouped/)
  assert.ok(f.groups.some((item) => item.id === 10))
  assert.ok(!f.ungroupCalls.flat().includes(1))
  assert.ok(f.saved.workspaces[1].tabGroupIds.includes('link-10'))
})

test('direct Ungroup preserves all tabs, other groups and saved Workspace records', async () => {
  const f = await deletionFixture()
  await ungroupChromeTabGroup(10)
  assert.deepEqual(f.ungroupCalls, [[1, 2]])
  assert.equal(f.tabs.length, 5)
  assert.deepEqual(f.tabs.map((item) => item.groupId), [-1, -1, 20, 30, -1])
  assert.deepEqual(f.groups.map((item) => item.id), [20, 30])
  assert.deepEqual(f.saved, f.before)
  assert.equal(f.localWrites, 0)
})

test('already removed group is a safe no-op without touching any tab or saved record', async () => {
  const f = await deletionFixture()
  await ungroupChromeTabGroup(999)
  assert.deepEqual(f.ungroupCalls, [])
  assert.equal(f.tabs.length, 5)
  assert.deepEqual(f.saved, f.before)
})

test('a tab moved to another group before Ungroup is excluded by the fresh member query', async () => {
  const f = await deletionFixture()
  f.tabs.find((item) => item.id === 2).groupId = 30
  await ungroupChromeTabGroup(10)
  assert.deepEqual(f.ungroupCalls, [[1]])
  assert.equal(f.tabs.find((item) => item.id === 2).groupId, 30)
  assert.equal(f.tabs.length, 5)
  assert.deepEqual(f.saved, f.before)
})

test('direct Ungroup API failure leaves group and saved data intact', async () => {
  const f = await deletionFixture()
  f.failures.add(10)
  await assert.rejects(ungroupChromeTabGroup(10), /Ungroup failed/)
  assert.ok(f.groups.some((item) => item.id === 10))
  assert.equal(f.tabs[0].groupId, 10)
  assert.deepEqual(f.saved, f.before)
})

test('inconsistent member query is rejected before applying changes to another group', async () => {
  const f = await deletionFixture()
  const query = globalThis.chrome.tabs.query
  globalThis.chrome.tabs.query = async (info) => info.groupId === 10
    ? [tab(1), { ...tab(2), groupId: 30 }] : query(info)
  await assert.rejects(ungroupChromeTabGroup(10), /membership changed/)
  assert.deepEqual(f.ungroupCalls, [])
  assert.deepEqual(f.saved, f.before)
})

test('Ungroup is not treated as success until the group actually disappears from Chrome', async () => {
  const f = await deletionFixture()
  f.keepGroup = true
  await assert.rejects(ungroupChromeTabGroup(10), /Chrome still reports/)
  assert.deepEqual(f.groups.map((item) => item.id), [10, 20, 30])
  assert.deepEqual(f.saved, f.before)
})

test('verified action immediately removes only its cached group even without onRemoved and rejects stale results', async (t) => {
  const pending = deferred()
  let queries = 0
  const h = harness(t, () => ++queries === 1 ? Promise.resolve(snapshot([group(), group(88)])) : pending.promise)
  await settle()
  const oldRequest = h.sync.refresh()
  h.sync.confirmGroupRemoved(10)
  assert.deepEqual(h.latest.groups.map((item) => item.id), [88])
  pending.resolve(snapshot([group(), group(88)]))
  assert.equal(await oldRequest, null)
  assert.deepEqual(h.latest.groups.map((item) => item.id), [88])
})
