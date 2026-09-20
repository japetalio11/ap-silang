import * as React from "react"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  RefreshCw,
  PlusCircle,
  MoreVertical,
  Activity,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Filter
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { CreateCampaignModal } from "./CreateCampaignModal"
import { EditCampaignModal } from "./EditCampaignModal"
import { DeleteCampaignModal } from "./DeleteCampaignModal"
import { CancelCampaignModal } from "./CancelCampaignModal"
import { ExportCampaignModal } from "./ExportCampaignModal"
import { LogDonationsModal } from "./LogDonationsModal"
import { ManageStaffModal } from "./ManageStaffModal"
import { CampaignListSidepeek } from "./CampaignListSidepeek"
import { useIsMobile } from "@/hooks/use-mobile"

const MOCK_DATA = [
  {
    id: "1",
    name: "Community Blood Drive",
    phase: "Ongoing",
    type: "Blood Drive",
    date: "June 08, 2026 8AM - 1PM",
    location: "Bagumbayan Sur, Naga City",
    progress: 75,
    collected: "150 / 200",
    holder: "Joseph Angelo Petalio"
  }
]

export function CampaignListPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [actionModal, setActionModal] = useState<{type: 'edit' | 'cancel' | 'delete' | 'log-donations' | 'manage-staff', campaign: any} | null>(null)
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
    
    // Check if it's a horizontal swipe (X distance > Y distance) and meets the minimum threshold
    if (Math.abs(distanceX) > distanceY && Math.abs(distanceX) > minSwipeDistance) {
      const isLeftSwipe = distanceX > minSwipeDistance
      const isRightSwipe = distanceX < -minSwipeDistance

      const tabs = ["all", "upcoming", "ongoing", "completed"]
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
      {/* Main Content Area */}
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
                <TabsTrigger value="all" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">All Campaigns</TabsTrigger>
                <TabsTrigger value="upcoming" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Upcoming</TabsTrigger>
                <TabsTrigger value="ongoing" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Ongoing</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Completed & Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex w-full xl:w-auto flex-wrap items-center gap-2">
              <div className="flex w-full md:w-auto items-center gap-2">
                <Input placeholder="Filter campaigns..." className="h-8 px-2 w-full sm:w-[250px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 shrink-0 md:hidden border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:text-foreground dark:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                  <Filter className="h-3.5 w-3.5" />
                  Filter & Export
                </Button>
              </div>
              {Object.entries({
                "Campaign Type": ["Advocacy", "Blood Drive", "Training"],
                "Date Range": ["Today", "This Week", "This Month", "Custom"]
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
              <ExportCampaignModal>
                <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:text-foreground dark:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </ExportCampaignModal>
              <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:text-foreground dark:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <CreateCampaignModal>
                <Button className="w-full md:w-auto h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Create Campaign
                </Button>
              </CreateCampaignModal>
            </div>
          </div>

          {/* Mobile Top Pagination */}
          <div className="flex md:hidden items-center justify-between text-xs text-muted-foreground w-full pt-4 mt-2 border-t border-sidebar-border">
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

        <div className="flex flex-col gap-4 p-4 md:pt-0 pl-3 pr-4 pb-24 md:pb-4">
          
          {/* Mobile Card List */}
          <div className="flex md:hidden flex-col gap-4">
            {MOCK_DATA.map((campaign) => (
              <div 
                key={campaign.id} 
                className={`flex flex-col p-4 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] gap-4 cursor-pointer transition-colors ${selectedCampaign?.id === campaign.id ? 'ring-1 ring-ring dark:ring-white/20' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                onClick={() => setSelectedCampaign(campaign)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground dark:text-foreground dark:text-white">{campaign.name}</h3>
                  <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap shrink-0 border ${campaign.phase === 'Approved' ? 'bg-[#22C55E] border-[#22C55E]/20' : 'bg-[#F59E0B] border-[#F59E0B]/20'}`}>
                    {campaign.phase === 'Approved' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {campaign.phase}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Campaign Type</span>
                    <div className="w-fit bg-muted dark:bg-[#222] px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                      {campaign.type}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Date & Time</span>
                    <span className="text-xs text-foreground dark:text-foreground dark:text-white">{campaign.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Location</span>
                    <span className="text-xs text-foreground dark:text-foreground dark:text-white">{campaign.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Donation Progress</span>
                    <div className="w-[100px]">
                      <Progress value={campaign.progress} className="h-1.5" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-sidebar-border">
                  <span className="text-xs text-foreground dark:text-white font-medium">{campaign.holder}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-foreground dark:text-white" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-border shadow-md">
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); setActionModal({type: 'edit', campaign}) }}>Edit Campaign</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => e.stopPropagation()}>Duplicate Campaign</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => e.stopPropagation()}>Export Report</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); setActionModal({type: 'log-donations', campaign}) }}>Log Donations</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); setActionModal({type: 'manage-staff', campaign}) }}>Manage Staff</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => e.stopPropagation()}>Mark Campaign as Completed</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs text-[#ff7373] focus:text-[#ff7373] focus:bg-[#ff7373]/10 cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); setActionModal({type: 'cancel', campaign}) }}>
                        Cancel Campaign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="bg-card dark:bg-[#111]">
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead className="w-12 text-center pl-4">
                      <Checkbox className="border-sidebar-border" />
                    </TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Campaign Name</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Phase</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Campaign Type</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Date & Time</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Location</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Donation Progress</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap text-right">Collected Blood Bags</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Reservation Holder</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DATA.map((campaign) => (
                    <TableRow 
                      key={campaign.id} 
                      className={`border-sidebar-border cursor-pointer transition-colors group ${selectedCampaign?.id === campaign.id ? 'bg-accent dark:bg-white/10' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <TableCell className="pl-4">
                        <Checkbox className="border-sidebar-border data-[state=checked]:bg-primary dark:data-[state=checked]:bg-white data-[state=checked]:text-primary-foreground dark:data-[state=checked]:text-black" />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border ${campaign.phase === 'Approved' ? 'bg-[#22C55E] border-[#22C55E]/20' : 'bg-[#F59E0B] border-[#F59E0B]/20'}`}>
                          {campaign.phase === 'Approved' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {campaign.phase}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-fit bg-muted dark:bg-[#222] px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                          {campaign.type}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        {campaign.date}
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        {campaign.location}
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <Progress value={campaign.progress} className="h-1.5" />
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-foreground dark:text-white text-right whitespace-nowrap">
                        {campaign.collected}
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        {campaign.holder}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-foreground dark:text-white group-hover:text-foreground dark:text-foreground dark:text-white" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-border shadow-md">
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); setActionModal({type: 'edit', campaign}) }}>Edit Campaign</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => e.stopPropagation()}>Duplicate Campaign</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => e.stopPropagation()}>Export Report</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); setActionModal({type: 'log-donations', campaign}) }}>Log Donations</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); setActionModal({type: 'manage-staff', campaign}) }}>Manage Staff</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => e.stopPropagation()}>Mark Campaign as Completed</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs text-[#ff7373] focus:text-[#ff7373] focus:bg-[#ff7373]/10 cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); setActionModal({type: 'cancel', campaign}) }}>
                              Cancel Campaign
                            </DropdownMenuItem>
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
          <div className="hidden md:flex flex-row items-center justify-between text-xs text-muted-foreground gap-4 mt-2">
            <div>0 of {MOCK_DATA.length} row(s) selected.</div>
            
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
        </div>
      </div>

      {/* Desktop Floating Sidepeek Overlay */}
      {!isMobile && (
        <div 
          className={`fixed top-0 right-0 h-screen w-[100%] sm:w-[400px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${selectedCampaign ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <CampaignListSidepeek campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} onAction={(type, campaign) => setActionModal({ type, campaign })} />
        </div>
      )}

      {/* Mobile Sidepeek Drawer (from underneath with drag-to-dismiss) */}
      {isMobile && (
        <Drawer open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
          <DrawerContent className="p-0 bg-background dark:bg-background dark:bg-[#0a0a0a] border-t border-sidebar-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden !h-[80dvh] flex flex-col focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Campaign Details</DrawerTitle>
            </div>
            <CampaignListSidepeek campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} onAction={(type, campaign) => setActionModal({ type, campaign })} />
          </DrawerContent>
        </Drawer>
      )}

      {/* Action Modals */}
      <EditCampaignModal 
        campaign={actionModal?.type === 'edit' ? actionModal.campaign : null}
        open={actionModal?.type === 'edit'}
        onOpenChange={(open) => !open && setActionModal(null)}
      />
      <DeleteCampaignModal 
        campaign={actionModal?.type === 'delete' ? actionModal.campaign : null}
        open={actionModal?.type === 'delete'}
        onOpenChange={(open) => !open && setActionModal(null)}
      />
      <CancelCampaignModal 
        campaign={actionModal?.type === 'cancel' ? actionModal.campaign : null}
        open={actionModal?.type === 'cancel'}
        onOpenChange={(open) => !open && setActionModal(null)}
      />
      <LogDonationsModal 
        isOpen={actionModal?.type === 'log-donations'} 
        onClose={() => setActionModal(null)} 
        campaign={actionModal?.campaign} 
      />
      <ManageStaffModal 
        isOpen={actionModal?.type === 'manage-staff'} 
        onClose={() => setActionModal(null)} 
        campaign={actionModal?.campaign} 
      />
    </div>
  )
}

