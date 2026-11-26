import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { AlertTriangle, ArrowLeft, ArrowRightLeft, CalendarDays, KeyRound, MoreVertical, RefreshCw, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CachedDataBanner } from "@/components/ui/cached-data-banner"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuthSession } from "@/features/auth/auth-session"
import { db } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"
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
import { FacilitySearchSelect } from "./FacilitySearchSelect"
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
  const [confirmTransferOpen, setConfirmTransferOpen] = useState(false)
  const [targetFacilityId, setTargetFacilityId] = useState("")
  const [submittingTransfer, setSubmittingTransfer] = useState(false)

  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [submittingDeactivation, setSubmittingDeactivation] = useState(false)

  const loadStaff = useCallback(async () => {
    if (!token || !staffId) return
    const effectiveStaffId = await silangSyncEngine.resolveId(staffId)
    if (effectiveStaffId !== staffId) {
      navigate(`/superadmin/users/${effectiveStaffId}`, { replace: true, state: navState })
      return
    }
    setLoading(true)
    try {
      const [staffResult, activityResult, facList] = await Promise.allSettled([
        getStaffById(token, effectiveStaffId),
        getStaffActivities(token, effectiveStaffId),
        fetchAllFacilities(token).catch(async () => {
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
  }, [token, staffId, navState, navigate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStaff()
    }, 0)
    const unsubscribe = silangSyncEngine.subscribe((status) => {
      if (!status.isSyncing && status.pendingCount === 0) {
        void loadStaff()
      }
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [loadStaff])

  useEffect(() => {
    const handleStaffUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ staffId?: string; payload?: { profile_url?: string } }>
      if (customEvent.detail?.staffId === staffId && customEvent.detail?.payload?.profile_url) {
        setStaff((prev) => prev ? { ...prev, avatar: customEvent.detail.payload!.profile_url! } : null)
      }
    }
    window.addEventListener("silang:staff-updated", handleStaffUpdated)
    return () => window.removeEventListener("silang:staff-updated", handleStaffUpdated)
  }, [staffId])

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

  const changeActiveStatus = async (targetActiveState?: boolean) => {
    if (!staff || !token) return
    const is_active = targetActiveState !== undefined ? targetActiveState : staff.status !== "Active"
    setSubmittingDeactivation(true)
    try {
      await setStaffActive(token, staff.id, is_active)
      setStaff({ ...staff, status: is_active ? "Active" : "Deactivated" })
      toast.success(is_active ? "Staff account activated" : "Staff account deactivated")
      setDeactivateDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff account")
    } finally {
      setSubmittingDeactivation(false)
    }
  }

  const handleResetPassword = async () => {
    if (!token || !staff) return
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

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine
    if (isOffline) {
      const existingStaff = await db.staff.get(staff.id).catch(() => undefined)
      if (existingStaff) {
        await db.staff.update(staff.id, {
          facility_id: targetFacilityId,
          sync_status: "pending_update",
          updated_at: Date.now(),
        }).catch(() => {})
      }
      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "facility",
        action: "REASSIGN_STAFF",
        endpoint: `/facility/${encodeURIComponent(staff.facilityId)}/reassign-staff`,
        method: "PUT",
        payload: {
          user_id: staff.id,
          target_facility_id: targetFacilityId,
        },
      })
      const targetFac = facilities.find((f) => f.facility_id === targetFacilityId)
      setStaff((prev) =>
        prev
          ? {
              ...prev,
              facilityId: targetFacilityId,
              facility: targetFac?.facility_name ?? prev.facility,
            }
          : prev
      )
      toast.success("Staff member reassigned offline", {
        description: `${staff.name} transferred in device memory. Will sync when online.`,
      })
      setConfirmTransferOpen(false)
      setTransferDialogOpen(false)
      return
    }

    setSubmittingTransfer(true)
    try {
      await reassignStaffFacility(token, staff.facilityId, {
        user_id: staff.id,
        target_facility_id: targetFacilityId,
      })
      toast.success("Staff member reassigned", {
        description: `${staff.name} successfully transferred to destination clinic.`,
      })
      setConfirmTransferOpen(false)
      setTransferDialogOpen(false)
      await loadStaff()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Staff reassignment failed")
    } finally {
      setSubmittingTransfer(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-6 overflow-y-auto px-4 pb-8 pt-6 text-foreground md:px-6">
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
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsScheduleOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-xs"
            >
              <CalendarDays className="size-3.5" />
              Staff Schedule
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="size-8" aria-label="Staff actions"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => { setTargetFacilityId(""); setTransferDialogOpen(true) }}><ArrowRightLeft className="size-3.5" />Transfer Facility</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setNewPassword(""); setPasswordDialogOpen(true) }}><KeyRound className="size-3.5" />Reset Password</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void loadStaff()}><RefreshCw className="size-3.5" />Refresh</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant={staff.status === "Active" ? "destructive" : "default"} onSelect={() => staff.status === "Active" ? setDeactivateDialogOpen(true) : void changeActiveStatus(true)}>
                  {staff.status === "Active" ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                  {staff.status === "Active" ? "Deactivate Account" : "Activate Account"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <CachedDataBanner message="Viewing cached staff profile. Administrative role and assignment changes will queue offline and synchronize once connection is restored." />

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
          <StaffProfileContent
            staff={staff}
            activities={activities}
            onRoleChange={changeRole}
            onAvatarUpdated={(newAvatar) => {
              setStaff((prev) => prev ? { ...prev, avatar: newAvatar } : null)
            }}
          />
          <StaffScheduleDialog key={staff.id} open={isScheduleOpen} onOpenChange={setIsScheduleOpen} staff={staff} />
        </>
      ) : (
        <section className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-sidebar-border text-center">
          <h1 className="text-base font-semibold text-foreground">Personnel record not found</h1>
          <p className="text-xs text-muted-foreground">This staff profile may have been removed from the municipal registry.</p>
          <Button variant="outline" onClick={handleBack} className="h-9 text-sm">
            {navState?.returnLabel ? `Back to ${navState.returnLabel}` : "Back to Staff Directory"}
          </Button>
        </section>
      )}

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-md">
          <DialogHeader className="gap-1 pr-14 text-left">
            <DialogTitle className="text-base font-semibold">Reset Password</DialogTitle>
            <DialogDescription className="text-xs">
              Set a password for {staff?.name}.
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
              {typeof navigator !== "undefined" && !navigator.onLine && (
                <div className="rounded-md border border-amber-300/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                  Password resets require an active server connection to ensure credential security.
                </div>
              )}
            </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 pt-3 sm:justify-between [&_button]:h-8 [&_button]:px-3 [&_button]:text-xs">
            <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-8 px-3 text-xs"
              onClick={handleResetPassword}
              disabled={submittingPassword || (typeof navigator !== "undefined" && !navigator.onLine)}
            >
              {submittingPassword ? "Resetting..." : "Confirm Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-md">
          <DialogHeader className="gap-1 pr-14 text-left">
            <DialogTitle className="text-base font-semibold">Transfer Staff</DialogTitle>
            <DialogDescription className="text-xs">
              Transfer {staff?.name} from {staff?.facility} to a different healthcare station in Silang.
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Destination Facility <span className="text-destructive">*</span></Label>
                <FacilitySearchSelect
                  facilities={facilities}
                  value={targetFacilityId}
                  onValueChange={setTargetFacilityId}
                  currentFacilityId={staff?.facilityId}
                  placeholder="Search clinic or health station..."
                />
              </div>
            </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 pt-3 sm:justify-between [&_button]:h-8 [&_button]:px-3 [&_button]:text-xs">
            <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-8 px-3 text-xs"
              onClick={() => {
                setTransferDialogOpen(false)
                setConfirmTransferOpen(true)
              }}
              disabled={!targetFacilityId}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmTransferOpen} onOpenChange={setConfirmTransferOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-md">
          <DialogHeader className="gap-1 pr-14 text-left">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
                <AlertTriangle className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Confirm Staff Transfer
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to transfer <span className="font-semibold text-foreground">{staff?.name}</span> ({staff?.role}) to{" "}
              <span className="font-semibold text-foreground">
                {facilities.find((f) => f.facility_id === targetFacilityId)?.facility_name || "the selected facility"}
              </span>?
            </DialogDescription>
          </DialogHeader>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Effects of reassignment:</p>
              <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
                <li>
                  <strong className="text-foreground">Active Station Change:</strong> Staff member will be assigned to the new facility and detached from their current station.
                </li>
                <li>
                  <strong className="text-foreground">Access Scope:</strong> Logins, patient lists, and daily clinical duties will be scoped to the new facility.
                </li>
                <li>
                  <strong className="text-foreground">Historical Preservation:</strong> All previous maternal records, checkups, and audit trails logged by this staff member at {staff?.facility} remain intact.
                </li>
              </ul>
            </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 pt-3 sm:justify-between [&_button]:h-8 [&_button]:px-3 [&_button]:text-xs">
            <Button
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={() => {
                setConfirmTransferOpen(false)
                setTransferDialogOpen(true)
              }}
              disabled={submittingTransfer}
            >
              Back
            </Button>
            <Button
              className="h-8 px-3 text-xs"
              onClick={handleTransferStaff}
              disabled={submittingTransfer}
            >
              {submittingTransfer ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-md">
          <DialogHeader className="gap-1 pr-14 text-left">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60">
                <AlertTriangle className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Deactivate Staff Account?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to deactivate the account of <span className="font-semibold text-foreground">{staff?.name}</span> ({staff?.role})?
            </DialogDescription>
          </DialogHeader>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Effects of deactivation:</p>
              <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
                <li>
                  <strong className="text-foreground">Session Termination:</strong> The user will be immediately signed out and prevented from accessing clinic portals and mobile applications.
                </li>
                <li>
                  <strong className="text-foreground">Access Revocation:</strong> Access to patient records, maternal health charts, and clinic appointments will be blocked.
                </li>
                <li>
                  <strong className="text-foreground">Data Preservation:</strong> Existing medical entries, clinical records, and audit trails created by this account remain safe and unaltered.
                </li>
                <li>
                  <strong className="text-foreground">Reversible:</strong> You can reactivate this account at any time.
                </li>
              </ul>
            </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 pt-3 sm:justify-between [&_button]:h-8 [&_button]:px-3 [&_button]:text-xs">
            <Button
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={() => setDeactivateDialogOpen(false)}
              disabled={submittingDeactivation}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-8 px-3 text-xs"
              onClick={() => void changeActiveStatus(false)}
              disabled={submittingDeactivation}
            >
              {submittingDeactivation ? "Deactivating..." : "Confirm Deactivation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
