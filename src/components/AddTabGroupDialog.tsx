import { useState, type CSSProperties, type FormEvent } from 'react'
import { CHROME_TAB_GROUP_COLORS, type ChromeTabGroupSnapshot, type ChromeTabItem, type ChromeTabGroupColor, type TabGroupColorMode } from '../types/tabGroup'
import type { Workspace } from '../types/workspace'
import { workspaceColorToChromeColor } from '../services/workspaceGroupColors'
import { getErrorMessage } from '../services/errors'
import { useModalDialog } from '../hooks/useModalDialog'

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
  assignedColorModesByGroup: Record<string, TabGroupColorMode>
  onRetry: () => void
  onCancel: () => void
  onAssign: (group: ChromeTabGroupSnapshot, colorMode: TabGroupColorMode) => Promise<void>
  onCreate: (input: {
    tabIds: number[]
    title: string
    color: ChromeTabGroupColor
    colorMode: TabGroupColorMode
  }) => Promise<void>
}

export function AddTabGroupDialog({
  workspace,
  groups,
  ungroupedTabs,
  windowId,
  loading,
  error,
  saving,
  assignedWorkspaceIdsByGroup,
  workspaceNamesById,
  assignedColorModesByGroup,
  onRetry,
  onCancel,
  onAssign,
  onCreate,
}: AddTabGroupDialogProps) {
  const dialogRef = useModalDialog()
  const [selectedTabIds, setSelectedTabIds] = useState<number[]>([])
  const [title, setTitle] = useState(`${workspace.name} group`)
  const [color, setColor] = useState<ChromeTabGroupColor>(workspaceColorToChromeColor(workspace.color))
  const [newColorMode, setNewColorMode] = useState<TabGroupColorMode>('workspace')
  const [existingColorMode, setExistingColorMode] = useState<TabGroupColorMode>('chrome')
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
      await onAssign(group, existingColorMode)
      setSuccess(`“${group.title || 'Untitled group'}” is now in ${workspace.name}.`)
    } catch (assignError) {
      setDialogError(getErrorMessage(assignError, 'Could not add this tab group.'))
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
      await onCreate({
        tabIds: selectedTabIds, title: trimmedTitle,
        color: newColorMode === 'workspace' ? workspaceColorToChromeColor(workspace.color) : color,
        colorMode: newColorMode,
      })
      setSelectedTabIds([])
      setSuccess(`“${trimmedTitle}” was created in Chrome and added to ${workspace.name}.`)
    } catch (createError) {
      setDialogError(getErrorMessage(createError, 'Could not create a Chrome tab group.'))
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
        <label className="field-label" htmlFor="existing-group-color-mode">When adding or moving a group</label>
        <select
          id="existing-group-color-mode"
          className="text-input color-mode-select"
          value={existingColorMode}
          disabled={isBusy}
          onChange={(event) => setExistingColorMode(event.currentTarget.value as TabGroupColorMode)}
        >
          <option value="chrome">Keep current Chrome color</option>
          <option value="workspace">Follow Workspace color</option>
        </select>
        <p className="color-policy-help">Existing colors change only when you choose Follow Workspace. Use Update to change an added group’s setting.</p>
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
              const sameColorMode = (assignedColorModesByGroup[String(group.id)] ?? 'chrome') === existingColorMode
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
                    disabled={isBusy || (alreadyHere && sameColorMode)}
                    onClick={() => void handleAssign(group)}
                  >
                    {alreadyHere ? sameColorMode ? 'Added' : 'Update' : assignedWorkspaceName ? 'Move here' : 'Add'}
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
          <select
            className="text-input color-mode-select"
            aria-label="New group color behavior"
            value={newColorMode}
            disabled={isBusy}
            onChange={(event) => setNewColorMode(event.currentTarget.value as TabGroupColorMode)}
          >
            <option value="workspace">Follow Workspace color</option>
            <option value="chrome">Use a custom Chrome color</option>
          </select>
          <p className="color-policy-help">
            Chrome uses 9 preset colors. This Workspace maps to {workspaceColorToChromeColor(workspace.color)}.
            {newColorMode === 'workspace' ? ' Future Workspace color changes update this group.' : ' Your custom Chrome color will be preserved.'}
          </p>
          <div className="color-choices">
            {CHROME_TAB_GROUP_COLORS.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className={`choice-color ${(newColorMode === 'workspace' ? workspaceColorToChromeColor(workspace.color) : color) === choice.value ? 'is-chosen' : ''}`}
                style={{ '--choice-color': choice.hex } as CSSProperties}
                aria-label={`${choice.name} Chrome group color`}
                aria-pressed={(newColorMode === 'workspace' ? workspaceColorToChromeColor(workspace.color) : color) === choice.value}
                disabled={isBusy}
                onClick={() => { setColor(choice.value); setNewColorMode('chrome') }}
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
