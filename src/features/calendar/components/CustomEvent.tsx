import * as React from "react"
import { Calendar as CalendarIcon, Car, MapPin, Building, CheckCircle2 } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useIsMobile } from "@/hooks/use-mobile"

export function CustomEvent({ event, onClick }: any) {
  const isMobile = useIsMobile();
  if (event.type === 'availability') {
    return (
      <div 
        onClick={(e) => {
          if (onClick) onClick(event);
        }}
        className="flex w-full justify-end pr-1 mt-1"
      >
        <div className={`inline-flex items-center gap-1.5 rounded-sm font-medium text-white whitespace-nowrap border bg-[#22C55E] border-[#22C55E]/20 cursor-pointer ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[10px]'}`}>
          <CalendarIcon className={isMobile ? "h-3.5 w-3.5" : "h-3 w-3"} />
          {event.title}
        </div>
      </div>
    )
  }

  // Default Campaign Event
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div 
          onClick={(e) => {
            if (onClick) onClick(event);
          }}
          className={`flex h-full bg-transparent border border-sidebar-border rounded-md text-foreground dark:text-white overflow-hidden m-0.5 cursor-pointer hover:bg-white/5 transition-colors ${isMobile ? 'gap-3 p-3' : 'gap-1.5 p-1.5'}`}
        >
          <div className={`${isMobile ? 'w-1.5' : 'w-[3px]'} bg-[#22C55E] rounded-full shrink-0`}></div>
          <div className="flex flex-col min-w-0 justify-center">
            <span className={`${isMobile ? 'text-sm' : 'text-[11px]'} font-semibold truncate leading-tight`}>{event.title}</span>
            {event.travelTime && (
              <div className={`flex items-center gap-1 mt-1 text-muted-foreground ${isMobile ? 'text-xs' : 'text-[9px] mt-0.5'}`}>
                <Car className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} shrink-0`} />
                <span className="truncate">{event.travelTime}</span>
              </div>
            )}
          </div>
        </div>
      </HoverCardTrigger>
      
      <HoverCardContent side="bottom" align="start" className="w-[300px] bg-popover dark:bg-[#222] border border-sidebar-border p-3 flex flex-col gap-3 rounded-lg shadow-xl z-50">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-medium text-foreground dark:text-white leading-tight">{event.title}</h4>
          <div className="flex items-center gap-1 bg-[#22c55e] text-white px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </div>
        </div>
        
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-normal shrink-0">
              <CalendarIcon className="h-3.5 w-3.5" />
              Date & Time
            </div>
            <div className="text-xs text-foreground dark:text-white font-normal text-right">June 08, 2026 8AM - 1PM</div>
          </div>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-normal shrink-0">
              <Building className="h-3.5 w-3.5" />
              Venue
            </div>
            <div className="text-xs text-foreground dark:text-white font-normal text-right">Ateneo de Naga University</div>
          </div>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-normal shrink-0">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </div>
            <div className="text-xs text-foreground dark:text-white font-normal text-right">Bagumbayan Sur, Naga City</div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
