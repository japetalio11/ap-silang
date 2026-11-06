import { apiRequest } from "@/lib/api"
import type { MaternalRecord } from "@/features/maternal-records/api"

type StaffCacheRecord = { user_id?: string }

const warmingScopes = new Set<string>()

async function runWithLimit<T>(items: T[], limit: number, task: (item: T) => Promise<unknown>) {
  let index = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++]
      if (item !== undefined) await task(item).catch(() => undefined)
    }
  })
  await Promise.all(workers)
}

/** Warm the same read endpoints used across the signed-in tabs for offline use. */
export async function warmOfflineData(token: string, userId: string, facilityId?: string | null) {
  if (typeof navigator === "undefined" || !navigator.onLine) return
  const warmKey = `${userId}:${facilityId ?? ""}`
  if (warmingScopes.has(warmKey)) return
  warmingScopes.add(warmKey)

  try {
    const coreReads = await Promise.allSettled([
      apiRequest<{ result?: MaternalRecord[] }>("/mother/active", { token }),
      apiRequest("/appointment/getAll", { token }),
      apiRequest("/referral/getAll", { token }),
      apiRequest("/message/getAll", { token }),
      apiRequest("/user/facility", { token }),
      apiRequest("/auth/staff", { token }),
      apiRequest("/facility/public-list"),
      apiRequest(`/user/${encodeURIComponent(userId)}`, { token }),
      ...(facilityId ? [apiRequest(`/facility/${encodeURIComponent(facilityId)}`, { token })] : []),
    ])

    const motherResponse = coreReads[0]
    const mothers = motherResponse?.status === "fulfilled"
      ? (motherResponse.value as { result?: MaternalRecord[] }).result ?? []
      : []
    const motherIds = [...new Set(mothers.map((mother) => mother.mother_id).filter(Boolean))]
    await runWithLimit(motherIds, 3, (motherId) => apiRequest(`/mother/composite/${encodeURIComponent(motherId)}`, { token }))

    const staffResponse = coreReads[5]
    const staff = staffResponse?.status === "fulfilled"
      ? (staffResponse.value as { result?: StaffCacheRecord[] }).result ?? []
      : []
    const staffIds = [...new Set([userId, ...staff.map((person) => person.user_id)].filter((id): id is string => Boolean(id)))]
    await runWithLimit(staffIds, 3, async (staffId) => {
      await Promise.allSettled([
        apiRequest(`/user/${encodeURIComponent(staffId)}`, { token }),
        apiRequest(`/user/${encodeURIComponent(staffId)}/activities?limit=10`, { token }),
      ])
    })
  } finally {
    warmingScopes.delete(warmKey)
  }
}

export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    // Browser policy may deny persistent storage; offline caching still works.
  }
}
