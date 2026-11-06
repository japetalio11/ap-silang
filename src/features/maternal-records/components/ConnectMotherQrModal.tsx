import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, Check, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function ConnectMotherQrModal({ open, onOpenChange, onConnect }: { open: boolean; onOpenChange: (open: boolean) => void; onConnect: (code: string) => Promise<void> }) {
  const readerId = `mother-qr-reader-${useId().replace(/:/g, "")}`
  const [code, setCode] = useState("")
  const [scanMessage, setScanMessage] = useState("Enable camera access to scan a mother’s QR code.")
  const [cameraError, setCameraError] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const capturedRef = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const cameraRequestedRef = useRef(false)
  const startingCameraRef = useRef(false)

  useEffect(() => {
    return () => {
      cameraRequestedRef.current = false
      const scanner = scannerRef.current
      scannerRef.current = null
      if (!scanner) return
      if (scanner.isScanning) void scanner.stop().then(() => scanner.clear()).catch(() => undefined)
      else { try { scanner.clear() } catch { /* Scanner may still be initializing. */ } }
    }
  }, [])

  const stopScanner = async () => {
    cameraRequestedRef.current = false
    const scanner = scannerRef.current
    scannerRef.current = null
    setIsScanning(false)
    if (!scanner) return
    try {
      if (scanner.isScanning) await scanner.stop()
      scanner.clear()
    } catch { /* The scanner may already be stopping or still initializing. */ }
  }

  const startScanner = useCallback(async () => {
    if (startingCameraRef.current || scannerRef.current) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(true)
      setScanMessage("Camera access requires a secure browser connection. Enter the mother’s code below.")
      toast.error("Camera access is unavailable", { description: "Open Silang on localhost or a secure HTTPS connection." })
      return
    }

    const target = document.getElementById(readerId)
    if (!target) {
      toast.error("The QR scanner is not ready. Close and reopen this window.")
      return
    }

    cameraRequestedRef.current = true
    startingCameraRef.current = true
    setCameraError(false)
    setIsStartingCamera(true)
    setScanMessage("Waiting for camera permission…")
    const scanner = new Html5Qrcode(readerId, { verbose: false })
    scannerRef.current = scanner
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 180, height: 180 }, aspectRatio: 1 },
        (decodedText) => {
          if (!cameraRequestedRef.current || capturedRef.current) return
          capturedRef.current = true
          setCode(decodedText.trim())
          setCaptured(true)
          setScanMessage("QR code captured. Confirm the code below to continue.")
          void stopScanner()
        },
        () => undefined,
      )
      if (!cameraRequestedRef.current) {
        if (scanner.isScanning) await scanner.stop()
        scanner.clear()
        return
      }
      setIsScanning(true)
      setScanMessage("Camera is active. Hold the mother’s QR code in the frame.")
    } catch (error) {
      scannerRef.current = null
      try {
        if (scanner.isScanning) await scanner.stop()
        scanner.clear()
      } catch { /* Scanner may not have initialized. */ }
      if (!cameraRequestedRef.current) return
      setCameraError(true)
      const name = error instanceof DOMException ? error.name : ""
      const message = name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "Camera permission was denied. Allow camera access in your browser settings, or enter the code manually."
        : name === "NotFoundError" || name === "DevicesNotFoundError"
          ? "No camera was found. Enter the mother’s code manually."
          : "Camera could not start. Check browser permission and try again, or enter the code manually."
      setScanMessage(message)
      toast.error("Unable to start the QR scanner", { description: message })
    } finally {
      startingCameraRef.current = false
      setIsStartingCamera(false)
    }
  }, [readerId])

  useEffect(() => {
    if (!open) return
    // Request permission immediately when the dialog opens so the live scanner
    // is ready without requiring a second click.
    const timer = window.setTimeout(() => void startScanner(), 0)
    return () => window.clearTimeout(timer)
  }, [open, startScanner])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCode("")
      capturedRef.current = false
      setCaptured(false)
      setCameraError(false)
      setScanMessage("Enable camera access to scan a mother’s QR code.")
      void stopScanner()
    }
    onOpenChange(nextOpen)
  }

  const connectMother = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!code.trim() || isConnecting) return
    setIsConnecting(true)
    try {
      await onConnect(code.trim())
      toast.success("Mother connected to this facility")
      handleOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to connect this mother")
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-4 rounded-xl border-border bg-background p-5 text-foreground sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <span className="mb-1 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <QrCode className="size-4" />
          </span>
          <DialogTitle className="text-base font-semibold text-foreground">Connect a mother</DialogTitle>
          <DialogDescription className="max-w-[300px] text-xs">
            Scan the QR code from the mother’s profile or enter her connection code.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-lg border border-sidebar-border bg-muted/30 dark:bg-muted/20">
          <div id={readerId} className="mother-qr-reader h-full w-full [&_video]:!h-full [&_video]:!w-full [&_video]:!scale-x-[-1] [&_video]:!object-cover [&_img]:!hidden" />
          {!isScanning && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/55 px-6 text-center backdrop-blur-[1px]">
              <Camera className={`size-5 ${cameraError ? "text-muted-foreground" : "text-primary"}`} />
              <span className="text-xs text-muted-foreground">
                {isStartingCamera ? "Requesting camera access…" : cameraError ? "Camera unavailable" : "Preparing camera…"}
              </span>
            </div>
          )}
        </div>

        <p aria-live="polite" className={`min-h-4 text-center text-xs ${captured ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
          {captured && <Check className="mr-1 inline size-3" />}{scanMessage}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>OR enter the code manually</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={connectMother} className="flex flex-col gap-3">
          <Input
            aria-label="Mother connection code"
            autoComplete="off"
            value={code}
            onChange={(event) => {
              capturedRef.current = false
              setCode(event.target.value)
              setCaptured(false)
              setScanMessage("")
            }}
            placeholder="Enter mother’s connection code"
            className="h-10 bg-muted/40 text-xs tracking-wide dark:bg-muted/30"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
          <Button type="submit" disabled={!code.trim() || isConnecting} className="h-9 w-full gap-2 text-xs font-medium">
            {isConnecting ? "Connecting…" : "Connect Mother"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
