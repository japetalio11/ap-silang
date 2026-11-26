import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, FileText, PlusCircle, RefreshCw, RotateCcw, Search, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { CachedDataBanner } from "@/components/ui/cached-data-banner"
import { TableSkeletonRows } from "@/components/ui/table-skeleton-rows"
import { MobileTableCardSkeleton } from "@/components/ui/mobile-table-card-skeleton"
import { EmptyStateContent, TableEmptyState } from "@/components/ui/table-empty-state"
import { useAuthSession } from "@/features/auth/auth-session"
import { fetchAuditLogs, type AuditLogEntry } from "../api/superadmin-api"

export function SuperAdminAuditPage() {
  const { session } = useAuthSession()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState("all")
  const [tableFilter, setTableFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<string[]>([])
  const token = session?.token

  const loadLogs = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const records = await fetchAuditLogs(token)
      setLogs(records)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load audit logs"
      toast.error("Error loading audit logs", { description: message })
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    queueMicrotask(() => { void loadLogs() })
  }, [loadLogs])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const action = (log.action_type || log.action || "").toLowerCase()
      const table = (log.table_name || "").toLowerCase()
      const searchable = [log.action_type, log.action, log.table_name, log.details, log.user?.first_name, log.user?.last_name, log.user?.facility?.facility_name].join(" ").toLowerCase()
      if (query.trim() && !searchable.includes(query.trim().toLowerCase())) return false

      if (actionFilter !== "all" && !action.includes(actionFilter.toLowerCase())) {
        return false
      }
      if (tableFilter !== "all" && !table.includes(tableFilter.toLowerCase())) {
        return false
      }

      return true
    })
  }, [logs, actionFilter, tableFilter, query])

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
    <section className="w-full space-y-4 px-4 pb-8 pt-4 text-foreground">
      <CachedDataBanner />
      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 bg-background px-4 py-3 dark:bg-black">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <div className="relative w-full sm:w-[280px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Search audit trail..." aria-label="Search audit trail" className="h-8 w-full pl-8 text-xs" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Popover><PopoverTrigger asChild><Button variant="filter" size="filter"><PlusCircle className="size-3.5" />Action</Button></PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-3"><div className="flex flex-col gap-3">
            {[["all", "All actions"], ["CREATE", "Create"], ["UPDATE", "Update"], ["DELETE", "Delete"], ["LOGIN", "Login"], ["RESOLVE", "Resolve"]].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={actionFilter === value} onCheckedChange={() => { setActionFilter(value); setPage(1) }} className="size-3.5 rounded-[4px] border-sidebar-border" />{label}</label>
            ))}
          </div></PopoverContent>
        </Popover>
        <Popover><PopoverTrigger asChild><Button variant="filter" size="filter"><PlusCircle className="size-3.5" />Record</Button></PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-3"><div className="flex flex-col gap-3">
            {[["all", "All records"], ["facility", "Facility"], ["user", "User / Staff"], ["mother", "Mother"], ["pregnancy", "Pregnancy"], ["prenatal", "Prenatal Visit"], ["referral", "Online Referral"], ["delivery", "Delivery Outcome"]].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={tableFilter === value} onCheckedChange={() => { setTableFilter(value); setPage(1) }} className="size-3.5 rounded-[4px] border-sidebar-border" />{label}</label>
            ))}
          </div></PopoverContent>
        </Popover>
        {(query.trim().length > 0 || actionFilter !== "all" || tableFilter !== "all") && (
          <Button variant="ghost" className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground" onClick={() => { setQuery(""); setActionFilter("all"); setTableFilter("all"); setPage(1) }}><RotateCcw className="size-3.5" />Reset Filter</Button>
        )}
        <div className="ml-auto flex items-center gap-2 sm:hidden">
          <Button variant="outline" className="size-8" size="icon" aria-label="Export audit trail" onClick={exportAuditCsv} disabled={loading || filteredLogs.length === 0}><Download className="size-3.5" /></Button>
          <Button variant="outline" className="size-8" size="icon" aria-label="Refresh audit trail" onClick={loadLogs} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
        </div>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            aria-label="Export audit trail"
            title="Export audit trail"
            onClick={exportAuditCsv}
            disabled={loading || filteredLogs.length === 0}
          >
            <Download className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            aria-label="Refresh audit trail"
            title="Refresh audit trail"
            onClick={() => {
              loadLogs()
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      </div>

      <div className="hidden w-full overflow-hidden rounded-md border border-sidebar-border bg-background dark:bg-black md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox aria-label="Select all audit entries on this page" checked={paginatedLogs.length > 0 && paginatedLogs.every((log) => selected.includes(log.audit_id))} onCheckedChange={(checked) => setSelected(checked ? [...new Set([...selected, ...paginatedLogs.map((log) => log.audit_id)])] : selected.filter((id) => !paginatedLogs.some((log) => log.audit_id === id)))} /></TableHead>
              <TableHead className="w-[170px]">Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Performing User & Facility</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={6} rows={5} />
            ) : paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => {
                const action = log.action_type || log.action || "LOG"
                const isSensitive = action.includes("DELETE") || action.includes("DEACTIVATE")
                const time = log.timestamp || log.client_timestamp
                return (
                  <TableRow key={log.audit_id}>
                    <TableCell><Checkbox aria-label={`Select audit entry ${log.audit_id}`} checked={selected.includes(log.audit_id)} onCheckedChange={(checked) => setSelected((current) => checked ? [...current, log.audit_id] : current.filter((id) => id !== log.audit_id))} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {time ? new Date(time).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium ${
                          isSensitive
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {isSensitive && <ShieldAlert className="size-3" />}
                        {action.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-xs text-foreground">{log.table_name}</TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-foreground">
                        {log.user ? `${log.user.first_name} ${log.user.last_name}` : "System / Automated"}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
              <TableEmptyState colSpan={6} icon={FileText} title="No audit entries found" description="Try a different search or filter." />
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 md:hidden">
        {!loading && paginatedLogs.length > 0 && (
          <label className="flex min-h-8 items-center gap-2 px-1 text-xs text-muted-foreground">
            <Checkbox aria-label="Select all audit entries on this page" checked={paginatedLogs.every((log) => selected.includes(log.audit_id))} onCheckedChange={(checked) => setSelected(checked ? [...new Set([...selected, ...paginatedLogs.map((log) => log.audit_id)])] : selected.filter((id) => !paginatedLogs.some((log) => log.audit_id === id)))} />
            Select page
          </label>
        )}
        {loading ? (
          <MobileTableCardSkeleton count={3} />
        ) : (
          paginatedLogs.map((log) => {
            const action = log.action_type || log.action || "LOG"
            const time = log.timestamp || log.client_timestamp
            return (
              <article key={log.audit_id} data-mobile-record className="min-w-0 rounded-md border border-sidebar-border bg-background p-3 text-xs dark:bg-black">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Checkbox aria-label={`Select audit entry ${log.audit_id}`} checked={selected.includes(log.audit_id)} onCheckedChange={(checked) => setSelected((current) => checked ? [...current, log.audit_id] : current.filter((id) => id !== log.audit_id))} className="shrink-0 border-sidebar-border" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="min-w-0 font-semibold text-foreground">{log.user ? `${log.user.first_name} ${log.user.last_name}` : "System / Automated"}</h3>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-medium ${action.includes("DELETE") || action.includes("DEACTIVATE") ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-muted text-foreground"}`}>
                    {(action.includes("DELETE") || action.includes("DEACTIVATE")) && <ShieldAlert className="size-3" />}
                    {action.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div className="min-w-0"><p className="text-muted-foreground">Date & time</p><time className="mt-1 block break-words font-medium text-foreground" dateTime={time || undefined}>{time ? new Date(time).toLocaleString() : "—"}</time></div>
                  <div className="min-w-0"><p className="text-muted-foreground">Facility</p><p className="mt-1 break-words font-medium text-foreground">{log.user?.facility?.facility_name || "MHO Central"}</p></div>
                  <div className="min-w-0"><p className="text-muted-foreground">Record</p><p className="mt-1 break-words font-medium text-foreground">{log.table_name || "Record"}</p></div>
                  {(log.details || log.new_state) && <div className="col-span-3 min-w-0"><p className="text-muted-foreground">Details</p><p className="mt-1 break-words font-medium text-foreground">{log.details || log.new_state}</p></div>}
                </div>
              </article>
            )
          })
        )}
        {!loading && filteredLogs.length === 0 && (
          <div className="rounded-md border border-sidebar-border p-6"><EmptyStateContent icon={FileText} title="No audit entries found" description="Try a different search or filter." /></div>
        )}
      </div>

      <TablePaginationFooter
        rowCount={filteredLogs.length}
        selectedCount={selected.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  )
}
