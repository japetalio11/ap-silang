import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import { saveClosedDate } from "@/features/calendar/closed-dates"

interface AddDateProps {
  open: boolean
  onClose: () => void
  facilityId?: string | null
  onDateAdded?: () => void
}

export function AddDate({ open, onClose, facilityId, onDateAdded }: AddDateProps) {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleClose = () => {
    setDate(format(new Date(), "yyyy-MM-dd"))
    setReason("")
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) {
      toast.error("Please pick or type a valid date")
      return
    }
    setSubmitting(true)
    try {
      saveClosedDate(date, reason || "Clinic Closed / Holiday", facilityId)
      toast.success(`Date ${date} marked as closed`)
      handleClose()
      onDateAdded?.()
    } catch {
      toast.error("Failed to save closed date")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose() }}>
      <DialogContent className="max-w-md gap-4 rounded-xl border-sidebar-border bg-background p-5 text-foreground">
        <DialogHeader className="gap-1">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarIcon className="size-4 text-primary" />
            Add Closed Date / Exemption
          </DialogTitle>
          <DialogDescription className="text-xs">
            Exempt a specific date from appointment bookings and mark it as closed for the facility.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="closed-date-input" className="text-xs font-medium">
              Closed Date <span className="text-destructive">*</span>
            </Label>
            <DateInput
              id="closed-date-input"
              value={date}
              onChange={setDate}
              placeholder="MM/DD/YYYY"
              className="h-9 bg-background border-input text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="closed-reason" className="text-xs font-medium">
              Reason / Exemption Note
            </Label>
            <Input
              id="closed-reason"
              placeholder="e.g. Regular Holiday, Sanitation Day, Staff Training"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="h-8 gap-1.5 text-xs">
              <Plus className="size-3.5" />
              Save Closed Date
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
