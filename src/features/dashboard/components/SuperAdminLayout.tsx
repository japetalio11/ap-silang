import { useEffect, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  Building2,
  FileText,
  Hospital,
  LayoutDashboard,
  Moon,
  PlusCircle,
  Settings2,
  ShieldCheck,
  Sun,
  ChevronsUpDown,
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
import { useTheme } from "@/components/theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { OfflineSyncDrawer } from "./OfflineSyncDrawer"
import { toast } from "sonner"
import headerIcon from "@/assets/silang-sidebar.svg"
import { useAuthSession } from "@/features/auth/auth-session"

const superAdminNavigation = [
  { label: "Municipal Overview", path: "/superadmin/overview", icon: LayoutDashboard },
  { label: "RHU Management", path: "/superadmin/rhu-management", icon: Hospital },
  { label: "BHS Management", path: "/superadmin/bhs-management", icon: Building2 },
  { label: "Audit Trail", path: "/superadmin/audit-logs", icon: FileText },
  { label: "Settings", path: "/superadmin/settings", icon: Settings2 },
]

export function SuperAdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, logout } = useAuthSession()
  const { theme, setTheme } = useTheme()
  const [syncOpen, setSyncOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine)

  const activeSection =
    superAdminNavigation.find((item) => location.pathname === item.path) ?? superAdminNavigation[0]

  const userFullName = session?.user
    ? `${session.user.first_name} ${session.user.last_name}`.trim()
    : "Super Administrator"

  const userInitials = session?.user
    ? `${session.user.first_name?.[0] || "S"}${session.user.last_name?.[0] || "A"}`.toUpperCase()
    : "SA"

  useEffect(() => {
    document.title = `${activeSection.label} - Silang Superadmin`
  }, [activeSection.label])

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine)
    window.addEventListener("online", updateConnection)
    window.addEventListener("offline", updateConnection)
    return () => {
      window.removeEventListener("online", updateConnection)
      window.removeEventListener("offline", updateConnection)
    }
  }, [])

  const handleLogout = () => {
    logout()
    toast.success("Signed out of the superadmin workspace")
    navigate("/superadmin", { replace: true })
  }

  return (
    <SidebarProvider>
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
            <div className="px-4 py-3 group-data-[collapsible=icon]:px-0">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-border">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex min-w-0 flex-col overflow-hidden whitespace-nowrap group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                  <span className="text-xs font-medium">Municipal Health Office</span>
                  <span className="text-[11px] text-muted-foreground">Central System Admin</span>
                </div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Municipal Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {superAdminNavigation.map(({ label, path, icon: Icon }) => (
                    <SidebarMenuItem key={path}>
                      <SidebarMenuButton
                        isActive={activeSection.path === path}
                        onClick={() =>
                          navigate(path, path.endsWith("/settings") ? { state: { returnTo: location.pathname } } : undefined)
                        }
                        tooltip={label}
                      >
                        <Icon className="mr-2" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 ease-linear group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <Avatar className="size-8 shrink-0 rounded-lg">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex min-w-0 flex-1 flex-col overflow-hidden whitespace-nowrap text-left group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                        <span className="truncate text-xs font-medium">{userFullName}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {session?.user.email || "SystemAdmin"}
                        </span>
                      </span>
                      <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-[--radix-dropdown-menu-trigger-width]">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
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
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-white px-4 dark:bg-black">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger aria-label="Toggle sidebar" className="-ml-1" />
              <span className="h-4 w-px bg-border" />
              <Breadcrumb>
                <BreadcrumbList className="text-xs">
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs text-muted-foreground">Administration</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs">{activeSection.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSyncOpen(true)}
                    className="h-8 gap-2 border-sidebar-border bg-background px-2.5 text-xs font-medium dark:bg-black"
                  >
                    <span className="relative flex size-2" aria-hidden="true">
                      {isOnline && (
                        <span className="absolute inline-flex size-full motion-safe:animate-ping rounded-full bg-green-600 opacity-90" />
                      )}
                      <span className={`relative inline-flex size-2 rounded-full ${isOnline ? "bg-green-400" : "bg-amber-500"}`} />
                    </span>
                    {isOnline ? "Online" : "Offline"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Offline memory and sync</TooltipContent>
              </Tooltip>

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

              <div aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" className="h-8 gap-2 px-2 text-xs font-medium">
                    <PlusCircle className="size-3.5" />
                    <span>Quick Create</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border-border shadow-md">
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Quick Create</DropdownMenuLabel>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 rounded-md"
                    onClick={() => navigate("/superadmin/rhu-management", { state: { openCreate: true } })}
                  >
                    <Hospital className="size-4" />
                    <span>Add Rural Health Unit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 rounded-md"
                    onClick={() => navigate("/superadmin/bhs-management", { state: { openCreate: true } })}
                  >
                    <Building2 className="size-4" />
                    <span>Add Barangay Health Station</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-black">
            <Outlet />
          </main>
        </SidebarInset>
        <OfflineSyncDrawer open={syncOpen} onOpenChange={setSyncOpen} />
      </TooltipProvider>
    </SidebarProvider>
  )
}
