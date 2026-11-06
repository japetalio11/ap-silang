import { useState } from "react"
import { CalendarDays, PlusCircle, Trash2 } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { StaffRecord } from "../api"

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const scheduleSchema = z.object({
  days: z.array(z.string()).min(1, "Choose at least one weekday."),
  intervals: z.array(z.object({
    start: z.string().min(1, "Enter a start time."),
    end: z.string().min(1, "Enter an end time."),
  })).min(1),
}).superRefine(({ intervals }, context) => {
  intervals.forEach((interval, index) => {
    if (interval.start && interval.end && interval.end <= interval.start) {
      context.addIssue({ code: "custom", path: ["intervals", index, "end"], message: "End time must be after the start time." })
    }
  })
})

type TimeInterval = { start: string; end: string }
type StaffSchedule = { days: string[]; intervals: TimeInterval[] }

function readSchedule(staffId: string): StaffSchedule {
  try {
    const saved = localStorage.getItem(`silang:staff-schedule:${staffId}`)
    if (saved) {
      const parsed = JSON.parse(saved) as StaffSchedule
      return { days: parsed.days ?? weekdays, intervals: parsed.intervals?.length ? parsed.intervals : [{ start: "08:00", end: "17:00" }] }
    }
  } catch {
    // Use the standard weekday schedule when local storage is unavailable or invalid.
  }
  return { days: weekdays, intervals: [{ start: "08:00", end: "17:00" }] }
}

export function StaffScheduleDialog({ open, onOpenChange, staff }: { open: boolean; onOpenChange: (open: boolean) => void; staff: StaffRecord }) {
  const [schedule, setSchedule] = useState<StaffSchedule>(() => readSchedule(staff.id))
  const { days, intervals } = schedule
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleDay = (day: string) => setSchedule((current) => ({ ...current, days: current.days.includes(day) ? current.days.filter((value) => value !== day) : [...current.days, day] }))
  const updateInterval = (index: number, field: keyof TimeInterval, value: string) => {
    setSchedule((current) => ({ ...current, intervals: current.intervals.map((interval, currentIndex) => currentIndex === index ? { ...interval, [field]: value } : interval) }))
    setErrors((current) => ({ ...current, [`interval-${index}`]: "" }))
  }

  const saveSchedule = () => {
    const result = scheduleSchema.safeParse(schedule)
    if (!result.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const index = issue.path[0] === "intervals" ? Number(issue.path[1]) : -1
        nextErrors[index >= 0 ? `interval-${index}` : String(issue.path[0])] = issue.message
      }
      setErrors(nextErrors)
      return
    }
    localStorage.setItem(`silang:staff-schedule:${staff.id}`, JSON.stringify(result.data))
    window.dispatchEvent(new CustomEvent("silang:staff-schedule-updated", { detail: { staffId: staff.id, ...result.data } }))
    toast.success("Staff availability saved on this device")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base font-semibold">Staff availability</DialogTitle>
          <DialogDescription className="text-xs">Set recurring days and time ranges for {staff.name}.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-1">
          <fieldset className="grid gap-2.5">
            <legend className="text-xs font-medium">Available days <span className="text-destructive">*</span></legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
              {weekdays.map((day) => <label key={day} className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox checked={days.includes(day)} onCheckedChange={() => toggleDay(day)} aria-label={day} />
                {day.slice(0, 3)}
              </label>)}
            </div>
            {errors.days && <p role="alert" className="text-xs text-destructive">{errors.days}</p>}
          </fieldset>

          <section className="grid gap-3" aria-labelledby="staff-availability-hours">
            <div className="flex items-center justify-between gap-3">
              <h3 id="staff-availability-hours" className="text-xs font-medium">Available hours <span className="text-destructive">*</span></h3>
              <Button type="button" variant="outline" onClick={() => setSchedule((current) => ({ ...current, intervals: [...current.intervals, { start: "", end: "" }] }))} className="h-8 gap-1.5 px-2.5 text-xs">
                <PlusCircle className="size-3.5" />Add time
              </Button>
            </div>
            <div className="grid gap-2.5">
              {intervals.map((interval, index) => <div key={`interval-${index}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor={`staff-start-${index}`} className="text-xs">Start time <span className="text-destructive">*</span></Label>
                  <Input id={`staff-start-${index}`} type="time" value={interval.start} onChange={(event) => updateInterval(index, "start", event.target.value)} aria-invalid={Boolean(errors[`interval-${index}`])} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`staff-end-${index}`} className="text-xs">End time <span className="text-destructive">*</span></Label>
                  <Input id={`staff-end-${index}`} type="time" value={interval.end} onChange={(event) => updateInterval(index, "end", event.target.value)} aria-invalid={Boolean(errors[`interval-${index}`])} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove time range ${index + 1}`} disabled={intervals.length === 1} onClick={() => setSchedule((current) => ({ ...current, intervals: current.intervals.filter((_, currentIndex) => currentIndex !== index) }))} className="size-9 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </Button>
                {errors[`interval-${index}`] && <p role="alert" className="col-span-3 -mt-1 text-xs text-destructive">{errors[`interval-${index}`]}</p>}
              </div>)}
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />Repeats weekly</div>
          <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="button" onClick={saveSchedule}>Save Availability</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
