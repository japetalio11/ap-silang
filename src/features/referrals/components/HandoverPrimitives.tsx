import { useEffect, useState, type ReactNode } from "react"
import { Download, FileText, Moon, Sun, UserRound, X, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { backendAssetUrl } from "@/lib/api"

export function prettyDate(value?: string | null, withTime = false) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-PH", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date)
}

export function valueOr(value: unknown, fallback = "Not recorded") {
  return value === null || value === undefined || value === "" ? fallback : String(value)
}

export function DrawerDetail({ icon: Icon, label, children }: { icon: typeof UserRound; label: string; children: ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-3 py-2 text-xs">
    <div className="flex min-w-0 items-center gap-2 text-muted-foreground"><Icon className="size-3.5 shrink-0" /><span>{label}</span></div>
    <div className="min-w-0 break-words text-right font-medium text-sidebar-foreground">{children}</div>
  </div>
}

export function ClinicalField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`min-w-0 ${className}`}>
    <dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 min-w-0 break-words text-sm font-medium leading-5 text-foreground">{value}</dd>
  </div>
}

export type HandoverEhrRecord = {
  screening_id?: string
  screening_type?: string
  result?: string | null
  date_of_screening?: string
  remarks?: string | null
  file_url?: string | null
}

export type HandoverTableRow = { id: string; cells: ReactNode[]; onClick?: () => void }

export function HandoverTable({ headers, rows, emptyTitle, emptyDescription }: { headers: string[]; rows: HandoverTableRow[]; emptyTitle: string; emptyDescription: string }) {
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selected.includes(row.id))

  return <>
    <div className="hidden overflow-x-auto rounded-md border border-sidebar-border bg-background dark:bg-black md:block">
      <div className="min-w-[720px]">
        <Table>
          <TableHeader className="bg-card dark:bg-[#111]">
            <TableRow className="border-sidebar-border hover:bg-transparent">
              <TableHead className="h-8 w-12 py-1.5 pl-4 text-center"><Checkbox aria-label="Select all visible records" checked={allVisibleSelected} onCheckedChange={(checked) => setSelected((current) => checked ? [...new Set([...current, ...visibleRows.map((row) => row.id)])] : current.filter((id) => !visibleRows.some((row) => row.id === id)))} className="border-sidebar-border" /></TableHead>
              {headers.map((header) => <TableHead key={header} className="h-8 whitespace-nowrap px-2 py-1.5 text-xs font-medium leading-tight text-foreground">{header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => <TableRow key={row.id} className={`border-sidebar-border hover:bg-muted/50 ${row.onClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`} onClick={row.onClick} onKeyDown={row.onClick ? (event) => { if ((event.key === "Enter" || event.key === " ") && !(event.target as HTMLElement).closest("button, a, input, [role='checkbox']")) { event.preventDefault(); row.onClick?.() } } : undefined} tabIndex={row.onClick ? 0 : undefined}>
              <TableCell className="w-12 py-3 pl-4 text-center" onClick={(event) => event.stopPropagation()}><Checkbox aria-label={`Select record ${row.id}`} checked={selected.includes(row.id)} onCheckedChange={(checked) => setSelected((current) => checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id))} className="border-sidebar-border" /></TableCell>
              {row.cells.map((cell, index) => <TableCell key={`${row.id}-${index}`} className="max-w-64 whitespace-normal px-2 py-3 text-xs leading-relaxed align-middle">{cell}</TableCell>)}
            </TableRow>)}
            {rows.length === 0 && <TableEmptyState colSpan={headers.length + 1} icon={FileText} title={emptyTitle} description={emptyDescription} />}
          </TableBody>
        </Table>
      </div>
    </div>
    <div className="space-y-2 md:hidden">
      {visibleRows.map((row) => <article
        key={row.id}
        role={row.onClick ? "button" : undefined}
        tabIndex={row.onClick ? 0 : undefined}
        aria-label={row.onClick ? `Open record ${row.id}` : undefined}
        onClick={row.onClick ? (event) => {
          const target = event.target as HTMLElement
          if (target.closest("button, a, input, [role='checkbox'], [role='menuitem']")) return
          row.onClick?.()
        } : undefined}
        onKeyDown={row.onClick ? (event) => {
          if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return
          event.preventDefault()
          row.onClick?.()
        } : undefined}
        className={`rounded-md border border-sidebar-border bg-background p-3 dark:bg-black ${row.onClick ? "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`}
      >
        <div className="flex items-start gap-3">
          <Checkbox aria-label={`Select record ${row.id}`} checked={selected.includes(row.id)} onClick={(event) => event.stopPropagation()} onCheckedChange={(checked) => setSelected((current) => checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id))} className="mt-1 border-sidebar-border" />
          <div className="min-w-0 flex-1">
            <div className="min-w-0 font-medium text-foreground">{row.cells[0]}</div>
            <div className="mt-3 grid min-w-0 grid-cols-3 gap-3 text-xs">
              {row.cells.slice(1).map((cell, index) => <div key={`${row.id}-${index + 1}`} className="min-w-0">
                <p className="text-muted-foreground">{headers[index + 1]}</p><div className="mt-1 break-words font-medium text-foreground">{cell}</div>
              </div>)}
            </div>
          </div>
        </div>
      </article>)}
      {rows.length === 0 && <div className="rounded-md border border-sidebar-border p-6 text-center text-xs"><p className="font-medium">{emptyTitle}</p><p className="mt-1 text-muted-foreground">{emptyDescription}</p></div>}
    </div>
    <TablePaginationFooter rowCount={rows.length} selectedCount={selected.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
  </>
}

