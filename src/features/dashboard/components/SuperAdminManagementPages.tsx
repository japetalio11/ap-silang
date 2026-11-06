import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Bell, Building2, Database, Download, Edit2, Hospital, PlusCircle, RefreshCw, RotateCcw, Search, ShieldCheck, Trash2, Wifi, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { TableRowActions } from "@/components/ui/table-row-actions"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

type FacilityKind = "rhu" | "bhs"
type Facility = { id: string; name: string; code: string; location: string; parent: string; contact: string; status: "Active" | "Inactive"; staff: number }

const seedRhus: Facility[] = [
  { id: "rhu-001", name: "Rural Health Unit 1", code: "RHU-001", location: "Pili, Camarines Sur", parent: "Municipal Health Office", contact: "0968 625 5210", status: "Active", staff: 12 },
  { id: "rhu-002", name: "Rural Health Unit 2", code: "RHU-002", location: "Naga, Camarines Sur", parent: "Municipal Health Office", contact: "0917 555 0142", status: "Active", staff: 8 },
  { id: "rhu-003", name: "Rural Health Unit 3", code: "RHU-003", location: "Bula, Camarines Sur", parent: "Municipal Health Office", contact: "0917 555 0188", status: "Inactive", staff: 0 },
]
const seedBhss: Facility[] = [
  { id: "bhs-001", name: "San Isidro BHS", code: "BHS-001", location: "San Isidro, Pili", parent: "Rural Health Unit 1", contact: "0912 345 6789", status: "Active", staff: 4 },
  { id: "bhs-002", name: "Carolina BHS", code: "BHS-002", location: "Carolina, Pili", parent: "Rural Health Unit 1", contact: "0920 123 4567", status: "Active", staff: 3 },
  { id: "bhs-003", name: "Himaao BHS", code: "BHS-003", location: "Himaao, Pili", parent: "Rural Health Unit 1", contact: "—", status: "Inactive", staff: 0 },
  { id: "bhs-004", name: "Anayan BHS", code: "BHS-004", location: "Anayan, Pili", parent: "Rural Health Unit 2", contact: "0917 222 0400", status: "Active", staff: 2 },
]

const filterOptions = ["Active", "Inactive"]

