import type { ReactNode } from "react"
import { MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function TableRowActions({
  label = "Row actions",
  children,
  className,
}: {
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={label}
                onClick={(event) => event.stopPropagation()}
                className={`size-7 shrink-0 text-muted-foreground hover:text-foreground ${className ?? ""}`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>More actions</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-52 rounded-lg border border-border/70 bg-popover p-1.5 shadow-md">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
