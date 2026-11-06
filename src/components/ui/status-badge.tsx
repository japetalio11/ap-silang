import type { ComponentType } from "react"
import {
  Archive,
  CalendarCheck,
  Circle,
  CircleAlert,
  CircleCheck,
  Sparkles,
  ShieldCheck,
  TriangleAlert,
  Truck,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

type StatusStyle = {
  className: string
  icon: ComponentType<{ className?: string }>
}

function getStatusStyle(status: string): StatusStyle {
  const normalized = status.toLowerCase()

  if (normalized.includes("unavailable")) return { className: "bg-[#be123c] border-[#be123c]/20", icon: XCircle }
  if (normalized.includes("archived") || normalized.includes("deactivated") || normalized.includes("inactive")) {
    return { className: "bg-zinc-600 border-zinc-600/20", icon: Archive }
  }
  if (normalized.includes("ongoing")) return { className: "bg-[#b45309] border-[#b45309]/20", icon: Sparkles }
  if (normalized.includes("in transit")) return { className: "bg-[#b45309] border-[#b45309]/20", icon: Truck }
  if (normalized.includes("high risk") || normalized.includes("danger") || normalized.includes("cancel") || normalized.includes("missed") || normalized.includes("rejected") || normalized.includes("booked")) {
    return { className: "bg-[#be123c] border-[#be123c]/20", icon: TriangleAlert }
  }
  if (normalized.includes("moderate") || normalized.includes("pending") || normalized.includes("review") || normalized.includes("in progress")) {
    return { className: "bg-[#b45309] border-[#b45309]/20", icon: CircleAlert }
  }
  if (normalized.includes("scheduled") || normalized.includes("upcoming")) return { className: "bg-sky-600 border-sky-600/20", icon: CalendarCheck }
  if (normalized.includes("approved") || normalized.includes("accepted") || normalized.includes("admitted") || normalized.includes("active") || normalized.includes("completed") || normalized.includes("low risk") || normalized.includes("available")) {
    return { className: "bg-[#15803d] border-[#15803d]/20", icon: normalized.includes("low risk") ? ShieldCheck : CircleCheck }
  }
  if (normalized.includes("postpartum")) return { className: "bg-violet-700 border-violet-700/20", icon: CircleCheck }
  return { className: "bg-zinc-600 border-zinc-600/20", icon: Circle }
}

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const { className: statusClass, icon: Icon } = getStatusStyle(status)

  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap", statusClass, className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label ?? status}
    </span>
  )
}
