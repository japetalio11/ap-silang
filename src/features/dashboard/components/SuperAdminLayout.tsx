import { useCallback, useEffect, useMemo, useState } from "react"
import { Outlet, useLocation, useNavigate, type NavigateOptions } from "react-router-dom"
import {
  Building2,
  FileText,
  Hospital,
  LayoutDashboard,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  ChevronsUpDown,
  Smartphone,
} from "lucide-react"
import {
  SidebarProvider,
  SidebarInset,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { PageGuide } from "@/components/ui/contextual-tour"
import { useTheme } from "@/components/theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OfflineSyncDrawer } from "./OfflineSyncDrawer"
import { toast } from "sonner"
import headerIcon from "@/assets/silang-sidebar.svg"
import { useAuthSession } from "@/features/auth/auth-session"
import { StaffAvatar } from "@/features/team/components/StaffAvatar"
import { db } from "@/lib/db/silangDatabase"
import { fetchFacilityHubDetails } from "../api/superadmin-api"
import { getUserNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRecord } from "../api/notifications"
import { NotificationPopover } from "./AppHeader"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"
import { InstallMobileAppDialog } from "./InstallMobileAppDialog"

const superAdminNavigation = [
  { section: "", items: [{ label: "Dashboard", path: "/superadmin/overview", icon: LayoutDashboard }] },
  { section: "Facility Network", items: [
    { label: "RHU Management", path: "/superadmin/rhu-management", icon: Hospital },
    { label: "BHS Management", path: "/superadmin/bhs-management", icon: Building2 },
  ] },
  { section: "Administration", items: [
    { label: "Staff Management", path: "/superadmin/users", icon: Users },
    { label: "Audit Trail", path: "/superadmin/audit-logs", icon: FileText },
  ] },
]
const settingsNavigationItem = { label: "Settings", path: "/superadmin/settings", icon: Settings2 }
const superAdminPages = [...superAdminNavigation.flatMap((section) => section.items), settingsNavigationItem]

export function SuperAdminLayout() {
  return (
    <SidebarProvider>
      <SuperAdminLayoutContent />
    </SidebarProvider>
  )
}

function SuperAdminLayoutContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobile, setOpenMobile } = useSidebar()
  const { session, logout } = useAuthSession()
  const { theme, setTheme } = useTheme()
  const [syncOpen, setSyncOpen] = useState(false)
  const [installAppOpen, setInstallAppOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine)
  const [syncState, setSyncState] = useState({
    isOnline: typeof navigator === "undefined" || navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
  })
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationFilter, setNotificationFilter] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [notificationActionId, setNotificationActionId] = useState<string | null>(null)
  const sessionToken = session?.token
  const sessionUserId = session?.user.user_id

  const isFacilityPage = location.pathname.startsWith("/superadmin/facility/")
  const isStaffProfilePage = /^\/superadmin\/users\/[^/]+$/.test(location.pathname)
  const isMotherPage = /^\/superadmin\/mother\/[^/]+$/.test(location.pathname)
  const locationState = location.state as { returnTo?: string; returnLabel?: string; facilityName?: string } | null
  const [facilityBreadcrumb, setFacilityBreadcrumb] = useState("")
  useEffect(() => {
    if (!isFacilityPage || !session?.token) return
    const facilityId = location.pathname.split("/").at(-1)
    if (!facilityId) return
    let active = true
    fetchFacilityHubDetails(session.token, facilityId).then((facility) => {
      if (active) setFacilityBreadcrumb(facility.facility_name)
    }).catch(() => {})
    return () => { active = false }
  }, [isFacilityPage, location.pathname, session?.token])
  const facilityParentPath = locationState?.returnTo?.includes("bhs-management") ? "/superadmin/bhs-management" : locationState?.returnTo?.includes("rhu-management") ? "/superadmin/rhu-management" : facilityBreadcrumb.toLowerCase().includes("bhs") || facilityBreadcrumb.toLowerCase().includes("barangay") ? "/superadmin/bhs-management" : "/superadmin/rhu-management"
  const facilityParentLabel = facilityParentPath.includes("bhs-management") ? "BHS Management" : "RHU Management"

  const activeSection =
    superAdminPages.find((item) => location.pathname === item.path) ??
    (isFacilityPage
      ? { label: facilityBreadcrumb || locationState?.facilityName || "Facility", path: location.pathname, icon: Hospital }
      : isStaffProfilePage
        ? { label: "Staff Profile", path: location.pathname, icon: Users }
        : isMotherPage
          ? { label: "Mother Profile", path: location.pathname, icon: Users }
          : superAdminPages[0])

  const userFullName = session?.user
    ? `${session.user.first_name} ${session.user.last_name}`.trim()
    : "Super Administrator"

  const [userProfileUrl, setUserProfileUrl] = useState<string | null>(session?.user.profile_url || null)

  useEffect(() => {
    if (session?.user.profile_url) {
      setUserProfileUrl(session.user.profile_url)
      return
    }
    if (!session?.user.user_id) return
    let active = true
    db.staff.where("user_id").equals(session.user.user_id).first().then((record) => {
      if (active && record?.profile_url) {
        setUserProfileUrl(record.profile_url)
      }
    }).catch(() => {})
    return () => { active = false }
  }, [session?.user.user_id, session?.user.profile_url])

  useEffect(() => {
    document.title = `${activeSection.label} - Silang Superadmin`
  }, [activeSection.label])

  useEffect(() => {
    return silangSyncEngine.subscribe((status) => {
      setSyncState({ isOnline: status.isOnline, isSyncing: status.isSyncing, pendingCount: status.pendingCount })
      setIsOnline(status.isOnline)
    })
  }, [])

  const loadNotifications = useCallback(async () => {
    if (!sessionToken || !sessionUserId) return
    setNotificationsLoading(true)
    try {
      setNotifications(await getUserNotifications(sessionToken, sessionUserId))
    } catch (error) {
      toast.error("Couldn't load notifications", { description: error instanceof Error ? error.message : "Please try again." })
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

  const meaningfulNotifications = useMemo(() => notifications.filter((item) => {
    const message = (item.notification_message || "").trim()
    return message.length > 0 && message.toLowerCase() !== "alert"
  }), [notifications])
  const unreadCount = meaningfulNotifications.filter((item) => !item.is_read).length
  const visibleNotifications = useMemo(() => {
    const query = notificationFilter.trim().toLowerCase()
    return meaningfulNotifications.filter((item) => {
      if (unreadOnly && item.is_read) return false
      return !query || `${item.sender ?? ""} ${item.notification_type ?? ""} ${item.notification_message}`.toLowerCase().includes(query)
    })
  }, [meaningfulNotifications, notificationFilter, unreadOnly])

  const handleMarkAllNotificationsRead = async () => {
    if (!sessionToken || !sessionUserId || unreadCount === 0) return
    try {
      await markAllNotificationsRead(sessionToken, sessionUserId)
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true })))
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
        setNotifications((items) => items.map((notification) => notification.notification_id === item.notification_id ? { ...notification, is_read: true } : notification))
      } catch (error) {
        toast.error("Couldn't mark notification as read", { description: error instanceof Error ? error.message : "Please try again." })
        setNotificationActionId(null)
        return
      }
      setNotificationActionId(null)
    }
    const category = (item.category || item.notification_type || "").toLowerCase()
    const route = item.link || (category.includes("referral") ? "/superadmin/rhu-management"
      : category.includes("appointment") ? "/superadmin/overview"
      : category.includes("staff") || category.includes("user") ? "/superadmin/users"
      : "")
    if (route.startsWith("/superadmin")) navigate(route)
  }

  const handleLogout = () => {
    setOpenMobile(false)
    logout()
    toast.success("Signed out of the superadmin workspace")
    navigate("/", { replace: true })
  }

  const handleSidebarNavigate = (path: string, options?: NavigateOptions) => {
    setOpenMobile(false)
    navigate(path, options)
  }

  const handleOpenInstallApp = () => {
    setOpenMobile(false)
    if (isMobile) window.setTimeout(() => setInstallAppOpen(true), 250)
    else setInstallAppOpen(true)
  }

  return (
      <TooltipProvider delayDuration={0}>
        <Sidebar collapsible="icon">
          <SidebarHeader className="flex flex-col p-0">
            <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0">
              <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                <img src={headerIcon} alt="Silang" className="size-full object-contain" />
              </div>
              <span
                className="translate-y-0.5 overflow-hidden whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-[#003f2c] transition-all dark:text-[#fffe8c] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0"
                style={{ fontFamily: "'Etna', sans-serif" }}
              >
                Silang
              </span>
            </div>
            <div className="px-4 pb-2 pt-2 group-data-[collapsible=icon]:px-0">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-border">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex min-w-0 flex-col overflow-hidden whitespace-nowrap group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                  <span className="text-xs font-medium">Municipal Health Office</span>
                  <span className="text-xs text-muted-foreground">Administration</span>
                </div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              {superAdminNavigation.map(({ section, items }) => <div key={section}>
                {section && <SidebarGroupLabel>{section}</SidebarGroupLabel>}
                <SidebarGroupContent>
                <SidebarMenu>
                  {items.map(({ label, path, icon: Icon }) => (
                    <SidebarMenuItem key={path}>
                      <SidebarMenuButton
                        isActive={location.pathname === path}
                        onClick={() => handleSidebarNavigate(path, path.endsWith("/settings") ? { state: { returnTo: location.pathname } } : undefined)}
                        tooltip={label}
                      >
                        <Icon className="mr-2" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
              </div>)}
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100 relative overflow-hidden">
                <span className="transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">Preferences</span>
                <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-sidebar-border opacity-0 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-100" />
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname === settingsNavigationItem.path}
                      onClick={() => handleSidebarNavigate(settingsNavigationItem.path, { state: { returnTo: location.pathname } })}
                      tooltip={settingsNavigationItem.label}
                    >
                      <Settings2 className="mr-2" />
                      <span>{settingsNavigationItem.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleOpenInstallApp} tooltip="Install Silang Mobile for Mothers">
                      <Smartphone className="mr-2" />
                      <span className="truncate">Install Silang Mobile for Mothers</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 ease-linear group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <StaffAvatar
                        src={userProfileUrl}
                        name={userFullName}
                        className="size-8 shrink-0 rounded-lg text-xs"
                      />
                      <span className="flex min-w-0 flex-1 flex-col overflow-hidden whitespace-nowrap text-left group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                        <span className="truncate text-xs font-medium">{userFullName}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {session?.user.email || "Administrator"}
                        </span>
                      </span>
                      <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-[--radix-dropdown-menu-trigger-width]">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex h-dvh flex-col overflow-hidden bg-white dark:bg-black">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-white px-4 dark:bg-black max-sm:px-3">
            <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
              <SidebarTrigger aria-label="Toggle sidebar" className="-ml-1" />
              <span className="h-4 w-px bg-border" />
              <Breadcrumb>
                <BreadcrumbList className="text-xs flex-wrap sm:flex-nowrap">
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs text-muted-foreground hidden sm:inline">Administration</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:inline" />
                  {isFacilityPage ? (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbPage
                          className="max-w-[120px] truncate text-xs text-muted-foreground cursor-pointer hover:underline sm:max-w-none"
                          onClick={() => navigate(facilityParentPath)}
                        >
                          {facilityParentLabel}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="max-w-[180px] truncate text-xs sm:max-w-none">{facilityBreadcrumb || locationState?.facilityName || "Facility"}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : isStaffProfilePage ? (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbPage
                          className="max-w-[120px] truncate text-xs text-muted-foreground cursor-pointer hover:underline sm:max-w-none"
                          onClick={() => {
                            if (locationState?.returnTo) {
                              navigate(locationState.returnTo)
                            } else {
                              navigate("/superadmin/users")
                            }
                          }}
                        >
                          {locationState?.returnLabel || "Staff & Access Control"}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="max-w-[140px] truncate text-xs sm:max-w-none">Staff Profile</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : isMotherPage ? (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbPage
                          className="max-w-[120px] truncate text-xs text-muted-foreground cursor-pointer hover:underline sm:max-w-none"
                          onClick={() => {
                            if (locationState?.returnTo) {
                              navigate(locationState.returnTo)
                            } else {
                              navigate("/superadmin/rhu-management")
                            }
                          }}
                        >
                          {locationState?.returnLabel || "Maternal Care"}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="max-w-[140px] truncate text-xs sm:max-w-none">Mother Profile</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbPage className="max-w-[160px] truncate text-xs sm:max-w-none">{activeSection.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              <PageGuide />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSyncOpen(true)}
                    aria-label={isOnline ? "You're Online. Open offline memory and sync" : "You're Offline. Open offline memory and sync"}
                    className="h-8 gap-2 border-sidebar-border bg-background px-2.5 text-xs font-medium dark:bg-black max-sm:size-8 max-sm:justify-center max-sm:px-0"
                  >
                    <span className="relative flex size-2" aria-hidden="true">
                      {isOnline && <span className={`absolute inline-flex size-full motion-safe:animate-ping rounded-full ${syncState.isSyncing ? "bg-amber-400 opacity-90" : "bg-green-600 opacity-90"}`} />}
                      <span className={`relative inline-flex size-2 rounded-full ${!isOnline ? "bg-amber-500" : syncState.isSyncing ? "bg-amber-400 animate-spin" : "bg-green-400"}`} />
                    </span>
                    <span className="max-sm:hidden">{syncState.isSyncing
                      ? "Syncing…"
                      : !isOnline
                        ? (syncState.pendingCount > 0 ? `Offline (${syncState.pendingCount} queued)` : "You're Offline")
                        : (syncState.pendingCount > 0 ? `Online (${syncState.pendingCount} pending)` : "You're Online")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Offline memory and sync</TooltipContent>
              </Tooltip>

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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative size-8 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle theme"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent>
              </Tooltip>

            </div>

            <div className="flex w-full min-w-0 items-center justify-between gap-2 md:hidden">
              <Breadcrumb>
                <BreadcrumbList className="min-w-0 text-xs">
                  <BreadcrumbItem>
                    <BreadcrumbPage className="max-w-[150px] truncate text-xs font-normal">{activeSection.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex shrink-0 items-center gap-1">
                <PageGuide />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSyncOpen(true)}
                      aria-label={isOnline ? "You're Online. Open offline memory and sync" : "You're Offline. Open offline memory and sync"}
                      className="h-8 gap-1.5 border-sidebar-border bg-background px-2 text-xs font-medium dark:bg-black"
                    >
                      <span className="relative flex size-2" aria-hidden="true">
                        {isOnline && <span className={`absolute inline-flex size-full motion-safe:animate-ping rounded-full ${syncState.isSyncing ? "bg-amber-400 opacity-90" : "bg-green-600 opacity-90"}`} />}
                        <span className={`relative inline-flex size-2 rounded-full ${!isOnline ? "bg-amber-500" : syncState.isSyncing ? "bg-amber-400 animate-spin" : "bg-green-400"}`} />
                      </span>
                      <span>{syncState.isSyncing
                        ? "Syncing…"
                        : !isOnline
                          ? (syncState.pendingCount > 0 ? `Offline (${syncState.pendingCount})` : "Offline")
                          : (syncState.pendingCount > 0 ? `Online (${syncState.pendingCount})` : "Online")}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Offline memory and sync</TooltipContent>
                </Tooltip>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="relative size-8 text-muted-foreground hover:text-foreground">
                      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent>
                </Tooltip>
                <Tooltip><TooltipTrigger asChild><SidebarTrigger aria-label="Toggle sidebar" className="-mr-1" /></TooltipTrigger><TooltipContent>Toggle sidebar</TooltipContent></Tooltip>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-black">
            <Outlet />
          </main>
        </SidebarInset>
        <OfflineSyncDrawer open={syncOpen} onOpenChange={setSyncOpen} />
        <InstallMobileAppDialog open={installAppOpen} onOpenChange={setInstallAppOpen} />
      </TooltipProvider>
  )
}
