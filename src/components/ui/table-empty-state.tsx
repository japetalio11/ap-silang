import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ClipboardCheck } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"

type EmptyStateContentProps = {
  icon?: LucideIcon
  title: string
  description: string
  action?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

export function EmptyStateContent({
  icon: Icon = ClipboardCheck,
  title,
  description,
  action,
  secondaryAction,
  className = "",
}: EmptyStateContentProps) {
  return (
    <div className={`flex min-h-[220px] w-full flex-col items-center justify-center gap-3 px-6 py-8 text-center ${className}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground dark:bg-[#222]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col items-center gap-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
      {secondaryAction}
    </div>
  )
}

export function TableEmptyState({
  colSpan,
  ...contentProps
}: EmptyStateContentProps & { colSpan: number }) {
  return (
    <TableRow className="border-sidebar-border hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-auto p-0">
        <EmptyStateContent {...contentProps} />
      </TableCell>
    </TableRow>
  )
}
