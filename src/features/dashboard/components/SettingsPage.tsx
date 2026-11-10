import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Bell, Building2, UserRound, WifiOff, Upload, X, Calendar as CalendarIcon, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/ui/status-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuthSession } from "@/features/auth/auth-session"
import { apiRequest } from "@/lib/api"
import { toast } from "sonner"
import { z } from "zod"
import { getClosedDates, removeClosedDate, type ClosedDateRecord } from "@/features/calendar/closed-dates"

import { AddDate } from "./add-date"

function SettingToggle({ title, description, defaultChecked = false }: { title: string; description: string; defaultChecked?: boolean }) {
  const key = `silang.settings.${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  const [checked, setChecked] = useState(() => window.localStorage.getItem(key) === null ? defaultChecked : window.localStorage.getItem(key) === "true")
  return <div className="flex items-center justify-between gap-4 rounded-md border border-sidebar-border p-3">
    <div className="min-w-0"><p className="text-xs font-medium">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div>
    <Switch checked={checked} onCheckedChange={(value) => { setChecked(value); window.localStorage.setItem(key, String(value)); toast.success(`${title} ${value ? "enabled" : "disabled"}`) }} aria-label={title} />
  </div>
}

function Field({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) {
  return <div className="space-y-2"><Label className="text-xs font-medium">{label}{required && <span className="ml-0.5 text-destructive">*</span>}</Label>{children}</div>
}

function SettingsSubtabs({ value, onChange, items }: { value: string; onChange: (value: string) => void; items: { value: string; label: string }[] }) {
  return <div className="inline-flex h-8 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-[3px] text-muted-foreground">
    {items.map((item) => <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)} className={`inline-flex h-full shrink-0 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${value === item.value ? "bg-background text-foreground shadow-sm dark:bg-input/30" : "text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
  </div>
}

export function SettingsPage({ onClose }: { onClose?: () => void }) {
  const { session } = useAuthSession()
  const token = session?.token
  const userId = session?.user.user_id
  const facilityId = session?.user.facility_id
  const [activeSection, setActiveSection] = useState("account")
  const [accountTab, setAccountTab] = useState("profile")
  const [offlineTab, setOfflineTab] = useState("storage")
  const [notificationTab, setNotificationTab] = useState("channels")
  const [account, setAccount] = useState({ first_name: "", last_name: "", phone_number: "", email: "" })
  const [facility, setFacility] = useState({ facility_name: "", type: "Rural Health Unit", contact_number: "", email: "", address: "" })
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({})
  const [facilityErrors, setFacilityErrors] = useState<Record<string, string>>({})
  const [passwordFields, setPasswordFields] = useState({ current: "", next: "", confirm: "" })
  const [passwordError, setPasswordError] = useState("")
  const [saving, setSaving] = useState(false)
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 })
  const [openAddDate, setOpenAddDate] = useState(false)
  const [closedDates, setClosedDates] = useState<ClosedDateRecord[]>([])

  const refreshClosedDates = useCallback(() => {
    setClosedDates(getClosedDates(facilityId))
  }, [facilityId])

  useEffect(() => {
    refreshClosedDates()
    const handleUpdate = () => refreshClosedDates()
    window.addEventListener("silang:closed-dates-updated", handleUpdate)
    return () => window.removeEventListener("silang:closed-dates-updated", handleUpdate)
  }, [refreshClosedDates])

  const loadSettings = useCallback(async () => {
    if (!token || !userId) return
    try {
      const userResponse = await apiRequest<{ result: { first_name?: string; last_name?: string; phone_number?: string; email?: string } }>(`/user/${encodeURIComponent(userId)}`, { token })
      const user = userResponse.result
      setAccount({ first_name: user.first_name ?? "", last_name: user.last_name ?? "", phone_number: user.phone_number ?? "", email: user.email ?? "" })
      if (facilityId) {
        const facilityResponse = await apiRequest<{ result: { facility_name?: string; type?: string; contact_number?: string; email?: string; address?: string } }>(`/facility/${encodeURIComponent(facilityId)}`, { token })
        const current = facilityResponse.result
        setFacility({ facility_name: current.facility_name ?? "", type: current.type ?? "Rural Health Unit", contact_number: current.contact_number ?? "", email: current.email ?? "", address: current.address ?? "" })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load settings")
    }
  }, [token, userId, facilityId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSettings() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadSettings])
  useEffect(() => {
    void navigator.storage?.estimate?.().then((estimate) => setStorageUsage({ used: estimate.usage ?? 0, quota: estimate.quota ?? 0 })).catch(() => undefined)
  }, [])

  const saveProfile = async () => {
    const parsed = z.object({
      first_name: z.string().trim().min(1, "First name is required."),
      last_name: z.string().trim().min(1, "Last name is required."),
      phone_number: z.string().trim().optional(),
      email: z.string().trim().email("Enter a valid email address.").or(z.literal("")),
    }).safeParse(account)
    if (!parsed.success) {
      setAccountErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return
    }
    if (!token) return toast.error("Your session has expired. Sign in again.")
    setSaving(true)
    try {
      const response = await apiRequest<{ result: { first_name: string; last_name: string } }>("/user/profile", { method: "PUT", token, body: JSON.stringify(parsed.data) })
      window.dispatchEvent(new CustomEvent("silang:profile-updated", { detail: response.result }))
      toast.success("Profile saved")
      setAccountErrors({})
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save profile") }
    finally { setSaving(false) }
  }

  const saveFacility = async () => {
    const parsed = z.object({
      facility_name: z.string().trim().min(1, "Facility name is required."),
      type: z.string().min(1, "Select a facility type."),
      contact_number: z.string().trim().min(1, "Contact number is required."),
      email: z.string().trim().email("Enter a valid email address.").or(z.literal("")),
      address: z.string().trim().min(1, "Address is required."),
    }).safeParse(facility)
    if (!parsed.success) {
      setFacilityErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return
    }
    if (!token || !facilityId) return toast.error("No facility is associated with this account.")
    setSaving(true)
    try {
      const response = await apiRequest<{ result: { facility_id: string; facility_name: string; type: string; facility_profile_url?: string | null } }>("/facility/update", { method: "PUT", token, body: JSON.stringify({ ...parsed.data, facility_id: facilityId }) })
      window.dispatchEvent(new CustomEvent("silang:facility-updated", { detail: response.result }))
      toast.success("Facility profile saved")
      setFacilityErrors({})
      await loadSettings()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save facility profile") }
    finally { setSaving(false) }
  }

  const updatePassword = async () => {
    const parsed = z.object({ current: z.string().min(1, "Enter your current password."), next: z.string().min(6, "Use at least 6 characters."), confirm: z.string() }).refine((values) => values.next === values.confirm, { path: ["confirm"], message: "Passwords do not match." }).safeParse(passwordFields)
    if (!parsed.success) { setPasswordError(parsed.error.issues[0]?.message ?? "Check the password fields."); return }
    if (!token) return toast.error("Your session has expired. Sign in again.")
    setSaving(true)
    try {
      await apiRequest("/auth/change-password", { method: "POST", token, body: JSON.stringify({ currentPassword: parsed.data.current, newPassword: parsed.data.next }) })
      toast.success("Password updated")
      setPasswordFields({ current: "", next: "", confirm: "" })
      setPasswordError("")
    } catch (error) { setPasswordError(error instanceof Error ? error.message : "Unable to update password") }
    finally { setSaving(false) }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose?.() }}>
    <DialogContent showCloseButton={false} className="flex h-[min(82dvh,720px)] max-h-[82dvh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground sm:max-w-4xl">
    <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Close settings" onClick={onClose} className="absolute right-3 top-3 z-20 size-8"><X className="size-4" /></Button></TooltipTrigger><TooltipContent>Close settings</TooltipContent></Tooltip></TooltipProvider>
    <Tabs value={activeSection} onValueChange={setActiveSection} orientation="vertical" className="!grid h-full min-h-0 w-full min-w-0 grid-cols-1 gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto border-b border-sidebar-border bg-muted/30 p-4 md:border-b-0 md:border-r md:px-5 md:py-6">
        <DialogHeader className="items-start pr-8 text-left">
          <DialogTitle className="text-base font-semibold text-foreground">Settings</DialogTitle>
          <DialogDescription className="text-xs">Manage your account and facility preferences.</DialogDescription>
        </DialogHeader>
        <nav aria-label="Settings sections" className="mt-4 flex gap-1 overflow-x-auto md:mt-8 md:flex-col">
          {[
            { value: "account", label: "My Account", Icon: UserRound },
            { value: "facility", label: "Facility Profile", Icon: Building2 },
            { value: "offline", label: "Offline & Sync", Icon: WifiOff },
            { value: "notifications", label: "Notifications", Icon: Bell },
            { value: "Calendar", label: "Calendar", Icon: CalendarIcon},
          ].map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-current={activeSection === value ? "page" : undefined}
              onClick={() => setActiveSection(value)}
              className={`flex min-w-max items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors md:w-full ${activeSection === value ? "bg-background font-medium text-foreground dark:shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto p-4 pt-12 md:p-5">
        <div className="mb-4 pr-9 md:hidden"><DialogHeader><DialogTitle className="text-base font-semibold text-foreground">Settings</DialogTitle><DialogDescription className="text-xs">Manage your account and facility preferences.</DialogDescription></DialogHeader></div>

      <TabsContent value="account" className="mt-0 w-full space-y-4">
        <SettingsSubtabs value={accountTab} onChange={setAccountTab} items={[{ value: "profile", label: "Personal Information" }, { value: "security", label: "Security & Offline Access" }]} />
        {accountTab === "profile" && (
        <Card className="rounded-md border-sidebar-border shadow-none ring-0">
          <CardHeader><CardTitle>Personal Information</CardTitle><p className="text-xs text-muted-foreground">Update your personal details and contact information.</p></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name" required><Input value={account.first_name} onChange={(event) => { setAccount({ ...account, first_name: event.target.value }); setAccountErrors({ ...accountErrors, first_name: "" }) }} placeholder="First name" aria-invalid={Boolean(accountErrors.first_name)} />{accountErrors.first_name && <p className="text-xs text-destructive">{accountErrors.first_name}</p>}</Field>
              <Field label="Last Name" required><Input value={account.last_name} onChange={(event) => { setAccount({ ...account, last_name: event.target.value }); setAccountErrors({ ...accountErrors, last_name: "" }) }} placeholder="Last name" aria-invalid={Boolean(accountErrors.last_name)} />{accountErrors.last_name && <p className="text-xs text-destructive">{accountErrors.last_name}</p>}</Field>
              <Field label="Phone Number"><Input type="tel" value={account.phone_number} onChange={(event) => setAccount({ ...account, phone_number: event.target.value })} placeholder="09XX XXX XXXX" /></Field>
              <Field label="Email Address"><Input type="email" value={account.email} onChange={(event) => { setAccount({ ...account, email: event.target.value }); setAccountErrors({ ...accountErrors, email: "" }) }} placeholder="name@example.com" aria-invalid={Boolean(accountErrors.email)} />{accountErrors.email && <p className="text-xs text-destructive">{accountErrors.email}</p>}</Field>
            </div>
            <div className="flex justify-end"><Button onClick={() => void saveProfile()} disabled={saving} className="h-8 px-3 text-xs">{saving ? "Saving…" : "Save Profile"}</Button></div>
          </CardContent>
        </Card>
        )}
        {accountTab === "security" && (
        <Card className="rounded-md border-sidebar-border shadow-none ring-0">
          <CardHeader><CardTitle>Security &amp; Offline Access</CardTitle><p className="text-xs text-muted-foreground">Manage account credentials and local device protection.</p></CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-3">
              <div><h3 className="text-sm font-semibold text-foreground">Change Password</h3><p className="mt-1 text-xs text-muted-foreground">Update your sign-in credentials.</p></div>
              <Field label="Current Password" required><Input type="password" autoComplete="current-password" value={passwordFields.current} onChange={(event) => { setPasswordFields({ ...passwordFields, current: event.target.value }); setPasswordError("") }} placeholder="Enter current password" /></Field>
              <Field label="New Password" required><Input type="password" autoComplete="new-password" value={passwordFields.next} onChange={(event) => { setPasswordFields({ ...passwordFields, next: event.target.value }); setPasswordError("") }} placeholder="At least 6 characters" /></Field>
              <Field label="Confirm New Password" required><Input type="password" autoComplete="new-password" value={passwordFields.confirm} onChange={(event) => { setPasswordFields({ ...passwordFields, confirm: event.target.value }); setPasswordError("") }} placeholder="Re-enter new password" /></Field>
              {passwordError && <p className="text-xs text-destructive" role="alert">{passwordError}</p>}
              <Button variant="outline" disabled={saving} onClick={() => void updatePassword()} className="h-8 px-3 text-xs">{saving ? "Updating…" : "Update Password"}</Button>
            </section>
            <section className="space-y-3">
              <div><h3 className="text-sm font-semibold text-foreground">Offline PIN Lock</h3><p className="mt-1 text-xs text-muted-foreground">Protect access to records stored on this device.</p></div>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200">Protects sensitive patient records cached locally if this device is lost or accessed while offline.</div>
              <Field label="4–6 Digit Security PIN"><Input disabled inputMode="numeric" type="password" maxLength={6} placeholder="Managed during system entry" /></Field>
              <Button variant="outline" disabled className="h-8 px-3 text-xs" title="Offline PIN setup is prompted when you enter the system.">Update Offline PIN</Button>
            </section>
          </CardContent>
        </Card>
        )}
      </TabsContent>

      <TabsContent value="facility" className="mt-0 w-full">
        <Card className="rounded-md border-sidebar-border shadow-none ring-0">
          <CardHeader><CardTitle>Clinic Identification</CardTitle><p className="text-xs text-muted-foreground">Manage official facility details and contact information.</p></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sidebar-border bg-muted/30 p-3">
              <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-md bg-muted"><Building2 className="size-5 text-muted-foreground" /></span><div><p className="text-xs font-medium">Facility Logo / Branding</p><p className="text-xs text-muted-foreground">Used in the sidebar, transfer slips, and reports.</p></div></div>
              <Button variant="outline" disabled title="Facility logo upload is not available from the connected API." className="h-8 gap-1.5 px-3 text-xs"><Upload className="size-3.5" />Upload Logo</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Facility Name" required><Input value={facility.facility_name} onChange={(event) => { setFacility({ ...facility, facility_name: event.target.value }); setFacilityErrors({ ...facilityErrors, facility_name: "" }) }} placeholder="Facility name" aria-invalid={Boolean(facilityErrors.facility_name)} />{facilityErrors.facility_name && <p className="text-xs text-destructive">{facilityErrors.facility_name}</p>}</Field>
              <Field label="Facility Type" required><Select value={facility.type} onValueChange={(value) => { setFacility({ ...facility, type: value }); setFacilityErrors({ ...facilityErrors, type: "" }) }}><SelectTrigger className="w-full"><SelectValue placeholder="Select facility type" /></SelectTrigger><SelectContent>{[...new Set([facility.type, "RHU", "BHS", "Hospital"].filter(Boolean))].map((type) => <SelectItem key={type} value={type}>{type === "RHU" ? "Rural Health Unit" : type === "BHS" ? "Barangay Health Station" : type}</SelectItem>)}</SelectContent></Select>{facilityErrors.type && <p className="text-xs text-destructive">{facilityErrors.type}</p>}</Field>
              <Field label="Contact Number" required><Input value={facility.contact_number} onChange={(event) => { setFacility({ ...facility, contact_number: event.target.value }); setFacilityErrors({ ...facilityErrors, contact_number: "" }) }} placeholder="09XX XXX XXXX" aria-invalid={Boolean(facilityErrors.contact_number)} />{facilityErrors.contact_number && <p className="text-xs text-destructive">{facilityErrors.contact_number}</p>}</Field>
              <Field label="Official Email"><Input type="email" value={facility.email} onChange={(event) => { setFacility({ ...facility, email: event.target.value }); setFacilityErrors({ ...facilityErrors, email: "" }) }} placeholder="facility@example.com" aria-invalid={Boolean(facilityErrors.email)} />{facilityErrors.email && <p className="text-xs text-destructive">{facilityErrors.email}</p>}</Field>
            </div>
            <Field label="Complete Address" required><Textarea value={facility.address} onChange={(event) => { setFacility({ ...facility, address: event.target.value }); setFacilityErrors({ ...facilityErrors, address: "" }) }} placeholder="Complete facility address" className="min-h-20" aria-invalid={Boolean(facilityErrors.address)} />{facilityErrors.address && <p className="text-xs text-destructive">{facilityErrors.address}</p>}</Field>
            <div className="flex justify-end"><Button onClick={() => void saveFacility()} disabled={saving} className="h-8 px-3 text-xs">{saving ? "Saving…" : "Save Clinic Identification"}</Button></div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="offline" className="mt-0 w-full space-y-4">
        <SettingsSubtabs value={offlineTab} onChange={setOfflineTab} items={[{ value: "storage", label: "Storage Health" }, { value: "sync", label: "Synchronization Rules" }]} />
        {offlineTab === "storage" && (
        <Card className="rounded-md border-sidebar-border shadow-none ring-0">
          <CardHeader><CardTitle>Local Storage Health</CardTitle><p className="mt-1 text-xs text-muted-foreground">Local cache status for offline maternal records.</p></CardHeader>
          <CardContent className="max-w-2xl space-y-3">
            <div className="flex items-center justify-between text-xs"><span className="font-medium">Storage Quota</span><span><strong className="text-foreground">{(storageUsage.used / (1024 * 1024)).toFixed(2)} MB</strong><span className="text-muted-foreground"> / {storageUsage.quota ? (storageUsage.quota / (1024 * 1024)).toFixed(0) : "—"} MB Used</span></span></div>
            <Progress value={storageUsage.quota ? Math.min(100, storageUsage.used / storageUsage.quota * 100) : 0} className="h-2 bg-amber-500/15 [&_[data-slot=progress-indicator]]:bg-emerald-500 dark:bg-amber-400/15 dark:[&_[data-slot=progress-indicator]]:bg-emerald-400" />
            <p className="text-xs text-muted-foreground">Cached registry data is available for offline viewing.</p>
          </CardContent>
        </Card>
        )}
        {offlineTab === "sync" && (
        <Card className="rounded-md border-sidebar-border shadow-none ring-0">
          <CardHeader><CardTitle>Synchronization Rules</CardTitle><p className="text-xs text-muted-foreground">Configure how the app syncs data when connectivity returns.</p></CardHeader>
          <CardContent className="max-w-2xl space-y-3"><SettingToggle title="Auto-Sync on Reconnect" description="Automatically upload queued records when internet is restored." defaultChecked /><SettingToggle title="Download Historical Records" description="Keep older maternal records available for offline viewing." /></CardContent>
        </Card>
        )}
      </TabsContent>

      <TabsContent value="notifications" className="mt-0 w-full">
        <div className="space-y-4">
        <SettingsSubtabs value={notificationTab} onChange={setNotificationTab} items={[{ value: "channels", label: "Channel Status" }, { value: "triggers", label: "Trigger Preferences" }, { value: "preferences", label: "Notification Preferences" }]} />

        {notificationTab === "channels" && (
          <Card className="rounded-md border-sidebar-border shadow-none ring-0">
            <CardHeader><CardTitle>Channel Status</CardTitle><p className="text-xs text-muted-foreground">Channel health is not exposed by the connected backend.</p></CardHeader>
            <CardContent className="max-w-2xl space-y-2">
              {[["Firebase Cloud Messaging (FCM)", "Used for app push notifications."], ["Semaphore SMS Gateway", "Fallback for mothers without smartphones."], ["Resend Email", "Used for official transfers and alerts."]].map(([title, description]) => <div key={title} className="flex items-center justify-between gap-4 rounded-md border border-sidebar-border bg-muted/20 p-3"><div><p className="text-xs font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div><StatusBadge status="Unknown" /></div>)}
            </CardContent>
          </Card>
        )}

        {notificationTab === "triggers" && (
          <Card className="rounded-md border-sidebar-border shadow-none ring-0">
            <CardHeader><CardTitle>Trigger Preferences</CardTitle><p className="text-xs text-muted-foreground">Manage automated messages sent to patients and staff.</p></CardHeader>
            <CardContent className="max-w-2xl space-y-3"><SettingToggle title="Automated ANC Reminders" description="Send SMS reminders before scheduled prenatal visits." defaultChecked /><SettingToggle title="Post-Referral SMS" description="Notify mothers when their hospital transfer is accepted." defaultChecked /></CardContent>
          </Card>
        )}

        {notificationTab === "preferences" && (
          <Card className="rounded-md border-sidebar-border shadow-none ring-0">
            <CardHeader><CardTitle>Notification Preferences</CardTitle><p className="text-xs text-muted-foreground">Choose where you receive system updates.</p></CardHeader>
            <CardContent className="max-w-2xl space-y-3"><SettingToggle title="Allow All Notifications" description="Master control for incoming alerts." defaultChecked /><SettingToggle title="In-App Notifications" description="Show alerts in the system notification center." defaultChecked /><SettingToggle title="Email Notifications" description="Send important updates to your email." defaultChecked /><SettingToggle title="Push Notifications" description="Receive alerts on this device." defaultChecked /></CardContent>
          </Card>
        )}
        </div>
      </TabsContent>

      <TabsContent value="Calendar" className="mt-0 w-full space-y-4">
        <Card className="rounded-md border-sidebar-border shadow-none ring-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Facility Calendar</CardTitle>
              <p className="text-xs text-muted-foreground">Manage clinic closed dates and scheduling exceptions.</p>
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={() => setOpenAddDate(true)}>
              Add Closed Date
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs font-medium">
              <span>Closed Dates & Exemptions</span>
              <span className="text-muted-foreground font-normal">{closedDates.length} date{closedDates.length === 1 ? "" : "s"}</span>
            </div>

            {closedDates.length === 0 ? (
              <div className="rounded-md border border-sidebar-border bg-muted/20 p-4 text-xs text-muted-foreground">
                No closed dates configured.
              </div>
            ) : (
              <div className="space-y-2">
                {closedDates.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-sidebar-border bg-card p-3 transition-colors hover:bg-muted/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <CalendarIcon className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{item.date}</p>
                        <p className="text-[11px] text-muted-foreground">{item.reason}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        removeClosedDate(item.id, facilityId)
                        toast.success(`Removed closed date ${item.date}`)
                      }}
                      aria-label={`Remove closed date ${item.date}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      </div>
    </Tabs>
    <AddDate
      open={openAddDate}
      onClose={() => setOpenAddDate(false)}
      facilityId={facilityId}
      onDateAdded={refreshClosedDates}
    />
    </DialogContent>
  </Dialog>
}
