import { useState, type ReactNode } from "react"
import { Activity, Baby, Ban, CalendarClock, CalendarDays, ClipboardList, Download, FileText, HeartPulse, Pencil, Plus, RefreshCw, Scale, Search, ShieldCheck, Thermometer, Trash2, UserRound, X, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DrawerHeading } from "@/components/ui/drawer-heading"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import type { MaternalAppointment, MaternalPregnancy, MaternalSupplement } from "../api"
import { evaluateLocalVisitRisk } from "@/lib/cdss/cdssEngine"

function DetailRow({ label, icon: Icon, children, className }: { label: string; icon: LucideIcon; children: ReactNode; className?: string }) {
  return <div className={`grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-2 py-1.5 text-xs ${className ?? ""}`}>
    <dt className="flex min-w-0 items-start gap-2 text-muted-foreground"><Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{label}</span></dt>
    <dd className="min-w-0 break-words font-medium leading-snug text-foreground">{children}</dd>
  </div>
}

function CompactMetric({ label, value, icon: Icon }: { label: string; value: ReactNode; icon: LucideIcon }) {
  return <div className="min-w-0 py-1">
    <dt className="flex items-center gap-1.5 text-[11px] leading-4 text-muted-foreground"><Icon className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{label}</span></dt>
    <dd className="mt-0.5 break-words text-xs font-medium leading-4 text-foreground">{value}</dd>
  </div>
}

