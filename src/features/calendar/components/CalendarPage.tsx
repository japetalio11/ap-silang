import * as React from "react"
import { useMemo, useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { Calendar, dateFnsLocalizer, Event as RBCEvent } from "react-big-calendar"
import format from "date-fns/format"
import parse from "date-fns/parse"
import startOfWeek from "date-fns/startOfWeek"
import getDay from "date-fns/getDay"
import { addMonths, subMonths, addWeeks, subWeeks, startOfDay } from "date-fns"
import enUS from "date-fns/locale/en-US"

import { CustomToolbar } from "./CustomToolbar"
import { CustomEvent } from "./CustomEvent"
import { WeeklyScheduleView } from "./WeeklyScheduleView"
import { CreateCampaignModal } from "@/features/campaigns/components/CreateCampaignModal"
import { CampaignListSidepeek } from "@/features/campaigns/components/CampaignListSidepeek"
import { Calendar as CalendarIcon, CalendarOff } from "lucide-react"

import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = {
  "en-US": enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

// Custom interface extending the standard event
export interface AppEvent extends RBCEvent {
  id?: string
  type?: 'campaign' | 'availability'
  status?: string
  travelTime?: string
}

export function CalendarPage() {
  const isMobile = useIsMobile()
  const isMobileRef = React.useRef(isMobile)
  React.useEffect(() => {
    isMobileRef.current = isMobile
  }, [isMobile])

  const [view, setView] = useState<any>('month')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)

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

      const views = ["month", "week"]
      const currentIndex = views.indexOf(view)

      if (isLeftSwipe && currentIndex < views.length - 1) {
        setView(views[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setView(views[currentIndex - 1])
      }
    }
  }

  // Set default date to current date so it highlights today (e.g. Tue 30)
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  const events: AppEvent[] = useMemo(() => {
    const list: AppEvent[] = []

    // Add the main campaign event
    list.push({
      id: "ev-1",
      title: "Community Blood Drive",
      start: new Date(2026, 5, 29, 8, 0), // 8 AM
      end: new Date(2026, 5, 29, 13, 0),  // 1 PM
      allDay: false,
      type: 'campaign',
      travelTime: '20 min travel time'
    })

    return list
  }, [])

  // Custom prop getter to highlight the selected date
  const dayPropGetter = React.useCallback((currentDay: Date) => {
    // We use a gray highlight for the selected date
    if (currentDay.getDate() === selectedDate.getDate() && currentDay.getMonth() === selectedDate.getMonth() && currentDay.getFullYear() === selectedDate.getFullYear()) {
      return {
        className: 'bg-white/5 dark:bg-white/10 transition-colors',
      }
    }
    return {}
  }, [selectedDate])

  // Custom cell wrapper to position badges at the bottom right of the background grid
  const CustomDateCellWrapper = ({ children, value }: any) => {
    // Only show badges for the visible month of June 2026 and its adjacent days in the grid
    const start = new Date(2026, 4, 31)
    const end = new Date(2026, 6, 4)

    let badge = null
    const dayOfWeek = value.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    if (value >= start && value <= end && !isWeekend) {
      const isDay29 = value.getDate() === 29 && value.getMonth() === 5
      const isBooked = isDay29
      const text = isDay29 ? "Fully Booked" : "5 Slots Available"
      const Icon = isBooked ? CalendarOff : CalendarIcon

      if (isMobile) {
        badge = (
          <div className="absolute bottom-1.5 right-1.5 z-10 pointer-events-none">
            <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold text-white ${isBooked ? 'bg-[#ff7373]' : 'bg-[#22C55E]'}`}>
              {isBooked ? <CalendarOff className="h-3 w-3" /> : '5'}
            </div>
          </div>
        )
      } else {
        badge = (
          <div className="absolute bottom-1.5 right-1.5 z-10">
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border ${isBooked ? 'bg-[#ff7373] border-[#ff7373]/20' : 'bg-[#22C55E] border-[#22C55E]/20'}`}>
              <Icon className="h-3 w-3" />
              {text}
            </div>
          </div>
        )
      }
    }

    return React.cloneElement(React.Children.only(children), {
      style: { ...children.props.style, position: 'relative' },
      onClick: (e: any) => {
        if (children.props.onClick) children.props.onClick(e);
        if (isMobile) {
          handleSelectSlot({ start: value });
        }
      },
      children: (
        <>
          {children.props.children}
          {badge}
        </>
      )
    })
  }

  const formats = {
    dateFormat: 'd',
    weekdayFormat: 'EEE', // 'Sun', 'Mon', 'Tue'
  }

  // Handle navigate from toolbar or calendar
  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY' | Date) => {
    if (action instanceof Date) {
      setViewDate(action)
      return
    }

    if (action === 'TODAY') {
      const today = startOfDay(new Date())
      setViewDate(today)
      setSelectedDate(today)
      return
    }

    if (view === 'month') {
      if (action === 'PREV') setViewDate(prev => subMonths(prev, 1))
      if (action === 'NEXT') setViewDate(prev => addMonths(prev, 1))
    } else if (view === 'week') {
      if (action === 'PREV') setViewDate(prev => subWeeks(prev, 1))
      if (action === 'NEXT') setViewDate(prev => addWeeks(prev, 1))
    }
  }

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedDate(slotInfo.start)
    setViewDate(slotInfo.start)
    const day = slotInfo.start.getDay()
    // On desktop, clicking a weekday opens the create modal. 
    // On mobile, it just selects the date to show events below.
    if (!isMobileRef.current && day !== 0 && day !== 6) {
      setIsCreateModalOpen(true)
    }
  }

  const handleSelectEvent = (event: AppEvent) => {
    setSelectedCampaign(event)
  }

  // Filter events for the selected date to show in the mobile bottom section
  const selectedDateEvents = useMemo(() => {
    return events.filter(e => e.start && selectedDate &&
      e.start.getDate() === selectedDate.getDate() &&
      e.start.getMonth() === selectedDate.getMonth() &&
      e.start.getFullYear() === selectedDate.getFullYear()
    )
  }, [events, selectedDate])

  return (
    <div 
      className="flex flex-col h-full bg-background dark:bg-black p-4 text-foreground relative min-h-0 w-full overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
    >
      {/* Extracted Toolbar */}
      <div className="shrink-0 mb-4 z-10">
        <CustomToolbar
          date={viewDate}
          view={view}
          onViewChange={setView}
          onNavigate={handleNavigate}
        />
      </div>

      <div className={`flex-1 w-full bg-transparent relative overflow-hidden ${isMobile ? 'flex flex-col' : ''}`}>
        <div
          className={`absolute inset-0 transition-all duration-300 ease-in-out ${view === 'month'
            ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
            : 'opacity-0 -translate-x-4 pointer-events-none z-0'
            }`}
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view="month"
            onView={() => { }}
            date={viewDate}
            onNavigate={handleNavigate}
            selectable
            longPressThreshold={10}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            dayPropGetter={dayPropGetter}
            components={{
              toolbar: () => null, // We render the toolbar outside
              event: isMobile ? () => null : CustomEvent, // Hide event pills in grid on mobile
              dateCellWrapper: CustomDateCellWrapper,
            }}
            tooltipAccessor={() => null}
            formats={formats}
            className="w-full h-full custom-calendar"
          />
        </div>

        <div
          className={`absolute inset-0 transition-all duration-300 ease-in-out flex flex-col ${view === 'week'
            ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
            : 'opacity-0 translate-x-4 pointer-events-none z-0'
            }`}
        >
          <WeeklyScheduleView
            viewDate={viewDate}
            selectedDate={selectedDate}
            events={events}
            isMobile={isMobile}
            onSelectDate={(d) => handleSelectSlot({ start: d })}
            onSelectEvent={handleSelectEvent}
          />
        </div>
      </div>

      {/* Mobile Selected Date Events (Bottom Section) */}
      {isMobile && view === 'month' && (
        <div className="shrink-0 mt-4 border-t border-sidebar-border pt-4 pb-28">
          <h3 className="text-sm font-semibold mb-3">Events on {format(selectedDate, 'MMM d, yyyy')}</h3>
          <div className="flex flex-col gap-2 min-h-[60px] max-h-[180px] overflow-y-auto no-scrollbar pr-1">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map(event => (
                <CustomEvent key={event.id} event={event} onClick={handleSelectEvent} />
              ))
            ) : (
              <div className="text-sm text-muted-foreground italic flex items-center justify-center h-full">
                No events on this day
              </div>
            )}
          </div>
        </div>
      )}

      <CreateCampaignModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />

      {/* Desktop Floating Sidepeek Overlay */}
      {!isMobile && (
        <div
          className={`fixed top-0 right-0 h-screen w-[100%] sm:w-[400px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${selectedCampaign ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <CampaignListSidepeek
            campaign={selectedCampaign}
            onClose={() => setSelectedCampaign(null)}
            onAction={() => { }}
          />
        </div>
      )}

      {/* Mobile Sidepeek Drawer (from underneath with drag-to-dismiss) */}
      {isMobile && (
        <Drawer open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
          <DrawerContent className="p-0 bg-background dark:bg-[#0a0a0a] border-t border-sidebar-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden !h-[80dvh] flex flex-col focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Campaign Details</DrawerTitle>
            </div>
            <CampaignListSidepeek
              campaign={selectedCampaign}
              onClose={() => setSelectedCampaign(null)}
              onAction={() => { }}
            />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
