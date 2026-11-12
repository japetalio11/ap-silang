import { apiRequest } from "@/lib/api"
import { db, type LocalReferral } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"

export function getReferralGatewayLink(referralId: string) {
  const route = `/referral/${encodeURIComponent(referralId)}`
  const configuredAppUrl = import.meta.env.VITE_APP_URL?.trim().replace(/\/+$/, "")
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  const appUrl = import.meta.env.DEV
    ? isLocalHost ? window.location.origin : "http://localhost:5173"
    : configuredAppUrl || window.location.origin
  return `${appUrl}${route}`
}

export type ReferralFacility = {
  facility_id: string
  facility_name: string
  address?: string | null
  type?: string | null
}

export type ReferralClinicalVisit = {
  visit_id?: string
  visit_date?: string
  visit_number?: number
  trimester?: number
  age_of_gestation_weeks?: number
  risk_level_assessed?: string | null
  tews_score?: number | null
  bp_systolic?: number
  bp_diastolic?: number
  temperature_celsius?: number | string
  pulse_rate_bpm?: number
  weight_kg?: number | string
  fundic_height_cm?: number | string | null
  fetal_heart_tone_bpm?: number | null
  fetal_presentation?: string | null
  chief_complaint?: string | null
  danger_signs_observed?: string | null
}

export type ReferralApiRecord = {
  referral_id: string
  pregnancy_id: string
  from_facility_id: string
  to_facility_id?: string | null
  external_facility_name?: string | null
  reason?: string | null
  date_referred?: string
  secure_link?: string | null
  shared_pin?: string | null
  is_completed?: boolean
  status?: string | null
  response_notes?: string | null
  outcome?: string | null
  date_responded?: string | null
  version?: number
  updated_at?: string
  pregnancy?: {
    pregnancy_id: string
    mother_id?: string
    gravida?: number
    parity?: number
    lmp_date?: string
    edd_date?: string | null
    pregnancy_status?: string
    mother?: {
      family_serial_no?: string | null
      birth_date?: string
      age?: number
      civil_status?: string | null
      blood_type?: string | null
      user?: { first_name?: string; middle_name?: string | null; last_name?: string; address?: string | null; phone_number?: string | null }
    }
    prenatalVisits?: ReferralClinicalVisit[]
    cdssAlerts?: Array<{ alert_type?: string; alert_message?: string; severity?: string }>
  }
  fromFacility?: ReferralFacility
  toFacility?: ReferralFacility | null
}

export type CreateReferralInput = {
  pregnancy_id: string
  mother_id: string
  from_facility_id: string
  to_facility_id?: string
  external_facility_name?: string
  reason: string
}

export type PublicReferralRecord = {
  referral_id: string
  status?: string | null
  date_referred?: string | null
  reason?: string | null
  response_notes?: string | null
  outcome?: string | null
  date_responded?: string | null
  version?: number
  isPinRequired?: boolean
  isPinVerified?: boolean
  referring_facility?: { name?: string; address?: string | null; contact?: string | null; email?: string | null }
  destination_facility?: { name?: string; address?: string | null; contact?: string | null; email?: string | null }
  patient?: {
    mother_id?: string
    name?: string
    age?: number | null
    birth_date?: string | null
    blood_type?: string | null
    civil_status?: string | null
    phone?: string | null
    address?: string | null
    email?: string | null
    profile_url?: string | null
    family_serial_no?: string | null
  }
  obstetric_info?: {
    pregnancy_id?: string
    gravida?: number | null
    parity?: number | null
    lmp_date?: string | null
    edd_date?: string | null
    age_group?: string | null
    bmi_category?: string | null
    pregnancy_status?: string | null
    co_morbidities?: string | null
    previous_delivery_history?: string | null
    latest_vitals?: {
      visit_date?: string | null
      gestational_age_weeks?: number | null
      bp?: string | null
      pulse_rate?: number | null
      temp?: number | string | null
      fundic_height?: number | string | null
      fetal_heart_tone?: number | null
      risk_level?: string | null
      danger_signs?: string | null
      chief_complaint?: string | null
    } | null
  }
  prenatal_visits?: ReferralClinicalVisit[]
  lab_screenings?: Array<{ screening_id?: string; screening_type?: string; result?: string | null; date_of_screening?: string; remarks?: string | null; file_url?: string | null }>
  supplements?: Array<{ supplement_id?: string; supplement_type?: string; tablets_given_count?: number; date_given?: string; is_completed?: boolean }>
  cdss_alerts?: Array<{ alert_type?: string; alert_message?: string; severity?: string; updated_at?: string }>
  delivery_outcomes?: Array<{ delivery_id?: string; delivery_date?: string; place_of_delivery?: string; mode_of_delivery?: string; birth_attendant?: string; maternal_outcome?: string; newbornRecords?: Array<{ sex?: string; birth_weight_kg?: number | string; status_at_birth?: string; apgar_score?: number }> }>
  appointments?: Array<{ appointment_id?: string; appointment_date?: string; appointment_time?: string; appointment_type?: string; reason?: string; status?: string }>
  previous_referrals?: Array<{ referral_id?: string; date_referred?: string; status?: string; reason?: string; fromFacility?: { facility_name?: string }; toFacility?: { facility_name?: string }; external_facility_name?: string }>
}

