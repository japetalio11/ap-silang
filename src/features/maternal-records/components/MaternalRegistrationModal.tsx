import { useState, type FormEvent, type ReactNode } from "react"
import { addDays, format, parseISO } from "date-fns"
import { z } from "zod"
import { Baby, Check, ClipboardList, HeartPulse, ShieldAlert, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { MaternalRecord } from "../api"

export type RegistrationValues = {
  firstName: string
  lastName: string
  middleName: string
  dateOfBirth: string
  contactNumber: string
  email: string
  address: string
  familySerialNo: string
  civilStatus: string
  bloodType: string
  healthWorker: string
  lastMenstrualPeriod: string
  estimatedDueDate: string
  heightCm: string
  pregnancyStatus: string
  gravida: string
  parity: string
  ageGroup: string
  completedEightAncVisits: boolean
  previousCesarean: boolean
  recurrentMiscarriages: boolean
  stillbirth: boolean
  postpartumHemorrhage: boolean
  chronicConditions: string[]
  firstTrimesterBmi: string
  bmiCategory: string
  otherComorbidities: string
  deliveryHistoryNotes: string
}

const initialValues: RegistrationValues = {
  firstName: "",
  lastName: "",
  middleName: "",
  dateOfBirth: "",
  contactNumber: "",
  email: "",
  address: "",
  familySerialNo: "",
  civilStatus: "",
  bloodType: "",
  healthWorker: "",
  lastMenstrualPeriod: "",
  estimatedDueDate: "",
  heightCm: "",
  pregnancyStatus: "active",
  gravida: "1",
  parity: "0",
  ageGroup: "",
  completedEightAncVisits: false,
  previousCesarean: false,
  recurrentMiscarriages: false,
  stillbirth: false,
  postpartumHemorrhage: false,
  chronicConditions: [],
  firstTrimesterBmi: "",
  bmiCategory: "",
  otherComorbidities: "",
  deliveryHistoryNotes: "",
}

const steps = ["Identity", "Pregnancy", "Risk History", "Conditions", "Clinical Indicators"]
const stepHeadings = [
  "Maternal identity & demographics",
  "Obstetric baseline & status",
  "Obstetric high-risk history",
  "Pre-existing & chronic conditions",
  "Clinical & nutrition indicators",
]
const stepIcons = [UserRound, Baby, ShieldAlert, HeartPulse, ClipboardList]
const chronicConditionOptions = ["Heart Disease", "Diabetes", "Tuberculosis", "Asthma", "Goiter"]

function Field({ id, label, required = false, error, children }: { id: string; label: ReactNode; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="gap-1">
        {label}
        {required && <><span aria-hidden="true" className="text-destructive"> *</span><span className="sr-only"> (required)</span></>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}

function DateField({
  id,
  label,
  value,
  onChange,
  required = false,
  error,
  disableFuture = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
  disableFuture?: boolean
}) {
  return (
    <Field id={id} label={label} required={required} error={error}>
      <DateInput id={id} value={value} onChange={onChange} disableFuture={disableFuture} />
    </Field>
  )
}

function FormSelect({
  id,
  label,
  value,
  placeholder,
  options,
  onChange,
  required = false,
  error,
}: {
  id: string
  label: string
  value: string
  placeholder: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  required?: boolean
  error?: string
}) {
  return (
    <Field id={id} label={label} required={required} error={error}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-8 min-h-8 w-full px-2 py-1.5 text-xs data-[size=default]:h-8">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  )
}

export function MaternalRegistrationModal({
  open,
  onOpenChange,
  mode = "maternal",
  onSubmit,
  currentStaffId,
  currentStaffLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "maternal" | "pregnancy"
  onSubmit?: (values: RegistrationValues) => Promise<void>
  currentStaffId?: string
  currentStaffLabel?: string
}) {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<RegistrationValues>(() => ({ ...initialValues, healthWorker: currentStaffId ?? "" }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const stepOffset = mode === "pregnancy" ? 1 : 0
  const activeStep = step + stepOffset
  const visibleSteps = mode === "pregnancy" ? steps.slice(1) : steps
  const progressValue = ((step + 1) / visibleSteps.length) * 100
  const progressTextClass = activeStep === 0
    ? "text-rose-600 dark:text-rose-400"
    : activeStep < 3
      ? "text-orange-600 dark:text-orange-400"
      : activeStep === 3
        ? "text-lime-700 dark:text-lime-300"
        : "text-emerald-700 dark:text-emerald-300"

  const update = <K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => { const next = { ...current }; delete next[key]; return next })
  }

  const reset = () => {
    setValues({ ...initialValues, healthWorker: currentStaffId ?? "" })
    setStep(0)
    setErrors({})
    setIsSubmitting(false)
  }

  const changeOpen = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const schemaByStep: Record<number, z.ZodType> = {
      0: z.object({
        firstName: z.string().trim().min(1, "Enter the mother's first name."),
        lastName: z.string().trim().min(1, "Enter the mother's last name."),
        dateOfBirth: z.string().min(1, "Enter the date of birth."),
        contactNumber: z.string().trim().min(1, "Enter a phone number."),
        address: z.string().trim().min(1, "Enter the mother's address."),
        civilStatus: z.string().min(1, "Select a civil status."),
        bloodType: z.string().min(1, "Select a blood type."),
        email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
      }),
      1: z.object({
        lastMenstrualPeriod: z.string().min(1, "Enter the LMP date."),
        pregnancyStatus: z.string().min(1, "Select a pregnancy status."),
        gravida: z.string().regex(/^\d+$/, "Enter a valid gravida count."),
        parity: z.string().regex(/^\d+$/, "Enter a valid parity count."),
        ageGroup: z.string().min(1, "Select an age group."),
      }),
    }
    const schema = schemaByStep[activeStep]
    if (schema) {
      const result = schema.safeParse(values)
      if (!result.success) {
        const nextErrors: Record<string, string> = {}
        for (const issue of result.error.issues) {
          const key = String(issue.path[0] ?? "")
          if (key && !nextErrors[key]) nextErrors[key] = issue.message
        }
        setErrors(nextErrors)
        return
      }
    }
    if (onSubmit && mode === "maternal" && step === visibleSteps.length - 1) {
      const completeSchema = z.object({
        firstName: z.string().trim().min(1, "Enter the mother's first name."),
        lastName: z.string().trim().min(1, "Enter the mother's last name."),
        dateOfBirth: z.string().min(1, "Enter the date of birth."),
        contactNumber: z.string().trim().min(1, "Enter a phone number."),
        address: z.string().trim().min(1, "Enter the mother's address."),
        civilStatus: z.string().min(1, "Select a civil status."),
        bloodType: z.string().min(1, "Select a blood type."),
        email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
        lastMenstrualPeriod: z.string().min(1, "Enter the LMP date."),
        pregnancyStatus: z.string().min(1, "Select a pregnancy status."),
        gravida: z.string().regex(/^\d+$/, "Enter a valid gravida count."),
        parity: z.string().regex(/^\d+$/, "Enter a valid parity count."),
        ageGroup: z.string().min(1, "Select an age group."),
      }).safeParse(values)
      if (!completeSchema.success) {
        const nextErrors: Record<string, string> = {}
        for (const issue of completeSchema.error.issues) {
          const key = String(issue.path[0] ?? "")
          if (key && !nextErrors[key]) nextErrors[key] = issue.message
        }
        setErrors(nextErrors)
        const identityKeys = ["firstName", "lastName", "dateOfBirth", "contactNumber", "address", "civilStatus", "bloodType", "email"]
        setStep(Object.keys(nextErrors).some((key) => identityKeys.includes(key)) ? 0 : 1)
        return
      }
    }
    if (step < visibleSteps.length - 1) {
      setStep((current) => current + 1)
      return
    }
    if (onSubmit) {
      setIsSubmitting(true)
      void onSubmit(values)
        .then(() => changeOpen(false))
        .catch((error: unknown) => toast.error(error instanceof Error ? error.message : mode === "pregnancy" ? "Unable to save the pregnancy record" : "Unable to save the maternal record"))
        .finally(() => setIsSubmitting(false))
      return
    }
    toast.success(mode === "pregnancy" ? "Pregnancy record created" : "Maternal record created")
    changeOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="grid max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl grid-cols-1 gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground sm:max-w-4xl md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border bg-muted/30 px-5 py-4 md:border-b-0 md:border-r md:px-6 md:py-6">
          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-base font-semibold">{mode === "pregnancy" ? "Create Pregnancy" : "Create Maternal Record"}</DialogTitle>
            <p className="text-xs text-muted-foreground">{mode === "pregnancy" ? "Add a pregnancy to this maternal record." : "Add a profile to the maternal registry."}</p>
          </DialogHeader>
          <nav aria-label="Registration steps" className="mt-4 flex gap-1 overflow-x-auto md:mt-8 md:flex-col">
            {visibleSteps.map((title, index) => {
              const sourceIndex = index + stepOffset
              const StepIcon = stepIcons[sourceIndex]
              return (
                <button
                  key={title}
                  type="button"
                  aria-current={step === index ? "step" : undefined}
                  onClick={() => setStep(index)}
                  className={`flex min-w-max items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors md:w-full ${step === index ? "bg-background font-medium text-foreground dark:shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
                >
                  <StepIcon className="size-4 shrink-0" />
                  <span>{title}</span>
                </button>
              )
            })}
          </nav>
          <div className="mt-auto hidden pt-8 md:block">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {step + 1} of {visibleSteps.length}</span>
              <span className={`font-medium ${progressTextClass}`}>{Math.round(progressValue)}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Registration progress"
              aria-valuemin={0}
              aria-valuenow={Math.round(progressValue)}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progressValue}%`, backgroundImage: "linear-gradient(90deg, #ef4444 0%, #f59e0b 55%, #22c55e 100%)", backgroundSize: `${10000 / progressValue}% 100%` }} />
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <DialogHeader className="shrink-0 px-5 pb-1 pt-5 sm:px-6 md:pt-6">
            <div className="w-full max-w-2xl">
              <h2 className="pr-8 text-sm font-semibold">{stepHeadings[activeStep]}</h2>
            </div>
          </DialogHeader>
          <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
            <div className="w-full max-w-2xl">
            {activeStep === 0 && (
              <section className="flex flex-col gap-3" aria-labelledby="identity-heading">
                <h2 id="identity-heading" className="sr-only">Section 1: Maternal identity and demographics</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="firstName" label="First Name" required error={errors.firstName}>
                    <Input id="firstName" aria-invalid={Boolean(errors.firstName)} autoComplete="given-name" value={values.firstName} onChange={(event) => update("firstName", event.target.value)} placeholder="Maria" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                  <Field id="lastName" label="Last Name" required error={errors.lastName}>
                    <Input id="lastName" aria-invalid={Boolean(errors.lastName)} autoComplete="family-name" value={values.lastName} onChange={(event) => update("lastName", event.target.value)} placeholder="Santos" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="middleName" label={<><span>Middle Name</span><span className="text-muted-foreground">(Optional)</span></>}>
                    <Input id="middleName" autoComplete="additional-name" value={values.middleName} onChange={(event) => update("middleName", event.target.value)} placeholder="Dela Cruz" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                  <DateField id="dateOfBirth" label="Date of Birth" value={values.dateOfBirth} onChange={(value) => update("dateOfBirth", value)} required error={errors.dateOfBirth} disableFuture />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="contactNumber" label="Phone Number" required error={errors.contactNumber}>
                    <Input id="contactNumber" aria-invalid={Boolean(errors.contactNumber)} type="tel" autoComplete="tel" value={values.contactNumber} onChange={(event) => update("contactNumber", event.target.value)} placeholder="09123456789" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                  <Field id="email" label={<><span>Email</span><span className="text-muted-foreground">(Optional)</span></>} error={errors.email}>
                    <Input id="email" aria-invalid={Boolean(errors.email)} type="email" autoComplete="email" value={values.email} onChange={(event) => update("email", event.target.value)} placeholder="maria@example.com" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                </div>
                <Field id="address" label="Address" required error={errors.address}>
                  <Textarea id="address" value={values.address} onChange={(event) => update("address", event.target.value)} placeholder="Complete address including barangay..." className="min-h-16 bg-muted/70 text-xs dark:bg-muted/60" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="familySerialNo" label={<><span>Family Serial No.</span><span className="text-muted-foreground">(Optional)</span></>}>
                    <Input id="familySerialNo" value={values.familySerialNo} onChange={(event) => update("familySerialNo", event.target.value)} placeholder="F-2026-001" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                  <FormSelect id="civilStatus" label="Civil Status" value={values.civilStatus} onChange={(value) => update("civilStatus", value)} placeholder="Select civil status" options={["Single", "Married", "Widowed", "Separated", "Other"].map((name) => ({ value: name, label: name }))} required error={errors.civilStatus} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormSelect id="bloodType" label="Blood Type" value={values.bloodType} onChange={(value) => update("bloodType", value)} placeholder="Select blood type" options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((name) => ({ value: name, label: name }))} required error={errors.bloodType} />
                  <FormSelect id="healthWorker" label="Assigned Staff / Care Provider" value={values.healthWorker} onChange={(value) => update("healthWorker", value)} placeholder="Select care provider" options={currentStaffId ? [{ value: currentStaffId, label: currentStaffLabel ?? "Current staff (You - Default)" }] : []} />
                </div>
              </section>
            )}

            {activeStep === 1 && (
              <section className="flex flex-col gap-3" aria-labelledby="baseline-heading">
                <h2 id="baseline-heading" className="sr-only">Obstetric baseline and status</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DateField id="lastMenstrualPeriod" label="LMP Date" value={values.lastMenstrualPeriod} onChange={(date) => {
                    update("lastMenstrualPeriod", date)
                    update("estimatedDueDate", date ? format(addDays(parseISO(date), 280), "yyyy-MM-dd") : "")
                  }} required error={errors.lastMenstrualPeriod} disableFuture />
                  <DateField id="estimatedDueDate" label="Est. Due Date (EDD)" value={values.estimatedDueDate} onChange={(date) => update("estimatedDueDate", date)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="heightCm" label="Maternal Height (cm)">
                    <Input id="heightCm" type="number" inputMode="decimal" value={values.heightCm} onChange={(event) => update("heightCm", event.target.value)} placeholder="e.g. 152.5" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                  <FormSelect id="pregnancyStatus" label="Pregnancy Status" value={values.pregnancyStatus} onChange={(value) => update("pregnancyStatus", value)} placeholder="Select status" options={["Active", "Delivered", "Miscarriage", "Stillbirth"].map((name) => ({ value: name.toLowerCase(), label: name }))} required error={errors.pregnancyStatus} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="gravida" label="Gravida (G)" required error={errors.gravida}>
                    <Input id="gravida" aria-invalid={Boolean(errors.gravida)} type="number" inputMode="numeric" value={values.gravida} onChange={(event) => update("gravida", event.target.value)} className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                  <Field id="parity" label="Parity (P)" required error={errors.parity}>
                    <Input id="parity" aria-invalid={Boolean(errors.parity)} type="number" inputMode="numeric" value={values.parity} onChange={(event) => update("parity", event.target.value)} className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormSelect id="ageGroup" label="Age Group" value={values.ageGroup} onChange={(value) => update("ageGroup", value)} placeholder="Select age group" options={["Under 20 years", "20-34 years", "35 years and older"].map((name) => ({ value: name, label: name }))} required error={errors.ageGroup} />
                  <label htmlFor="completedEightAncVisits" className="flex min-h-8 cursor-pointer items-center gap-2 self-end rounded-md px-1.5 py-1.5 text-xs transition-colors hover:bg-muted/50">
                    <Checkbox id="completedEightAncVisits" checked={values.completedEightAncVisits} onCheckedChange={(checked) => update("completedEightAncVisits", checked === true)} />
                    <span>Completed 8 ANC Visits</span>
                  </label>
                </div>
              </section>
            )}

            {activeStep === 2 && (
              <section aria-labelledby="risk-history-heading">
                <h2 id="risk-history-heading" className="sr-only">Obstetric high-risk history</h2>
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">Obstetric high-risk history</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ["previousCesarean", "Previous C-Section"],
                      ["recurrentMiscarriages", "Consecutive Miscarriages"],
                      ["stillbirth", "Stillbirth History"],
                      ["postpartumHemorrhage", "PPH History"],
                    ].map(([key, label]) => (
                      <label key={key} htmlFor={key} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors hover:bg-muted/50">
                        <Checkbox id={key} checked={values[key as keyof RegistrationValues] as boolean} onCheckedChange={(checked) => update(key as keyof RegistrationValues, checked === true)} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </section>
            )}

            {activeStep === 3 && (
              <section aria-labelledby="conditions-heading">
                <h2 id="conditions-heading" className="sr-only">Pre-existing and chronic conditions</h2>
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">Pre-existing and chronic conditions</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {chronicConditionOptions.map((condition) => {
                      const id = `chronic-${condition.toLowerCase().replace(/\s+/g, "-")}`
                      const checked = values.chronicConditions.includes(condition)
                      return (
                        <label key={condition} htmlFor={id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors hover:bg-muted/50">
                          <Checkbox id={id} checked={checked} onCheckedChange={(nextChecked) => update("chronicConditions", nextChecked ? [...values.chronicConditions, condition] : values.chronicConditions.filter((item) => item !== condition))} />
                          <span>{condition}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </section>
            )}

            {activeStep === 4 && (
              <section className="flex flex-col gap-3" aria-labelledby="clinical-heading">
                <h2 id="clinical-heading" className="sr-only">Clinical and nutrition indicators</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="firstTrimesterBmi" label="1st Tri BMI">
                    <Input id="firstTrimesterBmi" type="number" inputMode="decimal" value={values.firstTrimesterBmi} onChange={(event) => update("firstTrimesterBmi", event.target.value)} placeholder="e.g. 22.5" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                  </Field>
                  <FormSelect id="bmiCategory" label="BMI Category" value={values.bmiCategory} onChange={(value) => update("bmiCategory", value)} placeholder="Select BMI category" options={["Normal", "Underweight", "Overweight", "Obese"].map((name) => ({ value: name.toLowerCase(), label: name }))} />
                </div>
                <Field id="otherComorbidities" label="Other Co-morbidities">
                  <Input id="otherComorbidities" value={values.otherComorbidities} onChange={(event) => update("otherComorbidities", event.target.value)} placeholder="e.g. Chronic Kidney Disease, Epilepsy" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                </Field>
                <Field id="deliveryHistoryNotes" label="Previous Delivery History Notes">
                  <Textarea id="deliveryHistoryNotes" value={values.deliveryHistoryNotes} onChange={(event) => update("deliveryHistoryNotes", event.target.value)} placeholder="Notes on previous deliveries..." className="min-h-16 bg-muted/70 text-xs dark:bg-muted/60" />
                </Field>
              </section>
            )}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-row justify-between gap-2 sm:justify-between px-5 pb-5 pt-3 sm:px-6 md:pb-6">
            <div className={`ml-auto flex w-full max-w-2xl items-center gap-3 ${step > 0 ? "justify-between" : "justify-end"}`}>
              {step > 0 && (
                <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} className="h-9 min-w-24 rounded-md px-4 text-xs font-medium">
                  Back
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} className="h-9 min-w-28 rounded-md px-4 text-xs font-medium">
                {isSubmitting ? "Saving..." : step === visibleSteps.length - 1 ? "Finish" : "Continue"}
                {step === visibleSteps.length - 1 && !isSubmitting && <Check className="size-3.5" />}
              </Button>
            </div>
          </DialogFooter>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  )
}

export function NewPregnancyDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: RegistrationValues) => Promise<void> }) {
  return <MaternalRegistrationModal open={open} onOpenChange={onOpenChange} mode="pregnancy" onSubmit={onSubmit} />
}

export function EditMaternalProfileDialog({ open, onOpenChange, profile, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; profile: MaternalRecord; onSubmit: (values: RegistrationValues) => Promise<void> }) {
  const [values, setValues] = useState<RegistrationValues>(() => ({
    ...initialValues,
    firstName: profile.user?.first_name ?? "",
    lastName: profile.user?.last_name ?? "",
    middleName: profile.user?.middle_name ?? "",
    dateOfBirth: profile.birth_date?.slice(0, 10) ?? "",
    contactNumber: profile.user?.phone_number ?? "",
    email: profile.user?.email ?? "",
    address: profile.user?.address ?? "",
    familySerialNo: profile.family_serial_no ?? "",
    civilStatus: profile.civil_status ?? "",
    bloodType: profile.blood_type ?? "",
  }))
  const [isSaving, setIsSaving] = useState(false)

  const update = <K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = z.object({ firstName: z.string().trim().min(1, "Enter a first name."), lastName: z.string().trim().min(1, "Enter a last name."), dateOfBirth: z.string().min(1, "Enter the date of birth."), contactNumber: z.string().trim().min(1, "Enter a phone number."), address: z.string().trim().min(1, "Enter an address."), civilStatus: z.string().min(1, "Select a civil status."), bloodType: z.string().min(1, "Select a blood type."), email: z.union([z.literal(""), z.email("Enter a valid email address.")]) }).safeParse(values)
    if (!validation.success) { toast.error(validation.error.issues[0]?.message ?? "Check the required profile fields"); return }
    setIsSaving(true)
    try { await onSubmit(values); onOpenChange(false) }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update the maternal profile") }
    finally { setIsSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground sm:max-w-3xl">
        <DialogHeader className="px-5 pb-1 pt-5 sm:px-6 md:pt-6">
          <DialogTitle className="text-base font-semibold">Edit Profile</DialogTitle>
          <p className="text-xs text-muted-foreground">Update this patient’s identity and contact details.</p>
        </DialogHeader>
        <form onSubmit={save} className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
            <div className="flex w-full max-w-2xl flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="edit-first-name" label="First Name" required>
                  <Input id="edit-first-name" value={values.firstName} onChange={(event) => update("firstName", event.target.value)} placeholder="Maria" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                </Field>
                <Field id="edit-last-name" label="Last Name" required>
                  <Input id="edit-last-name" value={values.lastName} onChange={(event) => update("lastName", event.target.value)} placeholder="Santos" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="edit-middle-name" label={<><span>Middle Name</span><span className="text-muted-foreground">(Optional)</span></>}>
                  <Input id="edit-middle-name" value={values.middleName} onChange={(event) => update("middleName", event.target.value)} placeholder="Dela Cruz" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                </Field>
                <DateField id="edit-date-of-birth" label="Date of Birth" value={values.dateOfBirth} onChange={(value) => update("dateOfBirth", value)} disableFuture />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="edit-phone" label="Phone Number" required>
                  <Input id="edit-phone" type="tel" value={values.contactNumber} onChange={(event) => update("contactNumber", event.target.value)} placeholder="09123456789" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                </Field>
                <Field id="edit-email" label={<><span>Email</span><span className="text-muted-foreground">(Optional)</span></>}>
                  <Input id="edit-email" type="email" value={values.email} onChange={(event) => update("email", event.target.value)} placeholder="maria@example.com" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                </Field>
              </div>
              <Field id="edit-address" label="Address" required>
                <Textarea id="edit-address" value={values.address} onChange={(event) => update("address", event.target.value)} placeholder="Complete address including barangay..." className="min-h-16 bg-muted/70 text-xs dark:bg-muted/60" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="edit-family-serial" label={<><span>Family Serial No.</span><span className="text-muted-foreground">(Optional)</span></>}>
                  <Input id="edit-family-serial" value={values.familySerialNo} onChange={(event) => update("familySerialNo", event.target.value)} placeholder="F-2026-001" className="h-8 bg-muted/70 text-xs dark:bg-muted/60" />
                </Field>
                <FormSelect id="edit-civil-status" label="Civil Status" value={values.civilStatus} onChange={(value) => update("civilStatus", value)} placeholder="Select civil status" options={["Single", "Married", "Widowed", "Separated", "Other"].map((name) => ({ value: name, label: name }))} />
              </div>
              <FormSelect id="edit-blood-type" label="Blood Type" value={values.bloodType} onChange={(value) => update("bloodType", value)} placeholder="Select blood type" options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((name) => ({ value: name, label: name }))} />
            </div>
          </div>
          <DialogFooter className="shrink-0 flex-row justify-between gap-3 sm:justify-between px-5 pb-5 pt-3 sm:px-6 md:pb-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 min-w-24 text-xs">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="h-9 min-w-28 text-xs">{isSaving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
