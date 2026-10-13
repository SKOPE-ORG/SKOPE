import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import './App.css'
import {
  currentTimestamp,
  loadWorkspaceState,
  saveWorkspaceState,
} from './services/workspaceStorage'
import {
  activateChromeTab,
  createChromeTabGroup,
} from './services/chromeTabGroups'
import { resolveWorkspaceTabGroupLinks } from './services/workspaceTabGroups'
import { useChromeTabGroups } from './hooks/useChromeTabGroups'
import {
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
  type Workspace,
  type WorkspaceColor,
  type WorkspaceIcon,
} from './types/workspace'
import {
  CHROME_TAB_GROUP_COLORS,
  type ChromeTabGroupColor,
  type ChromeTabGroupSnapshot,
  type ChromeTabItem,
  type WorkspaceTabGroupLink,
} from './types/tabGroup'

type WorkspaceFields = Pick<Workspace, 'name' | 'icon' | 'color'>
type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; workspace: Workspace }
  | { kind: 'delete'; workspace: Workspace }
  | { kind: 'add-tab-group'; workspace: Workspace }
  | null

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogElement = dialogRef.current
    if (dialogElement && !dialogElement.open) dialogElement.showModal()
    return () => {
      if (dialogElement?.open) dialogElement.close()
    }
  }, [])

  return dialogRef
}

