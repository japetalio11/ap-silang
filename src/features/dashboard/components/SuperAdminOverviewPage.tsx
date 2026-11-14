import { useEffect, useState } from "react"
import { Activity, ArrowRightLeft, Building2, Hospital, RefreshCw, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeletonRows } from "@/components/ui/table-skeleton-rows"
import { MobileTableCardSkeleton } from "@/components/ui/mobile-table-card-skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { useAuthSession } from "@/features/auth/auth-session"
import { fetchMunicipalOverview, type MunicipalOverview } from "../api/superadmin-api"

export function SuperAdminOverviewPage() {
  const { session } = useAuthSession()
  const [data, setData] = useState<MunicipalOverview | null>(null)
  const [loading, setLoading] = useState(true)

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
            <div className="flex h-8 items-center text-2xl font-bold">{loading ? <Skeleton className="h-6 w-12" /> : data?.totalFacilities ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">RHUs & Barangay Health Stations</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Enrolled Mothers</CardTitle>
            <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex h-8 items-center text-2xl font-bold">{loading ? <Skeleton className="h-6 w-12" /> : data?.totalMothers ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">Across municipal health registry</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Pregnancies</CardTitle>
            <Activity className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex h-8 items-center text-2xl font-bold">{loading ? <Skeleton className="h-6 w-12" /> : data?.activePregnancies ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">Currently monitored</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Inter-Clinic Referrals</CardTitle>
            <ArrowRightLeft className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex h-8 items-center text-2xl font-bold">{loading ? <Skeleton className="h-6 w-12" /> : data?.totalReferrals ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">Care handovers coordinated</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Facility Operations Breakdown</h2>
        <div className="hidden w-full overflow-hidden rounded-lg border border-sidebar-border bg-card md:block">
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
              {loading ? <TableSkeletonRows columns={7} rows={4} checkboxColumn={false} /> : data?.facilitiesSummary && data.facilitiesSummary.length > 0 ? (
                data.facilitiesSummary.map((item) => (
                  <TableRow key={item.facility_id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {item.type.toLowerCase().includes("rhu") || item.type.toLowerCase().includes("rural") ? (
                          <Hospital className="size-4 text-muted-foreground" />
                        ) : (
                          <Building2 className="size-4 text-muted-foreground" />
                        )}
                        {item.facility_name}
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
                    No facilities registered in the municipal database.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="grid gap-3 md:hidden">
          {loading ? <MobileTableCardSkeleton count={3} /> : data?.facilitiesSummary?.map((item) => <article key={item.facility_id} className="rounded-md border border-sidebar-border bg-card p-4 text-xs">
            <h3 className="text-sm font-semibold text-foreground">{item.facility_name}</h3>
            <p className="mt-1 text-muted-foreground">{item.type} · {item.address || "Address not recorded"}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2"><div><dt className="text-muted-foreground">Staff</dt><dd className="font-medium">{item._count?.users ?? 0}</dd></div><div><dt className="text-muted-foreground">Mothers</dt><dd className="font-medium">{item._count?.motherEnrollments ?? 0}</dd></div><div><dt className="text-muted-foreground">Appointments</dt><dd className="font-medium">{item._count?.appointments ?? 0}</dd></div><div><dt className="text-muted-foreground">Referrals</dt><dd className="font-medium">{item._count?.onlineReferralsFrom ?? 0} / {item._count?.onlineReferralsTo ?? 0}</dd></div></dl>
          </article>)}
          {!loading && !data?.facilitiesSummary?.length && <div className="rounded-md border border-sidebar-border p-6 text-center text-sm text-muted-foreground">No facilities registered.</div>}
        </div>
      </div>
    </section>
  )
}
