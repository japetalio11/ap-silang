import { apiRequest } from "@/lib/api"

export type FacilityItem = {
  facility_id: string
  facility_name: string
  address: string
  contact_number: string
  email: string
  type: string
  facility_profile_url?: string | null
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
    cache: "no-store",
  })
  return response.result
}

export async function fetchAllFacilities(token: string): Promise<FacilityItem[]> {
  const response = await apiRequest<{ result: FacilityItem[] }>("/facility/getAll", {
    token,
    cache: "no-store",
  })
  return response.result
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

export async function fetchAuditLogs(token: string): Promise<AuditLogEntry[]> {
  const response = await apiRequest<{ result?: AuditLogEntry[]; data?: AuditLogEntry[] }>(
    "/audit-trail/getAll?page_size=150",
    {
      token,
      cache: "no-store",
    },
  )
  return response.data || response.result || []
}

export async function fetchStaffMembers(
  token: string,
  params?: { facility_id?: string; role?: string; is_active?: string },
): Promise<StaffItem[]> {
  const query = new URLSearchParams()
  query.set("all", "true")
  if (params?.facility_id && params.facility_id !== "all") query.set("facility_id", params.facility_id)
  if (params?.role && params.role !== "all") query.set("role", params.role)
  if (params?.is_active && params.is_active !== "all") query.set("is_active", params.is_active)

  const response = await apiRequest<{ result?: StaffItem[]; data?: StaffItem[] }>(
    `/user/facility?${query.toString()}`,
    {
      token,
      cache: "no-store",
    },
  )
  return response.result || response.data || []
}

export async function updateStaffRole(token: string, userId: string, role: string): Promise<void> {
  await apiRequest(`/user/${encodeURIComponent(userId)}/role`, {
    method: "PUT",
    token,
    body: JSON.stringify({ role }),
  })
}

export async function updateStaffActiveStatus(token: string, userId: string, is_active: boolean): Promise<void> {
  await apiRequest(`/user/${encodeURIComponent(userId)}/deactivate`, {
    method: "PUT",
    token,
    body: JSON.stringify({ is_active }),
  })
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
    cache: "no-store",
  })
  return response.result
}

export async function fetchDatabaseMaintenanceStats(token: string): Promise<DatabaseMaintenanceStats> {
  const response = await apiRequest<{ result: DatabaseMaintenanceStats }>("/facility/database-stats", {
    token,
    cache: "no-store",
  })
  return response.result
}

export async function fetchDuplicateCheck(token: string): Promise<DuplicateCheckResult> {
  const response = await apiRequest<{ result: DuplicateCheckResult }>("/facility/check-duplicates", {
    token,
    cache: "no-store",
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
  const response = await apiRequest<{ result: FacilityHubDetails }>(`/facility/${encodeURIComponent(facilityId)}/hub`, {
    token,
    cache: "no-store",
  })
  return response.result
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
