import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2 } from "lucide-react"

interface ManageStaffModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: any
}

export function ManageStaffModal({ isOpen, onClose, campaign }: ManageStaffModalProps) {
  if (!campaign) return null

  return (
    <ResponsiveModal 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
      title="Manage Team Members"
      description="Assign team members to this event. You can search for staff by name or role and define their responsibilities to ensure proper coverage."
    >

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-foreground dark:text-white">Assign Team Members</label>
            <Input 
              placeholder="Search for staff..." 
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground"
            />
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-9">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JA</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground dark:text-white">Joseph Angelo Petalio</span>
                <span className="text-[10px] text-muted-foreground">japetalio@gmail.com</span>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-[#ff7373] transition-colors p-2">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white dark:border-sidebar-border">
            Discard Changes
          </Button>
          <Button onClick={onClose} className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
            Save & Continue
          </Button>
        </div>
    </ResponsiveModal>
  )
}

