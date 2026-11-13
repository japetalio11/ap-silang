import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit2,
  ExternalLink,
  FileText,
  KeyRound,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
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
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthSession } from "@/features/auth/auth-session"
import {
  adminResetStaffPassword,
  fetchAllFacilities,
  fetchFacilityHubDetails,
  reassignMotherFacility,
  reassignStaffFacility,
  updateFacilityRecord,
  updateStaffActiveStatus,
  updateStaffRole,
  type FacilityHubDetails,
  type FacilityHubMother,
  type FacilityHubReferral,
  type FacilityItem,
  type StaffItem,
} from "../api/superadmin-api"

export function SuperAdminFacilityDetailPage() {
  const { facilityId } = useParams<{ facilityId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuthSession()

  const [data, setData] = useState<FacilityHubDetails | null>(null)
  const [allFacilities, setAllFacilities] = useState<FacilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("staff")

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    facility_name: "",
    type: "RHU",
    address: "",
    contact_number: "",
    email: "",
  })
  const [savingFacility, setSavingFacility] = useState(false)

  const [staffQuery, setStaffQuery] = useState("")
  const [staffRoleFilter, setStaffRoleFilter] = useState("all")
  const [staffStatusFilter, setStaffStatusFilter] = useState("all")
  const [staffPage, setStaffPage] = useState(1)
  const [staffPageSize, setStaffPageSize] = useState(10)

  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null)
  const [newRole, setNewRole] = useState("")
  const [submittingRole, setSubmittingRole] = useState(false)

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [submittingPassword, setSubmittingPassword] = useState(false)

  const [transferStaffDialogOpen, setTransferStaffDialogOpen] = useState(false)
  const [targetStaffFacilityId, setTargetStaffFacilityId] = useState("")
  const [submittingStaffTransfer, setSubmittingStaffTransfer] = useState(false)

  const [motherQuery, setMotherQuery] = useState("")
  const [motherStatusFilter, setMotherStatusFilter] = useState("all")
  const [motherPage, setMotherPage] = useState(1)
  const [motherPageSize, setMotherPageSize] = useState(10)

  const [transferMotherDialogOpen, setTransferMotherDialogOpen] = useState(false)
  const [selectedMother, setSelectedMother] = useState<FacilityHubMother | null>(null)
  const [targetMotherFacilityId, setTargetMotherFacilityId] = useState("")
  const [motherTransferNotes, setMotherTransferNotes] = useState("")
  const [submittingMotherTransfer, setSubmittingMotherTransfer] = useState(false)

  const [referralDirectionTab, setReferralDirectionTab] = useState("all")
  const [referralQuery, setReferralQuery] = useState("")
  const [referralStatusFilter, setReferralStatusFilter] = useState("all")
  const [referralPage, setReferralPage] = useState(1)
  const [referralPageSize, setReferralPageSize] = useState(10)

  const [referralDetailOpen, setReferralDetailOpen] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState<(FacilityHubReferral & { direction: "outgoing" | "incoming" }) | null>(null)

  const [schedulePage, setSchedulePage] = useState(1)
  const [schedulePageSize, setSchedulePageSize] = useState(10)

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

  useEffect(() => {
    setStaffPage(1)
  }, [staffQuery, staffRoleFilter, staffStatusFilter])

  useEffect(() => {
    setMotherPage(1)
  }, [motherQuery, motherStatusFilter])

  useEffect(() => {
    setReferralPage(1)
  }, [referralDirectionTab, referralQuery, referralStatusFilter])

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
    if (!session?.token || !selectedStaff || !facilityId || !targetStaffFacilityId) return
    setSubmittingStaffTransfer(true)
    try {
      await reassignStaffFacility(session.token, facilityId, {
        user_id: selectedStaff.user_id,
        target_facility_id: targetStaffFacilityId,
      })
      toast.success("Staff member reassigned", {
        description: `${selectedStaff.first_name} ${selectedStaff.last_name} transferred successfully.`,
      })
      setTransferStaffDialogOpen(false)
      loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Staff reassignment failed"
      toast.error("Reassign error", { description: message })
    } finally {
      setSubmittingStaffTransfer(false)
    }
  }

  const handleTransferMother = async () => {
    if (!session?.token || !selectedMother || !facilityId || !targetMotherFacilityId) return
    setSubmittingMotherTransfer(true)
    try {
      await reassignMotherFacility(session.token, facilityId, {
        mother_id: selectedMother.mother.mother_id,
        target_facility_id: targetMotherFacilityId,
        notes: motherTransferNotes.trim(),
      })
      const motherName = selectedMother.mother.user
        ? `${selectedMother.mother.user.first_name} ${selectedMother.mother.user.last_name}`
        : "Patient"
      toast.success("Mother transferred successfully", {
        description: `${motherName} has been transferred to the destination facility.`,
      })
      setTransferMotherDialogOpen(false)
      setMotherTransferNotes("")
      loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mother reassignment failed"
      toast.error("Transfer failed", { description: message })
    } finally {
      setSubmittingMotherTransfer(false)
    }
  }

  const filteredStaff = useMemo(() => {
    if (!data?.users) return []
    const term = staffQuery.trim().toLowerCase()
    return data.users.filter((s) => {
      if (staffRoleFilter !== "all" && s.role !== staffRoleFilter) return false
      if (staffStatusFilter !== "all" && String(s.is_active) !== staffStatusFilter) return false
      if (!term) return true
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
      const email = (s.email || "").toLowerCase()
      const phone = (s.phone_number || "").toLowerCase()
      return fullName.includes(term) || email.includes(term) || phone.includes(term)
    })
  }, [data?.users, staffQuery, staffRoleFilter, staffStatusFilter])

  const paginatedStaff = useMemo(() => {
    const start = (staffPage - 1) * staffPageSize
    return filteredStaff.slice(start, start + staffPageSize)
  }, [filteredStaff, staffPage, staffPageSize])

  const filteredMothers = useMemo(() => {
    if (!data?.motherEnrollments) return []
    const term = motherQuery.trim().toLowerCase()
    return data.motherEnrollments.filter((item) => {
      if (motherStatusFilter !== "all" && (item.status || "Active").toLowerCase() !== motherStatusFilter.toLowerCase()) {
        return false
      }
      if (!term) return true
      const user = item.mother?.user
      const name = `${user?.first_name || ""} ${user?.last_name || ""}`.toLowerCase()
      const serial = (item.mother?.family_serial_no || "").toLowerCase()
      const phone = (user?.phone_number || "").toLowerCase()
      const blood = (item.mother?.blood_type || "").toLowerCase()
      return name.includes(term) || serial.includes(term) || phone.includes(term) || blood.includes(term)
    })
  }, [data?.motherEnrollments, motherQuery, motherStatusFilter])

  const paginatedMothers = useMemo(() => {
    const start = (motherPage - 1) * motherPageSize
    return filteredMothers.slice(start, start + motherPageSize)
  }, [filteredMothers, motherPage, motherPageSize])

  const allReferrals = useMemo(() => {
    if (!data) return []
    const outList = data.onlineReferralsFrom.map((r) => ({ ...r, direction: "outgoing" as const }))
    const inList = data.onlineReferralsTo.map((r) => ({ ...r, direction: "incoming" as const }))
    return [...outList, ...inList].sort(
      (a, b) => new Date(b.date_referred).getTime() - new Date(a.date_referred).getTime()
    )
  }, [data])

  const filteredReferrals = useMemo(() => {
    const term = referralQuery.trim().toLowerCase()
    return allReferrals.filter((ref) => {
      if (referralDirectionTab === "outgoing" && ref.direction !== "outgoing") return false
      if (referralDirectionTab === "incoming" && ref.direction !== "incoming") return false
      if (referralStatusFilter !== "all" && ref.status.toLowerCase() !== referralStatusFilter.toLowerCase()) {
        return false
      }
      if (!term) return true
      const partner = ref.direction === "outgoing"
        ? (ref.toFacility?.facility_name || ref.external_facility_name || "")
        : (ref.fromFacility?.facility_name || "")
      const reason = ref.reason || ""
      const patient = ref.pregnancy?.mother?.user
        ? `${ref.pregnancy.mother.user.first_name} ${ref.pregnancy.mother.user.last_name}`
        : ""
      const serial = ref.pregnancy?.mother?.family_serial_no || ""
      return (
        partner.toLowerCase().includes(term) ||
        reason.toLowerCase().includes(term) ||
        patient.toLowerCase().includes(term) ||
        serial.toLowerCase().includes(term)
      )
    })
  }, [allReferrals, referralDirectionTab, referralQuery, referralStatusFilter])

  const paginatedReferrals = useMemo(() => {
    const start = (referralPage - 1) * referralPageSize
    return filteredReferrals.slice(start, start + referralPageSize)
  }, [filteredReferrals, referralPage, referralPageSize])

  const paginatedSchedules = useMemo(() => {
    if (!data?.schedules) return []
    const start = (schedulePage - 1) * schedulePageSize
    return data.schedules.slice(start, start + schedulePageSize)
  }, [data?.schedules, schedulePage, schedulePageSize])

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
  const totalReferrals = data.onlineReferralsFrom.length + data.onlineReferralsTo.length
  const navState = location.state as { returnTo?: string; returnLabel?: string } | null
  const backTarget = navState?.returnTo || (isRhu ? "/superadmin/rhu-management" : "/superadmin/bhs-management")
  const backLabel = navState?.returnLabel || (isRhu ? "Rural Health Units" : "Barangay Health Stations")

  return (
    <section className="w-full space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backTarget)}
            className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to {backLabel}
          </Button>
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => navigate(backTarget)}
                >
                  {backLabel}
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

      <div className="rounded-lg border border-sidebar-border bg-card p-3.5 shadow-xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-foreground">{data.facility_name}</h1>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                {data.type}
              </span>
              <StatusBadge status="Active" />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground" />
                {data.address || "Silang, Cavite"}
              </span>
              {data.contact_number && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3 text-muted-foreground" />
                  {data.contact_number}
                </span>
              )}
              {data.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3 text-muted-foreground" />
                  {data.email}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <div className="flex items-center gap-1.5 rounded-md border border-sidebar-border bg-muted/40 px-2.5 py-1 text-xs">
              <Users className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Staff:</span>
              <strong className="font-semibold text-foreground">{data.users.length}</strong>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-sidebar-border bg-muted/40 px-2.5 py-1 text-xs">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-muted-foreground">Mothers:</span>
              <strong className="font-semibold text-foreground">{data.motherEnrollments.length}</strong>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-sidebar-border bg-muted/40 px-2.5 py-1 text-xs">
              <ArrowRightLeft className="size-3.5 text-amber-500" />
              <span className="text-muted-foreground">Referrals:</span>
              <strong className="font-semibold text-foreground">{totalReferrals}</strong>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-sidebar-border bg-muted/40 px-2.5 py-1 text-xs">
              <CalendarDays className="size-3.5 text-indigo-500" />
              <span className="text-muted-foreground">Slots:</span>
              <strong className="font-semibold text-foreground">{data.schedules.length}</strong>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-3">
        <TabsList className="h-9 w-full justify-start gap-1 overflow-x-auto sm:w-max">
          <TabsTrigger value="staff" className="h-full flex-initial gap-1.5 px-3 text-xs font-medium">
            Staff & Personnel ({data.users.length})
          </TabsTrigger>
          <TabsTrigger value="mothers" className="h-full flex-initial gap-1.5 px-3 text-xs font-medium">
            Enrolled Mothers ({data.motherEnrollments.length})
          </TabsTrigger>
          <TabsTrigger value="referrals" className="h-full flex-initial gap-1.5 px-3 text-xs font-medium">
            Referrals ({totalReferrals})
          </TabsTrigger>
          <TabsTrigger value="schedules" className="h-full flex-initial gap-1.5 px-3 text-xs font-medium">
            Schedules & Capacity ({data.schedules.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-full flex-initial gap-1.5 px-3 text-xs font-medium">
            Facility Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={staffQuery}
                onChange={(e) => setStaffQuery(e.target.value)}
                placeholder="Search staff by name, email, phone..."
                className="h-8 w-full border-sidebar-border bg-muted/70 px-2 pl-8 text-xs dark:bg-muted/60"
              />
            </div>

            <Select value={staffRoleFilter} onValueChange={setStaffRoleFilter}>
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

            <Select value={staffStatusFilter} onValueChange={setStaffStatusFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {(staffQuery.trim().length > 0 || staffRoleFilter !== "all" || staffStatusFilter !== "all") && (
              <Button
                variant="ghost"
                className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"
                onClick={() => {
                  setStaffQuery("")
                  setStaffRoleFilter("all")
                  setStaffStatusFilter("all")
                }}
              >
                <RotateCcw className="size-3.5" />
                Reset Filter
              </Button>
            )}
          </div>

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
                {paginatedStaff.length === 0 ? (
                  <TableEmptyState
                    colSpan={5}
                    icon={Users}
                    title="No healthcare workers found"
                    description={
                      staffQuery.trim().length > 0
                        ? "No staff match your search or filter parameters."
                        : "No personnel currently assigned to this facility."
                    }
                  />
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
                            state: {
                              returnTo: `/superadmin/facility/${facilityId}`,
                              returnLabel: data.facility_name,
                            },
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
                                onClick={() =>
                                  navigate(`/superadmin/users/${staff.user_id}`, {
                                    state: {
                                      returnTo: `/superadmin/facility/${facilityId}`,
                                      returnLabel: data.facility_name,
                                    },
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
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStaff(staff)
                                  setTargetStaffFacilityId("")
                                  setTransferStaffDialogOpen(true)
                                }}
                              >
                                <ArrowRightLeft className="mr-2 size-3.5" />
                                Transfer Facility
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

          <TablePaginationFooter
            rowCount={filteredStaff.length}
            page={staffPage}
            pageSize={staffPageSize}
            onPageChange={setStaffPage}
            onPageSizeChange={setStaffPageSize}
          />
        </TabsContent>

        <TabsContent value="mothers" className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[280px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={motherQuery}
                onChange={(e) => setMotherQuery(e.target.value)}
                placeholder="Search by mother name, serial no, blood type..."
                className="h-8 w-full border-sidebar-border bg-muted/70 px-2 pl-8 text-xs dark:bg-muted/60"
              />
            </div>

            <Select value={motherStatusFilter} onValueChange={setMotherStatusFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>

            {(motherQuery.trim().length > 0 || motherStatusFilter !== "all") && (
              <Button
                variant="ghost"
                className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"
                onClick={() => {
                  setMotherQuery("")
                  setMotherStatusFilter("all")
                }}
              >
                <RotateCcw className="size-3.5" />
                Reset Filter
              </Button>
            )}
          </div>

          <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family Serial No.</TableHead>
                  <TableHead>Mother Name</TableHead>
                  <TableHead>Birth Date / Age</TableHead>
                  <TableHead>Blood Type</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Enrollment Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMothers.length === 0 ? (
                  <TableEmptyState
                    colSpan={8}
                    icon={CheckCircle2}
                    title="No maternal records found"
                    description={
                      motherQuery.trim().length > 0
                        ? "No mothers match your search or filter parameters."
                        : "No mothers currently enrolled under this facility."
                    }
                  />
                ) : (
                  paginatedMothers.map((enrollment) => {
                    const { enrollment_id, status, enrolled_at, mother } = enrollment
                    const motherName = mother.user
                      ? `${mother.user.first_name} ${mother.user.last_name}`
                      : "Patient"
                    const birth = new Date(mother.birth_date)
                    const age = Math.max(0, new Date().getFullYear() - birth.getFullYear())
                    const isTransferred = (status || "").toLowerCase() === "transferred"

                    return (
                      <TableRow
                        key={enrollment_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={(e) => {
                          const target = e.target as HTMLElement
                          if (target.closest("button") || target.closest("[role='menuitem']")) return
                          navigate(`/superadmin/mother/${mother.mother_id}`, {
                            state: {
                              returnTo: `/superadmin/facility/${facilityId}`,
                              returnLabel: data.facility_name,
                            },
                          })
                        }}
                      >
                        <TableCell className="font-mono text-xs font-medium text-foreground">
                          {mother.family_serial_no || "Unassigned"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium hover:underline">{motherName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {birth.toLocaleDateString()} {age > 0 ? `(${age} yrs)` : ""}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{mother.blood_type || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {mother.user?.phone_number || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(enrolled_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                              isTransferred
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {status || "Active"}
                          </span>
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
                                  navigate(`/superadmin/mother/${mother.mother_id}`, {
                                    state: {
                                      returnTo: `/superadmin/facility/${facilityId}`,
                                      returnLabel: data.facility_name,
                                    },
                                  })
                                }
                              >
                                <ExternalLink className="mr-2 size-3.5" />
                                View Maternal Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMother(enrollment)
                                  setTargetMotherFacilityId("")
                                  setMotherTransferNotes("")
                                  setTransferMotherDialogOpen(true)
                                }}
                              >
                                <ArrowRightLeft className="mr-2 size-3.5" />
                                Transfer to Another Facility
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
            rowCount={filteredMothers.length}
            page={motherPage}
            pageSize={motherPageSize}
            onPageChange={setMotherPage}
            onPageSizeChange={setMotherPageSize}
          />
        </TabsContent>

        <TabsContent value="referrals" className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs value={referralDirectionTab} onValueChange={setReferralDirectionTab} className="w-max">
              <TabsList className="h-8">
                <TabsTrigger value="all" className="h-7 text-xs px-3">
                  All Referrals ({allReferrals.length})
                </TabsTrigger>
                <TabsTrigger value="outgoing" className="h-7 text-xs px-3">
                  Outgoing / Sent ({data.onlineReferralsFrom.length})
                </TabsTrigger>
                <TabsTrigger value="incoming" className="h-7 text-xs px-3">
                  Incoming / Received ({data.onlineReferralsTo.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-[240px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={referralQuery}
                  onChange={(e) => setReferralQuery(e.target.value)}
                  placeholder="Search by facility, reason, patient..."
                  className="h-8 w-full border-sidebar-border bg-muted/70 px-2 pl-8 text-xs dark:bg-muted/60"
                />
              </div>

              <Select value={referralStatusFilter} onValueChange={setReferralStatusFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in transit">In Transit</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>

              {(referralQuery.trim().length > 0 || referralStatusFilter !== "all" || referralDirectionTab !== "all") && (
                <Button
                  variant="ghost"
                  className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"
                  onClick={() => {
                    setReferralQuery("")
                    setReferralStatusFilter("all")
                    setReferralDirectionTab("all")
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead className="w-[90px]">Flow</TableHead>
                  <TableHead>Partner Facility</TableHead>
                  <TableHead>Patient / Serial</TableHead>
                  <TableHead className="max-w-[240px]">Clinical Reason</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[70px] text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReferrals.length === 0 ? (
                  <TableEmptyState
                    colSpan={7}
                    icon={ArrowRightLeft}
                    title="No referral records found"
                    description={
                      referralQuery.trim().length > 0
                        ? "No referrals match your search criteria."
                        : "No inter-clinic transfers recorded for this facility."
                    }
                  />
                ) : (
                  paginatedReferrals.map((ref) => {
                    const isOutgoing = ref.direction === "outgoing"
                    const partnerFacility = isOutgoing
                      ? ref.toFacility?.facility_name || ref.external_facility_name || "Apex Hospital / External Center"
                      : ref.fromFacility?.facility_name || "Originating Station"
                    const patient = ref.pregnancy?.mother?.user
                      ? `${ref.pregnancy.mother.user.first_name} ${ref.pregnancy.mother.user.last_name}`
                      : "Patient Record"
                    const serial = ref.pregnancy?.mother?.family_serial_no || ""

                    const compactReason = ref.reason
                      ? ref.reason
                          .replace(/^Reason for referral:\s*/i, "")
                          .split(/\r?\n/)[0]
                          .slice(0, 90)
                      : "Not specified"

                    return (
                      <TableRow
                        key={`${ref.direction}-${ref.referral_id}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedReferral(ref)
                          setReferralDetailOpen(true)
                        }}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(ref.date_referred).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                              isOutgoing
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {isOutgoing ? "Sent" : "Received"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate" title={partnerFacility}>
                          {partnerFacility}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{patient}</span>
                            {serial && <span className="font-mono text-[10px] text-muted-foreground">{serial}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                          <span className="truncate block" title={ref.reason}>
                            {compactReason}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium uppercase">
                            {ref.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedReferral(ref)
                              setReferralDetailOpen(true)
                            }}
                          >
                            <FileText className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <TablePaginationFooter
            rowCount={filteredReferrals.length}
            page={referralPage}
            pageSize={referralPageSize}
            onPageChange={setReferralPage}
            onPageSizeChange={setReferralPageSize}
          />
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
                {paginatedSchedules.length === 0 ? (
                  <TableEmptyState
                    colSpan={4}
                    icon={CalendarDays}
                    title="No service slots configured"
                    description="No clinical appointment schedules have been created for this facility."
                  />
                ) : (
                  paginatedSchedules.map((slot) => (
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

          {data.schedules.length > 0 && (
            <TablePaginationFooter
              rowCount={data.schedules.length}
              page={schedulePage}
              pageSize={schedulePageSize}
              onPageChange={setSchedulePage}
              onPageSizeChange={setSchedulePageSize}
            />
          )}
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

      <Dialog open={transferStaffDialogOpen} onOpenChange={setTransferStaffDialogOpen}>
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
              <Select value={targetStaffFacilityId} onValueChange={setTargetStaffFacilityId}>
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
            <Button variant="outline" size="sm" onClick={() => setTransferStaffDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTransferStaff}
              disabled={submittingStaffTransfer || !targetStaffFacilityId}
            >
              {submittingStaffTransfer ? "Reassigning..." : "Confirm Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferMotherDialogOpen} onOpenChange={setTransferMotherDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Transfer Mother to Another Facility</DialogTitle>
            <DialogDescription className="text-xs">
              Reassign {selectedMother?.mother.user ? `${selectedMother.mother.user.first_name} ${selectedMother.mother.user.last_name}` : "Patient"} from {data.facility_name} to another healthcare station in Silang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Destination Facility</Label>
              <Select value={targetMotherFacilityId} onValueChange={setTargetMotherFacilityId}>
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
            <div className="space-y-1">
              <Label className="text-xs">Administrative Transfer Reason / Notes (Optional)</Label>
              <Input
                placeholder="e.g. Relocated residence, specialised care referral, etc."
                value={motherTransferNotes}
                onChange={(e) => setMotherTransferNotes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setTransferMotherDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTransferMother}
              disabled={submittingMotherTransfer || !targetMotherFacilityId}
            >
              {submittingMotherTransfer ? "Transferring..." : "Confirm Mother Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={referralDetailOpen} onOpenChange={setReferralDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Inter-Clinic Referral Handover</DialogTitle>
            <DialogDescription className="text-xs">
              Handover summary and clinical reason for referral #{selectedReferral?.referral_id?.slice(0, 8)}.
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-md border border-sidebar-border bg-muted/40 p-3">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Flow Direction</span>
                  <span className="font-medium capitalize">{selectedReferral.direction === "outgoing" ? "Outgoing (Sent)" : "Incoming (Received)"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Date Referred</span>
                  <span className="font-medium">{new Date(selectedReferral.date_referred).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Partner Facility</span>
                  <span className="font-medium">
                    {selectedReferral.direction === "outgoing"
                      ? selectedReferral.toFacility?.facility_name || selectedReferral.external_facility_name || "Apex Hospital"
                      : selectedReferral.fromFacility?.facility_name || "Originating Station"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Referral Status</span>
                  <span className="font-medium uppercase">{selectedReferral.status}</span>
                </div>
              </div>

              {selectedReferral.pregnancy?.mother?.user && (
                <div className="flex items-center justify-between rounded-md border border-sidebar-border p-3">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Patient Information</span>
                    <p className="font-medium text-foreground">
                      {selectedReferral.pregnancy.mother.user.first_name} {selectedReferral.pregnancy.mother.user.last_name}
                    </p>
                    {selectedReferral.pregnancy.mother.family_serial_no && (
                      <p className="font-mono text-[11px] text-muted-foreground">
                        Family Serial: {selectedReferral.pregnancy.mother.family_serial_no}
                      </p>
                    )}
                  </div>
                  {selectedReferral.pregnancy?.mother?.mother_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setReferralDetailOpen(false)
                        navigate(`/superadmin/mother/${selectedReferral.pregnancy!.mother!.mother_id}`, {
                          state: {
                            returnTo: `/superadmin/facility/${facilityId}`,
                            returnLabel: data.facility_name,
                          },
                        })
                      }}
                    >
                      <ExternalLink className="mr-1 size-3" />
                      View Profile
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Clinical Referral Narrative</Label>
                <div className="rounded-md border border-sidebar-border bg-card p-3 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {selectedReferral.reason || "No clinical narrative recorded."}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button size="sm" onClick={() => setReferralDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
