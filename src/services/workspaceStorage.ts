import {
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
  type Workspace,
} from '../types/workspace'

const STORAGE_KEY = 'skope.workspaceState.v1'
const SCHEMA_VERSION = 1

export function currentTimestamp(): number {
  return Date.now()
}

interface WorkspaceDocument {
  schemaVersion: number
  workspaces: Workspace[]
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

function localStorageArea(): chrome.storage.LocalStorageArea {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    throw new Error('Chrome local storage is unavailable. Open the installed SKOPE extension to manage workspaces.')
  }

  return chrome.storage.local
}

function parseDocument(value: unknown): Workspace[] {
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

  return [...workspaces].sort((first, second) => first.order - second.order)
}

export async function loadWorkspaces(): Promise<Workspace[]> {
  const stored = await localStorageArea().get(STORAGE_KEY)
  const document = stored[STORAGE_KEY]

  if (document === undefined) return []
  return parseDocument(document)
}

export async function saveWorkspaces(workspaces: Workspace[]): Promise<void> {
  if (!workspaces.every(isWorkspace)) {
    throw new Error('Workspace data is invalid and was not saved.')
  }

  const ids = new Set(workspaces.map((workspace) => workspace.id))
  if (ids.size !== workspaces.length) {
    throw new Error('Workspace IDs must be unique. Changes were not saved.')
  }

  const document: WorkspaceDocument = {
    schemaVersion: SCHEMA_VERSION,
    workspaces: [...workspaces].sort((first, second) => first.order - second.order),
  }

  await localStorageArea().set({ [STORAGE_KEY]: document })
}
