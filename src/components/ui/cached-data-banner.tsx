import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function CachedDataBanner({
  className,
  message = "Viewing cached offline snapshot. Real-time municipal telemetry and synchronization will resume when internet connectivity returns.",
}: {
  className?: string
  message?: string
}) {
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine)

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 ${
        className ?? ""
      }`}
    >
      <WifiOff className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="flex-1 font-medium">{message}</span>
    </div>
  )
}
