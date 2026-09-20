import * as React from "react"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  MoreVertical,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  PlusCircle,
  UserPlus
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { TeamManagementSidepeek } from "./TeamManagementSidepeek"
import { InviteTeamMemberModal } from "./InviteTeamMemberModal"

const MOCK_STAFF = [
  {
    id: "1",
    name: "Joseph Angelo Petallo",
    avatar: "https://i.pravatar.cc/150?u=1",
    status: "Active",
    position: "Administrator",
    sector: "Local Government Unit",
    email: "japetallo@gmail.com"
  },
  {
    id: "2",
    name: "Maria Santos",
    avatar: "https://i.pravatar.cc/150?u=2",
    status: "Active",
    position: "Manager",
    sector: "NGO",
    email: "msantos@example.com"
  },
  {
    id: "3",
    name: "Juan Dela Cruz",
    avatar: "https://i.pravatar.cc/150?u=3",
    status: "Pending",
    position: "Staff",
    sector: "Private Sector",
    email: "juan@example.com"
  }
]

export function TeamManagementPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const isMobile = useIsMobile()

  // Swipe gesture handling
  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null)
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndPos(null)
    setTouchStartPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchEndHandler = () => {
    if (!touchStartPos || !touchEndPos) return
    
    const distanceX = touchStartPos.x - touchEndPos.x
    const distanceY = Math.abs(touchStartPos.y - touchEndPos.y)
    
    if (Math.abs(distanceX) > distanceY && Math.abs(distanceX) > minSwipeDistance) {
      const isLeftSwipe = distanceX > minSwipeDistance
      const isRightSwipe = distanceX < -minSwipeDistance

      const tabs = ["all", "active", "pending", "deactivated"]
      const currentIndex = tabs.indexOf(activeTab)

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1])
      }
    }
  }

  return (
    <div className="relative flex items-start w-full h-full overflow-hidden">
      <div 
        className="flex flex-col w-full h-full text-foreground min-w-0 overflow-y-auto relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background dark:bg-black p-4 pl-3 pr-4 pb-4">
          {/* Tabs */}
          <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-max">
              <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="all" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">All Team Members</TabsTrigger>
                <TabsTrigger value="active" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Active</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Pending Invites</TabsTrigger>
                <TabsTrigger value="deactivated" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Deactivated</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex w-full xl:w-auto flex-wrap items-center gap-2">
              <Input placeholder="Filter staff..." className="h-8 px-2 w-full sm:w-[250px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
              {Object.entries({
                "Role": ["Administrator", "Manager", "Coordinator", "Staff"],
                "Sector": ["Local Government Unit", "NGO", "Private Sector", "Academe"]
              }).map(([filterName, options]) => (
                <Popover key={filterName}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:text-foreground dark:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                      <PlusCircle className="h-3.5 w-3.5" />
                      {filterName}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                    <div className="flex flex-col gap-2.5">
                      {options.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox id={`filter-${filterName}-${option}`} className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black h-3.5 w-3.5 rounded-[4px]" />
                            <label htmlFor={`filter-${filterName}-${option}`} className="text-xs font-normal text-foreground dark:text-white leading-none cursor-pointer">
                              {option}
                            </label>
                          </div>
                        ))}
                    </div>
                    <Button className="h-7 text-xs w-full bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                      Clear Filter
                    </Button>
                  </PopoverContent>
                </Popover>
              ))}
            </div>
            <div className="flex w-full xl:w-auto items-center gap-2">
              <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <InviteTeamMemberModal>
                <Button className="h-8 text-xs font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-[#e5e5e5] dark:text-black dark:hover:bg-[#d5d5d5]">
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Team Member
                </Button>
              </InviteTeamMemberModal>
            </div>
          </div>

          {/* Mobile Pagination (Sticky) */}
          <div className="md:hidden flex items-center justify-between pt-2 border-t border-sidebar-border mt-2">
            <span className="text-xs text-muted-foreground font-medium">Page 1 of 1</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 md:pt-0 pl-3 pr-4 pb-24 md:pb-4">
          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="bg-card dark:bg-[#111]">
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead className="w-12 text-center pl-4">
                      <Checkbox className="border-sidebar-border" />
                    </TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Name</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Position</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Sector</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Email</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_STAFF.map((staff) => (
                    <TableRow 
                      key={staff.id} 
                      className={`border-sidebar-border cursor-pointer transition-colors group ${selectedStaff?.id === staff.id ? 'bg-accent dark:bg-white/10' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                      onClick={() => setSelectedStaff(staff)}
                    >
                      <TableCell className="pl-4">
                        <Checkbox className="border-sidebar-border data-[state=checked]:bg-primary dark:data-[state=checked]:bg-white data-[state=checked]:text-primary-foreground dark:data-[state=checked]:text-black" />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded-full overflow-hidden bg-accent dark:bg-white/10 shrink-0">
                            {staff.avatar ? (
                              <img src={staff.avatar} alt={staff.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold text-foreground dark:text-white">
                                {staff.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span>{staff.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border ${
                          staff.status === 'Active' ? 'bg-[#22C55E] border-[#22C55E]/20' : 
                          staff.status === 'Pending' ? 'bg-amber-500 border-amber-500/20' : 
                          'bg-zinc-500 border-zinc-500/20'
                        }`}>
                          {staff.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        <div className="w-fit bg-muted dark:bg-[#222] px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                          {staff.position}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        {staff.sector}
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        {staff.email}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white group-hover:text-foreground dark:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Edit Profile</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md text-red-500 hover:!text-red-500 hover:!bg-red-500/10">Deactivate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Desktop Pagination Footer */}
          <div className="hidden md:flex flex-row items-center justify-between text-xs text-muted-foreground gap-4">
            <div>0 of {MOCK_STAFF.length} row(s) selected.</div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <div className="flex items-center justify-between border border-sidebar-border bg-card dark:bg-[#111] hover:bg-accent dark:hover:bg-[#222] cursor-pointer rounded-md px-2 py-1 gap-2 transition-colors">
                  <span>10</span>
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span>Page 1 of 1</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronsLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronsRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="flex md:hidden flex-col gap-4">
            {MOCK_STAFF.map((staff) => (
              <div 
                key={staff.id} 
                className={`flex flex-col p-4 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] gap-4 cursor-pointer transition-colors ${selectedStaff?.id === staff.id ? 'ring-1 ring-ring dark:ring-white/20' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                onClick={() => setSelectedStaff(staff)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-accent dark:bg-white/10 shrink-0">
                      {staff.avatar ? (
                        <img src={staff.avatar} alt={staff.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white">
                          {staff.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground dark:text-white">{staff.name}</h3>
                  </div>
                  <div className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border ${
                    staff.status === 'Active' ? 'bg-[#22C55E] border-[#22C55E]/20' : 
                    staff.status === 'Pending' ? 'bg-amber-500 border-amber-500/20' : 
                    'bg-zinc-500 border-zinc-500/20'
                  }`}>
                    {staff.status}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Position</span>
                    <div className="w-fit bg-muted dark:bg-[#222] px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                      {staff.position}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sector</span>
                    <span className="text-xs text-foreground dark:text-white text-right">{staff.sector}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <span className="text-xs text-foreground dark:text-white text-right">{staff.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-sidebar-border">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Edit Profile</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md text-red-500 hover:!text-red-500 hover:!bg-red-500/10">Deactivate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Desktop Floating Sidepeek Overlay */}
      {!isMobile && (
        <div 
          className={`fixed top-0 right-0 h-screen w-[100%] sm:w-[400px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${selectedStaff ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <TeamManagementSidepeek staff={selectedStaff} onClose={() => setSelectedStaff(null)} />
        </div>
      )}

      {/* Mobile Sidepeek Drawer (from underneath with drag-to-dismiss) */}
      {isMobile && (
        <Drawer open={!!selectedStaff} onOpenChange={(open) => !open && setSelectedStaff(null)}>
          <DrawerContent className="p-0 bg-background dark:bg-background dark:bg-[#0a0a0a] border-t border-sidebar-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden !h-[80dvh] flex flex-col focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Staff Details</DrawerTitle>
            </div>
            <TeamManagementSidepeek staff={selectedStaff} onClose={() => setSelectedStaff(null)} />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
