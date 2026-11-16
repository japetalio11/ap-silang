import { useEffect, useState, type FormEvent } from "react"
import { format } from "date-fns"
import { Activity, CalendarClock, HeartPulse, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { getClosedDates } from "@/features/calendar/closed-dates"
import { validateClinicalVitalsData } from "@/lib/cdss/cdssEngine"
import type {
  MaternalAppointment,
  MaternalPregnancy,
  MaternalPrenatalVisit,
  RegisterPrenatalVisitInput,
  UpdateMaternalAppointmentInput,
  UpdatePrenatalVisitInput,
} from "../api"

const inputClass = "h-8 bg-muted/70 text-xs dark:bg-muted/60"

const appointmentTimes = Array.from({ length: 21 }, (_, index) => {
  const totalMinutes = 7 * 60 + index * 30
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  const hour12 = hours % 12 || 12
  const period = hours < 12 ? "AM" : "PM"
  return { value, label: `${hour12}:${String(minutes).padStart(2, "0")} ${period}` }
})

const standardAppointmentTypes = [
  "Prenatal Checkup",
  "Postpartum Follow-up",
  "High-Risk Consultation",
  "General Visit",
  "ANC follow-up",
  "Laboratory",
  "Ultrasound",
  "Consultation",
]

const standardStatuses = [
  "Scheduled",
  "Completed",
  "Cancelled",
  "Missed",
]

function safeDate(val?: string | null): string {
  if (!val) return ""
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10)
  try {
    const d = new Date(val)
    return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd")
  } catch {
    return ""
  }
}

function parseDecimalString(val: unknown): string {
  if (val == null) return ""
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : ""
  if (typeof val === "string") return val.trim()
  if (typeof val === "object" && val !== null && "toString" in val) {
    const s = String(val)
    return s !== "[object Object]" ? s : ""
  }
  return ""
}