export function attachmentName(fileUrl?: string | null, fallback = "Health record") {
  if (!fileUrl) return fallback
  try {
    const pathname = new URL(fileUrl, window.location.origin).pathname
    return decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "") || fallback
  } catch {
    return fallback
  }
}

export function attachmentUrl(fileUrl?: string | null) {
  if (!fileUrl) return ""
  return backendAssetUrl(fileUrl)
}

export function HandoverEhrPreview({ record, onClose }: { record: HandoverEhrRecord | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(100)
  const fileUrl = record?.file_url
  const fileName = attachmentName(fileUrl, record?.screening_type || "Health record")
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""
  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(extension)
  const isPdf = extension === "pdf"
  const previewUrl = attachmentUrl(fileUrl)

  useEffect(() => {
    if (!record) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [record, onClose])

  if (!record || !fileUrl) return null

  return <div className="fixed inset-0 z-[100] bg-background/95 text-foreground" role="presentation" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`Preview ${fileName}`} className="fixed inset-0" onClick={(event) => event.stopPropagation()}>
      <header className="fixed inset-x-0 top-0 z-[101] flex h-14 items-center justify-between gap-3 border-b border-sidebar-border bg-background px-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{fileName}</div>
          <div className="truncate text-xs text-muted-foreground">{record.screening_type || "Health Record"}{record.date_of_screening ? ` · ${prettyDate(record.date_of_screening)}` : ""}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-sidebar-border p-0.5">
            <Button variant="ghost" size="icon" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 50} onClick={() => setZoom((value) => Math.max(50, value - 25))} className="size-7"><ZoomOut className="size-4" /></Button>
            <button type="button" onClick={() => setZoom(100)} className="min-w-12 px-1 text-center text-xs tabular-nums text-muted-foreground" aria-label="Reset zoom">{zoom}%</button>
            <Button variant="ghost" size="icon" aria-label="Zoom in" title="Zoom in" disabled={zoom >= 200} onClick={() => setZoom((value) => Math.min(200, value + 25))} className="size-7"><ZoomIn className="size-4" /></Button>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs"><a href={previewUrl} download={fileName}><Download className="size-3.5" /><span className="hidden sm:inline">Download</span></a></Button>
          <Button variant="ghost" size="icon" aria-label="Close preview" title="Close" onClick={onClose} className="size-8 text-muted-foreground"><X className="size-4" /></Button>
        </div>
      </header>
      <main className="fixed inset-x-0 bottom-0 top-14 flex items-center justify-center overflow-auto bg-muted/35 p-3 sm:p-6">
        {isImage && previewUrl ? <img src={previewUrl} alt={fileName} className="max-h-full max-w-full object-contain transition-transform duration-150" style={{ transform: `scale(${zoom / 100})` }} />
          : isPdf && previewUrl ? <iframe src={previewUrl} title={fileName} className="h-full min-h-0 w-full border-0 bg-background transition-transform duration-150" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }} />
            : <div className="flex flex-col items-center gap-3 text-center"><FileText className="size-10 text-muted-foreground" /><p className="text-sm font-medium">Preview isn’t available for this file</p>{previewUrl && <Button asChild className="h-8 gap-1.5 px-3 text-xs"><a href={previewUrl} download={fileName}><Download className="size-3.5" />Download file</a></Button>}</div>}
      </main>
    </div>
  </div>
}

export function ThemeToggleButton({ isDarkMode, onToggle, className = "relative size-8" }: { isDarkMode: boolean; onToggle: () => void; className?: string }) {
  return <Button
    type="button"
    variant="ghost"
    size="icon"
    className={`${className} text-muted-foreground hover:text-foreground`}
    aria-label="Toggle theme"
    title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    onClick={onToggle}
  >
    <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
    <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    <span className="sr-only">Toggle theme</span>
  </Button>
}
