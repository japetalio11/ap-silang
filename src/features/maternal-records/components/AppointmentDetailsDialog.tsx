import type { ReactNode } from "react"
import { Activity, Baby, CalendarClock, CalendarDays, ClipboardList, FileText, HeartPulse, Scale, ShieldCheck, Thermometer, UserRound, X, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DrawerHeading } from "@/components/ui/drawer-heading"
import type { MaternalAppointment, MaternalPregnancy, MaternalSupplement } from "../api"

function DetailRow({ label, icon: Icon, children, className }: { label: string; icon: LucideIcon; children: ReactNode; className?: string }) {
  return <div className={`grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-3 py-2 text-xs ${className ?? ""}`}>
    <dt className="flex min-w-0 items-start gap-2 text-muted-foreground"><Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{label}</span></dt>
    <dd className="min-w-0 break-words font-medium leading-relaxed text-foreground">{children}</dd>
  </div>
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return <div>
    <h3 id={id} className="text-sm font-semibold text-foreground">{title}</h3>
    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
  </div>
}

function PrescriptionTable({ supplements }: { supplements: MaternalSupplement[] }) {
  return <><div className="hidden overflow-x-auto rounded-md border border-sidebar-border md:block">
    <Table className="w-full table-fixed text-xs">
      <TableHeader className="bg-muted/50 dark:bg-muted/30">
        <TableRow className="border-sidebar-border hover:bg-transparent">
          <TableHead className="w-10 pl-3"><Checkbox aria-label="Select prescription" className="border-sidebar-border" /></TableHead>
          <TableHead className="w-[36%] px-3">Medication</TableHead>
          <TableHead className="w-[18%] px-3">Tablets given</TableHead>
          <TableHead className="w-[18%] px-3">Date given</TableHead>
          <TableHead className="w-[18%] px-3">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {supplements.map((supplement) => <TableRow key={supplement.supplement_id} className="border-sidebar-border">
          <TableCell className="pl-3"><Checkbox aria-label={`Select ${supplement.supplement_type ?? "supplement"}`} className="border-sidebar-border" /></TableCell>
          <TableCell className="px-3">{supplement.supplement_type ?? "Supplement"}</TableCell>
          <TableCell className="px-3">{supplement.tablets_given_count ?? "—"}</TableCell>
          <TableCell className="px-3">{supplement.date_given ? new Date(supplement.date_given).toLocaleDateString() : "—"}</TableCell>
          <TableCell className="px-3"><StatusBadge status={supplement.is_completed ? "Completed" : "Active"} /></TableCell>
        </TableRow>)}
        {supplements.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No prescriptions or supplements are linked to this appointment.</TableCell></TableRow>}
      </TableBody>
    </Table>
  </div>
  <div className="space-y-2 md:hidden">
    {supplements.map((supplement) => <div key={supplement.supplement_id} className="rounded-md border border-sidebar-border p-3 text-xs">
      <div className="flex items-center gap-3"><Checkbox aria-label={`Select ${supplement.supplement_type ?? "supplement"}`} className="border-sidebar-border" /><span className="min-w-0 flex-1 font-medium">{supplement.supplement_type ?? "Supplement"}</span><StatusBadge status={supplement.is_completed ? "Completed" : "Active"} /></div>
      <div className="mt-2 flex justify-between gap-3 text-muted-foreground"><span>Tablets: {supplement.tablets_given_count ?? "—"}</span><span>{supplement.date_given ? new Date(supplement.date_given).toLocaleDateString() : "—"}</span></div>
    </div>)}
    {supplements.length === 0 && <p className="rounded-md border border-sidebar-border p-6 text-center text-xs text-muted-foreground">No prescriptions or supplements are linked to this appointment.</p>}
  </div></>
}

