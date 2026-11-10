import type { ReactNode } from "react"
import { Activity, AlertTriangle, Baby, CalendarDays, ClipboardList, FileText, HeartPulse, Scale, ShieldAlert, ShieldCheck, Thermometer, UserRound, X, type LucideIcon } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DrawerHeading } from "@/components/ui/drawer-heading"
import { toast } from "sonner"
import type { MaternalPregnancy, MaternalPrenatalVisit } from "../api"

function formatDate(value?: string | null) {
  if (!value) return "Date not recorded"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "Date not recorded" : format(parsed, "MMMM d, yyyy")
}

function DetailRow({ label, icon: Icon, children, className }: { label: string; icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <div className={`grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-3 py-2 text-xs ${className ?? ""}`}>
      <dt className="flex min-w-0 items-start gap-2 text-muted-foreground">
        <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </dt>
      <dd className="min-w-0 break-words font-medium leading-relaxed text-foreground">{children}</dd>
    </div>
  )
}

function classifyBloodPressure(systolic?: number | null, diastolic?: number | null) {
  if (systolic == null || diastolic == null) return { label: "Not recorded", className: "text-muted-foreground" }
  if (systolic >= 180 || diastolic >= 120) return { label: "Hypertensive Crisis", className: "text-rose-700 dark:text-rose-300 font-bold" }
  if (systolic >= 140 || diastolic >= 90) return { label: "Stage 2 Hypertension", className: "text-rose-600 dark:text-rose-400 font-semibold" }
  if (systolic >= 130 || diastolic >= 80) return { label: "Stage 1 Hypertension", className: "text-orange-600 dark:text-orange-400 font-medium" }
  if (systolic >= 120 && diastolic < 80) return { label: "Elevated BP", className: "text-amber-600 dark:text-amber-400 font-medium" }
  return { label: "Normal BP", className: "text-emerald-600 dark:text-emerald-400 font-medium" }
}

