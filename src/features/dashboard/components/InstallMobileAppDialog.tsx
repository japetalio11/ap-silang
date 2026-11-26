import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { X } from "lucide-react"
import mobileQr from "@/assets/silang-mobile-qr.svg"

const appDownloadUrl = "https://drive.google.com/file/d/14cKwzORQ0BF1UAU8F1oIJQaMgsWxHJb9/view?pli=1"

interface InstallMobileAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstallMobileAppDialog({ open, onOpenChange }: InstallMobileAppDialogProps) {
  const isMobile = useIsMobile()
  const downloadButton = (
    <Button asChild className="w-full">
      <a href={appDownloadUrl} target="_blank" rel="noreferrer">
        Download Silang Mobile
      </a>
    </Button>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent tour={false} className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-xl border-x-0 border-b-0 bg-background px-4 pb-4 pt-0 before:hidden">
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close" className="absolute right-4 top-4 z-10 size-8">
              <X className="size-4" />
            </Button>
          </DrawerClose>
          <DrawerHeader className="shrink-0 px-0 pb-3 pt-3 text-center">
            <DrawerTitle className="text-center">Install Silang Mobile for Mothers</DrawerTitle>
            <DrawerDescription className="text-center">Scan the QR code or download the app.</DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-col items-center overflow-y-auto py-2">
            <div className="rounded-lg bg-white p-3">
              <img src={mobileQr} alt="QR code to install Silang Mobile for Mothers" className="size-52 max-w-full object-contain" />
            </div>
          </div>
          <DrawerFooter className="shrink-0 px-0 pb-0 pt-3">
            {downloadButton}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(92vw,400px)] gap-0 p-5">
        <DialogHeader className="pb-4 text-left">
          <DialogTitle>Install Silang Mobile for Mothers</DialogTitle>
          <DialogDescription>Scan the QR code or download the app.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pb-4">
          <div className="rounded-lg bg-white p-3">
            <img src={mobileQr} alt="QR code to install Silang Mobile for Mothers" className="size-52 object-contain" />
          </div>
        </div>
        <DialogFooter className="sm:justify-stretch">
          {downloadButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
