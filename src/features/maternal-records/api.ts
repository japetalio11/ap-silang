import { apiRequest } from "@/lib/api"
import { db, type LocalMother, type LocalPregnancy, type LocalPrenatalVisit, type LocalLabScreening, type LocalDeliveryOutcome } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"
import { getPendingMotherUpdates, isNetworkFailure, enqueueMotherProfileUpdate } from "@/features/dashboard/offline-maternal-sync"

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
    profile_url?: string | null
    photo_url?: string | null
  } | null
  profile_url?: string | null
  photo_url?: string | null
  pregnancies?: MaternalPregnancy[]
  sync_status?: string
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
  offline?: boolean
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
  profile_url?: string
  photo_url?: string
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

export async function getMaternalRecords(token: string): Promise<MaternalListResponse> {
  const pendingMothers = await db.mothers.where("sync_status").anyOf("pending_create", "pending_update").toArray().catch(() => [])

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const localMothers = await db.mothers.toArray().catch(() => [])
    if (localMothers.length > 0) {
      return {
        result: localMothers.map((m) => ({
          mother_id: m.mother_id,
          family_serial_no: m.family_serial_no,
          birth_date: m.birth_date,
          age: m.age,
          civil_status: m.civil_status,
          blood_type: m.blood_type,
          assigned_worker_id: m.assigned_worker_id,
          assignedWorker: m.assignedWorker,
          user: m.user || {
            first_name: m.first_name,
            middle_name: m.middle_name,
            last_name: m.last_name,
            phone_number: m.phone_number,
            email: m.email,
            address: m.address,
          },
          pregnancies: m.pregnancies || [],
          version: m.version,
          sync_status: m.sync_status,
        })),
      }
    }
  }

  try {
    const response = await apiRequest<MaternalListResponse>("/mother/active", { token })
    if (Array.isArray(response.result)) {
      for (const mother of response.result) {
        await db.mothers.put({
          ...mother,
          id: mother.mother_id,
          first_name: mother.user?.first_name,
          middle_name: mother.user?.middle_name,
          last_name: mother.user?.last_name,
          phone_number: mother.user?.phone_number,
          email: mother.user?.email,
          address: mother.user?.address,
          sync_status: "synced",
          updated_at: Date.now(),
        }).catch(() => {})

        if (Array.isArray(mother.pregnancies)) {
          for (const p of mother.pregnancies) {
            await db.pregnancies.put({
              ...p,
              id: p.pregnancy_id,
              mother_id: mother.mother_id,
              sync_status: "synced",
              updated_at: Date.now(),
            }).catch(() => {})

            if (Array.isArray(p.prenatalVisits)) {
              for (const v of p.prenatalVisits) {
                if (v.visit_id) {
                  await db.prenatalVisits.put({
                    ...v,
                    id: v.visit_id,
                    visit_id: v.visit_id,
                    pregnancy_id: p.pregnancy_id,
                    mother_id: mother.mother_id,
                    sync_status: "synced",
                    updated_at: Date.now(),
                  }).catch(() => {})
                }
              }
            }

            if (Array.isArray(p.deliveryOutcomes)) {
              for (const d of p.deliveryOutcomes) {
                if (d.delivery_id) {
                  await db.deliveryOutcomes.put({
                    ...d,
                    id: d.delivery_id,
                    delivery_id: d.delivery_id,
                    pregnancy_id: p.pregnancy_id,
                    mother_id: mother.mother_id,
                    sync_status: "synced",
                    updated_at: Date.now(),
                  }).catch(() => {})
                }
              }
            }

            if (Array.isArray(p.labScreenings)) {
              for (const l of p.labScreenings) {
                if (l.screening_id) {
                  await db.labScreenings.put({
                    ...l,
                    id: l.screening_id,
                    screening_id: l.screening_id,
                    pregnancy_id: p.pregnancy_id,
                    mother_id: mother.mother_id,
                    screening_type: l.screening_type || "Lab Screening",
                    date_of_screening: l.date_of_screening || new Date().toISOString(),
                    sync_status: "synced",
                    updated_at: Date.now(),
                  }).catch(() => {})
                }
              }
            }
          }
        }
      }
    }

    const pendingUpdates = await getPendingMotherUpdates().catch(() => [])
    const updatesByMother = new Map<string, typeof pendingUpdates>()
    for (const item of pendingUpdates) {
      updatesByMother.set(item.motherId, [...(updatesByMother.get(item.motherId) ?? []), item])
    }

    const mergedOnline = response.result.map((record) =>
      (updatesByMother.get(record.mother_id) ?? []).reduce((current, item) => applyMotherProfileChanges(current, item.changes), record)
    )

    const onlineIds = new Set(mergedOnline.map((m) => m.mother_id))
    const uniquePending = pendingMothers
      .filter((m) => !onlineIds.has(m.mother_id))
      .map((m) => ({
        mother_id: m.mother_id,
        family_serial_no: m.family_serial_no,
        birth_date: m.birth_date,
        age: m.age,
        civil_status: m.civil_status,
        blood_type: m.blood_type,
        assigned_worker_id: m.assigned_worker_id,
        assignedWorker: m.assignedWorker,
        user: m.user || {
          first_name: m.first_name,
          middle_name: m.middle_name,
          last_name: m.last_name,
          phone_number: m.phone_number,
          email: m.email,
          address: m.address,
        },
        pregnancies: m.pregnancies || [],
        version: m.version,
        sync_status: m.sync_status,
      }))

    return { result: [...uniquePending, ...mergedOnline] }
  } catch (error) {
    const localMothers = await db.mothers.toArray().catch(() => [])
    if (localMothers.length > 0) {
      return {
        result: localMothers.map((m) => ({
          mother_id: m.mother_id,
          family_serial_no: m.family_serial_no,
          birth_date: m.birth_date,
          age: m.age,
          civil_status: m.civil_status,
          blood_type: m.blood_type,
          assigned_worker_id: m.assigned_worker_id,
          assignedWorker: m.assignedWorker,
          user: m.user || {
            first_name: m.first_name,
            middle_name: m.middle_name,
            last_name: m.last_name,
            phone_number: m.phone_number,
            email: m.email,
            address: m.address,
          },
          pregnancies: m.pregnancies || [],
          version: m.version,
          sync_status: m.sync_status,
        })),
      }
    }
    throw error
  }
}

