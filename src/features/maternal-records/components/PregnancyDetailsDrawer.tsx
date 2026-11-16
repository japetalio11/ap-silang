import type { ReactNode } from "react"
import { Activity, AlertTriangle, Baby, CalendarDays, CheckCircle2, ClipboardList, HeartPulse, Pencil, Scale, ShieldAlert, Trash2, UserRound, XCircle } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { DrawerHeading } from "@/components/ui/drawer-heading"
import { StatusBadge } from "@/components/ui/status-badge"
import type { MaternalPregnancy } from "../api"

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

function RiskTag({ active, label }: { active?: boolean; label: string }) {
  if (!active) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
      <AlertTriangle className="size-3" />
      {label}
    </span>
  )
}

function ConditionTag({ active, label }: { active?: boolean; label: string }) {
  if (!active) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
      <HeartPulse className="size-3" />
      {label}
    </span>
  )
}

export function PregnancyDetailsDrawer({
  open,
  onOpenChange,
  patientName,
  pregnancy,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  pregnancy: MaternalPregnancy | null
  onEdit?: () => void
  onDelete?: () => void
  readOnly?: boolean
}) {
  if (!pregnancy) return null

  const lmp = pregnancy.lmp_date ? new Date(pregnancy.lmp_date) : null
  const days = lmp && !Number.isNaN(lmp.getTime()) ? Math.max(0, Math.floor((Date.now() - lmp.getTime()) / 86_400_000)) : null
  const aog = days === null ? "Not calculated" : `${Math.floor(days / 7)} weeks ${days % 7} days`

  const hasRiskFactors = Boolean(
    pregnancy.prev_caesarean ||
    pregnancy.consecutive_miscarriages ||
    pregnancy.stillbirth_history ||
    pregnancy.pph_history ||
    pregnancy.previous_delivery_history
  )

  const hasConditions = Boolean(
    pregnancy.has_heart_disease ||
    pregnancy.has_diabetes ||
    pregnancy.has_tb ||
    pregnancy.has_asthma ||
    pregnancy.has_goiter ||
    pregnancy.co_morbidities
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton className="w-3/4 gap-0 overflow-y-auto border-sidebar-border bg-background p-0 text-foreground sm:max-w-md">
        <DrawerHeading
          icon={Baby}
          title={<>{patientName} <span className="font-normal text-muted-foreground">— Pregnancy Profile</span></>}
          description={`G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"} · ${pregnancy.pregnancy_status || "Active"}`}
          className="pr-14"
        />

        <div className="space-y-4 divide-y divide-border">
          <section className="px-5 pt-4" aria-labelledby="obstetric-timeline-heading">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="obstetric-timeline-heading" className="text-sm font-semibold">Obstetric timeline & status</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Key gestational milestones and baseline.</p>
              </div>
              <StatusBadge status={pregnancy.pregnancy_status || "Active"} />
            </div>

            <dl className="mt-3 grid min-w-0 grid-cols-1">
              <Detail label="Gravida & Parity" icon={Baby}>
                G{pregnancy.gravida ?? "—"} P{pregnancy.parity ?? "—"}
              </Detail>
              <Detail label="Last Menstrual Period (LMP)" icon={CalendarDays}>
                {formatDate(pregnancy.lmp_date)}
              </Detail>
              <Detail label="Expected Date of Delivery (EDD)" icon={CalendarDays}>
                {formatDate(pregnancy.edd_date)}
              </Detail>
              <Detail label="Age of Gestation (AOG)" icon={Activity}>
                {aog}
              </Detail>
              <Detail label="Age group" icon={UserRound}>
                {pregnancy.age_group || "Adult"}
              </Detail>
            </dl>
          </section>

          <section className="px-5 pt-4" aria-labelledby="anthropometrics-heading">
            <h3 id="anthropometrics-heading" className="text-sm font-semibold">Anthropometrics & nutrition</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Height, maternal BMI, and nutritional status.</p>

            <dl className="mt-3 grid min-w-0 grid-cols-1">
              <Detail label="Maternal height" icon={Scale}>
                {pregnancy.height_cm != null ? `${pregnancy.height_cm} cm` : "Not recorded"}
              </Detail>
              <Detail label="1st Trimester BMI" icon={Activity}>
                {pregnancy.bmi_1st_trimester != null ? `${pregnancy.bmi_1st_trimester} kg/m²` : "Not recorded"}
              </Detail>
              <Detail label="BMI Category" icon={HeartPulse}>
                {pregnancy.bmi_category || "Not categorized"}
              </Detail>
            </dl>
          </section>

          <section className="px-5 pt-4" aria-labelledby="risk-history-heading">
            <h3 id="risk-history-heading" className="text-sm font-semibold">Obstetric high-risk history</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Past obstetric complications and delivery history.</p>

            {hasRiskFactors ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <RiskTag active={pregnancy.prev_caesarean} label="Previous Cesarean Section" />
                  <RiskTag active={pregnancy.consecutive_miscarriages} label="3+ Consecutive Miscarriages" />
                  <RiskTag active={pregnancy.stillbirth_history} label="Stillbirth History" />
                  <RiskTag active={pregnancy.pph_history} label="Postpartum Hemorrhage History" />
                </div>
                {pregnancy.previous_delivery_history && (
                  <p className="text-xs text-muted-foreground pt-1">
                    <span className="font-medium text-foreground">Delivery history: </span>
                    {pregnancy.previous_delivery_history}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">No high-risk obstetric factors recorded.</p>
            )}
          </section>

          <section className="px-5 pt-4" aria-labelledby="conditions-heading">
            <h3 id="conditions-heading" className="text-sm font-semibold">Pre-existing & chronic conditions</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Maternal medical comorbidities.</p>

            {hasConditions ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <ConditionTag active={pregnancy.has_heart_disease} label="Heart Disease" />
                  <ConditionTag active={pregnancy.has_diabetes} label="Diabetes" />
                  <ConditionTag active={pregnancy.has_tb} label="Tuberculosis" />
                  <ConditionTag active={pregnancy.has_asthma} label="Bronchial Asthma" />
                  <ConditionTag active={pregnancy.has_goiter} label="Goiter / Thyroid" />
                </div>
                {pregnancy.co_morbidities && (
                  <p className="text-xs text-muted-foreground pt-1">
                    <span className="font-medium text-foreground">Other conditions: </span>
                    {pregnancy.co_morbidities}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">No chronic conditions recorded.</p>
            )}
          </section>

          <section className="px-5 pt-4 pb-4" aria-labelledby="safeguards-heading">
            <h3 id="safeguards-heading" className="text-sm font-semibold">Clinical safeguards & indicators</h3>
            <dl className="mt-3 grid min-w-0 grid-cols-1">
              <Detail label="Deworming dose" icon={ShieldAlert}>
                {pregnancy.deworming_given ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    Given{pregnancy.deworming_date ? ` (${formatDate(pregnancy.deworming_date)})` : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <XCircle className="size-3.5" />
                    Not administered
                  </span>
                )}
              </Detail>
              <Detail label="Completed 8 ANC visits" icon={ClipboardList}>
                {pregnancy.completed_8anc ? "Yes · Milestone reached" : "Pending"}
              </Detail>
              <Detail label="Consultations recorded" icon={Activity}>
                {pregnancy.prenatalVisits?.length ?? 0} visit{pregnancy.prenatalVisits?.length === 1 ? "" : "s"}
              </Detail>
              <Detail label="Deliveries recorded" icon={Baby}>
                {pregnancy.deliveryOutcomes?.length ?? 0} outcome{pregnancy.deliveryOutcomes?.length === 1 ? "" : "s"}
              </Detail>
            </dl>
          </section>
        </div>

        {!readOnly && (onEdit || onDelete) && (
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-sm">
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Delete Pregnancy
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
                Edit Pregnancy
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
