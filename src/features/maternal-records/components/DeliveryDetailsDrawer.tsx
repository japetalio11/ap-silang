import type { ReactNode } from "react"
import { Activity, Baby, CalendarDays, ClipboardList, Clock3, HeartPulse, MapPin, UserRound } from "lucide-react"
import { format } from "date-fns"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { DrawerHeading } from "@/components/ui/drawer-heading"
import { StatusBadge } from "@/components/ui/status-badge"
import type { MaternalDelivery, MaternalPregnancy } from "../api"

function formatDate(value?: string | null) {
  if (!value) return "Not recorded"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "Not recorded" : format(parsed, "MMMM d, yyyy")
}

function Detail({ label, icon: Icon, children }: { label: string; icon: typeof CalendarDays; children: ReactNode }) {
  return <div className="grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-3 py-2 text-xs">
    <dt className="flex min-w-0 items-start gap-2 text-muted-foreground"><Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{label}</span></dt>
    <dd className="min-w-0 break-words font-medium leading-relaxed text-foreground">{children}</dd>
  </div>
}

export function DeliveryDetailsDrawer({ open, onOpenChange, patientName, delivery, pregnancy }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  delivery: MaternalDelivery | null
  pregnancy?: MaternalPregnancy
}) {
  if (!delivery) return null
  const newborns = delivery.newbornRecords ?? []
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" showCloseButton className="w-3/4 gap-0 overflow-y-auto border-sidebar-border bg-background p-0 text-foreground sm:max-w-sm">
      <DrawerHeading
        icon={ClipboardList}
        title={<>{patientName} <span className="font-normal text-muted-foreground">— Delivery Details</span></>}
        description={`${formatDate(delivery.delivery_date)} · ${delivery.mode_of_delivery || "Delivery mode not recorded"}`}
        className="pr-14"
      />

      <section className="px-5 py-4" aria-labelledby="delivery-information-heading">
        <h3 id="delivery-information-heading" className="text-sm font-semibold">Delivery information</h3>
        <p className="mt-1 text-xs text-muted-foreground">Maternal outcome and birth details.</p>
        <dl className="mt-3 grid min-w-0 grid-cols-1">
          <Detail label="Date of delivery" icon={CalendarDays}>{formatDate(delivery.delivery_date)}</Detail>
          <Detail label="Mode of delivery" icon={Activity}>{delivery.mode_of_delivery || "Not recorded"}</Detail>
          <Detail label="Place / facility" icon={MapPin}>{delivery.place_of_delivery || "Not recorded"}</Detail>
          <Detail label="Birth attendant" icon={UserRound}>{delivery.birth_attendant || "Not recorded"}</Detail>
          <Detail label="Maternal outcome" icon={HeartPulse}><StatusBadge status={delivery.maternal_outcome || "Alive"} /></Detail>
          <Detail label="Pregnancy" icon={Baby}>{pregnancy ? `G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"} · LMP ${formatDate(pregnancy.lmp_date)}` : "Not linked"}</Detail>
          <Detail label="Labor duration" icon={Clock3}>{delivery.duration_of_labor_hours != null ? `${delivery.duration_of_labor_hours} hours` : "Not recorded"}</Detail>
          <Detail label="Blood loss" icon={Activity}>{delivery.blood_loss_ml != null ? `${delivery.blood_loss_ml} mL` : "Not recorded"}</Detail>
          <Detail label="Immediate breastfeeding" icon={HeartPulse}>{delivery.immediate_breastfeeding ? "Initiated" : "Not recorded"}</Detail>
          <Detail label="Complications / notes" icon={ClipboardList}>{delivery.delivery_complications || "None recorded"}</Detail>
        </dl>
      </section>

      <section className="border-t border-border px-5 py-4" aria-labelledby="newborn-information-heading">
        <div className="flex items-center justify-between gap-3">
          <div><h3 id="newborn-information-heading" className="text-sm font-semibold">Newborn records</h3><p className="mt-1 text-xs text-muted-foreground">{newborns.length} newborn{newborns.length === 1 ? "" : "s"} recorded for this delivery.</p></div>
          <Baby className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
        {newborns.length ? <div className="mt-3 space-y-3">{newborns.map((newborn, index) => <div key={newborn.newborn_id ?? index} className="border-t border-border/70 pt-3 first:border-0 first:pt-0">
          <h4 className="text-xs font-medium">Newborn {index + 1}</h4>
          <dl className="mt-1 grid grid-cols-1">
            <Detail label="Sex" icon={UserRound}>{newborn.sex || "Not recorded"}</Detail>
            <Detail label="Birth weight" icon={Activity}>{newborn.birth_weight_kg != null ? `${newborn.birth_weight_kg} kg` : "Not recorded"}</Detail>
            <Detail label="Status at birth" icon={HeartPulse}>{newborn.status_at_birth || "Not recorded"}</Detail>
            <Detail label="APGAR score" icon={ClipboardList}>{newborn.apgar_score ?? "Not recorded"}</Detail>
          </dl>
        </div>)}</div> : <p className="mt-3 text-xs text-muted-foreground">No newborn record is linked to this delivery.</p>}
      </section>
    </SheetContent>
  </Sheet>
}
