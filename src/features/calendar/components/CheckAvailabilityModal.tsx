import * as React from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function CheckAvailabilityModal({ children }: { children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[280px] bg-popover dark:bg-[#222] border-border text-foreground p-3 rounded-lg shadow-xl gap-2 flex flex-col">
        <p className="text-xs font-normal text-muted-foreground leading-relaxed">
          There are <strong className="text-foreground dark:text-white font-semibold">7</strong> available slots for the month of <strong className="text-foreground dark:text-white font-semibold">June 2026</strong>
        </p>
        <p className="text-sm font-medium text-foreground dark:text-white tracking-wide">
          1, 7, 16, 20, 24, 30
        </p>
      </PopoverContent>
    </Popover>
  )
}
