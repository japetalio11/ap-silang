import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Building2, Download, Edit2, ExternalLink, Hospital, PlusCircle, RefreshCw, RotateCcw, Search, Trash2, Wifi, ShieldCheck, Bell, Database, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { TableRowActions } from "@/components/ui/table-row-actions"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useAuthSession } from "@/features/auth/auth-session"
import {
  fetchAllFacilities,
  createFacilityRecord,
  updateFacilityRecord,
  deleteFacilityRecord,
  fetchMunicipalOverview,
  type FacilityItem,
} from "../api/superadmin-api"

type FacilityKind = "rhu" | "bhs"

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
  const { session } = useAuthSession()

  const [facilities, setFacilities] = useState<FacilityItem[]>([])
  const [facilityStaffCounts, setFacilityStaffCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("all")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<FacilityItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FacilityItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    facility_name: "",
    type: isRhu ? "RHU" : "BHS",
    address: "",
    contact_number: "",
    email: "",
  })

  const title = isRhu ? "Rural Health Units" : "Barangay Health Stations"
  const singular = isRhu ? "Rural Health Unit" : "Barangay Health Station"

  const loadData = async () => {
    if (!session?.token) return
    setLoading(true)
    try {
      const [list, overview] = await Promise.all([
        fetchAllFacilities(session.token),
        fetchMunicipalOverview(session.token).catch(() => null),
      ])
      setFacilities(list)

      if (overview?.facilitiesSummary) {
        const counts: Record<string, number> = {}
        for (const item of overview.facilitiesSummary) {
          counts[item.facility_id] = item._count?.users ?? 0
        }
        setFacilityStaffCounts(counts)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load facilities"
      toast.error("Error loading facilities", { description: message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [session?.token])

  useEffect(() => {
    if (!(location.state as { openCreate?: boolean } | null)?.openCreate) return
    const timer = window.setTimeout(() => {
      setEditing(null)
      setForm({
        facility_name: "",
        type: isRhu ? "RHU" : "BHS",
        address: "",
        contact_number: "",
        email: "",
      })
      setDialogOpen(true)
      navigate(location.pathname, { replace: true, state: null })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.state, navigate, isRhu])

  const kindFiltered = useMemo(() => {
    return facilities.filter((f) => {
      const normalizedType = (f.type || "").toLowerCase()
      if (isRhu) {
        return (
          normalizedType.includes("rhu") ||
          normalizedType.includes("rural") ||
          normalizedType.includes("center") ||
          !normalizedType.includes("bhs")
        )
      }
      return normalizedType.includes("bhs") || normalizedType.includes("barangay") || normalizedType.includes("station")
    })
  }, [facilities, isRhu])

  const filtered = useMemo(() => {
    return kindFiltered.filter((facility) => {
      const term = query.trim().toLowerCase()
      const matchesSearch =
        !term ||
        [facility.facility_name, facility.address, facility.contact_number, facility.email, facility.type].some(
          (value) => (value || "").toLowerCase().includes(term),
        )
      return matchesSearch
    })
  }, [kindFiltered, query])

  const openCreate = (facility?: FacilityItem) => {
    if (facility) {
      setEditing(facility)
      setForm({
        facility_name: facility.facility_name,
        type: facility.type,
        address: facility.address,
        contact_number: facility.contact_number,
        email: facility.email,
      })
    } else {
      setEditing(null)
      setForm({
        facility_name: "",
        type: isRhu ? "RHU" : "BHS",
        address: "",
        contact_number: "",
        email: "",
      })
    }
    setDialogOpen(true)
  }

  const saveFacility = async () => {
    if (!form.facility_name.trim() || !form.address.trim()) {
      toast.error("Validation error", { description: "Please enter the facility name and address." })
      return
    }

    if (!session?.token) {
      toast.error("Session expired", { description: "Please sign in again." })
      return
    }

    setSubmitting(true)
    try {
      if (editing) {
        await updateFacilityRecord(session.token, {
          facility_id: editing.facility_id,
          facility_name: form.facility_name.trim(),
          type: form.type.trim() || (isRhu ? "RHU" : "BHS"),
          address: form.address.trim(),
          contact_number: form.contact_number.trim(),
          email: form.email.trim(),
        })
        toast.success(`${singular} updated successfully`)
      } else {
        await createFacilityRecord(session.token, {
          facility_name: form.facility_name.trim(),
          type: form.type.trim() || (isRhu ? "RHU" : "BHS"),
          address: form.address.trim(),
          contact_number: form.contact_number.trim(),
          email: form.email.trim(),
        })
        toast.success(`${singular} registered successfully`)
      }
      setDialogOpen(false)
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save facility"
      toast.error("Operation failed", { description: message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !session?.token) return
    setDeleting(true)
    try {
      await deleteFacilityRecord(session.token, deleteTarget.facility_id)
      toast.success(`${singular} removed`)
      setDeleteTarget(null)
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete facility"
      toast.error("Cannot delete facility", { description: message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="w-full space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">
              All {isRhu ? "RHUs" : "BHSs"} ({kindFiltered.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={`Export ${title}`}
            title="Export CSV"
            onClick={() => {
              exportCsv(`${kind}-registry.csv`, [
                ["Facility ID", "Name", "Type", "Address", "Contact Number", "Email", "Staff Count"],
                ...filtered.map((row) => [
                  row.facility_id,
                  row.facility_name,
                  row.type,
                  row.address,
                  row.contact_number,
                  row.email,
                  String(facilityStaffCounts[row.facility_id] ?? 0),
                ]),
              ])
              toast.success(`${title} exported`)
            }}
          >
            <Download className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Refresh"
            title="Refresh"
            disabled={loading}
            onClick={() => {
              loadData()
              toast.success(`${title} refreshed`)
            }}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => openCreate()}>
            <PlusCircle className="size-4" />
            Add {singular}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[320px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${isRhu ? "by RHU name, address, or email..." : "by station, address, or contact..."}`}
            className="h-8 w-full border-sidebar-border bg-muted/70 px-2 pl-8 text-xs dark:bg-muted/60"
          />
        </div>
        {query.trim().length > 0 && (
          <Button
            variant="ghost"
            className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"
            onClick={() => setQuery("")}
          >
            <RotateCcw className="size-3.5" />
            Reset Filter
          </Button>
        )}
      </div>

      <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-3">
                <Checkbox
                  aria-label="Select all facilities"
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onCheckedChange={(checked) => setSelected(checked ? filtered.map((row) => row.facility_id) : [])}
                />
              </TableHead>
              <TableHead>{isRhu ? "Rural Health Unit" : "Health Station"}</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Municipality / Address</TableHead>
              <TableHead>Contact / Email</TableHead>
              <TableHead className="text-right">Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((facility) => (
              <TableRow
                key={facility.facility_id}
                data-state={selected.includes(facility.facility_id) ? "selected" : undefined}
                className="cursor-pointer hover:bg-muted/50"
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest("button") || target.closest("input") || target.closest("[role='checkbox']")) return
                  navigate(`/superadmin/facility/${facility.facility_id}`)
                }}
              >
                <TableCell className="px-3">
                  <Checkbox
                    aria-label={`Select ${facility.facility_name}`}
                    checked={selected.includes(facility.facility_id)}
                    onCheckedChange={(checked) =>
                      setSelected((items) =>
                        checked ? [...items, facility.facility_id] : items.filter((id) => id !== facility.facility_id),
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground hover:underline">{facility.facility_name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{facility.facility_id.slice(0, 8)}...</div>
                </TableCell>
                <TableCell>
                  <span className="rounded-sm border border-sidebar-border bg-muted px-1.5 py-0.5 font-mono text-xs dark:bg-[#222]">
                    {facility.type}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{facility.address}</TableCell>
                <TableCell>
                  <div className="text-xs">{facility.contact_number || "—"}</div>
                  {facility.email && <div className="text-[11px] text-muted-foreground">{facility.email}</div>}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {facilityStaffCounts[facility.facility_id] ?? 0}
                </TableCell>
                <TableCell>
                  <StatusBadge status="Active" />
                </TableCell>
                <TableCell>
                  <TableRowActions label={`Actions for ${facility.facility_name}`}>
                    <DropdownMenuItem onClick={() => navigate(`/superadmin/facility/${facility.facility_id}`)}>
                      <ExternalLink className="mr-2 size-4" />
                      View Facility Hub
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openCreate(facility)}>
                      <Edit2 className="mr-2 size-4" />
                      Edit details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(facility)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete facility
                    </DropdownMenuItem>
                  </TableRowActions>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableEmptyState
                colSpan={8}
                icon={isRhu ? Hospital : Building2}
                title={`No ${isRhu ? "rural health units" : "barangay health stations"} found`}
                description={
                  query.trim().length > 0
                    ? "Adjust or reset your search query to see facility records."
                    : `Add a ${singular.toLowerCase()} to begin managing the municipal network.`
                }
                action={
                  query.trim().length === 0 ? (
                    <Button size="sm" onClick={() => openCreate()}>
                      <PlusCircle className="mr-1.5 size-4" />
                      Add {singular}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationFooter rowCount={filtered.length} selectedCount={selected.length} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${singular}` : `Register ${singular}`}</DialogTitle>
            <DialogDescription>Maintain facility registry details for the Silang municipal health network.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Facility name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.facility_name}
                onChange={(event) => setForm({ ...form, facility_name: event.target.value })}
                placeholder={isRhu ? "Rural Health Unit 1" : "San Isidro BHS"}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Facility type <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
                placeholder={isRhu ? "RHU" : "BHS"}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Address / Location <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                placeholder={isRhu ? "Pili, Camarines Sur" : "Barangay San Isidro, Pili"}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact number</Label>
              <Input
                value={form.contact_number}
                onChange={(event) => setForm({ ...form, contact_number: event.target.value })}
                placeholder="09XX XXX XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Official Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="facility@silang.ph"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting} onClick={saveFacility}>
              {submitting ? "Saving..." : editing ? "Save Changes" : `Register ${singular}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {singular.toLowerCase()}?</DialogTitle>
            <DialogDescription>
              This will remove {deleteTarget?.facility_name} from the central municipal database. This action cannot be
              undone if there are no linked clinical records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting..." : "Delete facility"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

const SETTINGS_STORAGE_KEY = "silang.superadmin.settings"

const settingsSections = [
  {
    value: "network",
    label: "Network & Sync",
    Icon: Wifi,
    description: "Manage service connectivity and offline data exchange.",
    rows: [
      { id: "sync", title: "Offline synchronization", description: "Allow facility workspaces to sync queued records when online.", checked: true },
      { id: "gateway", title: "Referral gateway", description: "Allow secure referral handovers between facilities.", checked: true },
    ],
  },
  {
    value: "facilities",
    label: "Facilities",
    Icon: Building2,
    description: "Set defaults used across registered facilities.",
    rows: [
      { id: "facility-onboarding", title: "Allow facility onboarding", description: "Let superadmins add RHUs and barangay health stations.", checked: true },
      { id: "require-contact", title: "Require facility contact details", description: "Prompt for a contact number when creating a facility.", checked: false },
    ],
  },
  {
    value: "security",
    label: "Security",
    Icon: ShieldCheck,
    description: "Configure baseline safeguards for network accounts.",
    rows: [
      { id: "session-timeout", title: "Automatic session timeout", description: "Sign out inactive accounts after 30 minutes.", checked: true },
      { id: "sensitive-actions", title: "Confirm sensitive changes", description: "Ask for confirmation before removing a facility.", checked: true },
    ],
  },
  {
    value: "notifications",
    label: "Notifications",
    Icon: Bell,
    description: "Choose which network events appear to administrators.",
    rows: [
      { id: "facility-alerts", title: "Facility status alerts", description: "Notify administrators when a facility is modified.", checked: true },
      { id: "sync-alerts", title: "Synchronization alerts", description: "Notify administrators when a sync issue needs attention.", checked: true },
    ],
  },
  {
    value: "data",
    label: "Data & Retention",
    Icon: Database,
    description: "Review platform data handling defaults.",
    rows: [
      { id: "audit-log", title: "Administrative activity log", description: "Keep an immutable record of superadmin changes in the database.", checked: true },
    ],
  },
]

export function SuperAdminSettingsDialog() {
  const navigate = useNavigate()
  const location = useLocation()
  const [section, setSection] = useState("network")

  const [values, setValues] = useState<Record<string, boolean>>(() => {
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}
    return Object.fromEntries(settingsSections.flatMap((group) => group.rows.map((row) => [row.id, row.checked])))
  })

  const current = settingsSections.find((item) => item.value === section) ?? settingsSections[0]
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo
  const close = () =>
    navigate(
      returnTo?.startsWith("/superadmin/") && returnTo !== "/superadmin/settings"
        ? returnTo
        : "/superadmin/overview",
      { replace: true },
    )

  const toggleSetting = (id: string, checked: boolean, title: string) => {
    setValues((prev) => {
      const updated = { ...prev, [id]: checked }
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
    toast.success(`${title} ${checked ? "enabled" : "disabled"}`)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent showCloseButton={false} className="flex h-[min(82dvh,720px)] max-h-[82dvh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground sm:max-w-4xl">
        <Button variant="ghost" size="icon" aria-label="Close settings" onClick={close} className="absolute right-3 top-3 z-20 size-8">
          <X className="size-4" />
        </Button>
        <div className="grid h-full min-h-0 w-full grid-cols-1 gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto border-b border-sidebar-border bg-muted/30 p-4 md:border-b-0 md:border-r md:px-5 md:py-6">
            <DialogHeader className="items-start pr-8 text-left">
              <DialogTitle className="text-base font-semibold">Settings</DialogTitle>
              <DialogDescription className="text-xs">Manage network administration preferences.</DialogDescription>
            </DialogHeader>
            <nav aria-label="Settings sections" className="mt-3 flex gap-1 overflow-x-auto md:mt-5 md:flex-col">
              {settingsSections.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-current={section === value ? "page" : undefined}
                  onClick={() => setSection(value)}
                  className={`flex min-w-max items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors md:w-full ${
                    section === value
                      ? "bg-background font-medium text-foreground dark:shadow-sm"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>
          <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto p-4 pt-12 md:p-6">
            <div className="mb-5 pr-9">
              <h2 className="text-sm font-semibold">{current.label}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{current.description}</p>
            </div>
            <div className="space-y-3">
              {current.rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-4 rounded-md border border-sidebar-border p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{row.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>
                  </div>
                  <Switch
                    checked={values[row.id] ?? row.checked}
                    onCheckedChange={(checked) => toggleSetting(row.id, checked, row.title)}
                    aria-label={row.title}
                  />
                </div>
              ))}
            </div>
            <div className="mt-auto flex justify-end pt-6">
              <Button variant="outline" className="h-8 px-3 text-xs" onClick={close}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SuperAdminRhuManagementPage() {
  return <FacilityManagementPage kind="rhu" />
}

export function SuperAdminBhsManagementPage() {
  return <FacilityManagementPage kind="bhs" />
}
