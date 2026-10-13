import { useId, type CSSProperties } from 'react'
import type { Workspace } from '../types/workspace'
import type { ChromeTabGroupSnapshot, ChromeTabItem, TabGroupColorMode } from '../types/tabGroup'
import { TabGroupCard } from './TabGroupCard'

interface WorkspaceRowProps {
  workspace: Workspace
  groups: ChromeTabGroupSnapshot[]
  colorModes: Record<string, TabGroupColorMode>
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
  onUngroup: (group: ChromeTabGroupSnapshot) => Promise<void>
  ungroupingGroupId: number | null
}

export function WorkspaceRow({
  workspace,
  groups,
  colorModes,
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
  onUngroup,
  ungroupingGroupId,
}: WorkspaceRowProps) {
  const contentId = useId()
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
          aria-controls={contentId}
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
        <div className="workspace-content" id={contentId}>
          {groups.length === 0 ? (
            <p className="no-groups"><span aria-hidden="true">↳</span> No groups yet. Add a Chrome tab group below.</p>
          ) : (
            <div className="browser-group-list workspace-group-list">
              {groups.map((group) => (
                <TabGroupCard
                  key={`${group.windowId}-${group.id}`}
                  group={group}
                  colorMode={colorModes[String(group.id)]}
                  onActivateTab={onActivateTab}
                  onRemove={() => onRemoveTabGroup(group)}
                  onUngroup={onUngroup}
                  disabled={disabled}
                  ungrouping={ungroupingGroupId === group.id}
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
