import { useState, type FormEvent } from "react"
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
import type { MaternalPregnancy, RegisterDeliveryOutcomeInput } from "../api"

const inputClass = "h-8 bg-muted/70 text-xs dark:bg-muted/60"

function RequiredLabel({ htmlFor, children, required = false }: { htmlFor: string; children: string; required?: boolean }) {
  return <Label htmlFor={htmlFor} className="text-xs font-medium">{children}{required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}</Label>
}

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1.5"><RequiredLabel htmlFor={id} required={required}>{label}</RequiredLabel>{children}</div>
}

type NewbornDraft = { sex: string; birthWeight: string; status: string; apgar: string }
const newNewborn = (): NewbornDraft => ({ sex: "", birthWeight: "", status: "Alive", apgar: "" })

export function DeliveryOutcomeDialog({ open, onOpenChange, pregnancies, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pregnancies: MaternalPregnancy[]
  onSave: (input: RegisterDeliveryOutcomeInput) => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const activePregnancy = pregnancies.find((pregnancy) => pregnancy.pregnancy_status?.toLowerCase() === "active") ?? pregnancies[0]
  const [pregnancyId, setPregnancyId] = useState("")
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), "yyyy-MM-dd"))
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

  const selectedPregnancyId = pregnancyId || activePregnancy?.pregnancy_id || ""
  const deliveryDetailsAreValid = () => {
    if (!selectedPregnancyId || !deliveryDate || !place.trim() || !mode) {
      toast.error("Complete the required pregnancy and delivery details")
      return false
    }
    return true
  }
  const reset = () => {
    setStep(0)
    setPregnancyId("")
    setDeliveryDate(format(new Date(), "yyyy-MM-dd"))
    setPlace("")
    setMode("")
    setAttendant("")
    setMaternalOutcome("Alive")
    setLaborHours("")
    setBloodLoss("")
    setComplications("")
    setBreastfeeding(false)
    setIncludeNewborns(true)
    setNewborns([newNewborn()])
  }
  const close = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }
  const goToStep = (nextStep: number) => {
    if (nextStep > step && !deliveryDetailsAreValid()) return
    setStep(nextStep)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step === 0) {
      if (!deliveryDetailsAreValid()) return
      setStep(1)
      return
    }
    if (!deliveryDetailsAreValid()) { setStep(0); return }
    if (includeNewborns && newborns.some((newborn) => !newborn.sex || !newborn.birthWeight || Number(newborn.birthWeight) <= 0 || newborn.apgar === "" || Number(newborn.apgar) < 0 || Number(newborn.apgar) > 10 || !newborn.status)) {
      toast.error("Complete the required details for each newborn")
      return
    }
    setIsSaving(true)
    try {
      await onSave({
        pregnancy_id: selectedPregnancyId,
        delivery_date: deliveryDate,
        place_of_delivery: place.trim(),
        mode_of_delivery: mode,
        birth_attendant: attendant.trim() || undefined,
        maternal_outcome: maternalOutcome,
        immediate_breastfeeding: breastfeeding,
        duration_of_labor_hours: laborHours ? Number(laborHours) : undefined,
        blood_loss_ml: bloodLoss ? Number(bloodLoss) : undefined,
        delivery_complications: complications.trim() || undefined,
        newborns: includeNewborns ? newborns.map((newborn) => ({
          sex: newborn.sex,
          birth_weight_kg: Number(newborn.birthWeight),
          status_at_birth: newborn.status,
          apgar_score: Number(newborn.apgar),
        })) : [],
      })
      close(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the delivery record")
    } finally {
      setIsSaving(false)
    }
  }

  const progress = step === 0 ? 50 : 100
  const progressClass = step === 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-300"

  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="grid max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl grid-cols-1 gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground sm:max-w-4xl md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-border bg-muted/30 px-5 py-4 md:border-b-0 md:border-r md:px-6 md:py-6">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-base font-semibold">Record Delivery</DialogTitle>
          <DialogDescription className="text-xs">Document delivery and newborn outcomes.</DialogDescription>
        </DialogHeader>
        <nav aria-label="Delivery record steps" className="mt-4 flex gap-1 overflow-x-auto md:mt-8 md:flex-col">
          {["Delivery details", "Newborn records"].map((label, index) => {
            const Icon = index === 0 ? CalendarDays : Baby
            return <button key={label} type="button" aria-current={step === index ? "step" : undefined} onClick={() => goToStep(index)} className={`flex min-w-max items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors md:w-full ${step === index ? "bg-background font-medium text-foreground dark:shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}><Icon className="size-4 shrink-0" /><span>{label}</span></button>
          })}
        </nav>
        <div className="mt-auto hidden pt-8 md:block">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>Step {step + 1} of 2</span><span className={`font-medium ${progressClass}`}>{progress}%</span></div>
          <div role="progressbar" aria-label="Delivery record progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%`, backgroundImage: "linear-gradient(90deg, #ef4444 0%, #f59e0b 55%, #22c55e 100%)", backgroundSize: `${10000 / progress}% 100%` }} /></div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <DialogHeader className="shrink-0 px-5 pb-1 pt-5 sm:px-6 md:pt-6"><h2 className="pr-8 text-sm font-semibold">{step === 0 ? "Delivery details" : "Newborn records"}</h2></DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
            <div className="flex w-full max-w-2xl flex-col gap-4">
              {step === 0 ? <>
                <section className="grid gap-3 sm:grid-cols-2">
                  <Field id="delivery-pregnancy" label="Target Pregnancy" required>
                    <Select value={selectedPregnancyId} onValueChange={setPregnancyId}><SelectTrigger id="delivery-pregnancy" className="h-8 w-full text-xs"><SelectValue placeholder="Select pregnancy" /></SelectTrigger><SelectContent>{pregnancies.map((pregnancy) => <SelectItem key={pregnancy.pregnancy_id} value={pregnancy.pregnancy_id}>G{pregnancy.gravida ?? "—"} P{pregnancy.parity ?? "—"} · LMP {pregnancy.lmp_date ? format(new Date(pregnancy.lmp_date), "MM/dd/yyyy") : "Not recorded"} · {pregnancy.pregnancy_status ?? "Active"}</SelectItem>)}</SelectContent></Select>
                  </Field>
                  <Field id="delivery-date" label="Delivery Date" required><DateInput id="delivery-date" value={deliveryDate} onChange={setDeliveryDate} /></Field>
                  <Field id="delivery-place" label="Place / Facility of Delivery" required><Input id="delivery-place" value={place} onChange={(event) => setPlace(event.target.value)} placeholder="e.g. Rural Health Unit 1" className={inputClass} /></Field>
                  <Field id="delivery-mode" label="Mode of Delivery" required>
                    <Select value={mode} onValueChange={setMode}><SelectTrigger id="delivery-mode" className="h-8 w-full text-xs"><SelectValue placeholder="Select delivery mode" /></SelectTrigger><SelectContent><SelectItem value="Normal Spontaneous Vaginal Delivery">Normal Spontaneous Vaginal Delivery</SelectItem><SelectItem value="Cesarean Section">Cesarean Section</SelectItem><SelectItem value="Assisted Vaginal Delivery">Assisted Vaginal Delivery</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
                  </Field>
                  <Field id="delivery-attendant" label="Birth Attendant"><Input id="delivery-attendant" value={attendant} onChange={(event) => setAttendant(event.target.value)} placeholder="Name or role" className={inputClass} /></Field>
                  <Field id="maternal-outcome" label="Maternal Outcome" required>
                    <Select value={maternalOutcome} onValueChange={setMaternalOutcome}><SelectTrigger id="maternal-outcome" className="h-8 w-full text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alive">Alive</SelectItem><SelectItem value="Complicated">Complicated</SelectItem><SelectItem value="Deceased">Deceased</SelectItem></SelectContent></Select>
                  </Field>
                  <Field id="labor-duration" label="Labor Duration (hours)"><Input id="labor-duration" type="number" min="0" step="0.1" value={laborHours} onChange={(event) => setLaborHours(event.target.value)} placeholder="e.g. 6.5" className={inputClass} /></Field>
                  <Field id="blood-loss" label="Blood Loss (mL)"><Input id="blood-loss" type="number" min="0" value={bloodLoss} onChange={(event) => setBloodLoss(event.target.value)} placeholder="e.g. 250" className={inputClass} /></Field>
                </section>
                <label className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={breastfeeding} onCheckedChange={(checked) => setBreastfeeding(checked === true)} />Immediate breastfeeding initiated</label>
                <Field id="delivery-complications" label="Complications / Clinical Notes"><Textarea id="delivery-complications" value={complications} onChange={(event) => setComplications(event.target.value)} placeholder="Document complications or relevant observations..." className="min-h-20 text-xs" /></Field>
              </> : <>
                <label className="flex cursor-pointer items-start gap-2 rounded-md bg-muted/40 px-3 py-2.5 text-xs"><Checkbox checked={includeNewborns} onCheckedChange={(checked) => setIncludeNewborns(checked === true)} className="mt-0.5" /><span><span className="font-medium">Add newborn details</span><span className="mt-0.5 block text-muted-foreground">Record each newborn linked to this delivery.</span></span></label>
                {includeNewborns && <div className="flex flex-col gap-3">
                  {newborns.map((newborn, index) => <section key={index} className="rounded-md border border-sidebar-border p-3">
                    <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold">Newborn {index + 1}</h3>{newborns.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={`Remove newborn ${index + 1}`} onClick={() => setNewborns((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="size-7 text-muted-foreground"><Trash2 className="size-3.5" /></Button>}</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field id={`newborn-sex-${index}`} label="Sex" required><Select value={newborn.sex} onValueChange={(value) => setNewborns((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sex: value } : item))}><SelectTrigger id={`newborn-sex-${index}`} className="h-8 w-full text-xs"><SelectValue placeholder="Select sex" /></SelectTrigger><SelectContent><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Ambiguous">Ambiguous</SelectItem><SelectItem value="Unknown">Unknown</SelectItem></SelectContent></Select></Field>
                      <Field id={`newborn-weight-${index}`} label="Birth Weight (kg)" required><Input id={`newborn-weight-${index}`} type="number" min="0" step="0.01" value={newborn.birthWeight} onChange={(event) => setNewborns((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, birthWeight: event.target.value } : item))} placeholder="e.g. 3.2" className={inputClass} /></Field>
                      <Field id={`newborn-status-${index}`} label="Status at Birth" required><Select value={newborn.status} onValueChange={(value) => setNewborns((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: value } : item))}><SelectTrigger id={`newborn-status-${index}`} className="h-8 w-full text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alive">Alive</SelectItem><SelectItem value="Stillbirth">Stillbirth</SelectItem><SelectItem value="Referred">Referred</SelectItem></SelectContent></Select></Field>
                      <Field id={`newborn-apgar-${index}`} label="APGAR Score" required><Input id={`newborn-apgar-${index}`} type="number" min="0" max="10" value={newborn.apgar} onChange={(event) => setNewborns((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, apgar: event.target.value } : item))} placeholder="0–10" className={inputClass} /></Field>
                    </div>
                  </section>)}
                  <Button type="button" variant="outline" onClick={() => setNewborns((current) => [...current, newNewborn()])} className="h-8 w-fit gap-1.5 px-2.5 text-xs"><Plus className="size-3.5" />Add newborn</Button>
                </div>}
                {!includeNewborns && <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground"><ClipboardList className="mt-0.5 size-4 shrink-0" /><p>You can save the maternal delivery outcome without newborn details and add them later through the delivery record.</p></div>}
              </>}
            </div>
          </div>
          <div className="shrink-0 px-5 pb-5 pt-3 sm:px-6 md:pb-6">
            <div className={`ml-auto flex w-full max-w-2xl items-center gap-3 ${step > 0 ? "justify-between" : "justify-end"}`}>
              {step > 0 && <Button type="button" variant="outline" onClick={() => setStep(0)} className="h-9 min-w-24 rounded-md px-4 text-xs font-medium">Back</Button>}
              <Button type="submit" disabled={isSaving || pregnancies.length === 0} className="h-9 min-w-32 rounded-md px-4 text-xs font-medium">{isSaving ? "Saving…" : step === 0 ? "Continue" : "Save Delivery"}</Button>
            </div>
          </div>
        </form>
      </section>
    </DialogContent>
  </Dialog>
}
