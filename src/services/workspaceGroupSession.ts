const PREFIX = 'skope.tabGroupSession.'

function sessionStorage(): chrome.storage.SessionStorageArea {
  if (typeof chrome === 'undefined' || !chrome.storage?.session) {
    throw new Error('Chrome session storage is unavailable. Reload SKOPE in a supported Chrome version.')
  }
  return chrome.storage.session
}

export async function loadWorkspaceGroupBindings(): Promise<Record<string, string>> {
  const stored = await sessionStorage().get(null)
  const records = Object.entries(stored).flatMap(([key, value]) => {
    if (!key.startsWith(PREFIX) || !value || typeof value !== 'object') return []
    const record = value as Record<string, unknown>
    if (typeof record.groupId !== 'number' || !Number.isInteger(record.groupId) || record.groupId < 0 ||
      typeof record.updatedAt !== 'number' || !Number.isFinite(record.updatedAt)) return []
    return [{ groupId: record.groupId, linkId: key.slice(PREFIX.length), updatedAt: record.updatedAt }]
  }).sort((a, b) => b.updatedAt - a.updatedAt)
  const bindings: Record<string, string> = {}
  for (const record of records) {
    if (bindings[String(record.groupId)] === undefined) bindings[String(record.groupId)] = record.linkId
  }
  return bindings
}

export async function rememberWorkspaceGroupBindings(bindings: Record<string, string>): Promise<void> {
  const entries = Object.entries(bindings)
  if (entries.length === 0) return
  const area = sessionStorage()
  const existing = await area.get(entries.map(([, linkId]) => PREFIX + linkId))
  const updates = Object.fromEntries(entries.flatMap(([groupId, linkId]) => {
    const id = Number(groupId)
    if (!Number.isInteger(id) || id < 0) throw new Error('Invalid Chrome session group identifier.')
    const key = PREFIX + linkId
    const value = existing[key]
    const same = value && typeof value === 'object' && (value as Record<string, unknown>).groupId === id
    return same ? [] : [[key, { groupId: id, updatedAt: Date.now() }]]
  }))
  if (Object.keys(updates).length > 0) await area.set(updates)
}

export async function forgetWorkspaceGroupBindings(linkIds: string[]): Promise<void> {
  if (linkIds.length > 0) await sessionStorage().remove(linkIds.map((id) => PREFIX + id))
}
