import { useEffect, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, PlusCircle, Moon, Sun, UserPlus, Check, CalendarPlus, Stethoscope, Send, ShieldPlus } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
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

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const { session } = useAuthSession()
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
        <Popover>
          <Tooltip><TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="text-muted-foreground hover:text-foreground h-8 w-8 relative">
                <Bell className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip>
          <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-[380px] pt-4 px-4 pb-0 flex flex-col gap-4 rounded-xl border-border shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Notifications (3)</span>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <label htmlFor="unreads-desktop" className="cursor-pointer">Unreads (3)</label>
                <Switch id="unreads-desktop" className="scale-75 origin-right" />
              </div>
            </div>
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2">
              <Input placeholder="Filter Notifications" className="h-8 text-xs bg-muted/70 dark:bg-muted/60" />
              <Button className="h-8 px-3 text-xs shrink-0 gap-1.5 bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black">
                <Check className="h-3.5 w-3.5" />
                Mark all as read
              </Button>
            </div>
            <div className="border-t border-border py-4 flex flex-col gap-2 -mx-4 px-4 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="https://github.com/shadcn.png" alt="Joseph" />
                    <AvatarFallback>JP</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground">Joseph Angelo Petalio</span>
                </div>
                <span className="text-xs text-muted-foreground">09:34 AM</span>
              </div>
              <p className="text-xs text-foreground">A referral transfer is waiting for your review.</p>
            </div>
          </PopoverContent>
        </Popover>
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
          <Popover>
            <Tooltip><TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="text-muted-foreground hover:text-foreground h-8 w-8 relative">
                  <Bell className="size-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip>
            <PopoverContent align="center" collisionPadding={0} className="w-screen sm:w-[380px] pt-4 px-4 pb-0 flex flex-col gap-4 rounded-xl border-border shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Notifications (3)</span>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <label htmlFor="unreads-mobile" className="cursor-pointer">Unreads (3)</label>
                  <Switch id="unreads-mobile" className="scale-75 origin-right" />
                </div>
              </div>
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2">
                <Input placeholder="Filter Notifications" className="h-8 text-xs bg-muted/70 dark:bg-muted/60" />
                <Button className="h-8 px-3 text-xs shrink-0 gap-1.5 bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black">
                  <Check className="h-3.5 w-3.5" />
                  Mark all as read
                </Button>
              </div>
              <div className="border-t border-border py-4 flex flex-col gap-2 -mx-4 px-4 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="https://github.com/shadcn.png" alt="Joseph" />
                      <AvatarFallback>JP</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground">Joseph Angelo Petalio</span>
                  </div>
                  <span className="text-xs text-muted-foreground">09:34 AM</span>
                </div>
                <p className="text-xs text-foreground">A referral transfer is waiting for your review.</p>
              </div>
            </PopoverContent>
          </Popover>
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
