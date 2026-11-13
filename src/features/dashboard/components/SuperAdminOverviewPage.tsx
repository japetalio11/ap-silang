import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Activity, ArrowRightLeft, Building2, Hospital, RefreshCw, RotateCcw, Search, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { StatusBadge } from "@/components/ui/status-badge"
import { useAuthSession } from "@/features/auth/auth-session"
import { fetchMunicipalOverview, type MunicipalOverview } from "../api/superadmin-api"

export function SuperAdminOverviewPage() {
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const [data, setData] = useState<MunicipalOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
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
  }, [query])

  const filteredFacilities = useMemo(() => {
    if (!data?.facilitiesSummary) return []
    const term = query.trim().toLowerCase()
    if (!term) return data.facilitiesSummary
    return data.facilitiesSummary.filter((f) => {
      return (
        f.facility_name.toLowerCase().includes(term) ||
        f.type.toLowerCase().includes(term) ||
        f.address.toLowerCase().includes(term)
      )
    })
  }, [data?.facilitiesSummary, query])

  const paginatedFacilities = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredFacilities.slice(start, start + pageSize)
  }, [filteredFacilities, page, pageSize])

  return (
    <section className="w-full space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Municipal Health Network Overview</h1>
          <p className="text-xs text-muted-foreground">
            Centralized maternal and birth monitoring metrics across all Silang care facilities.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            loadOverview()
            toast.success("Overview refreshed")
          }}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Facilities</CardTitle>
            <Hospital className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{data?.totalFacilities ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">RHUs & Barangay Health Stations</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Enrolled Mothers</CardTitle>
            <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{data?.totalMothers ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">Across municipal health registry</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Pregnancies</CardTitle>
            <Activity className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{data?.activePregnancies ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">Currently monitored</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Inter-Clinic Referrals</CardTitle>
            <ArrowRightLeft className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{data?.totalReferrals ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">Care handovers coordinated</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Facility Operations Breakdown</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search facility by name, type, location..."
                className="h-8 w-full border-sidebar-border bg-muted/70 px-2 pl-8 text-xs dark:bg-muted/60"
              />
            </div>
            {query.trim().length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs font-medium text-muted-foreground"
                onClick={() => setQuery("")}
              >
                <RotateCcw className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="w-full overflow-hidden rounded-lg border border-sidebar-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead className="text-right">Appointments</TableHead>
                <TableHead className="text-right">Enrolled Mothers</TableHead>
                <TableHead className="text-right">Referrals (Out / In)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFacilities.length > 0 ? (
                paginatedFacilities.map((item) => (
                  <TableRow
                    key={item.facility_id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/superadmin/facility/${item.facility_id}`)}
                  >
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {item.type.toLowerCase().includes("rhu") || item.type.toLowerCase().includes("rural") ? (
                          <Hospital className="size-4 text-muted-foreground" />
                        ) : (
                          <Building2 className="size-4 text-muted-foreground" />
                        )}
                        <span className="hover:underline">{item.facility_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status="Active" />
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{item.type}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.address}</TableCell>
                    <TableCell className="text-right font-medium">{item._count?.users ?? 0}</TableCell>
                    <TableCell className="text-right font-medium">{item._count?.appointments ?? 0}</TableCell>
                    <TableCell className="text-right font-medium">{item._count?.motherEnrollments ?? 0}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {item._count?.onlineReferralsFrom ?? 0} / {item._count?.onlineReferralsTo ?? 0}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                    {loading ? "Loading facility breakdown..." : "No facilities registered or matching search criteria."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <TablePaginationFooter
          rowCount={filteredFacilities.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </section>
  )
}
