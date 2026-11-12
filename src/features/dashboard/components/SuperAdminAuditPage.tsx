import { useEffect, useMemo, useState } from "react"
import { FileText, RefreshCw, RotateCcw, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuthSession } from "@/features/auth/auth-session"
import { fetchAuditLogs, type AuditLogEntry } from "../api/superadmin-api"

export function SuperAdminAuditPage() {
  const { session } = useAuthSession()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

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
    if (!term) return logs
    return logs.filter((log) => {
      const userName = `${log.user?.first_name || ""} ${log.user?.last_name || ""}`.toLowerCase()
      const action = (log.action || "").toLowerCase()
      const table = (log.table_name || "").toLowerCase()
      const details = (log.details || "").toLowerCase()
      return userName.includes(term) || action.includes(term) || table.includes(term) || details.includes(term)
    })
  }, [logs, query])

  return (
    <section className="w-full space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Municipal System Audit Trail</h1>
          <p className="text-xs text-muted-foreground">
            Immutable log of clinical and administrative operations across all facilities.
          </p>
        </div>
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[320px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user, action, table, or details..."
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
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Performing User</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow key={log.audit_id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{log.table_name}</TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-foreground">
                      {log.user ? `${log.user.first_name} ${log.user.last_name}` : "System Service"}
                    </div>
                    {log.user?.role && (
                      <div className="text-[11px] text-muted-foreground">{log.user.role}</div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate text-xs text-muted-foreground" title={log.details || ""}>
                    {log.details || "—"}
                  </TableCell>
                </TableRow>
              ))
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
    </section>
  )
}
