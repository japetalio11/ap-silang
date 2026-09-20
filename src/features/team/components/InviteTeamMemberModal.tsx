import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function InviteTeamMemberModal({ children }: { children: React.ReactNode }) {
  return (
    <ResponsiveModal 
      trigger={children}
      title="Invite Team Member"
      description="Send an invitation to join the platform."
    >
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-xs font-medium text-foreground dark:text-white">Email Address</Label>
            <Input 
              id="email" 
              placeholder="name@example.com" 
              type="email"
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role" className="text-xs font-medium text-foreground dark:text-white">Role</Label>
            <Select>
              <SelectTrigger id="role" className="!h-8 w-full bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-muted-foreground">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white">
                <SelectItem value="admin" className="text-xs">Administrator</SelectItem>
                <SelectItem value="manager" className="text-xs">Manager</SelectItem>
                <SelectItem value="staff" className="text-xs">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sector" className="text-xs font-medium text-foreground dark:text-white">Sector</Label>
            <Select>
              <SelectTrigger id="sector" className="!h-8 w-full bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-muted-foreground">
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white">
                <SelectItem value="lgu" className="text-xs">Local Government Unit</SelectItem>
                <SelectItem value="ngo" className="text-xs">NGO</SelectItem>
                <SelectItem value="private" className="text-xs">Private Sector</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <Button variant="outline" className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white dark:border-sidebar-border">
            Cancel
          </Button>
          <Button className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
            Send Invite
          </Button>
        </div>
    </ResponsiveModal>
  )
}
