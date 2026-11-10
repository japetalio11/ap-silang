import { apiRequest } from "@/lib/api"

export type MaternalPrenatalVisit = {
  visit_id?: string
  pregnancy_id?: string
  visit_date?: string | null
  visit_number?: number | null
  trimester?: number | null
  age_of_gestation_weeks?: number | null
  risk_level_assessed?: string | null
  tews_score?: number | null
  bp_systolic?: number | null
  bp_diastolic?: number | null
  weight_kg?: number | string | null
  temperature_celsius?: number | string | null
  pulse_rate_bpm?: number | null
  fundic_height_cm?: number | string | null
  fetal_heart_tone_bpm?: number | null
  fetal_presentation?: string | null
  chief_complaint?: string | null
  danger_signs_observed?: string | null
  has_vaginal_bleeding?: boolean
  has_pallor?: boolean
  has_edema?: boolean
  has_fever?: boolean
  healthWorker?: { first_name?: string; last_name?: string; role?: string }
}

export type MaternalPregnancy = {
  pregnancy_id: string
  lmp_date?: string | null
  edd_date?: string | null
  gravida?: number | null
  parity?: number | null
  pregnancy_status?: string | null
  age_group?: string | null
  height_cm?: number | string | null
  bmi_1st_trimester?: number | string | null
  bmi_category?: string | null
  prenatalVisits?: MaternalPrenatalVisit[]
  labScreenings?: Array<MaternalLabRecord>
  deliveryOutcomes?: Array<MaternalDelivery>
}

export type MaternalLabRecord = {
  screening_id: string
  screening_type?: string | null
  result?: string | null
  file_url?: string | null
  date_of_screening?: string | null
  remarks?: string | null
}

export type MaternalDelivery = {
  delivery_id: string
  pregnancy_id?: string
  version?: number
  delivery_date?: string | null
  place_of_delivery?: string | null
  mode_of_delivery?: string | null
  birth_attendant?: string | null
  maternal_outcome?: string | null
  immediate_breastfeeding?: boolean
  duration_of_labor_hours?: number | string | null
  blood_loss_ml?: number | null
  delivery_complications?: string | null
  postpartumVisits?: Array<Record<string, unknown>>
  newbornRecords?: Array<{ newborn_id?: string; sex?: string; birth_weight_kg?: number | string; status_at_birth?: string; apgar_score?: number }>
}

export type RegisterDeliveryOutcomeInput = {
  pregnancy_id: string
  delivery_date: string
  place_of_delivery: string
  mode_of_delivery: string
  birth_attendant?: string
  maternal_outcome?: string
  immediate_breastfeeding?: boolean
  duration_of_labor_hours?: number
  blood_loss_ml?: number
  delivery_complications?: string
  newborns?: Array<{
    sex: string
    birth_weight_kg: number
    status_at_birth: string
    apgar_score: number
  }>
}

export type MaternalAppointment = {
  appointment_id: string
  appointment_date?: string | null
  appointment_time?: string | null
  appointment_type?: string | null
  reason?: string | null
  status?: string | null
}

export type MaternalSupplement = {
  supplement_id: string
  pregnancy_id?: string
  visit_id?: string
  supplement_type?: string
  tablets_given_count?: number
  date_given?: string
  is_completed?: boolean
}

export type MaternalStaff = {
  user_id: string
  facility_id?: string | null
  first_name: string
  middle_name?: string | null
  last_name: string
  role: string
  email?: string | null
  is_active?: boolean
}

export type MaternalRecord = {
  mother_id: string
  version?: number
  family_serial_no?: string | null
  birth_date?: string | null
  age?: number | null
  civil_status?: string | null
  blood_type?: string | null
  assigned_worker_id?: string | null
  assignedWorker?: MaternalStaff | null
  user?: {
    user_id?: string | null
    version?: number
    first_name?: string | null
    middle_name?: string | null
    last_name?: string | null
    phone_number?: string | null
    email?: string | null
    address?: string | null
  } | null
  pregnancies?: MaternalPregnancy[]
}

export type MaternalCompositeRecord = MaternalRecord & {
  prenatalVisits?: MaternalPregnancy["prenatalVisits"]
  labRecords?: MaternalLabRecord[]
  appointments?: MaternalAppointment[]
  deliveries?: MaternalDelivery[]
  supplements?: MaternalSupplement[]
}

export function getLatestMaternalPregnancy(pregnancies?: MaternalPregnancy[]) {
  return [...(pregnancies ?? [])].sort((a, b) =>
    new Date(b.lmp_date ?? 0).getTime() - new Date(a.lmp_date ?? 0).getTime()
  )[0]
}

export function getLatestPrenatalVisit(pregnancy?: MaternalPregnancy) {
  return [...(pregnancy?.prenatalVisits ?? [])].sort((a, b) =>
    new Date(b.visit_date ?? 0).getTime() - new Date(a.visit_date ?? 0).getTime()
  )[0]
}