async function buildCompositeFromDexie(motherId: string): Promise<MaternalCompositeRecord | null> {
  const localMother = await db.mothers.get(motherId)
  if (!localMother) return null

  const pregs = await db.pregnancies.where("mother_id").equals(motherId).toArray().catch(() => [])
  const pregIds = pregs.map((p) => p.pregnancy_id).filter(Boolean)
  const visits = await db.prenatalVisits.where("mother_id").equals(motherId).toArray().catch(() => [])
  const appts = await db.appointments.where("mother_id").equals(motherId).toArray().catch(() => [])
  const labs = await db.labScreenings.where("mother_id").equals(motherId).toArray().catch(() => [])
  const delivsByMother = await db.deliveryOutcomes.where("mother_id").equals(motherId).toArray().catch(() => [])
  const delivsByPreg = pregIds.length ? await db.deliveryOutcomes.where("pregnancy_id").anyOf(pregIds).toArray().catch(() => []) : []
  const allDelivMap = new Map<string, LocalDeliveryOutcome>()
  for (const d of [...delivsByMother, ...delivsByPreg]) {
    allDelivMap.set(d.delivery_id || d.id, d)
  }
  const delivs = Array.from(allDelivMap.values())
  const prex = await db.prescriptions.where("mother_id").equals(motherId).toArray().catch(() => [])

  return {
    mother_id: localMother.mother_id,
    family_serial_no: localMother.family_serial_no,
    birth_date: localMother.birth_date,
    age: localMother.age,
    civil_status: localMother.civil_status,
    blood_type: localMother.blood_type,
    assigned_worker_id: localMother.assigned_worker_id,
    assignedWorker: localMother.assignedWorker,
    profile_url: localMother.profile_url || localMother.photo_url || localMother.user?.profile_url,
    photo_url: localMother.photo_url || localMother.profile_url || localMother.user?.photo_url,
    user: localMother.user ? {
      ...localMother.user,
      profile_url: localMother.user.profile_url || localMother.profile_url || localMother.photo_url,
      photo_url: localMother.user.photo_url || localMother.photo_url || localMother.profile_url,
    } : {
      first_name: localMother.first_name,
      middle_name: localMother.middle_name,
      last_name: localMother.last_name,
      phone_number: localMother.phone_number,
      email: localMother.email,
      address: localMother.address,
      profile_url: localMother.profile_url || localMother.photo_url,
      photo_url: localMother.photo_url || localMother.profile_url,
    },
    pregnancies: pregs.map((p) => ({
      ...p,
      prenatalVisits: visits.filter((v) => v.pregnancy_id === p.pregnancy_id),
      deliveryOutcomes: delivs.filter((d) => d.pregnancy_id === p.pregnancy_id).map((d) => ({
        ...d,
        newbornRecords: d.newbornRecords ?? [],
      })),
      labScreenings: labs.filter((l) => l.pregnancy_id === p.pregnancy_id),
    })),
    prenatalVisits: visits,
    labRecords: labs.map((l) => ({
      screening_id: l.screening_id,
      screening_type: l.screening_type,
      date_of_screening: l.date_of_screening,
      result: l.result,
      remarks: l.remarks,
      file_url: l.file_url,
    })),
    appointments: appts.map((a) => ({
      appointment_id: a.appointment_id,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      appointment_type: a.appointment_type,
      reason: a.reason,
      status: a.status,
      user_id: a.user_id,
      facility_id: a.facility_id,
    })),
    deliveries: delivs.map((d) => ({
      delivery_id: d.delivery_id,
      delivery_date: d.delivery_date,
      place_of_delivery: d.place_of_delivery,
      mode_of_delivery: d.mode_of_delivery,
      duration_of_labor_hours: d.duration_of_labor_hours,
      blood_loss_ml: d.blood_loss_ml,
      delivery_complications: d.delivery_complications,
      birth_attendant: d.birth_attendant,
      maternal_outcome: d.maternal_outcome,
      immediate_breastfeeding: d.immediate_breastfeeding,
      newbornRecords: d.newbornRecords ?? [],
    })),
    supplements: prex.map((pr: any) => ({
      supplement_id: pr.supplement_id || pr.prescription_id,
      pregnancy_id: pr.pregnancy_id,
      visit_id: pr.visit_id,
      supplement_type: pr.supplement_type || pr.medication_name,
      tablets_given_count: pr.tablets_given_count ?? 1,
      date_given: pr.date_given || pr.prescribed_date,
      is_completed: pr.is_completed ?? false,
    })),
    sync_status: localMother.sync_status,
  }
}