export type PublicReferralResponse = { data?: PublicReferralRecord; message?: string; error?: string }

export const getPublicReferral = (identifier: string, pin?: string) => {
  const query = pin ? `?pin=${encodeURIComponent(pin)}` : ""
  return apiRequest<PublicReferralResponse>(`/referral/public/${encodeURIComponent(identifier)}${query}`, { cache: "no-store" })
}

export const respondToPublicReferral = (identifier: string, input: { pin: string; status: string; response_notes?: string; outcome?: string }) =>
  apiRequest<PublicReferralResponse>(`/referral/public/${encodeURIComponent(identifier)}/respond`, {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify(input),
  })

export const clarifyPublicReferral = (identifier: string, input: { pin: string; topic?: string; priority?: string; message: string; sender_name?: string; sender_contact?: string }) =>
  apiRequest<PublicReferralResponse>(`/referral/public/${encodeURIComponent(identifier)}/clarify`, {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify(input),
  })

async function enrichLocalReferral(r: LocalReferral): Promise<ReferralApiRecord> {
  let pregnancy: any = (r as any).pregnancy
  let fromFacility: any = (r as any).fromFacility
  let toFacility: any = (r as any).toFacility

  if (!pregnancy) {
    const preg = r.pregnancy_id ? await db.pregnancies.get(r.pregnancy_id).catch(() => null) : null
    const mother = r.mother_id ? await db.mothers.get(r.mother_id).catch(() => null) : null
    const visits = r.pregnancy_id
      ? await db.prenatalVisits.where("pregnancy_id").equals(r.pregnancy_id).reverse().sortBy("created_at").catch(() => [])
      : []

    let user = mother?.user
    if (!user && mother) {
      user = {
        first_name: mother.first_name,
        middle_name: mother.middle_name,
        last_name: mother.last_name,
        address: mother.address,
        phone_number: mother.phone_number,
      }
    }

    pregnancy = {
      pregnancy_id: r.pregnancy_id,
      mother_id: r.mother_id,
      gravida: preg?.gravida,
      parity: preg?.parity,
      lmp_date: preg?.lmp_date,
      edd_date: preg?.edd_date,
      pregnancy_status: preg?.status || preg?.pregnancy_status,
      mother: mother
        ? {
            family_serial_no: mother.family_serial_no,
            birth_date: mother.date_of_birth,
            blood_type: mother.blood_type,
            user,
          }
        : undefined,
      prenatalVisits: visits.map((v) => ({
        visit_id: v.visit_id,
        visit_date: v.visit_date,
        bp_systolic: v.bp_systolic,
        bp_diastolic: v.bp_diastolic,
        temperature_celsius: v.temperature_celsius,
        pulse_rate_bpm: v.pulse_rate_bpm,
        weight_kg: v.weight_kg,
        fundic_height_cm: v.fundic_height_cm,
        fetal_heart_tone_bpm: v.fetal_heart_tone_bpm,
        risk_level_assessed: v.risk_level_assessed,
      })),
    }
  }

  if (!toFacility && r.to_facility_id) {
    try {
      const cachedFacilities: ReferralFacility[] = JSON.parse(localStorage.getItem("silang.cached-facilities") || "[]")
      toFacility = cachedFacilities.find((f) => f.facility_id === r.to_facility_id)
    } catch {}
  }

  return {
    ...r,
    pregnancy,
    fromFacility,
    toFacility,
    updated_at: typeof r.updated_at === "number" ? new Date(r.updated_at).toISOString() : r.updated_at,
  } as unknown as ReferralApiRecord
}

export const getReferrals = async (token: string): Promise<{ data?: ReferralApiRecord[]; message?: string }> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const local = await db.referrals.toArray().catch(() => [])
    const enriched = await Promise.all(local.map(enrichLocalReferral))
    return { data: enriched }
  }

  try {
    const res = await apiRequest<{ data?: ReferralApiRecord[]; message?: string }>("/referral/getAll", { token })
    if (Array.isArray(res.data)) {
      for (const r of res.data) {
        await db.referrals.put({
          ...r,
          id: r.referral_id,
          sync_status: "synced",
          updated_at: Date.now(),
        }).catch(() => {})
      }
    }
    const pending = await db.referrals.where("sync_status").anyOf("pending_create", "pending_update").toArray().catch(() => [])
    const onlineIds = new Set((res.data || []).map((r) => r.referral_id))
    const uniquePending = pending.filter((r) => !onlineIds.has(r.referral_id))
    const enrichedPending = await Promise.all(uniquePending.map(enrichLocalReferral))
    return { data: [...enrichedPending, ...(res.data || [])] as ReferralApiRecord[] }
  } catch (error) {
    const local = await db.referrals.toArray().catch(() => [])
    if (local.length > 0) {
      const enriched = await Promise.all(local.map(enrichLocalReferral))
      return { data: enriched }
    }
    throw error
  }
}