function App() {
  const isExtension =
    typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id && chrome.storage?.local)
  const [groupBindings, setGroupBindings] = useState<Record<string, string>>({})
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [tabGroupLinks, setTabGroupLinks] = useState<WorkspaceTabGroupLink[]>([])
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
  } = useChromeTabGroups(isExtension, handleChromeGroupRemoved, (groups, previousGroups) => {
    setGroupBindings((current) => {
      // Keep the previous live mapping when a restored group loses only some tabs.
      // Prune runtime IDs against each fresh query; retain saved Workspace links.
      const next = resolveWorkspaceTabGroupLinks(
        groups, workspaces, tabGroupLinks,
        resolveWorkspaceTabGroupLinks(previousGroups, workspaces, tabGroupLinks, current),
      )
      return Object.keys(next).length === Object.keys(current).length &&
        Object.entries(next).every(([id, linkId]) => current[id] === linkId)
        ? current : next
    })
  })
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [loading, setLoading] = useState(isExtension)
  const [storageReady, setStorageReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tabActionError, setTabActionError] = useState<string | null>(null)
  const fingerprintUpdateKey = useRef('')

  const refreshWorkspaces = useCallback(async () => {
    if (!isExtension) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const loaded = await loadWorkspaceState()
      setWorkspaces(loaded.workspaces)
      setTabGroupLinks(loaded.tabGroupLinks)
      setActiveWorkspaceId(loaded.workspaces[0]?.id ?? null)
      setStorageReady(true)
    } catch (loadError) {
      setStorageReady(false)
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [isExtension])

  useEffect(() => {
    if (!isExtension) return

    let cancelled = false
    void loadWorkspaceState()
      .then((loaded) => {
        if (cancelled) return
        setWorkspaces(loaded.workspaces)
        setTabGroupLinks(loaded.tabGroupLinks)
        setActiveWorkspaceId(loaded.workspaces[0]?.id ?? null)
        setStorageReady(true)
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
  }, [isExtension])

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
    const now = Date.now()
    const nextLinks = tabGroupLinks.filter((link) => link.workspaceId !== dialog.workspace.id)
    const next = workspaces
      .filter((workspace) => workspace.id !== dialog.workspace.id)
      .map((workspace, order) => ({ ...workspace, order, updatedAt: now }))

    if (await persistWorkspaceData(next, nextLinks)) {
      const removedIds = new Set(tabGroupLinks
        .filter((link) => link.workspaceId === dialog.workspace.id)
        .map((link) => link.id))
      setGroupBindings((current) => Object.fromEntries(
        Object.entries(current).filter(([, linkId]) => !removedIds.has(linkId)),
      ))
      setDialog(null)
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

  const assignTabGroup = async (group: ChromeTabGroupSnapshot, workspaceId: string) => {
    if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
      throw new Error('That workspace no longer exists. Refresh and try again.')
    }

    const existingLinkId = resolvedGroupLinks[String(group.id)]
    const existingLink = tabGroupLinks.find((link) => link.id === existingLinkId)
    const now = currentTimestamp()
    const link: WorkspaceTabGroupLink = existingLink
      ? { ...existingLink, workspaceId, fingerprint: group.fingerprint, updatedAt: now }
      : {
          id: crypto.randomUUID(),
          workspaceId,
          fingerprint: group.fingerprint,
          createdAt: now,
          updatedAt: now,
        }
    const nextLinks = existingLink
      ? tabGroupLinks.map((item) => item.id === link.id ? link : item)
      : [...tabGroupLinks, link]
    const nextWorkspaces = workspaces.map((workspace) => {
      const tabGroupIds = workspace.tabGroupIds.filter((id) => id !== link.id)
      if (workspace.id === workspaceId) tabGroupIds.push(link.id)
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
  }

  const removeTabGroupFromWorkspace = async (group: ChromeTabGroupSnapshot, workspaceId: string) => {
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

  const handleActivateTab = async (tab: ChromeTabItem) => {
    setTabActionError(null)
    try {
      await activateChromeTab(tab.id)
    } catch (activationError) {
      setTabActionError(
        activationError instanceof Error ? activationError.message : 'Could not activate that Chrome tab.',
      )
    }
  }

  const handleCreateAndAssignGroup = async (
    workspaceId: string,
    input: { tabIds: number[]; title: string; color: ChromeTabGroupColor },
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
    await assignTabGroup(createdGroup, workspaceId)
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
  const storageStatus = !isExtension
    ? 'PREVIEW'
    : loading
      ? 'CONNECTING'
      : storageReady
        ? 'ON DEVICE'
        : 'STORAGE ERROR'

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img className="brand-mark" src="/icons/skope-logo.png" alt="SKOPE" width={32} height={32} />
          <span className="brand-name" aria-hidden="true">SKOPE</span>
        </div>
        <div className="storage-pill" title={storageReady ? 'Saved in Chrome on this device' : 'Chrome storage is not ready'}>
          <span className={`status-dot ${storageReady ? 'is-connected' : ''}`} aria-hidden="true" />
          {storageStatus}
        </div>
      </header>

      <section className="workspace-section" aria-labelledby="workspace-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR BROWSER, IN FOCUS</p>
            <h1 id="workspace-heading">Workspaces</h1>
          </div>
          <span className="workspace-count" aria-label={`${workspaces.length} workspaces`}>
            {workspaces.length.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="list-toolbar">
          <span className="list-label">SPACES</span>
          <button
            className="icon-button add-button"
            type="button"
            aria-label="Create workspace"
            title={isExtension ? 'Create workspace' : 'Load the extension build in Chrome first'}
            disabled={!isExtension || !storageReady || saving}
            onClick={() => setDialog({ kind: 'create' })}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>

        {!isExtension && (
          <div className="notice-card" role="status">
            <span className="notice-icon" aria-hidden="true">◈</span>
            <div>
              <strong>Open SKOPE in Chrome</strong>
              <p>Build the project and load the <code>dist</code> folder from <code>chrome://extensions</code> to use Chrome Storage.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="error-card" role="alert">
            <p>{error}</p>
            {!storageReady && isExtension && (
              <button type="button" className="text-button" onClick={() => void refreshWorkspaces()}>
                Try again
              </button>
            )}
          </div>
        )}
        {tabActionError && <div className="error-card" role="alert"><p>{tabActionError}</p></div>}

        <div className="workspace-list" aria-live="polite">
          {loading ? (
            <div className="loading-row"><span className="spinner" aria-hidden="true" /> Loading workspaces</div>
          ) : storageReady && workspaces.length > 0 ? (
            workspaces
              .slice()
              .sort((first, second) => first.order - second.order)
              .map((workspace, index) => (
                <WorkspaceRow
                  key={workspace.id}
                  workspace={workspace}
                  groups={assignedGroupsByWorkspace.get(workspace.id) ?? []}
                  index={index}
                  total={workspaces.length}
                  active={workspace.id === activeWorkspaceId}
                  disabled={saving}
                  onSelect={() => setActiveWorkspaceId(workspace.id)}
                  onToggle={() => handleToggleCollapsed(workspace)}
                  onEdit={() => setDialog({ kind: 'edit', workspace })}
                  onDelete={() => setDialog({ kind: 'delete', workspace })}
                  onAddTabGroup={() => {
                    setTabActionError(null)
                    setDialog({ kind: 'add-tab-group', workspace })
                  }}
                  onMove={(direction) => handleMoveWorkspace(workspace, direction)}
                  onActivateTab={handleActivateTab}
                  onRemoveTabGroup={(group) => void removeTabGroupFromWorkspace(group, workspace.id)}
                />
              ))
          ) : storageReady ? (
            <div className="empty-state">
              <span className="empty-orbit" aria-hidden="true">◈</span>
              <h2>A clear space to start</h2>
              <p>Create a workspace for a project, class, or anything you want to keep focused.</p>
              <button type="button" className="primary-button" onClick={() => setDialog({ kind: 'create' })} disabled={saving}>
                <span aria-hidden="true">+</span> New workspace
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="unassigned-section" aria-labelledby="unassigned-heading">
        <div className="list-toolbar unassigned-toolbar">
          <div>
            <span className="list-label">BROWSER GROUPS</span>
            <h2 id="unassigned-heading">Unassigned Groups</h2>
          </div>
          <span className="workspace-count" aria-label={`${unassignedGroups.length} unassigned groups`}>
            {unassignedGroups.length.toString().padStart(2, '0')}
          </span>
        </div>

        {groupsError ? (
          <div className="error-card" role="alert">
            <p>{groupsError}</p>
            <button type="button" className="text-button" onClick={() => void refreshGroups()}>Try again</button>
          </div>
        ) : groupsLoading ? (
          <div className="loading-row"><span className="spinner" aria-hidden="true" /> Loading Chrome tab groups</div>
        ) : unassignedGroups.length > 0 ? (
          <div className="browser-group-list">
            {unassignedGroups.map((group) => (
              <TabGroupCard key={`${group.windowId}-${group.id}`} group={group} onActivateTab={handleActivateTab} />
            ))}
          </div>
        ) : (
          <p className="no-groups unassigned-empty">
            {chromeGroups.length > 0 ? 'All groups are in a Workspace.' : 'No Chrome tab groups in this window.'}
          </p>
        )}
      </section>

      <footer className="app-footer">
        <div className="selected-workspace">
          <span className="footer-label">SELECTED</span>
          <span className="selected-name">{activeWorkspace?.name ?? 'No workspace selected'}</span>
        </div>
        <span className="privacy-note">Private by design</span>
      </footer>

      {dialog?.kind === 'create' || dialog?.kind === 'edit' ? (
        <WorkspaceDialog
          workspace={dialog.kind === 'edit' ? dialog.workspace : undefined}
          saving={saving}
          error={error}
          onCancel={() => setDialog(null)}
          onSave={handleSaveWorkspace}
        />
      ) : null}

      {dialog?.kind === 'delete' ? (
        <DeleteWorkspaceDialog
          workspace={dialog.workspace}
          saving={saving}
          error={error}
          onCancel={() => setDialog(null)}
          onDelete={() => void handleDeleteWorkspace()}
        />
      ) : null}

      {dialog?.kind === 'add-tab-group' ? (
        <AddTabGroupDialog
          workspace={dialog.workspace}
          groups={chromeGroups}
          ungroupedTabs={ungroupedTabs}
          windowId={chromeWindowId}
          loading={groupsLoading}
          error={groupsError}
          saving={saving}
          assignedWorkspaceIdsByGroup={Object.fromEntries(
            chromeGroups.flatMap((group) => {
              const linkId = resolvedGroupLinks[String(group.id)]
              const link = tabGroupLinks.find((item) => item.id === linkId)
              return link ? [[String(group.id), link.workspaceId]] : []
            }),
          )}
          workspaceNamesById={Object.fromEntries(workspaces.map((workspace) => [workspace.id, workspace.name]))}
          onRetry={() => void refreshGroups()}
          onCancel={() => setDialog(null)}
          onAssign={(group) => assignTabGroup(group, dialog.workspace.id)}
          onCreate={(input) => handleCreateAndAssignGroup(dialog.workspace.id, input)}
        />
      ) : null}
    </main>
  )
}

interface WorkspaceRowProps {
  workspace: Workspace
  groups: ChromeTabGroupSnapshot[]
  index: number
  total: number
  active: boolean
  disabled: boolean
  onSelect: () => void
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddTabGroup: () => void
  onMove: (direction: -1 | 1) => void
  onActivateTab: (tab: ChromeTabItem) => void
  onRemoveTabGroup: (group: ChromeTabGroupSnapshot) => void
}

function WorkspaceRow({
  workspace,
  groups,
  index,
  total,
  active,
  disabled,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onAddTabGroup,
  onMove,
  onActivateTab,
  onRemoveTabGroup,
}: WorkspaceRowProps) {
  return (
    <article
      className={`workspace-card ${active ? 'is-active' : ''}`}
      style={{ '--workspace-color': workspace.color } as CSSProperties}
    >
      <div className="workspace-row">
        <button
          type="button"
          className="workspace-select"
          aria-pressed={active}
          onClick={onSelect}
          disabled={disabled}
        >
          <span className="workspace-icon" aria-hidden="true">{workspace.icon}</span>
          <span className="workspace-copy">
            <span className="workspace-name">{workspace.name}</span>
            <span className="workspace-subtitle">{active ? 'Selected workspace' : 'Workspace'}</span>
          </span>
        </button>
        <button
          type="button"
          className={`collapse-button ${workspace.collapsed ? 'is-collapsed' : ''}`}
          aria-label={`${workspace.collapsed ? 'Expand' : 'Collapse'} ${workspace.name}`}
          aria-expanded={!workspace.collapsed}
          onClick={onToggle}
          disabled={disabled}
        >
          <span aria-hidden="true">⌄</span>
        </button>
        <details className="workspace-actions">
          <summary aria-label={`Actions for ${workspace.name}`} title="Workspace actions">•••</summary>
          <div className="actions-menu">
            <button type="button" onClick={onEdit} disabled={disabled}>Edit workspace</button>
            <button type="button" onClick={() => onMove(-1)} disabled={disabled || index === 0}>Move up</button>
            <button type="button" onClick={() => onMove(1)} disabled={disabled || index === total - 1}>Move down</button>
            <button type="button" className="danger-action" onClick={onDelete} disabled={disabled}>Delete workspace</button>
          </div>
        </details>
      </div>
      {!workspace.collapsed && (
        <div className="workspace-content">
          {groups.length === 0 ? (
            <p className="no-groups"><span aria-hidden="true">↳</span> No tab groups in this Workspace yet.</p>
          ) : (
            <div className="browser-group-list workspace-group-list">
              {groups.map((group) => (
                <TabGroupCard
                  key={`${group.windowId}-${group.id}`}
                  group={group}
                  onActivateTab={onActivateTab}
                  onRemove={() => onRemoveTabGroup(group)}
                />
              ))}
            </div>
          )}
          <button type="button" className="add-tab-group-button" onClick={onAddTabGroup} disabled={disabled}>
            <span aria-hidden="true">+</span> Add Tab Group
          </button>
        </div>
      )}
    </article>
  )
}

interface TabGroupCardProps {
  group: ChromeTabGroupSnapshot
  onActivateTab: (tab: ChromeTabItem) => void
  onRemove?: () => void
}

function TabGroupCard({ group, onActivateTab, onRemove }: TabGroupCardProps) {
  const [expanded, setExpanded] = useState(false)
  const color = CHROME_TAB_GROUP_COLORS.find((choice) => choice.value === group.color)?.hex ?? '#7d8490'
  const title = group.title || 'Untitled group'

  return (
    <article className="tab-group-card" style={{ '--chrome-group-color': color } as CSSProperties}>
      <div className="tab-group-heading-row">
        <button
          type="button"
          className="tab-group-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="tab-group-dot" aria-hidden="true" />
          <span className="tab-group-title" title={title}>{title}</span>
          <span className="tab-group-count">{group.tabs.length} tabs</span>
          <span className={`tab-group-chevron ${expanded ? 'is-expanded' : ''}`} aria-hidden="true">⌄</span>
        </button>
        {onRemove && (
          <button type="button" className="remove-group-button" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
      {expanded && (
        <div className="tab-group-tabs">
          {group.tabs.map((tab) => (
            <button
              type="button"
              className={`tab-entry ${tab.active ? 'is-active' : ''}`}
              key={tab.id}
              onClick={() => onActivateTab(tab)}
              title={tab.title}
            >
              {tab.favIconUrl ? (
                <img className="tab-favicon" src={tab.favIconUrl} alt="" />
              ) : (
                <span className="tab-favicon-fallback" aria-hidden="true">↗</span>
              )}
              <span className="tab-entry-title">{tab.title}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

interface AddTabGroupDialogProps {
  workspace: Workspace
  groups: ChromeTabGroupSnapshot[]
  ungroupedTabs: ChromeTabItem[]
  windowId: number | null
  loading: boolean
  error: string | null
  saving: boolean
  assignedWorkspaceIdsByGroup: Record<string, string>
  workspaceNamesById: Record<string, string>
  onRetry: () => void
  onCancel: () => void
  onAssign: (group: ChromeTabGroupSnapshot) => Promise<void>
  onCreate: (input: {
    tabIds: number[]
    title: string
    color: ChromeTabGroupColor
  }) => Promise<void>
}

function AddTabGroupDialog({
  workspace,
  groups,
  ungroupedTabs,
  windowId,
  loading,
  error,
  saving,
  assignedWorkspaceIdsByGroup,
  workspaceNamesById,
  onRetry,
  onCancel,
  onAssign,
  onCreate,
}: AddTabGroupDialogProps) {
  const dialogRef = useModalDialog()
  const [selectedTabIds, setSelectedTabIds] = useState<number[]>([])
  const [title, setTitle] = useState(`${workspace.name} group`)
  const [color, setColor] = useState<ChromeTabGroupColor>('blue')
  const [working, setWorking] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isBusy = saving || working
  const toggleTab = (tabId: number) => {
    setSelectedTabIds((current) =>
      current.includes(tabId) ? current.filter((id) => id !== tabId) : [...current, tabId],
    )
  }

  const handleAssign = async (group: ChromeTabGroupSnapshot) => {
    setWorking(true)
    setDialogError(null)
    setSuccess(null)
    try {
      await onAssign(group)
      setSuccess(`“${group.title || 'Untitled group'}” is now in ${workspace.name}.`)
    } catch (assignError) {
      setDialogError(assignError instanceof Error ? assignError.message : 'Could not add this tab group.')
    } finally {
      setWorking(false)
    }
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle || selectedTabIds.length === 0 || windowId === null) return

    setWorking(true)
    setDialogError(null)
    setSuccess(null)
    try {
      await onCreate({ tabIds: selectedTabIds, title: trimmedTitle, color })
      setSelectedTabIds([])
      setSuccess(`“${trimmedTitle}” was created in Chrome and added to ${workspace.name}.`)
    } catch (createError) {
      setDialogError(createError instanceof Error ? createError.message : 'Could not create a Chrome tab group.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="workspace-dialog tab-group-dialog"
      aria-labelledby="add-group-title"
      onCancel={(event) => { event.preventDefault(); onCancel() }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">{workspace.name.toUpperCase()}</p>
          <h2 id="add-group-title">Add Tab Group</h2>
        </div>
        <button type="button" className="dialog-close" onClick={onCancel} aria-label="Close dialog">×</button>
      </div>

      <section className="group-picker-section" aria-labelledby="existing-groups-title">
        <div className="picker-section-heading">
          <h3 id="existing-groups-title">Current Chrome groups</h3>
          <span>{groups.length}</span>
        </div>
        {error ? (
          <div className="error-card" role="alert">
            <p>{error}</p>
            <button type="button" className="text-button" onClick={onRetry}>Try again</button>
          </div>
        ) : loading ? (
          <div className="loading-row"><span className="spinner" aria-hidden="true" /> Loading groups</div>
        ) : groups.length === 0 ? (
          <p className="picker-empty">No Chrome tab groups are open in this window.</p>
        ) : (
          <div className="picker-group-list">
            {groups.map((group) => {
              const assignedWorkspaceId = assignedWorkspaceIdsByGroup[String(group.id)]
              const assignedWorkspaceName = assignedWorkspaceId
                ? workspaceNamesById[assignedWorkspaceId]
                : undefined
              const alreadyHere = assignedWorkspaceId === workspace.id
              return (
                <div className="picker-group-row" key={`${group.windowId}-${group.id}`}>
                  <span
                    className="tab-group-dot"
                    style={{ '--chrome-group-color': CHROME_TAB_GROUP_COLORS.find((item) => item.value === group.color)?.hex ?? '#7d8490' } as CSSProperties}
                    aria-hidden="true"
                  />
                  <span className="picker-group-title" title={group.title || 'Untitled group'}>
                    {group.title || 'Untitled group'}
                  </span>
                  <span className="picker-group-count">{group.tabs.length}</span>
                  <button
                    type="button"
                    className="picker-add-button"
                    disabled={isBusy || alreadyHere}
                    onClick={() => void handleAssign(group)}
                  >
                    {alreadyHere ? 'Added' : assignedWorkspaceName ? 'Move here' : 'Add'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <form className="create-group-form" onSubmit={(event) => void handleCreate(event)}>
        <div className="picker-section-heading">
          <h3>Create a new Chrome group</h3>
          <span>{selectedTabIds.length} selected</span>
        </div>
        <label className="field-label" htmlFor="chrome-group-name">Group name</label>
        <input
          id="chrome-group-name"
          className="text-input"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          maxLength={40}
          required
        />

        <fieldset className="choice-fieldset chrome-color-fieldset">
          <legend className="field-label">Chrome group color</legend>
          <div className="color-choices">
            {CHROME_TAB_GROUP_COLORS.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className={`choice-color ${color === choice.value ? 'is-chosen' : ''}`}
                style={{ '--choice-color': choice.hex } as CSSProperties}
                aria-label={`${choice.name} Chrome group color`}
                aria-pressed={color === choice.value}
                onClick={() => setColor(choice.value)}
              />
            ))}
          </div>
        </fieldset>

        {ungroupedTabs.length === 0 ? (
          <p className="picker-empty">No ungrouped tabs are available. Open a tab in this window first.</p>
        ) : (
          <div className="ungrouped-tab-list" aria-label="Ungrouped tabs to add">
            {ungroupedTabs.map((tab) => (
              <label className="ungrouped-tab-choice" key={tab.id}>
                <input
                  type="checkbox"
                  checked={selectedTabIds.includes(tab.id)}
                  onChange={() => toggleTab(tab.id)}
                  disabled={isBusy}
                />
                <span title={tab.title}>{tab.title}</span>
              </label>
            ))}
          </div>
        )}

        {dialogError && <p className="dialog-error" role="alert">{dialogError}</p>}
        {success && <p className="dialog-success" role="status">{success}</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={isBusy}>Done</button>
          <button
            type="submit"
            className="primary-button"
            disabled={isBusy || loading || Boolean(error) || !title.trim() || selectedTabIds.length === 0 || windowId === null}
          >
            {working ? 'Working…' : 'Create group & add'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

interface WorkspaceDialogProps {
  workspace?: Workspace
  saving: boolean
  error: string | null
  onCancel: () => void
  onSave: (fields: WorkspaceFields) => Promise<void>
}

function WorkspaceDialog({ workspace, saving, error, onCancel, onSave }: WorkspaceDialogProps) {
  const dialogRef = useModalDialog()
  const [name, setName] = useState(workspace?.name ?? '')
  const [icon, setIcon] = useState<WorkspaceIcon>(workspace?.icon ?? WORKSPACE_ICONS[0])
  const [color, setColor] = useState<WorkspaceColor>(workspace?.color ?? WORKSPACE_COLORS[0].value)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    void onSave({ name: trimmedName, icon, color })
  }

  return (
    <dialog
      ref={dialogRef}
      className="workspace-dialog"
      aria-labelledby="workspace-dialog-title"
      onCancel={(event) => { event.preventDefault(); onCancel() }}
    >
      <form onSubmit={handleSubmit}>
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">WORKSPACE</p>
            <h2 id="workspace-dialog-title">{workspace ? 'Edit workspace' : 'Create workspace'}</h2>
          </div>
          <button type="button" className="dialog-close" onClick={onCancel} aria-label="Close dialog">×</button>
        </div>

        <label className="field-label" htmlFor="workspace-name">Name</label>
        <input
          id="workspace-name"
          className="text-input"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="e.g. Product launch"
          maxLength={40}
          autoFocus
          required
        />

        <fieldset className="choice-fieldset">
          <legend className="field-label">Icon</legend>
          <div className="icon-choices">
            {WORKSPACE_ICONS.map((choice) => (
              <button
                key={choice}
                type="button"
                className={`choice-icon ${icon === choice ? 'is-chosen' : ''}`}
                aria-label={`Use ${choice} icon`}
                aria-pressed={icon === choice}
                onClick={() => setIcon(choice)}
              >
                {choice}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice-fieldset color-fieldset">
          <legend className="field-label">Color</legend>
          <div className="color-choices">
            {WORKSPACE_COLORS.map((choice) => (
              <button
                key={choice.name}
                type="button"
                className={`choice-color ${color === choice.value ? 'is-chosen' : ''}`}
                style={{ '--choice-color': choice.value } as CSSProperties}
                aria-label={`${choice.name} workspace color`}
                aria-pressed={color === choice.value}
                onClick={() => setColor(choice.value)}
              />
            ))}
          </div>
        </fieldset>

        {error && <p className="dialog-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="primary-button" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : workspace ? 'Save changes' : 'Create workspace'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

interface DeleteWorkspaceDialogProps {
  workspace: Workspace
  saving: boolean
  error: string | null
  onCancel: () => void
  onDelete: () => void
}

function DeleteWorkspaceDialog({ workspace, saving, error, onCancel, onDelete }: DeleteWorkspaceDialogProps) {
  const dialogRef = useModalDialog()

  return (
    <dialog
      ref={dialogRef}
      className="workspace-dialog delete-dialog"
      aria-labelledby="delete-dialog-title"
      onCancel={(event) => { event.preventDefault(); onCancel() }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">REMOVE WORKSPACE</p>
          <h2 id="delete-dialog-title">Delete “{workspace.name}”?</h2>
        </div>
        <button type="button" className="dialog-close" onClick={onCancel} aria-label="Close dialog">×</button>
      </div>
      <p className="delete-copy">This removes the workspace from SKOPE. Your Chrome tabs and tab groups stay open.</p>
      {error && <p className="dialog-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="danger-button" onClick={onDelete} disabled={saving}>
          {saving ? 'Deleting…' : 'Delete workspace'}
        </button>
      </div>
    </dialog>
  )
}

export default App
