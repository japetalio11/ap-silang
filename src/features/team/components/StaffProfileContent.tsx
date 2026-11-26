import { useState, useEffect } from "react"
import { AlertTriangle, Building2, Camera, ChevronLeft, ChevronRight, Clock3, Mail, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { StaffAvatar } from "./StaffAvatar"
import { UploadStaffAvatarDialog } from "./UploadStaffAvatarDialog"
import type { StaffActivity, StaffRecord } from "../api"

type RoleId = "midwife" | "nurse" | "admin"
type PermissionId =
  | "maternal-create"
  | "maternal-view"
  | "clinical-log"
  | "risk-override"
  | "prescriptions"
  | "referral-initiate"
  | "referral-view"
  | "report-export"
  | "team-manage"

const roles: { id: RoleId; label: string }[] = [
  { id: "nurse", label: "Nurse" },
  { id: "midwife", label: "Midwife" },
  { id: "admin", label: "Admin" },
]

const permissionModules: {
  title: string
  permissions: { id: PermissionId; label: string; note?: string; warning?: boolean }[]
}[] = [
  {
    title: "Maternal Registry & Intake",
    permissions: [
      { id: "maternal-create", label: "Create and edit Mother profiles." },
      { id: "maternal-view", label: "View baseline demographic data." },
    ],
  },
  {
    title: "Clinical Care & CDSS",
    permissions: [
      { id: "clinical-log", label: "Log Vital Signs and Encounter Notes." },
      { id: "risk-override", label: "Execute CDSS Risk Assessment & Override Triage", note: "Authorized for a midwife or admin.", warning: true },
      { id: "prescriptions", label: "Add/Edit Prescriptions & Supplements." },
    ],
  },
  {
    title: "Inter-Clinic Referrals",
    permissions: [
      { id: "referral-initiate", label: "Initiate outgoing e-Referrals to Hospitals." },
      { id: "referral-view", label: "View incoming referral statuses and transfer codes." },
    ],
  },
  {
    title: "Administration & Analytics",
    permissions: [
      { id: "report-export", label: "Export DOH/FHSIS statistical reports." },
      { id: "team-manage", label: "Manage team members and RBAC settings." },
    ],
  },
]

const ACTIVITIES_PER_PAGE = 10

function roleForStaff(role: string): RoleId {
  const normalized = role.toLowerCase()
  if (normalized.includes("admin")) return "admin"
  if (normalized.includes("midwife")) return "midwife"
  return "nurse"
}

function permissionsForRole(role: RoleId): Record<PermissionId, boolean> {
  const presets: Record<RoleId, PermissionId[]> = {
    midwife: ["maternal-create", "maternal-view", "clinical-log", "risk-override", "prescriptions", "referral-initiate", "referral-view"],
    nurse: ["maternal-create", "maternal-view", "clinical-log", "prescriptions", "referral-initiate", "referral-view"],
    admin: ["maternal-create", "maternal-view", "clinical-log", "risk-override", "prescriptions", "referral-initiate", "referral-view", "report-export", "team-manage"],
  }
  return Object.fromEntries(permissionModules.flatMap((module) => module.permissions.map(({ id }) => [id, presets[role].includes(id)]))) as Record<PermissionId, boolean>
}

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon?: LucideIcon }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{Icon && <Icon className="size-3.5 shrink-0" />}{label}</p>
      <p className="break-words text-xs font-medium text-foreground">{value || "—"}</p>
    </div>
  )
}

