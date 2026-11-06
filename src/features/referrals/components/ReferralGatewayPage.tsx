import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react"
import { useParams } from "react-router-dom"
import { Activity, AlertTriangle, Baby, Building2, CalendarDays, Clock3, Download, Droplets, FileText, HeartPulse, Hospital, MapPin, MessageSquare, Phone, Printer, RefreshCw, Ruler, ShieldCheck, Thermometer, UserRound, UsersRound, Weight, ZoomIn, ZoomOut, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/ui/status-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { z } from "zod"
import { useAuthSession } from "@/features/auth/auth-session"
import { createReferral, getPublicReferral, respondToPublicReferral, type PublicReferralRecord } from "../api"
import silangLogo from "@/assets/silang-sidebar.svg"

const pinSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit transfer code.")
const initiateReferralSchema = z.object({
  hospital: z.string().trim().min(1, "Enter the receiving hospital."),
  reason: z.string().trim().min(1, "Enter the reason for referral."),
})

function prettyDate(value?: string | null, withTime = false) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-PH", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date)
}

function valueOr(value: unknown, fallback = "Not recorded") {
  return value === null || value === undefined || value === "" ? fallback : String(value)
}

function DrawerDetail({ icon: Icon, label, children }: { icon: typeof UserRound; label: string; children: ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-3 py-2 text-xs">
    <div className="flex min-w-0 items-center gap-2 text-muted-foreground"><Icon className="size-3.5 shrink-0" /><span>{label}</span></div>
    <div className="min-w-0 break-words text-right font-medium text-sidebar-foreground">{children}</div>
  </div>
}

function ClinicalField({ label, value }: { label: string; value: string }) {
  const iconByLabel: Record<string, typeof FileText> = {
    "Chief complaint": MessageSquare,
    "Complete Name": UserRound,
    Age: CalendarDays,
    Address: MapPin,
    "CP Number": Phone,
    "Civil Status": UsersRound,
    Birthday: CalendarDays,
    "Blood Type": HeartPulse,
    "Family Serial No.": FileText,
    Temperature: Thermometer,
    "Pulse Rate": Activity,
    "Blood Pressure": HeartPulse,
    Weight,
    Height: Ruler,
    LMP: CalendarDays,
    "EDC / EDD": CalendarDays,
    AOG: Clock3,
    "Gravida / Para": Baby,
    "Previous Delivery": Baby,
    "Co-morbidities": HeartPulse,
    "Primary Danger Signs": AlertTriangle,
    "Blood Sugar": Droplets,
    "Body Temp": Thermometer,
    "Heart Rate": Activity,
    "Respiratory Rate": Activity,
    "O2 Saturation": Droplets,
  }
  const Icon = iconByLabel[label] ?? FileText

  return <div className="grid grid-cols-2 items-start gap-3 py-2.5">
    <dt className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5 shrink-0" /><span>{label}</span></dt>
    <dd className="min-w-0 break-words text-xs font-medium leading-relaxed">{value}</dd>
  </div>
}

type HandoverEhrRecord = NonNullable<PublicReferralRecord["lab_screenings"]>[number]
type HandoverTableRow = { id: string; cells: ReactNode[]; onClick?: () => void }

function HandoverTable({ headers, rows, emptyTitle, emptyDescription }: { headers: string[]; rows: HandoverTableRow[]; emptyTitle: string; emptyDescription: string }) {
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selected.includes(row.id))

  return <>
    <div className="overflow-x-auto rounded-md border border-sidebar-border bg-background dark:bg-black">
      <div className="min-w-[720px]">
        <Table>
          <TableHeader className="bg-card dark:bg-[#111]">
            <TableRow className="border-sidebar-border hover:bg-transparent">
              <TableHead className="w-12 pl-4 text-center"><Checkbox aria-label="Select all visible records" checked={allVisibleSelected} onCheckedChange={(checked) => setSelected((current) => checked ? [...new Set([...current, ...visibleRows.map((row) => row.id)])] : current.filter((id) => !visibleRows.some((row) => row.id === id)))} className="border-sidebar-border" /></TableHead>
              {headers.map((header) => <TableHead key={header} className="whitespace-nowrap text-xs font-medium text-foreground">{header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => <TableRow key={row.id} className={`border-sidebar-border hover:bg-muted/50 ${row.onClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`} onClick={row.onClick} onKeyDown={row.onClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); row.onClick?.() } } : undefined} tabIndex={row.onClick ? 0 : undefined}>
              <TableCell className="w-12 pl-4 text-center" onClick={(event) => event.stopPropagation()}><Checkbox aria-label={`Select record ${row.id}`} checked={selected.includes(row.id)} onCheckedChange={(checked) => setSelected((current) => checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id))} className="border-sidebar-border" /></TableCell>
              {row.cells.map((cell, index) => <TableCell key={`${row.id}-${index}`} className="max-w-64 whitespace-normal text-xs align-top">{cell}</TableCell>)}
            </TableRow>)}
            {rows.length === 0 && <TableEmptyState colSpan={headers.length + 1} icon={FileText} title={emptyTitle} description={emptyDescription} />}
          </TableBody>
        </Table>
      </div>
    </div>
    <TablePaginationFooter rowCount={rows.length} selectedCount={selected.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
  </>
}

