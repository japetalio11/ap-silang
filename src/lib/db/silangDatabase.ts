/* eslint-disable @typescript-eslint/no-explicit-any */
import Dexie, { type Table } from "dexie"

export type SyncStatus = "synced" | "pending_create" | "pending_update" | "pending_delete" | "conflict" | "error"

export interface LocalMother {
  id: string
  mother_id: string
  user_id?: string | null
  facility_id?: string | null
  assigned_worker_id?: string | null
  first_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  phone_number?: string | null
  email?: string | null
  address?: string | null
  family_serial_no?: string | null
  birth_date?: string | null
  civil_status?: string | null
  blood_type?: string | null
  age?: number | null
  profile_url?: string | null
  photo_url?: string | null
  user?: any
  assignedWorker?: any
  pregnancies?: any[]
  sync_status: SyncStatus
  version?: number
  updated_at: number
  [key: string]: any
}

export interface LocalPregnancy {
  id: string
  pregnancy_id: string
  mother_id: string
  lmp_date?: string | null
  edd_date?: string | null
  gravida?: number | null
  parity?: number | null
  pregnancy_status?: string | null
  height_cm?: number | string | null
  bmi_1st_trimester?: number | string | null
  bmi_category?: string | null
  completed_8anc?: boolean
  prev_caesarean?: boolean
  consecutive_miscarriages?: boolean
  stillbirth_history?: boolean
  pph_history?: boolean
  has_heart_disease?: boolean
  has_diabetes?: boolean
  has_tb?: boolean
  has_asthma?: boolean
  has_goiter?: boolean
  co_morbidities?: string | null
  previous_delivery_history?: string | null
  prenatal_visits?: any[]
  sync_status: SyncStatus
  version?: number
  updated_at: number
  [key: string]: any
}

export interface LocalPrenatalVisit {
  id: string
  visit_id: string
  pregnancy_id: string
  mother_id: string
  health_worker_id?: string | null
  trimester?: number | null
  visit_number?: number | null
  age_of_gestation_weeks?: number | null
  weight_kg?: number | string | null
  temperature_celsius?: number | string | null
  pulse_rate_bpm?: number | null
  bp_diastolic?: number | null
  bp_systolic?: number | null
  fundic_height_cm?: number | string | null
  fetal_heart_rate_bpm?: number | null
  fetal_position?: string | null
  chief_complaint?: string | null
  clinical_notes?: string | null
  visit_date?: string | null
  sync_status: SyncStatus
  version?: number
  updated_at: number
  [key: string]: any
}

export interface LocalAppointment {
  id: string
  appointment_id: string
  mother_id?: string | null
  user_id?: string | null
  facility_id?: string | null
  appointment_date?: string | null
  appointment_time?: string | null
  appointment_type?: string | null
  reason?: string | null
  status?: string | null
  user?: any
  facility?: any
  sync_status: SyncStatus
  version?: number
  updated_at: number
  [key: string]: any
}

export interface LocalPrescription {
  id: string
  prescription_id: string
  mother_id: string
  pregnancy_id?: string | null
  medication_name: string
  dosage: string
  frequency: string
  instructions?: string | null
  prescribed_date: string
  sync_status: SyncStatus
  version?: number
  updated_at: number
  [key: string]: any
}

export interface LocalLabScreening {
  id: string
  screening_id: string
  mother_id: string
  pregnancy_id?: string | null
  screening_type: string
  date_of_screening: string
  result?: string | null
  remarks?: string | null
  file_url?: string | null
  temp_blob_id?: string | null
  sync_status: SyncStatus
  version?: number
  updated_at: number
  [key: string]: any
}

export interface LocalReferral {
  id: string
  referral_id: string
  mother_id?: string | null
  pregnancy_id?: string | null
  from_facility_id?: string | null
  to_facility_id?: string | null
  external_facility_name?: string | null
  reason?: string | null
  status?: string | null
  date_referred?: string | null
  is_completed?: boolean
  referral_code?: string | null
  pregnancy?: any
  fromFacility?: any
  toFacility?: any
  sync_status: SyncStatus
  version?: number
  updated_at: number
  [key: string]: any
}

export interface LocalMessage {
  id: string
  message_id: string
  sender_id: string
  receiver_id: string
  message_type: string
  message_content: string
  file_url?: string | null
  temp_blob_id?: string | null
  is_read: boolean
  message_date: string
  contact_name?: string | null
  contact_avatar?: string | null
  sync_status: SyncStatus
  updated_at: number
  [key: string]: any
}

