import type { Event as RBCEvent } from "react-big-calendar"


export interface AppEvent extends RBCEvent {
  id?: string
  appointmentId?: string
  recordVersion?: number
  motherId?: string
  type?: "appointment" | "availability"
  status?: string
  patient?: string
  appointmentType?: string
  provider?: string
  notes?: string
  venue?: string
  location?: string
}