export type MaternalRiskLabel = "High Risk" | "Moderate Risk" | "Low Risk" | "Not assessed"

export function normalizeMaternalRisk(value?: string | null): MaternalRiskLabel {
  const normalized = value?.trim().toLowerCase() ?? ""
  if (normalized.includes("high")) return "High Risk"
  if (normalized.includes("moderate")) return "Moderate Risk"
  if (normalized.includes("low")) return "Low Risk"
  return "Not assessed"
}

export type MaternalListResponse = { result: MaternalRecord[] }
export type RegisterMotherResponse = {
  message?: string
  already_exists?: boolean
  result?: { user?: { user_id?: string }; mother?: MaternalRecord }
  mother?: MaternalRecord
}

export type RegisterMaternalRecordInput = {
  first_name: string
  middle_name?: string
  last_name: string
  address: string
  phone_number: string
  email?: string
  facility_id?: string
  assigned_worker_id?: string
  family_serial_no?: string
  birth_date: string
  civil_status: string
  blood_type: string
}

export type RegisterPregnancyInput = {
  motherId: string
  lmp_date: string
  edd_date?: string
  gravida: number
  parity: number
  age_group: string
  pregnancy_status: string
  height_cm?: number
  bmi_1st_trimester?: number
  bmi_category?: string
  completed_8anc: boolean
  prev_caesarean: boolean
  consecutive_miscarriages: boolean
  stillbirth_history: boolean
  pph_history: boolean
  has_heart_disease: boolean
  has_diabetes: boolean
  has_tb: boolean
  has_asthma: boolean
  has_goiter: boolean
  co_morbidities?: string
  previous_delivery_history?: string
}

function applyMotherProfileChanges<T extends MaternalRecord>(record: T, changes: Partial<RegisterMaternalRecordInput>): T {
  const next = { ...record, user: { ...record.user } }
  const userKeys = ["first_name", "middle_name", "last_name", "address", "phone_number", "email"] as const
  for (const key of userKeys) {
    const value = changes[key]
    if (value !== undefined) next.user![key] = value
  }
  for (const key of ["birth_date", "family_serial_no", "civil_status", "blood_type"] as const) {
    const value = changes[key]
    if (value !== undefined) next[key] = value
  }
  return next
}

export async function getMaternalRecords(token: string) {
  const response = await apiRequest<MaternalListResponse>("/mother/active", { token })
  const { getPendingMotherUpdates } = await import("@/features/dashboard/offline-maternal-sync")
  const pendingUpdates = await getPendingMotherUpdates().catch(() => [])
  if (!pendingUpdates.length) return response

  const updatesByMother = new Map<string, typeof pendingUpdates>()
  for (const item of pendingUpdates) {
    updatesByMother.set(item.motherId, [...(updatesByMother.get(item.motherId) ?? []), item])
  }
  return {
    ...response,
    result: response.result.map((record) => (updatesByMother.get(record.mother_id) ?? [])
      .reduce((current, item) => applyMotherProfileChanges(current, item.changes), record)),
  }
}

export async function getMaternalProfile(token: string, motherId: string) {
  let result: MaternalCompositeRecord
  try {
    const response = await apiRequest<{ result: MaternalCompositeRecord }>(`/mother/composite/${encodeURIComponent(motherId)}`, { token })
    result = response.result
  } catch (error) {
    const { isNetworkFailure, getPendingMotherUpdates } = await import("@/features/dashboard/offline-maternal-sync")
    if (!isNetworkFailure(error)) throw error
    const queued = (await getPendingMotherUpdates()).filter((item) => item.motherId === motherId)
    const latest = queued.at(-1)
    if (!latest) throw error
    result = latest.serverRecord ?? latest.baseRecord
  }

  const { getPendingMotherUpdates } = await import("@/features/dashboard/offline-maternal-sync")
  const queued = (await getPendingMotherUpdates()).filter((item) => item.motherId === motherId)
  result = queued.reduce((current, item) => applyMotherProfileChanges(current, item.changes), result)
  return { result }
}

export const registerMaternalRecord = (token: string, input: RegisterMaternalRecordInput) =>
  apiRequest<RegisterMotherResponse>("/mother/register", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  })

export const registerPregnancy = (token: string, input: RegisterPregnancyInput) =>
  apiRequest<{ message?: string; pregnancy?: MaternalPregnancy }>("/pregnancy/register", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  })

export const registerDeliveryOutcome = (token: string, input: RegisterDeliveryOutcomeInput) =>
  apiRequest<{ message?: string; data?: MaternalDelivery }>("/delivery-outcome/register", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  })

export const deleteMaternalRecord = (token: string, motherId: string) =>
  apiRequest<{ message?: string }>(`/mother/delete/soft/${encodeURIComponent(motherId)}`, {
    method: "DELETE",
    token,
  })