function exportCsv(filename: string, rows: string[][]) {
  const csv = `\ufeff${rows.map((row) => row.map((item) => `"${item.replaceAll('"', '""')}"`).join(",")).join("\r\n")}`
  const link = document.createElement("a")
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function FacilityManagementPage({ kind }: { kind: FacilityKind }) {
  const isRhu = kind === "rhu"
  const location = useLocation()
  const navigate = useNavigate()
  const [facilities, setFacilities] = useState<Facility[]>(() => (isRhu ? seedRhus : seedBhss).map((row) => ({ ...row })))
  const [tab, setTab] = useState("all")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Facility | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null)
  const [form, setForm] = useState({ name: "", code: "", location: "", parent: "", contact: "" })
  const title = isRhu ? "Rural Health Units" : "Barangay Health Stations"
  const singular = isRhu ? "Rural Health Unit" : "Barangay Health Station"
  const parentLabel = isRhu ? "Administrative Office" : "Parent RHU"

  useEffect(() => {
    if (!(location.state as { openCreate?: boolean } | null)?.openCreate) return
    const timer = window.setTimeout(() => {
      setEditing(null)
      setForm({ name: "", code: "", location: "", parent: isRhu ? "Municipal Health Office" : "Rural Health Unit 1", contact: "" })
      setDialogOpen(true)
      navigate(location.pathname, { replace: true, state: null })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.state, navigate, isRhu])

  const filtered = useMemo(() => facilities.filter((facility) => {
    const matchesTab = tab === "all" || (tab === "active" ? facility.status === "Active" : facility.status === "Inactive")
    const term = query.trim().toLowerCase()
    const matchesSearch = !term || [facility.name, facility.code, facility.location, facility.parent, facility.contact].some((value) => value.toLowerCase().includes(term))
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(facility.status)
    return matchesTab && matchesSearch && matchesStatus
  }), [facilities, query, statusFilter, tab])
  const activeFilters = statusFilter.length > 0 || query.trim().length > 0

  const openCreate = (facility?: Facility) => {
    setEditing(facility ?? null)
    setForm(facility ? { name: facility.name, code: facility.code, location: facility.location, parent: facility.parent, contact: facility.contact === "—" ? "" : facility.contact } : { name: "", code: "", location: "", parent: isRhu ? "Municipal Health Office" : "Rural Health Unit 1", contact: "" })
    setDialogOpen(true)
  }
  const saveFacility = () => {
    if (!form.name.trim() || !form.code.trim() || !form.location.trim()) {
      toast.error("Enter a name, facility code, and location")
      return
    }
    if (editing) {
      setFacilities((current) => current.map((facility) => facility.id === editing.id ? { ...facility, ...form, contact: form.contact || "—" } : facility))
      toast.success(`${singular} updated`)
    } else {
      const newFacility: Facility = { id: `${kind}-${Date.now()}`, ...form, contact: form.contact || "—", parent: form.parent || (isRhu ? "Municipal Health Office" : "Rural Health Unit 1"), status: "Active", staff: 0 }
      setFacilities((current) => [newFacility, ...current])
      toast.success(`${singular} added`)
    }
    setDialogOpen(false)
  }
  const toggleStatus = (facility: Facility) => {
    const status = facility.status === "Active" ? "Inactive" : "Active"
    setFacilities((current) => current.map((row) => row.id === facility.id ? { ...row, status } : row))
    toast.success(`${facility.name} ${status === "Active" ? "activated" : "deactivated"}`)
  }

  return <section className="w-full space-y-3 px-4 py-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="all">All {isRhu ? "RHUs" : "BHS"} ({facilities.length})</TabsTrigger><TabsTrigger value="active">Active</TabsTrigger><TabsTrigger value="inactive">Inactive</TabsTrigger></TabsList></Tabs>
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="outline" size="icon" className="size-8" aria-label={`Export ${title}`} title="Export" onClick={() => { exportCsv(`${kind}-registry.csv`, [["Name", "Code", "Location", parentLabel, "Contact", "Staff", "Status"], ...filtered.map((row) => [row.name, row.code, row.location, row.parent, row.contact, String(row.staff), row.status])]); toast.success(`${title} exported`) }}><Download className="size-4" /></Button>
        <Button variant="outline" size="icon" className="size-8" aria-label="Refresh" title="Refresh" onClick={() => toast.success(`${title} refreshed`)}><RefreshCw className="size-4" /></Button>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => openCreate()}><PlusCircle className="size-4" />Add {singular}</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-[300px]"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${isRhu ? "by facility name, code, or municipality..." : "by station, barangay, or parent RHU..."}`} className="h-8 w-full border-sidebar-border bg-muted/70 px-2 pl-8 text-xs dark:bg-muted/60" /></div>
      <Popover><PopoverTrigger asChild><Button variant="filter" size="filter"><PlusCircle className="size-3.5" />Status</Button></PopoverTrigger><PopoverContent align="start" className="w-56 p-3"><div className="flex flex-col gap-3">{filterOptions.map((status) => <label key={status} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={statusFilter.includes(status)} onCheckedChange={() => setStatusFilter((items) => items.includes(status) ? items.filter((item) => item !== status) : [...items, status])} className="size-3.5 rounded-[4px] border-sidebar-border" />{status}</label>)}</div></PopoverContent></Popover>
      {activeFilters && <Button variant="ghost" className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground" onClick={() => { setQuery(""); setStatusFilter([]) }}><RotateCcw className="size-3.5" />Reset Filter</Button>}
    </div>
    <div className="w-full overflow-hidden rounded-lg border border-sidebar-border">
      <Table>
        <TableHeader><TableRow><TableHead className="w-10 px-3"><Checkbox aria-label="Select all facilities" checked={filtered.length > 0 && selected.length === filtered.length} onCheckedChange={(checked) => setSelected(checked ? filtered.map((row) => row.id) : [])} /></TableHead><TableHead>{isRhu ? "Rural Health Unit" : "Health Station"}</TableHead><TableHead>Code</TableHead><TableHead>{isRhu ? "Municipality / Address" : "Barangay"}</TableHead><TableHead>{parentLabel}</TableHead><TableHead>Staff</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
        <TableBody>{filtered.map((facility) => <TableRow key={facility.id} data-state={selected.includes(facility.id) ? "selected" : undefined}>
          <TableCell className="px-3"><Checkbox aria-label={`Select ${facility.name}`} checked={selected.includes(facility.id)} onCheckedChange={(checked) => setSelected((items) => checked ? [...items, facility.id] : items.filter((id) => id !== facility.id))} /></TableCell>
          <TableCell><div className="font-medium">{facility.name}</div><div className="text-xs text-muted-foreground">{facility.contact}</div></TableCell><TableCell><span className="rounded-sm border border-sidebar-border bg-muted px-1.5 py-0.5 font-mono text-xs dark:bg-[#222]">{facility.code}</span></TableCell><TableCell>{facility.location}</TableCell><TableCell>{facility.parent}</TableCell><TableCell>{facility.staff}</TableCell><TableCell><StatusBadge status={facility.status} /></TableCell>
          <TableCell><TableRowActions label={`Actions for ${facility.name}`}><DropdownMenuItem onClick={() => openCreate(facility)}><Edit2 className="mr-2 size-4" />Edit details</DropdownMenuItem><DropdownMenuItem onClick={() => toggleStatus(facility)}>{facility.status === "Active" ? "Deactivate facility" : "Activate facility"}</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(facility)}><Trash2 className="mr-2 size-4" />Delete facility</DropdownMenuItem></TableRowActions></TableCell>
        </TableRow>)}{filtered.length === 0 && <TableEmptyState colSpan={8} icon={isRhu ? Hospital : Building2} title={`No ${isRhu ? "rural health units" : "barangay health stations"} found`} description={activeFilters ? "Adjust or reset your filters to see facility records." : `Add a ${singular.toLowerCase()} to begin managing the network.`} action={!activeFilters ? <Button size="sm" onClick={() => openCreate()}><PlusCircle className="mr-1.5 size-4" />Add {singular}</Button> : undefined} />}</TableBody>
      </Table>
    </div>
    <TablePaginationFooter rowCount={filtered.length} selectedCount={selected.length} />
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? `Edit ${singular}` : `Add ${singular}`}</DialogTitle><DialogDescription>Maintain facility information for the Silang care network.</DialogDescription></DialogHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Facility name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={isRhu ? "Rural Health Unit 1" : "San Isidro BHS"} /></div>
        <div className="space-y-2"><Label>Facility code <span className="text-destructive">*</span></Label><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder={isRhu ? "RHU-001" : "BHS-001"} /></div>
        <div className="space-y-2"><Label>{isRhu ? "Municipality / Address" : "Barangay"} <span className="text-destructive">*</span></Label><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder={isRhu ? "Pili, Camarines Sur" : "San Isidro, Pili"} /></div>
        <div className="space-y-2"><Label>{parentLabel}</Label><Input value={form.parent} onChange={(event) => setForm({ ...form, parent: event.target.value })} placeholder={isRhu ? "Municipal Health Office" : "Rural Health Unit 1"} /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Contact number</Label><Input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="09XX XXX XXXX" /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={saveFacility}>{editing ? "Save Changes" : `Add ${singular}`}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete {singular.toLowerCase()}?</DialogTitle><DialogDescription>This will remove {deleteTarget?.name} from this local superadmin view. This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" onClick={() => { if (deleteTarget) setFacilities((rows) => rows.filter((row) => row.id !== deleteTarget.id)); toast.success(`${singular} deleted`); setDeleteTarget(null) }}>Delete facility</Button></DialogFooter></DialogContent></Dialog>
  </section>
}

