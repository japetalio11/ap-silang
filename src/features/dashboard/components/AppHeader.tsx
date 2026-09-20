import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Search, PlusCircle, Moon, Sun, Droplet, UserPlus, Check } from "lucide-react"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { useLocation } from "react-router-dom"

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const isCampaignPage = location.pathname.startsWith('/dashboard/campaigns')

  return (
    <header className="bg-white dark:bg-black flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
      {/* --- DESKTOP LAYOUT --- */}
      <div className="hidden md:flex flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <div className="h-4 w-px bg-border" />
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Core Operations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {isCampaignPage ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard/campaigns">Campaigns</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs font-normal">
                    {location.pathname.includes('review') ? 'Campaign Review' : 'Campaign List'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs">Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center cursor-pointer hover:text-foreground transition-colors text-xs font-medium text-muted-foreground">
          Search for campaigns, teams...
        </div>
        
        <div className="h-4 w-px bg-border" />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 relative">
              <Bell className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-[380px] pt-4 px-4 pb-0 flex flex-col gap-4 rounded-xl border-border shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Notifications (3)</span>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <label htmlFor="unreads-desktop" className="cursor-pointer">Unreads (3)</label>
                <Switch id="unreads-desktop" className="scale-75 origin-right" />
              </div>
            </div>
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2">
              <Input placeholder="Filter Notifications" className="h-8 text-xs bg-background dark:bg-[#111]" />
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
                <span className="text-[10px] text-muted-foreground">09:34 AM</span>
              </div>
              <p className="text-xs text-foreground">Requested your approval for the campaign Community Advocacy.</p>
            </div>
          </PopoverContent>
        </Popover>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground h-8 w-8 relative"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

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
              <PlusCircle className="h-4 w-4" />
              <span>Create Campaign</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <Droplet className="h-4 w-4" />
              <span>Log Donations</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <UserPlus className="h-4 w-4" />
              <span>Invite Team Member</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* --- MOBILE LAYOUT --- */}
      <div className="flex md:hidden w-full items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            {isCampaignPage ? (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs font-normal">
                  {location.pathname.includes('review') ? 'Campaign Review' : 'Campaign List'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs font-normal">Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 relative">
                <Bell className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="center" collisionPadding={0} className="w-screen sm:w-[380px] pt-4 px-4 pb-0 flex flex-col gap-4 rounded-xl border-border shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Notifications (3)</span>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <label htmlFor="unreads-mobile" className="cursor-pointer">Unreads (3)</label>
                  <Switch id="unreads-mobile" className="scale-75 origin-right" />
                </div>
              </div>
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2">
                <Input placeholder="Filter Notifications" className="h-8 text-xs bg-background dark:bg-[#111]" />
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
                  <span className="text-[10px] text-muted-foreground">09:34 AM</span>
                </div>
                <p className="text-xs text-foreground">Requested your approval for the campaign Community Advocacy.</p>
              </div>
            </PopoverContent>
          </Popover>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground h-8 w-8 relative"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <SidebarTrigger className="-mr-1" />
        </div>
      </div>
    </header>
  )
}
