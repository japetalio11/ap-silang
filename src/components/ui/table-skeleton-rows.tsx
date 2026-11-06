import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

/** Keeps a table's column rhythm visible while its rows are being fetched. */
export function TableSkeletonRows({ columns, rows = 5, checkboxColumn = true }: { columns: number; rows?: number; checkboxColumn?: boolean }) {
  const widths = ["w-4/5", "w-3/5", "w-2/3", "w-4/5", "w-1/2", "w-3/4"]
  return <>
    {Array.from({ length: rows }, (_, rowIndex) => <TableRow key={rowIndex} aria-hidden="true" className="border-sidebar-border">
      {Array.from({ length: columns }, (_, columnIndex) => <TableCell key={columnIndex}>
        {checkboxColumn && columnIndex === 0
          ? <Skeleton className="mx-auto size-4 rounded-sm" />
          : <Skeleton className={`h-3.5 ${widths[(rowIndex + columnIndex) % widths.length]}`} />}
      </TableCell>)}
    </TableRow>)}
  </>
}
