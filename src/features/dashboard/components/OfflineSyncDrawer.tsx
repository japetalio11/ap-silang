import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight, Check, CheckCircle2, Clock3, Cloud, GitMerge, RefreshCw, Smartphone, Trash2, Wifi, WifiOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { DrawerHeading } from "@/components/ui/drawer-heading"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuthSession } from "@/features/auth/auth-session"
import { toast } from "sonner"
import { db, type OfflineQueueItem } from "@/lib/db/silangDatabase"
import { silangSyncEngine } from "@/lib/sync/silangSyncEngine"
import {
  getLastSyncedAt,
  getPendingMotherUpdates,
  isAutoSyncOnReconnectEnabled,
  resolveMotherUpdateConflict,
  syncMotherOutbox,
  type OfflineConflictField,
  type PendingMotherUpdate,
} from "@/features/dashboard/offline-maternal-sync"

type Side = "cloud" | "device"

function formatTimestamp(value?: string | null) {
  if (!value) return "Not synced yet"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not synced yet"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
}

function ResolveConflictDialog({
  conflict,
  onClose,
  onResolved,
}: {
  conflict: PendingMotherUpdate | null
  onClose: () => void
  onResolved: (id: string, choices: Record<string, Side>) => Promise<void>
}) {
  const fields = conflict?.conflictingFields ?? []
  const [choices, setChoices] = useState<Record<string, Side>>({})
  const selected = choices
  if (!conflict) return null

  const selectAll = (side: Side) => setChoices(Object.fromEntries(fields.map((field) => [field.key, side])))
  const allChosen = fields.every((field) => selected[field.key])

  return (
    <Dialog open={Boolean(conflict)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border-sidebar-border bg-background p-0 text-foreground sm:max-w-4xl">
        <DialogHeader className="gap-1 px-5 py-4 pr-12">
          <DialogTitle className="text-base font-semibold">Resolve changes for {conflict.motherName}</DialogTitle>
          <DialogDescription className="text-xs">This record changed both online and on this device. Choose which value to keep for each field.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
          <Button type="button" variant="outline" onClick={() => selectAll("cloud")} className="h-8 gap-1.5 px-2.5 text-xs"><Cloud className="size-3.5" />Keep All From Cloud</Button>
          <Button type="button" variant="outline" onClick={() => selectAll("device")} className="h-8 gap-1.5 px-2.5 text-xs"><Smartphone className="size-3.5" />Keep All From This Device</Button>
        </div>

        <div className="grid grid-cols-[minmax(105px,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 bg-muted/40 px-5 py-2.5 text-xs font-medium">
          <span>Field</span><span className="flex items-center gap-1.5"><Cloud className="size-3.5 text-sky-600" />Cloud (Online)</span><span className="flex items-center gap-1.5"><Smartphone className="size-3.5 text-violet-600" />This Device (Offline)</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <div className="flex flex-col gap-2.5">
            {fields.map((field: OfflineConflictField) => (
              <RadioGroup key={field.key} value={selected[field.key]} onValueChange={(side) => setChoices((current) => ({ ...current, [field.key]: side as Side }))} className="grid grid-cols-[minmax(105px,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2">
                <div className="flex items-center py-2 text-xs font-medium">{field.label}</div>
                {(["cloud", "device"] as const).map((side) => {
                  const isCloud = side === "cloud"
                  const id = `${conflict.id}-${String(field.key)}-${side}`
                  const value = isCloud ? field.cloudValue : field.deviceValue
                  return (
                    <label key={side} htmlFor={id} className={`flex min-w-0 cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors ${selected[field.key] === side ? "border-primary bg-primary/5" : "border-sidebar-border hover:bg-muted/40"}`}>
                      <RadioGroupItem id={id} value={side} className="mt-0.5 size-3.5 shrink-0" />
                      <span className="min-w-0 break-words text-xs font-medium">{value}</span>
                    </label>
                  )
                })}
              </RadioGroup>
            ))}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 sm:justify-end">
          <Button type="button" disabled={!allChosen} onClick={() => void onResolved(conflict.id, selected)} className="h-8 gap-1.5 px-3 text-xs"><Check className="size-3.5" />Apply &amp; Sync Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OfflineSyncDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session } = useAuthSession()
  const token = session?.token
  const [tab, setTab] = useState("queue")
  const [items, setItems] = useState<PendingMotherUpdate[]>([])
  const [generalQueue, setGeneralQueue] = useState<OfflineQueueItem[]>([])
  const [demoConflict, setDemoConflict] = useState<PendingMotherUpdate | null>(null)
  const [activeConflict, setActiveConflict] = useState<PendingMotherUpdate | null>(null)
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [queueLoading, setQueueLoading] = useState(true)
  const queueLoaded = useRef(false)
  const syncLock = useRef(false)

  const refreshQueue = useCallback(async () => {
    if (!queueLoaded.current) setQueueLoading(true)
    try {
      setItems(await getPendingMotherUpdates())
      setGeneralQueue(await db.offlineQueue.toArray().catch(() => []))
      setLastSynced(getLastSyncedAt())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read offline updates")
    } finally {
      queueLoaded.current = true
      setQueueLoading(false)
    }
  }, [])

  const syncNow = useCallback(async (notify = true) => {
    if (syncLock.current) return
    if (!token) {
      if (notify) toast.error("Sign in again before syncing saved changes")
      return
    }
    if (!navigator.onLine) {
      setOnline(false)
      if (notify) toast.info("You are offline", { description: "Saved changes will sync when the connection returns." })
      return
    }
    syncLock.current = true
    setSyncing(true)
    try {
      const summary = await syncMotherOutbox(token)
      const generalSummary = await silangSyncEngine.processQueue(token)
      await refreshQueue()
      const totalSynced = summary.synced + generalSummary.synced
      const totalConflicts = summary.conflicts + generalSummary.conflicts
      if (totalConflicts) {
        toast.warning(`${totalConflicts} record${totalConflicts === 1 ? " needs" : "s need"} review`, { description: "Choose which updated information to keep." })
      } else if (notify) {
        if (totalSynced) toast.success(`${totalSynced} offline update${totalSynced === 1 ? "" : "s"} synced`)
        else toast.success("Everything is up to date")
      }
    } catch (error) {
      if (notify) toast.error(error instanceof Error ? error.message : "Unable to sync saved changes")
      await refreshQueue()
    } finally {
      syncLock.current = false
      setSyncing(false)
    }
  }, [refreshQueue, token])

  useEffect(() => {
    const updateNetwork = () => {
      setOnline(navigator.onLine)
      if (navigator.onLine && isAutoSyncOnReconnectEnabled()) void syncNow(false)
    }
    const updateQueue = () => { void refreshQueue() }
    window.addEventListener("online", updateNetwork)
    window.addEventListener("offline", updateNetwork)
    window.addEventListener("silang:outbox-updated", updateQueue)
    queueMicrotask(() => {
      void refreshQueue().then(() => {
        if (navigator.onLine && isAutoSyncOnReconnectEnabled()) void syncNow(false)
      })
    })
    return () => {
      window.removeEventListener("online", updateNetwork)
      window.removeEventListener("offline", updateNetwork)
      window.removeEventListener("silang:outbox-updated", updateQueue)
    }
  }, [refreshQueue, syncNow])

  const pendingCount = items.filter((item) => item.state === "pending").length + generalQueue.length
  const conflicts = [...items.filter((item) => item.state === "conflict"), ...(demoConflict ? [demoConflict] : [])]

  const simulateConflict = () => {
    if (demoConflict) {
      toast.info("A demo conflict is already available to review")
      return
    }
    setDemoConflict({
      id: "demo-conflict-jennifer-mendoza",
      motherId: "demo-mother-jennifer-mendoza",
      motherName: "Jennifer Mendoza",
      queuedAt: new Date().toISOString(),
      baseRecord: {} as PendingMotherUpdate["baseRecord"],
      changes: { civil_status: "Married", blood_type: "B+", phone_number: "0917 999 8888" },
      state: "conflict",
      conflictingFields: [
        { key: "civil_status", label: "Civil Status", cloudValue: "Single", deviceValue: "Married" },
        { key: "blood_type", label: "Blood Type", cloudValue: "O+", deviceValue: "B+" },
        { key: "phone_number", label: "Phone Number", cloudValue: "0917 555 0123", deviceValue: "0917 999 8888" },
      ],
    })
    toast.success("Demo conflict added", { description: "Review the sample changes in the Conflicts tab." })
  }

  const resolveConflict = async (id: string, choices: Record<string, Side>) => {
    if (id === "demo-conflict-jennifer-mendoza") {
      setDemoConflict(null)
      setActiveConflict(null)
      toast.success("Demo conflict resolved", { description: "No maternal record was changed." })
      return
    }
    if (!session?.token) {
      toast.error("Sign in again before resolving this update")
      return
    }
    try {
      await resolveMotherUpdateConflict(id, session.token, choices)
      setActiveConflict(null)
      await refreshQueue()
      toast.success("Maternal record updated and synced")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to resolve this update")
      const refreshedItems = await getPendingMotherUpdates().catch(() => [])
      setItems(refreshedItems)
      setActiveConflict(refreshedItems.find((item) => item.id === id && item.state === "conflict") ?? null)
    }
  }

  const discardItem = async (item: OfflineQueueItem) => {
    if (!item.id) return
    await silangSyncEngine.discardQueueItem(item.id)
    await refreshQueue()
    toast.success("Queued item discarded")
  }

  const clearFailedItems = async () => {
    await silangSyncEngine.clearFailedQueueItems()
    await refreshQueue()
    toast.success("Failed queue items cleared")
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" showCloseButton={false} overlayClassName="bg-transparent backdrop-blur-none supports-backdrop-filter:backdrop-blur-none" className="w-3/4 gap-0 border-sidebar-border bg-background p-0 text-foreground sm:max-w-sm">
          <DrawerHeading
            icon={Cloud}
            title="Offline Memory & Sync"
            description="Check connection status and resolve record updates."
            trailing={<TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Close sync drawer" onClick={() => onOpenChange(false)} className="size-8 shrink-0"><X className="size-4" /></Button></TooltipTrigger><TooltipContent>Close sync drawer</TooltipContent></Tooltip></TooltipProvider>}
          />

          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <section className="shrink-0 border-b border-sidebar-border px-4 py-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Network &amp; Sync Status</h3>
              <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">{online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}Connection</span>
                <span className={`font-medium ${online ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>{online ? "Online" : "Offline"}</span>
                <span className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-3.5" />Last Synced</span><span>{formatTimestamp(lastSynced)}</span>
              </div>
              <Button disabled={syncing || !online || pendingCount === 0} onClick={() => void syncNow()} className="mt-4 h-8 w-full gap-1.5 text-xs">
                <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Syncing…" : `Sync Now (${pendingCount} Pending)`}
              </Button>
            </section>

            <div className="shrink-0 px-3 py-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="queue" className="gap-1.5 px-2">Outbox Queue <span className="rounded-full bg-muted px-1.5 text-xs">{pendingCount}</span></TabsTrigger>
                <TabsTrigger value="conflicts" className="gap-1.5 px-2">Conflicts <span className="rounded-full bg-amber-600 px-1.5 text-xs text-white">{conflicts.length}</span></TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabsContent value="queue" className="m-0 px-4 pb-4">
                {queueLoading ? (
                  <div className="flex flex-col gap-2" aria-label="Loading offline changes" aria-busy="true">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="space-y-2 rounded-md border border-sidebar-border p-3">
                        <div className="flex justify-between gap-3">
                          <Skeleton className="h-3.5 w-40" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : (items.filter((item) => item.state === "pending").length > 0 || generalQueue.length > 0) ? (
                  <div className="flex flex-col gap-2">
                    {generalQueue.some((item) => Boolean(item.last_error || item.status === "error")) && (
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs text-muted-foreground">{generalQueue.length} operations in queue</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void clearFailedItems()}
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="mr-1 size-3" />
                          Clear Failed Items
                        </Button>
                      </div>
                    )}
                    {generalQueue.map((item) => (
                      <article key={item.id} className="rounded-md border border-sidebar-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs font-semibold capitalize">
                            {item.action === "CREATE" ? "New" : item.action} {item.entity_type.replace(/_/g, " ")}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-muted-foreground">{formatTimestamp(String(item.created_at))}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void discardItem(item)}
                              aria-label="Discard this queued item"
                              className="size-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          {item.temp_id ? `Local ID: ${item.temp_id}` : item.endpoint}
                        </p>
                        {item.last_error && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{item.last_error}</p>}
                        {!item.last_error && silangSyncEngine.isItemBlocked(item, generalQueue) && (
                          <p className="mt-1 text-xs text-muted-foreground italic">Waiting for parent entity to sync</p>
                        )}
                      </article>
                    ))}
                    {items.filter((item) => item.state === "pending").map((item) => (
                      <article key={item.id} className="rounded-md border border-sidebar-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs font-semibold">Mother: {item.motherName}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatTimestamp(item.queuedAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Profile changes saved on this device</p>
                        {item.lastError && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Waiting for a stable connection to sync.</p>}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle2 className="size-6 text-emerald-600" />
                    <p className="text-xs font-medium">No changes waiting to sync</p>
                    <p className="text-xs text-muted-foreground">Offline records and profile edits will appear here until synced.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="conflicts" className="m-0 px-4 pb-4">
                <div className="mb-3 flex justify-end"><Button type="button" variant="outline" disabled={Boolean(demoConflict)} onClick={simulateConflict} className="h-8 gap-1.5 border-sidebar-border px-2.5 text-xs"><GitMerge className="size-3.5" />{demoConflict ? "Demo Conflict Added" : "Simulate Demo Conflict"}</Button></div>
                {queueLoading ? <div className="flex flex-col gap-2" aria-label="Loading conflicts" aria-busy="true">{Array.from({ length: 2 }, (_, index) => <div key={index} className="space-y-2 rounded-md border border-sidebar-border p-3"><div className="flex justify-between gap-3"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-16" /></div><Skeleton className="h-3 w-full" /><Skeleton className="h-8 w-full" /></div>)}</div> : conflicts.length ? <div className="flex flex-col gap-2">
                  {conflicts.map((conflict) => (
                    <article key={conflict.id} className="rounded-md border border-sidebar-border p-3">
                      <div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-semibold">Mother: {conflict.motherName}</p><span className="shrink-0 text-xs text-muted-foreground">{formatTimestamp(conflict.queuedAt)}</span></div>
                      <p className="mt-1 text-xs text-muted-foreground">{conflict.conflictingFields?.length ?? 0} fields changed: {conflict.conflictingFields?.map((field) => field.label).join(", ")}</p>
                      <div className="mt-3 flex justify-end"><Button variant="outline" onClick={() => setActiveConflict(conflict)} className="h-8 gap-1.5 border-sidebar-border bg-muted/30 px-3 text-xs text-foreground hover:bg-muted"><span>Resolve Conflict</span><ArrowRight className="size-3.5" /></Button></div>
                    </article>
                  ))}
                </div> : <div className="flex flex-col items-center gap-2 py-10 text-center"><CheckCircle2 className="size-6 text-emerald-600" /><p className="text-xs font-medium">No conflicts to review</p><p className="text-xs text-muted-foreground">Conflicts will appear here if the same profile field changes online and offline.</p></div>}
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      <ResolveConflictDialog key={activeConflict ? `${activeConflict.id}-${JSON.stringify(activeConflict.conflictingFields)}` : "closed"} conflict={activeConflict} onClose={() => setActiveConflict(null)} onResolved={resolveConflict} />
    </>
  )
}