export const getReferralFacilities = async (): Promise<{ result?: ReferralFacility[] }> => {
  const cached = typeof localStorage !== "undefined" ? localStorage.getItem("silang.cached-facilities") : null
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    if (cached) {
      try {
        return { result: JSON.parse(cached) }
      } catch {}
    }
    return { result: [] }
  }

  try {
    const res = await apiRequest<{ result?: ReferralFacility[] }>("/facility/public-list")
    if (Array.isArray(res.result) && typeof localStorage !== "undefined") {
      localStorage.setItem("silang.cached-facilities", JSON.stringify(res.result))
    }
    return res
  } catch (err) {
    if (cached) {
      try {
        return { result: JSON.parse(cached) }
      } catch {}
    }
    return { result: [] }
  }
}

export const createReferral = async (token: string, input: CreateReferralInput): Promise<{ data?: ReferralApiRecord; message?: string; offline?: boolean }> => {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine

  if (isOffline) {
    const tempId = `temp-ref-${crypto.randomUUID()}`
    const baseRef: LocalReferral = {
      id: tempId,
      referral_id: tempId,
      mother_id: input.mother_id,
      pregnancy_id: input.pregnancy_id,
      from_facility_id: input.from_facility_id,
      to_facility_id: input.to_facility_id,
      external_facility_name: input.external_facility_name,
      reason: input.reason,
      status: "Pending",
      date_referred: new Date().toISOString(),
      is_completed: false,
      sync_status: "pending_create",
      updated_at: Date.now(),
    }
    const enriched = await enrichLocalReferral(baseRef)
    await db.referrals.put(enriched as any)
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "referral",
      action: "CREATE",
      endpoint: "/referral/register",
      method: "POST",
      payload: input,
      temp_id: tempId,
    })
    return { message: "Referral saved offline", data: enriched, offline: true }
  }

  try {
    const res = await apiRequest<{ data?: ReferralApiRecord; message?: string }>("/referral/register", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    })
    if (res.data) {
      await db.referrals.put({
        ...res.data,
        id: res.data.referral_id,
        sync_status: "synced",
        updated_at: Date.now(),
      }).catch(() => {})
    }
    return res
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempId = `temp-ref-${crypto.randomUUID()}`
      const baseRef: LocalReferral = {
        id: tempId,
        referral_id: tempId,
        mother_id: input.mother_id,
        pregnancy_id: input.pregnancy_id,
        from_facility_id: input.from_facility_id,
        to_facility_id: input.to_facility_id,
        external_facility_name: input.external_facility_name,
        reason: input.reason,
        status: "Pending",
        date_referred: new Date().toISOString(),
        is_completed: false,
        sync_status: "pending_create",
        updated_at: Date.now(),
      }
      const enriched = await enrichLocalReferral(baseRef)
      await db.referrals.put(enriched as any)
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "referral",
        action: "CREATE",
        endpoint: "/referral/register",
        method: "POST",
        payload: input,
        temp_id: tempId,
      })
      return { message: "Referral saved offline", data: enriched, offline: true }
    }
    throw error
  }
}

export const updateReferralStatus = async (token: string, referral: ReferralApiRecord, status: string) => {
  await db.referrals.update(referral.referral_id, {
    status,
    is_completed: ["completed", "cancelled", "rejected"].includes(status.toLowerCase()),
    sync_status: "pending_update",
    updated_at: Date.now(),
  }).catch(() => {})

  if (!navigator.onLine) {
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "referral",
      action: "UPDATE",
      endpoint: `/referral/respond/${encodeURIComponent(referral.referral_id)}`,
      method: "PUT",
      payload: { status, is_completed: ["completed", "cancelled", "rejected"].includes(status.toLowerCase()), version: referral.version ?? 1 },
      temp_id: referral.referral_id,
    })
    return { message: "Referral status updated offline" }
  }

  return apiRequest<{ data?: ReferralApiRecord; message?: string }>(`/referral/respond/${encodeURIComponent(referral.referral_id)}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ status, is_completed: ["completed", "cancelled", "rejected"].includes(status.toLowerCase()), version: referral.version ?? 1 }),
  })
}
