import { useNavigate, useLocation } from "react-router-dom"
import {
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
  useSidebar,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ArrowLeftRight, Building2, CalendarDays, ChevronsUpDown, FolderHeart, LayoutDashboard, MessageSquare, ShieldCheck, SlidersHorizontal, UserCog } from "lucide-react"
import headerIcon from "@/assets/silang-sidebar.svg"
import { useAuthSession } from "@/features/auth/auth-session"
import { backendAssetUrl } from "@/lib/api"
import { isUserSuperAdmin } from "@/features/auth/components/RequireSuperAdminAuth"

const navigationGroups = [
  {
    label: "Overview",
    hideLabel: true,
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Clinical Care",
    hideLabel: false,
    items: [
      { label: "Maternal Records", path: "/dashboard/maternal-records", icon: FolderHeart },
      { label: "Inter-Clinic Referrals", path: "/dashboard/referrals", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Schedule & Ops",
    hideLabel: false,
    items: [
      { label: "Appointments", path: "/dashboard/calendar", icon: CalendarDays },
      { label: "Messages", path: "/dashboard/messages", icon: MessageSquare },
    ],
  },
  {
    label: "Administration",
    hideLabel: false,
    items: [
      { label: "Staff Management", path: "/dashboard/team", icon: UserCog },
      { label: "Settings", path: "/dashboard/settings", icon: SlidersHorizontal },
    ],
  },
]

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  const { session, logout } = useAuthSession()
  const signedInName = session?.user
    ? [session.user.first_name, session.user.middle_name, session.user.last_name].filter(Boolean).join(" ")
    : "Staff member"
  const signedInRole = session?.user.role === "SystemAdmin" || session?.user.role === "Admin"
    ? "Administrator"
    : session?.user.role || "Healthcare staff"
  const facilityName = session?.facility?.facility_name || (session?.user.facility_id ? "Loading facility…" : "No facility assigned")
  const facilityType = session?.facility?.type || (session?.user.facility_id ? "Facility profile" : "Facility not set")

  const handleNavigate = (path: string) => {
    setOpenMobile(false)
    // Wait for the bottom sheet's closing animation to completely finish (typically 300ms)
    // before triggering the navigation. This prevents layout shifts and stuttering.
    setTimeout(() => {
      if (path === "/dashboard/settings") navigate(path, { state: { backgroundLocation: location } })
      else navigate(path)
    }, 350)
  }

  return (
    <TooltipProvider delayDuration={0}>
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col p-0">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 transition-all duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent transition-all duration-200 ease-linear">
            <img src={headerIcon} alt="Silang Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex h-8 max-w-[250px] items-center overflow-hidden transition-all duration-200 ease-linear group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="translate-y-0.5 whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-[#003f2c] dark:text-[#fffe8c]" style={{ fontFamily: "'Etna', sans-serif" }}>
              Silang
            </span>
          </div>
        </div>
        <div className="px-4 pt-2 pb-2 transition-all duration-200 ease-linear group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2 text-left transition-all duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-border bg-transparent overflow-hidden transition-all duration-200 ease-linear">
              {session?.facility?.facility_profile_url
                ? <img src={backendAssetUrl(session.facility.facility_profile_url)} alt={facilityName} className="h-full w-full object-contain p-0.5" />
                : <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />}
            </div>
            <div className="flex flex-col flex-1 text-left overflow-hidden transition-all duration-200 ease-linear max-w-[250px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">
              <span className="text-xs font-medium text-foreground">{facilityName}</span>
              <span className="text-xs font-normal text-muted-foreground">{facilityType}</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!group.hideLabel && (
              <SidebarGroupLabel className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100 relative overflow-hidden">
                <span className="transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">{group.label}</span>
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-px bg-sidebar-border opacity-0 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-100" />
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ label, path, icon: Icon }) => (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton
                      isActive={location.pathname === path || (path !== "/dashboard" && location.pathname.startsWith(`${path}/`))}
                      onClick={() => handleNavigate(path)}
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
        ))}

        {isUserSuperAdmin(session?.user.role) && (
          <SidebarGroup>
            <SidebarGroupLabel>Central Governance</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/superadmin/overview")}
                    className="bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300"
                    tooltip="Municipal Superadmin"
                  >
                    <ShieldCheck className="mr-2 text-emerald-600 dark:text-emerald-400" />
                    <span>Superadmin Portal</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 ease-linear group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-transparent transition-all duration-200 ease-linear">
                    <img src="https://github.com/shadcn.png" alt={signedInName} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-col flex-1 text-left overflow-hidden transition-all duration-200 ease-linear max-w-[250px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">
                    <span className="truncate font-medium text-xs">{signedInName}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{signedInRole}</span>
                  </div>
                  <div className="transition-all duration-200 ease-linear overflow-hidden whitespace-nowrap max-w-[20px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 ml-auto">
                    <ChevronsUpDown className="size-4 text-muted-foreground" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-dropdown-menu-trigger-width]">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                {isUserSuperAdmin(session?.user.role) && (
                  <>
                    <DropdownMenuItem
                      onClick={() => navigate("/superadmin/overview")}
                      className="cursor-pointer text-emerald-600 dark:text-emerald-400"
                    >
                      <ShieldCheck className="mr-2 size-4" />
                      Superadmin Portal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => { logout(); navigate("/", { replace: true }) }} className="cursor-pointer">Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  )
}