function attachmentName(fileUrl?: string | null, fallback = "EHR record") {
  if (!fileUrl) return fallback
  try {
    const pathname = new URL(fileUrl, window.location.origin).pathname
    return decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "") || fallback
  } catch {
    return fallback
  }
}

function attachmentUrl(fileUrl?: string | null) {
  if (!fileUrl) return ""
  try { return new URL(fileUrl, window.location.origin).href } catch { return fileUrl }
}

function HandoverEhrPreview({ record, onClose }: { record: HandoverEhrRecord | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(100)
  const fileUrl = record?.file_url
  const fileName = attachmentName(fileUrl, record?.screening_type || "EHR record")
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""
  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(extension)
  const isPdf = extension === "pdf"
  const previewUrl = attachmentUrl(fileUrl)

  useEffect(() => {
    if (!record) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [record, onClose])

  if (!record || !fileUrl) return null

  return <div className="fixed inset-0 z-[100] bg-background/95 text-foreground" role="presentation" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`Preview ${fileName}`} className="fixed inset-0" onClick={(event) => event.stopPropagation()}>
      <header className="fixed inset-x-0 top-0 z-[101] flex h-14 items-center justify-between gap-3 border-b border-sidebar-border bg-background px-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{fileName}</div>
          <div className="truncate text-xs text-muted-foreground">{record.screening_type || "EHR Record"}{record.date_of_screening ? ` · ${prettyDate(record.date_of_screening)}` : ""}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-sidebar-border p-0.5">
            <Button variant="ghost" size="icon" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 50} onClick={() => setZoom((value) => Math.max(50, value - 25))} className="size-7"><ZoomOut className="size-4" /></Button>
            <button type="button" onClick={() => setZoom(100)} className="min-w-12 px-1 text-center text-xs tabular-nums text-muted-foreground" aria-label="Reset zoom">{zoom}%</button>
            <Button variant="ghost" size="icon" aria-label="Zoom in" title="Zoom in" disabled={zoom >= 200} onClick={() => setZoom((value) => Math.min(200, value + 25))} className="size-7"><ZoomIn className="size-4" /></Button>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs"><a href={previewUrl} download={fileName}><Download className="size-3.5" /><span className="hidden sm:inline">Download</span></a></Button>
          <Button variant="ghost" size="icon" aria-label="Close preview" title="Close" onClick={onClose} className="size-8 text-muted-foreground"><X className="size-4" /></Button>
        </div>
      </header>
      <main className="fixed inset-x-0 bottom-0 top-14 flex items-center justify-center overflow-auto bg-muted/35 p-3 sm:p-6">
        {isImage && previewUrl ? <img src={previewUrl} alt={fileName} className="max-h-full max-w-full object-contain transition-transform duration-150" style={{ transform: `scale(${zoom / 100})` }} />
          : isPdf && previewUrl ? <iframe src={previewUrl} title={fileName} className="h-full min-h-0 w-full border-0 bg-background transition-transform duration-150" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }} />
            : <div className="flex flex-col items-center gap-3 text-center"><FileText className="size-10 text-muted-foreground" /><p className="text-sm font-medium">Preview isn’t available for this file</p>{previewUrl && <Button asChild className="h-8 gap-1.5 px-3 text-xs"><a href={previewUrl} download={fileName}><Download className="size-3.5" />Download file</a></Button>}</div>}
      </main>
    </div>
  </div>
}

