import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRightLeft, CalendarDays, KeyRound, RefreshCw, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthSession } from "@/features/auth/auth-session"
import {
  getStaffActivities,
  getStaffById,
  setStaffActive,
  updateStaffRole,
  type StaffActivity,
  type StaffRecord,
} from "@/features/team/api"
import {
  adminResetStaffPassword,
  fetchAllFacilities,
  reassignStaffFacility,
  type FacilityItem,
} from "../api/superadmin-api"
import { StaffProfileContent } from "@/features/team/components/StaffProfileContent"
import { StaffScheduleDialog } from "@/features/team/components/StaffScheduleDialog"

export function SuperAdminStaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as { returnTo?: string; returnLabel?: string } | null
  const { session } = useAuthSession()
  const token = session?.token

  const handleBack = () => {
    if (navState?.returnTo) {
      navigate(navState.returnTo)
    } else if (staff?.facilityId) {
      navigate(`/superadmin/facility/${staff.facilityId}`)
    } else {
      navigate("/superadmin/users")
    }
  }

  const [staff, setStaff] = useState<StaffRecord | null>(null)
  const [activities, setActivities] = useState<StaffActivity[]>([])
  const [facilities, setFacilities] = useState<FacilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [submittingPassword, setSubmittingPassword] = useState(false)

  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [targetFacilityId, setTargetFacilityId] = useState("")
  const [submittingTransfer, setSubmittingTransfer] = useState(false)

  const loadStaff = useCallback(async () => {
    if (!token || !staffId) return
    setLoading(true)
    try {
      const [staffResult, activityResult, facList] = await Promise.allSettled([
        getStaffById(token, staffId),
        getStaffActivities(token, staffId),
        fetchAllFacilities(token),
      ])

      if (staffResult.status === "rejected") throw staffResult.reason
      setStaff(staffResult.value)
      setActivities(activityResult.status === "fulfilled" ? activityResult.value : [])
      setFacilities(facList.status === "fulfilled" ? facList.value : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load staff profile")
      setStaff(null)
    } finally {
      setLoading(false)
    }
  }, [token, staffId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStaff()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadStaff])

  const changeRole = async (role: string) => {
    if (!staff || !token) return false
    try {
      await updateStaffRole(token, staff.id, role)
      setStaff({ ...staff, role })
      toast.success("Staff role updated")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff role")
    }
    return false
  }

  const changeActiveStatus = async () => {
    if (!staff || !token) return
    const is_active = staff.status !== "Active"
    try {
      await setStaffActive(token, staff.id, is_active)
      setStaff({ ...staff, status: is_active ? "Active" : "Deactivated" })
      toast.success(is_active ? "Staff account activated" : "Staff account suspended")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff account")
    }
  }

  const handleResetPassword = async () => {
    if (!token || !staff) return
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setSubmittingPassword(true)
    try {
      await adminResetStaffPassword(token, staff.id, newPassword)
      toast.success("Password reset successfully", {
        description: `New password assigned to ${staff.name}`,
      })
      setPasswordDialogOpen(false)
      setNewPassword("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password")
    } finally {
      setSubmittingPassword(false)
    }
  }

  const handleTransferStaff = async () => {
    if (!token || !staff || !staff.facilityId || !targetFacilityId) return
    setSubmittingTransfer(true)
    try {
      await reassignStaffFacility(token, staff.facilityId, {
        user_id: staff.id,
        target_facility_id: targetFacilityId,
      })
      toast.success("Staff member reassigned", {
        description: `${staff.name} successfully transferred to destination clinic.`,
      })
      setTransferDialogOpen(false)
      await loadStaff()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Staff reassignment failed")
    } finally {
      setSubmittingTransfer(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto px-4 pb-4 pt-4 text-foreground">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="h-8 w-fit gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleBack}
        >
          <ArrowLeft className="size-3.5" />
          {navState?.returnLabel
            ? `Back to ${navState.returnLabel}`
            : staff?.facility
              ? `Back to ${staff.facility}`
              : "Staff & Access Control"}
        </Button>
        {staff && !loading && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsScheduleOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-xs"
            >
              <CalendarDays className="size-3.5" />
              Staff Schedule
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTargetFacilityId("")
                setTransferDialogOpen(true)
              }}
              className="h-8 gap-1.5 px-2.5 text-xs"
            >
              <ArrowRightLeft className="size-3.5" />
              Transfer Facility
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNewPassword("")
                setPasswordDialogOpen(true)
              }}
              className="h-8 gap-1.5 px-2.5 text-xs"
            >
              <KeyRound className="size-3.5" />
              Reset Password
            </Button>
            <Button
              variant="outline"
              onClick={() => void changeActiveStatus()}
              className="h-8 gap-1.5 px-2.5 text-xs"
            >
              {staff.status === "Active" ? (
                <>
                  <UserX className="size-3.5 text-rose-500" />
                  Suspend Account
                </>
              ) : (
                <>
                  <UserCheck className="size-3.5 text-emerald-500" />
                  Activate Account
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => void loadStaff()}
              title="Refresh profile"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_1fr]" aria-label="Loading staff profile" aria-busy="true">
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-sidebar-border p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="size-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-8 w-full max-w-md" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3.5 w-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="min-h-52 rounded-md border border-sidebar-border p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-5 h-3.5 w-3/4" />
            </div>
          </div>
          <div className="rounded-md border border-sidebar-border p-4 sm:p-5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-3 h-3.5 w-4/5" />
            <Skeleton className="mt-6 h-8 w-64" />
            <div className="mt-8 space-y-6">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : staff ? (
        <>
          <StaffProfileContent staff={staff} activities={activities} onRoleChange={changeRole} />
          <StaffScheduleDialog key={staff.id} open={isScheduleOpen} onOpenChange={setIsScheduleOpen} staff={staff} />
        </>
      ) : (
        <section className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-sidebar-border text-center">
          <h1 className="text-base font-semibold text-foreground">Personnel record not found</h1>
          <p className="text-xs text-muted-foreground">This staff profile may have been removed from the municipal registry.</p>
          <Button variant="outline" onClick={handleBack} className="h-8 text-xs">
            {navState?.returnLabel ? `Back to ${navState.returnLabel}` : "Back to Staff Directory"}
          </Button>
        </section>
      )}

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Administrative Password Reset</DialogTitle>
            <DialogDescription className="text-xs">
              Assign a new temporary password for {staff?.name}.
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
              {submittingPassword ? "Resetting..." : "Confirm Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Reassign Staff to Another Facility</DialogTitle>
            <DialogDescription className="text-xs">
              Transfer {staff?.name} from {staff?.facility} to a different healthcare station in Silang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Destination Facility</Label>
              <Select value={targetFacilityId} onValueChange={setTargetFacilityId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select target facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities
                    .filter((f) => f.facility_id !== staff?.facilityId)
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
              {submittingTransfer ? "Transferring..." : "Confirm Reassignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
