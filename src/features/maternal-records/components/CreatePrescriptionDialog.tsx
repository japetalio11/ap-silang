import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { z } from "zod"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useAuthSession } from "@/features/auth/auth-session"
import { registerMaternalSupplement, type MaternalPregnancy, type RegisterMaternalSupplementInput } from "../api"

const prescriptionSchema = z.object({
  pregnancyId: z.string().trim().min(1, "Select a pregnancy."),
  visitId: z.string(),
  medication: z.string().trim().min(1, "Enter a medication or supplement name."),
  count: z.string().regex(/^\d+$/, "Enter a whole number.").refine((value) => Number(value) > 0, "Enter at least 1 tablet."),
  dateGiven: z.string().min(1, "Enter the date given.").regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
})

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1.5">
    <Label htmlFor={id} className="gap-1">{label}{required && <><span aria-hidden="true" className="text-destructive"> *</span><span className="sr-only"> (required)</span></>}</Label>
    {children}
    {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
  </div>
}

function pregnancyLabel(pregnancy: MaternalPregnancy, index: number) {
  const lmp = pregnancy.lmp_date ? format(new Date(pregnancy.lmp_date), "MM/dd/yyyy") : "LMP not recorded"
  return `Pregnancy #${index + 1} · G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"} · ${lmp} · ${pregnancy.pregnancy_status ?? "Active"}`
}

export function CreatePrescriptionDialog({
  open,
  onOpenChange,
  patientName,
  motherId,
  pregnancies,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  motherId: string
  pregnancies: MaternalPregnancy[]
  onSuccess: () => void
}) {
  const { session } = useAuthSession()
  const [pregnancyId, setPregnancyId] = useState("")
  const [visitId, setVisitId] = useState("")
  const [medication, setMedication] = useState("")
  const [count, setCount] = useState("30")
  const [dateGiven, setDateGiven] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const selectedPregnancy = useMemo(() => pregnancies.find((pregnancy) => pregnancy.pregnancy_id === pregnancyId), [pregnancies, pregnancyId])
  const visits = selectedPregnancy?.prenatalVisits ?? []

  useEffect(() => {
    if (!open) return
    const preferred = pregnancies.find((pregnancy) => pregnancy.pregnancy_status?.toLowerCase() === "active") ?? pregnancies[0]
    setPregnancyId(preferred?.pregnancy_id ?? "")
    setVisitId("")
    setMedication("")
    setCount("30")
    setDateGiven("")
    setErrors({})
  }, [open, pregnancies])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = prescriptionSchema.safeParse({ pregnancyId, visitId, medication, count, dateGiven })
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return
    }
    if (!session?.token) {
      toast.error("Your session has expired. Sign in again.")
      return
    }

    const input: RegisterMaternalSupplementInput = {
      mother_id: motherId,
      pregnancy_id: parsed.data.pregnancyId,
      ...(parsed.data.visitId ? { visit_id: parsed.data.visitId } : {}),
      supplement_type: parsed.data.medication,
      tablets_given_count: Number(parsed.data.count),
      date_given: parsed.data.dateGiven,
    }
    setIsSaving(true)
    try {
      await registerMaternalSupplement(session.token, input)
      toast.success("Prescription recorded", { description: `Added to ${patientName}’s clinical record.` })
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save this prescription")
    } finally {
      setIsSaving(false)
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:p-6">
      <DialogHeader className="gap-1 pr-8">
        <DialogTitle className="text-base font-semibold">Create Prescription</DialogTitle>
        <DialogDescription className="text-xs">Record medication or supplementation for {patientName}.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="prescription-pregnancy" label="Target Pregnancy" required error={errors.pregnancyId}>
            <Select value={pregnancyId} onValueChange={(value) => { setPregnancyId(value); setVisitId(""); setErrors((current) => ({ ...current, pregnancyId: "" })) }}>
              <SelectTrigger id="prescription-pregnancy" className="h-8 w-full text-xs"><SelectValue placeholder="Select pregnancy" /></SelectTrigger>
              <SelectContent>{pregnancies.map((pregnancy, index) => <SelectItem key={pregnancy.pregnancy_id} value={pregnancy.pregnancy_id}>{pregnancyLabel(pregnancy, index)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="prescription-visit" label="Associated Visit" error={errors.visitId}>
            <Select value={visitId} onValueChange={setVisitId} disabled={!visits.length}>
              <SelectTrigger id="prescription-visit" className="h-8 w-full text-xs"><SelectValue placeholder={visits.length ? "Select visit (optional)" : "No visits recorded"} /></SelectTrigger>
              <SelectContent>{visits.filter((visit) => visit.visit_id).map((visit) => <SelectItem key={visit.visit_id} value={visit.visit_id!}>Visit #{visit.visit_number ?? "—"} · {visit.visit_date ? format(new Date(visit.visit_date), "MMM d, yyyy") : "Date not recorded"}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field id="prescription-medication" label="Medication / Supplement" required error={errors.medication}>
              <Input id="prescription-medication" value={medication} onChange={(event) => { setMedication(event.target.value); setErrors((current) => ({ ...current, medication: "" })) }} placeholder="e.g. Iron + Folic Acid" className="h-8 text-xs" list="prescription-suggestions" />
              <datalist id="prescription-suggestions"><option value="Iron + Folic Acid" /><option value="Calcium Carbonate" /><option value="Ferrous Sulfate" /><option value="Multivitamins" /><option value="Folic Acid" /></datalist>
            </Field>
          </div>
          <Field id="prescription-count" label="Tablets Given" required error={errors.count}>
            <Input id="prescription-count" type="number" min="1" step="1" value={count} onChange={(event) => { setCount(event.target.value); setErrors((current) => ({ ...current, count: "" })) }} placeholder="e.g. 30" className="h-8 text-xs" />
          </Field>
          <Field id="prescription-date" label="Date Given" required error={errors.dateGiven}>
            <DateInput id="prescription-date" value={dateGiven} onChange={(value) => { setDateGiven(value); setErrors((current) => ({ ...current, dateGiven: "" })) }} />
          </Field>
        </div>
        {!pregnancies.length && <p className="text-xs text-destructive" role="alert">A pregnancy record is required before adding a prescription.</p>}
        <DialogFooter className="flex-row justify-between gap-3 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 px-3 text-xs">Cancel</Button>
          <Button type="submit" disabled={isSaving || !pregnancies.length} className="h-8 px-3 text-xs">{isSaving ? "Saving…" : "Save Prescription"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
