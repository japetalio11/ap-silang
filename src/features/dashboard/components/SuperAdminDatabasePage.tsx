import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Database,
  FileCheck2,
  HardDrive,
  Layers,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Users,
  Wifi,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { useAuthSession } from "@/features/auth/auth-session"
import {
  fetchDatabaseMaintenanceStats,
  fetchDuplicateCheck,
  type DatabaseMaintenanceStats,
  type DuplicateCheckResult,
} from "../api/superadmin-api"

export function SuperAdminDatabasePage() {
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const [stats, setStats] = useState<DatabaseMaintenanceStats | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanningDuplicates, setScanningDuplicates] = useState(false)

  const [duplicateSearch, setDuplicateSearch] = useState("")
  const [duplicatePage, setDuplicatePage] = useState(1)
  const [duplicatePageSize, setDuplicatePageSize] = useState(10)

  const loadStats = async () => {
    if (!session?.token) return
    setLoading(true)
    try {
      const data = await fetchDatabaseMaintenanceStats(session.token)
      setStats(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load database stats"
      toast.error("Database telemetry error", { description: message })
    } finally {
      setLoading(false)
    }
  }

  const runDuplicateScan = async () => {
    if (!session?.token) return
    setScanningDuplicates(true)
    try {
      const result = await fetchDuplicateCheck(session.token)
      setDuplicates(result)
      setDuplicatePage(1)
      if (result.duplicateSerialCount === 0) {
        toast.success("Integrity scan complete: No duplicate family serial numbers found.")
      } else {
        toast.warning(
          `Integrity scan found ${result.duplicateSerialCount} duplicate family serial number(s).`,
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Duplicate scan failed"
      toast.error("Integrity scan error", { description: message })
    } finally {
      setScanningDuplicates(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [session?.token])

  const tableCounters = useMemo(() => {
    if (!stats) return []
    return [
      { label: "Facilities", count: stats.tableCounts.facilities, icon: Server },
      { label: "Staff Accounts", count: stats.tableCounts.staffUsers, icon: Users },
      { label: "Mothers", count: stats.tableCounts.mothers, icon: Users },
      { label: "Pregnancies", count: stats.tableCounts.pregnancies, icon: Activity },
      { label: "Prenatal Visits", count: stats.tableCounts.prenatalVisits, icon: Layers },
      { label: "Deliveries", count: stats.tableCounts.deliveries, icon: CheckCircle2 },
      { label: "Referrals", count: stats.tableCounts.referrals, icon: FileCheck2 },
      { label: "Audit Logs", count: stats.tableCounts.auditLogs, icon: HardDrive },
    ]
  }, [stats])

  const filteredDuplicates = useMemo(() => {
    const query = duplicateSearch.trim().toLowerCase()
    const list = duplicates?.flaggedRecords ?? []
    if (!query) return list
    return list.filter((m) => {
      const serial = (m.family_serial_no || "").toLowerCase()
      const name = `${m.user?.first_name || ""} ${m.user?.last_name || ""}`.toLowerCase()
      const facility = (m.facilityEnrollments?.[0]?.facility?.facility_name || "").toLowerCase()
      return serial.includes(query) || name.includes(query) || facility.includes(query)
    })
  }, [duplicates?.flaggedRecords, duplicateSearch])

  const pagedDuplicates = useMemo(() => {
    const start = (duplicatePage - 1) * duplicatePageSize
    return filteredDuplicates.slice(start, start + duplicatePageSize)
  }, [filteredDuplicates, duplicatePage, duplicatePageSize])

  return (
    <section className="w-full space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Database Maintenance & Sync Telemetry
          </h1>
          <p className="text-xs text-muted-foreground">
            Centralized health of storage, row volumes, offline sync telemetry, and deduplication across Silang facilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={runDuplicateScan}
            disabled={scanningDuplicates}
          >
            <Search className={`size-3.5 ${scanningDuplicates ? "animate-spin" : ""}`} />
            Scan Duplicates
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              loadStats()
              toast.success("Telemetry refreshed")
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Database Engine</CardTitle>
            <Database className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-bold">{stats?.databaseStatus.driver ?? "PostgreSQL"}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stats?.databaseStatus.connection ?? "Connected"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Unsynced Records</CardTitle>
            <Wifi className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-bold">{stats?.syncTelemetry.unsyncedTotal ?? 0}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {stats?.syncTelemetry.unsyncedMothers ?? 0} mothers · {stats?.syncTelemetry.unsyncedPregnancies ?? 0} pregnancies
            </p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">24-Hour Audit Revisions</CardTitle>
            <ShieldCheck className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-bold">{stats?.syncTelemetry.recentAudit24h ?? 0}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">Clinical and admin change events logged</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-sidebar-border bg-card">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Database Table Record Counts</CardTitle>
          <p className="text-xs text-muted-foreground">
            Current row volumes across primary clinical and administrative tables in the PostgreSQL schema.
          </p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tableCounters.map(({ label, count, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-muted/30 p-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background border border-border">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-base font-semibold">{count}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-sidebar-border bg-card">
        <CardHeader className="pb-2 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Patient Record Deduplication Scanner</CardTitle>
              <p className="text-xs text-muted-foreground">
                Detects potential duplicate mother records across Silang facilities sharing identical Family Serial Numbers.
              </p>
            </div>
            {duplicates && duplicates.duplicateSerialCount > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter duplicate records..."
                  value={duplicateSearch}
                  onChange={(e) => {
                    setDuplicateSearch(e.target.value)
                    setDuplicatePage(1)
                  }}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!duplicates ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
              <Search className="size-8 mb-2 opacity-40" />
              <p>Click "Scan Duplicates" above to cross-reference municipal family serial numbers.</p>
            </div>
          ) : duplicates.duplicateSerialCount === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8 mb-2 text-emerald-500" />
              <p className="font-medium">No duplicate serial numbers detected.</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                All registered mothers across RHUs and BHSs have distinct family serial numbers.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Family Serial No.</TableHead>
                    <TableHead>Mother Name</TableHead>
                    <TableHead>Birth Date</TableHead>
                    <TableHead>Blood Type</TableHead>
                    <TableHead>Registered Facility</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredDuplicates.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                        No records match your search filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedDuplicates.map((m) => (
                      <TableRow
                        key={m.mother_id}
                        onClick={() =>
                          navigate(`/superadmin/mother/${m.mother_id}`, {
                            state: {
                              returnTo: "/superadmin/database-maintenance",
                              returnLabel: "Database Maintenance",
                            },
                          })
                        }
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="text-xs font-mono font-medium text-rose-600 dark:text-rose-400">
                          {m.family_serial_no || "Unassigned"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {m.user?.first_name} {m.user?.last_name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(m.birth_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">{m.blood_type || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {m.facilityEnrollments?.[0]?.facility?.facility_name || "Unassigned"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.user?.phone_number || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <ChevronRight className="size-4 text-muted-foreground/60 inline-block" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePaginationFooter
                rowCount={filteredDuplicates.length}
                page={duplicatePage}
                pageSize={duplicatePageSize}
                onPageChange={setDuplicatePage}
                onPageSizeChange={setDuplicatePageSize}
              />
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