export function AppointmentDetailsDialog({ open, onOpenChange, patientName, appointment, pregnancy, consultation, supplements }: { open: boolean; onOpenChange: (open: boolean) => void; patientName: string; appointment?: MaternalAppointment; pregnancy?: MaternalPregnancy; consultation?: NonNullable<MaternalPregnancy["prenatalVisits"]>[number]; supplements: MaternalSupplement[] }) {
  const appointmentDate = appointment?.appointment_date ? new Date(appointment.appointment_date) : null
  const appointmentDateLabel = appointmentDate && !Number.isNaN(appointmentDate.getTime()) ? `${appointmentDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}${appointment?.appointment_time ? ` at ${appointment.appointment_time}` : ""}` : "Date not recorded"
  const visitDateLabel = consultation?.visit_date ? new Date(consultation.visit_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Date not recorded"
  const riskLabel = consultation?.risk_level_assessed ?? "Not assessed"
  const dangerSigns = [
    consultation?.has_vaginal_bleeding && "Vaginal bleeding",
    consultation?.has_fever && "Maternal fever",
    consultation?.has_edema && "Edema",
    consultation?.has_pallor && "Severe pallor",
    consultation?.danger_signs_observed,
  ].filter(Boolean)
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" showCloseButton={false} overlayClassName="bg-transparent backdrop-blur-none supports-backdrop-filter:backdrop-blur-none" style={{ width: "min(92vw, 800px)", maxWidth: "800px" }} className="!w-[min(92vw,800px)] !max-w-[800px] gap-0 overflow-hidden border-sidebar-border bg-background p-0 text-foreground">
      <DrawerHeading
        icon={CalendarClock}
        title={<>{patientName} <span className="font-normal text-muted-foreground">— {appointment ? "Appointment Details" : "Consultation Details"}</span></>}
        description={appointment ? `${appointment.appointment_type ?? "Appointment"} · ${appointmentDateLabel}` : `Visit #${consultation?.visit_number ?? "—"} · ${visitDateLabel}`}
        trailing={<>
          <StatusBadge status={appointment?.status ?? (consultation ? "Completed" : "Scheduled")} />
          <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Close appointment details" onClick={() => onOpenChange(false)} className="size-8 shrink-0 text-muted-foreground">
            <X className="size-4" />
          </Button></TooltipTrigger><TooltipContent>Close appointment details</TooltipContent></Tooltip></TooltipProvider>
        </>}
        className="px-4 sm:px-5"
      />

      <Tabs defaultValue="details" className="min-h-0 flex-1 px-4 sm:px-5">
        <TabsList className="mt-4 h-9 w-max justify-start gap-1">
          <TabsTrigger value="details" className="h-full px-3 text-xs">Details</TabsTrigger>
          <TabsTrigger value="prescriptions" className="h-full px-3 text-xs">Prescriptions ({supplements.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-3 min-h-0 flex-1 overflow-y-auto">
        <div className="w-full space-y-6 py-5">
          <section aria-labelledby="appointment-summary-heading">
            <SectionHeading id="appointment-summary-heading" title={appointment ? "Appointment information" : "Visit information"} description={appointment ? "Scheduling and care assignment details." : "Consultation and care details."} />
            <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <DetailRow label={appointment ? "Appointment type" : "Visit number"} icon={CalendarDays}>{appointment?.appointment_type ?? `Visit #${consultation?.visit_number ?? "—"}`}</DetailRow>
              <DetailRow label={appointment ? "Date & time" : "Visit date"} icon={CalendarClock}>{appointment ? appointmentDateLabel : visitDateLabel}</DetailRow>
              <DetailRow label="Purpose" icon={ClipboardList}>{appointment?.reason || consultation?.chief_complaint || "No purpose was added."}</DetailRow>
              <DetailRow label="Pregnancy" icon={Baby}>{pregnancy ? `G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"} · LMP ${pregnancy.lmp_date ? new Date(pregnancy.lmp_date).toLocaleDateString() : "—"}` : "No pregnancy linked"}</DetailRow>
            </dl>
          </section>

          <section aria-labelledby="appointment-consultation-heading">
            <SectionHeading id="appointment-consultation-heading" title="Consultation" description="Clinical observations recorded for this visit." />
            {consultation ? <>
              <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {[
                  { label: "Blood pressure", value: `${consultation.bp_systolic ?? "—"}/${consultation.bp_diastolic ?? "—"} mmHg`, icon: Activity },
                  { label: "Pulse rate", value: consultation.pulse_rate_bpm != null ? `${consultation.pulse_rate_bpm} bpm` : "—", icon: HeartPulse },
                  { label: "Temperature", value: consultation.temperature_celsius != null ? `${consultation.temperature_celsius} °C` : "—", icon: Thermometer },
                  { label: "Weight", value: consultation.weight_kg != null ? `${consultation.weight_kg} kg` : "—", icon: Scale },
                  { label: "Fundal height", value: consultation.fundic_height_cm != null ? `${consultation.fundic_height_cm} cm` : "—", icon: Activity },
                  { label: "Fetal heart tone", value: consultation.fetal_heart_tone_bpm != null ? `${consultation.fetal_heart_tone_bpm} bpm` : "—", icon: HeartPulse },
                  { label: "Presentation", value: consultation.fetal_presentation || "—", icon: Baby },
                  { label: "Age of gestation", value: `${consultation.age_of_gestation_weeks ?? "—"} weeks · ${consultation.trimester ?? "—"}${consultation.trimester === 1 ? "st" : consultation.trimester === 2 ? "nd" : "rd"} trimester`, icon: CalendarDays },
                ].map(({ label, value, icon }) => <DetailRow key={label} label={label} icon={icon}>{value}</DetailRow>)}
              </dl>
              <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <DetailRow label="Risk assessment" icon={ShieldCheck}><span className="flex flex-wrap items-center gap-2"><StatusBadge status={riskLabel} /><span className="text-muted-foreground">TEWS {consultation.tews_score ?? "—"}</span></span></DetailRow>
                <DetailRow label="Attending provider" icon={UserRound}>{consultation.healthWorker ? `${consultation.healthWorker.first_name ?? ""} ${consultation.healthWorker.last_name ?? ""}`.trim() : "—"}</DetailRow>
                <div className="min-w-0 py-2 text-xs sm:col-span-2">
                  <dt className="flex items-center gap-2 text-muted-foreground"><HeartPulse className="size-3.5 shrink-0" aria-hidden="true" /><span>Clinical danger signs</span></dt>
                  <dd className="mt-1 pl-[22px] font-medium leading-relaxed text-foreground">{dangerSigns.length ? dangerSigns.join(", ") : "None reported"}</dd>
                </div>
                <div className="min-w-0 py-2 text-xs sm:col-span-2">
                  <dt className="flex items-center gap-2 text-muted-foreground"><FileText className="size-3.5 shrink-0" aria-hidden="true" /><span>Clinical notes</span></dt>
                  <dd className="mt-1 pl-[22px] font-medium leading-relaxed text-foreground">{consultation.chief_complaint || "No clinical notes recorded."}</dd>
                </div>
              </dl>
            </> : <p className="mt-3 rounded-md bg-muted/35 p-3 text-xs text-muted-foreground">No consultation has been logged for this appointment.</p>}
          </section>
        </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <section className="w-full py-5" aria-labelledby="appointment-prescriptions-heading">
            <SectionHeading id="appointment-prescriptions-heading" title="Prescriptions" description="Medications associated with this appointment." />
            <div className="mt-3">
              <PrescriptionTable supplements={supplements} />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </SheetContent>
  </Sheet>
}
