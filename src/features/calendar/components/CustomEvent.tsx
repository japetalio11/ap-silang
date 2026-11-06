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
        <StatusBadge status={event.title} className={`cursor-pointer ${isMobile ? "px-3 py-1.5" : "px-2 py-1 text-xs"}`} />
      </div>
    )
  }

  const start = event.start instanceof Date ? event.start : new Date(event.start ?? Number.NaN)
  const end = event.end instanceof Date ? event.end : event.end ? new Date(event.end) : null
  const appointmentTime = event.start && !Number.isNaN(start.getTime())
    ? `${format(start, "MMMM dd, yyyy h:mm a")}${end && !Number.isNaN(end.getTime()) ? ` – ${format(end, "h:mm a")}` : ""}`
    : "Not scheduled"

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick?.(event) }}
          className={`flex w-full min-w-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-md border border-sidebar-border bg-card/80 text-left text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-white dark:hover:bg-white/5 ${compact ? "h-9 min-h-9 px-1.5 py-0.5" : `h-full ${isMobile ? "p-2.5" : "p-1.5"}`}`}
        >
          <span aria-hidden="true" className="w-1 shrink-0 self-stretch rounded-full bg-[#57c766]" />
          <span className={`flex min-w-0 flex-1 flex-col justify-center ${compact ? "gap-0" : "gap-0.5"}`}>
            <span className={`${compact ? "text-[11px] leading-3.5" : `${isMobile ? "text-sm" : "text-xs"} leading-4`} block truncate font-medium`}>
              {event.patient || event.title}
            </span>
            <span className={`flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground ${compact ? "leading-3.5" : "leading-4"}`}>
              <Clock3 className="size-3 shrink-0" />
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
