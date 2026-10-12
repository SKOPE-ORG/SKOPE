import { queryChromeTabGroups, ungroupChromeTabGroup } from './chromeTabGroups'
import { loadWorkspaceState, saveWorkspaceState, currentTimestamp, type WorkspaceState } from './workspaceStorage'
import { loadWorkspaceGroupBindings, forgetWorkspaceGroupBindings } from './workspaceGroupSession'
import { resolveWorkspaceTabGroupLinks } from './workspaceTabGroups'

/** Delete saved records only after every identifiable active group has been ungrouped. */
export async function deleteWorkspaceAndUngroup(
  workspaceId: string,
  runtimeBindings: Record<string, string> = {},
): Promise<WorkspaceState> {
  const saved = await loadWorkspaceState()
  const workspace = saved.workspaces.find((item) => item.id === workspaceId)
  if (!workspace) throw new Error('That Workspace no longer exists. Refresh and try again.')
  const [live, sessionBindings] = await Promise.all([
    queryChromeTabGroups('all'), loadWorkspaceGroupBindings(),
  ])
  const bindings = resolveWorkspaceTabGroupLinks(
    live.groups, saved.workspaces, saved.tabGroupLinks, { ...runtimeBindings, ...sessionBindings },
  )
  const linkById = new Map(saved.tabGroupLinks.map((link) => [link.id, link]))
  const targetLinks = saved.tabGroupLinks.filter((link) => link.workspaceId === workspaceId)
  const resolvedIds = new Set(Object.values(bindings))
  const ambiguous = targetLinks.some((link) => !resolvedIds.has(link.id) &&
    live.groups.some((group) => group.fingerprint === link.fingerprint && !bindings[String(group.id)]))
  if (ambiguous) {
    throw new Error('Some linked groups have identical saved signatures. Reconnect them in their Chrome windows before deleting; no groups were changed.')
  }
  const targets = live.groups.filter((group) => linkById.get(bindings[String(group.id)])?.workspaceId === workspaceId)
  const results = await Promise.allSettled(targets.map(async (group) => {
    const latest = await loadWorkspaceState()
    const link = latest.tabGroupLinks.find((item) => item.id === bindings[String(group.id)])
    if (!link || link.workspaceId !== workspaceId) {
      throw new Error('A group was reassigned during deletion. Retry with the latest Workspace data.')
    }
    await ungroupChromeTabGroup(group.id)
  }))
  const failed = results.filter((result) => result.status === 'rejected')
  if (failed.length > 0) {
    throw new Error(`${failed.length} of ${targets.length} Chrome group(s) could not be ungrouped. Tabs remain open and the Workspace was kept. Retry deletion to finish.`)
  }
  const latest = await loadWorkspaceState()
  const latestWorkspace = latest.workspaces.find((item) => item.id === workspaceId)
  if (!latestWorkspace) return latest
  if (latestWorkspace.tabGroupIds.length !== workspace.tabGroupIds.length ||
    latestWorkspace.tabGroupIds.some((id) => !workspace.tabGroupIds.includes(id))) {
    throw new Error('Workspace connections changed during deletion. Its saved records were kept; retry deletion.')
  }
  const deletedLinkIds = latest.tabGroupLinks.filter((link) => link.workspaceId === workspaceId).map((link) => link.id)
  await forgetWorkspaceGroupBindings(deletedLinkIds)
  const now = currentTimestamp()
  const next = {
    workspaces: latest.workspaces.filter((item) => item.id !== workspaceId)
      .map((item, order) => item.order === order ? item : { ...item, order, updatedAt: now }),
    tabGroupLinks: latest.tabGroupLinks.filter((link) => link.workspaceId !== workspaceId),
  }
  try {
    await saveWorkspaceState(next.workspaces, next.tabGroupLinks)
  } catch {
    throw new Error('Chrome groups were ungrouped, but Workspace records could not be saved. Tabs remain open; retry deletion.')
  }
  return next
}
