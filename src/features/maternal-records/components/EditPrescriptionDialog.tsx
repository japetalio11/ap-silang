import { useEffect, useState, type FormEvent } from "react"
import { format } from "date-fns"
import { Pill } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import type { MaternalPregnancy, MaternalSupplement, UpdateMaternalSupplementInput } from "../api"

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

function pregnancyLabel(pregnancy: MaternalPregnancy, index: number) {
  const lmp = pregnancy.lmp_date ? format(new Date(pregnancy.lmp_date), "MM/dd/yyyy") : "LMP not recorded"
  return `Pregnancy #${index + 1} · G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"} · ${lmp}`
}

export function EditPrescriptionDialog({
  open,
  onOpenChange,
  prescription,
  pregnancies,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  prescription: MaternalSupplement | null
  pregnancies: MaternalPregnancy[]
  onSave: (input: UpdateMaternalSupplementInput) => Promise<void>
}) {
  const [medication, setMedication] = useState("")
  const [count, setCount] = useState("30")
  const [dateGiven, setDateGiven] = useState("")
  const [pregnancyId, setPregnancyId] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !prescription) return
    setMedication(prescription.supplement_type ?? "")
    setCount(prescription.tablets_given_count != null ? String(prescription.tablets_given_count) : "30")
    const initialDate = prescription.date_given
      ? format(new Date(prescription.date_given), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
    setDateGiven(initialDate)
    setPregnancyId(prescription.pregnancy_id ?? pregnancies[0]?.pregnancy_id ?? "")
  }, [open, prescription, pregnancies])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!prescription) return
    if (!medication.trim()) {
      toast.error("Enter a medication or supplement name")
      return
    }
    const countNumber = parseInt(count, 10)
    if (Number.isNaN(countNumber) || countNumber <= 0) {
      toast.error("Enter at least 1 tablet")
      return
    }
    if (!dateGiven) {
      toast.error("Enter the date given")
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        supplement_id: prescription.supplement_id,
        supplement_type: medication.trim(),
        tablets_given_count: countNumber,
        date_given: dateGiven,
        pregnancy_id: pregnancyId || undefined,
      })
      toast.success("Prescription updated")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update prescription")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Pill className="size-5 text-primary" />
            <DialogTitle className="text-base font-semibold">Edit Prescription</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Update medication dosage, count, and dispensing date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-2">
          {pregnancies.length > 0 && (
            <Field id="edit-prescription-pregnancy" label="Associated Pregnancy">
              <Select value={pregnancyId} onValueChange={setPregnancyId}>
                <SelectTrigger id="edit-prescription-pregnancy" className={inputClass}>
                  <SelectValue placeholder="Select pregnancy" />
                </SelectTrigger>
                <SelectContent>
                  {pregnancies.map((p, idx) => (
                    <SelectItem key={p.pregnancy_id} value={p.pregnancy_id}>
                      {pregnancyLabel(p, idx)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field id="edit-prescription-medication" label="Medication / Supplement Name" required>
            <Input
              id="edit-prescription-medication"
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              placeholder="e.g. Ferrous Sulfate + Folic Acid"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="edit-prescription-count" label="Tablets Count" required>
              <Input
                id="edit-prescription-count"
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field id="edit-prescription-date" label="Date Given" required>
              <DateInput id="edit-prescription-date" value={dateGiven} onChange={setDateGiven} disableFuture />
            </Field>
          </div>

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
