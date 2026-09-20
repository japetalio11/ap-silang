import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EditCampaignModalProps {
  campaign: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCampaignModal({ campaign, open, onOpenChange }: EditCampaignModalProps) {
  if (!campaign) return null;
  
  return (
    <ResponsiveModal 
      open={open} 
      onOpenChange={onOpenChange}
      title="Campaign Revisions"
      description="Fill out the details below to initialize campaign revisions."
    >
        
        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-title" className="text-xs font-medium text-foreground dark:text-white">Title</Label>
            <Input 
              id="edit-title" 
              defaultValue={campaign.name}
              placeholder="Add a title for this event." 
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground"
            />
          </div>

          {/* Campaign Type */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-type" className="text-xs font-medium text-foreground dark:text-white">Campaign Type</Label>
            <Select defaultValue="advocacy">
              <SelectTrigger id="edit-type" className="!h-8 w-full bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-muted-foreground text-foreground dark:text-white">
                <SelectValue placeholder="Choose campaign type" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white">
                <SelectItem value="advocacy" className="text-xs">Advocacy</SelectItem>
                <SelectItem value="blood-drive" className="text-xs">Blood Drive</SelectItem>
                <SelectItem value="training" className="text-xs">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-start-date" className="text-xs font-medium text-foreground dark:text-white">Start Date</Label>
              <Select defaultValue="june30">
                <SelectTrigger id="edit-start-date" className="!h-8 w-full bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-muted-foreground text-foreground dark:text-white">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white">
                  <SelectItem value="today" className="text-xs">Today</SelectItem>
                  <SelectItem value="tomorrow" className="text-xs">Tomorrow</SelectItem>
                  <SelectItem value="june30" className="text-xs">June 30, 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-start-time" className="text-xs font-medium text-foreground dark:text-white">Start Time</Label>
              <Input 
                id="edit-start-time" 
                defaultValue="10:30" 
                className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white text-center"
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-end-date" className="text-xs font-medium text-foreground dark:text-white">End Date</Label>
              <Select defaultValue="june30">
                <SelectTrigger id="edit-end-date" className="!h-8 w-full bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-muted-foreground text-foreground dark:text-white">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white">
                  <SelectItem value="today" className="text-xs">Today</SelectItem>
                  <SelectItem value="tomorrow" className="text-xs">Tomorrow</SelectItem>
                  <SelectItem value="june30" className="text-xs">June 30, 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-end-time" className="text-xs font-medium text-foreground dark:text-white">End Time</Label>
              <Input 
                id="edit-end-time" 
                defaultValue="10:30" 
                className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white text-center"
              />
            </div>
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-comments" className="text-xs font-medium text-foreground dark:text-white">Comments</Label>
            <Textarea 
              id="edit-comments" 
              placeholder="Add any additional comments" 
              className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground min-h-[80px] resize-none"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white dark:border-sidebar-border">
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
            Submit Revisions
          </Button>
        </div>
    </ResponsiveModal>
  )
}

