import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ExternalLink,
  KeyRound,
  MoreVertical,
  Download,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CachedDataBanner } from "@/components/ui/cached-data-banner"
import { Checkbox } from "@/components/ui/checkbox"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TableSkeletonRows } from "@/components/ui/table-skeleton-rows"
import { MobileTableCardSkeleton } from "@/components/ui/mobile-table-card-skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { useAuthSession } from "@/features/auth/auth-session"
import { db } from "@/lib/db/silangDatabase"
import {
  adminResetStaffPassword,
  fetchAllFacilities,
  fetchStaffMembers,
  updateStaffActiveStatus,
  updateStaffRole,
  type FacilityItem,
  type StaffItem,
} from "../api/superadmin-api"

export function SuperAdminStaffPage() {
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const [staffList, setStaffList] = useState<StaffItem[]>([])
  const [facilities, setFacilities] = useState<FacilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [facilityFilter, setFacilityFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null)
  const [newRole, setNewRole] = useState("")
  const [submittingRole, setSubmittingRole] = useState(false)

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [submittingPassword, setSubmittingPassword] = useState(false)

  const loadData = async () => {
    if (!session?.token) return
    setLoading(true)
    try {
      const [members, facs] = await Promise.all([
        fetchStaffMembers(session.token, {
          facility_id: facilityFilter,
          role: roleFilter,
          is_active: statusFilter,
        }),
        fetchAllFacilities(session.token).catch(async () => {
          const localFacs = await db.facilities.toArray().catch(() => [])
          return localFacs.map((f) => ({
            facility_id: f.facility_id,
            facility_name: f.facility_name,
            type: f.type,
            address: f.address,
            contact_number: f.contact_number,
            email: f.email,
            is_active: f.is_active,
          }))
        }),
      ])
      setStaffList(members)
      setFacilities(facs)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load staff list"
      toast.error("Error loading staff", { description: message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [session?.token, facilityFilter, roleFilter, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [query, facilityFilter, roleFilter, statusFilter])

  const filteredStaff = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return staffList
    return staffList.filter((s) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
      const email = (s.email || "").toLowerCase()
      const phone = (s.phone_number || "").toLowerCase()
      const facName = (s.facility?.facility_name || "").toLowerCase()
      return fullName.includes(term) || email.includes(term) || phone.includes(term) || facName.includes(term)
    })
  }, [staffList, query])

  const paginatedStaff = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredStaff.slice(start, start + pageSize)
  }, [filteredStaff, page, pageSize])

  const handleRoleChange = async () => {
    if (!session?.token || !selectedStaff || !newRole) return
    setSubmittingRole(true)
    try {
      await updateStaffRole(session.token, selectedStaff.user_id, newRole)
      setStaffList((prev) =>
        prev.map((s) => (s.user_id === selectedStaff.user_id ? { ...s, role: newRole } : s))
      )
      toast.success("Role updated", {
        description: `${selectedStaff.first_name} ${selectedStaff.last_name}'s role changed to ${newRole}`,
      })
      setRoleDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update role"
      toast.error("Error updating role", { description: message })
    } finally {
      setSubmittingRole(false)
    }
  }

  const handleToggleStatus = async (staff: StaffItem) => {
    if (!session?.token) return
    const nextState = !staff.is_active
    try {
      await updateStaffActiveStatus(session.token, staff.user_id, nextState)
      setStaffList((prev) =>
        prev.map((s) => (s.user_id === staff.user_id ? { ...s, is_active: nextState } : s))
      )
      toast.success(nextState ? "Account activated" : "Account suspended", {
        description: `${staff.first_name} ${staff.last_name} is now ${nextState ? "Active" : "Deactivated"}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change account status"
      toast.error("Status update error", { description: message })
    }
  }

  const handleResetPassword = async () => {
    if (!session?.token || !selectedStaff) return
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setSubmittingPassword(true)
    try {
      await adminResetStaffPassword(session.token, selectedStaff.user_id, newPassword)
      toast.success("Password reset successfully", {
        description: `Password for ${selectedStaff.first_name} ${selectedStaff.last_name} has been updated.`,
      })
      setPasswordDialogOpen(false)
      setNewPassword("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset password"
      toast.error("Password reset error", { description: message })
    } finally {
      setSubmittingPassword(false)
    }
  }

  const exportStaff = () => {
    const rows = [
      ["Name", "Email", "Role", "Facility", "Contact", "Status"],
      ...filteredStaff.map((staff) => [
        `${staff.first_name} ${staff.last_name}`,
        staff.email || "",
        staff.role,
        staff.facility?.facility_name || "",
        staff.phone_number || "",
        staff.is_active ? "Active" : "Deactivated",
      ]),
    ]
    const csv = `\ufeff${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "silang-staff.csv"
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Staff directory exported")
  }

  return (
    <section className="w-full space-y-4 px-4 pb-8 pt-4 text-foreground">
      <CachedDataBanner message="Viewing cached municipal personnel directory. Offline role modifications and account toggles will queue and synchronize once connection is restored." />
      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-4 bg-background px-4 py-3 dark:bg-black">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-full md:hidden" aria-label="Staff status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Deactivated</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="hidden md:block">
          <TabsList mobileSelect={false}>
            <TabsTrigger value="all">All Staff</TabsTrigger>
            <TabsTrigger value="true">Active</TabsTrigger>
            <TabsTrigger value="false">Deactivated</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={exportStaff} disabled={loading || filteredStaff.length === 0} aria-label="Export staff" title="Export staff"><Download className="size-4" /></Button>
          <Button variant="outline" size="icon" className="size-8" onClick={loadData} disabled={loading} aria-label="Refresh staff" title="Refresh staff"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[320px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, or phone..." className="h-8 w-full pl-8 text-xs" />
        </div>
        <Popover>
          <PopoverTrigger asChild><Button variant="filter" size="filter"><PlusCircle className="size-3.5" />Facility</Button></PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-3"><div className="flex flex-col gap-3">
            {[["all", "All facilities"], ...facilities.map((facility) => [facility.facility_id, facility.facility_name])].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={facilityFilter === value} onCheckedChange={() => setFacilityFilter(value)} className="size-3.5 rounded-[4px] border-sidebar-border" />{label}</label>
            ))}
          </div></PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild><Button variant="filter" size="filter"><PlusCircle className="size-3.5" />Role</Button></PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-3"><div className="flex flex-col gap-3">
            {[["all", "All roles"], ["Admin", "Admin"], ["Doctor", "Doctor"], ["Midwife", "Midwife"], ["Nurse", "Nurse"], ["HealthWorker", "Health worker"]].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={roleFilter === value} onCheckedChange={() => setRoleFilter(value)} className="size-3.5 rounded-[4px] border-sidebar-border" />{label}</label>
            ))}
          </div></PopoverContent>
        </Popover>
        {(query.trim() || facilityFilter !== "all" || roleFilter !== "all") && (
          <Button variant="ghost" className="h-8 gap-2 px-2 text-xs text-muted-foreground" onClick={() => { setQuery(""); setFacilityFilter("all"); setRoleFilter("all") }}><RotateCcw className="size-3.5" />Reset Filter</Button>
        )}
      </div>
      </div>

      <div className="hidden w-full overflow-hidden rounded-md border border-sidebar-border bg-background dark:bg-black md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-3"><Checkbox aria-label="Select all staff on this page" checked={paginatedStaff.length > 0 && paginatedStaff.every((staff) => selectedRows.includes(staff.user_id))} onCheckedChange={(checked) => setSelectedRows(checked ? [...new Set([...selectedRows, ...paginatedStaff.map((staff) => staff.user_id)])] : selectedRows.filter((id) => !paginatedStaff.some((staff) => staff.user_id === id)))} /></TableHead>
              <TableHead>Staff Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Facility</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={7} rows={4} checkboxColumn />
            ) : filteredStaff.length === 0 ? (
              <TableEmptyState colSpan={7} icon={Users} title="No staff found" description="Adjust your search or filters to see staff members." />
            ) : (
              paginatedStaff.map((staff) => {
                return (
                  <TableRow
                    key={staff.user_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest("button") || target.closest("[role='checkbox']") || target.closest("[role='menuitem']")) return
                      navigate(`/superadmin/users/${staff.user_id}`, {
                        state: { returnTo: "/superadmin/users", returnLabel: "Staff & Access Control" },
                      })
                    }}
                  >
                    <TableCell className="px-3"><Checkbox aria-label={`Select ${staff.first_name} ${staff.last_name}`} checked={selectedRows.includes(staff.user_id)} onCheckedChange={(checked) => setSelectedRows((rows) => checked ? [...rows, staff.user_id] : rows.filter((id) => id !== staff.user_id))} /></TableCell>
                    <TableCell><div className="flex flex-col"><span className="text-xs font-medium hover:underline">{staff.first_name} {staff.middle_name ? `${staff.middle_name} ` : ""}{staff.last_name}</span><span className="text-xs text-muted-foreground">{staff.email || "No email"}</span></div></TableCell>
                    <TableCell><StatusBadge status={staff.is_active ? "active" : "inactive"} /></TableCell>
                    <TableCell><span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{staff.role}</span></TableCell>
                    <TableCell className="text-xs">{staff.facility?.facility_name || "Unassigned"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{staff.phone_number || "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7" aria-label="More actions">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/superadmin/users/${staff.user_id}`, {
                                state: { returnTo: "/superadmin/users", returnLabel: "Staff & Access Control" },
                              })
                            }
                          >
                            <ExternalLink className="mr-2 size-3.5" />
                            View Staff Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaff(staff)
                              setNewRole(staff.role)
                              setRoleDialogOpen(true)
                            }}
                          >
                            <Shield className="mr-2 size-3.5" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaff(staff)
                              setNewPassword("")
                              setPasswordDialogOpen(true)
                            }}
                          >
                            <KeyRound className="mr-2 size-3.5" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={staff.is_active ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
                            onClick={() => handleToggleStatus(staff)}
                          >
                            {staff.is_active ? (
                              <>
                                <UserX className="mr-2 size-3.5" />
                                Suspend Account
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 size-3.5" />
                                Reactivate Account
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 md:hidden">
        {loading ? (
          <MobileTableCardSkeleton count={3} />
        ) : filteredStaff.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-md border border-sidebar-border bg-card p-6 text-center text-xs text-muted-foreground">
            No personnel matching search or filter parameters.
          </div>
        ) : (
          paginatedStaff.map((staff) => {
            return (
              <article
                key={staff.user_id}
                data-mobile-record
                role="link"
                tabIndex={0}
                aria-label={`Open ${staff.first_name} ${staff.last_name}'s staff profile`}
                className="cursor-pointer rounded-md border border-sidebar-border bg-background p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-black"
                onClick={(event) => {
                  const target = event.target as HTMLElement
                  if (target.closest("button, a, input, [role='checkbox'], [role='menuitem']")) return
                  navigate(`/superadmin/users/${staff.user_id}`, {
                    state: { returnTo: "/superadmin/users", returnLabel: "Staff & Access Control" },
                  })
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return
                  event.preventDefault()
                  navigate(`/superadmin/users/${staff.user_id}`, {
                    state: { returnTo: "/superadmin/users", returnLabel: "Staff & Access Control" },
                  })
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Checkbox aria-label={`Select ${staff.first_name} ${staff.last_name}`} checked={selectedRows.includes(staff.user_id)} onCheckedChange={(checked) => setSelectedRows((rows) => checked ? [...rows, staff.user_id] : rows.filter((id) => id !== staff.user_id))} />
                    <div className="min-w-0">
                      <Link
                        to={`/superadmin/users/${staff.user_id}`}
                        state={{ returnTo: "/superadmin/users", returnLabel: "Staff & Access Control" }}
                        className="truncate text-xs font-semibold text-foreground hover:underline block"
                      >
                        {staff.first_name} {staff.middle_name ? `${staff.middle_name} ` : ""}{staff.last_name}
                      </Link>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="More actions">
                        <MoreVertical className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(`/superadmin/users/${staff.user_id}`, {
                            state: { returnTo: "/superadmin/users", returnLabel: "Staff & Access Control" },
                          })
                        }
                      >
                        <ExternalLink className="mr-2 size-3.5" />
                        View Staff Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedStaff(staff)
                          setNewRole(staff.role)
                          setRoleDialogOpen(true)
                        }}
                      >
                        <Shield className="mr-2 size-3.5" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedStaff(staff)
                          setNewPassword("")
                          setPasswordDialogOpen(true)
                        }}
                      >
                        <KeyRound className="mr-2 size-3.5" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={
                          staff.is_active
                            ? "text-rose-600 focus:text-rose-700 dark:text-rose-400"
                            : "text-emerald-600 focus:text-emerald-700 dark:text-emerald-400"
                        }
                        onClick={() => handleToggleStatus(staff)}
                      >
                        {staff.is_active ? (
                          <>
                            <UserX className="mr-2 size-3.5" />
                            Suspend Account
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 size-3.5" />
                            Reactivate Account
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-medium">
                    <Shield className="size-3 text-muted-foreground" />
                    {staff.role}
                  </span>
                  <StatusBadge status={staff.is_active ? "active" : "inactive"} />
                </div>
                <div className="mt-3 grid min-w-0 grid-cols-3 gap-3 text-xs">
                  <div className="min-w-0"><p className="text-muted-foreground">Facility</p><p className="mt-1 break-words font-medium text-foreground">{staff.facility?.facility_name || "Unassigned"}</p></div>
                  <div className="min-w-0"><p className="text-muted-foreground">Contact</p><p className="mt-1 break-words font-medium text-foreground">{staff.phone_number || "—"}</p></div>
                  <div className="min-w-0"><p className="text-muted-foreground">Facility type</p><p className="mt-1 break-words font-medium text-foreground">{staff.facility?.type || "Central"}</p></div>
                  <div className="col-span-3 min-w-0"><p className="text-muted-foreground">Email</p><p className="mt-1 break-all font-medium text-foreground">{staff.email || "—"}</p></div>
                </div>
              </article>
            )
          })
        )}
      </div>

      <TablePaginationFooter
        rowCount={filteredStaff.length}
        selectedCount={selectedRows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-md">
          <DialogHeader className="gap-1 pr-14 text-left">
            <DialogTitle className="text-base font-semibold">Change Role</DialogTitle>
            <DialogDescription className="text-xs">
              Choose a role for {selectedStaff?.first_name} {selectedStaff?.last_name}.
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Role <span className="text-destructive">*</span></Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Midwife">Midwife</SelectItem>
                    <SelectItem value="Nurse">Nurse</SelectItem>
                    <SelectItem value="HealthWorker">Health Worker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 pt-3 sm:justify-between [&_button]:h-8 [&_button]:px-3 [&_button]:text-xs">
            <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="h-8 px-3 text-xs" onClick={handleRoleChange} disabled={submittingRole}>
              {submittingRole ? "Updating..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-md">
          <DialogHeader className="gap-1 pr-14 text-left">
            <DialogTitle className="text-base font-semibold">Reset Password</DialogTitle>
            <DialogDescription className="text-xs">
              Set a password for {selectedStaff?.first_name} {selectedStaff?.last_name}.
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Password <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 pt-3 sm:justify-between [&_button]:h-8 [&_button]:px-3 [&_button]:text-xs">
            <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="h-8 px-3 text-xs" onClick={handleResetPassword} disabled={submittingPassword}>
              {submittingPassword ? "Resetting..." : "Confirm Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

