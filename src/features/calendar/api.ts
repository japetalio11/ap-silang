import { apiRequest } from "@/lib/api"
import { db, type LocalAppointment } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"
import type { MaternalRecord } from "@/features/maternal-records/api"
import type { AppEvent } from "./components/types"

export type AppointmentRecord = {
  appointment_id: string
  user_id?: string | null
  facility_id?: string | null
  appointment_date?: string | null
  appointment_time?: string | null
  appointment_type?: string | null
  reason?: string | null
  status?: string | null
  version?: number
  user?: { user_id?: string; first_name?: string; middle_name?: string; last_name?: string; phone_number?: string }
  facility?: { facility_name?: string; address?: string; city?: string }
  sync_status?: string
}

export type CreateAppointmentInput = {
  mother_id: string
  appointment_date: string
  appointment_time: string
  appointment_type: string
}

function localDate(dateValue?: string | null, timeValue?: string | null) {
  if (!dateValue) return null
  const datePart = dateValue.slice(0, 10)
  const [year, month, day] = datePart.split("-").map(Number)
  if (!year || !month || !day) return null
  const time = timeValue?.match(/^(\d{1,2}):(\d{2})/)
  const date = new Date(year, month - 1, day, time ? Number(time[1]) : 9, time ? Number(time[2]) : 0)
  return Number.isNaN(date.getTime()) ? null : date
}

export function appointmentToEvent(appointment: AppointmentRecord): AppEvent {
  const start = localDate(appointment.appointment_date, appointment.appointment_time) ?? new Date()
  const end = new Date(start.getTime() + 30 * 60_000)
  const patient = [appointment.user?.first_name, appointment.user?.middle_name, appointment.user?.last_name].filter(Boolean).join(" ") || "Maternal appointment"
  return {
    id: appointment.appointment_id,
    appointmentId: appointment.appointment_id,
    recordVersion: appointment.version,
    patient,
    title: patient,
    appointmentType: appointment.appointment_type || "Appointment",
    notes: appointment.reason || "",
    venue: appointment.facility?.facility_name || "Rural Health Unit 1",
    location: appointment.facility?.address || appointment.facility?.city || "Pili, Camarines Sur",
    status: appointment.status || "Scheduled",
    type: "appointment",
    start,
    end,
    allDay: false,
  }
}

export async function getAppointments(token: string): Promise<{ message?: string; data: AppointmentRecord[] }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const local = await db.appointments.toArray().catch(() => [])
    if (local.length > 0) {
      return {
        data: local.map((a) => ({
          appointment_id: a.appointment_id,
          user_id: a.user_id,
          facility_id: a.facility_id,
          appointment_date: a.appointment_date,
          appointment_time: a.appointment_time,
          appointment_type: a.appointment_type,
          reason: a.reason,
          status: a.status,
          version: a.version,
          user: a.user,
          facility: a.facility,
          sync_status: a.sync_status,
        })),
      }
    }
  }

  try {
    const res = await apiRequest<{ message?: string; data: AppointmentRecord[] }>("/appointment/getAll", { token })
    if (Array.isArray(res.data)) {
      for (const a of res.data) {
        await db.appointments.put({
          ...a,
          id: a.appointment_id,
          sync_status: "synced",
          updated_at: Date.now(),
        }).catch(() => {})
      }
    }
    const pending = await db.appointments.where("sync_status").anyOf("pending_create", "pending_update").toArray().catch(() => [])
    const onlineIds = new Set((res.data || []).map((a) => a.appointment_id))
    const uniquePending = pending.filter((a) => !onlineIds.has(a.appointment_id))
    return { data: [...uniquePending, ...(res.data || [])] as AppointmentRecord[] }
  } catch (error) {
    const local = await db.appointments.toArray().catch(() => [])
    if (local.length > 0) {
      return {
        data: local.map((a) => ({
          appointment_id: a.appointment_id,
          user_id: a.user_id,
          facility_id: a.facility_id,
          appointment_date: a.appointment_date,
          appointment_time: a.appointment_time,
          appointment_type: a.appointment_type,
          reason: a.reason,
          status: a.status,
          version: a.version,
          user: a.user,
          facility: a.facility,
          sync_status: a.sync_status,
        })),
      }
    }
    throw error
  }
}

