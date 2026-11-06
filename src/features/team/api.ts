import { apiRequest } from "@/lib/api"

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

export async function getFacilityStaff(token: string) {
  const response = await apiRequest<{ result: StaffApiRecord[] }>("/user/facility", { token })
  return (response.result ?? []).map(mapStaffRecord)
}

export async function getStaffById(token: string, id: string) {
  const response = await apiRequest<{ result: StaffApiRecord }>(`/user/${encodeURIComponent(id)}`, { token })
  return mapStaffRecord(response.result)
}

export async function getStaffActivities(token: string, id: string) {
  const response = await apiRequest<{ result: { activities: StaffActivity[] } }>(`/user/${encodeURIComponent(id)}/activities?limit=10`, { token })
  return response.result?.activities ?? []
}

export function createStaff(token: string, payload: { first_name: string; last_name: string; middle_name?: string; role: string; phone_number?: string; email?: string; password: string; facility_id?: string }) {
  return apiRequest<{ message: string; user: StaffApiRecord }>("/auth/create-staff", { method: "POST", token, body: JSON.stringify(payload) })
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