function normalizeTime(val?: string | null): string {
  if (!val) return "09:00"
  const match = val.match(/^(\d{1,2}):(\d{2})/)
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`
  }
  return val
}

function Field({ id, label, required = false, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {children}
    </div>
  )
}

export function EditAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  visit,
  pregnancy,
  pregnancies = [],
  patientName,
  facilityId,
  onSaveAppointment,
  onSaveVisit,
  onCreateVisit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: MaternalAppointment | null
  visit?: MaternalPrenatalVisit | null
  pregnancy?: MaternalPregnancy | null
  pregnancies?: MaternalPregnancy[]
  patientName?: string
  facilityId?: string | null
  onSaveAppointment?: (appointmentId: string, input: UpdateMaternalAppointmentInput) => Promise<void>
  onSaveVisit?: (visitId: string, input: UpdatePrenatalVisitInput) => Promise<void>
  onCreateVisit?: (input: RegisterPrenatalVisitInput) => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<"appointment" | "vitals">("appointment")
  const [includeVitals, setIncludeVitals] = useState(false)

  const [appointmentDate, setAppointmentDate] = useState("")
  const [appointmentTime, setAppointmentTime] = useState("09:00")
  const [appointmentType, setAppointmentType] = useState("Prenatal Checkup")
  const [status, setStatus] = useState("Scheduled")
  const [reason, setReason] = useState("")

  const [pregnancyId, setPregnancyId] = useState("")
  const [visitNumber, setVisitNumber] = useState("1")
  const [aogWeeks, setAogWeeks] = useState("")
  const [trimester, setTrimester] = useState("1")
  const [systolic, setSystolic] = useState("")
  const [diastolic, setDiastolic] = useState("")
  const [weight, setWeight] = useState("")
  const [pulse, setPulse] = useState("")
  const [temperature, setTemperature] = useState("")
  const [fundalHeight, setFundalHeight] = useState("")
  const [fetalHeartTone, setFetalHeartTone] = useState("")
  const [fetalPresentation, setFetalPresentation] = useState("")
  const [vaginalBleeding, setVaginalBleeding] = useState(false)
  const [fever, setFever] = useState(false)
  const [edema, setEdema] = useState(false)
  const [pallor, setPallor] = useState(false)
  const [additionalSigns, setAdditionalSigns] = useState("")
  const [notes, setNotes] = useState("")

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    if (!appointment && visit) {
      setActiveTab("vitals")
    } else {
      setActiveTab("appointment")
    }

    if (appointment) {
      setAppointmentDate(safeDate(appointment.appointment_date) || format(new Date(), "yyyy-MM-dd"))
      setAppointmentTime(normalizeTime(appointment.appointment_time))
      setAppointmentType(appointment.appointment_type || "Prenatal Checkup")
      const rawStatus = appointment.status
        ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).toLowerCase()
        : "Scheduled"
      setStatus(rawStatus)
      setReason(appointment.reason ?? "")
    } else {
      setAppointmentDate(safeDate(visit?.visit_date) || format(new Date(), "yyyy-MM-dd"))
      setAppointmentTime("09:00")
      setAppointmentType("Consultation")
      setStatus("Completed")
      setReason("")
    }

    const defaultPregnancy = pregnancies.find((p) => p.pregnancy_status?.toLowerCase() === "active") ?? pregnancies[0]
    const activePregId = visit?.pregnancy_id || pregnancy?.pregnancy_id || defaultPregnancy?.pregnancy_id || ""
    setPregnancyId(activePregId)

    if (visit) {
      setIncludeVitals(true)
      setVisitNumber(visit.visit_number != null ? String(visit.visit_number) : "1")
      setAogWeeks(parseDecimalString(visit.age_of_gestation_weeks))
      setTrimester(visit.trimester != null ? String(visit.trimester) : "1")
      setSystolic(parseDecimalString(visit.bp_systolic))
      setDiastolic(parseDecimalString(visit.bp_diastolic))
      setWeight(parseDecimalString(visit.weight_kg))
      setPulse(parseDecimalString(visit.pulse_rate_bpm))
      setTemperature(parseDecimalString(visit.temperature_celsius))
      setFundalHeight(parseDecimalString(visit.fundic_height_cm))
      setFetalHeartTone(parseDecimalString(visit.fetal_heart_tone_bpm))
      setFetalPresentation(visit.fetal_presentation ?? "")
      setVaginalBleeding(Boolean(visit.has_vaginal_bleeding))
      setFever(Boolean(visit.has_fever))
      setEdema(Boolean(visit.has_edema))
      setPallor(Boolean(visit.has_pallor))
      setNotes(visit.chief_complaint ?? "")
      setAdditionalSigns(visit.danger_signs_observed ?? "")
    } else {
      setIncludeVitals(false)
      setVisitNumber("1")
      setAogWeeks("")
      setTrimester("1")
      setSystolic("")
      setDiastolic("")
      setWeight("")
      setPulse("")
      setTemperature("")
      setFundalHeight("")
      setFetalHeartTone("")
      setFetalPresentation("")
      setVaginalBleeding(false)
      setFever(false)
      setEdema(false)
      setPallor(false)
      setNotes("")
      setAdditionalSigns("")
    }
  }, [open, appointment, visit, pregnancy, pregnancies])

  const typeOptions = appointmentType && !standardAppointmentTypes.includes(appointmentType)
    ? [appointmentType, ...standardAppointmentTypes]
    : standardAppointmentTypes

  const statusOptions = status && !standardStatuses.includes(status)
    ? [status, ...standardStatuses]
    : standardStatuses

  const timeOptions = appointmentTime && !appointmentTimes.some((item) => item.value === appointmentTime)
    ? [{ value: appointmentTime, label: appointmentTime }, ...appointmentTimes]
    : appointmentTimes

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (appointment && onSaveAppointment) {
      if (!appointmentDate || !appointmentTime || !appointmentType) {
        toast.error("Complete the required appointment details")
        setActiveTab("appointment")
        return
      }

      const closed = getClosedDates(facilityId).find((item) => item.date === appointmentDate)
      if (closed) {
        toast.error(`Facility is closed on this date (${closed.reason}). Please select another date.`)
        setActiveTab("appointment")
        return
      }
    }

    const hasVitalsData = includeVitals || Boolean(visit)
    if (hasVitalsData) {
      if (!pregnancyId || !systolic || !diastolic || !weight || !pulse || !temperature) {
        toast.error("Complete all required vital signs (BP, Pulse, Temperature, Weight)")
        setActiveTab("vitals")
        return
      }

      const vitalsErrors = validateClinicalVitalsData({
        trimester,
        visit_number: visitNumber,
        age_of_gestation_weeks: aogWeeks ? parseFloat(aogWeeks) : 1,
        weight_kg: weight,
        temperature_celsius: temperature,
        pulse_rate_bpm: pulse,
        bp_systolic: systolic,
        bp_diastolic: diastolic,
        fundic_height_cm: fundalHeight || null,
        fetal_heart_tone_bpm: fetalHeartTone || null,
      })
      if (vitalsErrors.length > 0) {
        toast.error(vitalsErrors[0])
        setActiveTab("vitals")
        return
      }
    }

    setIsSaving(true)
    try {
      if (appointment && onSaveAppointment) {
        await onSaveAppointment(appointment.appointment_id, {
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          appointment_type: appointmentType,
          status,
          reason: reason.trim() || null,
          version: appointment.version,
        })
      }

      if (hasVitalsData) {
        const dangerSigns = [
          vaginalBleeding && "Vaginal bleeding",
          fever && "Maternal fever",
          edema && "Edema",
          pallor && "Severe pallor",
          additionalSigns.trim(),
        ].filter(Boolean).join("; ")

        if (visit?.visit_id && onSaveVisit) {
          await onSaveVisit(visit.visit_id, {
            pregnancy_id: pregnancyId,
            visit_number: parseInt(visitNumber, 10) || 1,
            age_of_gestation_weeks: aogWeeks ? Math.max(1, parseFloat(aogWeeks)) : 1,
            trimester: parseInt(trimester, 10) || 1,
            bp_systolic: parseInt(systolic, 10),
            bp_diastolic: parseInt(diastolic, 10),
            weight_kg: parseFloat(weight),
            pulse_rate_bpm: parseInt(pulse, 10),
            temperature_celsius: parseFloat(temperature),
            fundic_height_cm: fundalHeight ? parseFloat(fundalHeight) : null,
            fetal_heart_tone_bpm: fetalHeartTone ? parseInt(fetalHeartTone, 10) : null,
            fetal_presentation: fetalPresentation || null,
            chief_complaint: notes.trim() || null,
            danger_signs_observed: dangerSigns || null,
            has_vaginal_bleeding: vaginalBleeding,
            has_fever: fever,
            has_edema: edema,
            has_pallor: pallor,
            visit_date: appointmentDate || visit.visit_date || undefined,
            version: visit.version,
          })
        } else if (onCreateVisit) {
          await onCreateVisit({
            pregnancy_id: pregnancyId,
            health_worker_id: "",
            visit_number: parseInt(visitNumber, 10) || 1,
            age_of_gestation_weeks: aogWeeks ? Math.max(1, parseFloat(aogWeeks)) : 1,
            trimester: parseInt(trimester, 10) || 1,
            bp_systolic: parseInt(systolic, 10),
            bp_diastolic: parseInt(diastolic, 10),
            weight_kg: parseFloat(weight),
            pulse_rate_bpm: parseInt(pulse, 10),
            temperature_celsius: parseFloat(temperature),
            fundic_height_cm: fundalHeight ? parseFloat(fundalHeight) : undefined,
            fetal_heart_tone_bpm: fetalHeartTone ? parseInt(fetalHeartTone, 10) : undefined,
            fetal_presentation: fetalPresentation || undefined,
            chief_complaint: notes.trim() || undefined,
            danger_signs_observed: dangerSigns || undefined,
            has_vaginal_bleeding: vaginalBleeding,
            has_fever: fever,
            has_edema: edema,
            has_pallor: pallor,
            visit_date: appointmentDate || format(new Date(), "yyyy-MM-dd"),
          })
        }
      }

      toast.success("Record updated successfully")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save updates")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" />
            <DialogTitle className="text-base font-semibold">
              {appointment && visit
                ? "Edit Appointment & Consultation Vitals"
                : appointment
                ? "Edit Appointment Details"
                : "Edit Consultation Vitals"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {patientName
              ? `Manage schedule and clinical observation records for ${patientName}.`
              : "Manage scheduled appointment and clinical consultation vitals."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-1">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "appointment" | "vitals")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="appointment" className="gap-2 text-xs">
                <CalendarClock className="size-3.5" />
                Appointment Details
              </TabsTrigger>
              <TabsTrigger value="vitals" className="gap-2 text-xs">
                <HeartPulse className="size-3.5" />
                Consultation Vitals {visit && "•"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointment" className="space-y-3 pt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="edit-appointment-date" label="Appointment Date" required>
                  <DateInput
                    id="edit-appointment-date"
                    value={appointmentDate}
                    onChange={setAppointmentDate}
                    disabledDates={(day) => {
                      const dateStr = format(day, "yyyy-MM-dd")
                      return getClosedDates(facilityId).some((item) => item.date === dateStr)
                    }}
                  />
                </Field>

                <Field id="edit-appointment-time" label="Appointment Time" required>
                  <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                    <SelectTrigger id="edit-appointment-time" className={inputClass}>
                      <SelectValue placeholder="Choose time" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" side="bottom" sideOffset={4}>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field id="edit-appointment-type" label="Appointment Type" required>
                  <Select value={appointmentType} onValueChange={setAppointmentType}>
                    <SelectTrigger id="edit-appointment-type" className={inputClass}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" side="bottom" sideOffset={4}>
                      {typeOptions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field id="edit-appointment-status" label="Status" required>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="edit-appointment-status" className={inputClass}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" side="bottom" sideOffset={4}>
                      {statusOptions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field id="edit-appointment-reason" label="Purpose / Clinical Objective">
                <Textarea
                  id="edit-appointment-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the objective or scheduling notes..."
                  className="min-h-16 bg-muted/70 text-xs dark:bg-muted/60"
                />
              </Field>

              {!visit && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
                  <Checkbox
                    id="include-vitals-toggle"
                    checked={includeVitals}
                    onCheckedChange={(checked) => setIncludeVitals(Boolean(checked))}
                  />
                  <Label htmlFor="include-vitals-toggle" className="text-xs font-normal cursor-pointer">
                    Also record / edit consultation vitals for this encounter
                  </Label>
                </div>
              )}
            </TabsContent>

            <TabsContent value="vitals" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {pregnancies.length > 0 && (
                  <div className="sm:col-span-3">
                    <Field id="edit-vitals-pregnancy" label="Target Pregnancy" required>
                      <Select value={pregnancyId} onValueChange={setPregnancyId}>
                        <SelectTrigger id="edit-vitals-pregnancy" className={inputClass}>
                          <SelectValue placeholder="Select pregnancy" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start" side="bottom" sideOffset={4}>
                          {pregnancies.map((p) => (
                            <SelectItem key={p.pregnancy_id} value={p.pregnancy_id}>
                              G{p.gravida ?? "—"} P{p.parity ?? "—"} · LMP {p.lmp_date ? safeDate(p.lmp_date) : "—"} · {p.pregnancy_status ?? "Active"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}

                <Field id="edit-vitals-visit-number" label="Visit Number" required>
                  <Input
                    id="edit-vitals-visit-number"
                    type="number"
                    min="1"
                    max="20"
                    value={visitNumber}
                    onChange={(e) => setVisitNumber(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-vitals-aog" label="AOG (Weeks)">
                  <Input
                    id="edit-vitals-aog"
                    type="number"
                    min="1"
                    max="45"
                    value={aogWeeks}
                    onChange={(e) => setAogWeeks(e.target.value)}
                    placeholder="e.g. 24"
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-vitals-trimester" label="Trimester" required>
                  <Select value={trimester} onValueChange={setTrimester}>
                    <SelectTrigger id="edit-vitals-trimester" className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" side="bottom" sideOffset={4}>
                      <SelectItem value="1">1st Trimester</SelectItem>
                      <SelectItem value="2">2nd Trimester</SelectItem>
                      <SelectItem value="3">3rd Trimester</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field id="edit-vitals-systolic" label="Systolic BP (mmHg)" required>
                  <Input
                    id="edit-vitals-systolic"
                    type="number"
                    min="50"
                    max="250"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    placeholder="e.g. 120"
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-vitals-diastolic" label="Diastolic BP (mmHg)" required>
                  <Input
                    id="edit-vitals-diastolic"
                    type="number"
                    min="30"
                    max="150"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="e.g. 80"
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-vitals-weight" label="Weight (kg)" required>
                  <Input
                    id="edit-vitals-weight"
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 58.5"
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-vitals-pulse" label="Pulse Rate (bpm)" required>
                  <Input
                    id="edit-vitals-pulse"
                    type="number"
                    min="40"
                    max="200"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="e.g. 78"
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-vitals-temperature" label="Temperature (°C)" required>
                  <Input
                    id="edit-vitals-temperature"
                    type="number"
                    step="0.1"
                    min="34"
                    max="43"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="e.g. 36.8"
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-vitals-fundal-height" label="Fundal Height (cm)">
                  <Input
                    id="edit-vitals-fundal-height"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={fundalHeight}
                    onChange={(e) => setFundalHeight(e.target.value)}
                    placeholder="e.g. 24"
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-vitals-fetal-heart-tone" label="Fetal Heart Tone (bpm)">
                  <Input
                    id="edit-vitals-fetal-heart-tone"
                    type="number"
                    min="60"
                    max="220"
                    value={fetalHeartTone}
                    onChange={(e) => setFetalHeartTone(e.target.value)}
                    placeholder="e.g. 140"
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-vitals-fetal-presentation" label="Fetal Presentation">
                  <Select value={fetalPresentation} onValueChange={setFetalPresentation}>
                    <SelectTrigger id="edit-vitals-fetal-presentation" className={inputClass}>
                      <SelectValue placeholder="Presentation" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" side="bottom" sideOffset={4}>
                      <SelectItem value="Cephalic">Cephalic</SelectItem>
                      <SelectItem value="Breech">Breech</SelectItem>
                      <SelectItem value="Transverse">Transverse</SelectItem>
                      <SelectItem value="Unspecified">Unspecified</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="rounded-md border border-border p-3 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <ShieldAlert className="size-4 text-destructive" />
                  <span>Clinical Danger Signs</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={vaginalBleeding}
                      onCheckedChange={(c) => setVaginalBleeding(Boolean(c))}
                    />
                    <span>Vaginal bleeding</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={fever}
                      onCheckedChange={(c) => setFever(Boolean(c))}
                    />
                    <span>Maternal fever</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={edema}
                      onCheckedChange={(c) => setEdema(Boolean(c))}
                    />
                    <span>Edema</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={pallor}
                      onCheckedChange={(c) => setPallor(Boolean(c))}
                    />
                    <span>Severe pallor</span>
                  </label>
                </div>
                <Field id="edit-vitals-additional-danger" label="Other Observed Danger Signs">
                  <Input
                    id="edit-vitals-additional-danger"
                    value={additionalSigns}
                    onChange={(e) => setAdditionalSigns(e.target.value)}
                    placeholder="e.g. Severe headache, blurred vision"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field id="edit-vitals-notes" label="Consultation Clinical Notes">
                <Textarea
                  id="edit-vitals-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record provider observations, patient complaints, or recommendations..."
                  className="min-h-16 bg-muted/70 text-xs dark:bg-muted/60"
                />
              </Field>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {activeTab === "appointment" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("vitals")}
                >
                  Go to Vitals →
                </Button>
              )}
              {activeTab === "vitals" && appointment && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("appointment")}
                >
                  ← Appointment Details
                </Button>
              )}
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
