import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ConfirmSensitiveActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}

export function ConfirmSensitiveActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmSensitiveActionDialogProps) {
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (!open) setPassword("")
  }, [open])

  const confirm = () => {
    if (!password.trim()) return
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-5 p-5 sm:max-w-lg sm:p-6">
        <DialogHeader className="gap-2 pr-6">
          <DialogTitle className="text-base font-semibold leading-snug">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{description}</DialogDescription>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="sensitive-action-password" className="text-sm font-medium">Enter your password</Label>
          <Input
            id="sensitive-action-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && password.trim()) confirm()
            }}
            className="h-10 text-sm"
          />
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={!password.trim()} onClick={confirm} className="h-10 px-4">
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
