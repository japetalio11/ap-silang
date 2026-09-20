import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { X, Calendar as CalendarIcon } from "lucide-react"

export function ExportCalendarModal({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRange] = React.useState<any>()

  return (
    <ResponsiveModal 
      trigger={children}
      title="Export Calendar Data"
      description="Download a generated report based on your current filters."
    >
        
        <div className="flex flex-col gap-5 py-2">
          {/* File Format */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">File Format</h4>
            <RadioGroup defaultValue="pdf" className="gap-2.5">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="format-pdf" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="format-pdf" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">PDF Document</span> <span className="text-muted-foreground">Best for printing and sharing</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="format-csv" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="format-csv" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">CSV</span> <span className="text-muted-foreground">Raw schedule data</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">Date Range</h4>
            <RadioGroup defaultValue="current" className="gap-2.5">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="current" id="range-current" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="range-current" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">Current View</span> <span className="text-muted-foreground">(June 2026)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="next30" id="range-next30" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="range-next30" className="text-xs font-normal text-foreground dark:text-white">
                  Next 30 Days
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2 mr-2">
                  <RadioGroupItem value="custom" id="range-custom" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                  <Label htmlFor="range-custom" className="text-xs font-normal text-foreground dark:text-white whitespace-nowrap">
                    Custom Range
                  </Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-[200px] justify-start text-left font-normal bg-transparent border-sidebar-border h-7 text-xs ${!dateRange ? "text-muted-foreground" : "text-foreground dark:text-white"}`}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </RadioGroup>
          </div>

          {/* Visual Layout */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">Visual Layout</h4>
            <RadioGroup defaultValue="weekly" className="gap-2.5">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="layout-weekly" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="layout-weekly" className="text-xs font-normal text-foreground dark:text-white">
                  Weekly Schedule
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="layout-month" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="layout-month" className="text-xs font-normal text-foreground dark:text-white">
                  Month Grid
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Event Details to Show */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">Event Details to Show</h4>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center space-x-2">
                <Checkbox id="detail-title" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black h-3.5 w-3.5 rounded-full" />
                <Label htmlFor="detail-title" className="text-xs font-normal text-foreground dark:text-white">
                  Campaign Title & Travel Time
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="detail-location" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black h-3.5 w-3.5 rounded-full" />
                <Label htmlFor="detail-location" className="text-xs font-normal text-foreground dark:text-white">
                  Location & Venue
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="detail-staff" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black h-3.5 w-3.5 rounded-full" />
                <Label htmlFor="detail-staff" className="text-xs font-normal text-foreground dark:text-white">
                  Assigned Staff
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Button variant="secondary" className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white h-8">
            Cancel
          </Button>
          <Button className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-8">
            Export Calendar
          </Button>
        </div>
    </ResponsiveModal>
  )
}

