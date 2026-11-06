import { useState } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type TablePaginationFooterProps = {
  rowCount: number
  selectedCount?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  className?: string
}

export function TablePaginationFooter({
  rowCount,
  selectedCount = 0,
  page = 1,
  pageSize: controlledPageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationFooterProps) {
  const [localPageSize, setLocalPageSize] = useState(controlledPageSize ?? 10)
  const pageSize = controlledPageSize ?? localPageSize
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize))
  const isFirstPage = page <= 1
  const isLastPage = page >= pageCount
  const setPageSize = (value: string) => {
    const nextPageSize = Number(value)
    if (controlledPageSize === undefined) setLocalPageSize(nextPageSize)
    onPageSizeChange?.(nextPageSize)
  }

  return (
    <div className={cn("flex min-h-14 w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 px-0 py-3 text-xs text-muted-foreground", className)}>
      <span>{selectedCount} of {rowCount} row(s) selected.</span>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-5">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap font-medium text-foreground">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={setPageSize}>
            <SelectTrigger aria-label="Rows per page" className="h-8 w-[72px] border-sidebar-border bg-background px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {[10, 20, 50].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <span className="whitespace-nowrap font-medium text-foreground">Page {page} of {pageCount}</span>
        <TooltipProvider delayDuration={500}>
          <div className="flex items-center gap-1">
            <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="First page" disabled={isFirstPage} onClick={() => onPageChange?.(1)} className="size-8 border-sidebar-border"><ChevronsLeft className="size-3.5" /></Button></TooltipTrigger><TooltipContent>First page</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Previous page" disabled={isFirstPage} onClick={() => onPageChange?.(Math.max(1, page - 1))} className="size-8 border-sidebar-border"><ChevronLeft className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Previous page</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Next page" disabled={isLastPage} onClick={() => onPageChange?.(Math.min(pageCount, page + 1))} className="size-8 border-sidebar-border"><ChevronRight className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Next page</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Last page" disabled={isLastPage} onClick={() => onPageChange?.(pageCount)} className="size-8 border-sidebar-border"><ChevronsRight className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Last page</TooltipContent></Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}
