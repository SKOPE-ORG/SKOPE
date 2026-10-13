import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import './App.css'
import { currentTimestamp, loadWorkspaces, saveWorkspaces } from './services/workspaceStorage'
import {
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
  type Workspace,
  type WorkspaceColor,
  type WorkspaceIcon,
} from './types/workspace'

type WorkspaceFields = Pick<Workspace, 'name' | 'icon' | 'color'>
type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; workspace: Workspace }
  | { kind: 'delete'; workspace: Workspace }
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [loading, setLoading] = useState(isExtension)
  const [storageReady, setStorageReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshWorkspaces = useCallback(async () => {
    if (!isExtension) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const loaded = await loadWorkspaces()
      setWorkspaces(loaded)
      setActiveWorkspaceId(loaded[0]?.id ?? null)
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
    void loadWorkspaces()
      .then((loaded) => {
        if (cancelled) return
        setWorkspaces(loaded)
        setActiveWorkspaceId(loaded[0]?.id ?? null)
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

  const persistWorkspaces = async (next: Workspace[]): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      await saveWorkspaces(next)
      setWorkspaces([...next].sort((first, second) => first.order - second.order))
      setActiveWorkspaceId((current) =>
        next.some((workspace) => workspace.id === current) ? current : next[0]?.id ?? null,
      )
      return true
    } catch (saveError) {
      setError(getErrorMessage(saveError))
      return false
    } finally {
      setSaving(false)
    }
  }

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
    const next = workspaces
      .filter((workspace) => workspace.id !== dialog.workspace.id)
      .map((workspace, order) => ({ ...workspace, order, updatedAt: now }))

    if (await persistWorkspaces(next)) setDialog(null)
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

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId)
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
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-name">SKOPE</span>
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
                  index={index}
                  total={workspaces.length}
                  active={workspace.id === activeWorkspaceId}
                  disabled={saving}
                  onSelect={() => setActiveWorkspaceId(workspace.id)}
                  onToggle={() => handleToggleCollapsed(workspace)}
                  onEdit={() => setDialog({ kind: 'edit', workspace })}
                  onDelete={() => setDialog({ kind: 'delete', workspace })}
                  onMove={(direction) => handleMoveWorkspace(workspace, direction)}
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
    </main>
  )
}

interface WorkspaceRowProps {
  workspace: Workspace
  index: number
  total: number
  active: boolean
  disabled: boolean
  onSelect: () => void
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
}

function WorkspaceRow({
  workspace,
  index,
  total,
  active,
  disabled,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onMove,
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
          {workspace.tabGroupIds.length === 0 ? (
            <p className="no-groups"><span aria-hidden="true">↳</span> Tab groups will appear here</p>
          ) : (
            <p className="no-groups">{workspace.tabGroupIds.length} saved tab group references</p>
          )}
        </div>
      )}
    </article>
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
