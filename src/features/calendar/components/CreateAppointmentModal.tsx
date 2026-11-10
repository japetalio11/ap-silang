import { useMemo, useState, type ReactNode } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CalendarPlus, Check, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { AppEvent } from "./types"
import { toast } from "sonner"
import { format } from "date-fns"
import { getClosedDates } from "../closed-dates"

const appointmentTimes = Array.from({ length: 21 }, (_, index) => {
  const totalMinutes = 7 * 60 + index * 30
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  const hour12 = hours % 12 || 12
  const period = hours < 12 ? "AM" : "PM"
  return { value, label: `${hour12}:${String(minutes).padStart(2, "0")} ${period}` }
})

const appointmentSchema = z.object({
  motherId: z.string().min(1, "Select a registered mother."),
  appointmentType: z.string().min(1, "Select an appointment type."),
  date: z.string().min(1, "Choose an appointment date."),
  time: z.string().min(1, "Choose an appointment time."),
})
export type AppointmentFormValues = z.infer<typeof appointmentSchema>

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={id} className="text-xs font-medium">{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>{children}</div>
}

export type AppointmentMotherOption = { id: string; userId?: string; name: string; serial: string; age: string }

export function CreateAppointmentModal({ open, onOpenChange, onCreate, initialMother, mothers = [], loadingMothers = false, facilityId }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (event: AppEvent, values: AppointmentFormValues) => Promise<AppEvent | void> | AppEvent | void
  initialMother?: AppointmentMotherOption
  mothers?: AppointmentMotherOption[]
  loadingMothers?: boolean
  facilityId?: string | null
}) {
  const [motherQuery, setMotherQuery] = useState("")
  const [selectedMotherId, setSelectedMotherId] = useState(initialMother?.id ?? "")
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { motherId: initialMother?.id ?? "", appointmentType: "Prenatal Checkup", date: "", time: "09:00" },
  })
  const selectedMother = initialMother?.id === selectedMotherId
    ? initialMother
    : mothers.find((mother) => mother.id === selectedMotherId)
  const matchingMothers = useMemo(() => {
    const query = motherQuery.trim().toLowerCase()
    if (!query) return mothers
    return mothers.filter((mother) => `${mother.name} ${mother.serial}`.toLowerCase().includes(query))
  }, [motherQuery, mothers])

  const resetFormState = () => {
    form.reset({
      motherId: initialMother?.id ?? "",
      appointmentType: "Prenatal Checkup",
      date: "",
      time: "09:00",
    })
    form.clearErrors()
    setMotherQuery("")
    setSelectedMotherId(initialMother?.id ?? "")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetFormState()
    }
    onOpenChange(nextOpen)
  }

  const submit = async (values: AppointmentFormValues) => {
    const mother = initialMother?.id === values.motherId ? initialMother : mothers.find((item) => item.id === values.motherId)
    if (!mother) {
      form.setError("motherId", { message: "Select a registered mother." })
      return
    }
    const [year, month, day] = values.date.split("-").map(Number)
    const [hours, minutes] = values.time.split(":").map(Number)
    const start = new Date(year, month - 1, day, hours, minutes)
    if (Number.isNaN(start.getTime())) {
      form.setError("date", { message: "Enter a valid date." })
      return
    }
    const closed = getClosedDates(facilityId).find((item) => item.date === values.date)
    if (closed) {
      form.setError("date", { message: `Facility is closed on this date (${closed.reason}). Please select another date.` })
      return
    }
    const event: AppEvent = {
      motherId: mother.id,
      title: mother.name,
      patient: mother.name,
      appointmentType: values.appointmentType,
      status: "Scheduled",
      type: "appointment",
      start,
      end: new Date(start.getTime() + 30 * 60_000),
      allDay: false,
    }
    try {
      const createdEvent = await onCreate(event, values)
      toast.success("Appointment scheduled")
      resetFormState()
      onOpenChange(false)
      return createdEvent
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to schedule appointment")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-md">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base font-semibold">Schedule Appointment</DialogTitle>
          <DialogDescription className="text-xs">Set up a clinical checkup for a registered mother.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
            {!initialMother && <FormField control={form.control} name="motherId" render={({ field }) => (
              <FormItem>
                <Field id="appointment-mother-search" label="Select Registered Mother" required>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="appointment-mother-search" autoComplete="off" value={selectedMother ? selectedMother.name : motherQuery} onChange={(event) => { setMotherQuery(event.target.value); field.onChange(""); setSelectedMotherId("") }} placeholder="Search by mother's name or family serial no." className="h-9 pl-8 pr-8 text-xs" role="combobox" aria-expanded={Boolean(motherQuery.trim() && !selectedMother)} aria-controls="registered-mother-results" />
                    {(motherQuery || selectedMother) && <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><button type="button" aria-label="Clear mother search" onClick={() => { setMotherQuery(""); field.onChange(""); setSelectedMotherId("") }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button></TooltipTrigger><TooltipContent>Clear selection</TooltipContent></Tooltip></TooltipProvider>}
                  </div>
                  {(motherQuery.trim() || loadingMothers) && !selectedMother && <div id="registered-mother-results" className="max-h-52 overflow-y-auto rounded-md border border-sidebar-border bg-popover p-1" role="listbox" aria-label="Registered mothers">
                    {loadingMothers && !matchingMothers.length ? <div className="space-y-1 p-1" aria-label="Loading mothers" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-2.5 px-2 py-2"><Skeleton className="size-8 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div> : matchingMothers.length ? matchingMothers.map((mother) => <button key={mother.id} type="button" role="option" aria-selected={false} onClick={() => { field.onChange(mother.id); setSelectedMotherId(mother.id); setMotherQuery("") }} className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors hover:bg-muted/60">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{mother.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-xs font-medium">{mother.name}</span><span className="truncate text-xs text-muted-foreground">{mother.serial} · {mother.age}</span></span><Check className="size-4 shrink-0 text-muted-foreground" />
                    </button>) : <p className="px-3 py-5 text-center text-xs text-muted-foreground">No registered mother found.</p>}
                  </div>}
                  <FormMessage />
                </Field>
              </FormItem>
            )} />}
            {initialMother && <div className="flex flex-col gap-2"><Field id="appointment-mother-fixed" label="Mother"><div id="appointment-mother-fixed" className="flex h-9 min-w-0 items-center rounded-md border border-input bg-background px-3 text-xs text-foreground"><span className="truncate">{initialMother.name}</span></div></Field></div>}
            <FormField control={form.control} name="appointmentType" render={({ field }) => <FormItem><Field id="appointment-type" label="Appointment Type" required><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger id="appointment-type" className="h-9 w-full text-xs"><SelectValue placeholder="Choose appointment type" /></SelectTrigger></FormControl><SelectContent position="popper" align="start" side="bottom" sideOffset={4} className="w-[var(--radix-select-trigger-width)]"><SelectItem value="Prenatal Checkup">Prenatal Checkup</SelectItem><SelectItem value="Postpartum Follow-up">Postpartum Follow-up</SelectItem><SelectItem value="High-Risk Consultation">High-Risk Consultation</SelectItem><SelectItem value="General Visit">General Visit</SelectItem></SelectContent></Select><FormMessage /></Field></FormItem>} />
            <div className="space-y-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <Field id="appointment-date" label="Date" required>
                        <DateInput
                          id="appointment-date"
                          value={field.value}
                          onChange={(val) => {
                            field.onChange(val)
                            if (form.formState.errors.date) form.clearErrors("date")
                          }}
                          disabledDates={(day) => {
                            const dateStr = format(day, "yyyy-MM-dd")
                            return getClosedDates(facilityId).some((item) => item.date === dateStr)
                          }}
                        />
                      </Field>
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="time" render={({ field }) => <FormItem className="space-y-0"><Field id="appointment-time" label="Time" required><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger id="appointment-time" className="h-8 w-full text-xs"><SelectValue placeholder="Choose time" /></SelectTrigger></FormControl><SelectContent position="popper" align="start" side="bottom" sideOffset={4} className="w-[var(--radix-select-trigger-width)]">{appointmentTimes.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field><FormMessage /></FormItem>} />
              </div>
              {form.formState.errors.date && (
                <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] font-medium text-destructive">
                  {form.formState.errors.date.message}
                </div>
              )}
            </div>
            <DialogFooter className="flex-row justify-between gap-3 pt-3 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 flex-1 text-xs sm:min-w-24 sm:flex-initial">Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="h-8 flex-1 gap-1.5 text-xs sm:flex-initial"><CalendarPlus className="size-3.5" />{form.formState.isSubmitting ? "Scheduling…" : "Schedule Appointment"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
