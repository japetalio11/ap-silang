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
import { useLocation } from "react-router-dom"
import { OfflineSyncDrawer } from "./OfflineSyncDrawer"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuthSession } from "@/features/auth/auth-session"
import { getMaternalProfile } from "@/features/maternal-records/api"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"
import { getUserNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRecord } from "@/features/dashboard/api/notifications"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const { session } = useAuthSession()
  const sessionToken = session?.token
  const sessionUserId = session?.user.user_id
  const navigate = useNavigate()
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
  const [profileBreadcrumbResult, setProfileBreadcrumbResult] = useState<{ motherId: string; name: string } | null>(null)
  const isMaternalArea = location.pathname.startsWith('/dashboard/maternal-records')
  const isMaternalProfile = location.pathname.startsWith('/dashboard/maternal-records/')
  const profileMotherId = isMaternalProfile ? decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) ?? "") : ""
  const profileBreadcrumb = profileBreadcrumbResult?.motherId === profileMotherId ? profileBreadcrumbResult.name : "Maternal Profile"
  const pageTitle = location.pathname.startsWith('/dashboard/calendar') ? 'Appointments'
    : location.pathname.startsWith('/dashboard/referrals') ? 'Inter-Clinic Referrals'
    : location.pathname.startsWith('/dashboard/team') ? 'Staff Management'
    : location.pathname.startsWith('/dashboard/messages') ? 'Messages'
    : location.pathname.startsWith('/dashboard/settings') ? 'Settings'
    : location.pathname.startsWith('/dashboard/user-guide') ? 'User Guide'
    : 'Dashboard'

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

  const unreadCount = notifications.filter((item) => !item.is_read).length
  const visibleNotifications = useMemo(() => {
    const query = notificationFilter.trim().toLocaleLowerCase()
    return notifications.filter((item) => {
      if (unreadOnly && item.is_read) return false
      return !query || `${item.sender ?? ""} ${item.notification_type ?? ""} ${item.notification_message}`.toLocaleLowerCase().includes(query)
    })
  }, [notifications, notificationFilter, unreadOnly])

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
    const route = item.link || (category.includes("referral") ? "/dashboard/referrals" : category.includes("appointment") ? "/dashboard/calendar" : category.includes("vital") || category.includes("clinical") ? "/dashboard/maternal-records" : "")
    if (route) navigate(route)
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
          notifications={notifications}
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
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-border shadow-md">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Quick Create</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <UserPlus className="h-4 w-4" />
              <span>Create Maternal Record</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <CalendarPlus className="h-4 w-4" />
              <span>Create Appointment</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <Stethoscope className="h-4 w-4" />
              <span>Log Consultation</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <Send className="h-4 w-4" />
              <span>Create Referral</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <ShieldPlus className="h-4 w-4" />
              <span>Invite Team Member</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
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
          <NotificationPopover
            notifications={notifications}
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
