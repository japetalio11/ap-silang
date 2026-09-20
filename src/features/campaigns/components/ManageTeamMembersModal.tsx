import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"

export function ManageTeamMembersModal({ children }: { children: React.ReactNode }) {
  const [assignedStaff, setAssignedStaff] = React.useState([
    {
      id: "1",
      name: "Joseph Angelo Petalio",
      email: "japetallo@gmail.com",
      avatar: "https://i.pravatar.cc/150?u=1"
    }
  ])

  const handleRemove = (id: string) => {
    setAssignedStaff(prev => prev.filter(staff => staff.id !== id))
  }

  return (
    <ResponsiveModal 
      trigger={children}
      title="Manage Team Members"
      description="Assign team members to this event. You can search for staff by name or role and define their responsibilities to ensure proper coverage."
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-staff" className="text-xs font-medium text-foreground dark:text-white">Assign Team Members</Label>
          <Input 
            id="search-staff" 
            placeholder="Search for staff..." 
            className="!h-10 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {assignedStaff.map(staff => (
            <div key={staff.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-accent dark:hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-accent dark:bg-white/10 shrink-0">
                  {staff.avatar ? (
                    <img src={staff.avatar} alt={staff.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white">
                      {staff.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground dark:text-white">{staff.name}</span>
                  <span className="text-xs text-muted-foreground">{staff.email}</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleRemove(staff.id)}
                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-4">
        <Button variant="outline" className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white dark:border-sidebar-border">
          Discard Changes
        </Button>
        <Button className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
          Save & Continue
        </Button>
      </div>
    </ResponsiveModal>
  )
}
