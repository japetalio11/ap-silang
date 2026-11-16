import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import {
  AlertTriangle,
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
  PowerOff,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
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
import { CachedDataBanner } from "@/components/ui/cached-data-banner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthSession } from "@/features/auth/auth-session"
import { db } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"
import { createStaff } from "@/features/team/api"
import {
  adminResetStaffPassword,
  fetchAllFacilities,
  fetchFacilityHubDetails,
  reassignMotherFacility,
  reassignStaffFacility,
  updateFacilityRecord,
  toggleFacilityStatus,
  updateStaffActiveStatus,
  updateStaffRole,
  type FacilityHubDetails,
  type FacilityHubMother,
  type FacilityHubReferral,
  type FacilityItem,
  type StaffItem,
} from "../api/superadmin-api"
import { FacilitySearchSelect } from "./FacilitySearchSelect"

function normalizeFacilityType(rawType?: string): "RHU" | "BHS" {
  if (!rawType) return "RHU"
  const lower = rawType.toLowerCase()
  if (lower.includes("bhs") || lower.includes("barangay") || lower.includes("station")) {
    return "BHS"
  }
  return "RHU"
}

export function SuperAdminFacilityDetailPage() {
  const { facilityId } = useParams<{ facilityId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuthSession()

  const [data, setData] = useState<FacilityHubDetails | null>(null)
  const [allFacilities, setAllFacilities] = useState<FacilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("staff")

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusAction, setStatusAction] = useState<"deactivate" | "reactivate">("deactivate")
  const [submittingStatus, setSubmittingStatus] = useState(false)

  const [addStaffOpen, setAddStaffOpen] = useState(false)
  const [addStaffSubmitting, setAddStaffSubmitting] = useState(false)
  const [addStaffForm, setAddStaffForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    role: "Admin",
    email: "",
    phone_number: "",
    password: "",
    address: "",
  })

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
  const [confirmStaffTransferOpen, setConfirmStaffTransferOpen] = useState(false)
  const [targetStaffFacilityId, setTargetStaffFacilityId] = useState("")
  const [submittingStaffTransfer, setSubmittingStaffTransfer] = useState(false)

  const [motherQuery, setMotherQuery] = useState("")
  const [motherStatusFilter, setMotherStatusFilter] = useState("all")
  const [motherPage, setMotherPage] = useState(1)
  const [motherPageSize, setMotherPageSize] = useState(10)

  const [transferMotherDialogOpen, setTransferMotherDialogOpen] = useState(false)
  const [confirmMotherTransferOpen, setConfirmMotherTransferOpen] = useState(false)
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
    const effectiveFacilityId = await silangSyncEngine.resolveId(facilityId)
    if (effectiveFacilityId !== facilityId) {
      navigate(`/superadmin/facility/${effectiveFacilityId}`, { replace: true, state: location.state })
      return
    }
    setLoading(true)
    try {
      const [hub, facs] = await Promise.all([
        fetchFacilityHubDetails(session.token, effectiveFacilityId),
        fetchAllFacilities(session.token).catch(() => []),
      ])
      setData(hub)
      setAllFacilities(facs)
      setEditForm({
        facility_name: hub.facility_name,
        type: normalizeFacilityType(hub.type),
        address: hub.address,
        contact_number: hub.contact_number,
        email: hub.email,
      })
    } catch (error) {
      const fallbackHub = await fetchFacilityHubDetails(session.token, effectiveFacilityId).catch(() => null)
      if (fallbackHub) {
        setData(fallbackHub)
        setEditForm({
          facility_name: fallbackHub.facility_name,
          type: normalizeFacilityType(fallbackHub.type),
          address: fallbackHub.address,
          contact_number: fallbackHub.contact_number,
          email: fallbackHub.email,
        })
      } else {
        const message = error instanceof Error ? error.message : "Failed to load facility info"
        toast.error("Error loading facility hub", { description: message })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const handleStaffUpdated = () => {
      void loadData()
    }
    window.addEventListener("silang:staff-updated", handleStaffUpdated)
    const unsubscribe = silangSyncEngine.subscribe((status) => {
      if (status.status === "idle" && status.pendingCount === 0) {
        void loadData()
      }
    })
    return () => {
      window.removeEventListener("silang:staff-updated", handleStaffUpdated)
      unsubscribe()
    }
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

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine
    if (isOffline) {
      const updatedFields = {
        facility_id: facilityId,
        facility_name: editForm.facility_name.trim(),
        type: editForm.type.trim(),
        address: editForm.address.trim(),
        contact_number: editForm.contact_number.trim(),
        email: editForm.email.trim(),
      }
      const existing = await db.facilities.get(facilityId).catch(() => undefined)
      if (existing) {
        await db.facilities.put({
          ...existing,
          ...updatedFields,
          sync_status: "pending_update",
          updated_at: Date.now(),
        }).catch(() => {})
      }
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "facility",
        action: "UPDATE",
        endpoint: "/facility/update",
        method: "PUT",
        payload: updatedFields,
      })
      setData((prev) => (prev ? { ...prev, ...updatedFields } : prev))
      toast.success("Facility info updated offline", {
        description: "Changes saved to device memory and will sync when online.",
      })
      setEditDialogOpen(false)
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

  const handleToggleFacilityStatus = async () => {
    if (!session?.token || !facilityId || !data) return
    setSubmittingStatus(true)
    const newStatus = statusAction === "reactivate"
    try {
      await toggleFacilityStatus(session.token, facilityId, newStatus)
      setData((prev) => (prev ? { ...prev, is_active: newStatus } : prev))
      toast.success(`Facility ${newStatus ? "reactivated" : "deactivated"} successfully`, {
        description: newStatus
          ? "Staff accounts can now log in and manage services for this facility."
          : "Staff access blocked and active mother enrollments unassigned.",
      })
      setStatusDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change facility status"
      toast.error("Operation failed", { description: message })
    } finally {
      setSubmittingStatus(false)
    }
  }

  const handleAddStaff = async () => {
    if (!session?.token || !facilityId) return
    if (!addStaffForm.first_name.trim() || !addStaffForm.last_name.trim() || !addStaffForm.email.trim() || !addStaffForm.password.trim()) {
      toast.error("Validation error", { description: "First name, last name, email, and password are required." })
      return
    }
    if (addStaffForm.password.length < 6) {
      toast.error("Validation error", { description: "Password must be at least 6 characters." })
      return
    }
    setAddStaffSubmitting(true)
    try {
      const res = await createStaff(session.token, {
        first_name: addStaffForm.first_name.trim(),
        middle_name: addStaffForm.middle_name.trim() || undefined,
        last_name: addStaffForm.last_name.trim(),
        role: addStaffForm.role,
        email: addStaffForm.email.trim().toLowerCase(),
        phone_number: addStaffForm.phone_number.trim() || undefined,
        password: addStaffForm.password,
        address: addStaffForm.address.trim() || undefined,
        facility_id: facilityId,
      })
      const newStaffItem: StaffItem = {
        user_id: res.user?.user_id || `temp-staff-${crypto.randomUUID()}`,
        facility_id: facilityId,
        first_name: addStaffForm.first_name.trim(),
        middle_name: addStaffForm.middle_name.trim() || undefined,
        last_name: addStaffForm.last_name.trim(),
        role: addStaffForm.role,
        email: addStaffForm.email.trim().toLowerCase(),
        phone_number: addStaffForm.phone_number.trim() || undefined,
        address: addStaffForm.address.trim() || undefined,
        is_active: true,
        facility: {
          facility_id: facilityId,
          facility_name: data?.facility_name ?? "",
          type: data?.type ?? "RHU",
        },
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              users: [newStaffItem, ...prev.users.filter((u) => u.user_id !== newStaffItem.user_id)],
              _count: {
                ...prev._count,
                users: prev.users.some((u) => u.user_id === newStaffItem.user_id)
                  ? prev._count.users
                  : prev._count.users + 1,
              },
            }
          : prev
      )
      toast.success(res.offline ? "Staff created offline" : "Staff member created", {
        description: `${addStaffForm.first_name} ${addStaffForm.last_name} (${addStaffForm.role}) can now access this facility.`,
      })
      setAddStaffOpen(false)
      setAddStaffForm({
        first_name: "",
        middle_name: "",
        last_name: "",
        role: "Admin",
        email: "",
        phone_number: "",
        password: "",
        address: "",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create staff member"
      toast.error("Creation failed", { description: message })
    } finally {
      setAddStaffSubmitting(false)
    }
  }

  const handleRoleChange = async () => {
    if (!session?.token || !selectedStaff || !newRole) return
    setSubmittingRole(true)
    try {
      await updateStaffRole(session.token, selectedStaff.user_id, newRole)
      setData((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.map((u) =>
                u.user_id === selectedStaff.user_id ? { ...u, role: newRole } : u
              ),
            }
          : prev
      )
      toast.success("Staff role updated", {
        description: `${selectedStaff.first_name} ${selectedStaff.last_name} is now ${newRole}`,
      })
      setRoleDialogOpen(false)
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
      setData((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.map((u) =>
                u.user_id === staff.user_id ? { ...u, is_active: nextState } : u
              ),
            }
          : prev
      )
      toast.success(nextState ? "Staff activated" : "Staff suspended", {
        description: `${staff.first_name} ${staff.last_name} account updated.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update account status"
      toast.error("Status error", { description: message })
    }
  }

  const handleResetPassword = async () => {
    if (!session?.token || !selectedStaff) return
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Password reset unavailable offline", {
        description: "Password reset requires an active server connection to ensure credential security.",
      })
      return
    }
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

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine
    if (isOffline) {
      const existingStaff = await db.staff.get(selectedStaff.user_id).catch(() => undefined)
      if (existingStaff) {
        await db.staff.update(selectedStaff.user_id, {
          facility_id: targetStaffFacilityId,
          sync_status: "pending_update",
          updated_at: Date.now(),
        }).catch(() => {})
      }
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "facility",
        action: "REASSIGN_STAFF",
        endpoint: `/facility/${encodeURIComponent(facilityId)}/reassign-staff`,
        method: "PUT",
        payload: {
          user_id: selectedStaff.user_id,
          target_facility_id: targetStaffFacilityId,
        },
      })
      setData((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.filter((u) => u.user_id !== selectedStaff.user_id),
              _count: {
                ...prev._count,
                users: Math.max(0, prev._count.users - 1),
              },
            }
          : prev
      )
      toast.success("Staff member reassigned offline", {
        description: `${selectedStaff.first_name} ${selectedStaff.last_name} transferred in device memory. Will sync when online.`,
      })
      setConfirmStaffTransferOpen(false)
      setTransferStaffDialogOpen(false)
      return
    }

    setSubmittingStaffTransfer(true)
    try {
      await reassignStaffFacility(session.token, facilityId, {
        user_id: selectedStaff.user_id,
        target_facility_id: targetStaffFacilityId,
      })
      toast.success("Staff member reassigned", {
        description: `${selectedStaff.first_name} ${selectedStaff.last_name} transferred successfully.`,
      })
      setConfirmStaffTransferOpen(false)
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

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine
    if (isOffline) {
      const motherId = selectedMother.mother.mother_id
      const existingMother = await db.mothers.get(motherId).catch(() => undefined)
      if (existingMother) {
        await db.mothers.update(motherId, {
          facility_id: targetMotherFacilityId,
          sync_status: "pending_update",
          updated_at: Date.now(),
        }).catch(() => {})
      }
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "facility",
        action: "REASSIGN_MOTHER",
        endpoint: `/facility/${encodeURIComponent(facilityId)}/reassign-mother`,
        method: "PUT",
        payload: {
          mother_id: motherId,
          target_facility_id: targetMotherFacilityId,
          notes: motherTransferNotes.trim(),
        },
      })
      const motherName = selectedMother.mother.user
        ? `${selectedMother.mother.user.first_name} ${selectedMother.mother.user.last_name}`
        : "Patient"
      setData((prev) =>
        prev
          ? {
              ...prev,
              motherEnrollments: prev.motherEnrollments.filter(
                (m) => m.mother.mother_id !== motherId
              ),
              _count: {
                ...prev._count,
                motherEnrollments: Math.max(0, prev._count.motherEnrollments - 1),
              },
            }
          : prev
      )
      toast.success("Mother transferred offline", {
        description: `${motherName} transfer queued. Care handover will sync when online.`,
      })
      setConfirmMotherTransferOpen(false)
      setTransferMotherDialogOpen(false)
      setMotherTransferNotes("")
      return
    }

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
      setConfirmMotherTransferOpen(false)
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
      <CachedDataBanner />
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
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              setEditForm({
                facility_name: data.facility_name,
                type: normalizeFacilityType(data.type),
                address: data.address,
                contact_number: data.contact_number,
                email: data.email,
              })
              setEditDialogOpen(true)
            }}
          >
            <Edit2 className="size-3.5" />
            Edit Facility
          </Button>
          {data.is_active === false ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
              onClick={() => {
                setStatusAction("reactivate")
                setStatusDialogOpen(true)
              }}
            >
              <ShieldCheck className="size-3.5" />
              Reactivate Facility
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => {
                setStatusAction("deactivate")
                setStatusDialogOpen(true)
              }}
            >
              <PowerOff className="size-3.5" />
              Deactivate Facility
            </Button>
          )}
        </div>
      </div>

      {data.is_active === false && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-300">
          <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Facility Deactivated</p>
            <p className="mt-0.5 text-xs opacity-90">
              Staff members of this facility are blocked from logging in, and all enrolled mothers have been unassigned. Clinical records remain safely preserved.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 border-emerald-500/30 bg-background text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
            onClick={() => {
              setStatusAction("reactivate")
              setStatusDialogOpen(true)
            }}
          >
            <ShieldCheck className="mr-1.5 size-3.5" />
            Reactivate
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-sidebar-border bg-card p-3.5 shadow-xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-foreground">{data.facility_name}</h1>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                {data.type}
              </span>
              <StatusBadge
                status={data.is_active === false ? "inactive" : "active"}
                text={data.is_active === false ? "Deactivated" : "Active"}
              />
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

          <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap sm:items-center sm:pt-0">
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

            <div className="ml-auto">
              <Button
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setAddStaffOpen(true)}
              >
                <UserPlus className="size-3.5" />
                Add Staff
              </Button>
            </div>
          </div>

          <div className="hidden w-full overflow-hidden rounded-lg border border-sidebar-border bg-card md:block">
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
                        : `No personnel currently assigned to ${data.facility_name}. Add a staff member to enable login access.`
                    }
                    action={
                      <Button size="sm" onClick={() => setAddStaffOpen(true)}>
                        <UserPlus className="mr-1.5 size-3.5" />
                        Add Staff
                      </Button>
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

          <div className="space-y-2 md:hidden">
            {paginatedStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-sidebar-border bg-card p-6 text-center text-xs text-muted-foreground">
                <Users className="mb-2 size-8 text-muted-foreground/50" />
                <p className="font-medium text-foreground">No healthcare workers found</p>
                <p className="mt-1">
                  {staffQuery.trim().length > 0
                    ? "No staff match your search or filter parameters."
                    : `No personnel currently assigned to ${data.facility_name}. Add a staff member to enable login access.`}
                </p>
                <Button size="sm" className="mt-3 text-xs" onClick={() => setAddStaffOpen(true)}>
                  <UserPlus className="mr-1.5 size-3.5" />
                  Add Staff
                </Button>
              </div>
            ) : (
              paginatedStaff.map((staff) => {
                const initials = `${staff.first_name?.[0] || ""}${staff.last_name?.[0] || ""}`.toUpperCase()
                return (
                  <article
                    key={staff.user_id}
                    className="rounded-lg border border-sidebar-border bg-card p-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-9 rounded-full border border-border shrink-0">
                          {staff.profile_url && <AvatarImage src={staff.profile_url} />}
                          <AvatarFallback className="text-xs font-medium">{initials || "ST"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            to={`/superadmin/users/${staff.user_id}`}
                            state={{
                              returnTo: `/superadmin/facility/${facilityId}`,
                              returnLabel: data.facility_name,
                            }}
                            className="truncate text-xs font-semibold text-foreground hover:underline block"
                          >
                            {staff.first_name} {staff.middle_name ? `${staff.middle_name} ` : ""}{staff.last_name}
                          </Link>
                          <p className="truncate text-[11px] text-muted-foreground">{staff.email || "No email"}</p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 shrink-0">
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
                            className={
                              staff.is_active
                                ? "text-rose-600 focus:text-rose-700 dark:text-rose-400"
                                : "text-emerald-600 focus:text-emerald-700 dark:text-emerald-400"
                            }
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
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-sidebar-border pt-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-medium">
                        <Shield className="size-3 text-muted-foreground" />
                        {staff.role}
                      </span>
                      <span className="text-muted-foreground">{staff.phone_number || "No contact"}</span>
                      <StatusBadge status={staff.is_active ? "active" : "inactive"} />
                    </div>
                  </article>
                )
              })
            )}
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

          <div className="hidden w-full overflow-hidden rounded-lg border border-sidebar-border bg-card md:block">
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

          <div className="space-y-2 md:hidden">
            {paginatedMothers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-sidebar-border bg-card p-6 text-center text-xs text-muted-foreground">
                <Users className="mb-2 size-8 text-muted-foreground/50" />
                <p className="font-medium text-foreground">No maternal profiles found</p>
                <p className="mt-1">
                  {motherQuery.trim().length > 0
                    ? "No mothers match your search criteria."
                    : "No pregnant mothers enrolled under this healthcare facility."}
                </p>
              </div>
            ) : (
              paginatedMothers.map((enrollment) => {
                const mother = enrollment.mother
                if (!mother) return null

                const enrolled_at = enrollment.enrolled_at || enrollment.created_at || new Date().toISOString()
                const status = enrollment.status
                const isTransferred = status?.toLowerCase() === "transferred"
                const birth = mother.date_of_birth ? new Date(mother.date_of_birth) : new Date()
                const age =
                  mother.date_of_birth && !isNaN(birth.getTime())
                    ? Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                    : 0
                const name =
                  mother.full_name ||
                  (mother.user ? `${mother.user.first_name} ${mother.user.last_name}` : "Unknown")

                return (
                  <article
                    key={enrollment.enrollment_id}
                    className="rounded-lg border border-sidebar-border bg-card p-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/superadmin/mother/${mother.mother_id}`}
                            state={{
                              returnTo: `/superadmin/facility/${facilityId}`,
                              returnLabel: data.facility_name,
                            }}
                            className="truncate text-xs font-semibold text-primary hover:underline"
                          >
                            {name}
                          </Link>
                          {mother.blood_type && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                              {mother.blood_type}
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {mother.family_serial_no || "—"}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 shrink-0">
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
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-sidebar-border pt-2 text-[11px] text-muted-foreground">
                      <span>{birth.toLocaleDateString()} {age > 0 ? `(${age} yrs)` : ""}</span>
                      <span>{mother.user?.phone_number || "No phone"}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          isTransferred
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {status || "Active"}
                      </span>
                    </div>
                  </article>
                )
              })
            )}
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

          <div className="hidden w-full overflow-hidden rounded-lg border border-sidebar-border bg-card md:block">
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

          <div className="space-y-2 md:hidden">
            {paginatedReferrals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-sidebar-border bg-card p-6 text-center text-xs text-muted-foreground">
                <ArrowRightLeft className="mb-2 size-8 text-muted-foreground/50" />
                <p className="font-medium text-foreground">No referral records found</p>
                <p className="mt-1">
                  {referralQuery.trim().length > 0
                    ? "No referrals match your search criteria."
                    : "No inter-clinic transfers recorded for this facility."}
                </p>
              </div>
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
                  <article
                    key={`${ref.direction}-${ref.referral_id}`}
                    className="cursor-pointer rounded-lg border border-sidebar-border bg-card p-3 shadow-xs hover:bg-muted/30"
                    onClick={() => {
                      setSelectedReferral(ref)
                      setReferralDetailOpen(true)
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                              isOutgoing
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {isOutgoing ? "Sent" : "Received"}
                          </span>
                          <span className="truncate text-xs font-semibold text-foreground">
                            {partnerFacility}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-foreground">
                          {patient} {serial && <span className="font-mono text-[10px] text-muted-foreground">({serial})</span>}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedReferral(ref)
                          setReferralDetailOpen(true)
                        }}
                      >
                        <FileText className="size-3.5" />
                      </Button>
                    </div>

                    <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {compactReason}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-sidebar-border pt-2 text-[11px] text-muted-foreground">
                      <span>{new Date(ref.date_referred).toLocaleDateString()}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-foreground">
                        {ref.status}
                      </span>
                    </div>
                  </article>
                )
              })
            )}
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
          <div className="hidden w-full overflow-hidden rounded-lg border border-sidebar-border bg-card md:block">
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

          <div className="space-y-2 md:hidden">
            {paginatedSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-sidebar-border bg-card p-6 text-center text-xs text-muted-foreground">
                <CalendarDays className="mb-2 size-8 text-muted-foreground/50" />
                <p className="font-medium text-foreground">No service slots configured</p>
                <p className="mt-1">
                  No clinical appointment schedules have been created for this facility.
                </p>
              </div>
            ) : (
              paginatedSchedules.map((slot) => (
                <article
                  key={slot.schedule_id}
                  className="rounded-lg border border-sidebar-border bg-card p-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {new Date(slot.available_date).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {slot.available_time_slot || "Regular Clinical Hours (8:00 AM - 5:00 PM)"}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                        slot.is_available
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {slot.is_available ? "Available" : "Full / Closed"}
                    </span>
                  </div>
                  <div className="mt-2 border-t border-sidebar-border pt-1.5 text-[11px] text-muted-foreground font-mono">
                    Booked: {slot.booked_slots} / {slot.max_slots}
                  </div>
                </article>
              ))
            )}
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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
          <DialogFooter className="gap-2 sm:gap-3">
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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
          <DialogFooter className="gap-2 sm:gap-3">
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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
            {typeof navigator !== "undefined" && !navigator.onLine && (
              <div className="rounded-md border border-amber-300/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                Password resets require an active server connection to ensure credential security.
              </div>
            )}
          </div>
          <DialogFooter className="gap-3 sm:gap-3">
            <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResetPassword}
              disabled={submittingPassword || (typeof navigator !== "undefined" && !navigator.onLine)}
            >
              {submittingPassword ? "Resetting..." : "Confirm Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferStaffDialogOpen} onOpenChange={setTransferStaffDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Transfer Staff to Another Facility</DialogTitle>
            <DialogDescription className="text-xs">
              Reassign {selectedStaff?.first_name} {selectedStaff?.last_name} from {data.facility_name} to another clinic.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Destination Facility</Label>
              <FacilitySearchSelect
                facilities={allFacilities}
                value={targetStaffFacilityId}
                onValueChange={setTargetStaffFacilityId}
                currentFacilityId={facilityId}
                placeholder="Search clinic or health station..."
              />
            </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-3">
            <Button variant="outline" size="sm" onClick={() => setTransferStaffDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTransferStaffDialogOpen(false)
                setConfirmStaffTransferOpen(true)
              }}
              disabled={submittingStaffTransfer || !targetStaffFacilityId}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmStaffTransferOpen} onOpenChange={setConfirmStaffTransferOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
                <AlertTriangle className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Confirm Staff Facility Transfer
              </DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs text-muted-foreground">
              Are you sure you want to transfer <span className="font-semibold text-foreground">{selectedStaff?.first_name} {selectedStaff?.last_name}</span> ({selectedStaff?.role}) from <span className="font-semibold text-foreground">{data.facility_name}</span> to{" "}
              <span className="font-semibold text-foreground">
                {allFacilities.find((f) => f.facility_id === targetStaffFacilityId)?.facility_name || "the selected facility"}
              </span>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
            <p className="font-medium text-foreground">Effects of reassignment:</p>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
              <li>
                <strong className="text-foreground">Active Station Change:</strong> Staff member will be assigned to the new facility and detached from {data.facility_name}.
              </li>
              <li>
                <strong className="text-foreground">Access Scope:</strong> Logins, patient lists, and daily clinical duties will be scoped to the new facility.
              </li>
              <li>
                <strong className="text-foreground">Historical Preservation:</strong> All previous maternal records, checkups, and audit trails logged by this staff member at {data.facility_name} remain intact.
              </li>
            </ul>
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmStaffTransferOpen(false)
                setTransferStaffDialogOpen(true)
              }}
              disabled={submittingStaffTransfer}
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleTransferStaff}
              disabled={submittingStaffTransfer}
            >
              {submittingStaffTransfer ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferMotherDialogOpen} onOpenChange={setTransferMotherDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Transfer Mother to Another Facility</DialogTitle>
            <DialogDescription className="text-xs">
              Reassign {selectedMother?.mother.user ? `${selectedMother.mother.user.first_name} ${selectedMother.mother.user.last_name}` : "Patient"} from {data.facility_name} to another healthcare station in Silang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Destination Facility</Label>
              <FacilitySearchSelect
                facilities={allFacilities}
                value={targetMotherFacilityId}
                onValueChange={setTargetMotherFacilityId}
                currentFacilityId={facilityId}
                placeholder="Search clinic or health station..."
              />
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
          <DialogFooter className="gap-3 sm:gap-3">
            <Button variant="outline" size="sm" onClick={() => setTransferMotherDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTransferMotherDialogOpen(false)
                setConfirmMotherTransferOpen(true)
              }}
              disabled={submittingMotherTransfer || !targetMotherFacilityId}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmMotherTransferOpen} onOpenChange={setConfirmMotherTransferOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
                <AlertTriangle className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Confirm Patient Transfer
              </DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs text-muted-foreground">
              Are you sure you want to transfer <span className="font-semibold text-foreground">{selectedMother?.mother.user ? `${selectedMother.mother.user.first_name} ${selectedMother.mother.user.last_name}` : "Patient"}</span> from <span className="font-semibold text-foreground">{data.facility_name}</span> to{" "}
              <span className="font-semibold text-foreground">
                {allFacilities.find((f) => f.facility_id === targetMotherFacilityId)?.facility_name || "the selected facility"}
              </span>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
            <p className="font-medium text-foreground">Effects of maternal transfer:</p>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
              <li>
                <strong className="text-foreground">Primary Facility Change:</strong> Patient's primary health monitoring will be relocated to the destination facility.
              </li>
              <li>
                <strong className="text-foreground">Local Registry:</strong> Patient will be removed from this facility's active maternal roster.
              </li>
              <li>
                <strong className="text-foreground">Care Continuity:</strong> Prenatal logs, lab screening files, and clinical history will transfer over safely.
              </li>
              <li>
                <strong className="text-foreground">Audit Tracking:</strong> An administrative transfer record will be logged with your notes for municipal auditing.
              </li>
            </ul>
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmMotherTransferOpen(false)
                setTransferMotherDialogOpen(true)
              }}
              disabled={submittingMotherTransfer}
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleTransferMother}
              disabled={submittingMotherTransfer}
            >
              {submittingMotherTransfer ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={referralDetailOpen} onOpenChange={setReferralDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
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

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {statusAction === "deactivate" ? (
                <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-5" />
                </div>
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-5" />
                </div>
              )}
              <DialogTitle className="text-base font-semibold">
                {statusAction === "deactivate"
                  ? `Deactivate ${data.facility_name}?`
                  : `Reactivate ${data.facility_name}?`}
              </DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs leading-relaxed">
              {statusAction === "deactivate"
                ? "Deactivating this facility enforces institutional safeguards across the municipal health network:"
                : "Reactivating this facility will restore institutional access and allow staff members to log in and resume clinical care services."}
            </DialogDescription>
          </DialogHeader>

          {statusAction === "deactivate" && (
            <div className="space-y-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <PowerOff className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Staff Access Locked:</strong> All staff assigned to this facility ({data.users?.length ?? 0} staff) will immediately be prevented from logging in.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Maternal Care Unassigned:</strong> Any mothers currently assigned or enrolled ({data.motherEnrollments?.length ?? 0} active enrollments) will be unassigned so their care can be safely transferred.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong>Data Preservation:</strong> All historical clinical checkups, birth records, and audit logs remain securely preserved.
                </span>
              </div>
            </div>
          )}

          {typeof navigator !== "undefined" && !navigator.onLine && (
            <div className="rounded-md border border-amber-300/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              Facility status updates require an active internet connection to ensure clinical safety boundaries.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" size="sm" disabled={submittingStatus} onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={statusAction === "deactivate" ? "destructive" : "default"}
              disabled={submittingStatus || (typeof navigator !== "undefined" && !navigator.onLine)}
              onClick={handleToggleFacilityStatus}
            >
              {submittingStatus
                ? "Processing..."
                : statusAction === "deactivate"
                ? "Confirm Deactivation"
                : "Confirm Reactivation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserPlus className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Add Healthcare Staff</DialogTitle>
                <DialogDescription className="text-xs">
                  Create an institutional user account directly assigned to {data.facility_name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={addStaffForm.first_name}
                onChange={(e) => setAddStaffForm((prev) => ({ ...prev, first_name: e.target.value }))}
                placeholder="Juan"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Middle Name</Label>
              <Input
                value={addStaffForm.middle_name}
                onChange={(e) => setAddStaffForm((prev) => ({ ...prev, middle_name: e.target.value }))}
                placeholder="Santos"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={addStaffForm.last_name}
                onChange={(e) => setAddStaffForm((prev) => ({ ...prev, last_name: e.target.value }))}
                placeholder="Dela Cruz"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Staff Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={addStaffForm.role}
                onValueChange={(val) => setAddStaffForm((prev) => ({ ...prev, role: val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Facility Head)</SelectItem>
                  <SelectItem value="Doctor">Doctor</SelectItem>
                  <SelectItem value="Midwife">Midwife</SelectItem>
                  <SelectItem value="Nurse">Nurse</SelectItem>
                  <SelectItem value="HealthWorker">Health Worker (BHW)</SelectItem>
                  <SelectItem value="Staff">Clinic Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Official Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={addStaffForm.email}
                onChange={(e) => setAddStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="staff@silang.ph"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone Number</Label>
              <Input
                value={addStaffForm.phone_number}
                onChange={(e) => setAddStaffForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                placeholder="09XX XXX XXXX"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Initial Password <span className="text-destructive">*</span>
              </Label>
              <Input
                type="password"
                value={addStaffForm.password}
                onChange={(e) => setAddStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Min. 6 characters"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Address / Residence</Label>
              <Input
                value={addStaffForm.address}
                onChange={(e) => setAddStaffForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Barangay, Silang, Cavite"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" size="sm" disabled={addStaffSubmitting} onClick={() => setAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={addStaffSubmitting} onClick={handleAddStaff}>
              {addStaffSubmitting ? "Creating Staff..." : "Create Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
