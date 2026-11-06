import { AlertTriangle, Building2, Clock3, Mail, type LucideIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
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
    title: "Module 1: Maternal Registry & Intake",
    permissions: [
      { id: "maternal-create", label: "Create and edit Mother profiles." },
      { id: "maternal-view", label: "View baseline demographic data." },
    ],
  },
  {
    title: "Module 2: Clinical Care & CDSS",
    permissions: [
      { id: "clinical-log", label: "Log Vital Signs and Encounter Notes." },
      { id: "risk-override", label: "Execute CDSS Risk Assessment & Override Triage", note: "Authorized for a midwife or admin.", warning: true },
      { id: "prescriptions", label: "Add/Edit Prescriptions & Supplements." },
    ],
  },
  {
    title: "Module 3: Inter-Clinic Referrals",
    permissions: [
      { id: "referral-initiate", label: "Initiate outgoing e-Referrals to Hospitals." },
      { id: "referral-view", label: "View incoming referral statuses and transfer codes." },
    ],
  },
  {
    title: "Module 4: Administration & Analytics",
    permissions: [
      { id: "report-export", label: "Export DOH/FHSIS statistical reports." },
      { id: "team-manage", label: "Manage team members and RBAC settings." },
    ],
  },
]

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

export function StaffProfileContent({ staff, activities, onRoleChange }: { staff: StaffRecord; activities: StaffActivity[]; onRoleChange: (role: string) => Promise<boolean> }) {
  const assignedRole = roleForStaff(staff.role)
  const permissions = permissionsForRole(assignedRole)

  const roleDescription = assignedRole === "admin"
      ? "Full workspace access, including staff administration and system reporting."
      : "Supports day-to-day maternal care, referrals, and facility operations with role-based clinical access."

  const updateRole = async (role: RoleId) => {
    const roleValue = role === "admin" ? "Admin" : role === "midwife" ? "Midwife" : "Nurse"
    await onRoleChange(roleValue)
  }

  return (
    <div className="text-foreground">
      <div className="min-h-0">
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="rounded-md border border-sidebar-border bg-card p-4 md:p-5" aria-label="Staff identity">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="size-24 shrink-0 overflow-hidden rounded-full bg-muted dark:bg-[#222]">
                  {staff.avatar ? (
                    <img src={staff.avatar} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xl font-semibold text-muted-foreground">{staff.name.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2"><StatusBadge status={staff.status} /></div>
                  <h1 className="truncate text-base font-semibold text-foreground" title={staff.name}>{staff.name}</h1>
                  <p className="mt-0.5 text-xs font-normal text-muted-foreground">Staff profile and access details.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-sidebar-border pt-4 xl:grid-cols-4">
                <Detail label="Position" value={roles.find(({ id }) => id === roleForStaff(staff.role))?.label ?? "Nurse"} />
                <Detail label="Assigned Facility" value={staff.facility} icon={Building2} />
                <Detail label="Email" value={staff.email} icon={Mail} />
                <Detail label="Joined on" value={staff.joinedOn ?? "June 08, 2026"} icon={Clock3} />
              </div>
            </section>

            <section className="min-h-56 flex-1 rounded-md border border-sidebar-border bg-card p-4 md:p-5" aria-labelledby="staff-activity-heading">
              <h2 id="staff-activity-heading" className="text-sm font-semibold text-foreground">Activity Log</h2>
              <p className="mt-1 text-xs text-muted-foreground">Recent actions performed by this user.</p>
              {activities.length > 0 ? <div className="mt-5 space-y-4">{activities.map((activity) => <div key={activity.id} className="flex gap-3"><span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0"><p className="text-xs font-medium">{activity.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{activity.subtitle}</p>{activity.details && <p className="mt-1 text-xs text-muted-foreground">{activity.details}</p>}<p className="mt-1.5 text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</p></div></div>)}</div> : <p className="mt-5 text-xs text-muted-foreground">No recent activity is available.</p>}
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

            <div className="mt-5 divide-y divide-sidebar-border border-y border-sidebar-border">
              {permissionModules.map((module) => (
                <section key={module.title} className="py-4 first:pt-4 last:pb-1" aria-label={module.title}>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{module.title}</h3>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {module.permissions.map(({ id, label, note, warning }) => (
                      <div key={id} className="flex items-start gap-2.5">
                        <Checkbox id={`permission-${staff.id}-${id}`} checked={permissions[id]} disabled className="mt-0.5" />
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
    </div>
  )
}
