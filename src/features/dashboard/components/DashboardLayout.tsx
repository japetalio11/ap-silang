import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { AppHeader } from "./AppHeader"
import { PlusCircle, Droplet, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-white dark:bg-black flex flex-col h-screen overflow-hidden">
        <AppHeader />
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Outlet renders the nested dashboard routes */}
          <Outlet />
        </div>

        {/* Mobile Floating Action Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-foreground text-background hover:bg-foreground/90 border p-0 z-50"
            >
              <PlusCircle className="size-6" />
              <span className="sr-only">Quick Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={12} className="w-56 rounded-xl border-border shadow-md md:hidden">
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
      </SidebarInset>
    </SidebarProvider>
  )
}
