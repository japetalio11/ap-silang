import { apiRequest } from "@/lib/api"

export type PublicSharedJourneyVisit = {
  visit_id?: string
  visit_date?: string
  visit_number?: number
  trimester?: number
  age_of_gestation_weeks?: number
  risk_level_assessed?: string | null
  bp_systolic?: number | null
  bp_diastolic?: number | null
  temperature_celsius?: number | string | null
  pulse_rate_bpm?: number | null
  weight_kg?: number | string | null
  fundic_height_cm?: number | string | null
  fetal_heart_tone_bpm?: number | null
  fetal_presentation?: string | null
  chief_complaint?: string | null
  danger_signs_observed?: string | null
  healthWorker?: {
    user_id?: string
    first_name?: string
    last_name?: string
    role?: string
    facility?: {
      facility_id?: string
      facility_name?: string
      type?: string
    } | null
  } | null
}

export type PublicSharedJourneyRecord = {
  isPinRequired?: boolean
  isPinVerified?: boolean
  pinError?: string | null
  patient_preview?: {
    initials?: string
    facility_name?: string
    created_at?: string
  }
  patient?: {
    mother_id?: string
    user_id?: string
    name?: string
    first_name?: string
    middle_name?: string | null
    last_name?: string
    birth_date?: string | null
    age?: number | null
    blood_type?: string | null
    civil_status?: string | null
    phone_number?: string | null
    email?: string | null
    address?: string | null
    profile_url?: string | null
    family_serial_no?: string | null
    primary_facility?: {
      facility_id?: string
      facility_name?: string
      address?: string | null
      contact_number?: string | null
      email?: string | null
      type?: string | null
    } | null
  }
  current_pregnancy?: {
    pregnancy_id?: string
    date_of_registration?: string | null
    lmp_date?: string | null
    edd?: string | null
    edd_date?: string | null
    gestational_age_weeks?: number | null
    gravida?: number | null
    parity?: number | null
    pregnancy_status?: string | null
    previous_delivery_history?: string | null
    co_morbidities?: string | null
    age_group?: string | null
    height_cm?: number | string | null
    bmi_1st_trimester?: number | string | null
    bmi_category?: string | null
    prev_caesarean?: boolean
    consecutive_miscarriages?: number | null
    stillbirth_history?: boolean
    pph_history?: boolean
    has_tb?: boolean
    has_heart_disease?: boolean
    has_diabetes?: boolean
    has_asthma?: boolean
    has_goiter?: boolean
    latest_vitals?: {
      visit_date?: string | null
      gestational_age_weeks?: number | null
      bp?: string | null
      bp_systolic?: number | null
      bp_diastolic?: number | null
      pulse_rate?: number | null
      temp?: number | string | null
      weight_kg?: number | string | null
      fundic_height?: number | string | null
      fetal_heart_tone?: number | null
      fetal_presentation?: string | null
      risk_level?: string | null
      danger_signs?: string | null
      has_vaginal_bleeding?: boolean
      has_pallor?: boolean
      has_edema?: boolean
      has_fever?: boolean
      chief_complaint?: string | null
    } | null
  } | null
  prenatal_visits?: PublicSharedJourneyVisit[]
  lab_screenings?: Array<{
    screening_id?: string
    screening_type?: string
    result?: string | null
    date_of_screening?: string
    remarks?: string | null
    file_url?: string | null
  }>
  supplements?: Array<{
    supplement_id?: string
    supplement_type?: string
    tablets_given_count?: number
    date_given?: string
    is_completed?: boolean
  }>
  share_metadata?: {
    share_id?: string
    created_at?: string
    last_accessed_at?: string
    access_count?: number
  }
}

export type PublicSharedJourneyResponse = {
  data?: PublicSharedJourneyRecord
  message?: string
  error?: string
}

export const getPublicSharedJourney = (token: string, pin?: string) => {
  const query = pin ? `?pin=${encodeURIComponent(pin)}` : ""
  return apiRequest<PublicSharedJourneyResponse>(`/share/shared/${encodeURIComponent(token)}${query}`, {
    cache: "no-store",
  })
}