export const connectMotherToFacility = (token: string, code: string) =>
  apiRequest<{ message?: string; mother?: MaternalRecord }>("/mother/assign-facility", {
    method: "POST",
    token,
    body: JSON.stringify({ mother_code: code.trim() }),
  })

export async function updateMaternalRecord(
  token: string,
  motherId: string,
  input: Partial<RegisterMaternalRecordInput>,
  offlineContext?: { baseRecord: MaternalCompositeRecord; motherName: string },
) {
  const { isNetworkFailure, enqueueMotherProfileUpdate } = await import("@/features/dashboard/offline-maternal-sync")
  if (!navigator.onLine && offlineContext) {
    await enqueueMotherProfileUpdate({ motherId, motherName: offlineContext.motherName, baseRecord: offlineContext.baseRecord, changes: input })
    return { queued: true as const }
  }

  try {
    return await apiRequest<{ message?: string; result?: MaternalRecord; queued?: false }>(`/mother/update/${encodeURIComponent(motherId)}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ ...input, version: offlineContext?.baseRecord.version }),
    })
  } catch (error) {
    if (offlineContext && isNetworkFailure(error)) {
      await enqueueMotherProfileUpdate({ motherId, motherName: offlineContext.motherName, baseRecord: offlineContext.baseRecord, changes: input })
      return { queued: true as const }
    }
    throw error
  }
}

export const getMaternalStaff = (token: string) =>
  apiRequest<{ result: MaternalStaff[] }>("/auth/staff", { token })

export const assignMaternalStaff = (token: string, motherId: string, staffId: string) =>
  apiRequest<{ message?: string; result?: MaternalRecord }>(`/mother/assign-staff/${encodeURIComponent(motherId)}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ assigned_worker_id: staffId }),
  })

export const overrideMaternalRisk = (token: string, visitId: string | undefined, input: { risk_level: string; override_reason: string; pregnancy_id?: string; mother_id?: string }) =>
  apiRequest<{ message?: string }>(visitId ? `/prenatal-visit/override-risk/${encodeURIComponent(visitId)}` : "/prenatal-visit/override-risk", {
    method: "PUT",
    token,
    body: JSON.stringify(input),
  })

export type RegisterPrenatalVisitInput = {
  pregnancy_id: string
  health_worker_id?: string
  trimester: number
  visit_number: number
  age_of_gestation_weeks: number
  weight_kg: number
  temperature_celsius: number
  pulse_rate_bpm: number
  bp_diastolic: number
  bp_systolic: number
  fundic_height_cm?: number
  fetal_heart_tone_bpm?: number
  fetal_presentation?: string
  chief_complaint?: string
  danger_signs_observed?: string
  has_vaginal_bleeding?: boolean
  has_pallor?: boolean
  has_edema?: boolean
  has_fever?: boolean
}

export type RegisterMaternalSupplementInput = {
  mother_id: string
  pregnancy_id: string
  visit_id?: string
  supplement_type: string
  tablets_given_count: number
  date_given: string
}

export type RegisterMaternalSupplementResponse = {
  message?: string
  supplement_record?: MaternalSupplement
  data?: MaternalSupplement
}

export const registerPrenatalVisit = (token: string, input: RegisterPrenatalVisitInput) =>
  apiRequest<{ message?: string; prenatalVisit?: MaternalPregnancy["prenatalVisits"] extends (infer T)[] | undefined ? T : never }>("/prenatal-visit/register", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  })

export const registerMaternalSupplement = (token: string, input: RegisterMaternalSupplementInput) =>
  apiRequest<RegisterMaternalSupplementResponse>("/supplement/register", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  })

export type RegisterLabScreeningInput = {
  mother_id?: string
  pregnancy_id: string
  visit_id?: string
  screening_type: string
  result?: string
  file_url?: string
  date_of_screening: string
  remarks?: string
}

export const uploadMaternalLabFile = (token: string, file: File) => {
  const body = new FormData()
  body.append("file", file)
  return apiRequest<{ file_url: string }>("/lab-screening/upload", { method: "POST", token, body })
}

export const registerMaternalLabScreening = (token: string, input: RegisterLabScreeningInput) =>
  apiRequest<{ message?: string; result?: MaternalLabRecord }>("/lab-screening/register", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  })

export const deleteMaternalLabScreening = (token: string, screeningId: string) =>
  apiRequest<{ message?: string }>(`/lab-screening/delete/${encodeURIComponent(screeningId)}`, { method: "DELETE", token })

export const cancelMaternalAppointment = (token: string, appointmentId: string) =>
  apiRequest<{ message?: string }>(`/appointment/cancel/${encodeURIComponent(appointmentId)}`, { method: "PUT", token, body: JSON.stringify({}) })
