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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, CircleX, Minus, Plus, Calendar as CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"

export function CreatePlottingRuleModal({ 
  children,
  open,
  onOpenChange
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = React.useState("date-block")
  const [selectedDays, setSelectedDays] = React.useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
  const [exceptions, setExceptions] = React.useState<string[]>(["December 25, 2025"])
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [exceptionDate, setExceptionDate] = React.useState<Date>()
  
  // Swipe gesture handling
  const [touchStartPos, setTouchStartPos] = React.useState<{x: number, y: number} | null>(null)
  const [touchEndPos, setTouchEndPos] = React.useState<{x: number, y: number} | null>(null)
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

      const tabs = ["date-block", "time-capacity"]
      const currentIndex = tabs.indexOf(activeTab)

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1])
      }
    }
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const removeException = (date: string) => {
    setExceptions(prev => prev.filter(d => d !== date))
  }
  
  return (
    <ResponsiveModal 
      open={open} 
      onOpenChange={onOpenChange}
      title="Create Plotting Rule"
      description="Define the operational availability for a specific time block."
      trigger={children}
    >
      <div 
        className="flex flex-col gap-5 py-2"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        {/* Rule Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="rule-name" className="text-xs font-medium text-foreground dark:text-white">Rule Name</Label>
          <Input 
            id="rule-name" 
            placeholder="Add a title for this event." 
            className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground"
          />
        </div>

        {/* Date Range */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-foreground dark:text-white">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "!h-8 w-full justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                  !dateRange ? "text-muted-foreground" : "text-foreground dark:text-white"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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
                  <span>Select date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="start">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-8 w-full p-1 rounded-md">
            <TabsTrigger value="date-block" className="flex-1 text-xs font-medium data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-[#0a0a0a] dark:data-[state=active]:text-white dark:data-[state=active]:border-sidebar-border text-muted-foreground border border-transparent rounded-sm transition-all h-full">Date Block Settings</TabsTrigger>
            <TabsTrigger value="time-capacity" className="flex-1 text-xs font-medium data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-[#0a0a0a] dark:data-[state=active]:text-white dark:data-[state=active]:border-sidebar-border text-muted-foreground border border-transparent rounded-sm transition-all h-full">Time Capacity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="time-capacity" className="flex flex-col gap-5 pt-4 m-0">
            {/* Operational Window */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground dark:text-white">Operational Window</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  defaultValue="10:30" 
                  className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white text-center"
                />
                <Input 
                  defaultValue="10:30" 
                  className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white text-center"
                />
              </div>
            </div>
            
            {/* Daily Capacity */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground dark:text-white">Daily Capacity</Label>
                <span className="text-[11px] text-muted-foreground">Max events</span>
              </div>
              <div className="flex items-center h-8 rounded-md border border-sidebar-border bg-background dark:bg-[#0a0a0a] overflow-hidden">
                <button className="flex items-center justify-center w-8 h-full hover:bg-accent dark:hover:bg-white/5 text-muted-foreground">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center justify-center w-10 h-full border-x border-sidebar-border text-xs text-foreground dark:text-white">
                  8
                </div>
                <button className="flex items-center justify-center w-8 h-full hover:bg-accent dark:hover:bg-white/5 text-muted-foreground">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="date-block" className="flex flex-col gap-5 pt-4 m-0">
            {/* Applicable Days */}
            <div className="flex flex-col gap-3">
              <Label className="text-xs font-medium text-foreground dark:text-white">Applicable Days</Label>
              <div className="flex flex-wrap gap-2">
                {["Saturday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"].map(day => {
                  const isSelected = selectedDays.includes(day)
                  return (
                    <div 
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sidebar-border cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-primary/10 dark:bg-[#2a2a2a] text-foreground dark:text-white" 
                          : "bg-transparent text-muted-foreground hover:bg-accent dark:hover:bg-white/5"
                      }`}
                    >
                      {isSelected && <CircleX className="h-3.5 w-3.5" />}
                      <span className="text-xs">{day}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Exceptions */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground dark:text-white">Exceptions</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "!h-8 flex-1 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                        !exceptionDate ? "text-muted-foreground" : "text-foreground dark:text-white"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {exceptionDate ? format(exceptionDate, "PPP") : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={exceptionDate}
                      onSelect={setExceptionDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button className="h-8 text-xs font-medium bg-[#e5e5e5] text-black hover:bg-[#d5d5d5] dark:bg-[#e5e5e5] dark:text-black">
                  Add Date
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Exclude specific dates within this block.</p>
              
              <div className="flex flex-wrap mt-1 gap-2">
                {exceptions.map(date => (
                  <div key={date} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-sidebar-border w-fit bg-card dark:bg-[#222]">
                    <CircleX 
                      className="h-3.5 w-3.5 text-foreground dark:text-white cursor-pointer hover:text-red-500 transition-colors" 
                      onClick={() => removeException(date)} 
                    />
                    <span className="text-[11px] text-foreground dark:text-white">{date}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Button variant="outline" onClick={() => onOpenChange?.(false)} className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white dark:border-sidebar-border">
          Cancel
        </Button>
        <Button className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
          Save Rule
        </Button>
      </div>
    </ResponsiveModal>
  )
}
