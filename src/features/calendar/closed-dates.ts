export interface ClosedDateRecord {
  id: string
  facilityId: string
  date: string
  reason: string
  createdAt: string
}

const STORAGE_KEY_PREFIX = "silang.closed_dates."

function getStorageKey(facilityId?: string | null): string {
  return `${STORAGE_KEY_PREFIX}${facilityId || "default"}`
}

export function getClosedDates(facilityId?: string | null): ClosedDateRecord[] {
  if (typeof window === "undefined") return []
  try {
    if (facilityId) {
      const scopedRaw = window.localStorage.getItem(getStorageKey(facilityId))
      if (scopedRaw) {
        const parsed = JSON.parse(scopedRaw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    }
    const defaultRaw = window.localStorage.getItem(getStorageKey(null))
    if (!defaultRaw) return []
    const parsedDefault = JSON.parse(defaultRaw)
    return Array.isArray(parsedDefault) ? parsedDefault : []
  } catch {
    return []
  }
}

export function saveClosedDate(date: string, reason: string, facilityId?: string | null): ClosedDateRecord {
  const existing = getClosedDates(facilityId)
  const newRecord: ClosedDateRecord = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    facilityId: facilityId || "default",
    date,
    reason: reason.trim() || "Clinic Closed",
    createdAt: new Date().toISOString(),
  }
  const filtered = existing.filter((item) => item.date !== date)
  const updated = [...filtered, newRecord].sort((a, b) => a.date.localeCompare(b.date))
  window.localStorage.setItem(getStorageKey(facilityId), JSON.stringify(updated))
  window.dispatchEvent(new Event("silang:closed-dates-updated"))
  return newRecord
}

export function removeClosedDate(id: string, facilityId?: string | null): void {
  const existing = getClosedDates(facilityId)
  const updated = existing.filter((item) => item.id !== id)
  window.localStorage.setItem(getStorageKey(facilityId), JSON.stringify(updated))
  window.dispatchEvent(new Event("silang:closed-dates-updated"))
}

export function isDateClosed(dateStr: string, facilityId?: string | null): boolean {
  const existing = getClosedDates(facilityId)
  return existing.some((item) => item.date === dateStr)
}