export function ReferralGatewayPage() {
  const { identifier = "" } = useParams()
  const { session } = useAuthSession()
  const [record, setRecord] = useState<PublicReferralRecord | null>(null)
  const [pin, setPin] = useState(() => new URLSearchParams(window.location.search).get("pin") ?? "")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingPin, setIsSubmittingPin] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pinError, setPinError] = useState("")
  const [previewEhrRecord, setPreviewEhrRecord] = useState<HandoverEhrRecord | null>(null)
  const closeEhrPreview = useCallback(() => setPreviewEhrRecord(null), [])
  const [isInitiateReferralOpen, setIsInitiateReferralOpen] = useState(false)
  const [referralHospital, setReferralHospital] = useState("")
  const [referralReason, setReferralReason] = useState("")
  const [referralFormErrors, setReferralFormErrors] = useState<{ hospital?: string; reason?: string }>({})
  const [isCreatingReferral, setIsCreatingReferral] = useState(false)

  const load = useCallback(async (currentPin?: string, quiet = false) => {
    if (!identifier) return
    if (!quiet) setIsLoading(true)
    try {
      const response = await getPublicReferral(identifier, currentPin)
      const referral = response.data ?? null
      setRecord(referral)
      if (referral?.isPinVerified) {
        setPinError("")
        // The code is kept only in memory after the link opens, not in browser history.
      } else if (currentPin) {
        setPinError("That transfer code does not match. Check the code and try again.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open this referral")
      setRecord(null)
    } finally {
      if (!quiet) setIsLoading(false)
    }
  }, [identifier])

  useEffect(() => {
    const linkPin = new URLSearchParams(window.location.search).get("pin") ?? ""
    if (linkPin) window.history.replaceState({}, "", window.location.pathname)
    void Promise.resolve().then(() => load(linkPin || undefined))
  }, [load])

  const hasAccess = Boolean(record && (!record.isPinRequired || record.isPinVerified))
  const latestVitals = record?.obstetric_info?.latest_vitals
  const fullClinicalSummary = record?.reason?.trim() || "No clinical handover summary was provided."
  const status = (record?.status || "pending").replaceAll("_", " ")
  const patientName = record?.patient?.name || "Maternal referral"

  useEffect(() => {
    document.title = `${hasAccess ? patientName : "Secure Referral"} - Silang`
  }, [hasAccess, patientName])

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = pinSchema.safeParse(pin)
    if (!parsed.success) {
      setPinError(parsed.error.issues[0]?.message ?? "Enter the 6-digit transfer code.")
      return
    }
    setIsSubmittingPin(true)
    try {
      await load(pin)
    } finally {
      setIsSubmittingPin(false)
    }
  }

  const updateStatus = async (nextStatus: string) => {
    if (!record || !pin) return
    setIsResponding(true)
    try {
      const response = await respondToPublicReferral(identifier, { pin, status: nextStatus })
      if (response.data) setRecord((current) => current ? { ...current, ...response.data } : response.data ?? null)
      toast.success(nextStatus === "admitted" ? "Transfer accepted and marked admitted" : nextStatus === "accepted" ? "Transfer accepted" : nextStatus === "acknowledged" ? "Referral acknowledged" : nextStatus === "cancelled" ? "Transfer cancelled" : "Referral declined")
      await load(pin)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update this referral")
    } finally {
      setIsResponding(false)
    }
  }

  const refreshReferral = async () => {
    setIsRefreshing(true)
    try {
      await load(pin, true)
    } finally {
      setIsRefreshing(false)
    }
  }

  const submitInitiatedReferral = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = initiateReferralSchema.safeParse({ hospital: referralHospital, reason: referralReason })
    if (!parsed.success) {
      setReferralFormErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return
    }
    const pregnancyId = record?.obstetric_info?.pregnancy_id
    const motherId = record?.patient?.mother_id
    const facilityId = session?.user.facility_id
    if (!session?.token || !facilityId || !pregnancyId || !motherId) {
      toast.error("Unable to initiate referral", { description: "A signed-in staff account and linked pregnancy record are required." })
      return
    }

    setIsCreatingReferral(true)
    try {
      await createReferral(session.token, {
        pregnancy_id: pregnancyId,
        mother_id: motherId,
        from_facility_id: facilityId,
        external_facility_name: parsed.data.hospital,
        reason: parsed.data.reason,
      })
      toast.success("Referral initiated", { description: `Referral to ${parsed.data.hospital} has been created.` })
      setIsInitiateReferralOpen(false)
      setReferralHospital("")
      setReferralReason("")
      setReferralFormErrors({})
    } catch (error) {
      toast.error("Unable to initiate referral", { description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setIsCreatingReferral(false)
    }
  }

  const exportReferral = () => {
    if (!record) return
    const rows = [
      ["Field", "Value"],
      ["Patient", patientName],
      ["Family serial no.", record.patient?.family_serial_no || ""],
      ["Status", status],
      ["Risk level", latestVitals?.risk_level || "Not assessed"],
      ["Origin facility", record.referring_facility?.name || ""],
      ["Destination facility", record.destination_facility?.name || ""],
      ["Date referred", record.date_referred || ""],
      ["Clinical summary", fullClinicalSummary],
    ]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${patientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-referral.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("Referral exported")
  }

  const currentStatus = (record?.status ?? "pending").toLowerCase().replaceAll("_", " ")
  const isAdmitted = ["accepted", "in transit", "admitted", "completed", "transferred"].includes(currentStatus)
  const isReferred = ["rejected", "declined", "cancelled"].includes(currentStatus)
  const lifecycleTitle = isAdmitted ? "Admitted" : isReferred ? "Referred" : currentStatus.replace(/\b\w/g, (letter) => letter.toUpperCase())
  const canAccept = !isAdmitted && !isReferred
  const ehrRows: HandoverTableRow[] = (record?.lab_screenings ?? []).map((screening, index) => ({
    id: screening.screening_id || `ehr-${index}`,
    onClick: screening.file_url ? () => setPreviewEhrRecord(screening) : undefined,
    cells: [valueOr(screening.screening_type), prettyDate(screening.date_of_screening), valueOr(screening.result), screening.file_url ? <span className="max-w-48 truncate underline decoration-muted-foreground/50 underline-offset-2">{attachmentName(screening.file_url, "Open attachment")}</span> : valueOr(screening.remarks)],
  }))
  const prescriptionRows: HandoverTableRow[] = (record?.supplements ?? []).map((supplement, index) => ({
    id: supplement.supplement_id || `prescription-${index}`,
    cells: [valueOr(supplement.supplement_type), prettyDate(supplement.date_given), valueOr(supplement.tablets_given_count, "Not recorded"), <StatusBadge status={supplement.is_completed ? "Completed" : "Active"} />],
  }))

  if (isLoading) return <main className="min-h-screen bg-background p-6 text-foreground"><div className="mx-auto max-w-5xl space-y-5"><Skeleton className="h-14 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-72 w-full" /></div></main>

  if (!record) return <main className="flex min-h-screen items-center justify-center bg-background p-5 text-foreground"><Card className="w-full max-w-md"><CardHeader><CardTitle className="text-base">Referral link unavailable</CardTitle><p className="text-sm text-muted-foreground">This link may be invalid or no longer available.</p></CardHeader></Card></main>

  if (!hasAccess) return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8 text-foreground">
    <Card className="w-full max-w-sm shadow-none">
      <CardHeader className="flex flex-col items-center gap-1.5 text-center">
        <span className="mb-1 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-4" />
        </span>
        <CardTitle className="text-base">Secure referral</CardTitle>
        <p className="max-w-[280px] text-xs text-muted-foreground">Enter the 6-digit transfer code to view this clinical handover.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-1 py-1">
            <div className="flex min-w-0 flex-col items-center text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Building2 className="size-3.5 shrink-0" />From</p>
              <p className="mt-1 text-xs font-medium leading-4">{valueOr(record.referring_facility?.name)}</p>
            </div>
            <span className="referral-route-arrow" aria-hidden="true" />
            <div className="flex min-w-0 flex-col items-center text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Hospital className="size-3.5 shrink-0" />To</p>
              <p className="mt-1 text-xs font-medium leading-4">{valueOr(record.destination_facility?.name)}</p>
            </div>
          </div>
        </div>
        <form onSubmit={submitPin} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="referral-pin">Transfer code <span className="text-destructive">*</span></Label>
            <Input
              id="referral-pin"
              autoFocus
              aria-label="Six-digit transfer code"
              aria-invalid={Boolean(pinError)}
              value={pin}
              onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 6)); setPinError("") }}
              placeholder="Enter 6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="h-8 text-center font-mono text-xs"
            />
            {pinError && <p role="alert" className="text-xs text-destructive">{pinError}</p>}
          </div>
          <Button type="submit" disabled={isSubmittingPin} className="h-9 w-full">{isSubmittingPin ? "Verifying…" : "View referral"}</Button>
        </form>
      </CardContent>
    </Card>
  </main>

  return <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-stretch justify-between border-b bg-white dark:bg-black print:hidden">
      <div className="flex min-w-0 flex-1 items-center px-4">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent">
            <img src={silangLogo} alt="Silang Logo" className="size-full object-contain" />
          </div>
          <div className="flex h-8 items-center overflow-hidden">
            <span className="translate-y-0.5 whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-[#003f2c] dark:text-[#fffe8c]" style={{ fontFamily: "'Etna', sans-serif" }}>Silang</span>
          </div>
        </div>
        <span className="mx-3 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap text-xs">
            <BreadcrumbItem><span className="whitespace-nowrap text-muted-foreground">Inter-Clinic Referrals</span></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage className="whitespace-nowrap text-xs">Referral Handover</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex shrink-0 items-center gap-2 pl-3">
          <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Export referral" title="Export referral" onClick={exportReferral}><Download className="size-3.5" /></Button>
          <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Refresh referral" title="Refresh referral" disabled={isRefreshing} onClick={() => void refreshReferral()}><RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} /></Button>
          <Button type="button" className="h-8 gap-1.5 px-3 text-xs" onClick={() => window.print()}><Printer className="size-3.5" />Print Transfer Form</Button>
        </div>
      </div>
      <div className="flex h-full w-[min(75vw,24rem)] shrink-0 items-center justify-start gap-2 bg-sidebar px-4 text-sidebar-foreground lg:border-l lg:border-sidebar-border">
        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent ring-1 ring-sidebar-border">
          <Hospital className="size-4 text-sidebar-foreground/70" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col text-left">
          <span className="truncate text-xs font-medium">{valueOr(record.destination_facility?.name, "Bicol Medical Center")}</span>
          <span className="truncate text-xs text-sidebar-foreground/70">Recipient</span>
        </div>
      </div>
    </header>

    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-label="Referral handover content" className="min-h-0 min-w-0 overflow-y-auto bg-white px-4 py-4 text-foreground dark:bg-black sm:px-5">
        <div className="flex min-w-0 flex-col gap-4">
          <Tabs defaultValue="ehr" className="w-full min-w-0">
            <TabsList className="h-9 w-fit justify-start gap-1">
              <TabsTrigger value="ehr" className="h-full flex-none px-3 text-xs">EHR Records</TabsTrigger>
              <TabsTrigger value="prescriptions" className="h-full flex-none px-3 text-xs">Prescriptions</TabsTrigger>
            </TabsList>
            <TabsContent value="ehr" className="mt-3">
              <HandoverTable headers={["Test", "Date", "Result", "File / Notes"]} rows={ehrRows} emptyTitle="No EHR records shared" emptyDescription="Laboratory results and attached records included with this referral will appear here." />
            </TabsContent>
            <TabsContent value="prescriptions" className="mt-3">
              <HandoverTable headers={["Medication / Supplement", "Date", "Quantity", "Status"]} rows={prescriptionRows} emptyTitle="No prescriptions shared" emptyDescription="Prescriptions and supplements included with this referral will appear here." />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <aside className="flex min-h-[420px] flex-col border-sidebar-border bg-sidebar text-sidebar-foreground lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:border-l print:hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <section aria-label="Transfer lifecycle handshake" className="-mx-5 border-b border-sidebar-border/70 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{lifecycleTitle}</h2>
              <StatusBadge status={status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Processed at {prettyDate(record.date_referred, true)}</p>
            <div className="my-3 grid grid-cols-2 gap-1.5" aria-label={`Transfer progress: ${lifecycleTitle}`}>
              {[0, 1].map((step) => <span key={step} className={`h-1 rounded-full ${isAdmitted ? "bg-emerald-500" : isReferred ? "bg-orange-500" : step === 0 ? "bg-orange-500" : "bg-border"}`} />)}
            </div>
            <div className="grid grid-cols-2 text-xs text-muted-foreground"><span>Sent</span><span className="text-right">{isAdmitted ? "Admitted" : isReferred ? "Referred" : "Awaiting"}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">Last updated: {prettyDate(record.date_responded || record.date_referred, true)}</p>
          </section>

          <Tabs defaultValue="clinical" className="w-full">
            <TabsList className="my-3 grid h-8 w-full grid-cols-2">
              <TabsTrigger value="clinical" className="text-xs">Clinical</TabsTrigger>
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-0">
              <section className="py-2">
                <h2 className="text-sm font-semibold">Referral information</h2>
                <p className="mt-1 text-xs text-muted-foreground">Routing and current handover status.</p>
                <div className="mt-2">
                  <DrawerDetail icon={Clock3} label="Created time">{prettyDate(record.date_referred, true)}</DrawerDetail>
                  <DrawerDetail icon={Activity} label="Status"><StatusBadge status={status} /></DrawerDetail>
                  <DrawerDetail icon={HeartPulse} label="Assessed risk"><StatusBadge status={valueOr(latestVitals?.risk_level, "Not assessed")} /></DrawerDetail>
                  <DrawerDetail icon={MapPin} label="Destination">{valueOr(record.destination_facility?.name, "Bicol Medical Center")}</DrawerDetail>
                  <DrawerDetail icon={Building2} label="Origin facility">{valueOr(record.referring_facility?.name)}</DrawerDetail>
                  <DrawerDetail icon={CalendarDays} label="Pregnancy">G{valueOr(record.obstetric_info?.gravida, "—")} P{valueOr(record.obstetric_info?.parity, "—")}</DrawerDetail>
                  <DrawerDetail icon={Activity} label="Age of gestation">{latestVitals?.gestational_age_weeks != null ? `${latestVitals.gestational_age_weeks} weeks` : "Not recorded"}</DrawerDetail>
                </div>
              </section>
            </TabsContent>
            <TabsContent value="clinical" className="mt-0">
              <div className="space-y-5 py-4">
              <section>
                <h2 className="text-sm font-semibold">Clinical summary</h2>
                <p className="mt-1 text-xs text-muted-foreground">Patient context and findings shared with the receiving facility.</p>
                <dl className="mt-2">
                  <ClinicalField label="Chief complaint" value={valueOr(latestVitals?.chief_complaint, reasonField(fullClinicalSummary, "CC") || "Not recorded")} />
                  <ClinicalField label="Reason for referral" value={fullClinicalSummary} />
                  <ClinicalField label="Requested clinical action" value={reasonField(fullClinicalSummary, "Requested clinical action") || "Not recorded"} />
                  <ClinicalField label="Complete Name" value={patientName} />
                  <ClinicalField label="Age" value={record.patient?.age != null ? `${record.patient.age} years` : "Not recorded"} />
                  <ClinicalField label="Address" value={valueOr(record.patient?.address)} />
                  <ClinicalField label="CP Number" value={valueOr(record.patient?.phone)} />
                  <ClinicalField label="Civil Status" value={valueOr(record.patient?.civil_status)} />
                  <ClinicalField label="Blood Type" value={valueOr(record.patient?.blood_type)} />
                  <ClinicalField label="Family Serial No." value={valueOr(record.patient?.family_serial_no)} />
                  <ClinicalField label="Birthday" value={prettyDate(record.patient?.birth_date)} />
                </dl>
              </section>
              <section>
                <h3 className="text-sm font-semibold text-foreground">Referral vitals</h3>
                <p className="mt-1 text-xs text-muted-foreground">Measurements included with this transfer.</p>
                <dl className="mt-1">
                  <ClinicalField label="Temperature" value={valueOr(latestVitals?.temp, reasonField(fullClinicalSummary, "T") || "Not recorded")} />
                  <ClinicalField label="Pulse Rate" value={valueOr(latestVitals?.pulse_rate, reasonField(fullClinicalSummary, "PR") || "Not recorded")} />
                  <ClinicalField label="Blood Pressure" value={valueOr(latestVitals?.bp, reasonField(fullClinicalSummary, "BP") || "Not recorded")} />
                  <ClinicalField label="Weight" value={reasonField(fullClinicalSummary, "wt") || "Not recorded"} />
                  <ClinicalField label="Height" value={reasonField(fullClinicalSummary, "ht") || "Not recorded"} />
                  <ClinicalField label="Fundal height" value={valueOr(latestVitals?.fundic_height)} />
                  <ClinicalField label="Fetal heart tone" value={valueOr(latestVitals?.fetal_heart_tone)} />
                </dl>
              </section>
              <section>
                <h3 className="text-sm font-semibold">Pregnancy history</h3>
                <p className="mt-1 text-xs text-muted-foreground">Obstetric dates and previous delivery details.</p>
                <dl className="mt-1">
                  <ClinicalField label="LMP" value={prettyDate(record.obstetric_info?.lmp_date)} />
                  <ClinicalField label="EDC / EDD" value={prettyDate(record.obstetric_info?.edd_date || reasonField(fullClinicalSummary, "EDC"))} />
                  <ClinicalField label="AOG" value={latestVitals?.gestational_age_weeks != null ? `${latestVitals.gestational_age_weeks} weeks` : "Not recorded"} />
                  <ClinicalField label="Gravida / Para" value={`G${valueOr(record.obstetric_info?.gravida, "—")} P${valueOr(record.obstetric_info?.parity, "—")}`} />
                  <ClinicalField label="Previous Delivery" value={valueOr(record.obstetric_info?.previous_delivery_history, reasonLine(fullClinicalSummary, "Previous delivery") || "None reported")} />
                  <ClinicalField label="Co-morbidities" value={valueOr(record.obstetric_info?.co_morbidities, reasonLine(fullClinicalSummary, "Co-morbidities") || "None reported")} />
                  <ClinicalField label="Handover notes" value={fullClinicalSummary} />
                </dl>
              </section>
              <section>
                <h3 className="text-sm font-semibold">Clinical indicators</h3>
                <p className="mt-1 text-xs text-muted-foreground">Reported warning signs for triage.</p>
                <dl className="mt-1">
                  <ClinicalField label="Primary Danger Signs" value={valueOr(latestVitals?.danger_signs, record.cdss_alerts?.map((alert) => alert.alert_type || alert.alert_message).filter(Boolean).join(", ") || "None reported")} />
                </dl>
              </section>
              <section className="pb-2">
                <h3 className="text-sm font-semibold text-foreground">Latest maternal vitals</h3>
                <p className="mt-1 text-xs text-muted-foreground">Most recent observations on record.</p>
                <dl className="mt-1">
                  <ClinicalField label="Blood Pressure" value={valueOr(latestVitals?.bp, "Not recorded")} />
                  <ClinicalField label="Heart Rate" value={valueOr(latestVitals?.pulse_rate, "Not recorded")} />
                  <ClinicalField label="Blood Sugar" value={reasonField(fullClinicalSummary, "Blood Sugar") || "Not recorded"} />
                  <ClinicalField label="Body Temp" value={valueOr(latestVitals?.temp, "Not recorded")} />
                  <ClinicalField label="Weight" value={reasonField(fullClinicalSummary, "wt") || "Not recorded"} />
                  <ClinicalField label="Respiratory Rate" value={reasonField(fullClinicalSummary, "Respiratory Rate") || "Not recorded"} />
                  <ClinicalField label="O2 Saturation" value={reasonField(fullClinicalSummary, "O2 Saturation") || "Not recorded"} />
                </dl>
              </section>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-auto shrink-0 border-t border-sidebar-border bg-sidebar px-5 py-3">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setIsInitiateReferralOpen(true)}>Initiate Referral</Button>
            <Button type="button" disabled={isResponding || !canAccept} onClick={() => void updateStatus("admitted")} className="h-9 text-xs">{isResponding ? "Accepting…" : "Accept Transfer"}</Button>
          </div>
        </div>
      </aside>
    </div>

    <Dialog open={isInitiateReferralOpen} onOpenChange={setIsInitiateReferralOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-5">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base">Initiate referral</DialogTitle>
          <DialogDescription className="text-xs">Refer {patientName} to another hospital.</DialogDescription>
        </DialogHeader>
        <form id="initiate-referral-form" onSubmit={submitInitiatedReferral} noValidate className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="handover-referral-hospital">Hospital <span className="text-destructive">*</span></Label>
            <Input id="handover-referral-hospital" value={referralHospital} onChange={(event) => { setReferralHospital(event.target.value); setReferralFormErrors((current) => ({ ...current, hospital: undefined })) }} placeholder="Enter hospital name" aria-invalid={Boolean(referralFormErrors.hospital)} />
            {referralFormErrors.hospital && <p role="alert" className="text-xs text-destructive">{referralFormErrors.hospital}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="handover-referral-reason">Reason <span className="text-destructive">*</span></Label>
            <Textarea id="handover-referral-reason" value={referralReason} onChange={(event) => { setReferralReason(event.target.value); setReferralFormErrors((current) => ({ ...current, reason: undefined })) }} placeholder="Describe why the patient is being referred..." className="min-h-24" aria-invalid={Boolean(referralFormErrors.reason)} />
            {referralFormErrors.reason && <p role="alert" className="text-xs text-destructive">{referralFormErrors.reason}</p>}
          </div>
        </form>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setIsInitiateReferralOpen(false)} disabled={isCreatingReferral}>Cancel</Button>
          <Button type="submit" form="initiate-referral-form" disabled={isCreatingReferral}>{isCreatingReferral ? "Initiating…" : "Initiate Referral"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <HandoverEhrPreview key={previewEhrRecord?.screening_id ?? "closed"} record={previewEhrRecord} onClose={closeEhrPreview} />
  </main>
}

function reasonLine(summary: string, label: string) {
  return summary.split(/\r?\n/).find((line) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`))?.split(":").slice(1).join(":").trim() || ""
}

function reasonField(summary: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return summary.match(new RegExp(`(?:^|[·\\n])\\s*${escaped}\\s*:\\s*([^·\\n]+)`, "i"))?.[1]?.trim() || ""
}

