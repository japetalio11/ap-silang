import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

interface ResponsiveModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  className?: string;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  className = "sm:max-w-[425px]"
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className="bg-background dark:bg-[#0a0a0a] border-t border-sidebar-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden focus-visible:outline-none flex flex-col px-4 pb-4 max-h-[85dvh]">
          {(title || description) && (
              <DrawerHeader className="shrink-0 px-0 pt-2 pb-4 text-left">
                {title && <DrawerTitle className="text-base font-semibold text-foreground dark:text-white">{title}</DrawerTitle>}
                {description && <DrawerDescription className="text-xs text-muted-foreground">{description}</DrawerDescription>}
              </DrawerHeader>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar pt-2">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={`bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground ${className}`}>
        {(title || description) && (
          <DialogHeader className="gap-1">
            {title && <DialogTitle className="text-base font-semibold text-foreground dark:text-white">{title}</DialogTitle>}
            {description && <DialogDescription className="text-xs text-muted-foreground">{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}
