import { apiRequest } from "@/lib/api"

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

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      const saved = storage.getItem("silang.auth.session")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.token) return parsed.token
      }
    }
  } catch {}
  return null
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

export async function fetchClosedDates(
  facilityId?: string | null,
  token?: string | null
): Promise<ClosedDateRecord[]> {
  const currentLocal = getClosedDates(facilityId)
  if (!facilityId) return currentLocal

  const authToken = token || getAuthToken()
  if (!authToken) return currentLocal

  try {
    const res = await apiRequest<{ data: any[] }>(
      `/calendar/facility/${facilityId}/closed-dates`,
      { token: authToken }
    )
    if (Array.isArray(res?.data)) {
      const mapped: ClosedDateRecord[] = res.data.map((item) => ({
        id: item.id || item.schedule_id,
        facilityId: item.facilityId || item.facility_id || facilityId,
        date: item.date,
        reason: item.reason || "Clinic Closed",
        createdAt: item.createdAt || new Date().toISOString(),
      }))
      window.localStorage.setItem(getStorageKey(facilityId), JSON.stringify(mapped))
      window.dispatchEvent(new Event("silang:closed-dates-updated"))
      return mapped
    }
  } catch {}

  return currentLocal
}

export function saveClosedDate(
  date: string,
  reason: string,
  facilityId?: string | null,
  token?: string | null
): ClosedDateRecord {
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

  if (facilityId) {
    const authToken = token || getAuthToken()
    if (authToken) {
      apiRequest<{ data: any }>(`/calendar/facility/${facilityId}/closed-dates`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ date, reason: reason.trim() || "Clinic Closed" }),
      })
        .then((res) => {
          if (res?.data?.id || res?.data?.schedule_id) {
            const serverId = res.data.id || res.data.schedule_id
            const current = getClosedDates(facilityId).map((item) =>
              item.date === date ? { ...item, id: serverId } : item
            )
            window.localStorage.setItem(getStorageKey(facilityId), JSON.stringify(current))
          }
        })
        .catch(() => {})
    }
  }

  return newRecord
}

export function removeClosedDate(
  id: string,
  facilityId?: string | null,
  token?: string | null
): void {
  const existing = getClosedDates(facilityId)
  const toDelete = existing.find((item) => item.id === id)
  const updated = existing.filter((item) => item.id !== id)
  window.localStorage.setItem(getStorageKey(facilityId), JSON.stringify(updated))
  window.dispatchEvent(new Event("silang:closed-dates-updated"))

  if (facilityId) {
    const authToken = token || getAuthToken()
    if (authToken) {
      const deletePath = toDelete?.date
        ? `/calendar/facility/${facilityId}/closed-dates?date=${encodeURIComponent(toDelete.date)}`
        : `/calendar/facility/${facilityId}/closed-dates/${encodeURIComponent(id)}`
      apiRequest(deletePath, {
        method: "DELETE",
        token: authToken,
      }).catch(() => {})
    }
  }
}

export function isDateClosed(dateStr: string, facilityId?: string | null): boolean {
  const existing = getClosedDates(facilityId)
  return existing.some((item) => item.date === dateStr)
}
