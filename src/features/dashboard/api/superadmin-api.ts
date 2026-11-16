import { apiRequest } from "@/lib/api"
import { db, type LocalStaff, type LocalMother } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"

export type FacilityItem = {
  facility_id: string
  facility_name: string
  address: string
  contact_number: string
  email: string
  type: string
  facility_profile_url?: string | null
  is_active?: boolean
}

export type FacilityOverviewSummary = {
  facility_id: string
  facility_name: string
  type: string
  address: string
  _count: {
    users: number
    appointments: number
    motherEnrollments: number
    onlineReferralsFrom: number
    onlineReferralsTo: number
  }
}

export type MunicipalOverview = {
  totalFacilities: number
  totalMothers: number
  activePregnancies: number
  totalReferrals: number
  facilitiesSummary: FacilityOverviewSummary[]
}

export type AuditLogEntry = {
  audit_id: string
  user_id: string
  action_type?: string
  action?: string
  table_name: string
  record_id?: string
  details?: string | null
  previous_state?: string | null
  new_state?: string | null
  ip_address?: string | null
  timestamp?: string
  client_timestamp?: string
  user?: {
    first_name: string
    last_name: string
    role: string
    email?: string | null
    facility?: {
      facility_name: string
      type: string
    } | null
  } | null
}

export type CreateFacilityInput = {
  facility_name: string
  type: string
  address: string
  contact_number: string
  email: string
}

export type UpdateFacilityInput = {
  facility_id: string
  facility_name: string
  type: string
  address: string
  contact_number: string
  email: string
}

export type StaffItem = {
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
  facility?: {
    facility_id: string
    facility_name: string
    type: string
  } | null
}

export type MunicipalReports = {
  kpis: {
    totalMothers: number
    totalPregnancies: number
    activePregnancies: number
    completedPregnancies: number
    highRiskPregnancies: number
    lowRiskPregnancies: number
    totalDeliveries: number
    liveBirths: number
    stillBirths: number
    maternalComplicated: number
    breastfeedingRate: number
    totalReferrals: number
  }
  deliveryPlaces: { place: string; count: number }[]
  deliveryModes: { mode: string; count: number }[]
  referralStatus: Record<string, number>
  facilitiesSummary: {
    facility_id: string
    facility_name: string
    type: string
    enrolledMothers: number
    referralsSent: number
    appointments: number
  }[]
}

export type DatabaseMaintenanceStats = {
  tableCounts: {
    facilities: number
    staffUsers: number
    mothers: number
    pregnancies: number
    prenatalVisits: number
    deliveries: number
    newborns: number
    referrals: number
    auditLogs: number
  }
  syncTelemetry: {
    unsyncedTotal: number
    unsyncedMothers: number
    unsyncedPregnancies: number
    unsyncedVisits: number
    recentAudit24h: number
  }
  databaseStatus: {
    driver: string
    connection: string
    lastHealthCheck: string
  }
}

export type DuplicateCheckResult = {
  duplicateSerialCount: number
  flaggedRecords: {
    mother_id: string
    family_serial_no: string | null
    birth_date: string
    civil_status: string
    blood_type: string
    user?: {
      first_name: string
      last_name: string
      phone_number?: string | null
      address?: string | null
    } | null
    facilityEnrollments?: {
      facility: {
        facility_name: string
        type: string
      }
    }[]
  }[]
}

export async function fetchMunicipalOverview(token: string): Promise<MunicipalOverview> {
  const response = await apiRequest<{ result: MunicipalOverview }>("/facility/overview", {
    token,
  })
  return response.result
}

export async function fetchAllFacilities(token: string): Promise<FacilityItem[]> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const local = await db.facilities.toArray().catch(() => [])
    if (local.length > 0) return local as FacilityItem[]
  }

  try {
    const response = await apiRequest<{ result: FacilityItem[] }>("/facility/getAll", {
      token,
    })
    if (Array.isArray(response.result)) {
      await db.facilities.bulkPut(
        response.result.map((f) => ({
          id: f.facility_id,
          facility_id: f.facility_id,
          facility_name: f.facility_name,
          type: f.type,
          address: f.address,
          contact_number: f.contact_number,
          email: f.email,
          facility_profile_url: f.facility_profile_url || null,
          is_active: f.is_active !== undefined ? f.is_active : true,
          sync_status: "synced",
          updated_at: Date.now(),
        }))
      ).catch(() => {})
    }
    return response.result
  } catch (error) {
    const local = await db.facilities.toArray().catch(() => [])
    if (local.length > 0) return local as FacilityItem[]
    throw error
  }
}

export async function createFacilityRecord(token: string, payload: CreateFacilityInput): Promise<FacilityItem> {
  const response = await apiRequest<{ result: FacilityItem }>("/facility/register", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  })
  return response.result
}

