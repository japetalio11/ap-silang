import type { ReactNode } from "react"
import { Baby, CalendarDays, ClipboardList, FileText, HeartPulse, Pencil, Pill, Trash2, UserRound } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { DrawerHeading } from "@/components/ui/drawer-heading"
import { StatusBadge } from "@/components/ui/status-badge"
import type { MaternalPregnancy, MaternalSupplement } from "../api"

function formatDate(value?: string | null) {
  if (!value) return "Not recorded"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "Not recorded" : format(parsed, "MMMM d, yyyy")
}

function Detail({ label, icon: Icon, children }: { label: string; icon: typeof CalendarDays; children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-3 py-2 text-xs">
      <dt className="flex min-w-0 items-start gap-2 text-muted-foreground">
        <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </dt>
      <dd className="min-w-0 break-words font-medium leading-relaxed text-foreground">{children}</dd>
    </div>
  )
}

export function PrescriptionDetailsDrawer({
  open,
  onOpenChange,
  patientName,
  prescription,
  pregnancy,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  prescription: MaternalSupplement | null
  pregnancy?: MaternalPregnancy
  onEdit?: () => void
  onDelete?: () => void
  readOnly?: boolean
}) {
  if (!prescription) return null

  const formattedDate = formatDate(prescription.date_given)
  const healthWorkerName = prescription.healthWorker
    ? `${prescription.healthWorker.first_name ?? ""} ${prescription.healthWorker.last_name ?? ""}`.trim()
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton className="w-3/4 gap-0 overflow-y-auto border-sidebar-border bg-background p-0 text-foreground sm:max-w-md">
        <DrawerHeading
          icon={FileText}
          title={<>{patientName} <span className="font-normal text-muted-foreground">— Prescription Details</span></>}
          description={`${prescription.supplement_type || "Medication / Supplement"} · ${formattedDate}`}
          className="pr-14"
        />

        <section className="px-5 py-4" aria-labelledby="prescription-information-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="prescription-information-heading" className="text-sm font-semibold">Prescription information</h3>
              <p className="mt-1 text-xs text-muted-foreground">Dispensing details and administration history.</p>
            </div>
            <StatusBadge status={prescription.is_completed ? "Completed" : "Active"} />
          </div>

          <dl className="mt-4 grid min-w-0 grid-cols-1">
            <Detail label="Medication / Supplement" icon={Pill}>
              {prescription.supplement_type || "Supplement"}
            </Detail>
            <Detail label="Tablets / Count given" icon={ClipboardList}>
              {prescription.tablets_given_count != null ? `${prescription.tablets_given_count} tablets` : "Not recorded"}
            </Detail>
            <Detail label="Date dispensed" icon={CalendarDays}>
              {formattedDate}
            </Detail>
            <Detail label="Treatment status" icon={HeartPulse}>
              <StatusBadge status={prescription.is_completed ? "Completed" : "Active"} />
            </Detail>
            <Detail label="Associated pregnancy" icon={Baby}>
              {pregnancy ? `G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"} · LMP ${formatDate(pregnancy.lmp_date)}` : "Current Active Pregnancy"}
            </Detail>
            {healthWorkerName && (
              <Detail label="Dispensing provider" icon={UserRound}>
                {healthWorkerName}{prescription.healthWorker?.role ? ` (${prescription.healthWorker.role})` : ""}
              </Detail>
            )}
          </dl>
        </section>

        {!readOnly && (onEdit || onDelete) && (
          <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-2 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-sm">
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Delete Prescription
              </Button>
            )}
            {onEdit && (
              <Button
                type="button"
                size="sm"
                onClick={onEdit}
                className="h-8 gap-1.5 text-xs"
              >
                <Pencil className="size-3.5" />
                Edit Prescription
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