export interface LocalDeliveryOutcome {
  id: string
  delivery_id: string
  pregnancy_id: string
  mother_id?: string | null
  delivery_date?: string | null
  place_of_delivery?: string | null
  mode_of_delivery?: string | null
  duration_of_labor_hours?: number | string | null
  blood_loss_ml?: number | null
  delivery_complications?: string | null
  birth_attendant?: string | null
  maternal_outcome?: string | null
  immediate_breastfeeding?: boolean
  newbornRecords?: any[]
  postpartumVisits?: any[]
  sync_status: SyncStatus
  version?: number
  updated_at: number
  [key: string]: any
}

export interface LocalStaff {
  id: string
  user_id: string
  facility_id?: string | null
  first_name: string
  middle_name?: string | null
  last_name: string
  role: string
  phone_number?: string | null
  email?: string | null
  profile_url?: string | null
  is_active: boolean
  sync_status: SyncStatus
  updated_at: number
  [key: string]: any
}

export interface IdMapping {
  temp_id: string
  canonical_id: string
  canonical_user_id?: string
  entity_type: string
  created_at: number
}

export interface LocalBlob {
  id: string
  data: Blob
  filename: string
  mime_type: string
}

export interface OfflineQueueItem {
  id?: number
  client_mutation_id: string
  entity_type:
    | "mother"
    | "pregnancy"
    | "prenatal_visit"
    | "appointment"
    | "prescription"
    | "lab_screening"
    | "referral"
    | "message"
    | "delivery_outcome"
    | "staff"
    | "user_profile"
    | "facility"
  action: "CREATE" | "UPDATE" | "DELETE"
  endpoint: string
  method: "POST" | "PUT" | "DELETE"
  payload: any
  temp_id?: string
  blob_ids?: string[]
  retry_count: number
  last_error?: string
  status: "pending" | "processing" | "conflict" | "error"
  conflict_id?: string
  created_at: number
}

export interface SyncConflict {
  id?: number
  conflict_id: string
  entity_type: string
  entity_id: string
  endpoint: string
  method: string
  server_record: Record<string, any>
  client_payload: Record<string, any>
  conflicting_fields: string[]
  status: "unresolved" | "resolving" | "resolved"
  detected_at: number
  last_error?: string
}

export class SilangDatabase extends Dexie {
  mothers!: Table<LocalMother, string>
  pregnancies!: Table<LocalPregnancy, string>
  prenatalVisits!: Table<LocalPrenatalVisit, string>
  appointments!: Table<LocalAppointment, string>
  prescriptions!: Table<LocalPrescription, string>
  labScreenings!: Table<LocalLabScreening, string>
  referrals!: Table<LocalReferral, string>
  messages!: Table<LocalMessage, string>
  deliveryOutcomes!: Table<LocalDeliveryOutcome, string>
  staff!: Table<LocalStaff, string>
  idMappings!: Table<IdMapping, string>
  offlineQueue!: Table<OfflineQueueItem, number>
  blobs!: Table<LocalBlob, string>
  conflicts!: Table<SyncConflict, number>

  constructor() {
    super("Silang_Offline_DB")
    this.version(1).stores({
      mothers: "id, mother_id, user_id, facility_id, phone_number, sync_status, updated_at",
      pregnancies: "id, pregnancy_id, mother_id, sync_status, updated_at",
      prenatalVisits: "id, visit_id, pregnancy_id, mother_id, visit_date, sync_status, updated_at",
      appointments: "id, appointment_id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      prescriptions: "id, prescription_id, mother_id, pregnancy_id, sync_status, updated_at",
      labScreenings: "id, screening_id, mother_id, pregnancy_id, sync_status, updated_at",
      referrals: "id, referral_id, mother_id, pregnancy_id, from_facility_id, to_facility_id, status, sync_status, updated_at",
      messages: "id, message_id, sender_id, receiver_id, message_date, is_read, sync_status, updated_at",
      deliveryOutcomes: "id, delivery_id, pregnancy_id, mother_id, sync_status, updated_at",
      staff: "id, user_id, facility_id, role, is_active, sync_status, updated_at",
      idMappings: "temp_id, canonical_id, entity_type, created_at",
      offlineQueue: "++id, client_mutation_id, entity_type, action, status, created_at, retry_count",
      blobs: "id",
      conflicts: "++id, conflict_id, entity_type, entity_id, status, detected_at",
    })
  }
}

export const db = new SilangDatabase()
