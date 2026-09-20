import * as React from "react"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  RefreshCw,
  PlusCircle,
  MoreVertical,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Copy,
  LineChart,
  Plus
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { CalendarHeatmap } from "@/components/ui/calendar-heatmap"
import { MasterAvailabilitySidepeek } from "./MasterAvailabilitySidepeek"
import { CreatePlottingRuleModal } from "./CreatePlottingRuleModal"
import { ExportMasterAvailabilityModal } from "./ExportMasterAvailabilityModal"

const MOCK_RULES = [
  {
    id: "1",
    name: "Summer Window",
    status: "Active",
    dateRange: "June 01, 2026 - August 31, 2026",
    link: "https://x.com/shadcn",
    code: "DINAGOT"
  },
  {
    id: "2",
    name: "Standard Q3 Operations",
    status: "Active",
    dateRange: "September 01, 2026 - November 30, 2026",
    link: "https://x.com/shadcn",
    code: "DINAGOT"
  },
  {
    id: "3",
    name: "Community Training",
    status: "Active",
    dateRange: "December 01, 2026 - December 31, 2026",
    link: "https://x.com/shadcn",
    code: "DINAGOT"
  }
]

export function MasterAvailabilityPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [selectedRule, setSelectedRule] = useState<any>(null)
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

      const tabs = ["all", "active", "archived"]
      const currentIndex = tabs.indexOf(activeTab)

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1])
      }
    }
  }

  const variantClassnames = [
    "!bg-[#22C55E] !text-white hover:!bg-[#16a34a] !rounded-md !font-medium !opacity-100", // Green
    "!bg-[#e4e4e7] !text-black hover:!bg-[#d4d4d8] !rounded-md !font-medium !opacity-100" // Grey
  ]

  const weightedDates = [
    // June 2026
    { date: new Date(2026, 5, 25), weight: 1 },
    { date: new Date(2026, 5, 26), weight: 1 },
    { date: new Date(2026, 5, 28), weight: 1 },
    // July 2026
    { date: new Date(2026, 6, 9), weight: 1 },
    { date: new Date(2026, 6, 10), weight: 2 },
    { date: new Date(2026, 6, 15), weight: 1 },
    // August 2026
    { date: new Date(2026, 7, 9), weight: 1 },
    { date: new Date(2026, 7, 17), weight: 1 },
    // September 2026
    { date: new Date(2026, 8, 9), weight: 1 },
    { date: new Date(2026, 8, 17), weight: 1 },
    // October 2026
    { date: new Date(2026, 9, 9), weight: 1 },
    { date: new Date(2026, 9, 10), weight: 1 },
  ]

  // Copy to clipboard helper
  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(err => console.error("Clipboard error:", err));
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
        <div className="flex flex-col gap-4 bg-background dark:bg-black p-4 pl-3 pr-4 pb-0">
          
          {/* Heatmap Section */}
          <div className="flex flex-col gap-0 pt-3 pb-6 rounded-md border border-sidebar-border bg-card dark:bg-[#0a0a0a] shadow-sm overflow-hidden w-full">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground px-4 pb-3 border-b border-sidebar-border">
              <LineChart className="h-3.5 w-3.5" />
              Monthly Capacity Heatmap
            </div>
            <div className="flex justify-center w-full pt-6 pb-2 px-4">
              <CalendarHeatmap
                variantClassnames={variantClassnames}
                weightedDates={weightedDates}
                numberOfMonths={isMobile ? 1 : 5}
                defaultMonth={new Date(2026, 5)}
                className="bg-transparent p-0 w-full flex justify-center"
                classNames={{
                  root: "w-full max-w-full flex justify-center relative",
                  months: "relative flex flex-col md:flex-row gap-4 lg:gap-8 justify-center w-full",
                  month: "flex w-full flex-col",
                  month_caption: "flex h-8 w-full items-center justify-center mb-1",
                  caption_label: "text-[12px] font-semibold text-foreground dark:text-white",
                  weekdays: "flex w-full",
                  weekday: "flex-1 text-[10px] font-normal text-muted-foreground/60 select-none pb-2 text-center",
                  week: "flex w-full mt-1 [&>td]:flex-1 [&>td]:flex [&>td]:items-center [&>td]:justify-center",
                  day: "relative !aspect-square shrink-0 !h-8 !w-8 sm:!h-6 sm:!w-6 lg:!h-7 lg:!w-7 !p-0 !m-0 inline-flex items-center justify-center text-center select-none text-[12px] text-foreground/80 dark:text-white/80 hover:bg-accent dark:hover:bg-white/10 rounded-md",
                  outside: "text-muted-foreground/30",
                  nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between pointer-events-none px-0",
                  button_previous: "pointer-events-auto h-7 w-7 bg-transparent border border-sidebar-border/50 rounded-md text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/10 flex items-center justify-center z-10",
                  button_next: "pointer-events-auto h-7 w-7 bg-transparent border border-sidebar-border/50 rounded-md text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/10 flex items-center justify-center z-10",
                }}
              />
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background dark:bg-black p-4 pl-3 pr-4 pb-4">
          {/* Tabs */}
          <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-max">
              <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="all" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">All Rules</TabsTrigger>
                <TabsTrigger value="active" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Active</TabsTrigger>
                <TabsTrigger value="archived" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex w-full xl:w-auto flex-wrap items-center gap-2">
              <Input placeholder="Filter campaigns..." className="h-8 px-2 w-full sm:w-[250px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex w-full xl:w-auto items-center gap-2">
              <ExportMasterAvailabilityModal>
                <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </ExportMasterAvailabilityModal>
              <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <CreatePlottingRuleModal>
                <Button className="h-8 text-xs font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-[#e5e5e5] dark:text-black dark:hover:bg-[#d5d5d5]">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Create Rule
                </Button>
              </CreatePlottingRuleModal>
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
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Rule Name</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Date Range</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Stakeholder Booking Link</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Booking Code</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_RULES.map((rule) => (
                    <TableRow 
                      key={rule.id} 
                      className={`border-sidebar-border cursor-pointer transition-colors group ${selectedRule?.id === rule.id ? 'bg-accent dark:bg-white/10' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                      onClick={() => setSelectedRule(rule)}
                    >
                      <TableCell className="pl-4">
                        <Checkbox className="border-sidebar-border data-[state=checked]:bg-primary dark:data-[state=checked]:bg-white data-[state=checked]:text-primary-foreground dark:data-[state=checked]:text-black" />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">
                        {rule.name}
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border bg-[#22C55E] border-[#22C55E]/20">
                          {rule.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        {rule.dateRange}
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={(e) => copyToClipboard(rule.link, e)}>
                          <span className="underline decoration-muted-foreground/50 underline-offset-2">{rule.link}</span>
                          <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={(e) => copyToClipboard(rule.code, e)}>
                          <span className="bg-muted dark:bg-[#222] px-1.5 py-0.5 rounded text-[10px]">{rule.code}</span>
                          <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white group-hover:text-foreground dark:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Edit Rule</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Archive Rule</DropdownMenuItem>
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
            <div>0 of {MOCK_RULES.length} row(s) selected.</div>
            
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
            {MOCK_RULES.map((rule) => (
              <div 
                key={rule.id} 
                className={`flex flex-col p-4 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] gap-4 cursor-pointer transition-colors ${selectedRule?.id === rule.id ? 'ring-1 ring-ring dark:ring-white/20' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                onClick={() => setSelectedRule(rule)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground dark:text-white">{rule.name}</h3>
                  <div className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border bg-[#22C55E] border-[#22C55E]/20">
                    {rule.status}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Date Range</span>
                    <span className="text-xs text-foreground dark:text-white text-right max-w-[60%] leading-tight">{rule.dateRange}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Booking Link</span>
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => copyToClipboard(rule.link, e)}>
                      <span className="text-xs underline decoration-muted-foreground/50">{rule.link}</span>
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Booking Code</span>
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => copyToClipboard(rule.code, e)}>
                      <span className="bg-muted dark:bg-[#222] px-1.5 py-0.5 rounded text-[10px]">{rule.code}</span>
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </div>
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
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Edit Rule</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Archive Rule</DropdownMenuItem>
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
          className={`fixed top-0 right-0 h-screen w-[100%] sm:w-[400px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${selectedRule ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <MasterAvailabilitySidepeek rule={selectedRule} onClose={() => setSelectedRule(null)} />
        </div>
      )}

      {/* Mobile Sidepeek Drawer (from underneath with drag-to-dismiss) */}
      {isMobile && (
        <Drawer open={!!selectedRule} onOpenChange={(open) => !open && setSelectedRule(null)}>
          <DrawerContent className="p-0 bg-background dark:bg-background dark:bg-[#0a0a0a] border-t border-sidebar-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden !h-[80dvh] flex flex-col focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Rule Details</DrawerTitle>
            </div>
            <MasterAvailabilitySidepeek rule={selectedRule} onClose={() => setSelectedRule(null)} />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
