import { useEffect, useState, type FormEvent } from "react"
import { format } from "date-fns"
import { Baby } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { MaternalDelivery, UpdateDeliveryOutcomeInput } from "../api"

const inputClass = "h-8 bg-muted/70 text-xs dark:bg-muted/60"

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

export function EditDeliveryDialog({
  open,
  onOpenChange,
  delivery,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  delivery: MaternalDelivery | null
  onSave: (deliveryId: string, input: UpdateDeliveryOutcomeInput) => Promise<void>
}) {
  const [deliveryDate, setDeliveryDate] = useState("")
  const [place, setPlace] = useState("")
  const [mode, setMode] = useState("")
  const [attendant, setAttendant] = useState("")
  const [maternalOutcome, setMaternalOutcome] = useState("Alive")
  const [laborHours, setLaborHours] = useState("")
  const [bloodLoss, setBloodLoss] = useState("")
  const [complications, setComplications] = useState("")
  const [breastfeeding, setBreastfeeding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !delivery) return
    const initialDate = delivery.delivery_date
      ? format(new Date(delivery.delivery_date), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
    setDeliveryDate(initialDate)
    setPlace(delivery.place_of_delivery ?? "")
    setMode(delivery.mode_of_delivery ?? "Spontaneous Vaginal Delivery (SVD)")
    setAttendant(delivery.birth_attendant ?? "")
    setMaternalOutcome(delivery.maternal_outcome ?? "Alive")
    setLaborHours(delivery.duration_of_labor_hours != null ? String(delivery.duration_of_labor_hours) : "")
    setBloodLoss(delivery.blood_loss_ml != null ? String(delivery.blood_loss_ml) : "")
    setComplications(delivery.delivery_complications ?? "")
    setBreastfeeding(Boolean(delivery.immediate_breastfeeding))
  }, [open, delivery])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!delivery) return
    if (!deliveryDate || !place.trim() || !mode) {
      toast.error("Complete the required delivery details")
      return
    }

    setIsSaving(true)
    try {
      await onSave(delivery.delivery_id, {
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
      })
      toast.success("Delivery record updated")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update delivery record")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Baby className="size-5 text-primary" />
            <DialogTitle className="text-base font-semibold">Edit Delivery Record</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Update delivery outcome details and maternal birth record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="edit-delivery-date" label="Delivery Date" required>
              <DateInput id="edit-delivery-date" value={deliveryDate} onChange={setDeliveryDate} disableFuture />
            </Field>

            <Field id="edit-delivery-mode" label="Mode of Delivery" required>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="edit-delivery-mode" className={inputClass}>
                  <SelectValue placeholder="Select mode of delivery" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spontaneous Vaginal Delivery (SVD)">Spontaneous Vaginal Delivery (SVD)</SelectItem>
                  <SelectItem value="Cesarean Section (C-Section)">Cesarean Section (C-Section)</SelectItem>
                  <SelectItem value="Breech Extraction">Breech Extraction</SelectItem>
                  <SelectItem value="Vacuum / Forceps Assisted">Vacuum / Forceps Assisted</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="edit-delivery-place" label="Place of Delivery" required>
              <Input
                id="edit-delivery-place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g. Silang RHU 1"
                className={inputClass}
              />
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

            <Field id="edit-delivery-outcome" label="Maternal Outcome">
              <Select value={maternalOutcome} onValueChange={setMaternalOutcome}>
                <SelectTrigger id="edit-delivery-outcome" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alive">Alive</SelectItem>
                  <SelectItem value="Maternal Death">Maternal Death</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="edit-delivery-labor-hours" label="Labor Duration (hours)">
              <Input
                id="edit-delivery-labor-hours"
                type="number"
                step="0.5"
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
