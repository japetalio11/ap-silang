import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Download,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ArrowRight,
  TriangleAlert,
  UsersRound,
} from "lucide-react"
import { format, isSameDay, isValid, parse, startOfDay } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { TableSkeletonRows } from "@/components/ui/table-skeleton-rows"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ExportCalendarModal } from "@/features/calendar/components/ExportCalendarModal"
import { appointmentToEvent, getAppointments, type AppointmentRecord } from "@/features/calendar/api"
import { useAuthSession } from "@/features/auth/auth-session"
import { getLatestMaternalPregnancy, getLatestPrenatalVisit, getMaternalRecords, normalizeMaternalRisk, type MaternalRecord } from "@/features/maternal-records/api"

type AppointmentView = "today" | "upcoming" | "completed" | "cancelled"
type AppointmentRow = { appointment: AppointmentRecord; mother?: MaternalRecord; name: string; serial: string; start: Date | null; status: string; searchText: string }

const appointmentViews: Array<{ value: AppointmentView; label: string }> = [
  { value: "today", label: "Today’s Queue" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const normalizeStatus = (status?: string | null) => (status ?? "Scheduled").trim().toLowerCase()
const isCompleted = (status: string) => ["completed", "complete", "done"].includes(normalizeStatus(status))
const isCancelled = (status: string) => ["cancelled", "canceled", "rejected"].includes(normalizeStatus(status))
const formatStatusLabel = (status: string) => status
  .replace(/[_-]+/g, " ")
  .trim()
  .toLowerCase()
  .replace(/\b\w/g, (character) => character.toUpperCase())

function getAppointmentDate(appointment: AppointmentRecord): Date | null {
  if (!appointment.appointment_date) return null
  const datePart = appointment.appointment_date.slice(0, 10)
  const timePart = appointment.appointment_time?.trim()
  const referenceDate = new Date()
  const candidates = !timePart
    ? [parse(`${datePart} 09:00`, "yyyy-MM-dd HH:mm", referenceDate)]
    : timePart.toLowerCase().includes("m")
      ? [parse(`${datePart} ${timePart}`, "yyyy-MM-dd h:mm a", referenceDate)]
      : [
          parse(`${datePart} ${timePart}`, "yyyy-MM-dd HH:mm:ss", referenceDate),
          parse(`${datePart} ${timePart}`, "yyyy-MM-dd HH:mm", referenceDate),
        ]
  return candidates.find((candidate) => isValid(candidate)) ?? null
}

function getPatientName(appointment: AppointmentRecord, mother?: MaternalRecord) {
  const fromAppointment = [appointment.user?.first_name, appointment.user?.middle_name, appointment.user?.last_name].filter(Boolean).join(" ")
  const fromMother = [mother?.user?.first_name, mother?.user?.middle_name, mother?.user?.last_name].filter(Boolean).join(" ")
  return fromAppointment || fromMother || "Unnamed mother"
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const [appointmentView, setAppointmentView] = useState<AppointmentView>("today")
  const [search, setSearch] = useState("")
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [mothers, setMothers] = useState<MaternalRecord[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(session?.token))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadDashboardData = useCallback(async (refresh = false) => {
    if (!session?.token) {
      setAppointments([])
      setMothers([])
      setIsLoading(false)
      return
    }
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const [appointmentResponse, motherResponse] = await Promise.all([
        getAppointments(session.token),
        getMaternalRecords(session.token),
      ])
      setAppointments(Array.isArray(appointmentResponse.data) ? appointmentResponse.data : [])
      setMothers(Array.isArray(motherResponse.result) ? motherResponse.result : [])
      if (refresh) toast.success("Dashboard refreshed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load dashboard data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [session?.token])

  useEffect(() => { void loadDashboardData() }, [loadDashboardData])

  const motherByUserId = useMemo(() => {
    const records = new Map<string, MaternalRecord>()
    mothers.forEach((mother) => {
      const userId = mother.user?.user_id
      if (userId) records.set(userId, mother)
    })
    return records
  }, [mothers])
  const appointmentRows = useMemo<AppointmentRow[]>(() => appointments.map((appointment) => {
    const mother = appointment.user_id ? motherByUserId.get(appointment.user_id) : undefined
    const name = getPatientName(appointment, mother)
    const start = getAppointmentDate(appointment)
    const status = appointment.status || "Scheduled"
    const serial = mother?.family_serial_no || ""
    const searchText = [name, serial, appointment.appointment_type, appointment.reason, status, appointment.facility?.facility_name].join(" ").toLowerCase()
    return { appointment, mother, name, serial, start, status, searchText }
  }), [appointments, motherByUserId])

  const today = startOfDay(new Date())
  const counts = useMemo(() => ({
    today: appointmentRows.filter((row) => row.start && isSameDay(row.start, today) && !isCancelled(row.status)).length,
    upcoming: appointmentRows.filter((row) => row.start && row.start >= today && !isCancelled(row.status) && !isCompleted(row.status)).length,
    completed: appointmentRows.filter((row) => isCompleted(row.status)).length,
    cancelled: appointmentRows.filter((row) => isCancelled(row.status)).length,
  }), [appointmentRows, today])

  const activePrenatalCount = mothers.filter((mother) => {
    const status = getLatestMaternalPregnancy(mother.pregnancies)?.pregnancy_status?.toLowerCase() ?? ""
    return status === "active" || status === "ongoing"
  }).length
  const highRiskCount = mothers.filter((mother) => {
    const latestPregnancy = getLatestMaternalPregnancy(mother.pregnancies)
    return normalizeMaternalRisk(getLatestPrenatalVisit(latestPregnancy)?.risk_level_assessed) === "High Risk"
  }).length
  const pendingTriageCount = mothers.filter((mother) => {
    const latestPregnancy = getLatestMaternalPregnancy(mother.pregnancies)
    const hasVisit = Boolean(getLatestPrenatalVisit(latestPregnancy))
    return hasVisit && normalizeMaternalRisk(getLatestPrenatalVisit(latestPregnancy)?.risk_level_assessed) === "Not assessed"
  }).length

  const metrics = [
    { title: "Active Prenatal", value: activePrenatalCount, status: "Active", statusLabel: "Live", valueClassName: "text-[#15803d] dark:text-[#4ade80]", detail: "Facility registry", description: "Mothers with an active pregnancy", icon: UsersRound },
    { title: "Appointments", value: counts.today, status: "Ongoing", statusLabel: "Today", valueClassName: "text-[#b45309] dark:text-[#fbbf24]", detail: "Scheduled for today", description: "Appointments in today’s queue", icon: CalendarClock },
    { title: "High-Risk Profiles", value: highRiskCount, status: "High Risk", statusLabel: "Review", valueClassName: "text-[#be123c] dark:text-[#fb7185]", detail: "Latest assessed risk", description: "Mothers with a high-risk assessment", icon: TriangleAlert },
    { title: "Pending Triage", value: pendingTriageCount, status: "Pending", statusLabel: "Queued", valueClassName: "text-[#b45309] dark:text-[#fbbf24]", detail: "Clinical review", description: "Recorded visits awaiting risk assessment", icon: RefreshCw },
  ]

  const appointmentTypes = useMemo(() => [...new Set(appointments.map((appointment) => appointment.appointment_type).filter((value): value is string => Boolean(value)))].sort(), [appointments])
  const statuses = useMemo(() => [...new Set(appointments.map((appointment) => appointment.status || "Scheduled"))].sort(), [appointments])
  const hasActiveFilters = search.trim().length > 0 || Object.values(selectedFilters).some((values) => values.length > 0)

  const toggleFilter = (name: string, option: string, checked: boolean) => {
    setSelectedFilters((current) => {
      const values = current[name] ?? []
      const nextValues = checked ? [...values, option] : values.filter((value) => value !== option)
      const next = { ...current }
      if (nextValues.length) next[name] = nextValues
      else delete next[name]
      return next
    })
    setPage(1)
  }

  const filteredRows = useMemo(() => appointmentRows.filter((row) => {
    const isInView = appointmentView === "today"
      ? Boolean(row.start && isSameDay(row.start, today) && !isCancelled(row.status))
      : appointmentView === "upcoming"
        ? Boolean(row.start && row.start >= today && !isCancelled(row.status) && !isCompleted(row.status))
        : appointmentView === "completed"
          ? isCompleted(row.status)
          : isCancelled(row.status)
    const matchesSearch = !search.trim() || row.searchText.includes(search.trim().toLowerCase())
    const matchesType = !selectedFilters["Appointment Type"]?.length || selectedFilters["Appointment Type"].includes(row.appointment.appointment_type ?? "")
    const matchesStatus = !selectedFilters.Status?.length || selectedFilters.Status.includes(row.status)
    return isInView && matchesSearch && matchesType && matchesStatus
  }), [appointmentRows, appointmentView, search, selectedFilters, today])

  useEffect(() => { setPage(1) }, [appointmentView, search, selectedFilters])
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
  const exportEvents = appointmentRows.filter((row) => row.start).map((row) => ({ ...appointmentToEvent(row.appointment), patient: row.name, title: row.name, start: row.start! }))

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-12 px-8 pb-8 pt-8 text-foreground">
      <section aria-label="Maternal care overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title} className="border-sidebar-border bg-card text-foreground shadow-none dark:bg-[#111]">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="min-w-0 truncate text-xs font-normal text-muted-foreground">{metric.title}</CardTitle>
                <StatusBadge status={metric.status} label={metric.statusLabel} className="px-1.5" />
              </CardHeader>
              <CardContent>
                <div className={`mb-4 flex h-8 items-center text-2xl font-semibold ${metric.valueClassName}`}>{isLoading ? <Skeleton className="h-7 w-12" /> : metric.value}</div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
                    <span className="truncate">{metric.detail}</span>
                    <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground" title={metric.description}>{metric.description}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="space-y-3" aria-labelledby="upcoming-appointments-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="upcoming-appointments-heading" className="text-sm font-semibold text-foreground">Upcoming Appointments</h2>
            <p className="mt-1 text-xs text-muted-foreground">Review today&apos;s queue and manage upcoming maternal care visits.</p>
          </div>
          <Link to="/dashboard/calendar" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground">
            View Calendar <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <Tabs value={appointmentView} onValueChange={(value) => setAppointmentView(value as AppointmentView)} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-9 w-full justify-start gap-1 overflow-x-auto sm:w-max">
              {appointmentViews.map((view) => (
                <TabsTrigger key={view.value} value={view.value} className="h-full flex-initial gap-1.5 px-2 text-xs font-medium">
                  {view.label} ({counts[view.value]})
                </TabsTrigger>
              ))}
            </TabsList>
            <TooltipProvider delayDuration={0}>
              <div className="flex shrink-0 items-center gap-2">
                <ExportCalendarModal events={exportEvents}>
                  <div className="contents">
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Export appointments" className="size-8 border-sidebar-border"><Download className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Export</TooltipContent></Tooltip>
                  </div>
                </ExportCalendarModal>
                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Refresh appointments" disabled={isRefreshing || isLoading} onClick={() => void loadDashboardData(true)} className="size-8 border-sidebar-border"><RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} /></Button></TooltipTrigger><TooltipContent>Refresh</TooltipContent></Tooltip>
                <Button onClick={() => navigate("/dashboard/calendar")} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs font-medium"><CalendarPlus className="size-3.5" />Schedule Appointment</Button>
              </div>
            </TooltipProvider>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full shrink-0 sm:w-[300px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search appointments" placeholder="Search appointments..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 w-full pl-8 text-xs" />
            </div>
            {([ ["Appointment Type", appointmentTypes], ["Status", statuses] ] as const).map(([filterName, options]) => (
              <Popover key={filterName}>
                <PopoverTrigger asChild><Button variant="filter" size="filter" className="shrink-0"><PlusCircle className="size-3.5" />{filterName}</Button></PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="flex flex-col gap-3">
                    {options.length ? options.map((option) => {
                      const id = `dashboard-filter-${filterName}-${option}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                      return <label key={option} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox id={id} checked={(selectedFilters[filterName] ?? []).includes(option)} onCheckedChange={(checked) => toggleFilter(filterName, option, checked === true)} className="size-3.5 rounded-[4px] border-sidebar-border" /><span>{option}</span></label>
                    }) : <p className="text-xs text-muted-foreground">No {filterName.toLowerCase()} values available.</p>}
                  </div>
                </PopoverContent>
              </Popover>
            ))}
            {hasActiveFilters && <Button variant="ghost" onClick={() => { setSearch(""); setSelectedFilters({}) }} className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"><RotateCcw className="size-3.5" />Reset Filter</Button>}
          </div>

          {appointmentViews.map((view) => (
            <TabsContent key={view.value} value={view.value} className="mt-3 flex flex-col gap-2">
              <div className="overflow-x-auto rounded-md border border-sidebar-border bg-background dark:bg-black">
                <Table>
                  <TableHeader className="bg-card dark:bg-[#111]">
                    <TableRow className="border-sidebar-border hover:bg-transparent">
                      <TableHead className="w-12 pl-4 text-center"><Checkbox aria-label="Select all appointments" className="border-sidebar-border" /></TableHead>
                      <TableHead className="text-xs font-medium text-foreground">Date &amp; Time</TableHead>
                      <TableHead className="text-xs font-medium text-foreground">Mother</TableHead>
                      <TableHead className="text-xs font-medium text-foreground">Appointment Type</TableHead>
                      <TableHead className="text-xs font-medium text-foreground">Purpose / Visit</TableHead>
                      <TableHead className="text-xs font-medium text-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? <TableSkeletonRows columns={6} rows={5} />
                      : pageRows.length ? pageRows.map((row) => (
                        <TableRow key={row.appointment.appointment_id} className="border-sidebar-border">
                          <TableCell className="w-12 pl-4 text-center"><Checkbox aria-label={`Select appointment for ${row.name}`} className="border-sidebar-border" /></TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{row.start ? format(row.start, "MMM d, yyyy · h:mm a") : "Date not set"}</TableCell>
                          <TableCell><div className="text-xs font-medium">{row.name}</div>{row.serial && <div className="text-xs text-muted-foreground">{row.serial}</div>}</TableCell>
                          <TableCell className="text-xs">{row.appointment.appointment_type || "Appointment"}</TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs" title={row.appointment.reason || "—"}>{row.appointment.reason || "—"}</TableCell>
                          <TableCell><StatusBadge status={row.status} label={formatStatusLabel(row.status)} /></TableCell>
                        </TableRow>
                      ))
                      : <TableEmptyState colSpan={6} icon={CalendarDays} title={hasActiveFilters ? "No appointments match your filters" : "No appointments in this view"} description={hasActiveFilters ? "Adjust or reset the search and filters to see appointments." : view.value === "today" ? "There are no appointments scheduled for today." : `Appointments in the ${view.label.toLowerCase()} view will appear here.`} action={!hasActiveFilters ? <Button onClick={() => navigate("/dashboard/calendar")} className="h-8 gap-1.5 px-2.5 text-xs"><CalendarPlus className="size-3.5" />Schedule Appointment</Button> : undefined} />}
                  </TableBody>
                </Table>
              </div>
              <TablePaginationFooter rowCount={filteredRows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  )
}
