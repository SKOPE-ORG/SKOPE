import type { ChromeTabGroupSnapshot, WorkspaceTabGroupLink } from '../types/tabGroup'
import type { Workspace } from '../types/workspace'

export function resolveWorkspaceTabGroupLinks(
  groups: ChromeTabGroupSnapshot[],
  workspaces: Workspace[],
  links: WorkspaceTabGroupLink[],
  runtimeBindings: Record<string, string>,
): Record<string, string> {
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id))
  const linkById = new Map(links.map((link) => [link.id, link]))
  const liveGroupIds = new Set(groups.map((group) => String(group.id)))
  const result: Record<string, string> = {}
  const usedLinkIds = new Set<string>()

  for (const [groupId, linkId] of Object.entries(runtimeBindings)) {
    const link = linkById.get(linkId)
    if (
      liveGroupIds.has(groupId) &&
      link &&
      !usedLinkIds.has(linkId) &&
      workspaceIds.has(link.workspaceId) &&
      workspaces.find((workspace) => workspace.id === link.workspaceId)?.tabGroupIds.includes(link.id)
    ) {
      result[groupId] = linkId
      usedLinkIds.add(linkId)
    }
  }

  const unresolvedGroups = groups.filter((group) => !result[String(group.id)])
  const availableLinks = links.filter(
    (link) =>
      workspaceIds.has(link.workspaceId) &&
      workspaces.find((workspace) => workspace.id === link.workspaceId)?.tabGroupIds.includes(link.id) &&
      !usedLinkIds.has(link.id),
  )
  const groupsByFingerprint = new Map<string, ChromeTabGroupSnapshot[]>()
  const linksByFingerprint = new Map<string, WorkspaceTabGroupLink[]>()

  for (const group of unresolvedGroups) {
    const matches = groupsByFingerprint.get(group.fingerprint) ?? []
    matches.push(group)
    groupsByFingerprint.set(group.fingerprint, matches)
  }
  for (const link of availableLinks) {
    const matches = linksByFingerprint.get(link.fingerprint) ?? []
    matches.push(link)
    linksByFingerprint.set(link.fingerprint, matches)
  }

  for (const [fingerprint, fingerprintGroups] of groupsByFingerprint) {
    const fingerprintLinks = linksByFingerprint.get(fingerprint) ?? []
    if (fingerprintGroups.length !== 1 || fingerprintLinks.length !== 1) continue
    result[String(fingerprintGroups[0].id)] = fingerprintLinks[0].id
    usedLinkIds.add(fingerprintLinks[0].id)
  }

  return result
}
