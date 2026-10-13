import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  currentTimestamp,
  loadWorkspaceState,
  saveWorkspaceState,
} from '../services/workspaceStorage'
import {
  activateChromeTab,
  createChromeTabGroup,
  updateChromeTabGroupColor,
  ungroupChromeTabGroup,
} from '../services/chromeTabGroups'
import { getWorkspaceGroupColorUpdates } from '../services/workspaceGroupColors'
import { resolveWorkspaceTabGroupLinks } from '../services/workspaceTabGroups'
import { loadWorkspaceGroupBindings, rememberWorkspaceGroupBindings } from '../services/workspaceGroupSession'
import { deleteWorkspaceAndUngroup } from '../services/workspaceDeletion'
import { useChromeTabGroups } from './useChromeTabGroups'
import type { Workspace, WorkspaceFields } from '../types/workspace'
import {
  type ChromeTabGroupColor,
  type ChromeTabGroupSnapshot,
  type ChromeTabItem,
  type TabGroupColorMode,
  type WorkspaceTabGroupLink,
} from '../types/tabGroup'

import { getErrorMessage } from '../services/errors'

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; workspace: Workspace }
  | { kind: 'delete'; workspace: Workspace }
  | { kind: 'add-tab-group'; workspace: Workspace }
  | null

export function useWorkspaceManager() {
  const isExtension =
    typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id && chrome.storage?.local)
  const [groupBindings, setGroupBindings] = useState<Record<string, string>>({})
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [tabGroupLinks, setTabGroupLinks] = useState<WorkspaceTabGroupLink[]>([])
  const [tabActionError, setTabActionError] = useState<string | null>(null)
  const handleChromeGroupRemoved = useCallback((groupId: number) => {
    setGroupBindings((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => id !== String(groupId)),
    ))
  }, [])
  const {
    groups: chromeGroups,
    ungroupedTabs,
    windowId: chromeWindowId,
    loading: groupsLoading,
    error: groupsError,
    refresh: refreshGroups,
    confirmGroupRemoved,
  } = useChromeTabGroups(isExtension, handleChromeGroupRemoved, (groups, previousGroups) => {
    // Preserve session mappings for other windows; prune only the visible cache.
    const next = resolveWorkspaceTabGroupLinks(
      groups, workspaces, tabGroupLinks,
      resolveWorkspaceTabGroupLinks(previousGroups, workspaces, tabGroupLinks, groupBindings),
    )
    setGroupBindings((current) => Object.keys(next).length === Object.keys(current).length &&
        Object.entries(next).every(([id, linkId]) => current[id] === linkId)
        ? current : next)
    void rememberWorkspaceGroupBindings(next).catch(() => {
      setTabActionError('Could not cache Chrome session connections. Reload SKOPE before deleting a Workspace.')
    })
  })
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [loading, setLoading] = useState(isExtension)
  const [storageReady, setStorageReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colorSyncError, setColorSyncError] = useState<string | null>(null)
  const [colorSyncAttempt, setColorSyncAttempt] = useState(0)
  const colorSyncKey = useRef('')
  const colorSyncPending = useRef(new Set<number>())
  const colorSyncMounted = useRef(false)
  const fingerprintUpdateKey = useRef('')
  const ungroupInFlight = useRef(false)
  const [ungroupingGroupId, setUngroupingGroupId] = useState<number | null>(null)

  const applyLoadedState = useCallback((loaded: Awaited<ReturnType<typeof loadWorkspaceState>>, bindings: Record<string, string>) => {
    setWorkspaces(loaded.workspaces)
    setTabGroupLinks(loaded.tabGroupLinks)
    setGroupBindings(bindings)
    setActiveWorkspaceId(loaded.workspaces[0]?.id ?? null)
    setStorageReady(true)
  }, [])

  const refreshWorkspaces = useCallback(async () => {
    if (!isExtension) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [loaded, bindings] = await Promise.all([loadWorkspaceState(), loadWorkspaceGroupBindings()])
      applyLoadedState(loaded, bindings)
    } catch (loadError) {
      setStorageReady(false)
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [isExtension, applyLoadedState])

  useEffect(() => {
    if (!isExtension) return

    let cancelled = false
    void Promise.all([loadWorkspaceState(), loadWorkspaceGroupBindings()])
      .then(([loaded, bindings]) => {
        if (cancelled) return
        applyLoadedState(loaded, bindings)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setStorageReady(false)
        setError(getErrorMessage(loadError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isExtension, applyLoadedState])

  const persistWorkspaceData = useCallback(async (
    nextWorkspaces: Workspace[],
    nextLinks: WorkspaceTabGroupLink[],
  ): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      await saveWorkspaceState(nextWorkspaces, nextLinks)
      setWorkspaces([...nextWorkspaces].sort((first, second) => first.order - second.order))
      setTabGroupLinks(nextLinks)
      setActiveWorkspaceId((current) =>
        nextWorkspaces.some((workspace) => workspace.id === current)
          ? current
          : nextWorkspaces[0]?.id ?? null,
      )
      return true
    } catch (saveError) {
      setError(getErrorMessage(saveError))
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const persistWorkspaces = useCallback(
    (next: Workspace[]): Promise<boolean> => persistWorkspaceData(next, tabGroupLinks),
    [persistWorkspaceData, tabGroupLinks],
  )

  const handleSaveWorkspace = async (fields: WorkspaceFields) => {
    if (!dialog || dialog.kind === 'delete') return

    const now = currentTimestamp()
    let next: Workspace[]
    if (dialog.kind === 'edit') {
      next = workspaces.map((workspace) =>
        workspace.id === dialog.workspace.id
          ? { ...workspace, ...fields, updatedAt: now }
          : workspace,
      )
    } else {
      next = [
        ...workspaces,
        {
          id: crypto.randomUUID(),
          ...fields,
          order: workspaces.length,
          createdAt: now,
          updatedAt: now,
          collapsed: false,
          tabGroupIds: [],
        },
      ]
    }

    if (await persistWorkspaces(next)) setDialog(null)
  }

  const handleDeleteWorkspace = async () => {
    if (!dialog || dialog.kind !== 'delete') return
    setSaving(true)
    setError(null)
    try {
      const next = await deleteWorkspaceAndUngroup(dialog.workspace.id, groupBindings)
      setWorkspaces(next.workspaces)
      setTabGroupLinks(next.tabGroupLinks)
      const remainingIds = new Set(next.tabGroupLinks.map((link) => link.id))
      setGroupBindings((current) => Object.fromEntries(
        Object.entries(current).filter(([, linkId]) => remainingIds.has(linkId)),
      ))
      setActiveWorkspaceId((current) => next.workspaces.some((item) => item.id === current)
        ? current : next.workspaces[0]?.id ?? null)
      setDialog(null)
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      try {
        const latest = await loadWorkspaceState()
        setWorkspaces(latest.workspaces)
        setTabGroupLinks(latest.tabGroupLinks)
      } catch (reloadError) {
        setError(`${getErrorMessage(deleteError)} ${getErrorMessage(reloadError)}`)
      }
    } finally {
      await refreshGroups()
      setSaving(false)
    }
  }

  const handleToggleCollapsed = (workspace: Workspace) => {
    const next = workspaces.map((item) =>
      item.id === workspace.id
        ? { ...item, collapsed: !item.collapsed, updatedAt: currentTimestamp() }
        : item,
    )
    void persistWorkspaces(next)
  }

  const handleMoveWorkspace = (workspace: Workspace, direction: -1 | 1) => {
    const ordered = [...workspaces].sort((first, second) => first.order - second.order)
    const index = ordered.findIndex((item) => item.id === workspace.id)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= ordered.length) return

    const displaced = ordered[index]
    ordered[index] = ordered[destination]
    ordered[destination] = displaced
    const now = currentTimestamp()
    const next = ordered.map((item, order) => ({ ...item, order, updatedAt: now }))
    void persistWorkspaces(next)
  }

  const resolvedGroupLinks = useMemo(
    () => resolveWorkspaceTabGroupLinks(chromeGroups, workspaces, tabGroupLinks, groupBindings),
    [chromeGroups, workspaces, tabGroupLinks, groupBindings],
  )

  const colorUpdates = useMemo(
    () => getWorkspaceGroupColorUpdates(workspaces, tabGroupLinks, chromeGroups, resolvedGroupLinks),
    [workspaces, tabGroupLinks, chromeGroups, resolvedGroupLinks],
  )

  useEffect(() => {
    colorSyncMounted.current = true
    return () => { colorSyncMounted.current = false }
  }, [])

  useEffect(() => {
    if (!storageReady || groupsLoading || groupsError || saving) return
    if (colorUpdates.length === 0) { colorSyncKey.current = ''; return }
    const key = `${colorSyncAttempt}:` + colorUpdates.map((update) => `${update.groupId}:${update.linkId}:${update.color}`).sort().join('|')
    if (colorSyncKey.current === key) return
    const pending = colorUpdates.filter((update) => !colorSyncPending.current.has(update.groupId))
    if (pending.length === 0) return
    colorSyncKey.current = key
    pending.forEach((update) => colorSyncPending.current.add(update.groupId))
    void Promise.allSettled(pending.map((update) => updateChromeTabGroupColor(update.groupId, update.color)))
      .then((results) => {
        pending.forEach((update) => colorSyncPending.current.delete(update.groupId))
        if (!colorSyncMounted.current) return
        if (colorSyncKey.current === key) {
          const failures = results.filter((result) => result.status === 'rejected')
          setColorSyncError(failures.length > 0
            ? `Workspace settings are saved, but ${failures.length} Chrome group color(s) could not be updated. Try again.`
            : null)
        }
        void refreshGroups()
      })
  }, [colorUpdates, colorSyncAttempt, groupsError, groupsLoading, refreshGroups, saving, storageReady])

  useEffect(() => {
    if (!storageReady || groupsLoading || groupsError || saving) return
    const fingerprintUpdates = chromeGroups.flatMap((group) => {
      const linkId = resolvedGroupLinks[String(group.id)]
      const link = tabGroupLinks.find((item) => item.id === linkId)
      return link && link.fingerprint !== group.fingerprint ? [{ group, link }] : []
    })
    if (fingerprintUpdates.length === 0) {
      fingerprintUpdateKey.current = ''
      return
    }

    const updateKey = fingerprintUpdates
      .map(({ group, link }) => `${group.id}:${link.id}:${group.fingerprint}`)
      .sort()
      .join('|')
    if (fingerprintUpdateKey.current === updateKey) return
    fingerprintUpdateKey.current = updateKey

    const updatedAt = currentTimestamp()
    const nextLinks = tabGroupLinks.map((link) => {
      const changed = fingerprintUpdates.find((item) => item.link.id === link.id)
      return changed ? { ...link, fingerprint: changed.group.fingerprint, updatedAt } : link
    })
    void persistWorkspaceData(workspaces, nextLinks).then((saved) => {
      if (!saved) fingerprintUpdateKey.current = ''
    })
  }, [chromeGroups, groupsError, groupsLoading, persistWorkspaceData, resolvedGroupLinks, saving, storageReady, tabGroupLinks, workspaces])

  const assignTabGroup = async (group: ChromeTabGroupSnapshot, workspaceId: string, colorMode: TabGroupColorMode) => {
    if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
      throw new Error('That workspace no longer exists. Refresh and try again.')
    }

    const existingLinkId = resolvedGroupLinks[String(group.id)]
    const existingLink = tabGroupLinks.find((link) => link.id === existingLinkId)
    const now = currentTimestamp()
    const link: WorkspaceTabGroupLink = existingLink
      ? { ...existingLink, workspaceId, colorMode, fingerprint: group.fingerprint, updatedAt: now }
      : {
          id: crypto.randomUUID(),
          workspaceId,
          colorMode,
          fingerprint: group.fingerprint,
          createdAt: now,
          updatedAt: now,
        }
    const nextLinks = existingLink
      ? tabGroupLinks.map((item) => item.id === link.id ? link : item)
      : [...tabGroupLinks, link]
    const nextWorkspaces = workspaces.map((workspace) => {
      const tabGroupIds = workspace.id === workspaceId
        ? workspace.tabGroupIds.includes(link.id) ? [...workspace.tabGroupIds] : [...workspace.tabGroupIds, link.id]
        : workspace.tabGroupIds.filter((id) => id !== link.id)
      return tabGroupIds.length === workspace.tabGroupIds.length &&
        tabGroupIds.every((id, index) => id === workspace.tabGroupIds[index])
        ? workspace
        : { ...workspace, tabGroupIds, updatedAt: now }
    })

    const groupKey = String(group.id)
    const previousBinding = groupBindings[groupKey]
    setGroupBindings((current) => ({ ...current, [groupKey]: link.id }))
    if (!await persistWorkspaceData(nextWorkspaces, nextLinks)) {
      if (previousBinding) {
        setGroupBindings((current) => ({ ...current, [groupKey]: previousBinding }))
      } else {
        setGroupBindings((current) => Object.fromEntries(
          Object.entries(current).filter(([id]) => id !== groupKey),
        ))
      }
      throw new Error('Could not save the Workspace and tab group connection.')
    }
    await rememberWorkspaceGroupBindings({ [groupKey]: link.id })
  }

  const disconnectTabGroup = async (group: ChromeTabGroupSnapshot, workspaceId: string) => {
    const linkId = resolvedGroupLinks[String(group.id)]
    if (!linkId) return
    const now = currentTimestamp()
    const nextLinks = tabGroupLinks.filter((link) => link.id !== linkId)
    const nextWorkspaces = workspaces.map((workspace) =>
      workspace.id === workspaceId
        ? { ...workspace, tabGroupIds: workspace.tabGroupIds.filter((id) => id !== linkId), updatedAt: now }
        : workspace,
    )
    if (!await persistWorkspaceData(nextWorkspaces, nextLinks)) {
      throw new Error('Could not remove the Workspace connection. The Chrome group remains open.')
    }
    setGroupBindings((current) => Object.fromEntries(
      Object.entries(current).filter(([, id]) => id !== linkId),
    ))
  }

  const removeTabGroupFromWorkspace = async (group: ChromeTabGroupSnapshot, workspaceId: string) => {
    setTabActionError(null)
    try {
      await disconnectTabGroup(group, workspaceId)
    } catch (connectionError) {
      setTabActionError(getErrorMessage(connectionError))
    }
  }

  const handleActivateTab = async (tab: ChromeTabItem) => {
    setTabActionError(null)
    try {
      await activateChromeTab(tab.id)
    } catch (activationError) {
      setTabActionError(
        getErrorMessage(activationError, 'Could not activate that Chrome tab.'),
      )
    }
  }

  const handleUngroup = async (group: ChromeTabGroupSnapshot) => {
    if (ungroupInFlight.current || saving) return
    ungroupInFlight.current = true
    setUngroupingGroupId(group.id)
    setSaving(true)
    setTabActionError(null)
    try {
      await ungroupChromeTabGroup(group.id)
      // No optimistic removal: the common service has verified Chrome's result.
      confirmGroupRemoved(group.id)
    } catch (ungroupError) {
      setTabActionError(`그룹 해제에 실패했습니다. ${getErrorMessage(ungroupError)}`)
    } finally {
      ungroupInFlight.current = false
      setUngroupingGroupId(null)
      setSaving(false)
    }
  }

  const handleCreateAndAssignGroup = async (
    workspaceId: string,
    input: { tabIds: number[]; title: string; color: ChromeTabGroupColor; colorMode: TabGroupColorMode },
  ) => {
    if (chromeWindowId === null) throw new Error('Could not determine the current Chrome window.')
    let groupId: number
    try {
      groupId = await createChromeTabGroup(input.tabIds, chromeWindowId, input.title, input.color)
    } catch (createError) {
      await refreshGroups()
      throw createError
    }
    const refreshed = await refreshGroups()
    const createdGroup = refreshed?.groups.find((group) => group.id === groupId)
    if (!createdGroup) {
      throw new Error('The Chrome group was created, but SKOPE could not read it yet. Refresh and add it again.')
    }
    await assignTabGroup(createdGroup, workspaceId, input.colorMode)
  }

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId)
  const assignedGroupsByWorkspace = useMemo(() => {
    const result = new Map<string, ChromeTabGroupSnapshot[]>()
    for (const group of chromeGroups) {
      const linkId = resolvedGroupLinks[String(group.id)]
      const link = tabGroupLinks.find((item) => item.id === linkId)
      if (!link) continue
      const groups = result.get(link.workspaceId) ?? []
      groups.push(group)
      result.set(link.workspaceId, groups)
    }
    return result
  }, [chromeGroups, resolvedGroupLinks, tabGroupLinks])
  const unassignedGroups = useMemo(
    () => chromeGroups.filter((group) => !resolvedGroupLinks[String(group.id)]),
    [chromeGroups, resolvedGroupLinks],
  )
  const groupColorModes = useMemo(() => Object.fromEntries(
    chromeGroups.flatMap((group) => {
      const link = tabGroupLinks.find((item) => item.id === resolvedGroupLinks[String(group.id)])
      return link ? [[String(group.id), link.colorMode ?? 'chrome']] : []
    }),
  ) as Record<string, TabGroupColorMode>, [chromeGroups, resolvedGroupLinks, tabGroupLinks])
  const storageStatus = !isExtension
    ? 'PREVIEW'
    : loading
      ? 'CONNECTING'
      : storageReady
        ? 'ON DEVICE'
        : 'STORAGE ERROR'

  return {
    isExtension,
    workspaces,
    tabGroupLinks,
    tabActionError,
    setTabActionError,
    activeWorkspaceId,
    setActiveWorkspaceId,
    dialog,
    setDialog,
    loading,
    storageReady,
    saving,
    error,
    colorSyncError,
    colorUpdates,
    setColorSyncAttempt,
    refreshWorkspaces,
    refreshGroups,
    groupsError,
    groupsLoading,
    chromeGroups,
    chromeWindowId,
    ungroupedTabs,
    resolvedGroupLinks,
    assignedGroupsByWorkspace,
    groupColorModes,
    unassignedGroups,
    activeWorkspace,
    storageStatus,
    handleSaveWorkspace,
    handleDeleteWorkspace,
    handleToggleCollapsed,
    handleMoveWorkspace,
    handleActivateTab,
    handleUngroup,
    ungroupingGroupId,
    removeTabGroupFromWorkspace,
    assignTabGroup,
    handleCreateAndAssignGroup,
  }
}
