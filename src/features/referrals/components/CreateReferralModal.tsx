import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { Check, HeartPulse, MapPin, Search, UserRound, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { z } from "zod"
import type { MaternalRecord } from "@/features/maternal-records/api"
import type { CreateReferralInput, ReferralFacility } from "../api"

const steps = [
  { title: "Patient & Destination", heading: "Select patient and destination", icon: UserRound },
  { title: "Vitals & Indication", heading: "Vitals and clinical indication", icon: HeartPulse },
  { title: "Obstetrical History", heading: "Pregnancy and handover details", icon: MapPin },
]

const patientDestinationSchema = z.object({
  patientId: z.string().min(1, "Select a mother."),
  pregnancyId: z.string().min(1, "The selected mother needs a pregnancy record."),
  destinationType: z.enum(["in-system", "external"]),
  destinationFacilityId: z.string(),
  externalFacilityName: z.string(),
}).superRefine((value, context) => {
  if (value.destinationType === "in-system" && !value.destinationFacilityId) {
    context.addIssue({ code: "custom", path: ["destinationFacilityId"], message: "Select a receiving facility." })
  }
  if (value.destinationType === "external" && !value.externalFacilityName.trim()) {
    context.addIssue({ code: "custom", path: ["externalFacilityName"], message: "Enter the external facility name." })
  }
})

const clinicalIndicationSchema = z.object({
  chiefComplaint: z.string().trim().min(1, "Enter the chief complaint."),
  referralReason: z.string().trim().min(1, "Enter the reason for referral."),
})

function Field({ id, label, required, error, children }: { id: string; label: ReactNode; required?: boolean; error?: string; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1.5"><Label htmlFor={id}>{label}{required && <span aria-hidden="true" className="text-destructive"> *</span>}</Label>{children}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>
}

export function CreateReferralModal({ open, onOpenChange, mothers, facilities, originFacilityId, initialMotherId, isSaving = false, onSubmit }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mothers: MaternalRecord[]
  facilities: ReferralFacility[]
  originFacilityId?: string | null
  initialMotherId?: string
  isSaving?: boolean
  onSubmit: (input: CreateReferralInput) => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [destinationType, setDestinationType] = useState("in-system")
  const [patientId, setPatientId] = useState(initialMotherId ?? "")
  const [motherSearchQuery, setMotherSearchQuery] = useState("")
  const [destinationFacilityId, setDestinationFacilityId] = useState("")
  const [externalFacilityName, setExternalFacilityName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clinicalValues, setClinicalValues] = useState<Record<string, string>>({})
  const progress = Math.round(((step + 1) / steps.length) * 100)
  const progressTextClass = step === 0 ? "text-rose-600 dark:text-rose-400" : step === 1 ? "text-orange-600 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-300"
  const progressStyle = { backgroundImage: "linear-gradient(90deg, #ef4444 0%, #f59e0b 55%, #22c55e 100%)", backgroundSize: `${10000 / progress}% 100%` }
  const selectedMother = mothers.find((mother) => mother.mother_id === patientId)
  const selectedPregnancy = [...(selectedMother?.pregnancies ?? [])].sort((a, b) => {
    const aActive = a.pregnancy_status?.toLowerCase() === "active" ? 1 : 0
    const bActive = b.pregnancy_status?.toLowerCase() === "active" ? 1 : 0
    return bActive - aActive || new Date(b.lmp_date ?? 0).getTime() - new Date(a.lmp_date ?? 0).getTime()
  })[0]
  const destinationFacilities = facilities.filter((facility) => facility.facility_id !== originFacilityId)

  useEffect(() => {
    if (open) {
      setPatientId(initialMotherId ?? "")
      setMotherSearchQuery("")
    }
  }, [open, initialMotherId])

  const getMotherFullName = (mother?: MaternalRecord | null) => {
    if (!mother) return ""
    return [mother.user?.first_name, mother.user?.middle_name, mother.user?.last_name].filter(Boolean).join(" ") || "Unnamed patient"
  }

  const getMotherInitials = (mother?: MaternalRecord | null) => {
    const name = getMotherFullName(mother)
    return name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "M"
  }

  const matchingMothers = useMemo(() => {
    const query = motherSearchQuery.trim().toLowerCase()
    if (!query) return []
    return mothers.filter((mother) => {
      const name = getMotherFullName(mother).toLowerCase()
      const serial = (mother.family_serial_no || "").toLowerCase()
      return name.includes(query) || serial.includes(query)
    })
  }, [mothers, motherSearchQuery])

  const close = () => {
    onOpenChange(false)
    setStep(0)
    setPatientId(initialMotherId ?? "")
    setMotherSearchQuery("")
    setDestinationFacilityId("")
    setExternalFacilityName("")
    setErrors({})
    setClinicalValues({})
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const read = (name: string) => String(data.get(name) ?? clinicalValues[name] ?? "").trim()
    setErrors({})

    if (step === 0) {
      const result = patientDestinationSchema.safeParse({ patientId, pregnancyId: selectedPregnancy?.pregnancy_id ?? "", destinationType, destinationFacilityId, externalFacilityName })
      if (!result.success) {
        setErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
        return
      }
      setStep(1)
      return
    }
    if (step === 1) {
      const result = clinicalIndicationSchema.safeParse({ chiefComplaint: clinicalValues.chiefComplaint ?? "", referralReason: clinicalValues.referralReason ?? "" })
      if (!result.success) {
        setErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
        return
      }
      setStep(2)
      return
    }
    if (!selectedMother || !selectedPregnancy || !originFacilityId) {
      toast.error("The patient, pregnancy, or referring facility is unavailable")
      return
    }

    const latestVisit = [...(selectedPregnancy.prenatalVisits ?? [])].sort((a, b) => new Date(b.visit_date ?? 0).getTime() - new Date(a.visit_date ?? 0).getTime())[0]
    const patientName = [selectedMother.user?.first_name, selectedMother.user?.middle_name, selectedMother.user?.last_name].filter(Boolean).join(" ") || "Not recorded"
    const bloodPressure = read("bloodPressure") || `${latestVisit?.bp_systolic ?? "N/A"}/${latestVisit?.bp_diastolic ?? "N/A"}`
    const reason = [
      `BMS ONLINE REFERRAL\nComplete name: ${patientName}`,
      `Age: ${selectedMother.age ?? "N/A"}`,
      `Address: ${selectedMother.user?.address || "N/A"}`,
      `CP Number: ${selectedMother.user?.phone_number || "N/A"}`,
      `Civil status: ${selectedMother.civil_status || "N/A"}`,
      `Blood type: ${selectedMother.blood_type || "N/A"}`,
      `V/S: T: ${read("temperature") || latestVisit?.temperature_celsius || "N/A"}°C · PR: ${read("pulse") || latestVisit?.pulse_rate_bpm || "N/A"} bpm · BP: ${bloodPressure} · wt: ${read("weight") || latestVisit?.weight_kg || "N/A"} kg · ht: ${read("height") || selectedPregnancy.height_cm || "N/A"} cm`,
      `CC: ${read("chiefComplaint")}`,
      `Reason for referral: ${read("referralReason")}`,
      read("requestedAction") ? `Requested clinical action: ${read("requestedAction")}` : "",
      `LMP: ${selectedPregnancy.lmp_date || "N/A"} · EDC: ${selectedPregnancy.edd_date || "N/A"}`,
      `AOG: ${latestVisit?.age_of_gestation_weeks ?? "N/A"} weeks · G${selectedPregnancy.gravida ?? "—"}P${selectedPregnancy.parity ?? "—"}`,
      `Previous delivery: ${read("previousDelivery") || "Not recorded"}`,
      `Co-morbidities: ${read("comorbidities") || "Not recorded"}`,
      read("handoverNotes") ? `Additional handover notes: ${read("handoverNotes")}` : "",
    ].filter(Boolean).join("\n")

    try {
      await onSubmit({
        pregnancy_id: selectedPregnancy.pregnancy_id,
        mother_id: selectedMother.mother_id,
        from_facility_id: originFacilityId,
        ...(destinationType === "in-system" ? { to_facility_id: destinationFacilityId } : { external_facility_name: externalFacilityName.trim() }),
        reason,
      })
    } catch {
      return
    }
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="grid max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl grid-cols-1 gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground sm:max-w-4xl md:grid-cols-[240px_minmax(0,1fr)]"
      >
        <aside className="flex min-h-0 flex-col border-b border-border bg-muted/30 px-5 py-4 md:border-b-0 md:border-r md:px-6 md:py-6">
          <DialogHeader className="gap-1.5 text-left">
            <DialogTitle className="text-base font-semibold">Initiate Online Referral</DialogTitle>
            <p className="text-xs text-muted-foreground">Create a transfer for a patient.</p>
          </DialogHeader>
          <nav aria-label="Referral steps" className="mt-4 flex gap-1 overflow-x-auto md:mt-8 md:flex-col">
            {steps.map(({ title, icon: Icon }, index) => (
              <button key={title} type="button" disabled={index > step} aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)} className={`flex min-w-max items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:w-full ${step === index ? "bg-background font-medium text-foreground" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}>
                <Icon className="size-4 shrink-0" />{title}
              </button>
            ))}
          </nav>
          <div className="mt-auto hidden pt-8 md:block">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>Step {step + 1} of {steps.length}</span><span className={`font-medium ${progressTextClass}`}>{progress}%</span></div>
            <div role="progressbar" aria-label="Referral progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%`, ...progressStyle }} /></div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <DialogHeader className="shrink-0 px-5 pb-1 pt-5 text-left sm:px-6 md:pt-6">
            <h2 className="text-sm font-semibold">{steps[step].heading}</h2>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted md:hidden"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%`, ...progressStyle }} /></div>
          </DialogHeader>
          <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
              <div className="flex w-full max-w-2xl flex-col gap-3">
                {step === 0 && <>
                  <Field id="referral-patient" label="Select Patient / Mother" required>
                    {initialMotherId && selectedMother ? (
                      <Input id="referral-patient" readOnly value={getMotherFullName(selectedMother)} />
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="referral-patient"
                            autoComplete="off"
                            value={selectedMother ? getMotherFullName(selectedMother) : motherSearchQuery}
                            onChange={(event) => {
                              setMotherSearchQuery(event.target.value)
                              if (patientId) setPatientId("")
                              setErrors((current) => ({ ...current, patientId: "", pregnancyId: "" }))
                            }}
                            placeholder="Search by mother's name or family serial no."
                            className="h-9 pl-8 pr-8 text-xs"
                            role="combobox"
                            aria-expanded={Boolean(motherSearchQuery.trim() && !selectedMother)}
                            aria-controls="referral-mother-results"
                          />
                          {(motherSearchQuery || selectedMother) && (
                            <button
                              type="button"
                              aria-label="Clear patient selection"
                              onClick={() => {
                                setMotherSearchQuery("")
                                setPatientId("")
                                setErrors((current) => ({ ...current, patientId: "", pregnancyId: "" }))
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>
                        {motherSearchQuery.trim() && !selectedMother && (
                          <div
                            id="referral-mother-results"
                            role="listbox"
                            aria-label="Available mothers"
                            className="max-h-52 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-sm"
                          >
                            {matchingMothers.length > 0 ? (
                              matchingMothers.map((mother) => {
                                const name = getMotherFullName(mother)
                                const initials = getMotherInitials(mother)
                                return (
                                  <button
                                    key={mother.mother_id}
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    onClick={() => {
                                      setPatientId(mother.mother_id)
                                      setMotherSearchQuery("")
                                      setErrors((current) => ({ ...current, patientId: "", pregnancyId: "" }))
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none"
                                  >
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                                      {initials}
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col">
                                      <span className="truncate font-medium text-foreground">{name}</span>
                                      <span className="truncate text-[11px] text-muted-foreground">
                                        {mother.family_serial_no || "No serial no."} · {mother.age != null ? `${mother.age} yrs` : "Age not recorded"}
                                      </span>
                                    </span>
                                    <Check className="size-3.5 shrink-0 text-muted-foreground/50" />
                                  </button>
                                )
                              })
                            ) : (
                              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                                No mothers found matching "{motherSearchQuery}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {errors.patientId && <p role="alert" className="text-xs text-destructive">{errors.patientId}</p>}
                    {errors.pregnancyId && <p role="alert" className="text-xs text-destructive">{errors.pregnancyId}</p>}
                  </Field>
                  <Label>Destination Facility <span aria-hidden="true" className="text-destructive">*</span></Label>
                  <Tabs value={destinationType} onValueChange={(value) => { setDestinationType(value); setDestinationFacilityId(""); setErrors({}) }} className="w-full">
                    <TabsList aria-label="Destination facility type" className="grid h-9 w-full grid-cols-2 justify-start gap-1">
                      <TabsTrigger value="in-system" className="h-full min-w-0 px-2 text-xs font-medium">In-System</TabsTrigger>
                      <TabsTrigger value="external" className="h-full min-w-0 px-2 text-xs font-medium">External</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {destinationType === "in-system" && (
                    <Field id="network-facility" label="Receiving Facility" required error={errors.destinationFacilityId}>
                      <Select value={destinationFacilityId} onValueChange={(value) => { setDestinationFacilityId(value); setErrors((current) => ({ ...current, destinationFacilityId: "" })) }}>
                        <SelectTrigger id="network-facility" className="w-full">
                          <SelectValue placeholder="Select facility" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start" side="bottom" sideOffset={4} className="w-[var(--radix-select-trigger-width)]">
                          {destinationFacilities.map((facility) => <SelectItem key={facility.facility_id} value={facility.facility_id}>{facility.facility_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  {destinationType === "external" && <Field id="external-facility" label="External Facility Name" required error={errors.externalFacilityName}><Input id="external-facility" value={externalFacilityName} onChange={(event) => { setExternalFacilityName(event.target.value); setErrors((current) => ({ ...current, externalFacilityName: "" })) }} placeholder="Enter facility name" /></Field>}
                  {selectedMother && <p className="text-xs text-muted-foreground">{selectedMother.family_serial_no || "No family serial number"} · {selectedMother.age ?? "Age not recorded"} years</p>}
                </>}

                {step === 1 && <>
                  <h3 className="text-xs font-semibold">Vital Signs</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field id="referral-temperature" label="Temperature (°C)"><Input name="temperature" id="referral-temperature" value={clinicalValues.temperature ?? ""} onChange={(event) => setClinicalValues((current) => ({ ...current, temperature: event.target.value }))} placeholder="e.g. 36.5" inputMode="decimal" /></Field>
                    <Field id="referral-pulse" label="Pulse Rate (bpm)"><Input name="pulse" id="referral-pulse" value={clinicalValues.pulse ?? ""} onChange={(event) => setClinicalValues((current) => ({ ...current, pulse: event.target.value }))} placeholder="e.g. 80" inputMode="numeric" /></Field>
                    <Field id="referral-bp" label="Blood Pressure (mmHg)"><Input name="bloodPressure" id="referral-bp" value={clinicalValues.bloodPressure ?? ""} onChange={(event) => setClinicalValues((current) => ({ ...current, bloodPressure: event.target.value }))} placeholder="e.g. 120/80" /></Field>
                    <Field id="referral-weight" label="Weight (kg)"><Input name="weight" id="referral-weight" value={clinicalValues.weight ?? ""} onChange={(event) => setClinicalValues((current) => ({ ...current, weight: event.target.value }))} placeholder="e.g. 55" inputMode="decimal" /></Field>
                    <Field id="referral-height" label="Height (cm)"><Input name="height" id="referral-height" value={clinicalValues.height ?? ""} onChange={(event) => setClinicalValues((current) => ({ ...current, height: event.target.value }))} placeholder="e.g. 155" inputMode="decimal" /></Field>
                  </div>
                  <Field id="chief-complaint" label="Chief Complaint (CC)" required error={errors.chiefComplaint}><Input name="chiefComplaint" id="chief-complaint" value={clinicalValues.chiefComplaint ?? ""} placeholder="e.g. For prenatal check up; high-risk" onChange={(event) => { setClinicalValues((current) => ({ ...current, chiefComplaint: event.target.value })); setErrors((current) => ({ ...current, chiefComplaint: "" })) }} /></Field>
                  <Field id="referral-reason" label="Reason for Referral" required error={errors.referralReason}><Textarea name="referralReason" id="referral-reason" value={clinicalValues.referralReason ?? ""} placeholder="Describe the clinical reason for referral..." className="min-h-20" onChange={(event) => { setClinicalValues((current) => ({ ...current, referralReason: event.target.value })); setErrors((current) => ({ ...current, referralReason: "" })) }} /></Field>
                  <Field id="requested-action" label="Requested Clinical Action"><Input name="requestedAction" id="requested-action" value={clinicalValues.requestedAction ?? ""} placeholder="e.g. Specialist OB/GYN evaluation" onChange={(event) => setClinicalValues((current) => ({ ...current, requestedAction: event.target.value }))} /></Field>
                </>}

                {step === 2 && <>
                  <h3 className="text-xs font-semibold">Obstetrical History</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field id="referral-lmp" label="LMP"><Input readOnly value={selectedPregnancy?.lmp_date ? new Date(selectedPregnancy.lmp_date).toLocaleDateString() : "Not recorded"} /></Field>
                    <Field id="referral-edd" label="EDC / EDD"><Input readOnly value={selectedPregnancy?.edd_date ? new Date(selectedPregnancy.edd_date).toLocaleDateString() : "Not recorded"} /></Field>
                    <Field id="referral-aog" label="AOG (Gestation)"><Input readOnly value={selectedPregnancy?.prenatalVisits?.[0]?.age_of_gestation_weeks != null ? `${selectedPregnancy.prenatalVisits[0].age_of_gestation_weeks} weeks` : "Not recorded"} /></Field>
                    <Field id="referral-gravida-parity" label="Gravida / Para"><Input readOnly value={selectedPregnancy ? `G${selectedPregnancy.gravida ?? "—"}P${selectedPregnancy.parity ?? "—"}` : "Not recorded"} /></Field>
                    <Field id="previous-delivery" label="Previous Delivery"><Input name="previousDelivery" placeholder="e.g. None" /></Field>
                    <Field id="referral-comorbidities" label="Co-morbidities"><Input name="comorbidities" placeholder="e.g. None" /></Field>
                  </div>
                  <Field id="handover-notes" label="Additional Handover Notes"><Textarea name="handoverNotes" id="handover-notes" placeholder="Add any relevant handover details..." className="min-h-16" /></Field>
                </>}
              </div>
            </div>
            <DialogFooter className="shrink-0 flex-row justify-between gap-2 px-5 pb-5 pt-3 sm:justify-between sm:px-6 md:pb-6">
              <div className="ml-auto flex w-full max-w-2xl items-center justify-between gap-3">
                {step > 0 ? (
                  <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} className="h-9 min-w-24 rounded-md px-4 text-xs font-medium">Back</Button>
                ) : (
                  <Button type="button" variant="outline" onClick={close} className="h-9 min-w-24 rounded-md px-4 text-xs font-medium">Cancel</Button>
                )}
                <Button type="submit" disabled={isSaving} className="h-9 min-w-28 rounded-md px-4 text-xs font-medium">{isSaving ? "Creating…" : step === steps.length - 1 ? <>Create Referral <Check className="size-3.5" /></> : "Continue"}</Button>
              </div>
            </DialogFooter>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  )
}
