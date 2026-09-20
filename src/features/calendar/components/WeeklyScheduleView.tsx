import * as React from "react"
import { format, startOfWeek, addDays, isSameDay, isSameMonth } from "date-fns"
import { AppEvent } from "./CalendarPage"
import { CustomEvent } from "./CustomEvent"
import { CalendarOff, Calendar as CalendarIcon } from "lucide-react"

interface WeeklyScheduleViewProps {
  viewDate: Date
  selectedDate: Date
  events: AppEvent[]
  isMobile: boolean
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: AppEvent) => void
}

export function WeeklyScheduleView({ viewDate, selectedDate, events, isMobile, onSelectDate, onSelectEvent }: WeeklyScheduleViewProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60 // Scroll to 8 AM by default
    }
  }, [])

  // Get the start of the week based on the view date
  const startDate = startOfWeek(viewDate)

  // Create an array of 7 days
  const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i))

  return (
    <div className="flex-1 w-full flex bg-background dark:bg-[#000000] border-t border-l border-sidebar-border overflow-hidden">
      <div ref={scrollRef} className="flex w-full h-full overflow-y-auto overflow-x-auto relative">
        <div className="flex min-w-max h-max w-full">

          {/* Sticky Time Gutter */}
          <div className="w-12 md:w-16 shrink-0 border-r border-sidebar-border bg-background dark:bg-black sticky left-0 z-30 flex flex-col">
            <div className="h-20 shrink-0 border-b border-sidebar-border bg-background dark:bg-black sticky top-0 z-40"></div>
            <div className="relative h-[1440px] shrink-0">
              {Array.from({ length: 24 }).map((_, i) => {
                const hour = i;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                return (
                  <div key={i} className="absolute w-full flex justify-end pr-2 text-[10px] text-muted-foreground" style={{ top: `${i === 0 ? 2 : i * 60 - 8}px` }}>
                    {displayHour} {ampm}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Days Columns */}
          <div className="flex-1 flex min-w-[700px]">
            {days.map((day, idx) => {
              const isActiveDay = isSameDay(day, selectedDate)

              // Filter events for this day
              const dayEvents = events.filter(e => isSameDay(e.start, day))

              // Badges Logic
              const isDay29 = day.getDate() === 29 && day.getMonth() === 5
              const isBooked = isDay29
              const badgeText = isDay29 ? "Fully Booked" : "5 Slots Available"
              const BadgeIcon = isBooked ? CalendarOff : CalendarIcon
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const showBadge = !isWeekend && (day >= new Date(2026, 4, 31) && day <= new Date(2026, 6, 4))

              return (
                <div
                  key={idx}
                  className={`flex-1 flex flex-col border-r border-sidebar-border relative min-w-0 transition-colors ${isActiveDay ? 'bg-white/5 dark:bg-white/10' : 'hover:bg-white/5'}`}
                >
                  {/* Header (Sticky) */}
                  <div
                    onClick={() => onSelectDate(day)}
                    className="flex flex-col items-center py-4 shrink-0 h-20 border-b border-sidebar-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:bg-black/95 sticky top-0 z-20 cursor-pointer relative"
                  >
                    <span className={`text-xs font-medium ${isWeekend ? 'text-muted-foreground' : 'text-foreground dark:text-white/70'}`}>
                      {format(day, 'E')}
                    </span>
                    <div className={`mt-1 flex items-center justify-center w-9 h-9 shrink-0 rounded-full text-lg font-semibold ${isActiveDay ? 'bg-black text-white dark:bg-white dark:text-black' : isWeekend ? 'text-muted-foreground' : 'text-foreground dark:text-white'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>

                  {/* Grid Area */}
                  <div className="relative h-[1440px] shrink-0 cursor-pointer" onClick={() => onSelectDate(day)}>

                    {/* Availability Badge (Sticky on Time Grid) */}
                    {showBadge && (
                      <div className="sticky top-[80px] left-0 w-full flex justify-end pr-2 z-30 pointer-events-none pt-2">
                        {isMobile ? (
                          <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold text-white shadow-md ${isBooked ? 'bg-[#ff7373]' : 'bg-[#22C55E]'}`}>
                            {isBooked ? <CalendarOff className="h-3 w-3" /> : '5'}
                          </div>
                        ) : (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border shadow-sm ${isBooked ? 'bg-[#ff7373] border-[#ff7373]/20' : 'bg-[#22C55E] border-[#22C55E]/20'}`}>
                            <BadgeIcon className="h-3 w-3" />
                            {badgeText}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Horizontal Grid Lines */}
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className="absolute w-full border-t border-sidebar-border/30 pointer-events-none" style={{ top: `${i * 60}px` }}></div>
                    ))}

                    {/* Absolute Events */}
                    {dayEvents.map(event => {
                      const startHour = event.start.getHours() + event.start.getMinutes() / 60
                      let endHour = event.end.getHours() + event.end.getMinutes() / 60
                      if (endHour <= startHour) endHour = startHour + 1 // Fallback to 1 hour duration

                      // Clamp to grid
                      const clampedStartHour = Math.max(0, Math.min(24, startHour))
                      const clampedEndHour = Math.max(0, Math.min(24, endHour))
                      const duration = clampedEndHour - clampedStartHour

                      const top = clampedStartHour * 60
                      const height = Math.max(30, duration * 60) // Min height 30px

                      return (
                        <div key={event.id} className="absolute w-full px-1 z-10" style={{ top: `${top}px`, height: `${height}px` }}>
                          <CustomEvent event={event} onClick={onSelectEvent} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
