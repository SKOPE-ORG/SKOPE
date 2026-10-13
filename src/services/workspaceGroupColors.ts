import type { Workspace, WorkspaceColor } from '../types/workspace'
import type { ChromeTabGroupColor, ChromeTabGroupSnapshot, WorkspaceTabGroupLink } from '../types/tabGroup'

// Chrome accepts nine named colors, not the Workspace's exact HEX value.
const CHROME_COLOR_BY_WORKSPACE: Record<WorkspaceColor, ChromeTabGroupColor> = {
  '#64748B': 'grey',
  '#4385E5': 'blue',
  '#2A9D8F': 'cyan',
  '#D79232': 'orange',
  '#D45C7C': 'pink',
  '#7655D7': 'purple',
}

export function workspaceColorToChromeColor(color: WorkspaceColor): ChromeTabGroupColor {
  return CHROME_COLOR_BY_WORKSPACE[color]
}

export interface WorkspaceGroupColorUpdate {
  groupId: number
  linkId: string
  color: ChromeTabGroupColor
}

export function getWorkspaceGroupColorUpdates(
  workspaces: Workspace[],
  links: WorkspaceTabGroupLink[],
  liveGroups: ChromeTabGroupSnapshot[],
  bindings: Record<string, string>,
): WorkspaceGroupColorUpdate[] {
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]))
  const linkById = new Map(links.map((link) => [link.id, link]))
  return liveGroups.flatMap((group) => {
    const link = linkById.get(bindings[String(group.id)])
    if (!link || link.colorMode !== 'workspace') return []
    const workspace = workspaceById.get(link.workspaceId)
    if (!workspace?.tabGroupIds.includes(link.id)) return []
    const color = workspaceColorToChromeColor(workspace.color)
    return group.color === color ? [] : [{ groupId: group.id, linkId: link.id, color }]
  })
}
