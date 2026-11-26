import { useCallback, useEffect, useLayoutEffect, useState, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { Activity, Building2, CalendarDays, Clock3, Download, HeartPulse, Hospital, MapPin, Printer, RefreshCw, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/ui/status-badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { z } from "zod"
import { useAuthSession } from "@/features/auth/auth-session"
import { useTheme } from "@/components/theme-provider"
import { createReferral, getPublicReferral, respondToPublicReferral, type PublicReferralRecord } from "../api"
import { createZipBlob, safeArchiveName, saveBlob } from "@/lib/zip-download"
import silangLogo from "@/assets/silang-sidebar.svg"
import { PageGuide } from "@/components/ui/contextual-tour"
import {
  attachmentName,
  attachmentUrl,
  ClinicalField,
  DrawerDetail,
  HandoverEhrPreview,
  HandoverTable,
  prettyDate,
  ThemeToggleButton,
  valueOr,
  type HandoverEhrRecord,
  type HandoverTableRow,
} from "./HandoverPrimitives"

const pinSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit transfer code.")
const initiateReferralSchema = z.object({
  hospital: z.string().trim().min(1, "Enter the receiving hospital."),
  reason: z.string().trim().min(1, "Enter the reason for referral."),
})

export function ReferralGatewayPage() {
  const { identifier = "" } = useParams()
  const { session } = useAuthSession()
  const { theme, setTheme } = useTheme()
  const [record, setRecord] = useState<PublicReferralRecord | null>(null)
  const [pin, setPin] = useState(() => new URLSearchParams(window.location.search).get("pin") ?? "")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingPin, setIsSubmittingPin] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDownloadingHealthRecords, setIsDownloadingHealthRecords] = useState(false)
  const [downloadingRecordIds, setDownloadingRecordIds] = useState<string[]>([])
  const [pinError, setPinError] = useState("")
  const [previewEhrRecord, setPreviewEhrRecord] = useState<HandoverEhrRecord | null>(null)
  const closeEhrPreview = useCallback(() => setPreviewEhrRecord(null), [])
  const [isInitiateReferralOpen, setIsInitiateReferralOpen] = useState(false)
  const [isMobileTransferOpen, setIsMobileTransferOpen] = useState(false)
  const [referralHospital, setReferralHospital] = useState("")
  const [referralReason, setReferralReason] = useState("")
  const [referralFormErrors, setReferralFormErrors] = useState<{ hospital?: string; reason?: string }>({})
  const [isCreatingReferral, setIsCreatingReferral] = useState(false)

  useLayoutEffect(() => {
    const previousTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null
    const targetTheme = "dark"
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(targetTheme)
    setTheme(targetTheme)
    return () => {
      if (previousTheme && (previousTheme === "light" || previousTheme === "dark" || previousTheme === "system")) {
        setTheme(previousTheme)
      }
    }
  }, [setTheme])

  const isDarkMode = theme === "dark" || (theme !== "light" && typeof document !== "undefined" && document.documentElement.classList.contains("dark"))

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? "light" : "dark"
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(nextTheme)
    setTheme(nextTheme)
    localStorage.setItem("referral_theme", nextTheme)
  }

  const load = useCallback(async (currentPin?: string, quiet = false) => {
    if (!identifier) return
    if (!quiet) setIsLoading(true)
    try {
      const response = await getPublicReferral(identifier, currentPin)
      const referral = response.data ?? null
      setRecord(referral)
      if (referral?.isPinVerified) {
        setPinError("")
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

  const printHandoverSection = (title: string, body: string) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Allow pop-ups to print this handover")
      return
    }
    printWindow.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font:14px Arial,sans-serif;color:#111;margin:32px}h1{font-size:20px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{text-align:left;padding:8px;border-bottom:1px solid #ddd}</style></head><body><h1>${title}</h1>${body}<script>window.onload=()=>window.print()</script></body></html>`)
    printWindow.document.close()
  }
  const printClinicalSummary = () => printHandoverSection(`${patientName} · Clinical Summary`, `<p><b>Facility:</b> ${valueOr(record?.referring_facility?.name)} → ${valueOr(record?.destination_facility?.name)}</p><p><b>Risk:</b> ${valueOr(latestVitals?.risk_level, "Not assessed")}</p><p>${fullClinicalSummary}</p>`)
  const printPrescriptions = () => {
    const rows = (record?.supplements ?? []).map((item) => `<tr><td>${item.supplement_type}</td><td>${prettyDate(item.date_given)}</td><td>${item.tablets_given_count ?? "Not recorded"}</td><td>${item.is_completed ? "Completed" : "Active"}</td></tr>`).join("")
    printHandoverSection(`${patientName} · Prescriptions`, `<table><thead><tr><th>Medication / Supplement</th><th>Date</th><th>Quantity</th><th>Status</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>No prescriptions shared.</td></tr>"}</tbody></table>`)
  }

  const currentStatus = (record?.status ?? "pending").toLowerCase().replaceAll("_", " ")
  const isAdmitted = ["accepted", "in transit", "admitted", "completed", "transferred"].includes(currentStatus)
  const isReferred = ["rejected", "declined", "cancelled"].includes(currentStatus)
  const lifecycleTitle = isAdmitted ? "Admitted" : isReferred ? "Referred" : currentStatus.replace(/\b\w/g, (letter) => letter.toUpperCase())
  const canAccept = !isAdmitted && !isReferred
  const ehrRecords = record?.lab_screenings ?? []
  const downloadableEhrRecords = ehrRecords.filter((screening) => screening.file_url)

  const downloadHealthRecord = async (screening: HandoverEhrRecord, index: number) => {
    if (!screening.file_url) return
    const recordId = screening.screening_id || `ehr-${index}`
    setDownloadingRecordIds((current) => [...new Set([...current, recordId])])
    try {
      const response = await fetch(attachmentUrl(screening.file_url))
      if (!response.ok) throw new Error(`Download failed (${response.status})`)
      const blob = await response.blob()
      saveBlob(blob, safeArchiveName(attachmentName(screening.file_url, screening.screening_type || `health-record-${index + 1}`)))
      toast.success("Health record downloaded")
    } catch {
      toast.error("Could not download this health record")
    } finally {
      setDownloadingRecordIds((current) => current.filter((id) => id !== recordId))
    }
  }

  const getHealthRecordArchiveEntries = async () => Promise.all(
    downloadableEhrRecords.map(async (screening, index) => {
      const response = await fetch(attachmentUrl(screening.file_url))
      if (!response.ok) throw new Error(`Download failed (${response.status})`)
      const name = attachmentName(screening.file_url, screening.screening_type || `health-record-${index + 1}`)
      return {
        name: `Health Records/${String(index + 1).padStart(2, "0")}-${safeArchiveName(name)}`,
        data: new Uint8Array(await response.arrayBuffer()),
      }
    }),
  )

  const downloadHealthRecordsZip = async () => {
    setIsDownloadingHealthRecords(true)
    try {
      const healthFiles = await getHealthRecordArchiveEntries()
      if (healthFiles.length === 0) {
        toast.info("No health record files to download")
        return
      }
      saveBlob(createZipBlob(healthFiles), "health-records.zip")
      toast.success("Health records ZIP downloaded")
    } catch {
      toast.error("Could not download the health records ZIP")
    } finally {
      setIsDownloadingHealthRecords(false)
    }
  }

  const downloadReferralHandoverZip = async () => {
    setIsDownloadingHealthRecords(true)
    try {
      const healthFiles = await getHealthRecordArchiveEntries()
      if (healthFiles.length === 0) {
        healthFiles.push({ name: "Health Records/README.txt", data: new TextEncoder().encode("No health record attachments are available for this referral.") })
      }
      const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
      const summaryDocument = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(patientName)} - Clinical Summary</title></head><body><h1>${escapeHtml(patientName)} · Clinical Summary</h1><p><b>Origin:</b> ${escapeHtml(valueOr(record?.referring_facility?.name))}</p><p><b>Destination:</b> ${escapeHtml(valueOr(record?.destination_facility?.name))}</p><p><b>Risk:</b> ${escapeHtml(valueOr(latestVitals?.risk_level, "Not assessed"))}</p><p><b>Referred:</b> ${escapeHtml(prettyDate(record?.date_referred, true))}</p><h2>Clinical notes</h2><p>${escapeHtml(fullClinicalSummary).replaceAll("\n", "<br>")}</p></body></html>`
      const prescriptionRows = (record?.supplements ?? []).map((item) => `<tr><td>${escapeHtml(item.supplement_type)}</td><td>${escapeHtml(prettyDate(item.date_given))}</td><td>${escapeHtml(item.tablets_given_count ?? "Not recorded")}</td><td>${item.is_completed ? "Completed" : "Active"}</td></tr>`).join("")
      const prescriptionsDocument = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(patientName)} - Prescriptions</title><style>body{font:14px Arial,sans-serif}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:8px;border-bottom:1px solid #ddd}</style></head><body><h1>${escapeHtml(patientName)} · Prescriptions</h1><table><thead><tr><th>Medication / Supplement</th><th>Date</th><th>Quantity</th><th>Status</th></tr></thead><tbody>${prescriptionRows || "<tr><td colspan='4'>No prescriptions shared.</td></tr>"}</tbody></table></body></html>`
      const files = [
        { name: "Clinical Summary.html", data: new TextEncoder().encode(summaryDocument) },
        { name: "Prescriptions.html", data: new TextEncoder().encode(prescriptionsDocument) },
        ...healthFiles,
      ]
      const motherName = record?.patient?.name?.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "maternal-records"
      saveBlob(createZipBlob(files), `${motherName}-referral-handover.zip`)
      toast.success("Referral handover ZIP downloaded")
    } catch {
      toast.error("Could not download the referral handover ZIP")
    } finally {
      setIsDownloadingHealthRecords(false)
    }
  }

  const ehrRows: HandoverTableRow[] = ehrRecords.map((screening, index) => {
    const id = screening.screening_id || `ehr-${index}`
    return {
      id,
      onClick: screening.file_url ? () => setPreviewEhrRecord(screening) : undefined,
      cells: [
        valueOr(screening.screening_type),
        prettyDate(screening.date_of_screening),
        valueOr(screening.result),
        screening.file_url ? <span className="max-w-48 truncate underline decoration-muted-foreground/50 underline-offset-2">{attachmentName(screening.file_url, "Open attachment")}</span> : valueOr(screening.remarks),
        screening.file_url ? <Button variant="ghost" size="icon" aria-label={`Download ${attachmentName(screening.file_url)}`} title="Download health record" disabled={downloadingRecordIds.includes(id)} onClick={(event) => { event.stopPropagation(); void downloadHealthRecord(screening, index) }}><Download className="size-4" /></Button> : null,
      ],
    }
  })
  const prescriptionRows: HandoverTableRow[] = (record?.supplements ?? []).map((supplement, index) => ({
    id: supplement.supplement_id || `prescription-${index}`,
    cells: [valueOr(supplement.supplement_type), prettyDate(supplement.date_given), valueOr(supplement.tablets_given_count, "Not recorded"), <StatusBadge status={supplement.is_completed ? "Completed" : "Active"} />],
  }))

  if (isLoading) return <main className="relative min-h-screen bg-background p-6 text-foreground">
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <ThemeToggleButton isDarkMode={isDarkMode} onToggle={toggleTheme} className="relative size-8 border-sidebar-border bg-background" />
    </div>
    <div className="mx-auto max-w-5xl space-y-5"><Skeleton className="h-14 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-72 w-full" /></div>
  </main>

  if (!record) return <main className="relative flex min-h-screen items-center justify-center bg-background p-5 text-foreground">
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <ThemeToggleButton isDarkMode={isDarkMode} onToggle={toggleTheme} className="relative size-8 border-sidebar-border bg-background" />
    </div>
    <Card className="w-full max-w-md"><CardHeader><CardTitle className="text-base">Referral link unavailable</CardTitle><p className="text-sm text-muted-foreground">This link may be invalid or no longer available.</p></CardHeader></Card>
  </main>

  if (!hasAccess) return <main className="relative flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground">
    <div className="absolute right-4 top-4 z-20">
      <ThemeToggleButton isDarkMode={isDarkMode} onToggle={toggleTheme} className="relative size-8 border-sidebar-border bg-background" />
    </div>
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
    <Sheet open={isMobileTransferOpen} onOpenChange={setIsMobileTransferOpen}>
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-white px-0 dark:bg-black print:hidden">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 sm:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent">
            <img src={silangLogo} alt="Silang Logo" className="size-full object-contain" />
          </div>
          <div className="flex h-8 items-center overflow-hidden">
            <span className="translate-y-0.5 whitespace-nowrap text-xl sm:text-2xl font-semibold leading-none tracking-tight text-[#003f2c] dark:text-[#fffe8c]" style={{ fontFamily: "'Etna', sans-serif" }}>Silang</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggleButton isDarkMode={isDarkMode} onToggle={toggleTheme} />
          <div aria-hidden="true" className="mx-1 h-5 border-l border-border" />
          <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Refresh referral" title="Refresh referral" disabled={isRefreshing} onClick={() => void refreshReferral()}><RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} /></Button>
          <Button type="button" variant="outline" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => window.print()}><Printer className="size-3.5" />Print Transfer Form</Button>
          <Button type="button" disabled={isDownloadingHealthRecords} className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => void downloadReferralHandoverZip()}><Download className="size-3.5" />{isDownloadingHealthRecords ? "Preparing ZIP…" : "Export Referral Handover"}</Button>
          <SheetTrigger asChild>
            <Button type="button" size="sm" className="h-8 gap-1.5 px-2.5 text-xs font-medium lg:hidden">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span>Transfer</span>
            </Button>
          </SheetTrigger>
        </div>
      </div>
      <div className="hidden h-full w-[min(75vw,24rem)] shrink-0 items-center justify-between gap-3 bg-sidebar px-5 text-sidebar-foreground lg:flex lg:border-l lg:border-sidebar-border">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent ring-1 ring-sidebar-border">
            <Hospital className="size-4 text-sidebar-foreground/70" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col text-left">
            <span className="truncate text-xs font-medium">{valueOr(record.destination_facility?.name, "Bicol Medical Center")}</span>
            <span className="truncate text-xs text-sidebar-foreground/70">Recipient</span>
          </div>
        </div>
        <PageGuide />
      </div>
    </header>

    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-label="Referral handover content" className="min-h-0 min-w-0 overflow-y-auto bg-white px-4 py-4 text-foreground dark:bg-black sm:px-5">
        <Tabs defaultValue="summary" className="w-full min-w-0 pb-6">
          <div className="sticky top-0 z-20 -mx-4 flex w-full min-w-0 items-center justify-between gap-3 bg-white px-4 py-2 dark:bg-black sm:-mx-5 sm:px-5">
            <TabsList className="h-9 w-max max-w-full justify-start gap-1 overflow-x-auto">
              <TabsTrigger value="summary" className="h-full flex-none px-3 text-xs">Clinical Summary (1)</TabsTrigger>
              <TabsTrigger value="ehr" className="h-full flex-none px-3 text-xs">Health Records ({record.lab_screenings?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="prescriptions" className="h-full flex-none px-3 text-xs">Prescriptions ({record.supplements?.length ?? 0})</TabsTrigger>
            </TabsList>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <TabsContent value="summary" className="m-0"><Button size="sm" className="h-8 gap-1.5 text-xs" onClick={printClinicalSummary}><Printer className="size-3.5" />Print Summary</Button></TabsContent>
              <TabsContent value="ehr" className="m-0"><Button disabled={downloadableEhrRecords.length === 0 || isDownloadingHealthRecords} onClick={() => void downloadHealthRecordsZip()} className="h-8 gap-1.5 px-2.5 text-xs"><Download className="size-3.5" />{isDownloadingHealthRecords ? "Preparing ZIP…" : "Download Health Records"}</Button></TabsContent>
              <TabsContent value="prescriptions" className="m-0"><Button className="h-8 gap-1.5 px-2.5 text-xs" onClick={printPrescriptions}><Printer className="size-3.5" />Print Prescriptions</Button></TabsContent>
            </div>
          </div>

          <TabsContent value="summary" className="mt-4 min-w-0">
            <div className="space-y-6">
              <section aria-labelledby="handover-clinical-summary">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id="handover-clinical-summary" className="text-sm font-semibold text-foreground">Clinical summary</h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">Patient information shared for this transfer.</p>
                  </div>
                  <StatusBadge status={valueOr(latestVitals?.risk_level, "Not assessed")} />
                </div>
                <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
                  <ClinicalField label="Patient" value={patientName} />
                  <ClinicalField label="Age" value={record.patient?.age != null ? `${record.patient.age} years` : "Not recorded"} />
                  <ClinicalField label="Date of birth" value={prettyDate(record.patient?.birth_date)} />
                  <ClinicalField label="Contact number" value={valueOr(record.patient?.phone)} />
                  <ClinicalField label="Civil status" value={valueOr(record.patient?.civil_status)} />
                  <ClinicalField label="Blood type" value={valueOr(record.patient?.blood_type)} />
                  <ClinicalField label="Family serial no." value={valueOr(record.patient?.family_serial_no)} />
                  <ClinicalField label="Address" value={valueOr(record.patient?.address)} className="col-span-2 md:col-span-1" />
                </dl>
              </section>

              <section aria-labelledby="handover-referral-vitals" className="border-t border-border/70 pt-5">
                <h3 id="handover-referral-vitals" className="text-sm font-semibold text-foreground">Latest vitals</h3>
                <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
                  <ClinicalField label="Blood pressure" value={valueOr(latestVitals?.bp, reasonField(fullClinicalSummary, "BP") || "Not recorded")} />
                  <ClinicalField label="Pulse rate" value={valueOr(latestVitals?.pulse_rate, reasonField(fullClinicalSummary, "PR") || "Not recorded")} />
                  <ClinicalField label="Temperature" value={valueOr(latestVitals?.temp, reasonField(fullClinicalSummary, "T") || "Not recorded")} />
                  <ClinicalField label="Weight" value={reasonField(fullClinicalSummary, "wt") || "Not recorded"} />
                  <ClinicalField label="Height" value={reasonField(fullClinicalSummary, "ht") || "Not recorded"} />
                  <ClinicalField label="Fundal height" value={valueOr(latestVitals?.fundic_height)} />
                  <ClinicalField label="Fetal heart tone" value={valueOr(latestVitals?.fetal_heart_tone)} />
                  <ClinicalField label="Blood sugar" value={reasonField(fullClinicalSummary, "Blood Sugar") || "Not recorded"} />
                  <ClinicalField label="Respiratory rate" value={reasonField(fullClinicalSummary, "Respiratory Rate") || "Not recorded"} />
                  <ClinicalField label="O₂ saturation" value={reasonField(fullClinicalSummary, "O2 Saturation") || "Not recorded"} />
                </dl>
              </section>

              <section aria-labelledby="handover-referral-reason" className="border-t border-border/70 pt-5">
                <h3 id="handover-referral-reason" className="text-sm font-semibold text-foreground">Reason for referral</h3>
                <dl className="mt-4 grid min-w-0 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <ClinicalField label="Chief complaint" value={valueOr(latestVitals?.chief_complaint, reasonField(fullClinicalSummary, "CC") || "Not recorded")} />
                  <ClinicalField label="Requested clinical action" value={reasonField(fullClinicalSummary, "Requested clinical action") || "Not recorded"} />
                </dl>
              </section>

              <section aria-labelledby="handover-pregnancy-history" className="border-t border-border/70 pt-5">
                <h3 id="handover-pregnancy-history" className="text-sm font-semibold text-foreground">Pregnancy history</h3>
                <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
                  <ClinicalField label="Gravida / parity" value={`G${valueOr(record.obstetric_info?.gravida, "—")} P${valueOr(record.obstetric_info?.parity, "—")}`} />
                  <ClinicalField label="Age of gestation" value={latestVitals?.gestational_age_weeks != null ? `${latestVitals.gestational_age_weeks} weeks` : "Not recorded"} />
                  <ClinicalField label="LMP" value={prettyDate(record.obstetric_info?.lmp_date)} />
                  <ClinicalField label="EDD" value={prettyDate(record.obstetric_info?.edd_date || reasonField(fullClinicalSummary, "EDC"))} />
                  <ClinicalField label="Previous delivery" value={valueOr(record.obstetric_info?.previous_delivery_history, reasonLine(fullClinicalSummary, "Previous delivery") || "None reported")} className="col-span-2 md:col-span-1" />
                  <ClinicalField label="Co-morbidities" value={valueOr(record.obstetric_info?.co_morbidities, reasonLine(fullClinicalSummary, "Co-morbidities") || "None reported")} className="col-span-2 md:col-span-1" />
                </dl>
              </section>

              <section aria-labelledby="handover-clinical-indicators" className="border-t border-border/70 pt-5">
                <h3 id="handover-clinical-indicators" className="text-sm font-semibold text-foreground">Clinical indicators</h3>
                <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
                  <ClinicalField label="Primary danger signs" value={valueOr(latestVitals?.danger_signs, record.cdss_alerts?.map((alert) => alert.alert_type || alert.alert_message).filter(Boolean).join(", ") || "None reported")} className="col-span-2 md:col-span-3 xl:col-span-4" />
                </dl>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="ehr" className="mt-4 min-w-0">
            <HandoverTable headers={["Test", "Date", "Result", "File / Notes", ""]} rows={ehrRows} emptyTitle="No health records shared" emptyDescription="Laboratory results and attached records included with this referral will appear here." />
          </TabsContent>
          <TabsContent value="prescriptions" className="mt-4 min-w-0">
            <HandoverTable headers={["Medication / Supplement", "Date", "Quantity", "Status"]} rows={prescriptionRows} emptyTitle="No prescriptions shared" emptyDescription="Prescriptions and supplements included with this referral will appear here." />
          </TabsContent>
        </Tabs>
      </section>

      <aside className="hidden min-h-[420px] flex-col border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:border-l print:hidden">
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

          <section className="pt-5 pb-2">
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
        </div>

        <div className="mt-auto shrink-0 border-t border-sidebar-border bg-sidebar px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setIsInitiateReferralOpen(true)}>Initiate Referral</Button>
            <Button type="button" disabled={isResponding || !canAccept} onClick={() => void updateStatus("admitted")} className="h-9 text-xs">{isResponding ? "Accepting…" : "Accept Transfer"}</Button>
          </div>
        </div>
      </aside>
    </div>
    <SheetContent side="right" className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-xl border-sidebar-border bg-sidebar p-0 text-sidebar-foreground lg:hidden">
      <SheetHeader className="shrink-0 border-b border-sidebar-border px-4 py-3 pr-12 text-left">
        <SheetTitle className="text-sm">{valueOr(record.destination_facility?.name, "Bicol Medical Center")}</SheetTitle>
        <SheetDescription className="text-xs">Recipient facility · Transfer status and actions</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <section aria-label="Transfer lifecycle handshake" className="pb-4">
          <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{lifecycleTitle}</h2><StatusBadge status={status} /></div>
          <p className="mt-1 text-xs text-muted-foreground">Processed at {prettyDate(record.date_referred, true)}</p>
          <div className="my-3 grid grid-cols-2 gap-1.5">{[0, 1].map((step) => <span key={step} className={`h-1 rounded-full ${isAdmitted ? "bg-emerald-500" : isReferred ? "bg-orange-500" : step === 0 ? "bg-orange-500" : "bg-border"}`} />)}</div>
          <div className="grid grid-cols-2 text-xs text-muted-foreground"><span>Sent</span><span className="text-right">{isAdmitted ? "Admitted" : isReferred ? "Referred" : "Awaiting"}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">Last updated: {prettyDate(record.date_responded || record.date_referred, true)}</p>
        </section>
        <section className="border-t border-sidebar-border pt-4">
          <h2 className="text-sm font-semibold">Referral information</h2>
          <div className="mt-2">
            <DrawerDetail icon={MapPin} label="Destination">{valueOr(record.destination_facility?.name, "Bicol Medical Center")}</DrawerDetail>
            <DrawerDetail icon={Building2} label="Origin facility">{valueOr(record.referring_facility?.name)}</DrawerDetail>
            <DrawerDetail icon={CalendarDays} label="Pregnancy">G{valueOr(record.obstetric_info?.gravida, "—")} P{valueOr(record.obstetric_info?.parity, "—")}</DrawerDetail>
            <DrawerDetail icon={Activity} label="Age of gestation">{latestVitals?.gestational_age_weeks != null ? `${latestVitals.gestational_age_weeks} weeks` : "Not recorded"}</DrawerDetail>
            <DrawerDetail icon={HeartPulse} label="Assessed risk"><StatusBadge status={valueOr(latestVitals?.risk_level, "Not assessed")} /></DrawerDetail>
          </div>
        </section>
      </div>
      <SheetFooter className="shrink-0 border-t border-sidebar-border bg-sidebar px-4 py-3">
        <Button type="button" disabled={isResponding || !canAccept} onClick={() => { void updateStatus("admitted"); setIsMobileTransferOpen(false) }} className="h-10 w-full text-xs">{isResponding ? "Accepting…" : "Accept Transfer"}</Button>
        <Button type="button" variant="outline" onClick={() => { setIsMobileTransferOpen(false); setIsInitiateReferralOpen(true) }} className="h-9 w-full text-xs">Initiate Referral</Button>
      </SheetFooter>
    </SheetContent>
    </Sheet>

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

