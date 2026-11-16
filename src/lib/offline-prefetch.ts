import { apiRequest } from "@/lib/api"
import type { MaternalRecord } from "@/features/maternal-records/api"
import { db, type LocalMother, type SyncStatus } from "@/lib/db/silangDatabase"

type FacilityCacheRecord = { facility_id: string; facility_name: string; type: string; address?: string; contact_number?: string; email?: string }

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

export async function warmSuperAdminOfflineData(token: string, userId: string) {
  if (typeof navigator === "undefined" || !navigator.onLine) return
  const warmKey = `superadmin:${userId}`
  if (warmingScopes.has(warmKey)) return
  warmingScopes.add(warmKey)

  try {
    const adminReads = await Promise.allSettled([
      apiRequest("/facility/overview", { token }),
      apiRequest<{ result?: FacilityCacheRecord[] }>("/facility/getAll", { token }),
      apiRequest("/facility/municipal-reports", { token }),
      apiRequest("/facility/database-stats", { token }),
      apiRequest("/facility/check-duplicates", { token }),
      apiRequest("/audit-trail/getAll?page_size=150", { token }),
      apiRequest("/user/facility?all=true", { token }),
      apiRequest(`/user/${encodeURIComponent(userId)}`, { token }),
    ])

    const facResponse = adminReads[1]
    const facilities = facResponse?.status === "fulfilled"
      ? (facResponse.value as { result?: FacilityCacheRecord[] }).result ?? []
      : []

    const staffResponse = adminReads[6]
    const staffRaw = staffResponse?.status === "fulfilled"
      ? (staffResponse.value as { result?: any[]; data?: any[] })?.result ?? (staffResponse.value as { result?: any[]; data?: any[] })?.data ?? (Array.isArray(staffResponse.value) ? staffResponse.value : [])
      : []

    if (Array.isArray(staffRaw) && staffRaw.length > 0) {
      await db.staff.bulkPut(
        staffRaw.map((s: any) => ({
          id: s.user_id,
          user_id: s.user_id,
          facility_id: s.facility_id || null,
          first_name: s.first_name,
          middle_name: s.middle_name || null,
          last_name: s.last_name,
          role: s.role,
          phone_number: s.phone_number || null,
          email: s.email || null,
          profile_url: s.profile_url || null,
          is_active: s.is_active !== undefined ? s.is_active : true,
          sync_status: "synced",
          updated_at: Date.now(),
        }))
      ).catch(() => {})
    }

    if (facilities.length > 0) {
      await db.facilities.bulkPut(
        facilities.map((f) => ({
          id: f.facility_id,
          facility_id: f.facility_id,
          facility_name: f.facility_name,
          type: f.type,
          address: f.address || "",
          contact_number: f.contact_number || "",
          email: f.email || "",
          sync_status: "synced",
          updated_at: Date.now(),
        }))
      ).catch(() => {})

      await runWithLimit(facilities, 3, async (fac) => {
        const hubRes = await apiRequest<{ result?: any }>(`/facility/${encodeURIComponent(fac.facility_id)}/hub`, { token }).catch(() => null)
        if (hubRes?.result?.users && Array.isArray(hubRes.result.users)) {
          await db.staff.bulkPut(
            hubRes.result.users.map((s: any) => ({
              id: s.user_id,
              user_id: s.user_id,
              facility_id: s.facility_id || fac.facility_id,
              first_name: s.first_name,
              middle_name: s.middle_name || null,
              last_name: s.last_name,
              role: s.role,
              phone_number: s.phone_number || null,
              email: s.email || null,
              profile_url: s.profile_url || null,
              is_active: s.is_active !== undefined ? s.is_active : true,
              sync_status: "synced",
              updated_at: Date.now(),
            }))
          ).catch(() => {})
        }
      })
    }
  } finally {
    warmingScopes.delete(warmKey)
  }
}

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

    if (mothers.length > 0) {
      const mothersToStore: LocalMother[] = mothers.map((mother) => ({
        ...mother,
        id: mother.mother_id,
        first_name: mother.user?.first_name,
        middle_name: mother.user?.middle_name,
        last_name: mother.user?.last_name,
        phone_number: mother.user?.phone_number,
        email: mother.user?.email,
        address: mother.user?.address,
        sync_status: (mother.sync_status as SyncStatus) || "synced",
        updated_at: Date.now(),
      }))
      await db.mothers.bulkPut(mothersToStore).catch(() => {})

      const topRecentMotherIds = mothers.slice(0, 3).map((m) => m.mother_id).filter(Boolean)
      if (topRecentMotherIds.length > 0) {
        await runWithLimit(topRecentMotherIds, 2, (motherId) => apiRequest(`/mother/composite/${encodeURIComponent(motherId)}`, { token }))
      }
    }

    await apiRequest(`/user/${encodeURIComponent(userId)}/activities?limit=10`, { token }).catch(() => {})
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
  }
}
