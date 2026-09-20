import * as React from "react"
// import { ToolbarProps } from "react-big-calendar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle, 
  Download, 
  RefreshCw, 
  CalendarCheck,
  Filter
} from "lucide-react"
import { format } from "date-fns"
import { ExportCalendarModal } from "./ExportCalendarModal"
import { CheckAvailabilityModal } from "./CheckAvailabilityModal"
import { CreateCampaignModal } from "@/features/campaigns/components/CreateCampaignModal"
export interface CustomToolbarProps {
  date: Date
  view: string
  onViewChange: (view: string) => void
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
}

export function CustomToolbar(props: CustomToolbarProps) {
  const { date, onNavigate, view, onViewChange } = props

  const goToBack = () => {
    onNavigate('PREV')
  }

  const goToNext = () => {
    onNavigate('NEXT')
  }

  const goToCurrent = () => {
    onNavigate('TODAY')
  }

  const handleViewChange = (newView: string) => {
    onViewChange(newView)
  }

  const filterOptions = {
    "Campaign Type": ["Advocacy", "Blood Drive", "Training"],
    "Status": ["Pending", "Approved", "Ongoing", "Completed"],
    "Priority": ["Low", "Medium", "High"],
    "Availability": ["Available", "Partially Booked", "Fully Booked"]
  }

  return (
    <div className="flex flex-col gap-4 text-foreground dark:text-white">
      {/* Top Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" onClick={goToBack} className="h-8 w-8 bg-transparent border-sidebar-border hover:bg-accent dark:hover:bg-white/5 shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToCurrent} className="h-8 px-3 text-xs font-medium bg-transparent border-sidebar-border hover:bg-accent dark:hover:bg-white/5 shrink-0">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext} className="h-8 w-8 bg-transparent border-sidebar-border hover:bg-accent dark:hover:bg-white/5 shrink-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg md:text-xl font-semibold truncate">{format(date, 'MMMM yyyy')}</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
          <Tabs value={view} onValueChange={(v) => handleViewChange(v)} className="w-full md:w-max">
            <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
              <TabsTrigger value="month" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Month Grid</TabsTrigger>
              <TabsTrigger value="week" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Weekly Schedule</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <CreateCampaignModal>
            <Button className="w-full md:w-auto h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
              <PlusCircle className="h-3.5 w-3.5" />
              Create Campaign
            </Button>
          </CreateCampaignModal>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Filters - hidden on mobile, replaced by a single icon */}
        <div className="hidden md:flex w-full xl:w-auto items-center gap-2">
          {Object.entries(filterOptions).map(([filterName, options]) => (
            <Popover key={filterName}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5 shrink-0">
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

        {/* Actions - horizontally scrollable on mobile */}
        <div className="flex w-full md:w-auto overflow-x-auto no-scrollbar items-center gap-2 pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 justify-end md:justify-start">
          <ExportCalendarModal>
            <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5 shrink-0">
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
          </ExportCalendarModal>
          <CheckAvailabilityModal>
            <Button variant="outline" className="flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5 shrink-0">
              <CalendarCheck className="h-3.5 w-3.5" />
              Check Available Slots
            </Button>
          </CheckAvailabilityModal>
          
          {/* Mobile-only Filter & Export Button */}
          <Button variant="outline" className="md:hidden flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5 shrink-0">
            <Filter className="h-3.5 w-3.5" />
            Filter & Export
          </Button>

          <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
