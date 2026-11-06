import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SheetDescription, SheetTitle } from "@/components/ui/sheet"

type DrawerHeadingProps = {
  icon: LucideIcon
  title: ReactNode
  description: ReactNode
  trailing?: ReactNode
  className?: string
}

export function DrawerHeading({ icon: Icon, title, description, trailing, className }: DrawerHeadingProps) {
  return (
    <header className={cn("flex min-h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5 py-2.5", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent ring-1 ring-sidebar-border">
        <Icon className="size-4 text-sidebar-foreground/70" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col text-left">
        <SheetTitle className="truncate text-xs font-medium leading-4 text-foreground">{title}</SheetTitle>
        <SheetDescription className="truncate text-xs leading-4 text-muted-foreground">{description}</SheetDescription>
      </div>
      {trailing}
    </header>
  )
}
