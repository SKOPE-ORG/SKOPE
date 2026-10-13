import { workspaceColorToChromeColor } from '../services/workspaceGroupColors'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { WORKSPACE_COLORS, WORKSPACE_ICONS, type Workspace, type WorkspaceColor, type WorkspaceIcon, type WorkspaceFields } from '../types/workspace'
import { useModalDialog } from '../hooks/useModalDialog'

interface WorkspaceDialogProps {
  workspace?: Workspace
  saving: boolean
  error: string | null
  onCancel: () => void
  onSave: (fields: WorkspaceFields) => Promise<void>
}

export function WorkspaceDialog({ workspace, saving, error, onCancel, onSave }: WorkspaceDialogProps) {
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
        <p className="color-policy-help">
          Chrome uses preset colors; this color maps to {workspaceColorToChromeColor(color)}.
          Only groups set to Follow Workspace update. Change each group’s setting in Add Tab Group.
        </p>

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

export function DeleteWorkspaceDialog({ workspace, saving, error, onCancel, onDelete }: DeleteWorkspaceDialogProps) {
  const dialogRef = useModalDialog()

  return (
    <dialog
      ref={dialogRef}
      className="workspace-dialog delete-dialog"
      aria-labelledby="delete-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onCancel() }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">REMOVE WORKSPACE</p>
          <h2 id="delete-dialog-title">Delete “{workspace.name}”?</h2>
        </div>
        <button type="button" className="dialog-close" onClick={onCancel} aria-label="Close dialog" disabled={saving}>×</button>
      </div>
      <p className="delete-copy">연결된 탭 그룹의 그룹화가 해제되며, 열린 탭은 유지됩니다.</p>
      <p className="color-policy-help">Linked active groups in every Chrome window will be ungrouped. If a group cannot be ungrouped, this Workspace stays available for retry.</p>
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
