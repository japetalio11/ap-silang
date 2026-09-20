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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronRight, LayoutGrid, LineChart, Target, Calendar, CalendarCheck, Users, SlidersHorizontal, Send, ChevronsUpDown } from "lucide-react"
import headerIcon from "@/assets/icon.svg"
import bmcLogo from "@/assets/Bicol Medical Center Logo.png"

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpenMobile } = useSidebar()

  const handleNavigate = (path: string) => {
    setOpenMobile(false)
    // Wait for the bottom sheet's closing animation to completely finish (typically 300ms)
    // before triggering the navigation. This prevents layout shifts and stuttering.
    setTimeout(() => {
      navigate(path)
    }, 350)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col p-0">
        <div className="flex h-14 items-center px-4 gap-2 border-b border-sidebar-border transition-all duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-transparent overflow-hidden transition-all duration-200 ease-linear">
            <img src={headerIcon} alt="Unite Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col overflow-hidden transition-all duration-200 ease-linear max-w-[250px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="text-xl font-semibold text-[#FF3B30] tracking-tight whitespace-nowrap" style={{ fontFamily: "'Poppins', sans-serif" }}>
              unite
            </span>
          </div>
        </div>
        <div className="px-4 pt-2 pb-2 transition-all duration-200 ease-linear group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2 text-left transition-all duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-border bg-transparent overflow-hidden transition-all duration-200 ease-linear">
              <img src={bmcLogo} alt="Bicol Medical Center" className="h-full w-full object-contain p-0.5" />
            </div>
            <div className="flex flex-col flex-1 text-left overflow-hidden transition-all duration-200 ease-linear max-w-[250px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">
              <span className="text-xs font-medium text-foreground">Bicol Medical Center</span>
              <span className="text-[10px] font-normal text-muted-foreground">Specialized Service</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Core Operations */}
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100 relative overflow-hidden">
            <span className="transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">Core Operations</span>
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-px bg-sidebar-border opacity-0 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-100" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard' || location.pathname === '/dashboard/'}
                  onClick={() => handleNavigate('/dashboard')}
                >
                  <LayoutGrid className="mr-2" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/analytics'}
                  onClick={() => handleNavigate('/dashboard/analytics')}
                >
                  <LineChart className="mr-2" />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <Target className="mr-2" />
                      <span>Campaigns</span>
                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={location.pathname === '/dashboard/campaigns/review'}
                          onClick={() => handleNavigate('/dashboard/campaigns/review')}
                        >
                          <span>Campaign Review</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={location.pathname === '/dashboard/campaigns/list'}
                          onClick={() => handleNavigate('/dashboard/campaigns/list')}
                        >
                          <span>Campaign List</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/calendar'}
                  onClick={() => handleNavigate('/dashboard/calendar')}
                >
                  <Calendar className="mr-2" />
                  <span>Calendar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Administration */}
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100 relative overflow-hidden">
            <span className="transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">System Administration</span>
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-px bg-sidebar-border opacity-0 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-100" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/master-availability'}
                  onClick={() => handleNavigate('/dashboard/master-availability')}
                >
                  <CalendarCheck className="mr-2" />
                  <span>Master Availability</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/team'}
                  onClick={() => handleNavigate('/dashboard/team')}
                >
                  <Users className="mr-2" />
                  <span>Team Management</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/settings'}
                  onClick={() => handleNavigate('/dashboard/settings')}
                >
                  <SlidersHorizontal className="mr-2" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname === '/dashboard/feedback'}
              onClick={() => handleNavigate('/dashboard/feedback')}
            >
              <Send className="mr-2" />
              <span>Feedback</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 ease-linear group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-transparent transition-all duration-200 ease-linear">
                    <img src="https://github.com/shadcn.png" alt="Joseph Angelo" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-col flex-1 text-left overflow-hidden transition-all duration-200 ease-linear max-w-[250px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">
                    <span className="truncate font-medium text-xs">Joseph Angelo Petalio</span>
                    <span className="truncate text-[10px] font-normal text-muted-foreground">japetailo@gmail.com</span>
                  </div>
                  <div className="transition-all duration-200 ease-linear overflow-hidden whitespace-nowrap max-w-[20px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 ml-auto">
                    <ChevronsUpDown className="size-4 text-muted-foreground" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-dropdown-menu-trigger-width]">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavigate("/")} className="cursor-pointer">Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
