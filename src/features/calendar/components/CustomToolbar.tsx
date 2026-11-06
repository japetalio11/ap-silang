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
  Filter,
  RotateCcw,
} from "lucide-react"
import { format } from "date-fns"
import { ExportCalendarModal } from "./ExportCalendarModal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
export interface CustomToolbarProps {
  date: Date
  view: string
  onViewChange: (view: string) => void
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onCreateAppointment: () => void
  filters: Record<string, string[]>
  filterOptions: Record<string, string[]>
  onFiltersChange: (filters: Record<string, string[]>) => void
  onRefresh: () => void
  events: import("./types").AppEvent[]
}

export function CustomToolbar(props: CustomToolbarProps) {
  const { date, onNavigate, view, onViewChange, onCreateAppointment, filters: selectedFilters, filterOptions, onFiltersChange, onRefresh, events } = props

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

  const toggleFilter = (filterName: string, option: string, checked: boolean) => {
    const current = selectedFilters
      const values = current[filterName] ?? []
      const nextValues = checked
        ? [...values, option]
        : values.filter((value) => value !== option)
      const next = { ...current }
      if (nextValues.length) next[filterName] = nextValues
      else delete next[filterName]
    onFiltersChange(next)
  }
  const hasActiveFilters = Object.values(selectedFilters).some((values) => values.length > 0)

  return (
    <div className="flex flex-col gap-3 text-foreground dark:text-white">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <TooltipProvider delayDuration={500}>
              <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={goToBack} aria-label="Previous period" className="size-8 border-sidebar-border"><ChevronLeft className="size-4" /></Button></TooltipTrigger><TooltipContent>Previous period</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={goToNext} aria-label="Next period" className="size-8 border-sidebar-border"><ChevronRight className="size-4" /></Button></TooltipTrigger><TooltipContent>Next period</TooltipContent></Tooltip>
            </TooltipProvider>
            <Button variant="outline" onClick={goToCurrent} className="h-8 shrink-0 border-sidebar-border px-3 text-xs font-medium">Today</Button>
          </div>
          <h2 className="min-w-0 truncate text-base font-semibold">{format(date, 'MMMM yyyy')}</h2>
        </div>

        <TooltipProvider>
          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            <ExportCalendarModal events={events} viewDate={date} view={view}>
              <div className="contents">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Export calendar" className="size-8 border-sidebar-border">
                      <Download className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export</TooltipContent>
                </Tooltip>
              </div>
            </ExportCalendarModal>
          <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onRefresh} aria-label="Refresh calendar" className="size-8 border-sidebar-border">
                  <RefreshCw className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          <Button onClick={onCreateAppointment} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs font-medium">
            <PlusCircle className="size-3.5" />
            Schedule Appointment
          </Button>
          </div>
        </TooltipProvider>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-2 md:flex">
          {Object.entries(filterOptions).filter(([, options]) => options.length > 0).map(([filterName, options]) => (
            <Popover key={filterName}>
              <PopoverTrigger asChild>
                <Button variant="filter" size="filter" className="shrink-0">
                  <PlusCircle className="size-3.5" />
                  {filterName}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="start">
                <div className="flex flex-col gap-3">
                  {options.map((option) => {
                    const id = `filter-${filterName}-${option}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                    return (
                      <label key={option} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-xs">
                        <Checkbox
                          id={id}
                          checked={(selectedFilters[filterName] ?? []).includes(option)}
                          onCheckedChange={(checked) => toggleFilter(filterName, option, checked === true)}
                          className="size-3.5 rounded-[4px] border-sidebar-border"
                        />
                        <span>{option}</span>
                      </label>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          ))}
          {hasActiveFilters && (
            <Button variant="ghost" onClick={() => onFiltersChange({})} className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground">
              <RotateCcw className="size-3.5" />
              Reset Filter
            </Button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="filter" size="filter" className="shrink-0 md:hidden">
            <Filter className="size-3.5" />
            Filters
          </Button>
          <Tabs value={view} onValueChange={handleViewChange} className="shrink-0">
            <TabsList className="h-9 w-max justify-start gap-1">
              <TabsTrigger value="month" className="h-full px-2 py-1 text-xs font-medium">Month Grid</TabsTrigger>
              <TabsTrigger value="week" className="h-full px-2 py-1 text-xs font-medium">Weekly Schedule</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
