import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ConfirmSensitiveActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  consequence?: string
}

export function ConfirmSensitiveActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  consequence,
}: ConfirmSensitiveActionDialogProps) {
  const confirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-4 p-5 sm:max-w-lg sm:p-6">
        <DialogHeader className="gap-2 pr-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4.5" />
            </div>
            <DialogTitle className="text-base font-semibold leading-snug text-foreground">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-foreground dark:border-destructive/30 dark:bg-destructive/10">
          <p className="font-semibold text-destructive">Warning: Irreversible Consequence</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            {consequence ?? "This action cannot be undone. Any linked clinical records, attachments, or history will be permanently deleted or deactivated."}
          </p>
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-2.5 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-4 text-xs">
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} className="h-9 px-4 text-xs font-medium">
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