export async function getMaternalProfile(token: string, motherId: string): Promise<{ result: MaternalCompositeRecord }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const composite = await buildCompositeFromDexie(motherId)
    if (composite) {
      return { result: composite }
    }
  }

  try {
    const response = await apiRequest<{ result: MaternalCompositeRecord }>(`/mother/composite/${encodeURIComponent(motherId)}`, { token })
    const result = response.result
    if (result) {
      await db.mothers.put({
        ...result,
        id: result.mother_id,
        first_name: result.user?.first_name,
        middle_name: result.user?.middle_name,
        last_name: result.user?.last_name,
        phone_number: result.user?.phone_number,
        email: result.user?.email,
        address: result.user?.address,
        profile_url: result.user?.profile_url || result.profile_url,
        photo_url: result.user?.profile_url || result.photo_url || result.profile_url,
        sync_status: "synced",
        updated_at: Date.now(),
      }).catch(() => {})
      if (Array.isArray(result.pregnancies)) {
        for (const p of result.pregnancies) {
          await db.pregnancies.put({
            ...p,
            id: p.pregnancy_id,
            mother_id: result.mother_id,
            sync_status: "synced",
            updated_at: Date.now(),
          }).catch(() => {})
          if (Array.isArray(p.prenatalVisits)) {
            for (const v of p.prenatalVisits) {
              if (v.visit_id) {
                await db.prenatalVisits.put({
                  ...v,
                  id: v.visit_id,
                  visit_id: v.visit_id,
                  pregnancy_id: p.pregnancy_id,
                  mother_id: result.mother_id,
                  sync_status: "synced",
                  updated_at: Date.now(),
                }).catch(() => {})
              }
            }
          }
          if (Array.isArray(p.deliveryOutcomes)) {
            for (const d of p.deliveryOutcomes) {
              if (d.delivery_id) {
                await db.deliveryOutcomes.put({
                  ...d,
                  id: d.delivery_id,
                  pregnancy_id: p.pregnancy_id,
                  mother_id: result.mother_id,
                  sync_status: "synced",
                  updated_at: Date.now(),
                }).catch(() => {})
              }
            }
          }
          if (Array.isArray(p.labScreenings)) {
            for (const l of p.labScreenings) {
              if (l.screening_id) {
                await db.labScreenings.put({
                  ...l,
                  id: l.screening_id,
                  screening_type: l.screening_type || "Lab screening",
                  date_of_screening: l.date_of_screening || new Date().toISOString(),
                  pregnancy_id: p.pregnancy_id,
                  mother_id: result.mother_id,
                  sync_status: "synced",
                  updated_at: Date.now(),
                }).catch(() => {})
              }
            }
          }
        }
      }
      if (Array.isArray(result.appointments)) {
        for (const a of result.appointments) {
          if (a.appointment_id) {
            await db.appointments.put({
              ...a,
              id: a.appointment_id,
              mother_id: result.mother_id,
              sync_status: "synced",
              updated_at: Date.now(),
            }).catch(() => {})
          }
        }
      }
      if (Array.isArray(result.labRecords)) {
        for (const l of result.labRecords) {
          if (l.screening_id) {
            await db.labScreenings.put({
              ...l,
              id: l.screening_id,
              screening_type: l.screening_type || "Lab screening",
              date_of_screening: l.date_of_screening || new Date().toISOString(),
              mother_id: result.mother_id,
              sync_status: "synced",
              updated_at: Date.now(),
            }).catch(() => {})
          }
        }
      }
      if (Array.isArray(result.deliveries)) {
        for (const d of result.deliveries) {
          if (d.delivery_id) {
            await db.deliveryOutcomes.put({
              ...d,
              id: d.delivery_id,
              mother_id: result.mother_id,
              pregnancy_id: (d as any).pregnancy_id || "",
              sync_status: "synced",
              updated_at: Date.now(),
            }).catch(() => {})
          }
        }
      }
      if (Array.isArray(result.supplements)) {
        for (const pr of result.supplements) {
          const supId = pr.supplement_id || (pr as any).prescription_id
          if (supId) {
            await db.prescriptions.put({
              id: supId,
              prescription_id: supId,
              supplement_id: supId,
              mother_id: result.mother_id,
              pregnancy_id: pr.pregnancy_id,
              visit_id: pr.visit_id,
              supplement_type: pr.supplement_type,
              tablets_given_count: pr.tablets_given_count,
              date_given: pr.date_given,
              medication_name: pr.supplement_type || "Supplement",
              dosage: `${pr.tablets_given_count ?? 1} tablets`,
              frequency: "Daily",
              prescribed_date: pr.date_given || new Date().toISOString(),
              sync_status: "synced",
              updated_at: Date.now(),
            }).catch(() => {})
          }
        }
      }
    }
    return { result }
  } catch (error) {
    const composite = await buildCompositeFromDexie(motherId)
    if (composite) {
      return { result: composite }
    }
    throw error
  }
}

