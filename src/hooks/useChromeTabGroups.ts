import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import type { ChromeTabGroupSnapshot } from '../types/tabGroup'
import {
  ChromeTabGroupSync,
  EMPTY_CHROME_TAB_GROUP_STATE,
} from '../services/chromeTabGroupSync'

export function useChromeTabGroups(
  enabled: boolean,
  onGroupRemoved?: (groupId: number) => void,
  onGroupsChanged?: (groups: ChromeTabGroupSnapshot[], previous: ChromeTabGroupSnapshot[]) => void,
) {
  const [state, setState] = useState(EMPTY_CHROME_TAB_GROUP_STATE)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const syncRef = useRef<ChromeTabGroupSync | null>(null)
  const notifyRemoved = useEffectEvent((groupId: number) => onGroupRemoved?.(groupId))
  const notifyGroups = useEffectEvent((groups: ChromeTabGroupSnapshot[], previous: ChromeTabGroupSnapshot[]) =>
    onGroupsChanged?.(groups, previous))

  const refresh = useCallback(() => syncRef.current?.refresh() ?? Promise.resolve(null), [])
  const confirmGroupRemoved = useCallback((groupId: number) => syncRef.current?.confirmGroupRemoved(groupId), [])

  useEffect(() => {
    if (!enabled) return
    const sync = new ChromeTabGroupSync({
      onState: (next, previous) => { setState(next); notifyGroups(next.groups, previous.groups) },
      onStatus: (nextLoading, nextError) => { setLoading(nextLoading); setError(nextError) },
      onGroupRemoved: (groupId) => notifyRemoved(groupId),
    })
    syncRef.current = sync
    sync.start()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      sync.dispose()
      syncRef.current = null
    }
  }, [enabled])

  return { ...state, loading, error, refresh, confirmGroupRemoved }
}
