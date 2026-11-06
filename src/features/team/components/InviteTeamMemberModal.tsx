import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { z } from "zod"
import { useAuthSession } from "@/features/auth/auth-session"
import { createStaff } from "../api"

const roles = [
  "Nurse",
  "Midwife",
  "Admin",
]

const inputClassName = "h-9 w-full text-sm"
const staffSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(1, "Last name is required."),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email address.").or(z.literal("")),
  role: z.enum(["Nurse", "Midwife", "Admin"], { error: "Select a staff role." }),
  password: z.string().min(6, "Use at least 6 characters."),
})

export function InviteTeamMemberModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const { session } = useAuthSession()
  const [values, setValues] = React.useState({ firstName: "", middleName: "", lastName: "", phone: "", email: "", role: "Nurse", password: "" })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)

  const change = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: "" }))
  }

  const submit = async () => {
    const parsed = staffSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return
    }
    if (!session?.token) return toast.error("Your session has expired. Sign in again.")
    setSaving(true)
    try {
      await createStaff(session.token, {
        first_name: parsed.data.firstName,
        middle_name: parsed.data.middleName || undefined,
        last_name: parsed.data.lastName,
        role: parsed.data.role,
        phone_number: parsed.data.phone || undefined,
        email: parsed.data.email || undefined,
        password: parsed.data.password,
        facility_id: session.user.facility_id ?? undefined,
      })
      toast.success("Staff member added")
      setValues({ firstName: "", middleName: "", lastName: "", phone: "", email: "", role: "Nurse", password: "" })
      setOpen(false)
      window.dispatchEvent(new Event("silang:staff-updated"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add staff member")
    } finally {
      setSaving(false)
    }
  }

  const required = <span className="text-destructive"> *</span>
  const errorText = (field: string) => errors[field] ? <p className="text-xs text-destructive">{errors[field]}</p> : null

  return (
    <ResponsiveModal
      trigger={children}
      open={open}
      onOpenChange={setOpen}
      title="Add Staff Member"
      description="Create a staff account for this facility."
      className="sm:max-w-[520px]"
    >
      <div className="space-y-4 py-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2"><Label htmlFor="staff-first-name">First Name{required}</Label><Input id="staff-first-name" autoComplete="given-name" value={values.firstName} onChange={(event) => change("firstName", event.target.value)} placeholder="Maria" className={inputClassName} aria-invalid={Boolean(errors.firstName)} />{errorText("firstName")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="staff-last-name">Last Name{required}</Label><Input id="staff-last-name" autoComplete="family-name" value={values.lastName} onChange={(event) => change("lastName", event.target.value)} placeholder="Santos" className={inputClassName} aria-invalid={Boolean(errors.lastName)} />{errorText("lastName")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="staff-middle-name">Middle Name <span className="text-muted-foreground">(Optional)</span></Label><Input id="staff-middle-name" value={values.middleName} onChange={(event) => change("middleName", event.target.value)} placeholder="Dela Cruz" className={inputClassName} /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="staff-phone">Phone Number</Label><Input id="staff-phone" type="tel" autoComplete="tel" value={values.phone} onChange={(event) => change("phone", event.target.value)} placeholder="09XX XXX XXXX" className={inputClassName} /></div>
        </div>
        <div className="flex flex-col gap-2"><Label htmlFor="staff-email">Email Address</Label><Input id="staff-email" type="email" autoComplete="email" value={values.email} onChange={(event) => change("email", event.target.value)} placeholder="name@example.com" className={inputClassName} aria-invalid={Boolean(errors.email)} />{errorText("email")}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2"><Label htmlFor="staff-role">Role{required}</Label><Select value={values.role} onValueChange={(value) => change("role", value)}><SelectTrigger id="staff-role" className={inputClassName}><SelectValue placeholder="Select role" /></SelectTrigger><SelectContent position="popper">{roles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select>{errorText("role")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="staff-password">Temporary Password{required}</Label><Input id="staff-password" type="password" autoComplete="new-password" value={values.password} onChange={(event) => change("password", event.target.value)} placeholder="At least 6 characters" className={inputClassName} aria-invalid={Boolean(errors.password)} />{errorText("password")}</div>
        </div>
        <p className="text-xs text-muted-foreground">Assigned to {session?.facility?.facility_name ?? "your current facility"}.</p>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setOpen(false)} className="h-8 px-3 text-xs font-medium">Cancel</Button>
        <Button onClick={submit} disabled={saving} className="h-8 gap-1.5 px-3 text-xs font-medium">{saving ? "Adding…" : "Add Staff Member"}</Button>
      </div>
    </ResponsiveModal>
  )
}
