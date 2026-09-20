import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function CreateCampaignModal({ 
  children,
  open,
  onOpenChange
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [startDate, setStartDate] = React.useState<Date>()
  const [endDate, setEndDate] = React.useState<Date>()

  return (
    <ResponsiveModal 
      open={open} 
      onOpenChange={onOpenChange}
      title="Create a Campaign"
      description="Fill out the details below to initialize a new campaign."
      trigger={children}
    >
        
        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="text-xs font-medium text-foreground dark:text-white">Title</Label>
            <Input 
              id="title" 
              placeholder="Add a title for this event." 
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground"
            />
          </div>

          {/* Campaign Type */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="type" className="text-xs font-medium text-foreground dark:text-white">Campaign Type</Label>
            <Select>
              <SelectTrigger id="type" className="!h-8 w-full bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-muted-foreground">
                <SelectValue placeholder="Choose campaign type" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white">
                <SelectItem value="advocacy" className="text-xs">Advocacy</SelectItem>
                <SelectItem value="blood-drive" className="text-xs">Blood Drive</SelectItem>
                <SelectItem value="training" className="text-xs">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start-date" className="text-xs font-medium text-foreground dark:text-white">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "!h-8 w-full justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                      !startDate ? "text-muted-foreground" : "text-foreground dark:text-white"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {startDate ? format(startDate, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="start-time" className="text-xs font-medium text-foreground dark:text-white">Start Time</Label>
              <Input 
                id="start-time" 
                type="time"
                defaultValue="10:30" 
                className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="end-date" className="text-xs font-medium text-foreground dark:text-white">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "!h-8 w-full justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                      !endDate ? "text-muted-foreground" : "text-foreground dark:text-white"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {endDate ? format(endDate, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end-time" className="text-xs font-medium text-foreground dark:text-white">End Time</Label>
              <Input 
                id="end-time" 
                type="time"
                defaultValue="10:30" 
                className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
              />
            </div>
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="comments" className="text-xs font-medium text-foreground dark:text-white">Comments</Label>
            <Textarea 
              id="comments" 
              placeholder="Add any additional comments" 
              className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground min-h-[80px] resize-none"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Button variant="secondary" onClick={() => onOpenChange?.(false)} className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white dark:border-sidebar-border">
            Save as Draft
          </Button>
          <Button className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
            Create Campaign
          </Button>
        </div>
    </ResponsiveModal>
  )
}

