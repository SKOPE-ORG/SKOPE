import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { CHROME_TAB_GROUP_COLORS, type ChromeTabGroupSnapshot, type ChromeTabItem, type TabGroupColorMode } from '../types/tabGroup'

interface TabGroupCardProps {
  group: ChromeTabGroupSnapshot
  colorMode?: TabGroupColorMode
  onActivateTab: (tab: ChromeTabItem) => void
  onRemove?: () => void
  onUngroup: (group: ChromeTabGroupSnapshot) => Promise<void>
  disabled?: boolean
  ungrouping?: boolean
}

export function TabGroupCard({ group, colorMode, onActivateTab, onRemove, onUngroup, disabled, ungrouping }: TabGroupCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const tabsId = useId()
  const color = CHROME_TAB_GROUP_COLORS.find((choice) => choice.value === group.color)?.hex ?? '#7d8490'
  const title = group.title || 'Untitled group'

  useEffect(() => {
    if (!menuOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuRef.current?.querySelector<HTMLButtonElement>('.group-actions-trigger')?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <article className="tab-group-card" style={{ '--chrome-group-color': color } as CSSProperties}>
      <div className="tab-group-heading-row">
        <button
          type="button"
          className="tab-group-toggle"
          aria-expanded={expanded}
          aria-controls={tabsId}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="tab-group-dot" aria-hidden="true" />
          <span className="tab-group-title" title={title}>{title}</span>
          <span className="tab-group-count">{group.tabs.length} tabs</span>
          <span className={`tab-group-chevron ${expanded ? 'is-expanded' : ''}`} aria-hidden="true">⌄</span>
        </button>
        {onRemove && (
          <button type="button" className="remove-group-button" onClick={onRemove} disabled={disabled}>
            Unassign
          </button>
        )}
        <div className="group-actions" ref={menuRef}>
          <button
            type="button"
            className="group-actions-trigger"
            aria-label={`${title} 그룹 작업`}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            disabled={disabled}
            onClick={() => setMenuOpen((current) => !current)}
          >···</button>
          {menuOpen && (
            <div className="group-actions-menu" id={menuId}>
              <button type="button" disabled={disabled} onClick={() => {
                setMenuOpen(false)
                void onUngroup(group)
              }}>그룹 해제(Ungroup)</button>
              <p>열린 탭은 그대로 유지됩니다.</p>
            </div>
          )}
        </div>
      </div>
      {ungrouping && <p className="group-color-policy" role="status">그룹 해제 중…</p>}
      {colorMode && <p className="group-color-policy">{colorMode === 'workspace' ? 'Follows Workspace color' : 'Keeps Chrome color'}</p>}
      {expanded && (
        <div className="tab-group-tabs" id={tabsId}>
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
