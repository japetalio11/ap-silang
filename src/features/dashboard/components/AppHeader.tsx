import { useCallback, useEffect, useMemo, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, PlusCircle, Moon, Sun, UserPlus, Check, CalendarPlus, Stethoscope, Send, ShieldPlus, LoaderCircle } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { useLocation, useNavigate } from "react-router-dom"
import { OfflineSyncDrawer } from "./OfflineSyncDrawer"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuthSession } from "@/features/auth/auth-session"
import {
  getMaternalProfile,
  getMaternalRecords,
  registerMaternalRecord,
  registerPregnancy,
  uploadMaternalAvatar,
  type MaternalRecord,
} from "@/features/maternal-records/api"
import { MaternalRegistrationModal, type RegistrationValues } from "@/features/maternal-records/components/MaternalRegistrationModal"
import { CreateAppointmentModal, type AppointmentFormValues, type AppointmentMotherOption } from "@/features/calendar/components/CreateAppointmentModal"
import { createAppointment, maternalRecordToAppointmentOption } from "@/features/calendar/api"
import type { AppEvent } from "@/features/calendar/components/types"
import { CreateReferralModal } from "@/features/referrals/components/CreateReferralModal"
import { createReferral, getReferralFacilities, type CreateReferralInput, type ReferralFacility } from "@/features/referrals/api"
import { InviteTeamMemberModal } from "@/features/team/components/InviteTeamMemberModal"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"
import { getUserNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRecord } from "@/features/dashboard/api/notifications"
import { toast } from "sonner"

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const sessionToken = session?.token
  const sessionUserId = session?.user.user_id

  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationFilter, setNotificationFilter] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [notificationActionId, setNotificationActionId] = useState<string | null>(null)

  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine)
  const [syncState, setSyncState] = useState<{ isOnline: boolean; isSyncing: boolean; pendingCount: number; conflictCount: number }>({
    isOnline: typeof navigator === "undefined" || navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    conflictCount: 0,
  })

  const [isRegisterMotherOpen, setIsRegisterMotherOpen] = useState(false)
  const [isCreateAppointmentOpen, setIsCreateAppointmentOpen] = useState(false)
  const [isCreateReferralOpen, setIsCreateReferralOpen] = useState(false)
  const [isInviteStaffOpen, setIsInviteStaffOpen] = useState(false)
  const [isSelectConsultationMotherOpen, setIsSelectConsultationMotherOpen] = useState(false)

  const [rawMothers, setRawMothers] = useState<MaternalRecord[]>([])
  const [appointmentMothers, setAppointmentMothers] = useState<AppointmentMotherOption[]>([])
  const [loadingMothers, setLoadingMothers] = useState(false)
  const [referralFacilities, setReferralFacilities] = useState<ReferralFacility[]>([])
  const [isSavingReferral, setIsSavingReferral] = useState(false)

  const [profileBreadcrumbResult, setProfileBreadcrumbResult] = useState<{ motherId: string; name: string } | null>(null)
  const isMaternalArea = location.pathname.startsWith("/dashboard/maternal-records")
  const isMaternalProfile = location.pathname.startsWith("/dashboard/maternal-records/")
  const profileMotherId = isMaternalProfile ? decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) ?? "") : ""
  const profileBreadcrumb = profileBreadcrumbResult?.motherId === profileMotherId ? profileBreadcrumbResult.name : "Maternal Profile"
  const pageTitle = location.pathname.startsWith("/dashboard/calendar") ? "Appointments"
    : location.pathname.startsWith("/dashboard/referrals") ? "Inter-Clinic Referrals"
    : location.pathname.startsWith("/dashboard/team") ? "Staff Management"
    : location.pathname.startsWith("/dashboard/messages") ? "Messages"
    : location.pathname.startsWith("/dashboard/settings") ? "Settings"
    : location.pathname.startsWith("/dashboard/user-guide") ? "User Guide"
    : "Dashboard"

  const loadNotifications = useCallback(async (quiet = false) => {
    if (!sessionToken || !sessionUserId) return
    setNotificationsLoading(true)
    try {
      setNotifications(await getUserNotifications(sessionToken, sessionUserId))
    } catch (error) {
      if (!quiet) toast.error("Couldn't load notifications", { description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setNotificationsLoading(false)
    }
  }, [sessionToken, sessionUserId])

  useEffect(() => {
    if (!sessionToken || !sessionUserId) return
    let active = true
    void getUserNotifications(sessionToken, sessionUserId)
      .then((items) => { if (active) setNotifications(items) })
      .catch(() => undefined)
    return () => { active = false }
  }, [sessionToken, sessionUserId])

  const meaningfulNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const msg = (item.notification_message || "").trim()
      return msg.length > 0 && msg.toLowerCase() !== "alert"
    })
  }, [notifications])

  const unreadCount = meaningfulNotifications.filter((item) => !item.is_read).length
  const visibleNotifications = useMemo(() => {
    const query = notificationFilter.trim().toLocaleLowerCase()
    return meaningfulNotifications.filter((item) => {
      if (unreadOnly && item.is_read) return false
      return !query || `${item.sender ?? ""} ${item.notification_type ?? ""} ${item.notification_message}`.toLocaleLowerCase().includes(query)
    })
  }, [meaningfulNotifications, notificationFilter, unreadOnly])

  const handleMarkAllNotificationsRead = async () => {
    if (!sessionToken || !sessionUserId || unreadCount === 0) return
    try {
      await markAllNotificationsRead(sessionToken, sessionUserId)
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
      toast.success("All notifications marked as read")
    } catch (error) {
      toast.error("Couldn't update notifications", { description: error instanceof Error ? error.message : "Please try again." })
    }
  }

  const handleNotificationClick = async (item: NotificationRecord) => {
    if (!sessionToken || !sessionUserId) return
    if (!item.is_read) {
      setNotificationActionId(item.notification_id)
      try {
        await markNotificationRead(sessionToken, sessionUserId, item.notification_id)
        setNotifications((current) => current.map((notification) => notification.notification_id === item.notification_id ? { ...notification, is_read: true } : notification))
      } catch (error) {
        toast.error("Couldn't mark notification as read", { description: error instanceof Error ? error.message : "Please try again." })
        setNotificationActionId(null)
        return
      }
      setNotificationActionId(null)
    }
    const category = (item.category || item.notification_type || "").toLowerCase()
    let route = item.link || ""
    if (route.startsWith("/dashboard/mothers")) {
      route = "/dashboard/maternal-records"
    } else if (route.startsWith("/dashboard/appointments")) {
      route = "/dashboard/calendar"
    } else if (!route) {
      route = category.includes("referral") ? "/dashboard/referrals"
        : category.includes("appointment") ? "/dashboard/calendar"
        : (category.includes("vital") || category.includes("clinical") || category.includes("patient_assignment") || category.includes("maternal")) ? "/dashboard/maternal-records"
        : ""
    }
    if (route) navigate(route)
  }

  const loadMothersData = useCallback(async () => {
    if (!sessionToken || rawMothers.length > 0) return
    setLoadingMothers(true)
    try {
      const response = await getMaternalRecords(sessionToken)
      const list = response.result ?? []
      setRawMothers(list)
      setAppointmentMothers(list.map(maternalRecordToAppointmentOption))
    } catch {
    } finally {
      setLoadingMothers(false)
    }
  }, [sessionToken, rawMothers.length])

  const loadFacilitiesData = useCallback(async () => {
    if (referralFacilities.length > 0) return
    try {
      const response = await getReferralFacilities()
      setReferralFacilities(Array.isArray(response.result) ? response.result : [])
    } catch {
    }
  }, [referralFacilities.length])

  const handleOpenAppointmentModal = () => {
    void loadMothersData()
    setIsCreateAppointmentOpen(true)
  }

  const handleOpenReferralModal = () => {
    void loadMothersData()
    void loadFacilitiesData()
    setIsCreateReferralOpen(true)
  }

  const handleOpenConsultation = () => {
    if (isMaternalProfile) {
      window.dispatchEvent(new CustomEvent("silang:open-log-consultation"))
    } else {
      void loadMothersData()
      setIsSelectConsultationMotherOpen(true)
    }
  }

  const handleRegisterMother = async (values: RegistrationValues) => {
    if (!sessionToken) throw new Error("Your session has expired. Sign in and try again.")
    const response = await registerMaternalRecord(sessionToken, {
      first_name: values.firstName.trim(),
      middle_name: values.middleName.trim() || undefined,
      last_name: values.lastName.trim(),
      address: values.address.trim(),
      phone_number: values.contactNumber.trim(),
      email: values.email.trim() || undefined,
      facility_id: session?.user.facility_id ?? undefined,
      assigned_worker_id: values.healthWorker || undefined,
      family_serial_no: values.familySerialNo.trim() || undefined,
      birth_date: values.dateOfBirth,
      civil_status: values.civilStatus,
      blood_type: values.bloodType,
    })
    const mother = response.result?.mother ?? response.mother
    const motherId = mother?.mother_id
    if (!motherId) throw new Error("The mother profile was saved, but the server did not return its record ID.")

    if (values.photoFile) {
      try {
        await uploadMaternalAvatar(sessionToken, motherId, values.photoFile)
      } catch {
      }
    }

    if (values.lastMenstrualPeriod) {
      const chronic = [...values.chronicConditions, values.otherComorbidities.trim()].filter(Boolean).join(", ")
      try {
        await registerPregnancy(sessionToken, {
          motherId,
          lmp_date: values.lastMenstrualPeriod,
          edd_date: values.estimatedDueDate || undefined,
          gravida: Number(values.gravida),
          parity: Number(values.parity),
          age_group: values.ageGroup,
          pregnancy_status: values.pregnancyStatus,
          height_cm: values.heightCm ? Number(values.heightCm) : undefined,
          bmi_1st_trimester: values.firstTrimesterBmi ? Number(values.firstTrimesterBmi) : undefined,
          bmi_category: values.bmiCategory || undefined,
          completed_8anc: values.completedEightAncVisits,
          prev_caesarean: values.previousCesarean,
          consecutive_miscarriages: values.recurrentMiscarriages,
          stillbirth_history: values.stillbirth,
          pph_history: values.postpartumHemorrhage,
          has_heart_disease: values.chronicConditions.includes("Heart Disease"),
          has_diabetes: values.chronicConditions.includes("Diabetes"),
          has_tb: values.chronicConditions.includes("Tuberculosis"),
          has_asthma: values.chronicConditions.includes("Asthma"),
          has_goiter: values.chronicConditions.includes("Goiter"),
          co_morbidities: chronic || undefined,
          previous_delivery_history: values.deliveryHistoryNotes.trim() || undefined,
        })
      } catch (error) {
        throw new Error(`The maternal profile was created, but its pregnancy details could not be saved: ${error instanceof Error ? error.message : "Please try again."}`, { cause: error })
      }
    }
    toast.success(response.already_exists ? "Mother added to this facility" : response.offline ? "Maternal record saved offline" : "Maternal record created")
    window.dispatchEvent(new Event("silang:maternal-records-updated"))
    setRawMothers([])
    setIsRegisterMotherOpen(false)
  }

  const handleCreateAppointment = async (event: AppEvent, values: AppointmentFormValues) => {
    if (!sessionToken) throw new Error("Your session has expired. Sign in again to schedule an appointment.")
    await createAppointment(sessionToken, {
      mother_id: values.motherId,
      appointment_date: values.date,
      appointment_time: values.time,
      appointment_type: values.appointmentType,
    })
    toast.success("Appointment scheduled successfully")
    window.dispatchEvent(new Event("silang:appointments-updated"))
    setIsCreateAppointmentOpen(false)
    return {
      ...event,
      motherId: values.motherId,
      title: `${values.appointmentType} - Scheduled`,
    }
  }

  const handleCreateReferral = async (input: CreateReferralInput) => {
    if (!sessionToken) throw new Error("Session expired")
    setIsSavingReferral(true)
    try {
      await createReferral(sessionToken, input)
      toast.success("Referral created successfully")
      window.dispatchEvent(new Event("silang:referrals-updated"))
      setIsCreateReferralOpen(false)
    } finally {
      setIsSavingReferral(false)
    }
  }

  useEffect(() => {
    return silangSyncEngine.subscribe((status) => {
      setSyncState({
        isOnline: status.isOnline,
        isSyncing: status.isSyncing,
        pendingCount: status.pendingCount,
        conflictCount: status.conflictCount,
      })
      setIsOnline(status.isOnline)
    })
  }, [])

  useEffect(() => {
    if (!isMaternalProfile || !session?.token || !profileMotherId) return
    let active = true
    getMaternalProfile(session.token, profileMotherId)
      .then(({ result }) => {
        if (!active) return
        const name = [result.user?.first_name, result.user?.middle_name, result.user?.last_name].filter(Boolean).join(" ")
        if (name) setProfileBreadcrumbResult({ motherId: profileMotherId, name })
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [isMaternalProfile, profileMotherId, session?.token])

  const quickCreateMenuContent = (
    <DropdownMenuContent align="end" className="w-56 rounded-xl border-border shadow-md">
      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Quick Create</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => setIsRegisterMotherOpen(true)} className="gap-2 cursor-pointer rounded-md">
        <UserPlus className="h-4 w-4" />
        <span>Create Maternal Record</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={handleOpenAppointmentModal} className="gap-2 cursor-pointer rounded-md">
        <CalendarPlus className="h-4 w-4" />
        <span>Create Appointment</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={handleOpenConsultation} className="gap-2 cursor-pointer rounded-md">
        <Stethoscope className="h-4 w-4" />
        <span>Log Consultation</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={handleOpenReferralModal} className="gap-2 cursor-pointer rounded-md">
        <Send className="h-4 w-4" />
        <span>Create Referral</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setIsInviteStaffOpen(true)} className="gap-2 cursor-pointer rounded-md">
        <ShieldPlus className="h-4 w-4" />
        <span>Invite Team Member</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  return (
    <TooltipProvider delayDuration={500}>
      <header className="bg-white dark:bg-black flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <div className="hidden md:flex flex-1 items-center gap-2">
          <Tooltip><TooltipTrigger asChild><SidebarTrigger aria-label="Toggle sidebar" className="-ml-1" /></TooltipTrigger><TooltipContent>Toggle sidebar</TooltipContent></Tooltip>
          <div className="h-4 w-px bg-border" />
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                {isMaternalArea ? (
                  <span>Clinical Care</span>
                ) : (
                  <BreadcrumbLink href="/dashboard">Core Operations</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {isMaternalProfile ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard/maternal-records">Maternal Records</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage className="text-xs">{profileBreadcrumb}</BreadcrumbPage></BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs">{isMaternalArea ? "Maternal Records" : pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setIsSyncDrawerOpen(true)} className="h-8 px-2.5 text-xs font-medium gap-2 border-sidebar-border bg-background dark:bg-black">
            <span className="relative flex size-2" aria-hidden="true">
              {isOnline && <span className={`absolute inline-flex size-full motion-safe:animate-ping rounded-full ${syncState.isSyncing ? "bg-amber-400 opacity-90" : "bg-green-600 opacity-90"}`} />}
              <span className={`relative inline-flex size-2 rounded-full ${!isOnline ? "bg-amber-500" : syncState.isSyncing ? "bg-amber-400 animate-spin" : "bg-green-400"}`} />
            </span>
            {syncState.isSyncing
              ? "Syncing…"
              : !isOnline
              ? (syncState.pendingCount > 0 ? `Offline (${syncState.pendingCount} queued)` : "You're Offline")
              : (syncState.pendingCount > 0 ? `Online (${syncState.pendingCount} pending)` : "You're Online")}
          </Button>
          <NotificationPopover
            notifications={meaningfulNotifications}
            visibleNotifications={visibleNotifications}
            unreadCount={unreadCount}
            loading={notificationsLoading}
            unreadOnly={unreadOnly}
            filter={notificationFilter}
            actionId={notificationActionId}
            onFilterChange={setNotificationFilter}
            onUnreadOnlyChange={setUnreadOnly}
            onOpen={() => void loadNotifications()}
            onMarkAllRead={() => void handleMarkAllNotificationsRead()}
            onNotificationClick={(item) => void handleNotificationClick(item)}
          />
          <Tooltip><TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground h-8 w-8 relative"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </TooltipTrigger><TooltipContent>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent></Tooltip>

          <div className="h-4 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 gap-2 px-2 text-xs font-medium">
                <PlusCircle className="size-3.5" />
                <span>Quick Create</span>
              </Button>
            </DropdownMenuTrigger>
            {quickCreateMenuContent}
          </DropdownMenu>
        </div>

        <div className="flex md:hidden w-full items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs font-normal">
                  {isMaternalProfile ? profileBreadcrumb : isMaternalArea ? "Maternal Records" : pageTitle}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" onClick={() => setIsSyncDrawerOpen(true)} className="h-8 px-2 text-xs font-medium gap-1.5 border-sidebar-border bg-background dark:bg-black">
              <span className="relative flex size-2" aria-hidden="true">
                {isOnline && <span className={`absolute inline-flex size-full motion-safe:animate-ping rounded-full ${syncState.isSyncing ? "bg-amber-400 opacity-90" : "bg-green-600 opacity-90"}`} />}
                <span className={`relative inline-flex size-2 rounded-full ${!isOnline ? "bg-amber-500" : syncState.isSyncing ? "bg-amber-400 animate-spin" : "bg-green-400"}`} />
              </span>
              {syncState.isSyncing
                ? "Syncing…"
                : !isOnline
                ? (syncState.pendingCount > 0 ? `Offline (${syncState.pendingCount})` : "Offline")
                : (syncState.pendingCount > 0 ? `Online (${syncState.pendingCount})` : "Online")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Quick Create" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <PlusCircle className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              {quickCreateMenuContent}
            </DropdownMenu>
            <NotificationPopover
              notifications={meaningfulNotifications}
              visibleNotifications={visibleNotifications}
              unreadCount={unreadCount}
              loading={notificationsLoading}
              unreadOnly={unreadOnly}
              filter={notificationFilter}
              actionId={notificationActionId}
              mobile
              onFilterChange={setNotificationFilter}
              onUnreadOnlyChange={setUnreadOnly}
              onOpen={() => void loadNotifications()}
              onMarkAllRead={() => void handleMarkAllNotificationsRead()}
              onNotificationClick={(item) => void handleNotificationClick(item)}
            />
            <Tooltip><TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-muted-foreground hover:text-foreground h-8 w-8 relative"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </TooltipTrigger><TooltipContent>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><SidebarTrigger aria-label="Toggle sidebar" className="-mr-1" /></TooltipTrigger><TooltipContent>Toggle sidebar</TooltipContent></Tooltip>
          </div>
        </div>
      </header>
      <OfflineSyncDrawer open={isSyncDrawerOpen} onOpenChange={setIsSyncDrawerOpen} />

      <MaternalRegistrationModal
        open={isRegisterMotherOpen}
        onOpenChange={setIsRegisterMotherOpen}
        onSubmit={handleRegisterMother}
        currentStaffId={sessionUserId}
        currentStaffLabel={`${session?.user.first_name ?? "Current"} ${session?.user.last_name ?? "staff"} (You - Default)`}
      />

      <CreateAppointmentModal
        open={isCreateAppointmentOpen}
        onOpenChange={setIsCreateAppointmentOpen}
        mothers={appointmentMothers}
        loadingMothers={loadingMothers}
        facilityId={session?.user.facility_id}
        onCreate={handleCreateAppointment}
      />

      <CreateReferralModal
        open={isCreateReferralOpen}
        onOpenChange={setIsCreateReferralOpen}
        mothers={rawMothers}
        facilities={referralFacilities}
        originFacilityId={session?.user.facility_id}
        isSaving={isSavingReferral}
        onSubmit={handleCreateReferral}
      />

      <InviteTeamMemberModal
        open={isInviteStaffOpen}
        onOpenChange={setIsInviteStaffOpen}
      />

      <SelectMotherForConsultationDialog
        open={isSelectConsultationMotherOpen}
        onOpenChange={setIsSelectConsultationMotherOpen}
        mothers={rawMothers}
        loading={loadingMothers}
        onSelectMother={(mother) => {
          setIsSelectConsultationMotherOpen(false)
          navigate(`/dashboard/maternal-records/${mother.mother_id}?openConsultation=true`)
        }}
      />
    </TooltipProvider>
  )
}

function notificationTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function NotificationPopover({
  notifications,
  visibleNotifications,
  unreadCount,
  loading,
  unreadOnly,
  filter,
  actionId,
  mobile = false,
  onFilterChange,
  onUnreadOnlyChange,
  onOpen,
  onMarkAllRead,
  onNotificationClick,
}: {
  notifications: NotificationRecord[]
  visibleNotifications: NotificationRecord[]
  unreadCount: number
  loading: boolean
  unreadOnly: boolean
  filter: string
  actionId: string | null
  mobile?: boolean
  onFilterChange: (value: string) => void
  onUnreadOnlyChange: (value: boolean) => void
  onOpen: () => void
  onMarkAllRead: () => void
  onNotificationClick: (item: NotificationRecord) => void
}) {
  const totalCount = notifications.length
  return (
    <Popover onOpenChange={(open) => open && onOpen()}>
      <Tooltip><TooltipTrigger asChild>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
            <Bell className="size-4" />
            {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" aria-hidden="true" />}
          </Button>
        </PopoverTrigger>
      </TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip>
      <PopoverContent align={mobile ? "center" : "end"} collisionPadding={mobile ? 0 : 8} className={`flex max-h-[min(78dvh,560px)] flex-col gap-3 overflow-hidden rounded-xl border-border p-4 shadow-lg ${mobile ? "w-screen" : "w-[calc(100vw-2rem)] sm:w-[380px]"}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-foreground">Notifications ({totalCount})</span>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <label htmlFor={mobile ? "notifications-unread-mobile" : "notifications-unread-desktop"} className="cursor-pointer">Unreads ({unreadCount})</label>
            <Switch id={mobile ? "notifications-unread-mobile" : "notifications-unread-desktop"} checked={unreadOnly} onCheckedChange={onUnreadOnlyChange} className="scale-75 origin-right" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input value={filter} onChange={(event) => onFilterChange(event.target.value)} placeholder="Filter Notifications" aria-label="Filter notifications" className="h-8 min-w-0 flex-1 text-xs" />
          <Button type="button" variant="outline" disabled={unreadCount === 0 || loading} onClick={onMarkAllRead} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs">
            <Check className="size-3.5" />Mark all as read
          </Button>
        </div>
        <div className="-mx-4 min-h-0 flex-1 overflow-y-auto border-t border-border px-4 pt-2">
          {loading && notifications.length === 0 ? (
            <div className="space-y-4 py-2" aria-label="Loading notifications">
              {[0, 1, 2].map((item) => <div key={item} className="space-y-2"><div className="flex items-center justify-between"><Skeleton className="h-6 w-36" /><Skeleton className="h-3 w-14" /></div><Skeleton className="h-4 w-full" /></div>)}
            </div>
          ) : visibleNotifications.length ? (
            <div className="divide-y divide-border">
              {visibleNotifications.map((item) => {
                const sender = item.sender || `${(item.category || item.notification_type || "System").replace(/[-_]/g, " ")} Service`
                const initials = sender.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "N"
                return (
                  <button key={item.notification_id} type="button" disabled={actionId === item.notification_id} onClick={() => onNotificationClick(item)} className={`group flex w-full flex-col gap-2 py-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-60 ${!item.is_read ? "bg-muted/20" : ""}`}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar className="size-6 shrink-0"><AvatarFallback className="text-[10px]">{initials}</AvatarFallback></Avatar>
                        <span className="truncate text-xs font-medium text-foreground">{sender}</span>
                        {!item.is_read && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{actionId === item.notification_id ? <LoaderCircle className="size-3 animate-spin" /> : notificationTime(item.notification_date)}</span>
                    </span>
                    <span className={`pl-8 text-xs leading-relaxed ${item.is_read ? "text-muted-foreground" : "text-foreground"}`}>{item.notification_message}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex min-h-32 flex-col items-center justify-center gap-1.5 py-6 text-center">
              <Bell className="mb-1 size-5 text-muted-foreground/70" />
              <p className="text-xs font-medium text-foreground">{filter || unreadOnly ? "No matching notifications" : "You're all caught up"}</p>
              <p className="text-xs text-muted-foreground">{filter || unreadOnly ? "Try changing your filter." : "New updates will appear here."}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SelectMotherForConsultationDialog({
  open,
  onOpenChange,
  mothers,
  loading,
  onSelectMother,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mothers: MaternalRecord[]
  loading: boolean
  onSelectMother: (mother: MaternalRecord) => void
}) {
  const [search, setSearch] = useState("")
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return mothers
    return mothers.filter((m) => {
      const name = `${m.user?.first_name ?? ""} ${m.user?.last_name ?? ""}`.toLowerCase()
      const serial = (m.family_serial_no ?? "").toLowerCase()
      return name.includes(q) || serial.includes(q)
    })
  }, [mothers, search])

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Select Patient for Consultation"
      description="Choose a patient to open their profile and log consultation vitals."
      className="sm:max-w-[480px]"
    >
      <div className="flex flex-col gap-3 py-2">
        <Input
          placeholder="Search by mother's name or family serial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-xs"
          autoFocus
        />
        <div className="max-h-[320px] overflow-y-auto divide-y divide-border rounded-md border border-border">
          {loading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered.length ? (
            filtered.map((mother) => {
              const name = `${mother.user?.first_name ?? ""} ${mother.user?.last_name ?? ""}`.trim() || "Unnamed Patient"
              const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "M"
              return (
                <button
                  key={mother.mother_id}
                  type="button"
                  onClick={() => onSelectMother(mother)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {mother.family_serial_no ? `Serial: ${mother.family_serial_no}` : mother.user?.phone_number || "No contact"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-primary font-medium shrink-0">Select &rarr;</span>
                </button>
              )
            })
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No matching maternal records found.
            </div>
          )}
        </div>
      </div>
    </ResponsiveModal>
  )
}
