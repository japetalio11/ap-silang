import * as React from "react"
import { useState } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

interface LogDonationsModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: any
}

function Stepper({ label, description, value, onChange }: { label: string, description: string, value: number, onChange: (val: number) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground dark:text-white">{label}</label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center border border-sidebar-border rounded-md shrink-0">
        <button className="p-2 hover:bg-muted/50 dark:hover:bg-white/5 transition-colors" onClick={() => onChange(Math.max(0, value - 1))}>
          <Minus className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="w-12 text-center text-xs font-medium text-white border-x border-sidebar-border py-1.5">
          {value}
        </div>
        <button className="p-2 hover:bg-muted/50 dark:hover:bg-white/5 transition-colors" onClick={() => onChange(value + 1)}>
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

export function LogDonationsModal({ isOpen, onClose, campaign }: LogDonationsModalProps) {
  const [target, setTarget] = useState(8)
  const [collected, setCollected] = useState(8)
  const [attendees, setAttendees] = useState(8)

  if (!campaign) return null

  return (
    <ResponsiveModal 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
      title="Log Donations"
      description="Update the real-time metrics for this active campaign."
    >

        <div className="flex flex-col gap-6 py-2">
          <Stepper 
            label="Target Donation" 
            description="Set the goal for units collected during this specific drive."
            value={target}
            onChange={setTarget}
          />
          <Stepper 
            label="Collected Blood Bags" 
            description="Total number of valid units collected so far."
            value={collected}
            onChange={setCollected}
          />
          <Stepper 
            label="Total Attendees" 
            description="Total number of individuals who arrived at the venue"
            value={attendees}
            onChange={setAttendees}
          />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white dark:border-sidebar-border">
            Cancel
          </Button>
          <Button onClick={onClose} className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
            Save Changes
          </Button>
        </div>
    </ResponsiveModal>
  )
}

