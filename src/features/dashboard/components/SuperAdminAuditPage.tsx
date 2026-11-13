import { useEffect, useMemo, useState } from "react"
import { Download, FileText, RefreshCw, RotateCcw, Search, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { CachedDataBanner } from "@/components/ui/cached-data-banner"
import { useAuthSession } from "@/features/auth/auth-session"
import { fetchAuditLogs, type AuditLogEntry } from "../api/superadmin-api"

export function SuperAdminAuditPage() {
  const { session } = useAuthSession()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [tableFilter, setTableFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    setPage(1)
  }, [query, actionFilter, tableFilter])

  const loadLogs = async () => {
    if (!session?.token) return
    setLoading(true)
    try {
      const records = await fetchAuditLogs(session.token)
      setLogs(records)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load audit logs"
      toast.error("Error loading audit logs", { description: message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [session?.token])

  const filteredLogs = useMemo(() => {
    const term = query.trim().toLowerCase()
    return logs.filter((log) => {
      const action = (log.action_type || log.action || "").toLowerCase()
      const table = (log.table_name || "").toLowerCase()

      if (actionFilter !== "all" && !action.includes(actionFilter.toLowerCase())) {
        return false
      }
      if (tableFilter !== "all" && !table.includes(tableFilter.toLowerCase())) {
        return false
      }

      if (!term) return true

      const userName = `${log.user?.first_name || ""} ${log.user?.last_name || ""}`.toLowerCase()
      const email = (log.user?.email || "").toLowerCase()
      const facName = (log.user?.facility?.facility_name || "").toLowerCase()
      const details = (log.details || log.new_state || "").toLowerCase()

      return (
        userName.includes(term) ||
        email.includes(term) ||
        facName.includes(term) ||
        action.includes(term) ||
        table.includes(term) ||
        details.includes(term)
      )
    })
  }, [logs, query, actionFilter, tableFilter])

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, page, pageSize])

  const exportAuditCsv = () => {
    if (!filteredLogs.length) return
    const rows = [
      ["Timestamp", "Action", "Target Entity", "User Name", "User Role", "Facility", "Details"],
      ...filteredLogs.map((log) => {
        const time = log.timestamp || log.client_timestamp || ""
        const action = log.action_type || log.action || "UNKNOWN"
        const table = log.table_name || ""
        const userName = log.user ? `${log.user.first_name} ${log.user.last_name}` : "System"
        const role = log.user?.role || "System"
        const fac = log.user?.facility?.facility_name || "Central MHO"
        const details = log.details || (log.new_state ? `State: ${log.new_state}` : "—")
        return [
          new Date(time).toISOString(),
          action,
          table,
          userName,
          role,
          fac,
          details,
        ]
      }),
    ]

    const csv = `\ufeff${rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\r\n")}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `Silang_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success("Audit log exported to CSV")
  }

  return (
    <section className="w-full space-y-4 px-4 py-4">
      <CachedDataBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Municipal System Audit Trail</h1>
          <p className="text-xs text-muted-foreground">
            Immutable log of clinical and administrative operations across all facilities in Silang.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={exportAuditCsv}
            disabled={loading || filteredLogs.length === 0}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              loadLogs()
              toast.success("Audit trail refreshed")
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[280px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user, facility, table, details..."
            className="h-8 w-full border-sidebar-border bg-muted/70 px-2 pl-8 text-xs dark:bg-muted/60"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="CREATE">CREATE</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="LOGIN">LOGIN</SelectItem>
            <SelectItem value="RESOLVE">RESOLVE</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="All Tables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            <SelectItem value="facility">Facility</SelectItem>
            <SelectItem value="user">User / Staff</SelectItem>
            <SelectItem value="mother">Mother</SelectItem>
            <SelectItem value="pregnancy">Pregnancy</SelectItem>
            <SelectItem value="prenatal">Prenatal Visit</SelectItem>
            <SelectItem value="referral">Online Referral</SelectItem>
            <SelectItem value="delivery">Delivery Outcome</SelectItem>
          </SelectContent>
        </Select>

        {(query.trim().length > 0 || actionFilter !== "all" || tableFilter !== "all") && (
          <Button
            variant="ghost"
            className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"
            onClick={() => {
              setQuery("")
              setActionFilter("all")
              setTableFilter("all")
            }}
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
              <TableHead className="w-[170px]">Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Performing User & Facility</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => {
                const action = log.action_type || log.action || "LOG"
                const isSensitive = action.includes("DELETE") || action.includes("DEACTIVATE")
                const time = log.timestamp || log.client_timestamp
                return (
                  <TableRow key={log.audit_id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {time ? new Date(time).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs font-medium ${
                          isSensitive
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {isSensitive && <ShieldAlert className="size-3" />}
                        {action}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-xs text-foreground">{log.table_name}</TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-foreground">
                        {log.user ? `${log.user.first_name} ${log.user.last_name}` : "System / Automated"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {log.user?.role || "System"} · {log.user?.facility?.facility_name || "MHO Central"}
                      </div>
                    </TableCell>
                    <TableCell
                      className="max-w-[400px] truncate text-xs text-muted-foreground"
                      title={log.details || log.new_state || ""}
                    >
                      {log.details || log.new_state || "—"}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FileText className="size-6 text-muted-foreground/60" />
                    <span>{loading ? "Loading audit records..." : "No matching audit log entries found."}</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationFooter
        rowCount={filteredLogs.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  )
}
