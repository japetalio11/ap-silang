import { apiRequest } from "@/lib/api"
import type { MaternalRecord } from "@/features/maternal-records/api"
import type { AppEvent } from "./components/types"

export type AppointmentRecord = {
  appointment_id: string
  user_id?: string
  facility_id?: string | null
  appointment_date?: string | null
  appointment_time?: string | null
  appointment_type?: string | null
  reason?: string | null
  status?: string | null
  version?: number
  user?: { user_id?: string; first_name?: string; middle_name?: string; last_name?: string; phone_number?: string }
  facility?: { facility_name?: string; address?: string; city?: string }
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

export function getAppointments(token: string) {
  return apiRequest<{ message?: string; data: AppointmentRecord[] }>("/appointment/getAll", { token })
}

export function createAppointment(token: string, input: CreateAppointmentInput) {
  return apiRequest<{ message?: string; data: AppointmentRecord }>("/appointment/register", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  })
}

export function cancelAppointment(token: string, appointmentId: string, version?: number) {
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
