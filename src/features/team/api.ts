import { apiRequest } from "@/lib/api"
import { db, type LocalStaff } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"

export type StaffApiRecord = {
  user_id: string
  facility_id: string | null
  first_name: string
  middle_name?: string | null
  last_name: string
  role: string
  phone_number?: string | null
  email?: string | null
  address?: string | null
  profile_url?: string | null
  is_active: boolean
  updated_at?: string
  facility?: { facility_id: string; facility_name: string; type?: string; address?: string; contact_number?: string; email?: string }
  facility_name?: string
}

export type StaffRecord = {
  id: string
  name: string
  avatar: string
  status: string
  role: string
  facility: string
  facilityId: string
  email: string
  phone: string
  license?: string
  joinedOn?: string
}

export type StaffActivity = { id: string; title: string; subtitle: string; details: string; timestamp: string }

export function mapStaffRecord(staff: StaffApiRecord): StaffRecord {
  const fullName = [staff.first_name, staff.middle_name, staff.last_name].filter(Boolean).join(" ")
  const normalizedRole = staff.role.toLowerCase()
  return {
    id: staff.user_id,
    name: fullName,
    avatar: staff.profile_url ?? "",
    status: staff.is_active ? "Active" : "Deactivated",
    role: normalizedRole.includes("admin") || normalizedRole.includes("super") ? "Admin" : normalizedRole.includes("midwife") ? "Midwife" : "Nurse",
    facility: staff.facility?.facility_name ?? staff.facility_name ?? "Unassigned",
    facilityId: staff.facility_id ?? "",
    email: staff.email ?? "",
    phone: staff.phone_number ?? "",
    joinedOn: staff.updated_at ? new Date(staff.updated_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : undefined,
  }
}

export async function getFacilityStaff(token: string): Promise<StaffRecord[]> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const local = await db.staff.toArray().catch(() => [])
    return local.map((s) => mapStaffRecord(s as any))
  }

  try {
    const response = await apiRequest<{ result: StaffApiRecord[] }>("/user/facility", { token })
    if (Array.isArray(response.result)) {
      for (const s of response.result) {
        await db.staff.put({
          id: s.user_id,
          user_id: s.user_id,
          facility_id: s.facility_id,
          first_name: s.first_name,
          middle_name: s.middle_name,
          last_name: s.last_name,
          role: s.role,
          phone_number: s.phone_number,
          email: s.email,
          address: s.address,
          profile_url: s.profile_url,
          is_active: s.is_active,
          sync_status: "synced",
          updated_at: Date.now(),
        }).catch(() => {})
      }
    }
    const pending = await db.staff.where("sync_status").anyOf("pending_create", "pending_update").toArray().catch(() => [])
    const onlineIds = new Set((response.result || []).map((s) => s.user_id))
    const uniquePending = pending.filter((s) => !onlineIds.has(s.user_id)).map((s) => mapStaffRecord(s as any))
    return [...uniquePending, ...(response.result ?? []).map(mapStaffRecord)]
  } catch (error) {
    const local = await db.staff.toArray().catch(() => [])
    if (local.length > 0) {
      return local.map((s) => mapStaffRecord(s as any))
    }
    throw error
  }
}

export async function getStaffById(token: string, id: string) {
  const response = await apiRequest<{ result: StaffApiRecord }>(`/user/${encodeURIComponent(id)}`, { token })
  return mapStaffRecord(response.result)
}

export async function getStaffActivities(token: string, id: string) {
  const response = await apiRequest<{ result: { activities: StaffActivity[] } }>(`/user/${encodeURIComponent(id)}/activities?limit=10`, { token })
  return response.result?.activities ?? []
}

export async function createStaff(
  token: string,
  payload: { first_name: string; last_name: string; middle_name?: string; role: string; phone_number?: string; email?: string; password: string; facility_id?: string }
): Promise<{ message: string; user: StaffApiRecord; offline?: boolean }> {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine

  if (isOffline) {
    const tempId = `temp-staff-${crypto.randomUUID()}`
    const localStaff: LocalStaff = {
      id: tempId,
      user_id: tempId,
      facility_id: payload.facility_id || null,
      first_name: payload.first_name,
      middle_name: payload.middle_name || null,
      last_name: payload.last_name,
      role: payload.role,
      phone_number: payload.phone_number || null,
      email: payload.email || null,
      is_active: true,
      sync_status: "pending_create",
      updated_at: Date.now(),
    }
    await db.staff.put(localStaff)
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "staff",
      action: "CREATE",
      endpoint: "/auth/create-staff",
      method: "POST",
      payload,
      temp_id: tempId,
    })
    return { message: "Staff created offline", user: localStaff as any, offline: true }
  }

  try {
    const response = await apiRequest<{ message: string; user: StaffApiRecord }>("/auth/create-staff", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    })
    if (response.user) {
      await db.staff.put({
        id: response.user.user_id,
        user_id: response.user.user_id,
        facility_id: response.user.facility_id,
        first_name: response.user.first_name,
        middle_name: response.user.middle_name,
        last_name: response.user.last_name,
        role: response.user.role,
        phone_number: response.user.phone_number,
        email: response.user.email,
        address: response.user.address,
        profile_url: response.user.profile_url,
        is_active: response.user.is_active,
        sync_status: "synced",
        updated_at: Date.now(),
      }).catch(() => {})
    }
    return response
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempId = `temp-staff-${crypto.randomUUID()}`
      const localStaff: LocalStaff = {
        id: tempId,
        user_id: tempId,
        facility_id: payload.facility_id || null,
        first_name: payload.first_name,
        middle_name: payload.middle_name || null,
        last_name: payload.last_name,
        role: payload.role,
        phone_number: payload.phone_number || null,
        email: payload.email || null,
        is_active: true,
        sync_status: "pending_create",
        updated_at: Date.now(),
      }
      await db.staff.put(localStaff)
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "staff",
        action: "CREATE",
        endpoint: "/auth/create-staff",
        method: "POST",
        payload,
        temp_id: tempId,
      })
      return { message: "Staff created offline", user: localStaff as any, offline: true }
    }
    throw error
  }
}

export function updateStaffRole(token: string, id: string, role: string) {
  return apiRequest<{ result: StaffApiRecord }>(`/user/${encodeURIComponent(id)}/role`, { method: "PUT", token, body: JSON.stringify({ role }) })
}

export function setStaffActive(token: string, id: string, is_active: boolean) {
  return apiRequest<{ result: StaffApiRecord }>(`/user/${encodeURIComponent(id)}/deactivate`, { method: "PUT", token, body: JSON.stringify({ is_active }) })
}

export function resetStaffPassword(token: string, id: string, newPassword: string) {
  return apiRequest<{ message: string }>(`/user/${encodeURIComponent(id)}/admin-reset-password`, { method: "PUT", token, body: JSON.stringify({ newPassword }) })
}
