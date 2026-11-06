import * as React from "react"
import { format, startOfWeek, addDays, isSameDay, startOfDay } from "date-fns"
import type { AppEvent } from "./types"

import { CustomEvent } from "./CustomEvent"

interface WeeklyScheduleViewProps {
  viewDate: Date
  selectedDate: Date
  events: AppEvent[]
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: AppEvent) => void
}

export function WeeklyScheduleView({ viewDate, selectedDate, events, onSelectDate, onSelectEvent }: WeeklyScheduleViewProps) {
  const scheduleStartHour = 7
  const scheduleEndHour = 17
  const scheduleStartMinutes = scheduleStartHour * 60
  const scheduleEndMinutes = scheduleEndHour * 60
  const scheduleHeight = scheduleEndMinutes - scheduleStartMinutes

  // Get the start of the week based on the view date
  const startDate = startOfWeek(viewDate, { weekStartsOn: 1 })

  // Render the clinic work week only.
  const days = Array.from({ length: 5 }).map((_, i) => addDays(startDate, i))

  return (
    <div className="flex-1 w-full flex overflow-hidden rounded-md border border-sidebar-border bg-background dark:bg-[#000000]">
      <div className="flex w-full h-full overflow-y-auto overflow-x-auto relative">
        <div className="flex min-w-max h-max w-full">

          {/* Sticky Time Gutter */}
          <div className="w-12 md:w-16 shrink-0 border-r border-sidebar-border bg-background dark:bg-black sticky left-0 z-30 flex flex-col">
            <div className="h-20 shrink-0 border-b border-sidebar-border bg-background dark:bg-black sticky top-0 z-40"></div>
            <div className="relative shrink-0" style={{ height: `${scheduleHeight}px` }}>
              {Array.from({ length: scheduleEndHour - scheduleStartHour + 1 }).map((_, i) => {
                const hour = scheduleStartHour + i;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                return (
                  <div key={i} className="absolute w-full flex justify-end pr-2 text-xs text-muted-foreground" style={{ top: `${i === 0 ? 2 : i * 60 - 8}px` }}>
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
              const dayStart = startOfDay(day)
              const dayStartMs = dayStart.getTime()
              const dayEvents = events.flatMap((event) => {
                  if (!event.start || !isSameDay(event.start, day)) return []
                  const start = event.start as Date
                  const rawEnd = event.end instanceof Date ? event.end : new Date(start.getTime() + 60 * 60 * 1000)
                  const end = rawEnd.getTime() > start.getTime() ? rawEnd : new Date(start.getTime() + 60 * 60 * 1000)
                  const eventStartMinutes = (start.getTime() - dayStartMs) / 60_000
                  const eventEndMinutes = (end.getTime() - dayStartMs) / 60_000
                  if (eventEndMinutes <= scheduleStartMinutes || eventStartMinutes >= scheduleEndMinutes) return []
                  const startMinutes = Math.max(scheduleStartMinutes, eventStartMinutes) - scheduleStartMinutes
                  const endMinutes = Math.min(scheduleEndMinutes, eventEndMinutes) - scheduleStartMinutes
                  return [{ event, startMinutes, endMinutes, column: 0 }]
                })
                .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes)

              const positionedEvents: Array<(typeof dayEvents)[number] & { columnCount: number }> = []
              let overlapGroup: typeof dayEvents = []
              let columnEnds: number[] = []
              let overlapGroupEnd = -1
              const finishOverlapGroup = () => {
                const columnCount = Math.max(1, columnEnds.length)
                positionedEvents.push(...overlapGroup.map((item) => ({ ...item, columnCount })))
                overlapGroup = []
                columnEnds = []
                overlapGroupEnd = -1
              }

              dayEvents.forEach((item) => {
                if (overlapGroup.length && item.startMinutes >= overlapGroupEnd) finishOverlapGroup()
                let column = columnEnds.findIndex((end) => end <= item.startMinutes)
                if (column === -1) column = columnEnds.length
                columnEnds[column] = item.endMinutes
                overlapGroupEnd = Math.max(overlapGroupEnd, item.endMinutes)
                overlapGroup.push({ ...item, column })
              })
              if (overlapGroup.length) finishOverlapGroup()

              return (
                <div
                  key={day.toISOString()}
                  className={`relative flex min-w-0 flex-1 flex-col transition-colors ${idx < days.length - 1 ? 'border-r border-sidebar-border' : ''} ${isActiveDay ? 'bg-white/5 dark:bg-white/10' : 'hover:bg-white/5'}`}
                >
                  {/* Header (Sticky) */}
                  <div
                    onClick={() => onSelectDate(day)}
                    className="flex flex-col items-center py-4 shrink-0 h-20 border-b border-sidebar-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:bg-black/95 sticky top-0 z-20 cursor-pointer relative"
                  >
                    <span className="text-xs font-medium text-foreground dark:text-white/70">
                      {format(day, 'E')}
                    </span>
                    <div className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${isActiveDay ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-foreground dark:text-white'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>

                  {/* Grid Area */}
                  <div className="relative shrink-0 cursor-pointer" style={{ height: `${scheduleHeight}px` }} onClick={() => onSelectDate(day)}>

                    {/* Horizontal Grid Lines */}
                    {Array.from({ length: scheduleEndHour - scheduleStartHour + 1 }).map((_, i) => (
                      <div key={i} className="absolute w-full border-t border-sidebar-border/30 pointer-events-none" style={{ top: `${i * 60}px` }}></div>
                    ))}

                    {/* Absolute Events */}
                    {positionedEvents.map(({ event, startMinutes, endMinutes, column, columnCount }) => {
                      const top = startMinutes
                      const height = Math.min(scheduleHeight - top, Math.max(30, endMinutes - startMinutes))
                      const width = 100 / columnCount
                      return (
                        <div key={event.id} className="absolute z-10 px-0.5 sm:px-1" style={{ top: `${top}px`, height: `${height}px`, left: `${column * width}%`, width: `${width}%` }}>
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
