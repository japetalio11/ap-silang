import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Building2, Download, Edit2, ExternalLink, Hospital, PlusCircle, RefreshCw, RotateCcw, Search, Wifi, ShieldCheck, Bell, Database, X, PowerOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusBadge } from "@/components/ui/status-badge"
import { CachedDataBanner } from "@/components/ui/cached-data-banner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { TableRowActions } from "@/components/ui/table-row-actions"
import { TableSkeletonRows } from "@/components/ui/table-skeleton-rows"
import { MobileTableCardSkeleton } from "@/components/ui/mobile-table-card-skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useAuthSession } from "@/features/auth/auth-session"
import { db } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"
import {
  fetchAllFacilities,
  createFacilityRecord,
  updateFacilityRecord,
  toggleFacilityStatus,
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

function normalizeFacilityType(rawType?: string, defaultType = "RHU"): string {
  if (!rawType) return defaultType
  const lower = rawType.toLowerCase()
  if (lower.includes("bhs") || lower.includes("barangay") || lower.includes("station")) {
    return "BHS"
  }
  return "RHU"
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
  const [staffFilter, setStaffFilter] = useState<"all" | "assigned" | "unassigned">("all")
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<FacilityItem | null>(null)
  const [statusTarget, setStatusTarget] = useState<FacilityItem | null>(null)
  const [statusAction, setStatusAction] = useState<"deactivate" | "reactivate" | null>(null)
  const [statusSubmitting, setStatusSubmitting] = useState(false)

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
      const local = await db.facilities.toArray().catch(() => [])
      if (local.length > 0) {
        setFacilities(local as FacilityItem[])
      } else {
        const message = error instanceof Error ? error.message : "Failed to load facilities"
        toast.error("Error loading facilities", { description: message })
      }
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

  const counts = useMemo(() => {
    const total = kindFiltered.length
    const active = kindFiltered.filter((f) => f.is_active !== false).length
    const deactivated = kindFiltered.filter((f) => f.is_active === false).length
    return { total, active, deactivated }
  }, [kindFiltered])

  const filtered = useMemo(() => {
    return kindFiltered.filter((facility) => {
      if (tab === "active" && facility.is_active === false) return false
      if (tab === "deactivated" && facility.is_active !== false) return false
      const staffCount = facilityStaffCounts[facility.facility_id] ?? 0
      if (staffFilter === "assigned" && staffCount === 0) return false
      if (staffFilter === "unassigned" && staffCount > 0) return false
      const term = query.trim().toLowerCase()
      const matchesSearch =
        !term ||
        [facility.facility_name, facility.address, facility.contact_number, facility.email, facility.type].some(
          (value) => (value || "").toLowerCase().includes(term),
        )
      return matchesSearch
    })
  }, [kindFiltered, query, tab, staffFilter, facilityStaffCounts])

  useEffect(() => {
    setPage(1)
  }, [query, tab, staffFilter])

  const paginatedFacilities = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const openCreate = (facility?: FacilityItem) => {
    if (facility) {
      setEditing(facility)
      setForm({
        facility_name: facility.facility_name,
        type: normalizeFacilityType(facility.type, isRhu ? "RHU" : "BHS"),
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
    if (!form.facility_name.trim() || !form.address.trim() || !form.type.trim()) {
      toast.error("Validation error", { description: "Please enter the facility name, type, and address." })
      return
    }

    if (!session?.token) {
      toast.error("Session expired", { description: "Please sign in again." })
      return
    }

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine

    if (isOffline) {
      if (editing) {
        const updatedFacility: FacilityItem = {
          ...editing,
          facility_name: form.facility_name.trim(),
          type: form.type.trim() || (isRhu ? "RHU" : "BHS"),
          address: form.address.trim(),
          contact_number: form.contact_number.trim(),
          email: form.email.trim(),
        }
        await db.facilities.put({
          ...updatedFacility,
          id: updatedFacility.facility_id,
          sync_status: editing.facility_id.startsWith("temp-") ? "pending_create" : "pending_update",
          updated_at: Date.now(),
        }).catch(() => {})
        await silangSyncEngine.enqueue({
          client_mutation_id: crypto.randomUUID(),
          entity_type: "facility",
          action: "UPDATE",
          endpoint: "/facility/update",
          method: "PUT",
          payload: {
            facility_id: editing.facility_id,
            facility_name: form.facility_name.trim(),
            type: form.type.trim() || (isRhu ? "RHU" : "BHS"),
            address: form.address.trim(),
            contact_number: form.contact_number.trim(),
            email: form.email.trim(),
          },
          temp_id: editing.facility_id,
        })
        setFacilities((prev) =>
          prev.map((f) => (f.facility_id === editing.facility_id ? updatedFacility : f))
        )
        toast.success(`${singular} updated offline`, {
          description: "Changes saved to device memory and will sync when online.",
        })
        setDialogOpen(false)
        return
      }

      const tempFacilityId = `temp-fac-${crypto.randomUUID()}`
      const newFacility: FacilityItem = {
        facility_id: tempFacilityId,
        facility_name: form.facility_name.trim(),
        type: form.type.trim() || (isRhu ? "RHU" : "BHS"),
        address: form.address.trim(),
        contact_number: form.contact_number.trim(),
        email: form.email.trim(),
        is_active: true,
      }
      await db.facilities.put({
        ...newFacility,
        id: tempFacilityId,
        sync_status: "pending_create",
        updated_at: Date.now(),
      }).catch(() => {})

      await silangSyncEngine.enqueue({
        client_mutation_id: crypto.randomUUID(),
        entity_type: "facility",
        action: "CREATE",
        endpoint: "/facility/register",
        method: "POST",
        payload: {
          facility_name: form.facility_name.trim(),
          type: form.type.trim() || (isRhu ? "RHU" : "BHS"),
          address: form.address.trim(),
          contact_number: form.contact_number.trim(),
          email: form.email.trim(),
        },
        temp_id: tempFacilityId,
      })

      setFacilities((prev) => [newFacility, ...prev])
      toast.success(`${singular} registered offline`, {
        description: "Facility saved to device memory and will register with municipal server when back online.",
      })
      setDialogOpen(false)
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

  const handleToggleStatus = async () => {
    if (!statusTarget || !session?.token || !statusAction) return
    setStatusSubmitting(true)
    const newStatus = statusAction === "reactivate"
    try {
      await toggleFacilityStatus(session.token, statusTarget.facility_id, newStatus)
      setFacilities((prev) =>
        prev.map((f) => (f.facility_id === statusTarget.facility_id ? { ...f, is_active: newStatus } : f))
      )
      toast.success(`${singular} ${newStatus ? "reactivated" : "deactivated"} successfully`, {
        description: newStatus
          ? "Staff accounts can now log in and manage services for this facility."
          : "Staff access blocked and active mother enrollments unassigned.",
      })
      setStatusTarget(null)
      setStatusAction(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change facility status"
      toast.error("Operation failed", { description: message })
    } finally {
      setStatusSubmitting(false)
    }
  }

  return (
    <section className="w-full space-y-4 px-4 pb-8 pt-4 text-foreground">
      <CachedDataBanner />
      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 bg-background px-4 py-3 dark:bg-black">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={tab} onValueChange={setTab}>
          <SelectTrigger className="h-8 w-full md:hidden" aria-label="Facility status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {isRhu ? "RHUs" : "BHSs"} ({counts.total})</SelectItem>
            <SelectItem value="active">Active ({counts.active})</SelectItem>
            <SelectItem value="deactivated">Deactivated ({counts.deactivated})</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={tab} onValueChange={setTab} className="hidden md:block">
          <TabsList mobileSelect={false}>
            <TabsTrigger value="all">
              All {isRhu ? "RHUs" : "BHSs"} ({counts.total})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({counts.active})
            </TabsTrigger>
            <TabsTrigger value="deactivated">
              Deactivated ({counts.deactivated})
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
            className="h-8 w-full pl-8 text-xs"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="filter" size="filter" aria-label="Filter by staff assignment">
              <PlusCircle className="size-3.5" /> Staff
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-3">
            <div className="flex flex-col gap-3">
              {([ ["all", "All facilities"], ["assigned", "With staff"], ["unassigned", "Without staff"] ] as const).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={staffFilter === value} onCheckedChange={() => setStaffFilter(value)} className="size-3.5 rounded-[4px] border-sidebar-border" />{label}</label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {(query.trim().length > 0 || staffFilter !== "all") && (
          <Button
            variant="ghost"
            className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"
            onClick={() => { setQuery(""); setStaffFilter("all") }}
          >
            <RotateCcw className="size-3.5" />
            Reset Filter
          </Button>
        )}
      </div>
      </div>

      <div className="hidden w-full overflow-hidden rounded-md border border-sidebar-border bg-background dark:bg-black md:block">
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
              <TableHead>Address</TableHead>
              <TableHead>Contact Number</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableSkeletonRows columns={8} rows={6} /> : paginatedFacilities.map((facility) => (
              <TableRow
                key={facility.facility_id}
                data-state={selected.includes(facility.facility_id) ? "selected" : undefined}
                className="cursor-pointer hover:bg-muted/50"
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest("button") || target.closest("input") || target.closest("[role='checkbox']")) return
                  navigate(`/superadmin/facility/${facility.facility_id}`, {
                    state: {
                      returnTo: isRhu ? "/superadmin/rhu-management" : "/superadmin/bhs-management",
                      returnLabel: isRhu ? "RHU Management" : "BHS Management",
                      facilityName: facility.facility_name,
                    },
                  })
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
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{facility.address || "—"}</TableCell>
                <TableCell className="text-xs">{facility.contact_number || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{facility.email || "—"}</TableCell>
                <TableCell className="text-right font-medium">
                  {facilityStaffCounts[facility.facility_id] ?? 0}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={facility.is_active === false ? "inactive" : "active"}
                    label={facility.is_active === false ? "Deactivated" : "Active"}
                  />
                </TableCell>
                <TableCell>
                  <TableRowActions label={`Actions for ${facility.facility_name}`}>
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(`/superadmin/facility/${facility.facility_id}`, {
                          state: {
                            returnTo: isRhu ? "/superadmin/rhu-management" : "/superadmin/bhs-management",
                            returnLabel: isRhu ? "Rural Health Units" : "Barangay Health Stations",
                          },
                        })
                      }
                    >
                      <ExternalLink className="mr-2 size-4" />
                      View Facility Hub
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openCreate(facility)}>
                      <Edit2 className="mr-2 size-4" />
                      Edit details
                    </DropdownMenuItem>
                    {facility.is_active === false ? (
                      <DropdownMenuItem
                        className="text-emerald-600 focus:text-emerald-700 dark:text-emerald-400"
                        onClick={() => {
                          setStatusTarget(facility)
                          setStatusAction("reactivate")
                        }}
                      >
                        <ShieldCheck className="mr-2 size-4 text-emerald-600 dark:text-emerald-400" />
                        Reactivate facility
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="text-amber-600 focus:text-amber-700 dark:text-amber-400"
                        onClick={() => {
                          setStatusTarget(facility)
                          setStatusAction("deactivate")
                        }}
                      >
                        <PowerOff className="mr-2 size-4 text-amber-600 dark:text-amber-400" />
                        Deactivate facility
                      </DropdownMenuItem>
                    )}
                  </TableRowActions>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableEmptyState
                colSpan={8}
                icon={isRhu ? Hospital : Building2}
                title={`No ${isRhu ? "rural health units" : "barangay health stations"} found`}
                description={
                  query.trim().length > 0 || staffFilter !== "all"
                    ? "Adjust or reset the filters to see facility records."
                    : `Add a ${singular.toLowerCase()} to begin managing the municipal network.`
                }
                action={
                  query.trim().length === 0 && staffFilter === "all" ? (
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

      <div className="grid gap-3 md:hidden" aria-busy={loading}>
        {loading ? <MobileTableCardSkeleton /> : paginatedFacilities.map((facility) => (
          <article
            key={facility.facility_id}
            data-mobile-record
            role="link"
            tabIndex={0}
            aria-label={`Open ${facility.facility_name} facility details`}
            className="cursor-pointer rounded-md border border-sidebar-border bg-background p-3 text-xs transition-colors hover:bg-muted/50 dark:bg-black"
            onClick={(e) => {
              const target = e.target as HTMLElement
              if (target.closest("button, a, input, [role='checkbox'], [role='menuitem']")) return
              navigate(`/superadmin/facility/${facility.facility_id}`, {
                state: { returnTo: isRhu ? "/superadmin/rhu-management" : "/superadmin/bhs-management", returnLabel: isRhu ? "RHU Management" : "BHS Management", facilityName: facility.facility_name },
              })
            }}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return
              e.preventDefault()
              navigate(`/superadmin/facility/${facility.facility_id}`, {
                state: { returnTo: isRhu ? "/superadmin/rhu-management" : "/superadmin/bhs-management", returnLabel: isRhu ? "RHU Management" : "BHS Management", facilityName: facility.facility_name },
              })
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <Checkbox
                  aria-label={`Select ${facility.facility_name}`}
                  checked={selected.includes(facility.facility_id)}
                  onCheckedChange={(checked) => setSelected((items) => checked ? [...items, facility.facility_id] : items.filter((id) => id !== facility.facility_id))}
                />
                <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{facility.facility_name}</h3>
                </div>
              </div>
              <TableRowActions label={`Actions for ${facility.facility_name}`}>
                <DropdownMenuItem
                  onClick={() =>
                    navigate(`/superadmin/facility/${facility.facility_id}`, {
                      state: {
                        returnTo: isRhu ? "/superadmin/rhu-management" : "/superadmin/bhs-management",
                        returnLabel: isRhu ? "Rural Health Units" : "Barangay Health Stations",
                      },
                    })
                  }
                >
                  <ExternalLink className="mr-2 size-4" />
                  View Facility Hub
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreate(facility)}>
                  <Edit2 className="mr-2 size-4" />
                  Edit details
                </DropdownMenuItem>
                {facility.is_active === false ? (
                  <DropdownMenuItem
                    className="text-emerald-600 focus:text-emerald-700 dark:text-emerald-400"
                    onClick={() => {
                      setStatusTarget(facility)
                      setStatusAction("reactivate")
                    }}
                  >
                    <ShieldCheck className="mr-2 size-4 text-emerald-600 dark:text-emerald-400" />
                    Reactivate facility
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-amber-600 focus:text-amber-700 dark:text-amber-400"
                    onClick={() => {
                      setStatusTarget(facility)
                      setStatusAction("deactivate")
                    }}
                  >
                    <PowerOff className="mr-2 size-4 text-amber-600 dark:text-amber-400" />
                    Deactivate facility
                  </DropdownMenuItem>
                )}
              </TableRowActions>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StatusBadge status={facility.is_active === false ? "inactive" : "active"} label={facility.is_active === false ? "Deactivated" : "Active"} />
            </div>
            <div className="mt-3 grid min-w-0 grid-cols-3 gap-3 text-xs">
              <div className="min-w-0"><p className="text-muted-foreground">Address</p><p className="mt-1 break-words font-medium text-foreground">{facility.address || "Not recorded"}</p></div>
              <div className="min-w-0"><p className="text-muted-foreground">Contact</p><p className="mt-1 break-words font-medium text-foreground">{facility.contact_number || "—"}</p></div>
              <div className="min-w-0"><p className="text-muted-foreground">Staff</p><p className="mt-1 font-medium text-foreground">{facilityStaffCounts[facility.facility_id] ?? 0}</p></div>
              {facility.email && <div className="col-span-3 min-w-0"><p className="text-muted-foreground">Email</p><p className="mt-1 break-all font-medium text-foreground">{facility.email}</p></div>}
            </div>
          </article>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="rounded-md border border-sidebar-border p-6 text-center text-sm text-muted-foreground">
            No facilities in this view.
          </div>
        )}
      </div>

      <TablePaginationFooter
        rowCount={filtered.length}
        selectedCount={selected.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-xl">
          <DialogHeader className="gap-1 pr-8 text-left">
            <DialogTitle className="text-base font-semibold">{editing ? `Edit ${singular}` : `Register ${singular}`}</DialogTitle>
            <DialogDescription className="text-xs">{editing ? "Update facility information." : "Add a facility to the municipal directory."}</DialogDescription>
          </DialogHeader>
            <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">
                  Facility name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.facility_name}
                  onChange={(event) => setForm({ ...form, facility_name: event.target.value })}
                  placeholder={isRhu ? "Rural Health Unit 1" : "San Isidro BHS"}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">
                  Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  placeholder={isRhu ? "Pili, Camarines Sur" : "Barangay San Isidro, Pili"}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Contact Number</Label>
                <Input
                  value={form.contact_number}
                  onChange={(event) => setForm({ ...form, contact_number: event.target.value })}
                  placeholder="09XX XXX XXXX"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="facility@silang.ph"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 pt-3 sm:justify-between [&_button]:h-8 [&_button]:px-3 [&_button]:text-xs">
            <Button variant="outline" disabled={submitting} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting} onClick={saveFacility}>
              {submitting ? "Saving..." : editing ? "Save Changes" : `Register ${singular}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusTarget && !!statusAction} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-md">
          <DialogHeader className="gap-1 pr-14 text-left">
              <DialogTitle className="text-base font-semibold">
                {statusAction === "deactivate"
                  ? `Deactivate ${statusTarget?.facility_name}?`
                  : `Reactivate ${statusTarget?.facility_name}?`}
              </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {statusAction === "deactivate"
                ? "Staff at this facility will lose access. Clinical records remain available."
                : "Reactivating this facility will restore institutional access and allow staff members to log in and resume clinical care services."}
            </DialogDescription>
          </DialogHeader>

            {statusAction === "deactivate" && statusTarget && <p className="text-xs text-muted-foreground">{facilityStaffCounts[statusTarget.facility_id] ?? 0} assigned staff member(s) will be affected.</p>}
          <DialogFooter className="flex-row items-center justify-between gap-3 pt-3 sm:justify-between [&_button]:h-8 [&_button]:px-3 [&_button]:text-xs">
            <Button variant="outline" disabled={statusSubmitting} onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={statusAction === "deactivate" ? "destructive" : "default"}
              disabled={statusSubmitting}
              onClick={handleToggleStatus}
            >
              {statusSubmitting
                ? "Processing..."
                : statusAction === "deactivate"
                ? "Confirm Deactivation"
                : "Confirm Reactivation"}
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
          <aside className="flex min-h-0 min-w-0 flex-col gap-4 border-b border-sidebar-border bg-muted/30 p-4 md:overflow-y-auto md:border-b-0 md:border-r md:px-5 md:py-6">
            <DialogHeader className="items-start pr-8 text-left">
              <DialogTitle className="text-base font-semibold">Settings</DialogTitle>
              <DialogDescription className="text-xs">Manage network administration preferences.</DialogDescription>
            </DialogHeader>
            <div className="md:hidden">
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger aria-label="Settings section" className="h-9 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {settingsSections.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <nav aria-label="Settings sections" className="mt-5 hidden flex-col gap-1 md:flex">
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
          <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto p-4 md:p-5">
            <div className="mb-5 pr-9">
              <h2 className="text-sm font-semibold">{current.label}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{current.description}</p>
            </div>
            <div className="space-y-1">
              {current.rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-4 rounded-md px-2 py-3 hover:bg-muted/40">
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