export const registerMaternalRecord = async (token: string, input: RegisterMaternalRecordInput): Promise<RegisterMotherResponse> => {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine

  if (isOffline) {
    const tempId = `temp-m-${crypto.randomUUID()}`
    const localMother: LocalMother = {
      id: tempId,
      mother_id: tempId,
      first_name: input.first_name,
      middle_name: input.middle_name,
      last_name: input.last_name,
      phone_number: input.phone_number,
      email: input.email,
      address: input.address,
      family_serial_no: input.family_serial_no,
      birth_date: input.birth_date,
      civil_status: input.civil_status,
      blood_type: input.blood_type,
      facility_id: input.facility_id,
      assigned_worker_id: input.assigned_worker_id,
      user: {
        first_name: input.first_name,
        middle_name: input.middle_name,
        last_name: input.last_name,
        phone_number: input.phone_number,
        email: input.email,
        address: input.address,
      },
      pregnancies: [],
      sync_status: "pending_create",
      updated_at: Date.now(),
    }
    await db.mothers.put(localMother)
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "mother",
      action: "CREATE",
      endpoint: "/mother/register",
      method: "POST",
      payload: input,
      temp_id: tempId,
    })
    return {
      message: "Maternal record saved offline",
      result: { mother: localMother as any },
      mother: localMother as any,
      offline: true,
    }
  }

  try {
    const res = await apiRequest<RegisterMotherResponse>("/mother/register", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    })
    const mother = res.result?.mother ?? res.mother
    if (mother?.mother_id) {
      await db.mothers.put({
        ...mother,
        id: mother.mother_id,
        first_name: input.first_name,
        middle_name: input.middle_name,
        last_name: input.last_name,
        phone_number: input.phone_number,
        email: input.email,
        address: input.address,
        sync_status: "synced",
        updated_at: Date.now(),
      }).catch(() => {})
    }
    return res
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempId = `temp-m-${crypto.randomUUID()}`
      const localMother: LocalMother = {
        id: tempId,
        mother_id: tempId,
        first_name: input.first_name,
        middle_name: input.middle_name,
        last_name: input.last_name,
        phone_number: input.phone_number,
        email: input.email,
        address: input.address,
        family_serial_no: input.family_serial_no,
        birth_date: input.birth_date,
        civil_status: input.civil_status,
        blood_type: input.blood_type,
        facility_id: input.facility_id,
        assigned_worker_id: input.assigned_worker_id,
        user: {
          first_name: input.first_name,
          middle_name: input.middle_name,
          last_name: input.last_name,
          phone_number: input.phone_number,
          email: input.email,
          address: input.address,
        },
        pregnancies: [],
        sync_status: "pending_create",
        updated_at: Date.now(),
      }
      await db.mothers.put(localMother)
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "mother",
        action: "CREATE",
        endpoint: "/mother/register",
        method: "POST",
        payload: input,
        temp_id: tempId,
      })
      return {
        message: "Maternal record saved offline",
        result: { mother: localMother as any },
        mother: localMother as any,
        offline: true,
      }
    }
    throw error
  }
}

