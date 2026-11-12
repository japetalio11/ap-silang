import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit2,
  Hospital,
  KeyRound,
  MoreVertical,
  RefreshCw,
  Shield,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthSession } from "@/features/auth/auth-session"
import {
  adminResetStaffPassword,
  fetchAllFacilities,
  fetchFacilityHubDetails,
  reassignStaffFacility,
  updateFacilityRecord,
  updateStaffActiveStatus,
  updateStaffRole,
  type FacilityHubDetails,
  type FacilityItem,
  type StaffItem,
} from "../api/superadmin-api"

export function SuperAdminFacilityDetailPage() {
  const { facilityId } = useParams<{ facilityId: string }>()
  const navigate = useNavigate()
  const { session } = useAuthSession()

  const [data, setData] = useState<FacilityHubDetails | null>(null)
  const [allFacilities, setAllFacilities] = useState<FacilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("staff")

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    facility_name: "",
    type: "RHU",
    address: "",
    contact_number: "",
    email: "",
  })
  const [savingFacility, setSavingFacility] = useState(false)

  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null)
  const [newRole, setNewRole] = useState("")
  const [submittingRole, setSubmittingRole] = useState(false)

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [submittingPassword, setSubmittingPassword] = useState(false)

  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [targetFacilityId, setTargetFacilityId] = useState("")
  const [submittingTransfer, setSubmittingTransfer] = useState(false)

  const loadData = async () => {
    if (!session?.token || !facilityId) return
    setLoading(true)
    try {
      const [hub, facs] = await Promise.all([
        fetchFacilityHubDetails(session.token, facilityId),
        fetchAllFacilities(session.token).catch(() => []),
      ])
      setData(hub)
      setAllFacilities(facs)
      setEditForm({
        facility_name: hub.facility_name,
        type: hub.type,
        address: hub.address,
        contact_number: hub.contact_number,
        email: hub.email,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load facility info"
      toast.error("Error loading facility hub", { description: message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [facilityId, session?.token])

  const handleSaveFacility = async () => {
    if (!session?.token || !facilityId) return
    if (!editForm.facility_name.trim() || !editForm.address.trim()) {
      toast.error("Facility name and address are required.")
      return
    }
    setSavingFacility(true)
    try {
      await updateFacilityRecord(session.token, {
        facility_id: facilityId,
        facility_name: editForm.facility_name.trim(),
        type: editForm.type.trim(),
        address: editForm.address.trim(),
        contact_number: editForm.contact_number.trim(),
        email: editForm.email.trim(),
      })
      toast.success("Facility info updated successfully")
      setEditDialogOpen(false)
      loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update facility"
      toast.error("Update failed", { description: message })
    } finally {
      setSavingFacility(false)
    }
  }

  const handleRoleChange = async () => {
    if (!session?.token || !selectedStaff || !newRole) return
    setSubmittingRole(true)
    try {
      await updateStaffRole(session.token, selectedStaff.user_id, newRole)
      toast.success("Staff role updated", {
        description: `${selectedStaff.first_name} ${selectedStaff.last_name} is now ${newRole}`,
      })
      setRoleDialogOpen(false)
      loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change role"
      toast.error("Role update error", { description: message })
    } finally {
      setSubmittingRole(false)
    }
  }

  const handleToggleStaffStatus = async (staff: StaffItem) => {
    if (!session?.token) return
    const nextState = !staff.is_active
    try {
      await updateStaffActiveStatus(session.token, staff.user_id, nextState)
      toast.success(nextState ? "Staff activated" : "Staff suspended", {
        description: `${staff.first_name} ${staff.last_name} account updated.`,
      })
      loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update account status"
      toast.error("Status error", { description: message })
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
        description: `Password updated for ${selectedStaff.first_name} ${selectedStaff.last_name}`,
      })
      setPasswordDialogOpen(false)
      setNewPassword("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Password reset failed"
      toast.error("Reset error", { description: message })
    } finally {
      setSubmittingPassword(false)
    }
  }

  const handleTransferStaff = async () => {
    if (!session?.token || !selectedStaff || !facilityId || !targetFacilityId) return
    setSubmittingTransfer(true)
    try {
      await reassignStaffFacility(session.token, facilityId, {
        user_id: selectedStaff.user_id,
        target_facility_id: targetFacilityId,
      })
      toast.success("Staff member reassigned", {
        description: `${selectedStaff.first_name} ${selectedStaff.last_name} transferred successfully.`,
      })
      setTransferDialogOpen(false)
      loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Staff reassignment failed"
      toast.error("Reassign error", { description: message })
    } finally {
      setSubmittingTransfer(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex h-96 w-full items-center justify-center text-xs text-muted-foreground">
        <RefreshCw className="mr-2 size-4 animate-spin text-primary" />
        Loading facility hub...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center gap-3 px-4 text-center">
        <Building2 className="size-10 text-muted-foreground/60" />
        <h2 className="text-base font-semibold">Facility Not Found</h2>
        <p className="text-xs text-muted-foreground">
          The requested health station or unit does not exist in the municipal registry.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/superadmin/rhu-management")}>
          Return to Registry
        </Button>
      </div>
    )
  }

  const isRhu = data.type === "RHU"

  return (
    <section className="w-full space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isRhu ? "/superadmin/rhu-management" : "/superadmin/bhs-management")}
            className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to {isRhu ? "RHUs" : "BHSs"}
          </Button>
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => navigate(isRhu ? "/superadmin/rhu-management" : "/superadmin/bhs-management")}
                >
                  {isRhu ? "Rural Health Units" : "Barangay Health Stations"}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{data.facility_name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              loadData()
              toast.success("Facility hub refreshed")
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setEditDialogOpen(true)}>
            <Edit2 className="size-3.5" />
            Edit Facility
          </Button>
        </div>
      </div>

      <Card className="border-sidebar-border bg-card">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              {isRhu ? <Hospital className="size-7" /> : <Building2 className="size-7" />}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">{data.facility_name}</h1>
                <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {data.type}
                </span>
                <StatusBadge status="Active" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{data.address || "Silang, Cavite"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Phone: <strong className="text-foreground">{data.contact_number || "—"}</strong></span>
                <span>Email: <strong className="text-foreground">{data.email || "—"}</strong></span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Assigned Personnel</CardTitle>
            <Users className="size-3.5 text-primary" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold">{data.users.length}</div>
            <p className="text-[10px] text-muted-foreground">Doctors, Midwives & Staff</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Enrolled Mothers</CardTitle>
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold">{data.motherEnrollments.length}</div>
            <p className="text-[10px] text-muted-foreground">Active maternal care roster</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Referrals Coordinated</CardTitle>
            <ArrowRightLeft className="size-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold">
              {data.onlineReferralsFrom.length + data.onlineReferralsTo.length}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {data.onlineReferralsFrom.length} sent · {data.onlineReferralsTo.length} received
            </p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Service Slots</CardTitle>
            <CalendarDays className="size-3.5 text-indigo-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold">{data.schedules.length}</div>
            <p className="text-[10px] text-muted-foreground">Clinical schedule days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full space-y-3">
        <TabsList className="w-full justify-start border-b border-sidebar-border bg-transparent p-0 rounded-none h-9">
          <TabsTrigger
            value="staff"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4"
          >
            Staff & Personnel ({data.users.length})
          </TabsTrigger>
          <TabsTrigger
            value="mothers"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4"
          >
            Enrolled Mothers ({data.motherEnrollments.length})
          </TabsTrigger>
          <TabsTrigger
            value="referrals"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4"
          >
            Referrals ({data.onlineReferralsFrom.length + data.onlineReferralsTo.length})
          </TabsTrigger>
          <TabsTrigger
            value="schedules"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4"
          >
            Schedules & Appointments ({data.schedules.length})
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4"
          >
            Facility Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-3 pt-1">
          <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Healthcare Worker</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                      No staff members assigned to this facility.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.users.map((staff) => {
                    const initials = `${staff.first_name?.[0] || ""}${staff.last_name?.[0] || ""}`.toUpperCase()
                    return (
                      <TableRow key={staff.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8 rounded-full border border-border">
                              {staff.profile_url && <AvatarImage src={staff.profile_url} />}
                              <AvatarFallback className="text-[11px] font-medium">{initials || "ST"}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium">
                                {staff.first_name} {staff.middle_name ? `${staff.middle_name} ` : ""}{staff.last_name}
                              </span>
                              <span className="text-[11px] text-muted-foreground">{staff.email || "No email"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                            <Shield className="size-3 text-muted-foreground" />
                            {staff.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{staff.phone_number || "—"}</TableCell>
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
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStaff(staff)
                                  setTargetFacilityId("")
                                  setTransferDialogOpen(true)
                                }}
                              >
                                <ArrowRightLeft className="mr-2 size-3.5" />
                                Transfer to Another Facility
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={staff.is_active ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
                                onClick={() => handleToggleStaffStatus(staff)}
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
        </TabsContent>

        <TabsContent value="mothers" className="space-y-3 pt-1">
          <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family Serial No.</TableHead>
                  <TableHead>Mother Name</TableHead>
                  <TableHead>Birth Date</TableHead>
                  <TableHead>Blood Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Enrollment Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.motherEnrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-xs text-muted-foreground">
                      No mothers currently enrolled under this facility.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.motherEnrollments.map(({ enrollment_id, status, enrolled_at, mother }) => (
                    <TableRow key={enrollment_id}>
                      <TableCell className="font-mono text-xs font-medium text-foreground">
                        {mother.family_serial_no || "Unassigned"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {mother.user ? `${mother.user.first_name} ${mother.user.last_name}` : "Patient"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(mother.birth_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs">{mother.blood_type || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {mother.user?.phone_number || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(enrolled_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          {status || "Active"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4 pt-1">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground">Outgoing Referrals (Sent)</h3>
            <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Referred</TableHead>
                    <TableHead>Receiving Facility</TableHead>
                    <TableHead>Reason for Referral</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.onlineReferralsFrom.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-xs text-muted-foreground">
                        No outgoing referrals sent by this facility.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.onlineReferralsFrom.map((ref) => (
                      <TableRow key={ref.referral_id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(ref.date_referred).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {ref.toFacility?.facility_name || ref.external_facility_name || "External Apex Hospital"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ref.reason}</TableCell>
                        <TableCell>
                          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium uppercase">
                            {ref.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground">Incoming Referrals (Received)</h3>
            <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Referred</TableHead>
                    <TableHead>Originating Facility</TableHead>
                    <TableHead>Reason for Referral</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.onlineReferralsTo.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-xs text-muted-foreground">
                        No incoming referrals received by this facility.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.onlineReferralsTo.map((ref) => (
                      <TableRow key={ref.referral_id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(ref.date_referred).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {ref.fromFacility?.facility_name || "Community Health Station"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ref.reason}</TableCell>
                        <TableCell>
                          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium uppercase">
                            {ref.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-3 pt-1">
          <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Available Date</TableHead>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>Booked Slots / Capacity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-xs text-muted-foreground">
                      No schedule slots configured for this facility.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.schedules.map((slot) => (
                    <TableRow key={slot.schedule_id}>
                      <TableCell className="text-xs font-medium">
                        {new Date(slot.available_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {slot.available_time_slot || "Regular Clinical Hours (8:00 AM - 5:00 PM)"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {slot.booked_slots} / {slot.max_slots}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                            slot.is_available
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {slot.is_available ? "Available" : "Full / Closed"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 pt-1">
          <Card className="border-sidebar-border bg-card">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold">Facility Metadata & Contacts</CardTitle>
              <CardDescription className="text-xs">
                Update the official address, contact details, and institutional tier.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Facility Name</Label>
                  <Input
                    value={editForm.facility_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, facility_name: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Facility Classification</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, type: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RHU">Rural Health Unit (RHU)</SelectItem>
                      <SelectItem value="BHS">Barangay Health Station (BHS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Municipality / Full Address</Label>
                <Input
                  value={editForm.address}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Contact Number</Label>
                  <Input
                    value={editForm.contact_number}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, contact_number: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Institutional Email</Label>
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button size="sm" onClick={handleSaveFacility} disabled={savingFacility} className="h-8 text-xs">
                  {savingFacility ? "Saving Changes..." : "Save Facility Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit Facility Details</DialogTitle>
            <DialogDescription className="text-xs">
              Update institutional metadata for {data.facility_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Facility Name</Label>
              <Input
                value={editForm.facility_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, facility_name: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={editForm.type}
                onValueChange={(val) => setEditForm((prev) => ({ ...prev, type: val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RHU">Rural Health Unit (RHU)</SelectItem>
                  <SelectItem value="BHS">Barangay Health Station (BHS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Number</Label>
              <Input
                value={editForm.contact_number}
                onChange={(e) => setEditForm((prev) => ({ ...prev, contact_number: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveFacility} disabled={savingFacility}>
              {savingFacility ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Change Staff Role</DialogTitle>
            <DialogDescription className="text-xs">
              Update role for {selectedStaff?.first_name} {selectedStaff?.last_name}.
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

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Transfer Staff to Another Facility</DialogTitle>
            <DialogDescription className="text-xs">
              Reassign {selectedStaff?.first_name} {selectedStaff?.last_name} from {data.facility_name} to another clinic.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Destination Facility</Label>
              <Select value={targetFacilityId} onValueChange={setTargetFacilityId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select destination clinic" />
                </SelectTrigger>
                <SelectContent>
                  {allFacilities
                    .filter((f) => f.facility_id !== facilityId)
                    .map((f) => (
                      <SelectItem key={f.facility_id} value={f.facility_id}>
                        {f.facility_name} ({f.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTransferStaff}
              disabled={submittingTransfer || !targetFacilityId}
            >
              {submittingTransfer ? "Reassigning..." : "Confirm Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
