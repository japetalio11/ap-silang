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
  action: string
  table_name: string
  record_id: string
  details?: string | null
  ip_address?: string | null
  timestamp: string
  user?: {
    first_name: string
    last_name: string
    role: string
    email?: string | null
  }
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
  const response = await apiRequest<{ result: AuditLogEntry[] }>("/audit-trail/getAll", {
    token,
    cache: "no-store",
  })
  return response.result || []
}

