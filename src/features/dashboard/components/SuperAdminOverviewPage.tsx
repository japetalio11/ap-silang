import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Activity, ArrowRight, ArrowRightLeft, Download, Hospital, PlusCircle, RefreshCw, RotateCcw, Search, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeletonRows } from "@/components/ui/table-skeleton-rows"
import { MobileTableCardSkeleton } from "@/components/ui/mobile-table-card-skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { CachedDataBanner } from "@/components/ui/cached-data-banner"
import { useAuthSession } from "@/features/auth/auth-session"
import { fetchMunicipalOverview, type MunicipalOverview } from "../api/superadmin-api"

export function SuperAdminOverviewPage() {
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const [data, setData] = useState<MunicipalOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [facilityView, setFacilityView] = useState("all")
  const [staffFilter, setStaffFilter] = useState("all")
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadOverview = async () => {
    if (!session?.token) return
    setLoading(true)
    try {
      const overview = await fetchMunicipalOverview(session.token)
      setData(overview)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load municipal overview"
      toast.error("Error loading overview", { description: message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [session?.token])

  useEffect(() => {
    setPage(1)
  }, [query, facilityView, staffFilter])

  const filteredFacilities = useMemo(() => {
    if (!data?.facilitiesSummary) return []
    const term = query.trim().toLowerCase()
    return data.facilitiesSummary.filter((facility) => {
      const type = facility.type.toLowerCase()
      const matchesView = facilityView === "all" || (facilityView === "rhu" ? type.includes("rhu") || type.includes("rural") : type.includes("bhs") || type.includes("barangay"))
      const matchesStatus = staffFilter === "all" || (staffFilter === "assigned" ? (facility._count?.users ?? 0) > 0 : (facility._count?.users ?? 0) === 0)
      const matchesSearch = !term || [facility.facility_name, facility.type, facility.address].some((value) => value.toLowerCase().includes(term))
      return matchesView && matchesStatus && matchesSearch
    })
  }, [data?.facilitiesSummary, query, facilityView, staffFilter])

  const paginatedFacilities = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredFacilities.slice(start, start + pageSize)
  }, [filteredFacilities, page, pageSize])

  const facilities = data?.facilitiesSummary ?? []
  const viewCounts = {
    all: facilities.length,
    rhu: facilities.filter((facility) => /rhu|rural/i.test(facility.type)).length,
    bhs: facilities.filter((facility) => /bhs|barangay/i.test(facility.type)).length,
  }
  const exportFacilities = () => {
    const rows = [
      ["Facility Name", "Type", "Address", "Staff", "Mothers"],
      ...filteredFacilities.map((facility) => [facility.facility_name, facility.type, facility.address, String(facility._count?.users ?? 0), String(facility._count?.motherEnrollments ?? 0)]),
    ]
    const csv = `\ufeff${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "silang-facility-overview.csv"
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Facility overview exported")
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-12 px-4 pb-8 pt-8 text-foreground sm:px-8">
      <CachedDataBanner />
      <p className="text-xs text-muted-foreground">{new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"}, {session?.user.first_name || "Administrator"}</p>
      <section aria-label="Municipal care overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-sidebar-border bg-card shadow-none dark:bg-[#111]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-xs font-normal text-muted-foreground">Facilities</CardTitle>
            <StatusBadge status="Active" label="Network" className="px-1.5" />
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-8 items-center text-2xl font-semibold text-[#15803d] dark:text-[#4ade80]">{loading ? <Skeleton className="h-6 w-12" /> : data?.totalFacilities ?? 0}</div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium">Municipal network <Hospital className="size-3 text-muted-foreground" /></div>
            <p className="mt-1 truncate text-xs text-muted-foreground">RHUs and health stations</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card shadow-none dark:bg-[#111]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-xs font-normal text-muted-foreground">Maternal Records</CardTitle>
            <StatusBadge status="Active" label="Registry" className="px-1.5" />
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-8 items-center text-2xl font-semibold text-[#15803d] dark:text-[#4ade80]">{loading ? <Skeleton className="h-6 w-12" /> : data?.totalMothers ?? 0}</div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium">Maternal registry <Users className="size-3 text-muted-foreground" /></div>
            <p className="mt-1 truncate text-xs text-muted-foreground">Across all facilities</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card shadow-none dark:bg-[#111]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-xs font-normal text-muted-foreground">Active Pregnancies</CardTitle>
            <StatusBadge status="Ongoing" label="Live" className="px-1.5" />
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-8 items-center text-2xl font-semibold text-[#b45309] dark:text-[#fbbf24]">{loading ? <Skeleton className="h-6 w-12" /> : data?.activePregnancies ?? 0}</div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium">Clinical care <Activity className="size-3 text-muted-foreground" /></div>
            <p className="mt-1 truncate text-xs text-muted-foreground">Pregnancies under care</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card shadow-none dark:bg-[#111]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-xs font-normal text-muted-foreground">Referrals</CardTitle>
            <StatusBadge status="Pending" label="Handover" className="px-1.5" />
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex h-8 items-center text-2xl font-semibold text-[#b45309] dark:text-[#fbbf24]">{loading ? <Skeleton className="h-6 w-12" /> : data?.totalReferrals ?? 0}</div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium">Facility transfers <ArrowRightLeft className="size-3 text-muted-foreground" /></div>
            <p className="mt-1 truncate text-xs text-muted-foreground">Coordinated handovers</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="facility-overview-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="facility-overview-heading" className="text-sm font-semibold">Facility Overview</h2><p className="mt-1 text-xs text-muted-foreground">Review the municipal facility network.</p></div>
          <Link to="/superadmin/rhu-management" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground">Manage Facilities <ArrowRight className="size-3.5" /></Link>
        </div>
        <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 bg-background px-4 py-3 dark:bg-black">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={facilityView} onValueChange={(value) => { setFacilityView(value); setPage(1) }} className="hidden md:block">
            <TabsList mobileSelect={false} className="h-9"><TabsTrigger value="all">All ({viewCounts.all})</TabsTrigger><TabsTrigger value="rhu">RHUs ({viewCounts.rhu})</TabsTrigger><TabsTrigger value="bhs">BHSs ({viewCounts.bhs})</TabsTrigger></TabsList>
          </Tabs>
          <Select value={facilityView} onValueChange={(value) => { setFacilityView(value); setPage(1) }}>
            <SelectTrigger className="h-8 w-full md:hidden" aria-label="Facility view"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Facilities ({viewCounts.all})</SelectItem><SelectItem value="rhu">RHUs ({viewCounts.rhu})</SelectItem><SelectItem value="bhs">BHSs ({viewCounts.bhs})</SelectItem></SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Export facilities" title="Export facilities" className="size-8 border-sidebar-border" onClick={exportFacilities} disabled={loading || filteredFacilities.length === 0}><Download className="size-3.5" /></Button>
            <Button variant="outline" size="icon" aria-label="Refresh overview" title="Refresh overview" className="size-8 border-sidebar-border" onClick={loadOverview} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[300px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search facilities..." className="h-8 w-full pl-8 text-xs" />
          </div>
          <Popover><PopoverTrigger asChild><Button variant="filter" size="filter"><PlusCircle className="size-3.5" />Staff</Button></PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-3"><div className="flex flex-col gap-3">
              {([ ["all", "All facilities"], ["assigned", "With staff"], ["unassigned", "Without staff"] ] as const).map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={staffFilter === value} onCheckedChange={() => { setStaffFilter(value); setPage(1) }} className="size-3.5 rounded-[4px] border-sidebar-border" />{label}</label>)}
            </div></PopoverContent>
          </Popover>
          {(query.trim() || staffFilter !== "all") && <Button variant="ghost" className="h-8 gap-2 px-2 text-xs text-muted-foreground" onClick={() => { setQuery(""); setStaffFilter("all"); setPage(1) }}><RotateCcw className="size-3.5" />Reset Filter</Button>}
        </div>
        </div>
        <div className="hidden w-full overflow-hidden rounded-md border border-sidebar-border bg-background dark:bg-black md:block">
          <Table>
            <TableHeader className="bg-card dark:bg-[#111]">
              <TableRow className="border-sidebar-border hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox checked={paginatedFacilities.length > 0 && paginatedFacilities.every((item) => selected.includes(item.facility_id))} onCheckedChange={(checked) => setSelected(checked ? [...new Set([...selected, ...paginatedFacilities.map((item) => item.facility_id)])] : selected.filter((id) => !paginatedFacilities.some((item) => item.facility_id === id)))} aria-label="Select all facilities on this page" />
                </TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows columns={5} rows={4} checkboxColumn />
              ) : paginatedFacilities.length > 0 ? (
                paginatedFacilities.map((item) => (
                  <TableRow
                    key={item.facility_id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      navigate(`/superadmin/facility/${item.facility_id}`, {
                        state: { returnTo: "/superadmin/overview", returnLabel: "Dashboard", facilityName: item.facility_name },
                      })
                    }
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}><Checkbox checked={selected.includes(item.facility_id)} onCheckedChange={(checked) => setSelected(checked ? [...selected, item.facility_id] : selected.filter((id) => id !== item.facility_id))} aria-label={`Select ${item.facility_name}`} /></TableCell>
                    <TableCell className="font-medium text-foreground hover:underline">{item.facility_name}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">{item.type}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.address}</TableCell>
                    <TableCell className="text-right font-medium">{item._count?.users ?? 0}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmptyState colSpan={5} icon={Hospital} title={query ? "No matching facilities" : "No facilities yet"} description={query ? "Try a different search." : "Registered health units and stations will appear here."} />
              )}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 md:hidden">
          {loading ? (
            <MobileTableCardSkeleton count={3} />
          ) : (
            paginatedFacilities.map((item) => (
              <article data-mobile-record
                key={item.facility_id}
                role="link"
                tabIndex={0}
                aria-label={`Open ${item.facility_name} facility details`}
                className="cursor-pointer rounded-md border border-sidebar-border bg-background p-3 text-xs transition-colors hover:bg-muted/50 dark:bg-black"
                onClick={(event) => {
                  const target = event.target as HTMLElement
                  if (target.closest("button, a, input, [role='checkbox'], [role='menuitem']")) return
                  navigate(`/superadmin/facility/${item.facility_id}`, { state: { returnTo: "/superadmin/overview", returnLabel: "Dashboard", facilityName: item.facility_name } })
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return
                  event.preventDefault()
                  navigate(`/superadmin/facility/${item.facility_id}`, { state: { returnTo: "/superadmin/overview", returnLabel: "Dashboard", facilityName: item.facility_name } })
                }}
              >
                <div className="flex items-start gap-3">
                  <span onClick={(event) => event.stopPropagation()}><Checkbox checked={selected.includes(item.facility_id)} onCheckedChange={(checked) => setSelected(checked ? [...selected, item.facility_id] : selected.filter((id) => id !== item.facility_id))} aria-label={`Select ${item.facility_name}`} /></span>
                  <h3 className="text-sm font-semibold text-foreground">{item.facility_name}</h3>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5"><span className="inline-flex rounded-sm border border-sidebar-border bg-muted px-2 py-0.5 font-medium text-foreground">{item.type}</span></div>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                  <div className="col-span-3 min-w-0"><dt className="text-muted-foreground">Address</dt><dd className="mt-1 break-words font-medium text-foreground">{item.address || "Not recorded"}</dd></div>
                  <div>
                    <dt className="text-muted-foreground">Staff</dt>
                    <dd className="mt-1 font-medium text-foreground">{item._count?.users ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Mothers</dt>
                    <dd className="font-medium">{item._count?.motherEnrollments ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Appointments</dt>
                    <dd className="font-medium">{item._count?.appointments ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Referrals</dt>
                    <dd className="font-medium">{item._count?.onlineReferralsFrom ?? 0} / {item._count?.onlineReferralsTo ?? 0}</dd>
                  </div>
                </dl>
              </article>
            ))
          )}
          {!loading && filteredFacilities.length === 0 && (
            <div className="rounded-md border border-sidebar-border bg-card p-6 text-center text-xs text-muted-foreground">{query ? "No matching facilities." : "No facilities yet."}</div>
          )}
        </div>

        <TablePaginationFooter
          rowCount={filteredFacilities.length}
          selectedCount={selected.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </section>
    </div>
  )
}