export const registerPregnancy = async (token: string, input: RegisterPregnancyInput) => {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine

  if (isOffline) {
    const tempPregId = `temp-p-${crypto.randomUUID()}`
    const localPreg: LocalPregnancy = {
      id: tempPregId,
      pregnancy_id: tempPregId,
      mother_id: input.motherId,
      lmp_date: input.lmp_date,
      edd_date: input.edd_date,
      gravida: input.gravida,
      parity: input.parity,
      pregnancy_status: input.pregnancy_status,
      height_cm: input.height_cm,
      bmi_1st_trimester: input.bmi_1st_trimester,
      bmi_category: input.bmi_category,
      completed_8anc: input.completed_8anc,
      prev_caesarean: input.prev_caesarean,
      consecutive_miscarriages: input.consecutive_miscarriages,
      stillbirth_history: input.stillbirth_history,
      pph_history: input.pph_history,
      has_heart_disease: input.has_heart_disease,
      has_diabetes: input.has_diabetes,
      has_tb: input.has_tb,
      has_asthma: input.has_asthma,
      has_goiter: input.has_goiter,
      co_morbidities: input.co_morbidities,
      previous_delivery_history: input.previous_delivery_history,
      prenatal_visits: [],
      sync_status: "pending_create",
      updated_at: Date.now(),
    }
    await db.pregnancies.put(localPreg)
    const mother = await db.mothers.get(input.motherId)
    if (mother) {
      const current = Array.isArray(mother.pregnancies) ? mother.pregnancies : []
      await db.mothers.update(input.motherId, {
        pregnancies: [localPreg as any, ...current],
        updated_at: Date.now(),
      })
    }
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "pregnancy",
      action: "CREATE",
      endpoint: "/pregnancy/register",
      method: "POST",
      payload: input,
      temp_id: tempPregId,
    })
    return {
      message: "Pregnancy record saved offline",
      pregnancy: localPreg as any,
      offline: true,
    }
  }

  try {
    const res = await apiRequest<{ message?: string; pregnancy?: MaternalPregnancy }>("/pregnancy/register", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    })
    if (res.pregnancy) {
      await db.pregnancies.put({
        ...res.pregnancy,
        id: res.pregnancy.pregnancy_id,
        mother_id: input.motherId,
        sync_status: "synced",
        updated_at: Date.now(),
      }).catch(() => {})
    }
    return res
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempPregId = `temp-p-${crypto.randomUUID()}`
      const localPreg: LocalPregnancy = {
        id: tempPregId,
        pregnancy_id: tempPregId,
        mother_id: input.motherId,
        lmp_date: input.lmp_date,
        edd_date: input.edd_date,
        gravida: input.gravida,
        parity: input.parity,
        pregnancy_status: input.pregnancy_status,
        height_cm: input.height_cm,
        bmi_1st_trimester: input.bmi_1st_trimester,
        bmi_category: input.bmi_category,
        completed_8anc: input.completed_8anc,
        prev_caesarean: input.prev_caesarean,
        consecutive_miscarriages: input.consecutive_miscarriages,
        stillbirth_history: input.stillbirth_history,
        pph_history: input.pph_history,
        has_heart_disease: input.has_heart_disease,
        has_diabetes: input.has_diabetes,
        has_tb: input.has_tb,
        has_asthma: input.has_asthma,
        has_goiter: input.has_goiter,
        co_morbidities: input.co_morbidities,
        previous_delivery_history: input.previous_delivery_history,
        prenatal_visits: [],
        sync_status: "pending_create",
        updated_at: Date.now(),
      }
      await db.pregnancies.put(localPreg)
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "pregnancy",
        action: "CREATE",
        endpoint: "/pregnancy/register",
        method: "POST",
        payload: input,
        temp_id: tempPregId,
      })
      return {
        message: "Pregnancy record saved offline",
        pregnancy: localPreg as any,
        offline: true,
      }
    }
    throw error
  }
}

export const registerDeliveryOutcome = async (token: string, input: RegisterDeliveryOutcomeInput) => {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine
  if (isOffline) {
    const tempId = `temp-del-${crypto.randomUUID()}`
    const preg = await db.pregnancies.get(input.pregnancy_id).catch(() => null)
    const motherId = (input as any).mother_id || preg?.mother_id || ""
    const localDelivery: LocalDeliveryOutcome = {
      id: tempId,
      delivery_id: tempId,
      pregnancy_id: input.pregnancy_id,
      mother_id: motherId,
      delivery_date: input.delivery_date,
      place_of_delivery: input.place_of_delivery,
      mode_of_delivery: input.mode_of_delivery,
      birth_attendant: input.birth_attendant,
      maternal_outcome: input.maternal_outcome,
      immediate_breastfeeding: input.immediate_breastfeeding,
      duration_of_labor_hours: input.duration_of_labor_hours,
      blood_loss_ml: input.blood_loss_ml,
      delivery_complications: input.delivery_complications,
      newbornRecords: input.newborns,
      sync_status: "pending_create",
      updated_at: Date.now(),
    }
    await db.deliveryOutcomes.put(localDelivery)
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "delivery_outcome",
      action: "CREATE",
      endpoint: "/delivery-outcome/register",
      method: "POST",
      payload: { ...input, mother_id: motherId },
      temp_id: tempId,
    })
    return { message: "Delivery outcome saved offline", data: localDelivery as any, offline: true }
  }

  try {
    return await apiRequest<{ message?: string; data?: MaternalDelivery }>("/delivery-outcome/register", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    })
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempId = `temp-del-${crypto.randomUUID()}`
      const preg = await db.pregnancies.get(input.pregnancy_id).catch(() => null)
      const motherId = (input as any).mother_id || preg?.mother_id || ""
      const localDelivery: LocalDeliveryOutcome = {
        id: tempId,
        delivery_id: tempId,
        pregnancy_id: input.pregnancy_id,
        mother_id: motherId,
        delivery_date: input.delivery_date,
        place_of_delivery: input.place_of_delivery,
        mode_of_delivery: input.mode_of_delivery,
        birth_attendant: input.birth_attendant,
        maternal_outcome: input.maternal_outcome,
        immediate_breastfeeding: input.immediate_breastfeeding,
        duration_of_labor_hours: input.duration_of_labor_hours,
        blood_loss_ml: input.blood_loss_ml,
        delivery_complications: input.delivery_complications,
        newbornRecords: input.newborns,
        sync_status: "pending_create",
        updated_at: Date.now(),
      }
      await db.deliveryOutcomes.put(localDelivery)
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "delivery_outcome",
        action: "CREATE",
        endpoint: "/delivery-outcome/register",
        method: "POST",
        payload: { ...input, mother_id: motherId },
        temp_id: tempId,
      })
      return { message: "Delivery outcome saved offline", data: localDelivery as any, offline: true }
    }
    throw error
  }
}

