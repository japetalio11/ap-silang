import type { ReactNode } from "react"
import { Activity, Baby, CalendarClock, CalendarDays, ClipboardList, FileText, HeartPulse, ShieldCheck, UserRound, X, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent } from "@/components/ui/sheet"
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

function PrescriptionTable({ supplements }: { supplements: MaternalSupplement[] }) {
  return <div className="overflow-x-auto rounded-md border border-sidebar-border">
    <Table className="min-w-[720px] table-fixed text-xs">
      <TableHeader className="bg-muted/50 dark:bg-muted/30">
        <TableRow className="border-sidebar-border hover:bg-transparent">
          <TableHead className="w-10 pl-3"><Checkbox aria-label="Select prescription" className="border-sidebar-border" /></TableHead>
          <TableHead className="w-[36%] px-3">Medication</TableHead>
          <TableHead className="w-[18%] px-3">Dose</TableHead>
          <TableHead className="w-[18%] px-3">Frequency</TableHead>
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
}

export function AppointmentDetailsDialog({ open, onOpenChange, patientName, appointment, pregnancy, consultation, supplements }: { open: boolean; onOpenChange: (open: boolean) => void; patientName: string; appointment?: MaternalAppointment; pregnancy?: MaternalPregnancy; consultation?: NonNullable<MaternalPregnancy["prenatalVisits"]>[number]; supplements: MaternalSupplement[] }) {
  const appointmentDate = appointment?.appointment_date ? new Date(appointment.appointment_date) : null
  const appointmentDateLabel = appointmentDate && !Number.isNaN(appointmentDate.getTime()) ? `${appointmentDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}${appointment?.appointment_time ? ` at ${appointment.appointment_time}` : ""}` : "Date not recorded"
  const riskLabel = consultation?.risk_level_assessed ?? "Not assessed"
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" showCloseButton={false} overlayClassName="bg-transparent backdrop-blur-none supports-backdrop-filter:backdrop-blur-none" style={{ width: "min(92vw, 960px)", maxWidth: "960px" }} className="!w-[min(92vw,960px)] !max-w-[960px] gap-0 overflow-hidden border-sidebar-border bg-background p-0 text-foreground">
      <DrawerHeading
        icon={CalendarClock}
        title={<>{patientName} <span className="font-normal text-muted-foreground">— Appointment Details</span></>}
        description={`${appointment?.appointment_type ?? "Appointment"} · ${appointmentDateLabel}`}
        trailing={<>
          <StatusBadge status={appointment?.status ?? "Scheduled"} />
          <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Close appointment details" onClick={() => onOpenChange(false)} className="size-8 shrink-0 text-muted-foreground">
            <X className="size-4" />
          </Button></TooltipTrigger><TooltipContent>Close appointment details</TooltipContent></Tooltip></TooltipProvider>
        </>}
        className="px-5 sm:px-7"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-7">
        <div className="mx-auto w-full max-w-5xl">
          <section className="-mx-5 px-5 py-5 sm:-mx-7 sm:px-7" aria-labelledby="appointment-summary-heading">
            <h3 id="appointment-summary-heading" className="text-sm font-semibold text-foreground">Appointment information</h3>
            <p className="mt-1 text-xs text-muted-foreground">Scheduling and care assignment details.</p>
            <dl className="mt-3 grid grid-cols-1 gap-x-8 divide-y divide-border/70 sm:grid-cols-2 sm:divide-y-0">
              <DetailRow label="Appointment type" icon={CalendarDays}>{appointment?.appointment_type ?? "—"}</DetailRow>
              <DetailRow label="Date & time" icon={CalendarClock}>{appointmentDateLabel}</DetailRow>
              <DetailRow label="Purpose" icon={ClipboardList}>{appointment?.reason || "No purpose was added."}</DetailRow>
              <DetailRow label="Pregnancy" icon={Baby}>{pregnancy ? `G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"} · LMP ${pregnancy.lmp_date ? new Date(pregnancy.lmp_date).toLocaleDateString() : "—"}` : "No pregnancy linked"}</DetailRow>
            </dl>
          </section>

          <section className="-mx-5 border-t border-border px-5 py-5 sm:-mx-7 sm:px-7" aria-labelledby="appointment-consultation-heading">
            <h3 id="appointment-consultation-heading" className="text-sm font-semibold text-foreground">Consultation</h3>
            <p className="mt-1 text-xs text-muted-foreground">Clinical observations recorded for this visit.</p>
            <dl className="mt-3 grid grid-cols-1 gap-x-8 divide-y divide-border/70 sm:grid-cols-2 sm:divide-y-0">
              <DetailRow label="Visit & date" icon={CalendarDays}>{consultation ? `Visit ${consultation.visit_number ?? "—"} · ${consultation.visit_date ? new Date(consultation.visit_date).toLocaleDateString() : "Date not recorded"}` : "No consultation recorded for this appointment."}</DetailRow>
              <DetailRow label="Age of gestation" icon={Baby}>{consultation ? `${consultation.age_of_gestation_weeks ?? "—"} weeks · ${consultation.trimester ?? "—"}${consultation.trimester === 1 ? "st" : consultation.trimester === 2 ? "nd" : "rd"} trimester` : "—"}</DetailRow>
              <DetailRow label="Vital signs" icon={HeartPulse}>{consultation ? `${consultation.bp_systolic ?? "—"}/${consultation.bp_diastolic ?? "—"} mmHg · ${consultation.pulse_rate_bpm ?? "—"} bpm · ${consultation.temperature_celsius ?? "—"}°C` : "—"}</DetailRow>
              <DetailRow label="Fetal metrics" icon={Activity}>{consultation ? `FHR ${consultation.fetal_heart_tone_bpm ?? "—"} bpm · Fundal height ${consultation.fundic_height_cm ?? "—"} cm · ${consultation.fetal_presentation ?? ""}` : "—"}</DetailRow>
              <DetailRow label="Risk assessment" icon={ShieldCheck}><span className="flex flex-wrap items-center gap-2"><StatusBadge status={riskLabel} />{consultation && <span className="text-muted-foreground">TEWS {consultation.tews_score ?? "—"}</span>}</span></DetailRow>
              <DetailRow label="Attending provider" icon={UserRound}>{consultation?.healthWorker ? `${consultation.healthWorker.first_name ?? ""} ${consultation.healthWorker.last_name ?? ""}`.trim() : "—"}</DetailRow>
              <DetailRow label="Clinical notes" icon={FileText} className="sm:col-span-2">{consultation?.chief_complaint || consultation?.danger_signs_observed || "No clinical notes recorded."}</DetailRow>
            </dl>
          </section>

          <section className="-mx-5 space-y-3 border-t border-border px-5 py-5 sm:-mx-7 sm:px-7" aria-labelledby="appointment-prescriptions-heading">
            <div className="flex items-center gap-2">
              <h3 id="appointment-prescriptions-heading" className="text-sm font-semibold text-foreground">Prescriptions</h3>
              <span className="text-xs text-muted-foreground">{supplements.length} records</span>
            </div>
            <p className="text-xs text-muted-foreground">Medications associated with this appointment.</p>
            <PrescriptionTable supplements={supplements} />
          </section>
        </div>
      </div>
    </SheetContent>
  </Sheet>
}
