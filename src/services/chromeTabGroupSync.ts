import {
  queryChromeTabGroups,
  subscribeToChromeTabGroupChanges,
  type ChromeTabGroupState,
} from './chromeTabGroups'

export const EMPTY_CHROME_TAB_GROUP_STATE: ChromeTabGroupState = {
  groups: [], ungroupedTabs: [], windowId: null,
}

interface SyncOptions {
  onState: (state: ChromeTabGroupState, previous: ChromeTabGroupState) => void
  onStatus: (loading: boolean, error: string | null) => void
  onGroupRemoved?: (groupId: number) => void
  query?: typeof queryChromeTabGroups
  subscribe?: typeof subscribeToChromeTabGroupChanges
}

/** Owns only live Chrome state. Saved Workspace links/snapshots are never deleted here. */
export class ChromeTabGroupSync {
  private state = EMPTY_CHROME_TAB_GROUP_STATE
  private revision = 0
  private disposed = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private unsubscribe: (() => void) | undefined
  private readonly options: SyncOptions

  constructor(options: SyncOptions) { this.options = options }

  start(): void {
    try {
      this.unsubscribe = (this.options.subscribe ?? subscribeToChromeTabGroupChanges)(
        () => this.scheduleRefresh(),
        (groupId) => {
          if (this.disposed) return
          // A query begun before onRemoved may still contain the deleted group.
          this.revision += 1
          this.publish({ ...this.state, groups: this.state.groups.filter((group) => group.id !== groupId) })
          this.options.onGroupRemoved?.(groupId)
        },
      )
      void this.refresh()
    } catch (error) {
      this.options.onStatus(false, error instanceof Error ? error.message : 'Could not watch Chrome tab groups.')
    }
  }

  private publish(next: ChromeTabGroupState): void {
    const previous = this.state
    this.state = next
    this.options.onState(next, previous)
  }

  private scheduleRefresh(): void {
    if (this.disposed) return
    // Invalidate immediately, not when the delayed query starts. Coalesce bursts
    // without postponing the refresh indefinitely while tabs keep changing.
    this.revision += 1
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.refresh()
    }, 120)
  }

  async refresh(): Promise<ChromeTabGroupState | null> {
    if (this.disposed) return null
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = undefined
    const revision = ++this.revision
    this.options.onStatus(true, null)
    try {
      const next = await (this.options.query ?? queryChromeTabGroups)()
      if (this.disposed || revision !== this.revision) return null
      this.publish(next)
      this.options.onStatus(false, null)
      return next
    } catch (error) {
      if (this.disposed || revision !== this.revision) return null
      this.publish(EMPTY_CHROME_TAB_GROUP_STATE)
      this.options.onStatus(false, error instanceof Error ? error.message : 'Could not read Chrome tab groups.')
      return null
    }
  }

  dispose(): void {
    this.disposed = true
    this.revision += 1
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.unsubscribe?.()
  }
}