function SectionHeading({ id, title, description, trailing }: { id: string; title: string; description?: string; trailing?: ReactNode }) {
  return <div>
    <div className="flex items-center justify-between gap-2">
      <h3 id={id} className="text-sm font-semibold text-foreground">{title}</h3>
      {trailing}
    </div>
    {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
  </div>
}

function PrescriptionTable({ supplements, onAddPrescription, onRefresh }: { supplements: MaternalSupplement[]; onAddPrescription?: () => void; onRefresh?: () => void }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [type, setType] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<string[]>([])
  const filtered = supplements.filter((supplement) => {
    const isCompleted = Boolean(supplement.is_completed)
    const matchesStatus = status === "all" || (status === "completed" ? isCompleted : !isCompleted)
    const matchesType = type === "all" || (supplement.supplement_type ?? "Supplement") === type
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || `${supplement.supplement_type ?? "Supplement"} ${supplement.tablets_given_count ?? ""} ${supplement.date_given ?? ""}`.toLowerCase().includes(query)
    return matchesStatus && matchesType && matchesSearch
  })
  const types = [...new Set(supplements.map((item) => item.supplement_type ?? "Supplement"))]
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const exportCsv = () => {
    const rows = [["Medication", "Tablets Given", "Date Given", "Status"], ...filtered.map((item) => [item.supplement_type ?? "Supplement", String(item.tablets_given_count ?? ""), item.date_given ?? "", item.is_completed ? "Completed" : "Active"])]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "appointment-prescriptions.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const toggleSelected = (id: string, checked: boolean) => setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id))

  return <div className="space-y-3">
    <Tabs value={status} onValueChange={(value) => { setStatus(value); setPage(1) }}>
      <TabsList className="h-8 w-max justify-start gap-1">
        <TabsTrigger value="all" className="h-full px-3 text-xs">All ({supplements.length})</TabsTrigger>
        <TabsTrigger value="active" className="h-full px-3 text-xs">Active ({supplements.filter((item) => !item.is_completed).length})</TabsTrigger>
        <TabsTrigger value="completed" className="h-full px-3 text-xs">Completed ({supplements.filter((item) => item.is_completed).length})</TabsTrigger>
      </TabsList>
    </Tabs>
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[160px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search prescriptions..." aria-label="Search prescriptions" className="h-8 pl-8 text-xs" />
      </div>
      <Select value={type} onValueChange={(value) => { setType(value); setPage(1) }}>
        <SelectTrigger aria-label="Filter prescriptions by type" className="h-8 w-[150px] text-xs"><SelectValue placeholder="Medication" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All medications</SelectItem>{types.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
      </Select>
      <div className="ml-auto flex items-center gap-1.5">
        <Button type="button" variant="outline" size="icon" aria-label="Export prescriptions" onClick={exportCsv} className="size-8"><Download className="size-3.5" /></Button>
        <Button type="button" variant="outline" size="icon" aria-label="Refresh prescriptions" onClick={onRefresh} className="size-8"><RefreshCw className="size-3.5" /></Button>
        {onAddPrescription && <Button type="button" onClick={onAddPrescription} className="h-8 gap-1.5 px-2.5 text-xs"><Plus className="size-3.5" />Add Prescription</Button>}
      </div>
    </div>
    <div className="hidden overflow-x-auto rounded-md border border-sidebar-border md:block">
    <Table className="w-full table-fixed text-xs">
      <TableHeader className="bg-muted/50 dark:bg-muted/30">
        <TableRow className="border-sidebar-border hover:bg-transparent">
          <TableHead className="w-10 pl-3"><Checkbox aria-label="Select all prescriptions" checked={visible.length > 0 && visible.every((item) => selected.includes(item.supplement_id))} onCheckedChange={(checked) => setSelected(checked === true ? [...new Set([...selected, ...visible.map((item) => item.supplement_id)])] : selected.filter((id) => !visible.some((item) => item.supplement_id === id)))} className="border-sidebar-border" /></TableHead>
          <TableHead className="w-[36%] px-3">Medication</TableHead>
          <TableHead className="w-[18%] px-3">Tablets given</TableHead>
          <TableHead className="w-[18%] px-3">Date given</TableHead>
          <TableHead className="w-[18%] px-3">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((supplement) => <TableRow key={supplement.supplement_id} className="border-sidebar-border">
          <TableCell className="pl-3"><Checkbox checked={selected.includes(supplement.supplement_id)} onCheckedChange={(checked) => toggleSelected(supplement.supplement_id, checked === true)} aria-label={`Select ${supplement.supplement_type ?? "supplement"}`} className="border-sidebar-border" /></TableCell>
          <TableCell className="px-3">{supplement.supplement_type ?? "Supplement"}</TableCell>
          <TableCell className="px-3">{supplement.tablets_given_count ?? "—"}</TableCell>
          <TableCell className="px-3">{supplement.date_given ? new Date(supplement.date_given).toLocaleDateString() : "—"}</TableCell>
          <TableCell className="px-3"><StatusBadge status={supplement.is_completed ? "Completed" : "Active"} /></TableCell>
        </TableRow>)}
        {visible.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">{search ? "No matching prescriptions." : "No prescriptions or supplements are linked to this appointment."}</TableCell></TableRow>}
      </TableBody>
    </Table>
  </div>
  <div className="space-y-2 md:hidden">
    {visible.map((supplement) => <div key={supplement.supplement_id} className="rounded-md border border-sidebar-border p-3 text-xs">
      <div className="flex items-center gap-3"><Checkbox checked={selected.includes(supplement.supplement_id)} onCheckedChange={(checked) => toggleSelected(supplement.supplement_id, checked === true)} aria-label={`Select ${supplement.supplement_type ?? "supplement"}`} className="border-sidebar-border" /><span className="min-w-0 flex-1 font-medium">{supplement.supplement_type ?? "Supplement"}</span><StatusBadge status={supplement.is_completed ? "Completed" : "Active"} /></div>
      <div className="mt-2 flex justify-between gap-3 text-muted-foreground"><span>Tablets: {supplement.tablets_given_count ?? "—"}</span><span>{supplement.date_given ? new Date(supplement.date_given).toLocaleDateString() : "—"}</span></div>
    </div>)}
    {visible.length === 0 && <p className="rounded-md border border-sidebar-border p-6 text-center text-xs text-muted-foreground">{search ? "No matching prescriptions." : "No prescriptions or supplements are linked to this appointment."}</p>}
  </div>
  <TablePaginationFooter rowCount={filtered.length} selectedCount={selected.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
  </div>
}

export function AppointmentDetailsDialog({
  open,
  onOpenChange,
  patientName,
  appointment,
  pregnancy,
  consultation,
  supplements,
  onEdit,
  onDelete,
  onCancel,
  onAddPrescription,
  onRefresh,
  readOnly = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  appointment?: MaternalAppointment
  pregnancy?: MaternalPregnancy
  consultation?: NonNullable<MaternalPregnancy["prenatalVisits"]>[number]
  supplements: MaternalSupplement[]
  onEdit?: () => void
  onDelete?: () => void
  onCancel?: () => void
  onAddPrescription?: () => void
  onRefresh?: () => void
  readOnly?: boolean
}) {
  const appointmentDate = appointment?.appointment_date ? new Date(appointment.appointment_date) : null
  const appointmentDateLabel = appointmentDate && !Number.isNaN(appointmentDate.getTime()) ? `${appointmentDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}${appointment?.appointment_time ? ` at ${appointment.appointment_time}` : ""}` : "Date not recorded"
  const visitDateLabel = consultation?.visit_date ? new Date(consultation.visit_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Date not recorded"
  const evaluatedRisk = consultation ? evaluateLocalVisitRisk({
    vitals: {
      bp_systolic: consultation.bp_systolic,
      bp_diastolic: consultation.bp_diastolic,
      pulse_rate_bpm: consultation.pulse_rate_bpm,
      temperature_celsius: consultation.temperature_celsius,
      has_vaginal_bleeding: Boolean(consultation.has_vaginal_bleeding),
      has_fever: Boolean(consultation.has_fever),
      has_edema: Boolean(consultation.has_edema),
      has_pallor: Boolean(consultation.has_pallor),
      danger_signs_observed: consultation.danger_signs_observed,
    },
    pregnancy,
    overrideRiskLevel: consultation.risk_level_assessed,
  }) : null
  const riskLabel = consultation?.risk_level_assessed ?? evaluatedRisk?.risk_level_label ?? "Not assessed"
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
        title={<span className="truncate">{patientName} <span className="font-normal text-muted-foreground">— {appointment ? "Appointment Details" : "Consultation Details"}</span></span>}
        description={appointment ? `${appointment.appointment_type ?? "Appointment"} · ${appointmentDateLabel}` : `Visit #${consultation?.visit_number ?? "—"} · ${visitDateLabel}`}
        trailing={<>
          <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Close appointment details" onClick={() => onOpenChange(false)} className="size-8 shrink-0 text-muted-foreground">
            <X className="size-4" />
          </Button></TooltipTrigger><TooltipContent>Close appointment details</TooltipContent></Tooltip></TooltipProvider>
        </>}
        className="px-4 sm:px-5"
      />

      <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col px-4 sm:px-5">
        <TabsList className="mt-4 h-9 w-max justify-start gap-1">
          <TabsTrigger value="details" className="h-full px-3 text-xs">Details</TabsTrigger>
          <TabsTrigger value="prescriptions" className="h-full px-3 text-xs">Prescriptions ({supplements.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-3 min-h-0 flex-1 overflow-y-auto">
        <div className="w-full space-y-3 py-2">
          <section aria-labelledby="appointment-summary-heading">
            <SectionHeading id="appointment-summary-heading" title="Visit information" trailing={<StatusBadge status={appointment?.status ?? (consultation ? "Completed" : "Scheduled")} />} />
            <dl className="mt-1 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <DetailRow label={appointment ? "Appointment type" : "Visit number"} icon={CalendarDays}>{appointment?.appointment_type ?? `Visit #${consultation?.visit_number ?? "—"}`}</DetailRow>
              <DetailRow label={appointment ? "Date & time" : "Visit date"} icon={CalendarClock}>{appointment ? appointmentDateLabel : visitDateLabel}</DetailRow>
              <DetailRow label="Purpose" icon={ClipboardList}>{appointment?.reason || consultation?.chief_complaint || "Not recorded"}</DetailRow>
              <DetailRow label="Pregnancy" icon={Baby}>{pregnancy ? `G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"} · LMP ${pregnancy.lmp_date ? new Date(pregnancy.lmp_date).toLocaleDateString() : "—"}` : "No pregnancy linked"}</DetailRow>
            </dl>
          </section>

          <section aria-labelledby="appointment-consultation-heading">
            <SectionHeading id="appointment-consultation-heading" title="Consultation" />
            {consultation ? <>
              <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0 sm:grid-cols-4">
                {[
                  { label: "Blood pressure", value: `${consultation.bp_systolic ?? "—"}/${consultation.bp_diastolic ?? "—"} mmHg`, icon: Activity },
                  { label: "Pulse rate", value: consultation.pulse_rate_bpm != null ? `${consultation.pulse_rate_bpm} bpm` : "—", icon: HeartPulse },
                  { label: "Temperature", value: consultation.temperature_celsius != null ? `${consultation.temperature_celsius} °C` : "—", icon: Thermometer },
                  { label: "Weight", value: consultation.weight_kg != null ? `${consultation.weight_kg} kg` : "—", icon: Scale },
                  { label: "Fundal height", value: consultation.fundic_height_cm != null ? `${consultation.fundic_height_cm} cm` : "—", icon: Activity },
                  { label: "Fetal heart tone", value: consultation.fetal_heart_tone_bpm != null ? `${consultation.fetal_heart_tone_bpm} bpm` : "—", icon: HeartPulse },
                  { label: "Presentation", value: consultation.fetal_presentation || "—", icon: Baby },
                  { label: "Age of gestation", value: `${consultation.age_of_gestation_weeks ?? "—"} weeks · ${consultation.trimester ?? "—"}${consultation.trimester === 1 ? "st" : consultation.trimester === 2 ? "nd" : "rd"} trimester`, icon: CalendarDays },
                ].map(({ label, value, icon }) => <CompactMetric key={label} label={label} icon={icon} value={value} />)}
              </dl>
              <dl className="mt-1 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <DetailRow label="Risk assessment" icon={ShieldCheck}><span className="flex flex-wrap items-center gap-2"><StatusBadge status={riskLabel} /><span className="text-muted-foreground">TEWS {consultation.tews_score ?? "—"}</span></span></DetailRow>
                <DetailRow label="Attending provider" icon={UserRound}>{consultation.healthWorker ? `${consultation.healthWorker.first_name ?? ""} ${consultation.healthWorker.last_name ?? ""}`.trim() : "—"}</DetailRow>
                <div className="min-w-0 py-1 text-xs sm:col-span-2">
                  <dt className="flex items-center gap-2 text-muted-foreground"><HeartPulse className="size-3.5 shrink-0" aria-hidden="true" /><span>Clinical danger signs</span></dt>
                  <dd className="mt-0.5 pl-[22px] font-medium leading-4 text-foreground">{dangerSigns.length ? dangerSigns.join(", ") : "None reported"}</dd>
                </div>
                <div className="min-w-0 py-1 text-xs sm:col-span-2">
                  <dt className="flex items-center gap-2 text-muted-foreground"><FileText className="size-3.5 shrink-0" aria-hidden="true" /><span>Clinical notes</span></dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words pl-[22px] font-medium leading-4 text-foreground">{consultation.chief_complaint || "No clinical notes recorded."}</dd>
                </div>
              </dl>
            </> : <p className="mt-3 rounded-md bg-muted/35 p-3 text-xs text-muted-foreground">No consultation has been logged for this appointment.</p>}
          </section>
        </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <section className="w-full py-3" aria-labelledby="appointment-prescriptions-heading">
            <SectionHeading id="appointment-prescriptions-heading" title="Prescriptions" description="Medications associated with this appointment." />
            <div className="mt-3">
              <PrescriptionTable supplements={supplements} onAddPrescription={onAddPrescription} onRefresh={onRefresh} />
            </div>
          </section>
        </TabsContent>
      </Tabs>

      {!readOnly && (appointment || consultation) && (onEdit || onDelete || onCancel) && (
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
              {appointment ? "Delete Appointment" : "Delete Consultation"}
            </Button>
          )}
          {onCancel && appointment && appointment.status?.toLowerCase() !== "cancelled" && appointment.status?.toLowerCase() !== "completed" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8 gap-1.5 text-xs"
            >
              <Ban className="size-3.5" />
              Cancel Appointment
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
              {appointment && consultation ? "Edit Appointment & Vitals" : appointment ? "Edit Appointment" : "Edit Consultation"}
            </Button>
          )}
        </div>
      )}
    </SheetContent>
  </Sheet>
}