export const deleteMaternalRecord = async (token: string, motherId: string) => {
  await db.mothers.delete(motherId).catch(() => {})
  if (!navigator.onLine) {
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "mother",
      action: "DELETE",
      endpoint: `/mother/delete/soft/${encodeURIComponent(motherId)}`,
      method: "DELETE",
      payload: {},
      temp_id: motherId,
    })
    return { message: "Maternal record deleted offline" }
  }
  return apiRequest<{ message?: string }>(`/mother/delete/soft/${encodeURIComponent(motherId)}`, {
    method: "DELETE",
    token,
  })
}

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
  const existingLocal = await db.mothers.get(motherId)
  if (existingLocal) {
    await db.mothers.update(motherId, {
      ...input,
      user: { ...(existingLocal.user || {}), ...input },
      sync_status: "pending_update",
      updated_at: Date.now(),
    })
  }

  if (!navigator.onLine) {
    if (offlineContext) {
      await enqueueMotherProfileUpdate({ motherId, motherName: offlineContext.motherName, baseRecord: offlineContext.baseRecord, changes: input })
    }
    const blobIds = typeof input.profile_url === "string" && input.profile_url.startsWith("blob-") ? [input.profile_url] : undefined
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "mother",
      action: "UPDATE",
      endpoint: `/mother/update/${encodeURIComponent(motherId)}`,
      method: "PUT",
      payload: input,
      blob_ids: blobIds,
    })
    return { queued: true as const }
  }

  try {
    return await apiRequest<{ message?: string; result?: MaternalRecord; queued?: false }>(`/mother/update/${encodeURIComponent(motherId)}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ ...input, version: offlineContext?.baseRecord.version }),
    })
  } catch (error) {
    if (isNetworkFailure(error)) {
      if (offlineContext) {
        await enqueueMotherProfileUpdate({ motherId, motherName: offlineContext.motherName, baseRecord: offlineContext.baseRecord, changes: input })
      }
      const blobIds = typeof input.profile_url === "string" && input.profile_url.startsWith("blob-") ? [input.profile_url] : undefined
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "mother",
        action: "UPDATE",
        endpoint: `/mother/update/${encodeURIComponent(motherId)}`,
        method: "PUT",
        payload: input,
        blob_ids: blobIds,
      })
      return { queued: true as const }
    }
    throw error
  }
}

export async function uploadMaternalAvatar(token: string, motherId: string, file: File): Promise<{ profile_url: string; offline?: boolean }> {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine
  if (isOffline) {
    const blobId = `blob-${crypto.randomUUID()}`
    await db.blobs.put({
      id: blobId,
      data: file,
      filename: file.name,
      mime_type: file.type,
    })
    const existingLocal = await db.mothers.get(motherId)
    if (existingLocal) {
      await db.mothers.update(motherId, {
        profile_url: blobId,
        photo_url: blobId,
        user: { ...(existingLocal.user || {}), profile_url: blobId },
        sync_status: "pending_update",
        updated_at: Date.now(),
      })
    }
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "mother",
      action: "UPDATE",
      endpoint: `/mother/update/${encodeURIComponent(motherId)}`,
      method: "PUT",
      payload: { profile_url: blobId, photo_url: blobId },
      blob_ids: [blobId],
    })
    return { profile_url: blobId, offline: true }
  }

  try {
    const body = new FormData()
    body.append("file", file)
    let uploadedUrl = ""
    try {
      const avatarRes = await apiRequest<{ fileUrl?: string; profile_url?: string }>("/patient/mother/avatar/upload", {
        method: "POST",
        token,
        body,
      })
      uploadedUrl = avatarRes.profile_url || avatarRes.fileUrl || ""
    } catch {
      const labRes = await apiRequest<{ file_url: string }>("/lab-screening/upload", {
        method: "POST",
        token,
        body,
      })
      uploadedUrl = labRes.file_url || ""
    }

    if (!uploadedUrl) throw new Error("Could not process avatar upload")

    await updateMaternalRecord(token, motherId, { profile_url: uploadedUrl, photo_url: uploadedUrl })
    const existingLocal = await db.mothers.get(motherId)
    if (existingLocal) {
      await db.mothers.update(motherId, {
        profile_url: uploadedUrl,
        photo_url: uploadedUrl,
        user: { ...(existingLocal.user || {}), profile_url: uploadedUrl },
        sync_status: "synced",
        updated_at: Date.now(),
      })
    }
    return { profile_url: uploadedUrl, offline: false }
  } catch (error) {
    if (isNetworkFailure(error)) {
      const blobId = `blob-${crypto.randomUUID()}`
      await db.blobs.put({
        id: blobId,
        data: file,
        filename: file.name,
        mime_type: file.type,
      })
      const existingLocal = await db.mothers.get(motherId)
      if (existingLocal) {
        await db.mothers.update(motherId, {
          profile_url: blobId,
          photo_url: blobId,
          user: { ...(existingLocal.user || {}), profile_url: blobId },
          sync_status: "pending_update",
          updated_at: Date.now(),
        })
      }
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "mother",
        action: "UPDATE",
        endpoint: `/mother/update/${encodeURIComponent(motherId)}`,
        method: "PUT",
        payload: { profile_url: blobId, photo_url: blobId },
        blob_ids: [blobId],
      })
      return { profile_url: blobId, offline: true }
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
  offline?: boolean
}

export const registerPrenatalVisit = async (token: string, input: RegisterPrenatalVisitInput) => {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine

  if (isOffline) {
    const tempVisitId = `temp-v-${crypto.randomUUID()}`
    const localVisit: LocalPrenatalVisit = {
      id: tempVisitId,
      visit_id: tempVisitId,
      pregnancy_id: input.pregnancy_id,
      mother_id: "",
      health_worker_id: input.health_worker_id,
      trimester: input.trimester,
      visit_number: input.visit_number,
      age_of_gestation_weeks: input.age_of_gestation_weeks,
      weight_kg: input.weight_kg,
      temperature_celsius: input.temperature_celsius,
      pulse_rate_bpm: input.pulse_rate_bpm,
      bp_diastolic: input.bp_diastolic,
      bp_systolic: input.bp_systolic,
      fundic_height_cm: input.fundic_height_cm,
      fetal_heart_tone_bpm: input.fetal_heart_tone_bpm,
      fetal_presentation: input.fetal_presentation,
      chief_complaint: input.chief_complaint,
      danger_signs_observed: input.danger_signs_observed,
      has_vaginal_bleeding: input.has_vaginal_bleeding,
      has_pallor: input.has_pallor,
      has_edema: input.has_edema,
      has_fever: input.has_fever,
      visit_date: new Date().toISOString(),
      sync_status: "pending_create",
      updated_at: Date.now(),
    }
    const preg = await db.pregnancies.get(input.pregnancy_id).catch(() => null)
    if (preg) localVisit.mother_id = preg.mother_id

    await db.prenatalVisits.put(localVisit)
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "prenatal_visit",
      action: "CREATE",
      endpoint: "/prenatal-visit/register",
      method: "POST",
      payload: { ...input, mother_id: (input as any).mother_id || preg?.mother_id },
      temp_id: tempVisitId,
    })
    return {
      message: "Prenatal visit saved offline",
      prenatalVisit: localVisit as any,
      offline: true,
    }
  }

  try {
    const res = await apiRequest<{ message?: string; prenatalVisit?: MaternalPregnancy["prenatalVisits"] extends (infer T)[] | undefined ? T : never }>("/prenatal-visit/register", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    })
    if (res.prenatalVisit) {
      const v = res.prenatalVisit as any
      if (v.visit_id) {
        await db.prenatalVisits.put({
          ...v,
          id: v.visit_id,
          pregnancy_id: input.pregnancy_id,
          sync_status: "synced",
          updated_at: Date.now(),
        }).catch(() => {})
      }
    }
    return res
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempVisitId = `temp-v-${crypto.randomUUID()}`
      const localVisit: LocalPrenatalVisit = {
        id: tempVisitId,
        visit_id: tempVisitId,
        pregnancy_id: input.pregnancy_id,
        mother_id: "",
        health_worker_id: input.health_worker_id,
        trimester: input.trimester,
        visit_number: input.visit_number,
        age_of_gestation_weeks: input.age_of_gestation_weeks,
        weight_kg: input.weight_kg,
        temperature_celsius: input.temperature_celsius,
        pulse_rate_bpm: input.pulse_rate_bpm,
        bp_diastolic: input.bp_diastolic,
        bp_systolic: input.bp_systolic,
        fundic_height_cm: input.fundic_height_cm,
        fetal_heart_tone_bpm: input.fetal_heart_tone_bpm,
        fetal_presentation: input.fetal_presentation,
        chief_complaint: input.chief_complaint,
        danger_signs_observed: input.danger_signs_observed,
        has_vaginal_bleeding: input.has_vaginal_bleeding,
        has_pallor: input.has_pallor,
        has_edema: input.has_edema,
        has_fever: input.has_fever,
        visit_date: new Date().toISOString(),
        sync_status: "pending_create",
        updated_at: Date.now(),
      }
      const preg = await db.pregnancies.get(input.pregnancy_id).catch(() => null)
      if (preg) localVisit.mother_id = preg.mother_id
      await db.prenatalVisits.put(localVisit)
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "prenatal_visit",
        action: "CREATE",
        endpoint: "/prenatal-visit/register",
        method: "POST",
        payload: { ...input, mother_id: (input as any).mother_id || preg?.mother_id },
        temp_id: tempVisitId,
      })
      return {
        message: "Prenatal visit saved offline",
        prenatalVisit: localVisit as any,
        offline: true,
      }
    }
    throw error
  }
}

export const registerMaternalSupplement = async (token: string, input: RegisterMaternalSupplementInput): Promise<RegisterMaternalSupplementResponse> => {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine
  if (isOffline) {
    const tempId = `temp-sup-${crypto.randomUUID()}`
    await db.prescriptions.put({
      id: tempId,
      prescription_id: tempId,
      mother_id: input.mother_id,
      pregnancy_id: input.pregnancy_id,
      medication_name: input.supplement_type,
      dosage: `${input.tablets_given_count} tablets`,
      frequency: "Daily",
      prescribed_date: input.date_given,
      sync_status: "pending_create",
      updated_at: Date.now(),
    })
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "prescription",
      action: "CREATE",
      endpoint: "/supplement/register",
      method: "POST",
      payload: input,
      temp_id: tempId,
    })
    return { message: "Supplement record saved offline", offline: true }
  }

  try {
    return await apiRequest<RegisterMaternalSupplementResponse>("/supplement/register", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    })
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempId = `temp-sup-${crypto.randomUUID()}`
      await db.prescriptions.put({
        id: tempId,
        prescription_id: tempId,
        mother_id: input.mother_id,
        pregnancy_id: input.pregnancy_id,
        medication_name: input.supplement_type,
        dosage: `${input.tablets_given_count} tablets`,
        frequency: "Daily",
        prescribed_date: input.date_given,
        sync_status: "pending_create",
        updated_at: Date.now(),
      })
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "prescription",
        action: "CREATE",
        endpoint: "/supplement/register",
        method: "POST",
        payload: input,
        temp_id: tempId,
      })
      return { message: "Supplement record saved offline", offline: true }
    }
    throw error
  }
}

export type RegisterLabScreeningInput = {
  mother_id?: string
  pregnancy_id: string
  visit_id?: string
  screening_type: string
  result?: string
  file_url?: string
  file_name?: string
  date_of_screening: string
  remarks?: string
}

export const uploadMaternalLabFile = async (token: string, file: File) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const blobId = `blob-${crypto.randomUUID()}`
    await db.blobs.put({
      id: blobId,
      data: file,
      filename: file.name,
      mime_type: file.type,
    })
    return { file_url: blobId, blob_id: blobId, file_name: file.name }
  }
  const body = new FormData()
  body.append("file", file)
  return apiRequest<{ file_url: string }>("/lab-screening/upload", { method: "POST", token, body })
}

export const registerMaternalLabScreening = async (token: string, input: RegisterLabScreeningInput) => {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine
  if (isOffline) {
    const tempId = `temp-lab-${crypto.randomUUID()}`
    const localLab: LocalLabScreening = {
      id: tempId,
      screening_id: tempId,
      mother_id: input.mother_id || "",
      pregnancy_id: input.pregnancy_id,
      screening_type: input.screening_type,
      date_of_screening: input.date_of_screening,
      result: input.result,
      remarks: input.remarks,
      file_url: input.file_url,
      file_name: input.file_name,
      temp_blob_id: input.file_url?.startsWith("blob-") ? input.file_url : undefined,
      sync_status: "pending_create",
      updated_at: Date.now(),
    }
    await db.labScreenings.put(localLab)
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "lab_screening",
      action: "CREATE",
      endpoint: "/lab-screening/register",
      method: "POST",
      payload: { ...input, mother_id: input.mother_id },
      temp_id: tempId,
      blob_ids: localLab.temp_blob_id ? [localLab.temp_blob_id] : undefined,
    })
    return { message: "Lab screening saved offline", result: localLab as any, offline: true }
  }

  try {
    return await apiRequest<{ message?: string; result?: MaternalLabRecord }>("/lab-screening/register", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    })
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempId = `temp-lab-${crypto.randomUUID()}`
      const localLab: LocalLabScreening = {
        id: tempId,
        screening_id: tempId,
        mother_id: input.mother_id || "",
        pregnancy_id: input.pregnancy_id,
        screening_type: input.screening_type,
        date_of_screening: input.date_of_screening,
        result: input.result,
        remarks: input.remarks,
        file_url: input.file_url,
        file_name: input.file_name,
        temp_blob_id: input.file_url?.startsWith("blob-") ? input.file_url : undefined,
        sync_status: "pending_create",
        updated_at: Date.now(),
      }
      await db.labScreenings.put(localLab)
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "lab_screening",
        action: "CREATE",
        endpoint: "/lab-screening/register",
        method: "POST",
        payload: { ...input, mother_id: input.mother_id },
        temp_id: tempId,
        blob_ids: localLab.temp_blob_id ? [localLab.temp_blob_id] : undefined,
      })
      return { message: "Lab screening saved offline", result: localLab as any, offline: true }
    }
    throw error
  }
}

export const deleteMaternalLabScreening = (token: string, screeningId: string) =>
  apiRequest<{ message?: string }>(`/lab-screening/delete/${encodeURIComponent(screeningId)}`, { method: "DELETE", token })

export const cancelMaternalAppointment = async (token: string, appointmentId: string) => {
  await db.appointments.update(appointmentId, { status: "Cancelled", sync_status: "pending_update" }).catch(() => {})
  if (!navigator.onLine) {
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "appointment",
      action: "UPDATE",
      endpoint: `/appointment/cancel/${encodeURIComponent(appointmentId)}`,
      method: "PUT",
      payload: {},
      temp_id: appointmentId,
    })
    return { message: "Appointment cancelled offline" }
  }
  return apiRequest<{ message?: string }>(`/appointment/cancel/${encodeURIComponent(appointmentId)}`, { method: "PUT", token, body: JSON.stringify({}) })
}
