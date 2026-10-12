import { useCallback, useEffect, useRef, useState } from 'react'
import {
  queryChromeTabGroups,
  subscribeToChromeTabGroupChanges,
  type ChromeTabGroupState,
} from '../services/chromeTabGroups'

const EMPTY_STATE: ChromeTabGroupState = { groups: [], ungroupedTabs: [], windowId: null }

export function useChromeTabGroups(
  enabled: boolean,
  onGroupRemoved?: (groupId: number) => void,
) {
  const [state, setState] = useState(EMPTY_STATE)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const refresh = useCallback(async (): Promise<ChromeTabGroupState | null> => {
    if (!enabled) return null
    const thisRequest = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const next = await queryChromeTabGroups()
      if (thisRequest === requestId.current) setState(next)
      return next
    } catch (loadError) {
      if (thisRequest === requestId.current) {
        setState(EMPTY_STATE)
        setError(loadError instanceof Error ? loadError.message : 'Could not read Chrome tab groups.')
      }
      return null
    } finally {
      if (thisRequest === requestId.current) setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    let timer: ReturnType<typeof setTimeout> | undefined
    let subscriptionErrorTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleRefresh = () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        void refresh()
      }, 120)
    }

    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = subscribeToChromeTabGroupChanges(scheduleRefresh, onGroupRemoved)
    } catch (subscriptionError) {
      subscriptionErrorTimer = setTimeout(() => {
        setError(
          subscriptionError instanceof Error
            ? subscriptionError.message
            : 'Could not watch Chrome tab groups.',
        )
      }, 0)
    }
    void refresh()

    return () => {
      if (timer !== undefined) clearTimeout(timer)
      if (subscriptionErrorTimer !== undefined) clearTimeout(subscriptionErrorTimer)
      requestId.current += 1
      unsubscribe?.()
    }
  }, [enabled, onGroupRemoved, refresh])

  return { ...state, loading, error, refresh }
}
