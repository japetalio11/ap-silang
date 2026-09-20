import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeleteCampaignModalProps {
  campaign: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteCampaignModal({ campaign, open, onOpenChange }: DeleteCampaignModalProps) {
  if (!campaign) return null;
  
  return (
    <ResponsiveModal 
      open={open} 
      onOpenChange={onOpenChange}
      title={`Are you sure you want to delete "${campaign.name}"?`}
      description={
        <div className="flex flex-col gap-1.5 mt-1">
          <span>This will permanently remove all associated schedules and targets.</span>
          <span>This action cannot be undone.</span>
        </div>
      }
    >
        
        <div className="flex flex-col gap-1.5 pt-2 mt-1">
          <Label htmlFor="delete-password" className="text-xs font-medium text-foreground dark:text-white">Enter your password</Label>
          <Input 
            id="delete-password" 
            type="password"
            placeholder="Enter your password" 
            className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground"
          />
        </div>
        
        <div className="pt-2">
          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full text-xs font-medium bg-[#ff7373] hover:bg-[#ff7373]/90 text-foreground dark:text-white"
          >
            I have read and understood, delete this campaign
          </Button>
        </div>
    </ResponsiveModal>
  )
}

