import type { ChromeTabGroupColor, ChromeTabGroupSnapshot, ChromeTabItem } from '../types/tabGroup'

export interface ChromeTabGroupState {
  groups: ChromeTabGroupSnapshot[]
  ungroupedTabs: ChromeTabItem[]
  windowId: number | null
}

function getChromeApi(): typeof chrome {
  if (
    typeof chrome === 'undefined' ||
    !chrome.runtime?.id ||
    !chrome.tabs?.query ||
    !chrome.tabGroups?.query
  ) {
    throw new Error('Chrome Tab Groups are unavailable. Reload SKOPE in a supported Chrome version.')
  }

  return chrome
}

function toChromeTabItem(tab: chrome.tabs.Tab): ChromeTabItem | null {
  if (tab.id === undefined) return null

  return {
    id: tab.id,
    title: tab.title?.trim() || tab.url || 'Untitled tab',
    url: tab.url,
    favIconUrl: tab.favIconUrl,
    active: tab.active,
  }
}

async function fingerprintTabs(tabs: ChromeTabItem[]): Promise<string> {
  const signature = tabs
    .map((tab) => tab.url?.trim() || `title:${tab.title}`)
    .sort()
    .join('\n')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function queryChromeTabGroups(): Promise<ChromeTabGroupState> {
  const api = getChromeApi()
  const [activeTabs] = await Promise.all([
    api.tabs.query({ active: true, lastFocusedWindow: true }),
  ])
  const windowId = activeTabs[0]?.windowId
  if (windowId === undefined) {
    return { groups: [], ungroupedTabs: [], windowId: null }
  }

  const [chromeGroups, windowTabs] = await Promise.all([
    api.tabGroups.query({ windowId }),
    api.tabs.query({ windowId }),
  ])

  const tabsByGroup = new Map<number, ChromeTabItem[]>()
  for (const tab of windowTabs) {
    if (tab.id === undefined || tab.groupId === api.tabGroups.TAB_GROUP_ID_NONE) continue
    const groupTabs = tabsByGroup.get(tab.groupId) ?? []
    const item = toChromeTabItem(tab)
    if (item) groupTabs.push(item)
    tabsByGroup.set(tab.groupId, groupTabs)
  }

  const groups = await Promise.all(
    chromeGroups.map(async (group): Promise<ChromeTabGroupSnapshot | null> => {
      const tabs = tabsByGroup.get(group.id) ?? []
      if (tabs.length === 0) return null

      return {
        id: group.id,
        windowId: group.windowId,
        title: group.title?.trim() ?? '',
        color: group.color,
        collapsed: group.collapsed,
        tabs,
        fingerprint: await fingerprintTabs(tabs),
      }
    }),
  )

  const ungroupedTabs = windowTabs
    .filter((tab) => tab.groupId === api.tabGroups.TAB_GROUP_ID_NONE)
    .map(toChromeTabItem)
    .filter((tab): tab is ChromeTabItem => tab !== null)

  return {
    groups: groups.filter((group): group is ChromeTabGroupSnapshot => group !== null),
    ungroupedTabs,
    windowId,
  }
}

export async function activateChromeTab(tabId: number): Promise<void> {
  const api = getChromeApi()
  const tab = await api.tabs.update(tabId, { active: true })
  if (!tab) throw new Error('That Chrome tab is no longer available.')
}

export async function createChromeTabGroup(
  tabIds: number[],
  windowId: number,
  title: string,
  color: ChromeTabGroupColor,
): Promise<number> {
  const api = getChromeApi()
  if (tabIds.length === 0) throw new Error('Select at least one ungrouped tab.')

  const uniqueTabIds = [...new Set(tabIds)]
  const selectedTabs = await api.tabs.query({ windowId })
  const selectedTabsById = new Map(selectedTabs.map((tab) => [tab.id, tab]))
  const allTabsAreUngrouped = uniqueTabIds.every((tabId) => {
    const tab = selectedTabsById.get(tabId)
    return tab && tab.groupId === api.tabGroups.TAB_GROUP_ID_NONE
  })
  if (!allTabsAreUngrouped) {
    throw new Error('Some selected tabs changed. Refresh the list and select ungrouped tabs again.')
  }
  if (!title.trim() || title.trim().length > 40) {
    throw new Error('Group names must contain 1 to 40 characters.')
  }

  const groupId = await api.tabs.group({
    tabIds: [uniqueTabIds[0], ...uniqueTabIds.slice(1)],
    createProperties: { windowId },
  })
  await api.tabGroups.update(groupId, { title, color })
  return groupId
}

export function subscribeToChromeTabGroupChanges(
  onChange: () => void,
  onGroupRemoved?: (groupId: number) => void,
): () => void {
  const api = getChromeApi()
  const handleChange = () => onChange()
  const handleGroupRemoved = (group: chrome.tabGroups.TabGroup) => {
    onGroupRemoved?.(group.id)
    onChange()
  }
  const tabGroupEvents = [
    api.tabGroups.onCreated,
    api.tabGroups.onUpdated,
    api.tabGroups.onMoved,
  ]
  const tabEvents = [
    api.tabs.onCreated,
    api.tabs.onUpdated,
    api.tabs.onRemoved,
    api.tabs.onMoved,
    api.tabs.onAttached,
    api.tabs.onDetached,
    api.tabs.onActivated,
    api.tabs.onReplaced,
  ]

  tabGroupEvents.forEach((event) => event.addListener(handleChange))
  api.tabGroups.onRemoved.addListener(handleGroupRemoved)
  tabEvents.forEach((event) => event.addListener(handleChange))

  return () => {
    tabGroupEvents.forEach((event) => event.removeListener(handleChange))
    api.tabGroups.onRemoved.removeListener(handleGroupRemoved)
    tabEvents.forEach((event) => event.removeListener(handleChange))
  }
}
