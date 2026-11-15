import { useEffect, useState, type FormEvent } from "react"
import { format } from "date-fns"
import { Baby, CalendarDays, ClipboardList, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { MaternalDelivery, MaternalPregnancy, UpdateDeliveryOutcomeInput } from "../api"

const inputClass = "h-8 bg-muted/70 text-xs dark:bg-muted/60"

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

type NewbornDraft = {
  newborn_id?: string
  sex: string
  birthWeight: string
  status: string
  apgar: string
}

const newNewborn = (): NewbornDraft => ({ sex: "", birthWeight: "", status: "Alive", apgar: "" })

const standardDeliveryModes = [
  "Normal Spontaneous Vaginal Delivery",
  "Spontaneous Vaginal Delivery (SVD)",
  "Cesarean Section",
  "Cesarean Section (C-Section)",
  "Assisted Vaginal Delivery",
  "Breech Extraction",
  "Vacuum / Forceps Assisted",
  "Other",
]

const standardMaternalOutcomes = [
  "Alive",
  "Complicated",
  "Deceased",
  "Maternal Death",
]

export function EditDeliveryDialog({
  open,
  onOpenChange,
  delivery,
  pregnancies = [],
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  delivery: MaternalDelivery | null
  pregnancies?: MaternalPregnancy[]
  onSave: (deliveryId: string, input: UpdateDeliveryOutcomeInput) => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [pregnancyId, setPregnancyId] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [place, setPlace] = useState("")
  const [mode, setMode] = useState("")
  const [attendant, setAttendant] = useState("")
  const [maternalOutcome, setMaternalOutcome] = useState("Alive")
  const [laborHours, setLaborHours] = useState("")
  const [bloodLoss, setBloodLoss] = useState("")
  const [complications, setComplications] = useState("")
  const [breastfeeding, setBreastfeeding] = useState(false)
  const [includeNewborns, setIncludeNewborns] = useState(true)
  const [newborns, setNewborns] = useState<NewbornDraft[]>([newNewborn()])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !delivery) return
    setStep(0)
    setPregnancyId(delivery.pregnancy_id ?? "")
    setDeliveryDate(safeDate(delivery.delivery_date) || format(new Date(), "yyyy-MM-dd"))
    setPlace(delivery.place_of_delivery ?? "")
    setMode(delivery.mode_of_delivery ?? "Normal Spontaneous Vaginal Delivery")
    setAttendant(delivery.birth_attendant ?? "")
    setMaternalOutcome(delivery.maternal_outcome ?? "Alive")
    setLaborHours(parseDecimalString(delivery.duration_of_labor_hours))
    setBloodLoss(parseDecimalString(delivery.blood_loss_ml))
    setComplications(delivery.delivery_complications ?? "")
    setBreastfeeding(Boolean(delivery.immediate_breastfeeding))

    const existingNewborns = delivery.newbornRecords ?? []
    if (existingNewborns.length > 0) {
      setIncludeNewborns(true)
      setNewborns(
        existingNewborns.map((nb) => ({
          newborn_id: nb.newborn_id,
          sex: nb.sex || "",
          birthWeight: parseDecimalString(nb.birth_weight_kg),
          status: nb.status_at_birth || "Alive",
          apgar: nb.apgar_score != null ? String(nb.apgar_score) : "",
        }))
      )
    } else {
      setIncludeNewborns(false)
      setNewborns([newNewborn()])
    }
  }, [open, delivery])

  const deliveryModes = mode && !standardDeliveryModes.includes(mode)
    ? [mode, ...standardDeliveryModes]
    : standardDeliveryModes

  const maternalOutcomes = maternalOutcome && !standardMaternalOutcomes.includes(maternalOutcome)
    ? [maternalOutcome, ...standardMaternalOutcomes]
    : standardMaternalOutcomes

  const validateDeliveryDetails = () => {
    if (!deliveryDate || !place.trim() || !mode) {
      toast.error("Complete the required delivery details")
      return false
    }
    return true
  }

  const validateNewborns = () => {
    if (!includeNewborns) return true
    const invalid = newborns.some(
      (nb) =>
        !nb.sex ||
        !nb.birthWeight ||
        Number(nb.birthWeight) <= 0 ||
        nb.apgar === "" ||
        Number(nb.apgar) < 0 ||
        Number(nb.apgar) > 10 ||
        !nb.status
    )
    if (invalid) {
      toast.error("Complete all required details for each newborn")
      return false
    }
    return true
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!delivery) return
    if (!validateDeliveryDetails()) {
      setStep(0)
      return
    }
    if (!validateNewborns()) {
      setStep(1)
      return
    }

    setIsSaving(true)
    try {
      await onSave(delivery.delivery_id, {
        pregnancy_id: pregnancyId || delivery.pregnancy_id,
        delivery_date: deliveryDate,
        place_of_delivery: place.trim(),
        mode_of_delivery: mode,
        birth_attendant: attendant.trim() || undefined,
        maternal_outcome: maternalOutcome,
        immediate_breastfeeding: breastfeeding,
        duration_of_labor_hours: laborHours ? parseFloat(laborHours) : null,
        blood_loss_ml: bloodLoss ? parseInt(bloodLoss, 10) : null,
        delivery_complications: complications.trim() || undefined,
        version: delivery.version,
        newborns: includeNewborns
          ? newborns.map((nb) => ({
              newborn_id: nb.newborn_id,
              sex: nb.sex || "Indeterminate",
              birth_weight_kg: Number(nb.birthWeight) || 0,
              status_at_birth: nb.status || "Alive",
              apgar_score: Number(nb.apgar) || 0,
            }))
          : [],
      })
      toast.success("Delivery record updated")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update delivery record")
    } finally {
      setIsSaving(false)
    }
  }

  const progress = step === 0 ? 50 : 100
  const progressClass = step === 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-300"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl grid-cols-1 gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground sm:max-w-4xl md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border bg-muted/30 px-5 py-4 md:border-b-0 md:border-r md:px-6 md:py-6">
          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-base font-semibold">Edit Delivery Record</DialogTitle>
            <DialogDescription className="text-xs">Update delivery outcome and newborn details.</DialogDescription>
          </DialogHeader>
          <nav aria-label="Delivery record steps" className="mt-4 flex gap-1 overflow-x-auto md:mt-8 md:flex-col">
            {["Delivery details", "Newborn records"].map((label, index) => {
              const Icon = index === 0 ? CalendarDays : Baby
              return (
                <button
                  key={label}
                  type="button"
                  aria-current={step === index ? "step" : undefined}
                  onClick={() => setStep(index)}
                  className={`flex min-w-max items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors md:w-full ${
                    step === index
                      ? "bg-background font-medium text-foreground dark:shadow-sm"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </button>
              )
            })}
          </nav>
          <div className="mt-auto hidden pt-8 md:block">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {step + 1} of 2</span>
              <span className={`font-medium ${progressClass}`}>{progress}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Delivery record progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundImage: "linear-gradient(90deg, #ef4444 0%, #f59e0b 55%, #22c55e 100%)",
                  backgroundSize: `${10000 / progress}% 100%`,
                }}
              />
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <DialogHeader className="shrink-0 px-5 pb-1 pt-5 sm:px-6 md:pt-6">
            <h2 className="pr-8 text-sm font-semibold">{step === 0 ? "Delivery details" : "Newborn records"}</h2>
          </DialogHeader>

          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
              <div className="flex w-full max-w-2xl flex-col gap-4">
                {step === 0 ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {pregnancies.length > 0 && (
                        <Field id="edit-delivery-pregnancy" label="Target Pregnancy" required>
                          <Select value={pregnancyId} onValueChange={setPregnancyId}>
                            <SelectTrigger id="edit-delivery-pregnancy" className="h-8 w-full text-xs">
                              <SelectValue placeholder="Select pregnancy" />
                            </SelectTrigger>
                            <SelectContent>
                              {pregnancies.map((p) => (
                                <SelectItem key={p.pregnancy_id} value={p.pregnancy_id}>
                                  G{p.gravida ?? "—"} P{p.parity ?? "—"} · LMP {p.lmp_date ? safeDate(p.lmp_date) : "Not recorded"} · {p.pregnancy_status ?? "Active"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}

                      <Field id="edit-delivery-date" label="Delivery Date" required>
                        <DateInput id="edit-delivery-date" value={deliveryDate} onChange={setDeliveryDate} disableFuture />
                      </Field>

                      <Field id="edit-delivery-place" label="Place / Facility of Delivery" required>
                        <Input
                          id="edit-delivery-place"
                          value={place}
                          onChange={(e) => setPlace(e.target.value)}
                          placeholder="e.g. Silang RHU 1"
                          className={inputClass}
                        />
                      </Field>

                      <Field id="edit-delivery-mode" label="Mode of Delivery" required>
                        <Select value={mode} onValueChange={setMode}>
                          <SelectTrigger id="edit-delivery-mode" className={inputClass}>
                            <SelectValue placeholder="Select delivery mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {deliveryModes.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field id="edit-delivery-attendant" label="Birth Attendant">
                        <Input
                          id="edit-delivery-attendant"
                          value={attendant}
                          onChange={(e) => setAttendant(e.target.value)}
                          placeholder="Doctor, midwife, or nurse"
                          className={inputClass}
                        />
                      </Field>

                      <Field id="edit-delivery-outcome" label="Maternal Outcome" required>
                        <Select value={maternalOutcome} onValueChange={setMaternalOutcome}>
                          <SelectTrigger id="edit-delivery-outcome" className={inputClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {maternalOutcomes.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field id="edit-delivery-labor-hours" label="Labor Duration (hours)">
                        <Input
                          id="edit-delivery-labor-hours"
                          type="number"
                          step="0.1"
                          min="0"
                          value={laborHours}
                          onChange={(e) => setLaborHours(e.target.value)}
                          placeholder="e.g. 6.5"
                          className={inputClass}
                        />
                      </Field>

                      <Field id="edit-delivery-blood-loss" label="Estimated Blood Loss (mL)">
                        <Input
                          id="edit-delivery-blood-loss"
                          type="number"
                          min="0"
                          value={bloodLoss}
                          onChange={(e) => setBloodLoss(e.target.value)}
                          placeholder="e.g. 350"
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <div className="flex items-center gap-2 rounded-md border border-border p-3">
                      <Checkbox
                        id="edit-delivery-breastfeeding"
                        checked={breastfeeding}
                        onCheckedChange={(checked) => setBreastfeeding(Boolean(checked))}
                      />
                      <Label htmlFor="edit-delivery-breastfeeding" className="text-xs font-normal cursor-pointer">
                        Immediate and uninterrupted skin-to-skin contact / breastfeeding initiated
                      </Label>
                    </div>

                    <Field id="edit-delivery-complications" label="Complications & Clinical Notes">
                      <Textarea
                        id="edit-delivery-complications"
                        value={complications}
                        onChange={(e) => setComplications(e.target.value)}
                        placeholder="Record any maternal or delivery complications, lacerations, or procedures..."
                        className="min-h-20 bg-muted/70 text-xs dark:bg-muted/60"
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md bg-muted/40 px-3 py-2.5 text-xs">
                      <Checkbox
                        checked={includeNewborns}
                        onCheckedChange={(checked) => setIncludeNewborns(checked === true)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">Record newborn details</span>
                        <span className="mt-0.5 block text-muted-foreground">
                          Record each newborn linked to this delivery.
                        </span>
                      </span>
                    </label>

                    {includeNewborns && (
                      <div className="flex flex-col gap-3">
                        {newborns.map((newborn, index) => (
                          <section key={newborn.newborn_id ?? index} className="rounded-md border border-sidebar-border p-3">
                            <div className="mb-3 flex items-center justify-between">
                              <h3 className="text-xs font-semibold">Newborn {index + 1}</h3>
                              {newborns.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Remove newborn ${index + 1}`}
                                  onClick={() => setNewborns((curr) => curr.filter((_, idx) => idx !== index))}
                                  className="size-7 text-muted-foreground"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field id={`edit-newborn-sex-${index}`} label="Sex" required>
                                <Select
                                  value={newborn.sex}
                                  onValueChange={(val) =>
                                    setNewborns((curr) =>
                                      curr.map((item, idx) => (idx === index ? { ...item, sex: val } : item))
                                    )
                                  }
                                >
                                  <SelectTrigger id={`edit-newborn-sex-${index}`} className="h-8 w-full text-xs">
                                    <SelectValue placeholder="Select sex" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Indeterminate">Indeterminate</SelectItem>
                                    <SelectItem value="Unknown">Unknown</SelectItem>
                                  </SelectContent>
                                </Select>
                              </Field>

                              <Field id={`edit-newborn-weight-${index}`} label="Birth Weight (kg)" required>
                                <Input
                                  id={`edit-newborn-weight-${index}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={newborn.birthWeight}
                                  onChange={(e) =>
                                    setNewborns((curr) =>
                                      curr.map((item, idx) => (idx === index ? { ...item, birthWeight: e.target.value } : item))
                                    )
                                  }
                                  placeholder="e.g. 3.2"
                                  className={inputClass}
                                />
                              </Field>

                              <Field id={`edit-newborn-status-${index}`} label="Status at Birth" required>
                                <Select
                                  value={newborn.status}
                                  onValueChange={(val) =>
                                    setNewborns((curr) =>
                                      curr.map((item, idx) => (idx === index ? { ...item, status: val } : item))
                                    )
                                  }
                                >
                                  <SelectTrigger id={`edit-newborn-status-${index}`} className="h-8 w-full text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Alive">Alive</SelectItem>
                                    <SelectItem value="Stillbirth">Stillbirth</SelectItem>
                                    <SelectItem value="Referred">Referred</SelectItem>
                                  </SelectContent>
                                </Select>
                              </Field>

                              <Field id={`edit-newborn-apgar-${index}`} label="APGAR Score" required>
                                <Input
                                  id={`edit-newborn-apgar-${index}`}
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={newborn.apgar}
                                  onChange={(e) =>
                                    setNewborns((curr) =>
                                      curr.map((item, idx) => (idx === index ? { ...item, apgar: e.target.value } : item))
                                    )
                                  }
                                  placeholder="0–10"
                                  className={inputClass}
                                />
                              </Field>
                            </div>
                          </section>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setNewborns((curr) => [...curr, newNewborn()])}
                          className="h-8 w-fit gap-1.5 px-2.5 text-xs"
                        >
                          <Plus className="size-3.5" />
                          Add newborn
                        </Button>
                      </div>
                    )}

                    {!includeNewborns && (
                      <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                        <ClipboardList className="mt-0.5 size-4 shrink-0" />
                        <p>No newborn records are currently associated with this delivery outcome.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 px-5 pb-5 pt-3 sm:px-6 md:pb-6">
              <div className="ml-auto flex w-full max-w-2xl items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (step === 0 ? onOpenChange(false) : setStep(0))}
                  className="h-9 min-w-24 rounded-md px-4 text-xs font-medium"
                  disabled={isSaving}
                >
                  {step === 0 ? "Cancel" : "Back"}
                </Button>
                <div className="flex items-center gap-2">
                  {step === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (validateDeliveryDetails()) setStep(1)
                      }}
                      className="h-9 rounded-md px-4 text-xs font-medium"
                      disabled={isSaving}
                    >
                      Newborns →
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="h-9 min-w-32 rounded-md px-4 text-xs font-medium"
                  >
                    {isSaving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  )
}
