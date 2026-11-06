import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns"
import { CalendarPlus } from "lucide-react"


import { CustomToolbar } from "./CustomToolbar"
import { CustomEvent } from "./CustomEvent"
import { WeeklyScheduleView } from "./WeeklyScheduleView"
import { CreateAppointmentModal } from "./CreateAppointmentModal"
import type { AppEvent } from "./types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { TableRowActions } from "@/components/ui/table-row-actions"
import { useAuthSession } from "@/features/auth/auth-session"
import { verifyCurrentUserPassword } from "@/features/auth/password-verification"
import { getMaternalRecords } from "@/features/maternal-records/api"
import { toast } from "sonner"
import { appointmentToEvent, cancelAppointment, createAppointment, getAppointments, maternalRecordToAppointmentOption } from "../api"
import type { AppointmentFormValues, AppointmentMotherOption } from "./CreateAppointmentModal"

import "react-big-calendar/lib/css/react-big-calendar.css"

// Re-export AppEvent from the shared types file for backwards compatibility
export type { AppEvent } from "./types"

export function CalendarPage() {
  const isMobile = useIsMobile()
  const { session } = useAuthSession()
  const isMobileRef = React.useRef(isMobile)
  React.useEffect(() => {
    isMobileRef.current = isMobile
  }, [isMobile])

  const [view, setView] = useState<"month" | "week">('month')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDateAppointmentsOpen, setIsDateAppointmentsOpen] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState<AppEvent | null>(null)
  const [cancelPassword, setCancelPassword] = useState("")
  const [isCancelling, setIsCancelling] = useState(false)
  const [events, setEvents] = useState<AppEvent[]>([])
  const [mothers, setMothers] = useState<AppointmentMotherOption[]>([])
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(Boolean(session?.token))

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

  const loadCalendarData = useCallback(async (showToast = false) => {
    if (!session?.token) return
    setIsLoading(true)
    try {
      const [appointmentResponse, motherResponse] = await Promise.all([
        getAppointments(session.token),
        getMaternalRecords(session.token),
      ])
      const motherOptions = (motherResponse.result ?? []).map(maternalRecordToAppointmentOption)
      setMothers(motherOptions)
      setEvents((appointmentResponse.data ?? []).map((appointment) => {
        const mother = motherOptions.find((candidate) => candidate.userId && candidate.userId === appointment.user_id)
        return { ...appointmentToEvent(appointment), motherId: mother?.id }
      }))
      if (showToast) toast.success("Appointments refreshed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load appointments")
    } finally {
      setIsLoading(false)
    }
  }, [session])

  // Loading appointments is an external data synchronization effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { void loadCalendarData() }, [loadCalendarData])

  const filterOptions = useMemo(() => ({
    "Appointment Type": [...new Set(events.map((event) => event.appointmentType).filter((value): value is string => Boolean(value)))],
    Status: [...new Set(events.map((event) => event.status).filter((value): value is string => Boolean(value)))],
    Provider: [...new Set(events.map((event) => event.provider).filter((value): value is string => Boolean(value)))],
  }), [events])
  const visibleEvents = useMemo(() => events.filter((event) => {
    const matches = (key: string, value?: string) => !filters[key]?.length || Boolean(value && filters[key].includes(value))
    return matches("Appointment Type", event.appointmentType) && matches("Status", event.status) && matches("Provider", event.provider)
  }), [events, filters])

  const handleCreateAppointment = async (_event: AppEvent, values: AppointmentFormValues) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again to schedule an appointment.")
    const response = await createAppointment(session.token, {
      mother_id: values.motherId,
      appointment_date: values.date,
      appointment_time: values.time,
      appointment_type: values.appointmentType,
    })
    const createdEvent = {
      ...event,
      ...appointmentToEvent(response.data),
      patient: event.patient,
      title: event.title,
      motherId: values.motherId,
    }
    setEvents((current) => [...current.filter((item) => item.id !== createdEvent.id), createdEvent])
    return createdEvent
  }

  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel?.appointmentId || !session?.token || !session.user.user_id) return
    setIsCancelling(true)
    try {
      await verifyCurrentUserPassword(session.token, session.user.user_id, cancelPassword)
      await cancelAppointment(session.token, appointmentToCancel.appointmentId, appointmentToCancel.recordVersion)
      setEvents((current) => current.map((event) => event.id === appointmentToCancel.id ? { ...event, status: "Cancelled" } : event))
      toast.success("Appointment cancelled")
      setAppointmentToCancel(null)
      setCancelPassword("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel appointment")
    } finally {
      setIsCancelling(false)
    }
  }

  const monthWeeks = React.useMemo(() => {
    const firstWeek = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 })
    const lastWeek = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 })
    const weeks: Date[][] = []
    let weekStart = firstWeek
    while (weekStart <= lastWeek) {
      weeks.push(Array.from({ length: 5 }, (_, index) => addDays(weekStart, index)))
      weekStart = addDays(weekStart, 7)
    }
    return weeks
  }, [viewDate])

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

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start)
    setViewDate(start)
    const day = start.getDay()
    // On desktop, clicking a weekday opens the create modal. 
    // On mobile, it just selects the date to show events below.
    if (!isMobileRef.current && day !== 0 && day !== 6) {
      setIsCreateModalOpen(true)
    }
  }

  const handleSelectMonthDate = (date: Date) => {
    setSelectedDate(date)
    setViewDate(date)
    setIsDateAppointmentsOpen(true)
  }

  const handleSelectEvent = (event: AppEvent) => {
    if (!event.start) return
    setSelectedDate(event.start)
    setViewDate(event.start)
  }

  // Filter events for the selected date to show in the mobile bottom section
  const selectedDateEvents = useMemo(() => {
    return visibleEvents.filter(e => e.start && selectedDate &&
      e.start.getDate() === selectedDate.getDate() &&
      e.start.getMonth() === selectedDate.getMonth() &&
      e.start.getFullYear() === selectedDate.getFullYear()
    )
  }, [visibleEvents, selectedDate])

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
          onCreateAppointment={() => setIsCreateModalOpen(true)}
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={setFilters}
          onRefresh={() => void loadCalendarData(true)}
          events={visibleEvents}
        />
      </div>

      <div className={`flex-1 w-full bg-transparent relative overflow-hidden ${isMobile ? 'flex flex-col' : ''}`} aria-busy={isLoading}>
        <div
          className={`absolute inset-0 transition-all duration-300 ease-in-out ${view === 'month'
            ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
            : 'opacity-0 -translate-x-4 pointer-events-none z-0'
            }`}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-sidebar-border bg-background dark:bg-black">
            <div className="grid shrink-0 grid-cols-5 border-b border-sidebar-border bg-muted/30 dark:bg-[#0a0a0a]">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((weekday) => (
                <div key={weekday} className="border-r border-sidebar-border py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0">{weekday}</div>
              ))}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-5" style={{ gridTemplateRows: `repeat(${monthWeeks.length}, minmax(0, 1fr))` }}>
              {monthWeeks.flatMap((week, weekIndex) => week.map((day, dayIndex) => {
                const dayEvents = visibleEvents.filter((event) => event.start && isSameDay(event.start, day))
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, viewDate)
                return (
                  <div
                    key={`${weekIndex}-${day.toISOString()}`}
                    onClick={() => handleSelectMonthDate(day)}
                    className={`group flex min-h-0 min-w-0 cursor-pointer flex-col p-1.5 transition-colors sm:p-2 ${dayIndex < 4 ? 'border-r border-sidebar-border' : ''} ${weekIndex < monthWeeks.length - 1 ? 'border-b border-sidebar-border' : ''} ${isSelected ? 'bg-white/5 dark:bg-white/10' : 'hover:bg-muted/30 dark:hover:bg-white/5'} ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}`}
                  >
                    <span className={`mb-1 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${isSelected ? 'bg-foreground text-background' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
                      {dayEvents.slice(0, isMobile ? 1 : 3).map((event) => (
                        <CustomEvent key={event.id} event={event} onClick={handleSelectEvent} compact />
                      ))}
                      {dayEvents.length > (isMobile ? 1 : 3) && <span className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - (isMobile ? 1 : 3)} more</span>}
                    </div>
                  </div>
                )
              }))}
            </div>
          </div>
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
            events={visibleEvents}
            onSelectDate={(d) => handleSelectSlot({ start: d })}
            onSelectEvent={handleSelectEvent}
          />
        </div>
        {isLoading && <div className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-md border border-sidebar-border bg-background p-3 dark:bg-black" aria-label="Loading appointments" aria-busy="true">
          <div className="grid shrink-0 grid-cols-5 gap-2 border-b border-sidebar-border pb-2">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="mx-auto h-3.5 w-16 max-w-full" />)}</div>
          <div className="grid min-h-0 flex-1 grid-cols-5 grid-rows-5">{Array.from({ length: 25 }, (_, index) => <div key={index} className="flex min-w-0 flex-col gap-3 border-b border-r border-sidebar-border p-2"><Skeleton className="size-5 rounded-full" />{index % 3 === 0 && <><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-4/5" /></>}</div>)}</div>
        </div>}
      </div>


      <Dialog open={isDateAppointmentsOpen} onOpenChange={setIsDateAppointmentsOpen}>
        <DialogContent className="flex max-h-[80dvh] w-[calc(100%-2rem)] max-w-lg flex-col gap-4 overflow-hidden rounded-xl border-sidebar-border bg-background p-5 text-foreground">
          <DialogHeader className="shrink-0 gap-1">
            <DialogTitle className="text-base font-semibold">Appointments</DialogTitle>
            <DialogDescription>{format(selectedDate, "EEEE, MMMM d, yyyy")}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 max-h-[min(52dvh,28rem)] flex-1 overflow-y-auto">
            {selectedDateEvents.length ? (
              <div className="flex flex-col gap-2 pr-1">
                {selectedDateEvents.map((event) => <div key={event.id} className="flex items-center gap-1.5">
                  <div className="min-w-0 flex-1"><CustomEvent event={event} onClick={handleSelectEvent} compact /></div>
                  {event.appointmentId && <TableRowActions label={`Actions for ${event.patient ?? "appointment"}`}>
                    <DropdownMenuItem onSelect={() => { setIsDateAppointmentsOpen(false); setAppointmentToCancel(event) }} disabled={event.status?.toLowerCase() === "cancelled" || event.status?.toLowerCase() === "completed"} className="text-destructive focus:text-destructive">Cancel Appointment</DropdownMenuItem>
                  </TableRowActions>}
                </div>)}
              </div>
            ) : (
              <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed border-sidebar-border px-4 text-center text-sm text-muted-foreground">
                No appointments scheduled for this date.
              </div>
            )}
          </div>
          <DialogFooter className="flex-row justify-between gap-3 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setIsDateAppointmentsOpen(false)} className="h-8 px-3 text-xs">Close</Button>
            <Button type="button" onClick={() => { setIsDateAppointmentsOpen(false); setIsCreateModalOpen(true) }} className="h-8 gap-1.5 px-3 text-xs">
              <CalendarPlus className="size-3.5" />Schedule Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(appointmentToCancel)} onOpenChange={(open) => { if (!open && !isCancelling) { setAppointmentToCancel(null); setCancelPassword("") } }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-5 rounded-xl border-sidebar-border bg-background p-5 text-foreground">
          <DialogHeader className="gap-2 pr-6">
            <DialogTitle className="text-base font-semibold">Cancel this appointment?</DialogTitle>
            <DialogDescription className="text-sm">Cancel the appointment for {appointmentToCancel?.patient ?? "this mother"}? The appointment will remain in the record with a cancelled status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="appointment-cancel-password" className="text-xs font-medium">Enter your password</Label>
            <Input id="appointment-cancel-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={cancelPassword} onChange={(event) => setCancelPassword(event.target.value)} className="h-9 text-xs" />
          </div>
          <DialogFooter className="flex-row justify-between gap-3 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => { setAppointmentToCancel(null); setCancelPassword("") }} className="h-8 text-xs">Keep Appointment</Button>
            <Button type="button" variant="destructive" disabled={!cancelPassword.trim() || isCancelling} onClick={() => void confirmCancelAppointment()} className="h-8 text-xs">{isCancelling ? "Cancelling…" : "Confirm Cancellation"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateAppointmentModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreate={handleCreateAppointment}
        mothers={mothers}
        loadingMothers={isLoading}
      />
    </div>
  )
}
