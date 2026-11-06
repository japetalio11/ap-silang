import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from "react"
import { format } from "date-fns"
import { CalendarDays, Check, FileText, HeartPulse, Image, LockKeyhole, Printer, Search, ShieldAlert, Upload, UserRound, X } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type { MaternalCompositeRecord, MaternalPregnancy, MaternalStaff } from "../api"

function RequiredLabel({ htmlFor, children, required = false }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-medium">
      {children}{required && <><span aria-hidden="true" className="text-destructive"> *</span><span className="sr-only"> (required)</span></>}
    </Label>
  )
}

function Field({ id, label, required = false, children }: { id: string; label: string; required?: boolean; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1.5"><RequiredLabel htmlFor={id} required={required}>{label}</RequiredLabel>{children}</div>
}

function PatientBanner({ name, context, details, risk = true }: { name: string; context: string; details: string; risk?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sidebar-border bg-muted/40 p-3 dark:bg-muted/30">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="size-4" /></div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{context}</p>
          <p className="text-xs text-muted-foreground">{details}</p>
        </div>
      </div>
      {risk && <div className="flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">ASSESSED RISK</span><StatusBadge status="Low Risk" /></div>}
    </div>
  )
}

export function RiskOverrideDialog({ open, onOpenChange, patientName, pregnancyLabel, currentRisk, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; patientName: string; pregnancyLabel: string; currentRisk: string; onSubmit: (riskLevel: string, reason: string) => Promise<void> }) {
  const [riskLevel, setRiskLevel] = useState("moderate")
  const [reason, setReason] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reason.trim()) { toast.error("Add a clinical reason for this override"); return }
    setIsSaving(true)
    try { await onSubmit(riskLevel, reason.trim()); setReason(""); onOpenChange(false) }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update the risk level") }
    finally { setIsSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-xl">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base font-semibold">Clinical Risk Level Override</DialogTitle>
          <DialogDescription className="text-xs">Update or override the evaluated patient risk level based on clinical judgment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sidebar-border bg-muted/40 p-3 dark:bg-muted/30"><div><p className="text-xs font-semibold">{patientName}</p><p className="text-xs text-muted-foreground">{pregnancyLabel}</p></div><StatusBadge status={currentRisk} /></div>
          <div className="flex flex-col gap-1.5">
            <RequiredLabel htmlFor="override-risk" required>Select New Risk Level</RequiredLabel>
            <RadioGroup id="override-risk" value={riskLevel} onValueChange={setRiskLevel} className="gap-2">
              {[
                ["high", "High Risk", "Critical or complex factors requiring specialist or hospital referral."],
                ["moderate", "Moderate Risk", "Elevated factors or vital changes requiring close monitoring."],
                ["low", "Low Risk", "Standard clinical baseline with no emergent warning signs."],
              ].map(([value, title, description]) => (
                <Label key={value} htmlFor={`override-${value}`} className="flex cursor-pointer items-start gap-2.5 rounded-md border border-sidebar-border px-3 py-2.5 font-normal transition-colors hover:bg-muted/40">
                  <RadioGroupItem id={`override-${value}`} value={value} className="mt-0.5" />
                  <span className="flex flex-col gap-0.5"><span className="text-xs font-medium">{title}</span><span className="text-xs text-muted-foreground">{description}</span></span>
                </Label>
              ))}
            </RadioGroup>
          </div>
          <Field id="risk-justification" label="Clinical Justification / Reason" required>
            <Textarea id="risk-justification" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Document the clinical reason for this override..." className="min-h-20 bg-muted/70 text-xs dark:bg-muted/60" />
          </Field>
          <DialogFooter className="flex-row justify-between gap-3 sm:justify-between pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 flex-1 text-xs sm:flex-initial sm:min-w-24">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="h-8 flex-1 gap-1.5 text-xs sm:flex-initial sm:min-w-44"><ShieldAlert className="size-3.5" />{isSaving ? "Saving…" : "Confirm Risk Override"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmRiskOverridePasswordDialog({ open, onOpenChange, patientName, riskLevel, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; patientName: string; riskLevel: string; onConfirm: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) setPassword("")
    onOpenChange(nextOpen)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password.trim()) { toast.error("Enter your account password to confirm this override"); return }
    setIsSaving(true)
    try {
      await onConfirm(password)
      changeOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to confirm the risk override")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg gap-5 rounded-xl border-border bg-background p-5 text-foreground sm:p-6">
        <DialogHeader className="gap-2 pr-7">
          <DialogTitle className="text-base font-semibold leading-snug">Confirm risk override for {patientName}?</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">This will update the assessed risk to {riskLevel} and record your clinical justification in the patient’s history. Verify your identity to continue.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <Field id="risk-override-password" label="Enter your password" required>
            <Input id="risk-override-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your account password" className="h-10" />
          </Field>
          <DialogFooter className="flex-row justify-between gap-3 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => changeOpen(false)} className="h-9 min-w-24">Cancel</Button>
            <Button type="submit" disabled={isSaving || !password.trim()} className="h-9 gap-2 px-4">{!isSaving && <LockKeyhole className="size-4" />}{isSaving ? "Verifying…" : "Confirm Risk Override"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ChangeStaffDialog({ open, onOpenChange, patientName, staff, currentStaff, isLoading = false, onAssign }: { open: boolean; onOpenChange: (open: boolean) => void; patientName: string; staff: MaternalStaff[]; currentStaff?: MaternalStaff | null; isLoading?: boolean; onAssign: (staffId: string) => Promise<void> }) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<MaternalStaff | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const matches = staff.filter((member) => `${member.first_name} ${member.middle_name ?? ""} ${member.last_name} ${member.role} ${member.email ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
  const currentName = currentStaff ? [currentStaff.first_name, currentStaff.middle_name, currentStaff.last_name].filter(Boolean).join(" ") : "No staff assigned"

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("")
      setSelected(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-border bg-background p-5 text-foreground sm:max-w-md">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base font-semibold">Change Assigned Staff</DialogTitle>
          <DialogDescription className="text-xs">Choose a care provider for {patientName}.</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-2" aria-labelledby="current-assignee-heading">
          <h3 id="current-assignee-heading" className="text-xs font-medium">Currently assigned</h3>
          <div className="flex items-center gap-3 rounded-md border border-sidebar-border bg-muted/30 p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{currentStaff ? `${currentStaff.first_name[0] ?? ""}${currentStaff.last_name[0] ?? ""}` : "—"}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{currentName}</p>
              <p className="truncate text-xs text-muted-foreground">{currentStaff?.role ?? "Care provider not assigned"}</p>
            </div>
            <span className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">Assigned</span>
          </div>
        </section>

        <section className="flex flex-col gap-1.5" aria-labelledby="search-staff-heading">
          <h3 id="search-staff-heading" className="text-xs font-medium">Assign a coworker</h3>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setSelected(null) }} placeholder="Search staff by name or role..." className="h-9 bg-muted/70 pl-8 text-xs dark:bg-muted/60" />
          </div>
          {(search.trim() || isLoading) && (
            <div className="max-h-56 overflow-y-auto rounded-md border border-sidebar-border p-1" role="listbox" aria-label="Staff search results">
              {isLoading && !matches.length ? <div className="space-y-1 p-1" aria-label="Loading staff" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-2.5 px-2 py-2"><Skeleton className="size-8 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div> : matches.length ? matches.map((member) => (
                <button key={member.user_id} type="button" role="option" aria-selected={selected?.user_id === member.user_id} onClick={() => setSelected(member)} className={`flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors ${selected?.user_id === member.user_id ? "bg-accent" : "hover:bg-muted/60"}`}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">{`${member.first_name[0] ?? ""}${member.last_name[0] ?? ""}`}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-xs font-medium">{[member.first_name, member.middle_name, member.last_name].filter(Boolean).join(" ")}</span>
                    <span className="truncate text-xs text-muted-foreground">{member.role} · {member.email ?? "No email"}</span>
                  </span>
                  {selected?.user_id === member.user_id && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              )) : <p className="px-3 py-5 text-center text-xs text-muted-foreground">No staff found.</p>}
            </div>
          )}
        </section>

        <DialogFooter className="flex-row justify-between gap-3 sm:justify-between pt-3">
          <Button type="button" variant="outline" onClick={() => close(false)} className="h-8 flex-1 text-xs sm:flex-initial sm:min-w-24">Cancel</Button>
          <Button type="button" disabled={!selected || isSaving} onClick={async () => { if (!selected) return; setIsSaving(true); try { await onAssign(selected.user_id); close(false) } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to assign staff") } finally { setIsSaving(false) } }} className="h-8 flex-1 text-xs sm:flex-initial sm:min-w-32">{isSaving ? "Saving…" : "Assign Staff"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EhrExportDialog({ open, onOpenChange, patientName, maternalRecord, onExport }: { open: boolean; onOpenChange: (open: boolean) => void; patientName: string; maternalRecord: MaternalCompositeRecord; onExport: (format: string) => boolean }) {
  const [format, setFormat] = useState("pdf")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-xl">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base font-semibold">Export Clinical Health Record (EHR Summary)</DialogTitle>
          <DialogDescription className="text-xs">Generate a clinical record summary for {patientName}.</DialogDescription>
        </DialogHeader>
        <PatientBanner
          name={patientName}
          context={`${maternalRecord.pregnancies?.length ?? 0} pregnancy records · ${maternalRecord.prenatalVisits?.length ?? 0} consultations`}
          details={`${maternalRecord.family_serial_no || "No family serial no."} · ${maternalRecord.age ?? "—"} years · ${maternalRecord.blood_type || "Blood type not recorded"}`}
          risk={false}
        />

        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium">Report Format</h3>
          <Tabs value={format} onValueChange={setFormat} className="w-full">
            <TabsList className="h-9 w-full justify-between gap-1">
              <TabsTrigger value="pdf" className="px-2 text-xs">Printable PDF</TabsTrigger>
              <TabsTrigger value="csv" className="px-2 text-xs">Encounter CSV</TabsTrigger>
              <TabsTrigger value="json" className="px-2 text-xs">Complete JSON</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">{format === "pdf" ? "Clean A4 medical layout" : format === "csv" ? "Spreadsheet timeline" : "Full EHR exchange"}</p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium">Included Clinical Modules</h3>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {[
              ["Prenatal Encounters & Vitals", "2", "Recorded antenatal visits and physiological vitals."],
              ["EHR Records", "1", "Laboratory tests and screening attachments."],
              ["Prescriptions & Supplements", "1", "Medication logs and nutritional supplements."],
              ["Delivery & Newborn Records", "2", "Labor outcomes, delivery logs, and infant statistics."],
              ["Postpartum Follow-up Care", "0", "Maternal checkups and postpartum vitals."],
            ].map(([name, count, description], index) => (
              <label key={name} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/40 sm:col-span-1">
                <Checkbox defaultChecked={index < 4} className="mt-0.5" />
                <span className="flex min-w-0 flex-col gap-0.5"><span className="text-xs font-medium">{name} <span className="text-muted-foreground">({count})</span></span><span className="text-xs text-muted-foreground">{description}</span></span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter className="flex-row justify-between gap-3 sm:justify-between pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 flex-1 text-xs sm:flex-initial sm:min-w-24">Cancel</Button>
          <Button type="button" onClick={() => { if (onExport(format)) onOpenChange(false) }} className="h-8 flex-1 gap-1.5 text-xs sm:flex-initial sm:min-w-44"><Printer className="size-3.5" />{format === "pdf" ? "Print Clinical Record" : "Download Clinical Record"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type EncounterValues = {
  pregnancyId: string
  visitNumber: string
  aogWeeks: string
  trimester: string
  systolic: string
  diastolic: string
  weight: string
  pulse: string
  temperature: string
  fundalHeight: string
  fetalHeartTone: string
  fetalPresentation: string
  vaginalBleeding: boolean
  fever: boolean
  edema: boolean
  pallor: boolean
  additionalSigns: string
  notes: string
}

export function PrenatalVitalsDialog({ open, onOpenChange, pregnancies, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; pregnancies: MaternalPregnancy[]; onSave: (values: EncounterValues) => Promise<void> }) {
  const [todayTimestamp] = useState(() => Date.now())
  const [step, setStep] = useState(0)
  const [vitalsTab, setVitalsTab] = useState("vitals")
  const [isSaving, setIsSaving] = useState(false)
  const [values, setValues] = useState<EncounterValues>({ pregnancyId: "", visitNumber: "", aogWeeks: "", trimester: "1", systolic: "", diastolic: "", weight: "", pulse: "", temperature: "", fundalHeight: "", fetalHeartTone: "", fetalPresentation: "", vaginalBleeding: false, fever: false, edema: false, pallor: false, additionalSigns: "", notes: "" })
  const inputClass = "h-8 bg-muted/70 text-xs dark:bg-muted/60"
  const stepLabels = ["Visit & Pregnancy", "Vitals", "Danger Signs"]
  const stepHeadings = ["Visit & pregnancy identification", "Physiological measurements & vitals", "Clinical danger signs & notes"]
  const stepIcons = [CalendarDays, HeartPulse, ShieldAlert]
  const progress = Math.round(((step + 1) / stepLabels.length) * 100)
  const progressTextClass = step === 0 ? "text-rose-600 dark:text-rose-400" : step === 1 ? "text-orange-600 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-300"
  const defaultPregnancy = pregnancies.find((pregnancy) => pregnancy.pregnancy_status?.toLowerCase() === "active") ?? pregnancies[0]
  const selectedPregnancyId = values.pregnancyId || defaultPregnancy?.pregnancy_id || ""
  const selectedPregnancy = pregnancies.find((pregnancy) => pregnancy.pregnancy_id === selectedPregnancyId)
  const lmpDate = selectedPregnancy?.lmp_date ? new Date(selectedPregnancy.lmp_date) : null
  const elapsedDays = lmpDate && !Number.isNaN(lmpDate.getTime()) ? Math.max(0, Math.floor((todayTimestamp - lmpDate.getTime()) / 86_400_000)) : 0
  const calculatedAog = selectedPregnancy?.lmp_date ? String(Math.floor(elapsedDays / 7)) : ""
  const effectiveAogWeeks = values.aogWeeks || calculatedAog
  const effectiveVisitNumber = values.visitNumber || String((selectedPregnancy?.prenatalVisits?.length ?? 0) + 1)

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(0)
      setVitalsTab("vitals")
      setValues({ pregnancyId: "", visitNumber: "", aogWeeks: "", trimester: "1", systolic: "", diastolic: "", weight: "", pulse: "", temperature: "", fundalHeight: "", fetalHeartTone: "", fetalPresentation: "", vaginalBleeding: false, fever: false, edema: false, pallor: false, additionalSigns: "", notes: "" })
    }
    onOpenChange(nextOpen)
  }

  const update = <K extends keyof EncounterValues>(key: K, value: EncounterValues[K]) => setValues((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step < stepLabels.length - 1) {
      setStep((current) => current + 1)
      return
    }
    if (!selectedPregnancyId || !effectiveVisitNumber || !effectiveAogWeeks || !values.systolic || !values.diastolic || !values.weight || !values.pulse || !values.temperature) {
      toast.error("Complete the required pregnancy, visit, and vital sign fields")
      return
    }
    setIsSaving(true)
    try { await onSave({ ...values, pregnancyId: selectedPregnancyId, visitNumber: effectiveVisitNumber, aogWeeks: effectiveAogWeeks }); close(false) }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save this consultation") }
    finally { setIsSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="grid max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl grid-cols-1 gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground sm:max-w-4xl md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border bg-muted/30 px-5 py-4 md:border-b-0 md:border-r md:px-6 md:py-6">
          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-base font-semibold">Log Prenatal Vitals &amp; Encounter</DialogTitle>
            <DialogDescription className="text-xs">Record vitals and visit observations.</DialogDescription>
          </DialogHeader>
          <nav aria-label="Encounter steps" className="mt-4 flex gap-1 overflow-x-auto md:mt-8 md:flex-col">
            {stepLabels.map((label, index) => {
              const StepIcon = stepIcons[index]
              return <button key={label} type="button" aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)} className={`flex min-w-max items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors md:w-full ${step === index ? "bg-background font-medium text-foreground dark:shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}><StepIcon className="size-4 shrink-0" /><span>{label}</span></button>
            })}
          </nav>
          <div className="mt-auto hidden pt-8 md:block">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>Step {step + 1} of {stepLabels.length}</span><span className={`font-medium ${progressTextClass}`}>{progress}%</span></div>
            <div role="progressbar" aria-label="Encounter progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%`, backgroundImage: "linear-gradient(90deg, #ef4444 0%, #f59e0b 55%, #22c55e 100%)", backgroundSize: `${10000 / progress}% 100%` }} />
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <DialogHeader className="shrink-0 px-5 pb-1 pt-5 sm:px-6 md:pt-6"><h2 className="pr-8 text-sm font-semibold">{stepHeadings[step]}</h2></DialogHeader>
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
              <div className="flex w-full max-w-2xl flex-col gap-3">
                {step === 0 && <section className="grid gap-3 sm:grid-cols-2">
                  <Field id="vitals-pregnancy" label="Target Pregnancy" required>
                    <Select value={selectedPregnancyId} onValueChange={(value) => update("pregnancyId", value)}><SelectTrigger id="vitals-pregnancy" className="h-8 w-full text-xs"><SelectValue placeholder="Select pregnancy" /></SelectTrigger><SelectContent>{pregnancies.map((pregnancy) => <SelectItem key={pregnancy.pregnancy_id} value={pregnancy.pregnancy_id}>G{pregnancy.gravida ?? "—"} P{pregnancy.parity ?? "—"} · LMP: {pregnancy.lmp_date ? format(new Date(pregnancy.lmp_date), "MM/dd/yyyy") : "Not recorded"} ({pregnancy.pregnancy_status ?? "Active"})</SelectItem>)}</SelectContent></Select>
                  </Field>
                  <Field id="vitals-visit-number" label="Visit Number" required><Input id="vitals-visit-number" type="number" value={effectiveVisitNumber} onChange={(event) => update("visitNumber", event.target.value)} className={inputClass} /></Field>
                  <Field id="vitals-aog" label="AOG (Weeks)" required><Input id="vitals-aog" type="number" value={effectiveAogWeeks} onChange={(event) => update("aogWeeks", event.target.value)} className={inputClass} /></Field>
                  <Field id="vitals-trimester" label="Trimester"><Select value={values.trimester} onValueChange={(value) => update("trimester", value)}><SelectTrigger id="vitals-trimester" className="h-8 w-full text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1st Trimester</SelectItem><SelectItem value="2">2nd Trimester</SelectItem><SelectItem value="3">3rd Trimester</SelectItem></SelectContent></Select></Field>
                </section>}

                {step === 1 && <Tabs value={vitalsTab} onValueChange={setVitalsTab} className="w-full gap-3">
                  <TabsList className="h-8 w-fit max-w-full">
                    <TabsTrigger value="vitals" className="px-3 text-xs">Vitals</TabsTrigger>
                    <TabsTrigger value="fetal" className="px-3 text-xs">Fetal Assessment</TabsTrigger>
                  </TabsList>
                  <TabsContent value="vitals" className="mt-0">
                    <section className="grid gap-3 sm:grid-cols-2">
                      <Field id="vitals-systolic" label="BP Systolic (mmHg)" required><Input id="vitals-systolic" type="number" value={values.systolic} onChange={(event) => update("systolic", event.target.value)} placeholder="e.g. 110" className={inputClass} /></Field>
                      <Field id="vitals-diastolic" label="BP Diastolic (mmHg)" required><Input id="vitals-diastolic" type="number" value={values.diastolic} onChange={(event) => update("diastolic", event.target.value)} placeholder="e.g. 70" className={inputClass} /></Field>
                      <Field id="vitals-weight" label="Weight (kg)" required><Input id="vitals-weight" type="number" step="0.1" value={values.weight} onChange={(event) => update("weight", event.target.value)} placeholder="e.g. 58.5" className={inputClass} /></Field>
                      <Field id="vitals-pulse" label="Pulse Rate (BPM)" required><Input id="vitals-pulse" type="number" value={values.pulse} onChange={(event) => update("pulse", event.target.value)} placeholder="e.g. 72" className={inputClass} /></Field>
                      <Field id="vitals-temperature" label="Temperature (°C)" required><Input id="vitals-temperature" type="number" step="0.1" value={values.temperature} onChange={(event) => update("temperature", event.target.value)} placeholder="e.g. 36.8" className={inputClass} /></Field>
                    </section>
                  </TabsContent>
                  <TabsContent value="fetal" className="mt-0">
                    <section className="grid gap-3 sm:grid-cols-2">
                      <Field id="vitals-fundal-height" label="Fundal Height (cm)"><Input id="vitals-fundal-height" type="number" step="0.1" value={values.fundalHeight} onChange={(event) => update("fundalHeight", event.target.value)} placeholder="Optional" className={inputClass} /></Field>
                      <Field id="vitals-fetal-heart-tone" label="Fetal Heart Tone (BPM)"><Input id="vitals-fetal-heart-tone" type="number" value={values.fetalHeartTone} onChange={(event) => update("fetalHeartTone", event.target.value)} placeholder="Optional" className={inputClass} /></Field>
                      <Field id="vitals-fetal-presentation" label="Fetal Presentation"><Select value={values.fetalPresentation} onValueChange={(value) => update("fetalPresentation", value)}><SelectTrigger id="vitals-fetal-presentation" className="h-8 w-full text-xs"><SelectValue placeholder="Select presentation" /></SelectTrigger><SelectContent><SelectItem value="Cephalic">Cephalic</SelectItem><SelectItem value="Breech">Breech</SelectItem><SelectItem value="Transverse">Transverse</SelectItem></SelectContent></Select></Field>
                    </section>
                  </TabsContent>
                </Tabs>}

                {step === 2 && <section className="flex flex-col gap-3">
                  <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="sr-only">Clinical danger signs observed</legend>{([["Vaginal Bleeding", "vaginalBleeding"], ["Maternal Fever", "fever"], ["Edema (Facial/Hands/Feet)", "edema"], ["Severe Pallor", "pallor"]] as const).map(([sign, key]) => <label key={sign} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={values[key]} onCheckedChange={(checked) => update(key, checked === true)} />{sign}</label>)}</fieldset>
                  <Field id="vitals-additional-danger-signs" label="Additional Danger Signs / Observations"><Input id="vitals-additional-danger-signs" value={values.additionalSigns} onChange={(event) => update("additionalSigns", event.target.value)} placeholder="e.g. Severe headache, vision disturbance, epigastric pain" className={inputClass} /></Field>
                  <Field id="vitals-clinical-notes" label="Chief Complaint / Clinical Notes"><Textarea id="vitals-clinical-notes" value={values.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Document reported symptoms and clinical observations..." className="min-h-20 bg-muted/70 text-xs dark:bg-muted/60" /></Field>
                </section>}
              </div>
            </div>
            <DialogFooter className="shrink-0 flex-row justify-between gap-2 sm:justify-between px-5 pb-5 pt-3 sm:px-6 md:pb-6">
              <div className={`ml-auto flex w-full max-w-2xl items-center gap-3 ${step > 0 ? "justify-between" : "justify-end"}`}>
                {step > 0 && <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} className="h-9 min-w-24 rounded-md px-4 text-xs font-medium">Back</Button>}
                <Button type="submit" disabled={isSaving} className="h-9 min-w-28 rounded-md px-4 text-xs font-medium">{isSaving ? "Saving…" : step === stepLabels.length - 1 ? "Save Encounter" : "Continue"}</Button>
              </div>
            </DialogFooter>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  )
}

export type LaboratoryFormValues = { pregnancyId: string; visitId: string; screeningType: string; screeningDate: string; result: string; remarks: string; files: File[] }

export function LaboratoryRecordDialog({ open, onOpenChange, pregnancies, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; pregnancies: MaternalPregnancy[]; onSave: (values: LaboratoryFormValues) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pregnancyId, setPregnancyId] = useState("")
  const [visitId, setVisitId] = useState("")
  const [screeningType, setScreeningType] = useState("")
  const [screeningDate, setScreeningDate] = useState("")
  const [result, setResult] = useState("")
  const [remarks, setRemarks] = useState("")
  const progress = step === 1 ? 50 : 100
  const progressTextClass = step === 1 ? "text-orange-600 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-300"

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const supported = Array.from(list).filter((file) => /\.(png|jpe?g|pdf)$/i.test(file.name))
    setFiles((current) => [...current, ...supported])
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(1)
      setFiles([])
      setVisitId("")
      setScreeningType("")
      setScreeningDate("")
      setResult("")
      setRemarks("")
    }
    onOpenChange(nextOpen)
  }

  const defaultPregnancy = pregnancies.find((pregnancy) => pregnancy.pregnancy_status?.toLowerCase() === "active") ?? pregnancies[0]
  const selectedPregnancyId = pregnancyId || defaultPregnancy?.pregnancy_id || ""

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPregnancyId || !screeningType.trim() || !screeningDate) { toast.error("Select a pregnancy and complete the screening type and date"); return }
    setIsSaving(true)
    try { await onSave({ pregnancyId: selectedPregnancyId, visitId, screeningType: screeningType.trim(), screeningDate, result: result.trim(), remarks: remarks.trim(), files }); close(false) }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save the EHR record") }
    finally { setIsSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-4 text-foreground sm:max-w-md">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base font-semibold">Add EHR Record</DialogTitle>
          <DialogDescription className="text-xs">Add a clinical document or screening record to this mother’s EHR.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5" aria-label={`Step ${step} of 2`}>
          <div className="flex items-center justify-between text-xs"><span className="font-medium">{step === 1 ? "Upload document" : "Lab details"}</span><span className={`font-medium ${progressTextClass}`}>Step {step} of 2 · {progress}%</span></div>
          <div role="progressbar" aria-label="Laboratory record progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${progress}%`, backgroundImage: "linear-gradient(90deg, #ef4444 0%, #f59e0b 55%, #22c55e 100%)", backgroundSize: `${10000 / progress}% 100%` }} />
          </div>
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-3">
            <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" multiple className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => { addFiles(event.target.files); event.target.value = "" }} />
            <div
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex aspect-[1.5] min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-sidebar-border hover:bg-muted/30"}`}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click() }}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Upload className="size-5" /></span>
              <span className="text-xs"><span className="font-medium text-primary">Click to upload</span> or drag and drop</span>
              <span className="text-xs text-muted-foreground">PNG, JPG, or PDF</span>
            </div>
            {files.length > 0 && <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium">{files.length} file{files.length === 1 ? "" : "s"} selected</p>
              {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md border border-sidebar-border px-2.5 py-2">
                {file.type.startsWith("image/") ? <Image className="size-4 shrink-0 text-muted-foreground" /> : <FileText className="size-4 shrink-0 text-muted-foreground" />}
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${file.name}`} className="size-7 shrink-0" onClick={(event) => { event.stopPropagation(); setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index)) }}><X className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Remove {file.name}</TooltipContent></Tooltip></TooltipProvider>
              </div>)}
            </div>}
            <DialogFooter className="flex-row justify-between gap-3 sm:justify-between pt-3">
              <Button type="button" variant="outline" onClick={() => close(false)} className="h-8 flex-1 text-xs sm:flex-initial sm:min-w-24">Cancel</Button>
              <Button type="button" onClick={() => setStep(2)} className="h-8 flex-1 text-xs sm:flex-initial sm:min-w-32">Continue</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={save} className="flex flex-col gap-4">
            {files.length > 0 && <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-2 text-xs dark:bg-muted/30"><FileText className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{files.length === 1 ? files[0].name : `${files.length} files attached`}</span><Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setStep(1)}>Change</Button></div>}
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold">Encounter Association</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="lab-pregnancy" label="Target Pregnancy" required><Select value={selectedPregnancyId} onValueChange={(value) => { setPregnancyId(value); setVisitId("") }}><SelectTrigger id="lab-pregnancy" className="h-8 w-full text-xs"><SelectValue placeholder="Select pregnancy" /></SelectTrigger><SelectContent>{pregnancies.map((pregnancy) => <SelectItem key={pregnancy.pregnancy_id} value={pregnancy.pregnancy_id}>G{pregnancy.gravida ?? "—"} P{pregnancy.parity ?? "—"} · LMP {pregnancy.lmp_date ? format(new Date(pregnancy.lmp_date), "MM/dd/yyyy") : "—"} · {pregnancy.pregnancy_status ?? "Active"}</SelectItem>)}</SelectContent></Select></Field>
                <Field id="lab-visit" label="Associated Visit"><Select value={visitId} onValueChange={setVisitId}><SelectTrigger id="lab-visit" className="h-8 w-full text-xs"><SelectValue placeholder="Select visit (optional)" /></SelectTrigger><SelectContent>{(pregnancies.find((pregnancy) => pregnancy.pregnancy_id === selectedPregnancyId)?.prenatalVisits ?? []).filter((visit) => visit.visit_id).map((visit) => <SelectItem key={visit.visit_id} value={visit.visit_id!}>Visit #{visit.visit_number ?? "—"} · {visit.visit_date ? format(new Date(visit.visit_date), "MMM d, yyyy") : "Date not recorded"}</SelectItem>)}</SelectContent></Select></Field>
              </div>
            </section>
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold">Test Details</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="lab-screening-type" label="Screening Type" required><Input id="lab-screening-type" value={screeningType} onChange={(event) => setScreeningType(event.target.value)} placeholder="e.g. CBC, Urinalysis, Blood Type" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" /></Field>
                <Field id="lab-screening-date" label="Date of Screening" required><DateInput id="lab-screening-date" value={screeningDate} onChange={setScreeningDate} /></Field>
                <div className="sm:col-span-2"><Field id="lab-result" label="Screening Result (Optional)"><Input id="lab-result" value={result} onChange={(event) => setResult(event.target.value)} placeholder="e.g. Normal, Non-reactive, Hemoglobin: 12.5 g/dL" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" /></Field></div>
              </div>
            </section>
            <Field id="lab-remarks" label="Remarks / Findings"><Textarea id="lab-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Enter clinical observations or follow-up notes..." className="min-h-16 bg-muted/70 text-xs dark:bg-muted/60" /></Field>
            <DialogFooter className="flex-row justify-between gap-3 sm:justify-between pt-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-8 flex-1 text-xs sm:flex-initial sm:min-w-24">Back</Button>
              <Button type="submit" disabled={isSaving} className="h-8 flex-1 text-xs sm:flex-initial sm:min-w-36">{isSaving ? "Saving…" : "Save EHR Record"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
