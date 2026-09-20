import * as React from "react"
import { Button } from "@/components/ui/button"
import { 
  X, 
  Calendar,
  Clock,
  History,
  CheckCircle2,
  Copy,
  Hash,
  CalendarDays,
  CalendarX2,
  Check
} from "lucide-react"

export function MasterAvailabilitySidepeek({ rule, onClose }: { rule: any, onClose: () => void }) {
  const [copiedLink, setCopiedLink] = React.useState(false)
  const [copiedCode, setCopiedCode] = React.useState(false)

  if (!rule) return null

  const handleCopyLink = () => {
    navigator.clipboard.writeText(rule.link || "https://x.com/shadcn")
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(rule.code || "DINAGOT")
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-background dark:bg-background dark:bg-[#0a0a0a] border-l border-sidebar-border w-full xl:w-[400px]">
      {/* Header */}
      <div className="shrink-0 p-4 pb-4 border-b border-sidebar-border flex items-start justify-between">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground dark:text-white">{rule.name || "Summer Window"}</h2>
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border w-fit bg-[#22C55E] border-[#22C55E]/20`}>
            <CheckCircle2 className="h-3 w-3" />
            {rule.status || 'Active'}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="hidden md:flex h-6 w-6 text-muted-foreground hover:text-foreground dark:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        
        {/* Rule Details */}
        <div className="flex flex-col gap-3 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-white">Rule Details</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A community outreach initiative partnering with local universities to increase voluntary blood donations.
          </p>
        </div>

        {/* Stakeholder Booking Link */}
        <div className="flex flex-col gap-3 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-white">Stakeholder Booking Link</h3>
          <div 
            className="flex items-center justify-between p-2 rounded-md border border-sidebar-border bg-card dark:bg-[#111] cursor-pointer hover:bg-accent dark:hover:bg-white/5 transition-colors"
            onClick={handleCopyLink}
          >
            <span className="text-xs text-muted-foreground">{rule.link || "https://x.com/shadcn"}</span>
            {copiedLink ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Share this link with partners so they can book dates within this block.
          </p>
        </div>

        {/* Booking Code */}
        <div className="flex flex-col gap-3 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-white">Booking Code</h3>
          <div 
            className="flex items-center justify-between p-2 rounded-md border border-sidebar-border bg-card dark:bg-[#111] cursor-pointer hover:bg-accent dark:hover:bg-white/5 transition-colors"
            onClick={handleCopyCode}
          >
            <span className="text-xs text-muted-foreground">{rule.code || "DINAGOT"}</span>
            {copiedCode ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Share this code with partners so they can access the booking link.
          </p>
        </div>

        {/* Properties */}
        <div className="flex flex-col gap-5 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-white">Properties</h3>
          
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Date Block Settings</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Start Range</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">June 01, 2025</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="text-xs">End Range</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">August 31, 2025</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="text-xs">Applicable Days</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">Mon, Tue, Wed, Thu, Fri</span>
            </div>
            
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarX2 className="h-3.5 w-3.5" />
                <span className="text-xs">Exceptions</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-sidebar-border w-fit mt-1 bg-card dark:bg-[#222]">
                <CheckCircle2 className="h-3 w-3 text-white" />
                <span className="text-[10px] text-foreground dark:text-white">December 25, 2025</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <span className="text-[10px] text-muted-foreground font-medium">Time Capacity</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Operational Window</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">08:00 AM - 05:00 PM</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Hash className="h-3.5 w-3.5" />
                <span className="text-xs">Daily Capacity</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">5</span>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="flex flex-col gap-4 p-4 pb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground dark:text-white">Activity Log</h3>
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-[11px] text-muted-foreground">Recent actions performed by this user.</p>
          
          <div className="flex gap-3 mt-1">
            <div className="flex flex-col items-center mt-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground dark:bg-white shrink-0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground dark:text-white">japetalio@gmail.com created a campaign titled Community Blood Drive</span>
              <span className="text-[10px] text-muted-foreground">June 08, 2026 8:00AM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 pb-8 md:pb-4 border-t border-sidebar-border flex flex-col gap-3">
        <Button className="w-full h-8 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-[#e5e5e5] dark:text-black dark:hover:bg-[#d5d5d5]">
          Save Changes
        </Button>
        <Button variant="outline" className="w-full h-8 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:text-white dark:hover:bg-[#2a2a2a]">
          Delete Capacity Rule
        </Button>
      </div>
    </div>
  )
}
