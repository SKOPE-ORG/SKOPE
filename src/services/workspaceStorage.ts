import {
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
  type Workspace,
} from '../types/workspace'
import type { WorkspaceTabGroupLink } from '../types/tabGroup'

const STORAGE_KEY = 'skope.workspaceState.v1'
const SCHEMA_VERSION = 1

export function currentTimestamp(): number {
  return Date.now()
}

interface WorkspaceDocument {
  schemaVersion: number
  workspaces: Workspace[]
  tabGroupLinks?: WorkspaceTabGroupLink[]
}

export interface WorkspaceState {
  workspaces: Workspace[]
  tabGroupLinks: WorkspaceTabGroupLink[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWorkspace(value: unknown): value is Workspace {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    typeof value.icon === 'string' &&
    WORKSPACE_ICONS.includes(value.icon as (typeof WORKSPACE_ICONS)[number]) &&
    typeof value.color === 'string' &&
    WORKSPACE_COLORS.some((color) => color.value === value.color) &&
    typeof value.order === 'number' &&
    Number.isFinite(value.order) &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === 'number' &&
    Number.isFinite(value.updatedAt) &&
    typeof value.collapsed === 'boolean' &&
    Array.isArray(value.tabGroupIds) &&
    value.tabGroupIds.every((id) => typeof id === 'string')
  )
}

function isTabGroupLink(value: unknown): value is WorkspaceTabGroupLink {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.workspaceId === 'string' &&
    value.workspaceId.length > 0 &&
    typeof value.fingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(value.fingerprint) &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === 'number' &&
    Number.isFinite(value.updatedAt) &&
    (value.colorMode === undefined || value.colorMode === 'workspace' || value.colorMode === 'chrome')
  )
}

function localStorageArea(): chrome.storage.LocalStorageArea {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    throw new Error('Chrome local storage is unavailable. Open the installed SKOPE extension to manage workspaces.')
  }

  return chrome.storage.local
}

function parseDocument(value: unknown): WorkspaceState {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION || !Array.isArray(value.workspaces)) {
    throw new Error('Saved workspace data has an unsupported format. Existing data was left untouched.')
  }

  const workspaces = value.workspaces
  if (!workspaces.every(isWorkspace)) {
    throw new Error('Saved workspace data could not be read. Existing data was left untouched.')
  }

  const ids = new Set(workspaces.map((workspace) => workspace.id))
  if (ids.size !== workspaces.length) {
    throw new Error('Saved workspace data contains duplicate IDs. Existing data was left untouched.')
  }

  const storedLinks = value.tabGroupLinks === undefined ? [] : value.tabGroupLinks
  if (!Array.isArray(storedLinks) || !storedLinks.every(isTabGroupLink)) {
    throw new Error('Saved tab group links could not be read. Existing data was left untouched.')
  }

  const linkIds = new Set(storedLinks.map((link) => link.id))
  if (linkIds.size !== storedLinks.length) {
    throw new Error('Saved tab group links contain duplicate IDs. Existing data was left untouched.')
  }

  const workspacesById = new Map(workspaces.map((workspace) => [workspace.id, workspace]))
  const linksAreConsistent = storedLinks.every((link) =>
    workspacesById.get(link.workspaceId)?.tabGroupIds.includes(link.id),
  )
  if (!linksAreConsistent) {
    throw new Error('Saved tab group links do not match their workspaces. Existing data was left untouched.')
  }

  return {
    workspaces: [...workspaces].sort((first, second) => first.order - second.order),
    tabGroupLinks: storedLinks,
  }
}

export async function loadWorkspaceState(): Promise<WorkspaceState> {
  const stored = await localStorageArea().get(STORAGE_KEY)
  const document = stored[STORAGE_KEY]

  if (document === undefined) return { workspaces: [], tabGroupLinks: [] }
  return parseDocument(document)
}

export async function loadWorkspaces(): Promise<Workspace[]> {
  return (await loadWorkspaceState()).workspaces
}

export async function saveWorkspaceState(
  workspaces: Workspace[],
  tabGroupLinks: WorkspaceTabGroupLink[],
): Promise<void> {
  if (!workspaces.every(isWorkspace)) {
    throw new Error('Workspace data is invalid and was not saved.')
  }

  const ids = new Set(workspaces.map((workspace) => workspace.id))
  if (ids.size !== workspaces.length) {
    throw new Error('Workspace IDs must be unique. Changes were not saved.')
  }

  if (!tabGroupLinks.every(isTabGroupLink)) {
    throw new Error('Workspace tab group links are invalid and were not saved.')
  }

  const linkIds = new Set(tabGroupLinks.map((link) => link.id))
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]))
  if (
    linkIds.size !== tabGroupLinks.length ||
    !tabGroupLinks.every((link) => workspaceById.get(link.workspaceId)?.tabGroupIds.includes(link.id))
  ) {
    throw new Error('Workspace tab group links must be unique and reference their workspace.')
  }

  const document: WorkspaceDocument = {
    schemaVersion: SCHEMA_VERSION,
    workspaces: [...workspaces].sort((first, second) => first.order - second.order),
    tabGroupLinks,
  }

  await localStorageArea().set({ [STORAGE_KEY]: document })
}

export async function saveWorkspaces(workspaces: Workspace[]): Promise<void> {
  const { tabGroupLinks } = await loadWorkspaceState()
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]))
  const preservedLinks = tabGroupLinks.filter((link) =>
    workspaceById.get(link.workspaceId)?.tabGroupIds.includes(link.id),
  )
  await saveWorkspaceState(workspaces, preservedLinks)
}
