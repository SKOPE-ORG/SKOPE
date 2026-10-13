export const WORKSPACE_ICONS = ['◈', '✦', '⌘', '▦', '◉', '○'] as const

export type WorkspaceIcon = (typeof WORKSPACE_ICONS)[number]

export const WORKSPACE_COLORS = [
  { name: 'Slate', value: '#64748B' },
  { name: 'Blue', value: '#4385E5' },
  { name: 'Teal', value: '#2A9D8F' },
  { name: 'Amber', value: '#D79232' },
  { name: 'Rose', value: '#D45C7C' },
  { name: 'Violet', value: '#7655D7' },
] as const

export type WorkspaceColor = (typeof WORKSPACE_COLORS)[number]['value']

export interface Workspace {
  id: string
  name: string
  icon: WorkspaceIcon
  color: WorkspaceColor
  order: number
  createdAt: number
  updatedAt: number
  collapsed: boolean
  /** Stable SKOPE tab-group link IDs; never Chrome's session group IDs. */
  tabGroupIds: string[]
}

export type WorkspaceFields = Pick<Workspace, 'name' | 'icon' | 'color'>
