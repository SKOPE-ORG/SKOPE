import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const directory = await mkdtemp(join(tmpdir(), 'skope-components-'))
after(() => rm(directory, { recursive: true }))
const modules = ['components/WorkspaceRow', 'components/TabGroupCard', 'components/WorkspaceDialogs',
  'components/AddTabGroupDialog', 'hooks/useModalDialog', 'types/workspace', 'types/tabGroup',
  'services/workspaceGroupColors', 'services/errors']
for (const module of modules) {
  const extension = module.startsWith('components/') ? 'tsx' : 'ts'
  const source = await readFile(new URL(`../src/${module}.${extension}`, import.meta.url), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText.replace(/from (['"])([^'"]+)\1/g, (_, quote, name) =>
    `from ${quote}${name.startsWith('.') ? name + '.js' : pathToFileURL(require.resolve(name)).href}${quote}`)
  const target = join(directory, `${module}.js`)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, output)
}
await writeFile(join(directory, 'package.json'), '{"type":"module"}')
const load = (name) => import(pathToFileURL(join(directory, `${name}.js`)))
const { WorkspaceRow } = await load('components/WorkspaceRow')
const { TabGroupCard } = await load('components/TabGroupCard')
const { WorkspaceDialog, DeleteWorkspaceDialog } = await load('components/WorkspaceDialogs')
const { AddTabGroupDialog } = await load('components/AddTabGroupDialog')
const { getErrorMessage } = await load('services/errors')
const workspace = { id: 'workspace', name: 'Project', icon: '◈', color: '#4385E5', collapsed: false, tabGroupIds: [] }
const noop = () => {}
const render = (component, props) => renderToStaticMarkup(createElement(component, props))

test('Workspace row keeps selection, collapse controls and Add Group in the empty state', () => {
  const props = { workspace, groups: [], colorModes: {}, index: 0, total: 1, active: true, disabled: false }
  const html = render(WorkspaceRow, props)
  assert.match(html, /aria-pressed="true"/)
  assert.match(html, /aria-expanded="true"/)
  assert.match(html, /aria-controls="([^"]+)"/)
  const id = html.match(/aria-controls="([^"]+)"/)[1]
  assert(html.includes(`id="${id}"`))
  assert.match(html, /Add Tab Group/)
  assert(!render(WorkspaceRow, { ...props, workspace: { ...workspace, collapsed: true } }).includes('Add Tab Group'))
})

test('group card retains actual Chrome color, count, unassign and Ungroup trigger', () => {
  const html = render(TabGroupCard, { group: { id: 10, title: 'Chrome group', color: 'purple', tabs: [{ id: 1 }, { id: 2 }] }, onRemove: noop, onUngroup: noop, onActivateTab: noop, colorMode: 'chrome' })
  assert.match(html, /Chrome group/)
  assert.match(html, /2 tabs/)
  assert.match(html, /Unassign/)
  assert.match(html, /Keeps Chrome color/)
  assert.match(html, /aria-expanded="false"/)
})

test('Workspace dialogs preserve name validation and deletion safety notice while saving', () => {
  const edit = render(WorkspaceDialog, { workspace, saving: false, onSave: noop, onCancel: noop })
  assert.match(edit, /maxLength="40"/)
  assert.match(edit, /required=""/)
  const remove = render(DeleteWorkspaceDialog, { workspace, saving: true, onCancel: noop, onDelete: noop })
  assert.match(remove, /열린 탭은 유지됩니다/)
  assert.match(remove, /Deleting…/)
  assert.match(remove, /disabled=""/)
})

test('Add Group dialog keeps empty Chrome state and preserve-color policy', () => {
  const html = render(AddTabGroupDialog, { workspace, groups: [], ungroupedTabs: [], windowId: 1,
    loading: false, saving: false, assignedWorkspaceIdsByGroup: {}, workspaceNamesById: {},
    assignedColorModesByGroup: {}, onRetry: noop, onCancel: noop, onAssign: noop, onCreate: noop })
  assert.match(html, /Keep current Chrome color/)
  assert.match(html, /Add Tab Group/)
})

test('shared errors preserve API details and use context-specific fallbacks', () => {
  assert.equal(getErrorMessage(new Error('Chrome unavailable')), 'Chrome unavailable')
  assert.equal(getErrorMessage(null, 'Could not add this tab group.'), 'Could not add this tab group.')
})
