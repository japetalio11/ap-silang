import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthSession } from "@/features/auth/auth-session"
import { apiRequest } from "@/lib/api"
import type { StaffRecord } from "../api"

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4)
  const minute = (index % 4) * 15
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  const label = `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`
  return { value, label }
})
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
  }
  return { days: weekdays, intervals: [{ start: "08:00", end: "17:00" }] }
}

export function StaffScheduleDialog({ open, onOpenChange, staff }: { open: boolean; onOpenChange: (open: boolean) => void; staff: StaffRecord }) {
  const { session } = useAuthSession()
  const userRole = session?.user?.role?.toLowerCase().trim() || ""
  const isAdminOrAbove = userRole === "admin" || userRole === "systemadmin" || userRole === "superadmin"

  const [schedule, setSchedule] = useState<StaffSchedule>(() => readSchedule(staff.id))
  const { days, intervals } = schedule
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !staff?.id) return
    setSchedule(readSchedule(staff.id))
    if (!session?.token) return
    apiRequest<{ schedule?: StaffSchedule; data?: StaffSchedule }>(`/user/${staff.id}/schedule`, {
      token: session.token,
    })
      .then((res) => {
        const fetched = res?.schedule || res?.data
        if (fetched && Array.isArray(fetched.days)) {
          const resolved: StaffSchedule = {
            days: fetched.days,
            intervals: fetched.intervals?.length ? fetched.intervals : [{ start: "08:00", end: "17:00" }],
          }
          setSchedule(resolved)
          localStorage.setItem(`silang:staff-schedule:${staff.id}`, JSON.stringify(resolved))
        }
      })
      .catch(() => {})
  }, [open, staff?.id, session?.token])

  const toggleDay = (day: string) => {
    if (!isAdminOrAbove) return
    setSchedule((current) => ({ ...current, days: current.days.includes(day) ? current.days.filter((value) => value !== day) : [...current.days, day] }))
  }
  const updateInterval = (index: number, field: keyof TimeInterval, value: string) => {
    if (!isAdminOrAbove) return
    setSchedule((current) => ({ ...current, intervals: current.intervals.map((interval, currentIndex) => currentIndex === index ? { ...interval, [field]: value } : interval) }))
    setErrors((current) => ({ ...current, [`interval-${index}`]: "" }))
  }

  const saveSchedule = async () => {
    if (!isAdminOrAbove) {
      toast.error("Only administrators can edit staff availability.")
      return
    }
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

    setSaving(true)
    localStorage.setItem(`silang:staff-schedule:${staff.id}`, JSON.stringify(result.data))
    window.dispatchEvent(new CustomEvent("silang:staff-schedule-updated", { detail: { staffId: staff.id, ...result.data } }))

    try {
      if (session?.token) {
        await apiRequest(`/user/${staff.id}/schedule`, {
          method: "PUT",
          token: session.token,
          body: JSON.stringify(result.data),
        })
      }
      toast.success("Staff availability saved successfully")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to update staff availability on server")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-5 overflow-hidden">
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="text-base font-semibold">Staff availability</DialogTitle>
          <DialogDescription className="text-xs">
            {isAdminOrAbove ? `Set recurring days and time ranges for ${staff.name}.` : `View recurring days and time ranges for ${staff.name}. (Read-only)`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto py-2 pr-1">
          <fieldset className="grid gap-4">
            <legend className="text-xs font-semibold">Available days {isAdminOrAbove && <span className="text-destructive">*</span>}</legend>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {weekdays.map((day) => (
                <label key={day} className={`flex min-h-9 items-center gap-2 text-xs font-medium ${isAdminOrAbove ? "cursor-pointer" : "cursor-default opacity-80"}`}>
                  <Checkbox checked={days.includes(day)} disabled={!isAdminOrAbove} onCheckedChange={() => toggleDay(day)} aria-label={day} className="size-4 shrink-0" />
                  <span className="leading-none">{day}</span>
                </label>
              ))}
            </div>
            {errors.days && <p role="alert" className="text-xs text-destructive">{errors.days}</p>}
          </fieldset>

          <section className="grid gap-4" aria-labelledby="staff-availability-hours">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 id="staff-availability-hours" className="text-xs font-semibold">Available hours {isAdminOrAbove && <span className="text-destructive">*</span>}</h3>
              </div>
              {isAdminOrAbove && (
                <Button type="button" variant="outline" onClick={() => setSchedule((current) => ({ ...current, intervals: [...current.intervals, { start: "", end: "" }] }))} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs">
                  <Plus className="size-3.5" />Add time
                </Button>
              )}
            </div>
            <div className="grid gap-4">
              {intervals.map((interval, index) => (
                <div key={`interval-${index}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3">
                  <div className="grid min-w-0 gap-1.5">
                    <Label htmlFor={`staff-start-${index}`} className="text-xs">Start {isAdminOrAbove && <span className="text-destructive">*</span>}</Label>
                    <Select value={interval.start || undefined} disabled={!isAdminOrAbove} onValueChange={(value) => updateInterval(index, "start", value)}>
                      <SelectTrigger id={`staff-start-${index}`} className="h-9 w-full" aria-invalid={Boolean(errors[`interval-${index}`])}><SelectValue placeholder="Select start time" /></SelectTrigger>
                      <SelectContent position="popper" className="max-h-56">{timeOptions.map((time) => <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid min-w-0 gap-1.5">
                    <Label htmlFor={`staff-end-${index}`} className="text-xs">End {isAdminOrAbove && <span className="text-destructive">*</span>}</Label>
                    <Select value={interval.end || undefined} disabled={!isAdminOrAbove} onValueChange={(value) => updateInterval(index, "end", value)}>
                      <SelectTrigger id={`staff-end-${index}`} className="h-9 w-full" aria-invalid={Boolean(errors[`interval-${index}`])}><SelectValue placeholder="Select end time" /></SelectTrigger>
                      <SelectContent position="popper" className="max-h-56">{timeOptions.map((time) => <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {isAdminOrAbove ? (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove time range ${index + 1}`} disabled={intervals.length === 1} onClick={() => setSchedule((current) => ({ ...current, intervals: current.intervals.filter((_, currentIndex) => currentIndex !== index) }))} className="mb-0.5 size-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : <div className="size-8" />}
                  {errors[`interval-${index}`] && <p role="alert" className="col-span-3 text-xs text-destructive">{errors[`interval-${index}`]}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-end">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{isAdminOrAbove ? "Cancel" : "Close"}</Button>
            {isAdminOrAbove && (
              <Button type="button" disabled={saving} onClick={saveSchedule}>
                {saving ? "Saving…" : "Save Availability"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
