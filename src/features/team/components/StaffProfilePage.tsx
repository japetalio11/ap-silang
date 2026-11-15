import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AlertTriangle, ArrowLeft, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuthSession } from "@/features/auth/auth-session"
import { toast } from "sonner"
import { getStaffActivities, getStaffById, setStaffActive, updateStaffRole, type StaffActivity, type StaffRecord } from "../api"
import { StaffProfileContent } from "./StaffProfileContent"
import { StaffScheduleDialog } from "./StaffScheduleDialog"

export function StaffProfilePage() {
  const { staffId } = useParams<{ staffId: string }>()
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const token = session?.token
  const [staff, setStaff] = useState<StaffRecord | null>(null)
  const [activities, setActivities] = useState<StaffActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const userRole = session?.user?.role?.toLowerCase().trim() || ""
  const isAdminOrAbove = userRole === "admin" || userRole === "systemadmin" || userRole === "superadmin"

  const loadStaff = useCallback(async () => {
    if (!token || !staffId) return
    setLoading(true)
    try {
      const [staffResult, activityResult] = await Promise.allSettled([getStaffById(token, staffId), getStaffActivities(token, staffId)])
      if (staffResult.status === "rejected") throw staffResult.reason
      setStaff(staffResult.value)
      setActivities(activityResult.status === "fulfilled" ? activityResult.value : [])
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load staff profile"); setStaff(null) }
    finally { setLoading(false) }
  }, [token, staffId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadStaff() }, 0)
    return () => window.clearTimeout(timer)
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
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update staff role") }
    return false
  }

  const handleToggleActiveClick = () => {
    if (!isAdminOrAbove) {
      toast.error("Only administrators can deactivate or activate staff accounts.")
      return
    }
    if (staff?.status === "Active") {
      setIsDeactivateOpen(true)
    } else {
      void changeActiveStatus(true)
    }
  }

  const changeActiveStatus = async (nextActive: boolean) => {
    if (!staff || !token) return
    setIsUpdatingStatus(true)
    try {
      await setStaffActive(token, staff.id, nextActive)
      setStaff({ ...staff, status: nextActive ? "Active" : "Deactivated" })
      toast.success(nextActive ? "Staff account activated" : "Staff account deactivated")
      setIsDeactivateOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update staff account")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto px-4 pb-4 pt-4 text-foreground">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" className="h-8 w-fit gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => navigate("/dashboard/team")}>
          <ArrowLeft className="size-3.5" />
          Staff Management
        </Button>
        {staff && !loading && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {isAdminOrAbove && (
              <>
                <Button variant="outline" onClick={() => setIsScheduleOpen(true)} className="h-8 gap-1.5 px-2.5 text-xs">
                  <CalendarDays className="size-3.5" />Staff Schedule
                </Button>
                <Button
                  variant="outline"
                  onClick={handleToggleActiveClick}
                  disabled={isUpdatingStatus}
                  className={`h-8 px-2.5 text-xs ${staff.status === "Active" ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`}
                >
                  {staff.status === "Active" ? "Deactivate Account" : "Activate Account"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      {loading ? (
        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_1fr]" aria-label="Loading staff profile" aria-busy="true">
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-sidebar-border p-4 sm:p-5">
              <div className="flex items-center gap-4"><Skeleton className="size-16 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-8 w-full max-w-md" /></div></div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3.5 w-full" /></div>)}</div>
            </div>
            <div className="min-h-52 rounded-md border border-sidebar-border p-4"><Skeleton className="h-4 w-28" /><Skeleton className="mt-5 h-3.5 w-3/4" /></div>
          </div>
          <div className="rounded-md border border-sidebar-border p-4 sm:p-5"><Skeleton className="h-4 w-36" /><Skeleton className="mt-3 h-3.5 w-4/5" /><Skeleton className="mt-6 h-8 w-64" /><div className="mt-8 space-y-6">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>)}</div></div>
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
          {isAdminOrAbove && <StaffScheduleDialog key={staff.id} open={isScheduleOpen} onOpenChange={setIsScheduleOpen} staff={staff} />}
        </>
      ) : (
        <section className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-sidebar-border text-center">
          <h1 className="text-base font-semibold text-foreground">Staff member not found</h1>
          <p className="text-xs text-muted-foreground">This staff profile may have been removed.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/team")} className="h-8 text-xs">Back to Staff Management</Button>
        </section>
      )}

      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Deactivate Staff Account?
              </DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs text-muted-foreground">
              Are you sure you want to deactivate the account of <span className="font-semibold text-foreground">{staff?.name}</span> ({staff?.role})?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
            <p className="font-medium text-foreground">Effects of deactivation:</p>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
              <li>
                <strong className="text-foreground">Session Termination:</strong> The user will be immediately signed out and blocked from accessing clinic portals and mobile applications.
              </li>
              <li>
                <strong className="text-foreground">Access Revocation:</strong> Access to patient charts, maternal records, and clinical appointments will be halted.
              </li>
              <li>
                <strong className="text-foreground">Data Preservation:</strong> All historical consultations, medical entries, and audit logs created by this staff member remain secure and intact.
              </li>
              <li>
                <strong className="text-foreground">Reversible:</strong> Administrators can reactivate this account at any time.
              </li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeactivateOpen(false)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void changeActiveStatus(false)}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? "Deactivating…" : "Confirm Deactivation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
