import { Building2, CalendarClock, Clock3, MapPin } from "lucide-react"
import { format } from "date-fns"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { useIsMobile } from "@/hooks/use-mobile"
import type { AppEvent } from "./types"

function AppointmentDetailRow({ icon: Icon, label, children }: { icon: typeof CalendarClock; label: string; children: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] items-center gap-2 py-1 text-xs">
      <dt className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  )
}

export function CustomEvent({ event, onClick, compact = false }: {
  event: AppEvent
  onClick?: (event: AppEvent) => void
  compact?: boolean
}) {
  const isMobile = useIsMobile()

  if (event.type === "availability") {
    return (
      <div onClick={(e) => { e.stopPropagation(); onClick?.(event) }} className="mt-1 flex w-full justify-end pr-1">
        <StatusBadge status={String(event.title ?? "")} className={`cursor-pointer ${isMobile ? "px-3 py-1.5" : "px-2 py-1 text-xs"}`} />
      </div>
    )
  }

  const start = event.start instanceof Date ? event.start : new Date(event.start ?? Number.NaN)
  const end = event.end instanceof Date ? event.end : event.end ? new Date(event.end) : null
  const appointmentTime = event.start && !Number.isNaN(start.getTime())
    ? `${format(start, "MMMM dd, yyyy h:mm a")}${end && !Number.isNaN(end.getTime()) ? ` – ${format(end, "h:mm a")}` : ""}`
    : "Not scheduled"
  const status = String(event.status || "scheduled").toLowerCase()
  const accent = status.includes("cancel") ? "bg-red-500" : status.includes("complet") ? "bg-emerald-500" : "bg-sky-500"

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick?.(event) }}
          className={`group/event flex w-full min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-md border border-border/70 bg-card text-left text-foreground transition-[background-color,border-color,transform] hover:-translate-y-px hover:border-foreground/25 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compact ? "min-h-11 px-2 py-1.5" : `h-full ${isMobile ? "p-2.5" : "p-2"}`}`}
        >
          <span aria-hidden="true" className={`w-1 shrink-0 self-stretch rounded-full ${accent}`} />
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <span className="block truncate text-xs font-semibold leading-4">
              {event.patient || event.title}
            </span>
            <span className="flex min-w-0 items-center gap-1 truncate text-xs leading-4 text-muted-foreground">
              <Clock3 className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{event.appointmentType || "Appointment"}{event.start && !Number.isNaN(start.getTime()) ? ` · ${format(start, "h:mm a")}` : ""}</span>
            </span>
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" side="right" sideOffset={8} className="w-72 max-w-[calc(100vw-2rem)] rounded-md border border-sidebar-border bg-popover p-3 text-popover-foreground shadow-md">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h2 className="min-w-0 text-xs font-semibold leading-4">{event.patient || event.title}</h2>
          <StatusBadge status={event.status || "Scheduled"} />
        </div>
        <dl className="mt-2">
          <AppointmentDetailRow icon={CalendarClock} label="Date & Time">{appointmentTime}</AppointmentDetailRow>
          <AppointmentDetailRow icon={Building2} label="Venue">{event.venue || "Not specified"}</AppointmentDetailRow>
          <AppointmentDetailRow icon={MapPin} label="Location">{event.location || "Not specified"}</AppointmentDetailRow>
        </dl>
      </HoverCardContent>
    </HoverCard>
  )
}