export async function createAppointment(token: string, input: CreateAppointmentInput): Promise<{ message?: string; data: AppointmentRecord; offline?: boolean }> {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine

  if (isOffline) {
    const tempId = `temp-appt-${crypto.randomUUID()}`
    const mother = await db.mothers.get(input.mother_id)
    const localAppt: LocalAppointment = {
      id: tempId,
      appointment_id: tempId,
      mother_id: input.mother_id,
      user_id: mother?.user_id,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      appointment_type: input.appointment_type,
      status: "Scheduled",
      user: mother?.user || { first_name: mother?.first_name, last_name: mother?.last_name },
      sync_status: "pending_create",
      updated_at: Date.now(),
    }
    await db.appointments.put(localAppt)
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "appointment",
      action: "CREATE",
      endpoint: "/appointment/register",
      method: "POST",
      payload: input,
      temp_id: tempId,
    })
    return { message: "Appointment saved offline", data: localAppt as any, offline: true }
  }

  try {
    const res = await apiRequest<{ message?: string; data: AppointmentRecord }>("/appointment/register", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    })
    if (res.data) {
      await db.appointments.put({
        ...res.data,
        id: res.data.appointment_id,
        sync_status: "synced",
        updated_at: Date.now(),
      }).catch(() => {})
    }
    return res
  } catch (error: any) {
    if (error instanceof TypeError || !navigator.onLine) {
      const tempId = `temp-appt-${crypto.randomUUID()}`
      const mother = await db.mothers.get(input.mother_id)
      const localAppt: LocalAppointment = {
        id: tempId,
        appointment_id: tempId,
        mother_id: input.mother_id,
        user_id: mother?.user_id,
        appointment_date: input.appointment_date,
        appointment_time: input.appointment_time,
        appointment_type: input.appointment_type,
        status: "Scheduled",
        user: mother?.user || { first_name: mother?.first_name, last_name: mother?.last_name },
        sync_status: "pending_create",
        updated_at: Date.now(),
      }
      await db.appointments.put(localAppt)
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "appointment",
        action: "CREATE",
        endpoint: "/appointment/register",
        method: "POST",
        payload: input,
        temp_id: tempId,
      })
      return { message: "Appointment saved offline", data: localAppt as any, offline: true }
    }
    throw error
  }
}

export async function cancelAppointment(token: string, appointmentId: string, version?: number) {
  await db.appointments.update(appointmentId, { status: "Cancelled", sync_status: "pending_update" }).catch(() => {})
  if (!navigator.onLine) {
    await silangSyncEngine.enqueue({
      client_mutation_id: crypto.randomUUID(),
      entity_type: "appointment",
      action: "UPDATE",
      endpoint: `/appointment/cancel/${encodeURIComponent(appointmentId)}`,
      method: "PUT",
      payload: { ...(version === undefined ? {} : { version }) },
      temp_id: appointmentId,
    })
    return { message: "Appointment cancelled offline" }
  }
  return apiRequest<{ message?: string; data?: AppointmentRecord }>(`/appointment/cancel/${encodeURIComponent(appointmentId)}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ ...(version === undefined ? {} : { version }) }),
  })
}

export function maternalRecordToAppointmentOption(mother: MaternalRecord) {
  const name = [mother.user?.first_name, mother.user?.middle_name, mother.user?.last_name].filter(Boolean).join(" ") || "Unnamed mother"
  return {
    id: mother.mother_id,
    userId: mother.user?.user_id ?? undefined,
    name,
    serial: mother.family_serial_no || "No family serial number",
    age: `${mother.age ?? "—"} years`,
  }
}
