import './App.css'
import { useWorkspaceManager } from './hooks/useWorkspaceManager'
import { WorkspaceRow } from './components/WorkspaceRow'
import { TabGroupCard } from './components/TabGroupCard'
import { AddTabGroupDialog } from './components/AddTabGroupDialog'
import { WorkspaceDialog, DeleteWorkspaceDialog } from './components/WorkspaceDialogs'

function App() {
  const {
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
  } = useWorkspaceManager()
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
        {colorSyncError && colorUpdates.length > 0 && (
          <div className="error-card" role="alert">
            <p>{colorSyncError}</p>
            <button type="button" className="text-button" onClick={() => setColorSyncAttempt((current) => current + 1)}>
              Retry group colors
            </button>
          </div>
        )}

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
                  colorModes={groupColorModes}
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
                  onUngroup={handleUngroup}
                  ungroupingGroupId={ungroupingGroupId}
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
              <TabGroupCard
                key={`${group.windowId}-${group.id}`}
                group={group}
                onActivateTab={handleActivateTab}
                onUngroup={handleUngroup}
                disabled={saving}
                ungrouping={ungroupingGroupId === group.id}
              />
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
        <span className="privacy-note">Stored on this device</span>
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
          assignedColorModesByGroup={groupColorModes}
          onRetry={() => void refreshGroups()}
          onCancel={() => setDialog(null)}
          onAssign={(group, mode) => assignTabGroup(group, dialog.workspace.id, mode)}
          onCreate={(input) => handleCreateAndAssignGroup(dialog.workspace.id, input)}
        />
      ) : null}
    </main>
  )
}

export default App