export function StaffProfileContent({
  staff,
  activities,
  onRoleChange,
  onAvatarUpdated,
}: {
  staff: StaffRecord
  activities: StaffActivity[]
  onRoleChange: (role: string) => Promise<boolean>
  onAvatarUpdated?: (newAvatarUrl: string) => void
}) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [activityPage, setActivityPage] = useState(1)

  useEffect(() => {
    setActivityPage(1)
  }, [staff.id, activities.length])

  const assignedRole = roleForStaff(staff.role)
  const permissions = permissionsForRole(assignedRole)

  const roleDescription = assignedRole === "admin"
      ? "Full workspace access, including staff administration and system reporting."
      : "Supports day-to-day maternal care, referrals, and facility operations with role-based clinical access."

  const updateRole = async (role: RoleId) => {
    const roleValue = role === "admin" ? "Admin" : role === "midwife" ? "Midwife" : "Nurse"
    await onRoleChange(roleValue)
  }

  const totalActivities = activities.length
  const totalPages = Math.max(1, Math.ceil(totalActivities / ACTIVITIES_PER_PAGE))
  const safePage = Math.min(Math.max(1, activityPage), totalPages)
  const startIndex = (safePage - 1) * ACTIVITIES_PER_PAGE
  const paginatedActivities = activities.slice(startIndex, startIndex + ACTIVITIES_PER_PAGE)

  return (
    <div className="text-foreground">
      <div className="min-h-0">
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="rounded-md border border-sidebar-border bg-card p-4 md:p-5" aria-label="Staff identity">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="group relative size-24 shrink-0">
                  <StaffAvatar
                    src={staff.avatar}
                    name={staff.name}
                    className="size-24 border-2 border-sidebar-border text-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setIsUploadDialogOpen(true)}
                    title="Upload profile photo"
                    aria-label="Upload profile photo"
                    className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full border border-sidebar-border bg-background text-foreground shadow-sm transition-transform hover:scale-105 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Camera className="size-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2"><StatusBadge status={staff.status} /></div>
                  <h1 className="truncate text-base font-semibold text-foreground" title={staff.name}>{staff.name}</h1>
                  <p className="mt-0.5 text-xs font-normal text-muted-foreground">Staff profile and access details.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 xl:grid-cols-4">
                <Detail label="Position" value={roles.find(({ id }) => id === roleForStaff(staff.role))?.label ?? "Nurse"} />
                <Detail label="Assigned Facility" value={staff.facility} icon={Building2} />
                <Detail label="Email" value={staff.email} icon={Mail} />
                <Detail label="Joined on" value={staff.joinedOn ?? "June 08, 2026"} icon={Clock3} />
              </div>
            </section>

            <section className="min-h-56 flex-1 rounded-md border border-sidebar-border bg-card p-4 md:p-5" aria-labelledby="staff-activity-heading">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 id="staff-activity-heading" className="text-sm font-semibold text-foreground">Activity Log</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Recent actions performed by this user.</p>
                </div>
                {totalActivities > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {totalActivities} total
                  </span>
                )}
              </div>

              {totalActivities > 0 ? (
                <div className="mt-5 flex flex-col gap-4">
                  <div className="space-y-4">
                    {paginatedActivities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{activity.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{activity.subtitle}</p>
                          {activity.details && <p className="mt-1 text-xs text-muted-foreground">{activity.details}</p>}
                          <p className="mt-1.5 text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sidebar-border pt-3">
                      <p className="text-[11px] text-muted-foreground">
                        Showing {startIndex + 1}–{Math.min(startIndex + ACTIVITIES_PER_PAGE, totalActivities)} of {totalActivities}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActivityPage((prev) => Math.max(1, prev - 1))}
                          disabled={safePage <= 1}
                          className="h-7 gap-1 px-2 text-xs"
                        >
                          <ChevronLeft className="size-3.5" />
                          Previous
                        </Button>
                        <span className="px-1 text-xs text-muted-foreground">
                          {safePage} / {totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActivityPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={safePage >= totalPages}
                          className="h-7 gap-1 px-2 text-xs"
                        >
                          Next
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-5 text-xs text-muted-foreground">No recent activity is available.</p>
              )}
            </section>
          </div>

          <section className="min-w-0 rounded-md border border-sidebar-border bg-card p-4 md:p-5" aria-labelledby="system-permissions-heading">
            <h2 id="system-permissions-heading" className="text-sm font-semibold text-foreground">System Permissions</h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">Assign a global role to define this user&apos;s operational boundaries. Individual permissions are inherited from the selected role.</p>

            <div className="mt-5 flex flex-col gap-2">
              <label htmlFor="staff-assigned-role" className="text-xs font-medium">Assigned Role</label>
              <Select value={assignedRole} onValueChange={(value) => { void updateRole(value as RoleId) }}>
                <SelectTrigger id="staff-assigned-role" className="w-full"><SelectValue placeholder="Select a role..." /></SelectTrigger>
                <SelectContent align="start">
                  {roles.map(({ id, label }) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">Selecting a role automatically applies authorized clinical presets.</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{roleDescription}</p>
            </div>

            <div className="mt-5 space-y-5">
              {permissionModules.map((module) => (
                <section key={module.title} aria-label={module.title}>
                  <h3 className="text-xs font-semibold text-foreground">{module.title}</h3>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {module.permissions.map(({ id, label, note, warning }) => (
                      <div key={id} className="flex items-start gap-2.5">
                        <Checkbox id={`permission-${staff.id}-${id}`} checked={permissions[id]} disabled className="mt-0.5 size-4 shrink-0" />
                        <div className="min-w-0">
                          <label htmlFor={`permission-${staff.id}-${id}`} className="cursor-pointer text-xs leading-relaxed text-foreground">{label}</label>
                          {warning && <AlertTriangle className="ml-1 inline size-3.5 text-amber-500" aria-label="Elevated permission" />}
                          {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      </div>

      <UploadStaffAvatarDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        staffId={staff.id}
        staffName={staff.name}
        currentPhotoUrl={staff.avatar}
        onSuccess={(newPhotoUrl) => {
          onAvatarUpdated?.(newPhotoUrl)
        }}
      />
    </div>
  )
}