const settingsSections = [
  { value: "network", label: "Network & Sync", Icon: Wifi, description: "Manage service connectivity and offline data exchange.", rows: [{ id: "sync", title: "Offline synchronization", description: "Allow facility workspaces to sync queued records when online.", checked: true }, { id: "gateway", title: "Referral gateway", description: "Allow secure referral handovers between facilities.", checked: true }] },
  { value: "facilities", label: "Facilities", Icon: Building2, description: "Set defaults used across registered facilities.", rows: [{ id: "facility-onboarding", title: "Allow facility onboarding", description: "Let superadmins add RHUs and barangay health stations.", checked: true }, { id: "require-contact", title: "Require facility contact details", description: "Prompt for a contact number when creating a facility.", checked: false }] },
  { value: "security", label: "Security", Icon: ShieldCheck, description: "Configure baseline safeguards for network accounts.", rows: [{ id: "session-timeout", title: "Automatic session timeout", description: "Sign out inactive accounts after 30 minutes.", checked: true }, { id: "sensitive-actions", title: "Confirm sensitive changes", description: "Ask for confirmation before disabling or removing a facility.", checked: true }] },
  { value: "notifications", label: "Notifications", Icon: Bell, description: "Choose which network events appear to administrators.", rows: [{ id: "facility-alerts", title: "Facility status alerts", description: "Notify administrators when a facility is activated or deactivated.", checked: true }, { id: "sync-alerts", title: "Synchronization alerts", description: "Notify administrators when a sync issue needs attention.", checked: true }] },
  { value: "data", label: "Data & Retention", Icon: Database, description: "Review platform data handling defaults.", rows: [{ id: "audit-log", title: "Administrative activity log", description: "Keep a local record of superadmin changes in this workspace.", checked: true }] },
]

