export interface WorkspaceTabGroupLink {
  /** Stable SKOPE UUID referenced by Workspace.tabGroupIds. */
  id: string
  workspaceId: string
  /** SHA-256 of the tab URL/title signature used to reconnect live groups safely. */
  fingerprint: string
  createdAt: number
  updatedAt: number
}

export interface ChromeTabItem {
  /** Chrome tab ID; kept in memory only. */
  id: number
  title: string
  url?: string
  favIconUrl?: string
  active: boolean
}

export interface ChromeTabGroupSnapshot {
  /** Live API query result only; saved references must never create an active group. */
  /** Chrome group ID; kept in memory only because it is session-scoped. */
  id: number
  windowId: number
  title: string
  color: ChromeTabGroupColor
  collapsed: boolean
  tabs: ChromeTabItem[]
  fingerprint: string
}

export type ChromeTabGroupColor = `${chrome.tabGroups.Color}`

export const CHROME_TAB_GROUP_COLORS = [
  { name: 'Grey', value: 'grey', hex: '#7d8490' },
  { name: 'Blue', value: 'blue', hex: '#4385e5' },
  { name: 'Red', value: 'red', hex: '#d94b4b' },
  { name: 'Yellow', value: 'yellow', hex: '#d69a1b' },
  { name: 'Green', value: 'green', hex: '#31966c' },
  { name: 'Pink', value: 'pink', hex: '#d8588a' },
  { name: 'Purple', value: 'purple', hex: '#8754ce' },
  { name: 'Cyan', value: 'cyan', hex: '#2699b8' },
  { name: 'Orange', value: 'orange', hex: '#d9782e' },
] as const satisfies readonly { name: string; value: ChromeTabGroupColor; hex: string }[]
