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
import { toast } from "sonner"
import type { MaternalPregnancy, UpdatePregnancyInput } from "../api"

const inputClass = "h-8 bg-muted/70 text-xs dark:bg-muted/60"

function safeDate(val?: string | null): string {
  if (!val) return ""
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.slice(0, 10)
  }
  try {
    const d = new Date(val)
    return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd")
  } catch {
    return ""
  }
}

function parseDecimalString(val: unknown): string {
  if (val == null) return ""
  if (typeof val === "number") return String(val)
  if (typeof val === "string") return val
  if (typeof val === "object" && val !== null) {
    if ("toNumber" in val && typeof (val as { toNumber: () => number }).toNumber === "function") {
      return String((val as { toNumber: () => number }).toNumber())
    }
    if ("toString" in val && typeof (val as { toString: () => string }).toString === "function") {
      const s = (val as { toString: () => string }).toString()
      return s !== "[object Object]" ? s : ""
    }
  }
  return ""
}

function normalizeStatus(val?: string | null): string {
  if (!val) return "Active"
  const lower = val.toLowerCase().trim()
  if (lower === "active") return "Active"
  if (lower === "delivered") return "Delivered"
  if (lower === "postpartum") return "Postpartum"
  if (lower === "miscarriage") return "Miscarriage"
  if (lower === "stillbirth") return "Stillbirth"
  if (lower === "completed") return "Completed"
  return val
}

function normalizeAgeGroup(val?: string | null): string {
  if (!val) return "20-34 years"
  const lower = val.toLowerCase().trim()
  if (lower.includes("under 20") || lower === "adolescent") return "Under 20 years"
  if (lower.includes("35") || lower.includes("older")) return "35 years and older"
  if (lower.includes("20-34") || lower === "adult") return "20-34 years"
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
  const [gravida, setGravida] = useState(() => (pregnancy?.gravida != null ? String(pregnancy.gravida) : "1"))
  const [parity, setParity] = useState(() => (pregnancy?.parity != null ? String(pregnancy.parity) : "0"))
  const [lmpDate, setLmpDate] = useState(() => safeDate(pregnancy?.lmp_date))
  const [eddDate, setEddDate] = useState(() => safeDate(pregnancy?.edd_date))
  const [status, setStatus] = useState(() => normalizeStatus(pregnancy?.pregnancy_status))
  const [ageGroup, setAgeGroup] = useState(() => normalizeAgeGroup(pregnancy?.age_group))
  const [heightCm, setHeightCm] = useState(() => parseDecimalString(pregnancy?.height_cm))
  const [bmi, setBmi] = useState(() => parseDecimalString(pregnancy?.bmi_1st_trimester))
  const [completed8anc, setCompleted8anc] = useState(() => Boolean(pregnancy?.completed_8anc))
  const [prevCaesarean, setPrevCaesarean] = useState(() => Boolean(pregnancy?.prev_caesarean))
  const [consecutiveMiscarriages, setConsecutiveMiscarriages] = useState(() => Boolean(pregnancy?.consecutive_miscarriages))
  const [stillbirthHistory, setStillbirthHistory] = useState(() => Boolean(pregnancy?.stillbirth_history))
  const [pphHistory, setPphHistory] = useState(() => Boolean(pregnancy?.pph_history))
  const [previousDeliveryHistory, setPreviousDeliveryHistory] = useState(() => pregnancy?.previous_delivery_history ?? "")
  const [hasHeartDisease, setHasHeartDisease] = useState(() => Boolean(pregnancy?.has_heart_disease))
  const [hasDiabetes, setHasDiabetes] = useState(() => Boolean(pregnancy?.has_diabetes))
  const [hasTb, setHasTb] = useState(() => Boolean(pregnancy?.has_tb))
  const [hasAsthma, setHasAsthma] = useState(() => Boolean(pregnancy?.has_asthma))
  const [hasGoiter, setHasGoiter] = useState(() => Boolean(pregnancy?.has_goiter))
  const [coMorbidities, setCoMorbidities] = useState(() => pregnancy?.co_morbidities ?? "")
  const [dewormingGiven, setDewormingGiven] = useState(() => Boolean(pregnancy?.deworming_given))
  const [dewormingDate, setDewormingDate] = useState(() => safeDate(pregnancy?.deworming_date))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !pregnancy) return
    setGravida(pregnancy.gravida != null ? String(pregnancy.gravida) : "1")
    setParity(pregnancy.parity != null ? String(pregnancy.parity) : "0")
    setLmpDate(safeDate(pregnancy.lmp_date))
    setEddDate(safeDate(pregnancy.edd_date))
    setStatus(normalizeStatus(pregnancy.pregnancy_status))
    setAgeGroup(normalizeAgeGroup(pregnancy.age_group))
    setHeightCm(parseDecimalString(pregnancy.height_cm))
    setBmi(parseDecimalString(pregnancy.bmi_1st_trimester))
    setCompleted8anc(Boolean(pregnancy.completed_8anc))
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
    setDewormingDate(safeDate(pregnancy.deworming_date))
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
        completed_8anc: completed8anc,
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
        version: pregnancy.version,
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
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Postpartum">Postpartum</SelectItem>
                  <SelectItem value="Miscarriage">Miscarriage</SelectItem>
                  <SelectItem value="Stillbirth">Stillbirth</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="edit-pregnancy-age-group" label="Age Group">
              <Select value={ageGroup} onValueChange={setAgeGroup}>
                <SelectTrigger id="edit-pregnancy-age-group" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Under 20 years">Under 20 years</SelectItem>
                  <SelectItem value="20-34 years">20-34 years</SelectItem>
                  <SelectItem value="35 years and older">35 years and older</SelectItem>
                  <SelectItem value="Adolescent">Adolescent</SelectItem>
                  <SelectItem value="Adult">Adult</SelectItem>
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
              <CheckboxField id="risk-completed-8anc" label="Completed 8 ANC Visits" checked={completed8anc} onCheckedChange={setCompleted8anc} />
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
