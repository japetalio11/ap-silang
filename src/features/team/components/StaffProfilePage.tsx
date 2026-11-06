import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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

  const changeActiveStatus = async () => {
    if (!staff || !token) return
    const is_active = staff.status !== "Active"
    try {
      await setStaffActive(token, staff.id, is_active)
      setStaff({ ...staff, status: is_active ? "Active" : "Deactivated" })
      toast.success(is_active ? "Staff account activated" : "Staff account deactivated")
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update staff account") }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto px-4 pb-4 pt-4 text-foreground">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" className="h-8 w-fit gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => navigate("/dashboard/team")}>
          <ArrowLeft className="size-3.5" />
          Staff Management
        </Button>
        {staff && !loading && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setIsScheduleOpen(true)} className="h-8 gap-1.5 px-2.5 text-xs"><CalendarDays className="size-3.5" />Staff Schedule</Button>
          <Button variant="outline" onClick={() => void changeActiveStatus()} className="h-8 px-2.5 text-xs">{staff.status === "Active" ? "Deactivate Account" : "Activate Account"}</Button>
          <Button variant="outline" disabled title="Staff profile editing is not available through the connected API." className="h-8 px-2.5 text-xs">Edit Profile</Button>
        </div>}
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
          <StaffProfileContent staff={staff} activities={activities} onRoleChange={changeRole} />
          <StaffScheduleDialog key={staff.id} open={isScheduleOpen} onOpenChange={setIsScheduleOpen} staff={staff} />
        </>
      ) : (
        <section className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-sidebar-border text-center">
          <h1 className="text-base font-semibold text-foreground">Staff member not found</h1>
          <p className="text-xs text-muted-foreground">This staff profile may have been removed.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/team")} className="h-8 text-xs">Back to Staff Management</Button>
        </section>
      )}
    </div>
  )
}