export function SuperAdminSettingsDialog() {
  const navigate = useNavigate()
  const location = useLocation()
  const [section, setSection] = useState("network")
  const [values, setValues] = useState<Record<string, boolean>>(() => Object.fromEntries(settingsSections.flatMap((group) => group.rows.map((row) => [row.id, row.checked]))))
  const current = settingsSections.find((item) => item.value === section) ?? settingsSections[0]
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo
  const close = () => navigate(returnTo?.startsWith("/superadmin/") && returnTo !== "/superadmin/settings" ? returnTo : "/superadmin/rhu-management", { replace: true })

  return <Dialog open onOpenChange={(open) => { if (!open) close() }}>
    <DialogContent showCloseButton={false} className="flex h-[min(82dvh,720px)] max-h-[82dvh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground sm:max-w-4xl">
      <Button variant="ghost" size="icon" aria-label="Close settings" onClick={close} className="absolute right-3 top-3 z-20 size-8"><X className="size-4" /></Button>
      <div className="grid h-full min-h-0 w-full grid-cols-1 gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto border-b border-sidebar-border bg-muted/30 p-4 md:border-b-0 md:border-r md:px-5 md:py-6">
          <DialogHeader className="items-start pr-8 text-left"><DialogTitle className="text-base font-semibold">Settings</DialogTitle><DialogDescription className="text-xs">Manage network administration preferences.</DialogDescription></DialogHeader>
          <nav aria-label="Settings sections" className="mt-3 flex gap-1 overflow-x-auto md:mt-5 md:flex-col">
            {settingsSections.map(({ value, label, Icon }) => <button key={value} type="button" aria-current={section === value ? "page" : undefined} onClick={() => setSection(value)} className={`flex min-w-max items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors md:w-full ${section === value ? "bg-background font-medium text-foreground dark:shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}><Icon className="size-4 shrink-0" /><span>{label}</span></button>)}
          </nav>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto p-4 pt-12 md:p-6">
          <div className="mb-5 pr-9"><h2 className="text-sm font-semibold">{current.label}</h2><p className="mt-1 text-xs text-muted-foreground">{current.description}</p></div>
          <div className="space-y-3">
            {current.rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-4 rounded-md border border-sidebar-border p-3"><div className="min-w-0"><p className="text-xs font-medium">{row.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p></div><Switch checked={values[row.id] ?? row.checked} onCheckedChange={(checked) => { setValues((previous) => ({ ...previous, [row.id]: checked })); toast.success(`${row.title} ${checked ? "enabled" : "disabled"}`) }} aria-label={row.title} /></div>)}
          </div>
          <div className="mt-auto flex justify-end pt-6"><Button variant="outline" className="h-8 px-3 text-xs" onClick={close}>Done</Button></div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
}

export function SuperAdminRhuManagementPage() { return <FacilityManagementPage kind="rhu" /> }
export function SuperAdminBhsManagementPage() { return <FacilityManagementPage kind="bhs" /> }
