import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  RefreshCw,
  PlusCircle,
  UserPlus,
  RotateCcw,
  UsersRound,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { TableRowActions } from "@/components/ui/table-row-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/ui/status-badge"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { TableSkeletonRows } from "@/components/ui/table-skeleton-rows"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmSensitiveActionDialog } from "@/components/ui/confirm-sensitive-action-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EmptyStateContent, TableEmptyState } from "@/components/ui/table-empty-state"
import { toast } from "sonner"
import { InviteTeamMemberModal } from "./InviteTeamMemberModal"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthSession } from "@/features/auth/auth-session"
import { getFacilityStaff, resetStaffPassword, setStaffActive, updateStaffRole, type StaffRecord } from "../api"
import { STAFF_FILTERS } from "../data"

export function TeamManagementPage() {
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const token = session?.token
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ Role: [], Facility: [], Status: [] })
  const [staff, setStaff] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [staffToDeactivate, setStaffToDeactivate] = useState<StaffRecord | null>(null)
  const [staffAction, setStaffAction] = useState<{ staff: StaffRecord; kind: "role" | "password" } | null>(null)
  const [actionRole, setActionRole] = useState("Nurse")
  const [newPassword, setNewPassword] = useState("")
  const [savingAction, setSavingAction] = useState(false)

  const exportStaff = () => {
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`
    const rows = [
      ["Staff Member", "Status", "Role", "Assigned Facility", "Contact Number", "Email Address"],
      ...filteredStaff.map((member) => [member.name, member.status, member.role, member.facility, member.phone, member.email]),
    ]
    const csv = `\ufeff${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "staff-registry.csv"
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filteredStaff.length} staff member${filteredStaff.length === 1 ? "" : "s"}`)
  }

  const loadStaff = useCallback(async (quiet = false) => {
    if (!token) return
    if (!quiet) setLoading(true)
    try {
      setStaff(await getFacilityStaff(token))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load staff")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadStaff() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadStaff])
  useEffect(() => {
    const refresh = () => { void loadStaff(true) }
    window.addEventListener("silang:staff-updated", refresh)
    return () => window.removeEventListener("silang:staff-updated", refresh)
  }, [loadStaff])

  // Swipe gesture handling
  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null)
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndPos(null)
    setTouchStartPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchEndHandler = () => {
    if (!touchStartPos || !touchEndPos) return

    const distanceX = touchStartPos.x - touchEndPos.x
    const distanceY = Math.abs(touchStartPos.y - touchEndPos.y)

    if (Math.abs(distanceX) > distanceY && Math.abs(distanceX) > minSwipeDistance) {
      const isLeftSwipe = distanceX > minSwipeDistance
      const isRightSwipe = distanceX < -minSwipeDistance

      const tabs = ["all", "active", "pending", "deactivated"]
      const currentIndex = tabs.indexOf(activeTab)

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1])
      }
    }
  }

  const activeFilterCount = Object.values(filters).flat().length
  const hasStaffQuery = search.trim().length > 0 || activeFilterCount > 0 || activeTab !== "all"
  const filteredStaff = staff.filter((staff) => {
    const matchesTab = activeTab === "all"
      || (activeTab === "active" && staff.status === "Active")
      || (activeTab === "pending" && staff.status === "Pending Activation")
      || (activeTab === "deactivated" && staff.status === "Deactivated")
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [staff.name, staff.email, staff.phone, staff.role, staff.facility, staff.license ?? ""].some((value) => value.toLowerCase().includes(query))
    const matchesRole = filters.Role.length === 0 || filters.Role.some((role) => staff.role.toLowerCase().includes(role.toLowerCase()))
    const matchesFacility = filters.Facility.length === 0 || filters.Facility.some((facility) => staff.facility.toLowerCase().includes(facility.toLowerCase().replace(" (main birthing unit)", "").replace(" (main birthing clinic)", "")))
    const matchesStatus = filters.Status.length === 0 || filters.Status.includes(staff.status)
    return matchesTab && matchesSearch && matchesRole && matchesFacility && matchesStatus
  })

  const toggleFilter = (filterName: string, option: string) => {
    setFilters((current) => ({
      ...current,
      [filterName]: current[filterName].includes(option)
        ? current[filterName].filter((value) => value !== option)
        : [...current[filterName], option],
    }))
  }

  const openStaffAction = (member: StaffRecord, kind: "role" | "password") => {
    setStaffAction({ staff: member, kind })
    setActionRole(member.role === "Doctor" || member.role === "HealthWorker" || member.role === "Staff" ? "Nurse" : member.role)
    setNewPassword("")
  }

  const submitStaffAction = async () => {
    if (!staffAction || !token) return
    if (staffAction.kind === "password" && newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setSavingAction(true)
    try {
      if (staffAction.kind === "role") {
        await updateStaffRole(token, staffAction.staff.id, actionRole)
        toast.success("Staff role updated")
      } else {
        await resetStaffPassword(token, staffAction.staff.id, newPassword)
        toast.success("Staff password reset")
      }
      setStaffAction(null)
      await loadStaff(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff account")
    } finally {
      setSavingAction(false)
    }
  }

  const toggleStaffActive = async (member: StaffRecord, isActive: boolean) => {
    if (!token) return
    try {
      await setStaffActive(token, member.id, isActive)
      toast.success(isActive ? "Staff account activated" : "Staff account deactivated")
      await loadStaff(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff status")
    }
  }

  return (
    <div className="relative flex items-start w-full h-full overflow-hidden">
      <div 
        className="flex flex-col w-full h-full text-foreground min-w-0 overflow-y-auto relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background dark:bg-black p-4 pl-3 pr-4 pb-4">
          {/* Tabs */}
          <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0 flex-1 overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-max">
              <TabsList className="h-9 w-full md:w-max justify-start gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="all" className="text-xs font-medium px-2 py-1 h-full">All Staff</TabsTrigger>
                <TabsTrigger value="active" className="text-xs font-medium px-2 py-1 h-full">Active</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs font-medium px-2 py-1 h-full">Pending Invites</TabsTrigger>
                <TabsTrigger value="deactivated" className="text-xs font-medium px-2 py-1 h-full">Deactivated</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Export staff" onClick={exportStaff} disabled={loading || filteredStaff.length === 0} className="hidden size-8 border-sidebar-border md:flex"><Download className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Export CSV</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Refresh team" onClick={() => void loadStaff()} disabled={loading} className="hidden size-8 border-sidebar-border md:flex"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /></Button></TooltipTrigger><TooltipContent>Refresh staff</TooltipContent></Tooltip></TooltipProvider>
            <InviteTeamMemberModal>
              <Button className="h-8 shrink-0 gap-1.5 px-2.5 text-xs font-medium"><UserPlus className="size-3.5" />Add Staff Member</Button>
            </InviteTeamMemberModal>
          </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex w-full xl:w-auto flex-wrap items-center gap-2">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or PRCS license..." className="h-8 px-2 w-full sm:w-[300px] text-xs font-normal bg-muted/70 dark:bg-muted/60 border-sidebar-border" />
              {Object.entries(STAFF_FILTERS).map(([filterName, options]) => (
                <Popover key={filterName}>
                  <PopoverTrigger asChild>
                    <Button variant="filter" size="filter" className="hidden md:flex">
                      <PlusCircle className="h-3.5 w-3.5" />
                      {filterName}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <div className="flex flex-col gap-3">
                      {options.map((option) => (
                        <label key={option} htmlFor={`filter-${filterName}-${option}`} className="flex cursor-pointer items-center gap-2 text-xs">
                          <Checkbox
                            id={`filter-${filterName}-${option}`}
                            checked={filters[filterName].includes(option)}
                            onCheckedChange={() => toggleFilter(filterName, option)}
                            className="size-3.5 rounded-[4px] border-sidebar-border"
                          />
                          <span>{option}</span>
                        </label>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ))}
              {(activeFilterCount > 0 || search.trim().length > 0) && <Button variant="ghost" onClick={() => { setSearch(""); setFilters({ Role: [], Facility: [], Status: [] }) }} className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"><RotateCcw className="size-3.5" />Reset Filter</Button>}
            </div>
          </div>


        </div>

        <div className="flex flex-col gap-4 p-4 md:pt-0 pl-3 pr-4 pb-24 md:pb-4">
          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="bg-card dark:bg-[#111]">
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead className="w-12 text-center pl-4">
                      <Checkbox className="border-sidebar-border" />
                    </TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Staff Member</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Role (RBAC)</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Assigned Facility</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Contact Number</TableHead>
                    <TableHead aria-label="Actions" className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? <TableSkeletonRows columns={7} rows={5} /> : filteredStaff.map((staff) => (
                    <TableRow 
                      key={staff.id} 
                      className="border-sidebar-border cursor-pointer transition-colors group hover:bg-accent dark:hover:bg-white/5"
                      onClick={() => navigate(`/dashboard/team/${staff.id}`)}
                      onKeyDown={(event) => { if (event.key === "Enter") navigate(`/dashboard/team/${staff.id}`) }}
                      tabIndex={0}
                    >
                      <TableCell className="pl-4">
                        <Checkbox className="border-sidebar-border data-[state=checked]:bg-primary dark:data-[state=checked]:bg-white data-[state=checked]:text-primary-foreground dark:data-[state=checked]:text-black" />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground dark:text-white">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{staff.name}</div>
                          <div className="truncate text-xs font-normal text-muted-foreground">{staff.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={staff.status} />
                      </TableCell>
                      <TableCell><span className="inline-flex w-fit max-w-48 rounded-sm border border-sidebar-border bg-muted px-1.5 py-0.5 text-xs dark:bg-[#222]">{staff.role}</span></TableCell>
                      <TableCell className="max-w-48 truncate text-xs" title={staff.facility}>{staff.facility}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{staff.phone}</TableCell>
                      <TableCell>
                        <TableRowActions label={`Actions for ${staff.name}`}>
                          <DropdownMenuItem onSelect={() => openStaffAction(staff, "role")}>Edit Role</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openStaffAction(staff, "password")}>Reset Password</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {staff.status === "Deactivated"
                            ? <DropdownMenuItem onSelect={() => void toggleStaffActive(staff, true)}>Activate Account</DropdownMenuItem>
                            : <DropdownMenuItem variant="destructive" onSelect={() => setStaffToDeactivate(staff)}>Deactivate Account</DropdownMenuItem>}
                        </TableRowActions>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filteredStaff.length === 0 && (
                    <TableEmptyState
                      colSpan={7}
                      icon={UsersRound}
                      title={hasStaffQuery ? "No staff match this view" : "No staff members yet"}
                      description={hasStaffQuery ? "Try changing or clearing the selected search and filters." : "Add your first staff member to begin managing facility access."}
                      action={hasStaffQuery
                        ? <Button variant="outline" onClick={() => { setActiveTab("all"); setSearch(""); setFilters({ Role: [], Facility: [], Status: [] }) }} className="h-8 gap-1.5 px-2.5 text-xs"><RotateCcw className="size-3.5" />Reset Filter</Button>
                        : <InviteTeamMemberModal><Button className="h-8 gap-1.5 px-2.5 text-xs"><UserPlus className="size-3.5" />Add Staff Member</Button></InviteTeamMemberModal>}
                    />
                  )}
                </TableBody>
              </Table>
            </div>
          </div>


          {/* Mobile Card List */}
          <div className="flex md:hidden flex-col gap-4">
            {loading ? Array.from({ length: 4 }, (_, index) => <article key={`staff-skeleton-${index}`} className="flex flex-col gap-4 rounded-md border border-sidebar-border p-4" aria-hidden="true"><div className="flex justify-between gap-3"><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3.5 w-1/2" /></div><Skeleton className="h-5 w-16" /></div><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3.5 w-2/3" /></article>) : filteredStaff.map((staff) => (
              <div 
                key={staff.id} 
                className="flex flex-col p-4 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] gap-4 cursor-pointer transition-colors hover:bg-accent dark:hover:bg-white/5"
                onClick={() => navigate(`/dashboard/team/${staff.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground dark:text-white">{staff.name}</h3>
                    <p className="truncate text-xs text-muted-foreground">{staff.email}</p>
                  </div>
                  <StatusBadge status={staff.status} />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Role</span>
                    <div className="max-w-[65%] truncate rounded-sm border border-sidebar-border bg-muted px-1.5 py-0.5 text-right text-xs dark:bg-[#222]">
                      {staff.role}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Facility</span>
                    <span className="max-w-[65%] truncate text-right text-xs text-foreground dark:text-white">{staff.facility}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Contact</span>
                    <span className="text-xs text-foreground dark:text-white text-right">{staff.phone}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-sidebar-border">
                  <TableRowActions label={`Actions for ${staff.name}`}>
                    <DropdownMenuItem onSelect={() => openStaffAction(staff, "role")}>Edit Role</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openStaffAction(staff, "password")}>Reset Password</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {staff.status === "Deactivated"
                      ? <DropdownMenuItem onSelect={() => void toggleStaffActive(staff, true)}>Activate Account</DropdownMenuItem>
                      : <DropdownMenuItem variant="destructive" onSelect={() => setStaffToDeactivate(staff)}>Deactivate Account</DropdownMenuItem>}
                  </TableRowActions>
                </div>
              </div>
            ))}
            {!loading && filteredStaff.length === 0 && (
              <div className="rounded-md border border-sidebar-border bg-card dark:bg-[#111]">
                <EmptyStateContent
                  icon={UsersRound}
                  title={hasStaffQuery ? "No staff match this view" : "No staff members yet"}
                  description={hasStaffQuery ? "Try changing or clearing the selected search and filters." : "Add your first staff member to begin managing facility access."}
                  action={hasStaffQuery
                    ? <Button variant="outline" onClick={() => { setActiveTab("all"); setSearch(""); setFilters({ Role: [], Facility: [], Status: [] }) }} className="h-8 gap-1.5 px-2.5 text-xs"><RotateCcw className="size-3.5" />Reset Filter</Button>
                    : <InviteTeamMemberModal><Button className="h-8 gap-1.5 px-2.5 text-xs"><UserPlus className="size-3.5" />Add Staff Member</Button></InviteTeamMemberModal>}
                />
              </div>
            )}
          </div>

          <TablePaginationFooter rowCount={filteredStaff.length} />

        </div>
      </div>


      <ConfirmSensitiveActionDialog
        open={staffToDeactivate !== null}
        onOpenChange={(open) => { if (!open) setStaffToDeactivate(null) }}
        title={`Are you sure you want to deactivate “${staffToDeactivate?.name ?? "this staff account"}”?`}
        description="This staff member will lose access to the clinic system until their account is reactivated."
        confirmLabel="I understand, deactivate this account"
        onConfirm={() => {
          if (staffToDeactivate) void toggleStaffActive(staffToDeactivate, false)
          setStaffToDeactivate(null)
        }}
      />

      <Dialog open={staffAction !== null} onOpenChange={(open) => { if (!open) setStaffAction(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{staffAction?.kind === "role" ? "Edit staff role" : "Reset staff password"}</DialogTitle>
            <DialogDescription>{staffAction?.staff.name}</DialogDescription>
          </DialogHeader>
          {staffAction?.kind === "role" ? (
            <div className="grid gap-2 py-2"><Label htmlFor="staff-role-edit">Role <span className="text-destructive">*</span></Label><Select value={actionRole} onValueChange={setActionRole}><SelectTrigger id="staff-role-edit" className="h-9"><SelectValue placeholder="Select role" /></SelectTrigger><SelectContent><SelectItem value="Nurse">Nurse</SelectItem><SelectItem value="Midwife">Midwife</SelectItem><SelectItem value="Admin">Admin</SelectItem></SelectContent></Select></div>
          ) : (
            <div className="grid gap-2 py-2"><Label htmlFor="staff-new-password">New Password <span className="text-destructive">*</span></Label><Input id="staff-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 6 characters" aria-invalid={newPassword.length > 0 && newPassword.length < 6} /><p className="text-xs text-muted-foreground">The password must contain at least 6 characters.</p></div>
          )}
          <DialogFooter className="gap-2 sm:justify-end"><Button variant="outline" onClick={() => setStaffAction(null)}>Cancel</Button><Button disabled={savingAction || (staffAction?.kind === "password" && newPassword.trim().length < 6)} onClick={() => void submitStaffAction()}>{savingAction ? "Saving…" : staffAction?.kind === "role" ? "Save Role" : "Reset Password"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
