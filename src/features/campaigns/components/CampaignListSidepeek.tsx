import * as React from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  X, 
  Sun,
  Droplet, 
  Users, 
  Calendar, 
  MapPin, 
  Target, 
  Tag, 
  Building2, 
  User, 
  History,
  ClipboardList,
  CheckCircle2,
  Clock
} from "lucide-react"
import { ManageTeamMembersModal } from "./ManageTeamMembersModal"

export function CampaignListSidepeek({ campaign, onClose, onAction }: { campaign: any, onClose: () => void, onAction?: (type: 'log-donations' | 'manage-staff', campaign: any) => void }) {
  if (!campaign) return null

  return (
    <div className="flex flex-col h-full bg-background dark:bg-background dark:bg-[#0a0a0a] border-l border-sidebar-border w-full xl:w-[400px]">
      {/* Header */}
      <div className="shrink-0 p-4 pb-4 border-b border-sidebar-border flex items-start justify-between">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground dark:text-foreground dark:text-white">{campaign.name || "Community Advocacy"}</h2>
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border w-fit ${campaign.phase === 'Approved' ? 'bg-[#22C55E] border-[#22C55E]/20' : 'bg-[#F59E0B] border-[#F59E0B]/20'}`}>
            {campaign.phase === 'Approved' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {campaign.phase || 'Ongoing'}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="hidden md:flex h-6 w-6 text-muted-foreground hover:text-foreground dark:text-foreground dark:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        
        {/* Description */}
        <div className="flex flex-col gap-3 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-foreground dark:text-white">Description</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A community outreach initiative partnering with local universities to increase voluntary blood donations.
          </p>
        </div>

        {/* Donation Progress */}
        <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground dark:text-foreground dark:text-white">Donation Progress</h3>
            <Button onClick={() => onAction?.('log-donations', campaign)} className="h-7 text-[11px] font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
              <Droplet className="h-3 w-3" />
              Log Donations
            </Button>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs">Donation Progress</span>
              </div>
              <div className="flex-1">
                <Progress value={75} className="h-1.5 bg-sidebar-border" indicatorClassName="bg-white" />
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs">Collected Blood Bags</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">150</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs">Total Attendees</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">200</span>
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="flex flex-col gap-5 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-foreground dark:text-white">Properties</h3>
          
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Reservation Logistics</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Start Date & Time</span>
              </div>
              <span className="text-xs text-muted-foreground flex-1">June 08, 2026 08:00 AM</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">End Date & Time</span>
              </div>
              <span className="text-xs text-muted-foreground flex-1">June 08, 2026 08:00 PM</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="text-xs">Venue</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">Ateneo de Naga University</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-xs">Area</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">Naga City</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Staff and Operations</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Target className="h-3.5 w-3.5" />
                <span className="text-xs">Target Donation</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">200 Bags</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Tag className="h-3.5 w-3.5" />
                <span className="text-xs">Assigned Staff</span>
              </div>
              <ManageTeamMembersModal>
                <div className="flex items-center -space-x-1 flex-1 cursor-pointer hover:opacity-80 transition-opacity">
                  <Avatar className="h-5 w-5 border border-background">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>A</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-5 w-5 border border-background">
                    <AvatarImage src="https://github.com/vercel.png" />
                    <AvatarFallback>B</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-5 w-5 border border-background">
                    <AvatarImage src="https://github.com/nextjs.png" />
                    <AvatarFallback>C</AvatarFallback>
                  </Avatar>
                </div>
              </ManageTeamMembersModal>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Organization Details</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs">Hosting Organization</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">Bicol Medical Center</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Reservation Holder</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">Joseph Angelo Petalio</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Event Metadata</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
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
        <div className="flex flex-col gap-4 p-4 pb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground dark:text-foreground dark:text-white">Activity Log</h3>
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Recent actions performed by this user.</p>
          
          <div className="flex gap-3 mt-1">
            <div className="flex flex-col items-center mt-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground dark:bg-white shrink-0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground dark:text-foreground dark:text-white">Created a campaign titled Community Blood Drive</span>
              <span className="text-[10px] text-muted-foreground">June 08, 2026 8:00AM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 pb-8 md:pb-4 border-t border-sidebar-border flex flex-col gap-3">
        <Button className="w-full h-8 text-xs font-medium bg-[#e5e5e5] text-black hover:bg-[#d5d5d5] dark:bg-[#e5e5e5] dark:text-black">
          Mark Campaign as Completed
        </Button>
        <Button variant="outline" className="w-full h-8 text-xs font-medium bg-[#1e1e1e] text-white hover:bg-[#2a2a2a] border border-sidebar-border dark:bg-[#1e1e1e] dark:text-foreground dark:text-white dark:border-sidebar-border">
          Delete Campaign
        </Button>
      </div>
    </div>
  )
}