export async function updateFacilityRecord(token: string, payload: UpdateFacilityInput): Promise<FacilityItem> {
  const response = await apiRequest<{ result: FacilityItem }>("/facility/update", {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  })
  return response.result
}

export async function deleteFacilityRecord(token: string, facilityId: string): Promise<void> {
  await apiRequest(`/facility/delete/${encodeURIComponent(facilityId)}`, {
    method: "DELETE",
    token,
    body: JSON.stringify({ facility_id: facilityId }),
  })
}

export async function toggleFacilityStatus(token: string, facilityId: string, isActive: boolean): Promise<FacilityItem> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const existing = await db.facilities.get(facilityId).catch(() => undefined)
    if (existing) {
      await db.facilities.update(facilityId, {
        is_active: isActive,
        sync_status: "pending_update",
        updated_at: Date.now(),
      }).catch(() => {})
    }
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "facility",
      action: "UPDATE",
      endpoint: `/facility/${encodeURIComponent(facilityId)}/status`,
      method: "PATCH",
      payload: { facility_id: facilityId, is_active: isActive },
      temp_id: facilityId,
    })
    return {
      ...(existing || {
        facility_id: facilityId,
        facility_name: "Facility",
        address: "",
        contact_number: "",
        email: "",
        type: "RHU",
      }),
      is_active: isActive,
    }
  }

  const response = await apiRequest<{ result: FacilityItem }>(`/facility/${encodeURIComponent(facilityId)}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ is_active: isActive }),
  })
  if (response.result) {
    await db.facilities.update(facilityId, {
      is_active: isActive,
      sync_status: "synced",
      updated_at: Date.now(),
    }).catch(() => {})
  }
  return response.result
}

export async function fetchAuditLogs(token: string): Promise<AuditLogEntry[]> {
  const response = await apiRequest<{ result?: AuditLogEntry[]; data?: AuditLogEntry[] }>(
    "/audit-trail/getAll?page_size=150",
    {
      token,
    },
  )
  return response.data || response.result || []
}

export async function fetchStaffMembers(
  token: string,
  params?: { facility_id?: string; role?: string; is_active?: string },
): Promise<StaffItem[]> {
  const filterLocal = (list: any[]): StaffItem[] => {
    return list.filter((s) => {
      if (params?.facility_id && params.facility_id !== "all" && s.facility_id !== params.facility_id) return false
      if (params?.role && params.role !== "all" && s.role?.toLowerCase() !== params.role.toLowerCase()) return false
      if (params?.is_active && params.is_active !== "all") {
        const activeBool = params.is_active === "true"
        if (Boolean(s.is_active) !== activeBool) return false
      }
      return true
    })
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const local = await db.staff.toArray().catch(() => [])
    return filterLocal(local)
  }

  try {
    const query = new URLSearchParams()
    query.set("all", "true")
    if (params?.facility_id && params.facility_id !== "all") query.set("facility_id", params.facility_id)
    if (params?.role && params.role !== "all") query.set("role", params.role)
    if (params?.is_active && params.is_active !== "all") query.set("is_active", params.is_active)

    const response = await apiRequest<{ result?: StaffItem[]; data?: StaffItem[] }>(
      `/user/facility?${query.toString()}`,
      { token },
    )
    const serverItems = response.result || response.data || []
    if (Array.isArray(serverItems) && serverItems.length > 0) {
      await db.staff.bulkPut(
        serverItems.map((s) => ({
          id: s.user_id,
          user_id: s.user_id,
          facility_id: s.facility_id,
          first_name: s.first_name,
          middle_name: s.middle_name || null,
          last_name: s.last_name,
          role: s.role,
          phone_number: s.phone_number || null,
          email: s.email || null,
          address: s.address || null,
          profile_url: s.profile_url || null,
          is_active: s.is_active,
          sync_status: "synced",
          updated_at: Date.now(),
        }))
      ).catch(() => {})
    }
    const pending = await db.staff.where("sync_status").anyOf("pending_create", "pending_update").toArray().catch(() => [])
    const onlineIds = new Set(serverItems.map((s) => s.user_id))
    const uniquePending = pending.filter((s) => !onlineIds.has(s.user_id))
    return filterLocal([...uniquePending, ...serverItems])
  } catch (error) {
    const local = await db.staff.toArray().catch(() => [])
    if (local.length > 0) {
      return filterLocal(local)
    }
    throw error
  }
}

export async function updateStaffRole(token: string, userId: string, role: string): Promise<void> {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine
  if (isOffline) {
    const existing = await db.staff.get(userId).catch(() => undefined) || await db.staff.where("user_id").equals(userId).first().catch(() => undefined)
    if (existing) {
      await db.staff.update(existing.id, {
        role,
        sync_status: "pending_update",
        updated_at: Date.now(),
      }).catch(() => {})
    }
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "staff",
      action: "UPDATE",
      endpoint: `/user/${encodeURIComponent(userId)}/role`,
      method: "PUT",
      payload: { user_id: userId, role },
      temp_id: userId,
    })
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("silang:staff-updated", { detail: { staffId: userId, role } }))
    }
    return
  }

  await apiRequest(`/user/${encodeURIComponent(userId)}/role`, {
    method: "PUT",
    token,
    body: JSON.stringify({ role }),
  })
  const existing = await db.staff.get(userId).catch(() => undefined) || await db.staff.where("user_id").equals(userId).first().catch(() => undefined)
  if (existing) {
    await db.staff.update(existing.id, {
      role,
      sync_status: "synced",
      updated_at: Date.now(),
    }).catch(() => {})
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("silang:staff-updated", { detail: { staffId: userId, role } }))
  }
}

export async function updateStaffActiveStatus(token: string, userId: string, is_active: boolean): Promise<void> {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine
  if (isOffline) {
    const existing = await db.staff.get(userId).catch(() => undefined) || await db.staff.where("user_id").equals(userId).first().catch(() => undefined)
    if (existing) {
      await db.staff.update(existing.id, {
        is_active,
        sync_status: "pending_update",
        updated_at: Date.now(),
      }).catch(() => {})
    }
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "staff",
      action: "UPDATE",
      endpoint: `/user/${encodeURIComponent(userId)}/deactivate`,
      method: "PUT",
      payload: { user_id: userId, is_active },
      temp_id: userId,
    })
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("silang:staff-updated", { detail: { staffId: userId, is_active } }))
    }
    return
  }

  await apiRequest(`/user/${encodeURIComponent(userId)}/deactivate`, {
    method: "PUT",
    token,
    body: JSON.stringify({ is_active }),
  })
  const existing = await db.staff.get(userId).catch(() => undefined) || await db.staff.where("user_id").equals(userId).first().catch(() => undefined)
  if (existing) {
    await db.staff.update(existing.id, {
      is_active,
      sync_status: "synced",
      updated_at: Date.now(),
    }).catch(() => {})
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("silang:staff-updated", { detail: { staffId: userId, is_active } }))
  }
}

export async function adminResetStaffPassword(token: string, userId: string, newPassword: string): Promise<void> {
  await apiRequest(`/user/${encodeURIComponent(userId)}/admin-reset-password`, {
    method: "PUT",
    token,
    body: JSON.stringify({ newPassword }),
  })
}

export async function fetchMunicipalReports(token: string): Promise<MunicipalReports> {
  const response = await apiRequest<{ result: MunicipalReports }>("/facility/municipal-reports", {
    token,
  })
  return response.result
}

export async function fetchDatabaseMaintenanceStats(token: string): Promise<DatabaseMaintenanceStats> {
  const response = await apiRequest<{ result: DatabaseMaintenanceStats }>("/facility/database-stats", {
    token,
  })
  return response.result
}

export async function fetchDuplicateCheck(token: string): Promise<DuplicateCheckResult> {
  const response = await apiRequest<{ result: DuplicateCheckResult }>("/facility/check-duplicates", {
    token,
  })
  return response.result
}

export type FacilityHubMother = {
  enrollment_id: string
  status: string
  enrolled_at: string
  mother: {
    mother_id: string
    family_serial_no: string | null
    birth_date: string
    blood_type: string
    user?: {
      first_name: string
      last_name: string
      phone_number?: string | null
      address?: string | null
    } | null
  }
}

export type FacilityHubReferral = {
  referral_id: string
  reason: string
  status: string
  date_referred: string
  external_facility_name?: string | null
  toFacility?: { facility_name: string; type: string } | null
  fromFacility?: { facility_name: string; type: string } | null
  pregnancy?: {
    pregnancy_id: string
    gravida: number
    parity: number
    mother?: {
      mother_id: string
      family_serial_no: string | null
      user?: {
        first_name: string
        last_name: string
      } | null
    } | null
  } | null
}

export type FacilityHubSchedule = {
  schedule_id: string
  available_date: string
  available_time_slot?: string | null
  max_slots: number
  booked_slots: number
  is_available: boolean
}

export type FacilityHubDetails = FacilityItem & {
  users: StaffItem[]
  motherEnrollments: FacilityHubMother[]
  onlineReferralsFrom: FacilityHubReferral[]
  onlineReferralsTo: FacilityHubReferral[]
  schedules: FacilityHubSchedule[]
  _count: {
    users: number
    motherEnrollments: number
    appointments: number
    onlineReferralsFrom: number
    onlineReferralsTo: number
  }
}

export async function fetchFacilityHubDetails(token: string, facilityId: string): Promise<FacilityHubDetails> {
  const effectiveId = await silangSyncEngine.resolveId(facilityId)
  const synthesizeHub = async (): Promise<FacilityHubDetails | null> => {
    const fac =
      (await db.facilities.get(effectiveId).catch(() => null)) ||
      (await db.facilities.where("facility_id").equals(effectiveId).first().catch(() => null)) ||
      (await db.facilities.get(facilityId).catch(() => null)) ||
      (await db.facilities.where("facility_id").equals(facilityId).first().catch(() => null))
    if (!fac) return null
    const staffList: LocalStaff[] =
      (await db.staff.where("facility_id").equals(effectiveId).toArray().catch(() => [])) || []
    if (staffList.length === 0 && effectiveId !== facilityId) {
      const fallbackStaff = await db.staff.where("facility_id").equals(facilityId).toArray().catch(() => [])
      staffList.push(...fallbackStaff)
    }
    const motherList: LocalMother[] =
      (await db.mothers.where("facility_id").equals(effectiveId).toArray().catch(() => [])) || []
    if (motherList.length === 0 && effectiveId !== facilityId) {
      const fallbackMothers = await db.mothers.where("facility_id").equals(facilityId).toArray().catch(() => [])
      motherList.push(...fallbackMothers)
    }
    return {
      facility_id: fac.facility_id,
      facility_name: fac.facility_name,
      address: fac.address,
      contact_number: fac.contact_number,
      email: fac.email,
      type: fac.type,
      facility_profile_url: fac.facility_profile_url,
      is_active: fac.is_active !== undefined ? fac.is_active : true,
      users: staffList.map((s) => ({
        user_id: s.user_id,
        facility_id: s.facility_id ?? fac.facility_id,
        first_name: s.first_name,
        middle_name: s.middle_name,
        last_name: s.last_name,
        role: s.role,
        phone_number: s.phone_number,
        email: s.email,
        address: s.address,
        profile_url: s.profile_url,
        is_active: s.is_active,
        facility: {
          facility_id: fac.facility_id,
          facility_name: fac.facility_name,
          type: fac.type,
        },
      })),
      motherEnrollments: motherList.map((m) => ({
        enrollment_id: m.id || m.mother_id,
        status: "Active",
        enrolled_at: new Date(m.updated_at || Date.now()).toISOString(),
        mother: {
          mother_id: m.mother_id,
          family_serial_no: m.family_serial_no || null,
          birth_date: m.birth_date || "",
          blood_type: m.blood_type || "",
          user: {
            first_name: m.first_name || "",
            last_name: m.last_name || "",
            phone_number: m.phone_number,
            address: m.address,
          },
        },
      })),
      onlineReferralsFrom: [],
      onlineReferralsTo: [],
      schedules: [],
      _count: {
        users: staffList.length,
        motherEnrollments: motherList.length,
        appointments: 0,
        onlineReferralsFrom: 0,
        onlineReferralsTo: 0,
      },
    }
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const synthesized = await synthesizeHub()
    if (synthesized) return synthesized
  }

  try {
    const response = await apiRequest<{ result: FacilityHubDetails }>(`/facility/${encodeURIComponent(effectiveId)}/hub`, {
      token,
    })
    if (response?.result?.users && Array.isArray(response.result.users)) {
      await db.staff.bulkPut(
        response.result.users.map((s) => ({
          id: s.user_id,
          user_id: s.user_id,
          facility_id: s.facility_id || effectiveId,
          first_name: s.first_name,
          middle_name: s.middle_name || null,
          last_name: s.last_name,
          role: s.role,
          phone_number: s.phone_number || null,
          email: s.email || null,
          address: s.address || null,
          profile_url: s.profile_url || null,
          is_active: s.is_active,
          sync_status: "synced",
          updated_at: Date.now(),
        }))
      ).catch(() => {})
    }
    return response.result
  } catch (error) {
    const synthesized = await synthesizeHub()
    if (synthesized) return synthesized
    throw error
  }
}

export async function reassignStaffFacility(
  token: string,
  facilityId: string,
  payload: { user_id: string; target_facility_id: string },
): Promise<void> {
  await apiRequest(`/facility/${encodeURIComponent(facilityId)}/reassign-staff`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  })
}

export async function reassignMotherFacility(
  token: string,
  facilityId: string,
  payload: { mother_id: string; target_facility_id: string; notes?: string },
): Promise<void> {
  await apiRequest(`/facility/${encodeURIComponent(facilityId)}/reassign-mother`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  })
}
