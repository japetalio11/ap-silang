import * as React from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle2, Clock, X, Calendar, Tag, History } from "lucide-react"

export function CampaignSidepeek({ campaign, onClose, onRequestChanges }: { campaign: any, onClose: () => void, onRequestChanges: (campaign: any) => void }) {
  if (!campaign) return null

  return (
    <div className="flex flex-col h-full bg-background dark:bg-background dark:bg-[#0a0a0a] border-l border-sidebar-border w-full xl:w-[400px]">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-sidebar-border flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground dark:text-foreground dark:text-white">{campaign.name}</h2>
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap w-fit border ${campaign.status === 'Approved' ? 'bg-[#22C55E] border-[#22C55E]/20' : 'bg-[#F59E0B] border-[#F59E0B]/20'}`}>
            {campaign.status === 'Approved' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {campaign.status || campaign.phase}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="hidden md:flex h-6 w-6 text-muted-foreground hover:text-foreground dark:text-foreground dark:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Properties */}
        <div className="flex flex-col gap-4 p-4">
          <h3 className="text-xs font-medium text-foreground dark:text-foreground dark:text-white">Properties</h3>
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground">Reservation Logistics</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Start Date & Time</span>
              </div>
              <span className="text-xs text-muted-foreground flex-1">{campaign.date}</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">End Date & Time</span>
              </div>
              <span className="text-xs text-muted-foreground flex-1">June 08, 2026 08:00 PM</span>
            </div>
            
            <span className="text-[10px] text-muted-foreground mt-2">Event Metadata</span>
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Tag className="h-3.5 w-3.5" />
                <span className="text-xs">Campaign Type</span>
              </div>
              <div className="flex-1 flex justify-start">
                <div className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-foreground dark:text-white border border-sidebar-border bg-muted dark:bg-black whitespace-nowrap">
                  {campaign.type || 'Advocacy'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="flex flex-col gap-4 p-4 border-t border-border dark:border-white/10">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-foreground dark:text-foreground dark:text-white">Activity Log</h3>
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Recent actions performed by this user.</p>
          
          <div className="flex gap-3 mt-2">
            <div className="flex flex-col items-center mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary dark:bg-white shrink-0" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground dark:text-foreground dark:text-white">Created a campaign titled {campaign.name}</span>
              <span className="text-[10px] text-muted-foreground">June 08, 2026 8:00AM</span>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="flex flex-col gap-4 p-4 border-t border-border dark:border-white/10">
          <h3 className="text-xs font-medium text-foreground dark:text-foreground dark:text-white">Comments</h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>JP</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground dark:text-foreground dark:text-white">{campaign.holder}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">09:34 AM</span>
            </div>
            <p className="text-xs text-foreground dark:text-foreground dark:text-white">Namove yung date sabi nung head admin</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 pb-8 md:pb-4 border-t border-sidebar-border flex flex-col gap-3">
        <Button className="w-full h-8 text-xs font-medium bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
          Approve Campaign
        </Button>
        <Button variant="secondary" onClick={() => onRequestChanges(campaign)} className="w-full h-8 text-xs font-medium border border-sidebar-border bg-muted dark:bg-[#1e1e1e] hover:bg-muted/80 dark:hover:bg-[#1e1e1e]/80 text-foreground dark:text-foreground dark:text-white">
          Request Changes
        </Button>
      </div>
    </div>
  )
}