export function VitalDetailsDrawer({
  open,
  onOpenChange,
  patientName,
  visit,
  pregnancy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  visit: MaternalPrenatalVisit | null
  pregnancy?: MaternalPregnancy
}) {
  if (!visit) return null

  const bpStatus = classifyBloodPressure(visit.bp_systolic, visit.bp_diastolic)
  const dangerFlags = [
    visit.has_vaginal_bleeding && "Vaginal Bleeding",
    visit.has_fever && "Maternal Fever",
    visit.has_edema && "Edema",
    visit.has_pallor && "Severe Pallor",
  ].filter(Boolean) as string[]

  const hasDangerSigns = dangerFlags.length > 0 || Boolean(visit.danger_signs_observed?.trim())
  const providerName = visit.healthWorker ? `${visit.healthWorker.first_name ?? ""} ${visit.healthWorker.last_name ?? ""}`.trim() : ""

  const handleCopySummary = () => {
    const lines = [
      `Patient: ${patientName}`,
      `Visit #${visit.visit_number ?? "—"} (${formatDate(visit.visit_date)})`,
      `AOG: ${visit.age_of_gestation_weeks ?? "—"} weeks (Trimester ${visit.trimester ?? "—"})`,
      `Blood Pressure: ${visit.bp_systolic ?? "—"}/${visit.bp_diastolic ?? "—"} mmHg (${bpStatus.label})`,
      `Pulse Rate: ${visit.pulse_rate_bpm ?? "—"} bpm`,
      `Temperature: ${visit.temperature_celsius ?? "—"} °C`,
      `Weight: ${visit.weight_kg ?? "—"} kg`,
      `Fundic Height: ${visit.fundic_height_cm ?? "—"} cm`,
      `Fetal Heart Tone: ${visit.fetal_heart_tone_bpm ?? "—"} bpm (${visit.fetal_presentation || "Not specified"})`,
      `Risk Level: ${visit.risk_level_assessed || "Low Risk"}`,
      `Danger Signs: ${hasDangerSigns ? dangerFlags.concat(visit.danger_signs_observed ? [visit.danger_signs_observed] : []).join(", ") : "None"}`,
      `Chief Complaint / Notes: ${visit.chief_complaint || "None"}`,
    ]
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(lines.join("\n"))
      toast.success("Vitals log copied to clipboard")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName="bg-transparent backdrop-blur-none supports-backdrop-filter:backdrop-blur-none"
        style={{ width: "min(92vw, 960px)", maxWidth: "960px" }}
        className="!w-[min(92vw,960px)] !max-w-[960px] gap-0 overflow-hidden border-sidebar-border bg-background p-0 text-foreground"
      >
        <DrawerHeading
          icon={HeartPulse}
          title={
            <>
              {patientName} <span className="font-normal text-muted-foreground">— Vital Log Details</span>
            </>
          }
          description={`Visit #${visit.visit_number ?? "—"} · ${formatDate(visit.visit_date)} · ${visit.age_of_gestation_weeks ? `${visit.age_of_gestation_weeks}w AOG` : "Gestation not set"}`}
          trailing={
            <>
              <StatusBadge status={visit.risk_level_assessed || "Low Risk"} />
              <TooltipProvider delayDuration={500}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close vital details"
                      onClick={() => onOpenChange(false)}
                      className="size-8 shrink-0 text-muted-foreground"
                    >
                      <X className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Close vital details</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          }
          className="px-5 sm:px-7"
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-7">
          <div className="mx-auto w-full max-w-5xl">
            <section className="-mx-5 px-5 py-5 sm:-mx-7 sm:px-7" aria-labelledby="vitals-measurements-heading">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 id="vitals-measurements-heading" className="text-sm font-semibold text-foreground">
                    Physiological measurements
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">Maternal and fetal vital signs recorded at this consultation.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopySummary} className="h-8 gap-1.5 text-xs">
                  <ClipboardList className="size-3.5" />
                  Copy Log
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-sidebar-border bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Activity className="size-3.5" />
                    <span>Blood Pressure</span>
                  </div>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    {visit.bp_systolic != null && visit.bp_diastolic != null ? `${visit.bp_systolic}/${visit.bp_diastolic}` : "—"}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">mmHg</span>
                  </div>
                  <span className={`mt-0.5 inline-block text-[10px] ${bpStatus.className}`}>{bpStatus.label}</span>
                </div>

                <div className="rounded-md border border-sidebar-border bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <HeartPulse className="size-3.5" />
                    <span>Pulse Rate</span>
                  </div>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    {visit.pulse_rate_bpm != null ? visit.pulse_rate_bpm : "—"}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">bpm</span>
                  </div>
                  <span className="mt-0.5 inline-block text-[10px] text-muted-foreground">
                    {visit.pulse_rate_bpm != null ? (visit.pulse_rate_bpm > 100 ? "Elevated pulse" : visit.pulse_rate_bpm < 60 ? "Low pulse" : "Normal resting pulse") : "Not recorded"}
                  </span>
                </div>

                <div className="rounded-md border border-sidebar-border bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Thermometer className="size-3.5" />
                    <span>Temperature</span>
                  </div>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    {visit.temperature_celsius != null ? visit.temperature_celsius : "—"}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">°C</span>
                  </div>
                  <span className="mt-0.5 inline-block text-[10px] text-muted-foreground">
                    {visit.temperature_celsius != null ? (Number(visit.temperature_celsius) >= 38 ? "Febrile / fever" : "Afebrile") : "Not recorded"}
                  </span>
                </div>

                <div className="rounded-md border border-sidebar-border bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Scale className="size-3.5" />
                    <span>Weight</span>
                  </div>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    {visit.weight_kg != null ? visit.weight_kg : "—"}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">kg</span>
                  </div>
                  <span className="mt-0.5 inline-block text-[10px] text-muted-foreground">Maternal body weight</span>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-x-8 divide-y divide-border/70 sm:grid-cols-2 sm:divide-y-0">
                <DetailRow label="Fundic height" icon={Activity}>
                  {visit.fundic_height_cm != null ? `${visit.fundic_height_cm} cm` : "Not measured"}
                </DetailRow>
                <DetailRow label="Fetal heart tone" icon={HeartPulse}>
                  {visit.fetal_heart_tone_bpm != null ? `${visit.fetal_heart_tone_bpm} bpm` : "Not recorded"}
                </DetailRow>
                <DetailRow label="Fetal presentation" icon={Baby}>
                  {visit.fetal_presentation || "Not assessed"}
                </DetailRow>
                <DetailRow label="Age of gestation" icon={CalendarDays}>
                  {visit.age_of_gestation_weeks != null ? `${visit.age_of_gestation_weeks} weeks` : "Not recorded"}
                </DetailRow>
              </dl>
            </section>

            <section className="-mx-5 border-t border-border px-5 py-5 sm:-mx-7 sm:px-7" aria-labelledby="clinical-evaluation-heading">
              <h3 id="clinical-evaluation-heading" className="text-sm font-semibold text-foreground">
                Clinical evaluation &amp; danger signs
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Risk stratification and observed danger signs.</p>

              {hasDangerSigns ? (
                <div className="mt-3 flex items-start gap-2.5 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-rose-950 dark:text-rose-100">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-semibold">Danger Signs Reported</div>
                    <div className="mt-0.5 leading-relaxed">
                      {dangerFlags.length > 0 && <span className="font-medium">{dangerFlags.join(", ")}. </span>}
                      {visit.danger_signs_observed}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-950 dark:text-emerald-100">
                  <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>No maternal danger signs observed during this encounter.</span>
                </div>
              )}

              <dl className="mt-4 grid grid-cols-1 gap-x-8 divide-y divide-border/70 sm:grid-cols-2 sm:divide-y-0">
                <DetailRow label="Risk stratification" icon={ShieldAlert}>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={visit.risk_level_assessed || "Low Risk"} />
                    {visit.tews_score != null && <span className="text-muted-foreground">TEWS Score {visit.tews_score}</span>}
                  </div>
                </DetailRow>
                <DetailRow label="Trimester" icon={CalendarDays}>
                  {visit.trimester != null ? `${visit.trimester}${visit.trimester === 1 ? "st" : visit.trimester === 2 ? "nd" : "rd"} Trimester` : "—"}
                </DetailRow>
                <DetailRow label="Vaginal bleeding" icon={AlertTriangle}>
                  <span className={visit.has_vaginal_bleeding ? "text-rose-600 font-semibold" : "text-muted-foreground"}>
                    {visit.has_vaginal_bleeding ? "Observed" : "None"}
                  </span>
                </DetailRow>
                <DetailRow label="Maternal fever" icon={AlertTriangle}>
                  <span className={visit.has_fever ? "text-rose-600 font-semibold" : "text-muted-foreground"}>
                    {visit.has_fever ? "Observed" : "None"}
                  </span>
                </DetailRow>
                <DetailRow label="Edema" icon={AlertTriangle}>
                  <span className={visit.has_edema ? "text-rose-600 font-semibold" : "text-muted-foreground"}>
                    {visit.has_edema ? "Observed" : "None"}
                  </span>
                </DetailRow>
                <DetailRow label="Severe pallor" icon={AlertTriangle}>
                  <span className={visit.has_pallor ? "text-rose-600 font-semibold" : "text-muted-foreground"}>
                    {visit.has_pallor ? "Observed" : "None"}
                  </span>
                </DetailRow>
                <DetailRow label="Chief complaint / notes" icon={FileText} className="sm:col-span-2">
                  {visit.chief_complaint || "No chief complaint recorded."}
                </DetailRow>
              </dl>
            </section>

            <section className="-mx-5 border-t border-border px-5 py-5 sm:-mx-7 sm:px-7" aria-labelledby="vitals-context-heading">
              <h3 id="vitals-context-heading" className="text-sm font-semibold text-foreground">
                Care &amp; pregnancy context
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Attending provider and linked obstetric episode.</p>

              <dl className="mt-3 grid grid-cols-1 gap-x-8 divide-y divide-border/70 sm:grid-cols-2 sm:divide-y-0">
                <DetailRow label="Attending health worker" icon={UserRound}>
                  {providerName ? (
                    <div>
                      <span>{providerName}</span>
                      {visit.healthWorker?.role && <span className="ml-1 text-muted-foreground">({visit.healthWorker.role})</span>}
                    </div>
                  ) : (
                    "Healthcare staff not recorded"
                  )}
                </DetailRow>
                <DetailRow label="Encounter date" icon={CalendarDays}>
                  {formatDate(visit.visit_date)}
                </DetailRow>
                <DetailRow label="Linked pregnancy" icon={Baby} className="sm:col-span-2">
                  {pregnancy ? (
                    `Gravida ${pregnancy.gravida ?? "—"}, Para ${pregnancy.parity ?? "—"} · LMP ${formatDate(pregnancy.lmp_date)} · EDD ${formatDate(pregnancy.edd_date)}`
                  ) : (
                    "No specific pregnancy linked"
                  )}
                </DetailRow>
              </dl>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
