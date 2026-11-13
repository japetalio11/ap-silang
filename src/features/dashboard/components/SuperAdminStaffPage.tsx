import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ExternalLink,
  KeyRound,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { useAuthSession } from "@/features/auth/auth-session"
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
        fetchAllFacilities(session.token).catch(() => []),
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
      toast.success("Role updated", {
        description: `${selectedStaff.first_name} ${selectedStaff.last_name}'s role changed to ${newRole}`,
      })
      setRoleDialogOpen(false)
      loadData()
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
      toast.success(nextState ? "Account activated" : "Account suspended", {
        description: `${staff.first_name} ${staff.last_name} is now ${nextState ? "Active" : "Deactivated"}`,
      })
      loadData()
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

  const activeCount = useMemo(() => staffList.filter((s) => s.is_active).length, [staffList])
  const deactivatedCount = useMemo(() => staffList.filter((s) => !s.is_active).length, [staffList])

  return (
    <section className="w-full space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Municipal Staff & Access Control
          </h1>
          <p className="text-xs text-muted-foreground">
            Centralized directory of healthcare workers, role management, and security credentials across all Silang facilities.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            loadData()
            toast.success("Staff list refreshed")
          }}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Staff Registered</CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{staffList.length}</div>
            <p className="text-[11px] text-muted-foreground">Across all RHUs and Barangay stations</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Personnel</CardTitle>
            <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-[11px] text-muted-foreground">Authorized for clinical care & sync</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Suspended / Inactive</CardTitle>
            <UserX className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{deactivatedCount}</div>
            <p className="text-[11px] text-muted-foreground">Deactivated accounts</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[260px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff by name, email, phone..."
            className="h-8 w-full border-sidebar-border bg-muted/70 px-2 pl-8 text-xs dark:bg-muted/60"
          />
        </div>

        <Select value={facilityFilter} onValueChange={setFacilityFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="All Facilities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Facilities</SelectItem>
            {facilities.map((f) => (
              <SelectItem key={f.facility_id} value={f.facility_id}>
                {f.facility_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Doctor">Doctor</SelectItem>
            <SelectItem value="Midwife">Midwife</SelectItem>
            <SelectItem value="Nurse">Nurse</SelectItem>
            <SelectItem value="HealthWorker">HealthWorker</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active Only</SelectItem>
            <SelectItem value="false">Inactive Only</SelectItem>
          </SelectContent>
        </Select>

        {(query.trim().length > 0 || facilityFilter !== "all" || roleFilter !== "all" || statusFilter !== "all") && (
          <Button
            variant="ghost"
            className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"
            onClick={() => {
              setQuery("")
              setFacilityFilter("all")
              setRoleFilter("all")
              setStatusFilter("all")
            }}
          >
            <RotateCcw className="size-3.5" />
            Reset Filters
          </Button>
        )}
      </div>

      <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Assigned Facility</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  Loading municipal personnel directory...
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  No personnel matching search or filter parameters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedStaff.map((staff) => {
                const initials = `${staff.first_name?.[0] || ""}${staff.last_name?.[0] || ""}`.toUpperCase()
                return (
                  <TableRow
                    key={staff.user_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest("button") || target.closest("[role='menuitem']")) return
                      navigate(`/superadmin/users/${staff.user_id}`, {
                        state: { returnTo: "/superadmin/users", returnLabel: "Staff & Access Control" },
                      })
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 rounded-full border border-border">
                          {staff.profile_url && <AvatarImage src={staff.profile_url} />}
                          <AvatarFallback className="text-[11px] font-medium">{initials || "ST"}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium hover:underline">
                            {staff.first_name} {staff.middle_name ? `${staff.middle_name} ` : ""}{staff.last_name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{staff.email || "No email"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{staff.facility?.facility_name || "Unassigned"}</span>
                        <span className="text-[11px] text-muted-foreground">{staff.facility?.type || "Central"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        <Shield className="size-3 text-muted-foreground" />
                        {staff.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {staff.phone_number || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={staff.is_active ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
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

      <TablePaginationFooter
        rowCount={filteredStaff.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Change Personnel Role</DialogTitle>
            <DialogDescription className="text-xs">
              Update authorization role for {selectedStaff?.first_name} {selectedStaff?.last_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Facility Administrator)</SelectItem>
                  <SelectItem value="Doctor">Doctor (Physician)</SelectItem>
                  <SelectItem value="Midwife">Midwife (Clinical Provider)</SelectItem>
                  <SelectItem value="Nurse">Nurse (Clinical Staff)</SelectItem>
                  <SelectItem value="HealthWorker">HealthWorker (BHW)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRoleChange} disabled={submittingRole}>
              {submittingRole ? "Updating..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Administrative Password Reset</DialogTitle>
            <DialogDescription className="text-xs">
              Set a temporary password for {selectedStaff?.first_name} {selectedStaff?.last_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">New Password</Label>
              <Input
                type="text"
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleResetPassword} disabled={submittingPassword}>
              {submittingPassword ? "Resetting..." : "Confirm Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

