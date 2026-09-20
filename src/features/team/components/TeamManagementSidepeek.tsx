import * as React from "react"
import { X, Mail, Shield, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TeamManagementSidepeek({ 
  staff, 
  onClose 
}: { 
  staff: any
  onClose: () => void 
}) {
  if (!staff) return null

  return (
    <div className="flex flex-col h-full bg-background dark:bg-black border-l border-sidebar-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border sticky top-0 bg-background dark:bg-black z-10">
        <h2 className="text-sm font-semibold text-foreground dark:text-white">Staff Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-foreground dark:text-white rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 space-y-6">
        
        {/* Profile Info */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-accent dark:bg-white/10 shrink-0">
            {staff.avatar ? (
              <img src={staff.avatar} alt={staff.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-lg font-semibold text-foreground dark:text-white">
                {staff.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 className="text-base font-bold text-foreground dark:text-white truncate">{staff.name}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border ${
                staff.status === 'Active' ? 'bg-[#22C55E] border-[#22C55E]/20' : 
                staff.status === 'Pending' ? 'bg-amber-500 border-amber-500/20' : 
                'bg-zinc-500 border-zinc-500/20'
              }`}>
                {staff.status}
              </span>
              <div className="w-fit bg-muted dark:bg-[#222] px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                {staff.position}
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1 p-3 rounded-lg border border-sidebar-border bg-card dark:bg-[#111]">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </span>
            <span className="text-sm font-medium text-foreground dark:text-white">{staff.email}</span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-lg border border-sidebar-border bg-card dark:bg-[#111]">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Sector
            </span>
            <span className="text-sm font-medium text-foreground dark:text-white">{staff.sector}</span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-lg border border-sidebar-border bg-card dark:bg-[#111]">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Role
            </span>
            <span className="text-sm font-medium text-foreground dark:text-white">{staff.position}</span>
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-sidebar-border bg-background dark:bg-black mt-auto sticky bottom-0 z-10 flex gap-2">
        <Button variant="outline" className="flex-1 text-xs h-9 border-sidebar-border text-foreground dark:text-white hover:bg-accent dark:hover:bg-[#1e1e1e]">
          Edit Profile
        </Button>
        <Button variant="destructive" className="flex-1 text-xs h-9">
          Deactivate
        </Button>
      </div>
    </div>
  )
}
