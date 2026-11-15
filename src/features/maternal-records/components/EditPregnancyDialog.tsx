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
import type { MaternalPregnancy, UpdatePregnancyInput } from "../api"

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

function CheckboxField({ id, label, checked, onCheckedChange }: { id: string; label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(val) => onCheckedChange(Boolean(val))} />
      <Label htmlFor={id} className="text-xs font-normal cursor-pointer">
        {label}
      </Label>
    </div>
  )
}

export function EditPregnancyDialog({
  open,
  onOpenChange,
  pregnancy,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pregnancy: MaternalPregnancy | null
  onSave: (pregnancyId: string, input: UpdatePregnancyInput) => Promise<void>
}) {
  const [gravida, setGravida] = useState("1")
  const [parity, setParity] = useState("0")
  const [lmpDate, setLmpDate] = useState("")
  const [eddDate, setEddDate] = useState("")
  const [status, setStatus] = useState("Active")
  const [ageGroup, setAgeGroup] = useState("Adult")
  const [heightCm, setHeightCm] = useState("")
  const [bmi, setBmi] = useState("")
  const [prevCaesarean, setPrevCaesarean] = useState(false)
  const [consecutiveMiscarriages, setConsecutiveMiscarriages] = useState(false)
  const [stillbirthHistory, setStillbirthHistory] = useState(false)
  const [pphHistory, setPphHistory] = useState(false)
  const [previousDeliveryHistory, setPreviousDeliveryHistory] = useState("")
  const [hasHeartDisease, setHasHeartDisease] = useState(false)
  const [hasDiabetes, setHasDiabetes] = useState(false)
  const [hasTb, setHasTb] = useState(false)
  const [hasAsthma, setHasAsthma] = useState(false)
  const [hasGoiter, setHasGoiter] = useState(false)
  const [coMorbidities, setCoMorbidities] = useState("")
  const [dewormingGiven, setDewormingGiven] = useState(false)
  const [dewormingDate, setDewormingDate] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !pregnancy) return
    setGravida(pregnancy.gravida != null ? String(pregnancy.gravida) : "1")
    setParity(pregnancy.parity != null ? String(pregnancy.parity) : "0")
    setLmpDate(pregnancy.lmp_date ? format(new Date(pregnancy.lmp_date), "yyyy-MM-dd") : "")
    setEddDate(pregnancy.edd_date ? format(new Date(pregnancy.edd_date), "yyyy-MM-dd") : "")
    setStatus(pregnancy.pregnancy_status ?? "Active")
    setAgeGroup(pregnancy.age_group ?? "Adult")
    setHeightCm(pregnancy.height_cm != null ? String(pregnancy.height_cm) : "")
    setBmi(pregnancy.bmi_1st_trimester != null ? String(pregnancy.bmi_1st_trimester) : "")
    setPrevCaesarean(Boolean(pregnancy.prev_caesarean))
    setConsecutiveMiscarriages(Boolean(pregnancy.consecutive_miscarriages))
    setStillbirthHistory(Boolean(pregnancy.stillbirth_history))
    setPphHistory(Boolean(pregnancy.pph_history))
    setPreviousDeliveryHistory(pregnancy.previous_delivery_history ?? "")
    setHasHeartDisease(Boolean(pregnancy.has_heart_disease))
    setHasDiabetes(Boolean(pregnancy.has_diabetes))
    setHasTb(Boolean(pregnancy.has_tb))
    setHasAsthma(Boolean(pregnancy.has_asthma))
    setHasGoiter(Boolean(pregnancy.has_goiter))
    setCoMorbidities(pregnancy.co_morbidities ?? "")
    setDewormingGiven(Boolean(pregnancy.deworming_given))
    setDewormingDate(pregnancy.deworming_date ? format(new Date(pregnancy.deworming_date), "yyyy-MM-dd") : "")
  }, [open, pregnancy])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pregnancy) return
    if (!lmpDate) {
      toast.error("Enter the Last Menstrual Period (LMP) date")
      return
    }

    setIsSaving(true)
    try {
      await onSave(pregnancy.pregnancy_id, {
        gravida: parseInt(gravida, 10) || 1,
        parity: parseInt(parity, 10) || 0,
        lmp_date: lmpDate,
        edd_date: eddDate || undefined,
        pregnancy_status: status,
        age_group: ageGroup,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        bmi_1st_trimester: bmi ? parseFloat(bmi) : null,
        prev_caesarean: prevCaesarean,
        consecutive_miscarriages: consecutiveMiscarriages,
        stillbirth_history: stillbirthHistory,
        pph_history: pphHistory,
        previous_delivery_history: previousDeliveryHistory.trim() || undefined,
        has_heart_disease: hasHeartDisease,
        has_diabetes: hasDiabetes,
        has_tb: hasTb,
        has_asthma: hasAsthma,
        has_goiter: hasGoiter,
        co_morbidities: coMorbidities.trim() || undefined,
        deworming_given: dewormingGiven,
        deworming_date: dewormingGiven && dewormingDate ? dewormingDate : null,
      })
      toast.success("Pregnancy record updated")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update pregnancy record")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Baby className="size-5 text-primary" />
            <DialogTitle className="text-base font-semibold">Edit Pregnancy Profile</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Update gestational parameters, risk profile, and clinical status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field id="edit-pregnancy-gravida" label="Gravida" required>
              <Input
                id="edit-pregnancy-gravida"
                type="number"
                min="1"
                value={gravida}
                onChange={(e) => setGravida(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field id="edit-pregnancy-parity" label="Parity" required>
              <Input
                id="edit-pregnancy-parity"
                type="number"
                min="0"
                value={parity}
                onChange={(e) => setParity(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field id="edit-pregnancy-status" label="Status" required>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="edit-pregnancy-status" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Postpartum">Postpartum</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="edit-pregnancy-age-group" label="Age Group">
              <Select value={ageGroup} onValueChange={setAgeGroup}>
                <SelectTrigger id="edit-pregnancy-age-group" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Adult">Adult</SelectItem>
                  <SelectItem value="Adolescent">Adolescent</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="edit-pregnancy-lmp" label="Last Menstrual Period (LMP)" required>
              <DateInput id="edit-pregnancy-lmp" value={lmpDate} onChange={setLmpDate} disableFuture />
            </Field>

            <Field id="edit-pregnancy-edd" label="Expected Date of Delivery (EDD)">
              <DateInput id="edit-pregnancy-edd" value={eddDate} onChange={setEddDate} />
            </Field>

            <Field id="edit-pregnancy-height" label="Height (cm)">
              <Input
                id="edit-pregnancy-height"
                type="number"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="e.g. 155"
                className={inputClass}
              />
            </Field>

            <Field id="edit-pregnancy-bmi" label="1st Trimester BMI">
              <Input
                id="edit-pregnancy-bmi"
                type="number"
                step="0.1"
                value={bmi}
                onChange={(e) => setBmi(e.target.value)}
                placeholder="e.g. 22.4"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="rounded-md border border-border p-3 space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Obstetric High-Risk History</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
              <CheckboxField id="risk-prev-cs" label="Previous Cesarean Section" checked={prevCaesarean} onCheckedChange={setPrevCaesarean} />
              <CheckboxField id="risk-consec-misc" label="3+ Consecutive Miscarriages" checked={consecutiveMiscarriages} onCheckedChange={setConsecutiveMiscarriages} />
              <CheckboxField id="risk-stillbirth" label="Stillbirth History" checked={stillbirthHistory} onCheckedChange={setStillbirthHistory} />
              <CheckboxField id="risk-pph" label="Postpartum Hemorrhage History" checked={pphHistory} onCheckedChange={setPphHistory} />
            </div>
            <Input
              id="risk-notes"
              value={previousDeliveryHistory}
              onChange={(e) => setPreviousDeliveryHistory(e.target.value)}
              placeholder="Additional delivery history notes..."
              className={inputClass}
            />
          </div>

          <div className="rounded-md border border-border p-3 space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Pre-existing & Chronic Conditions</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 pt-1">
              <CheckboxField id="cond-heart" label="Heart Disease" checked={hasHeartDisease} onCheckedChange={setHasHeartDisease} />
              <CheckboxField id="cond-diabetes" label="Diabetes" checked={hasDiabetes} onCheckedChange={setHasDiabetes} />
              <CheckboxField id="cond-tb" label="Tuberculosis" checked={hasTb} onCheckedChange={setHasTb} />
              <CheckboxField id="cond-asthma" label="Bronchial Asthma" checked={hasAsthma} onCheckedChange={setHasAsthma} />
              <CheckboxField id="cond-goiter" label="Goiter / Thyroid" checked={hasGoiter} onCheckedChange={setHasGoiter} />
            </div>
            <Input
              id="cond-comorbidities"
              value={coMorbidities}
              onChange={(e) => setCoMorbidities(e.target.value)}
              placeholder="Other chronic conditions or medical notes..."
              className={inputClass}
            />
          </div>

          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <CheckboxField id="safeguard-deworming" label="Deworming tablet administered" checked={dewormingGiven} onCheckedChange={setDewormingGiven} />
              {dewormingGiven && (
                <div className="w-48">
                  <DateInput id="safeguard-deworming-date" value={dewormingDate} onChange={setDewormingDate} disableFuture />
                </div>
              )}
            </div>
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
