import { useCallback, useEffect, useLayoutEffect, useState, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { Activity, Building2, CalendarDays, Clock3, Download, Droplets, HeartPulse, Printer, RefreshCw, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/ui/status-badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { toast } from "sonner"
import { z } from "zod"
import { useTheme } from "@/components/theme-provider"
import { getPublicSharedJourney, type PublicSharedJourneyRecord } from "../api"
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
} from "@/features/referrals/components/HandoverPrimitives"

const pinSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit security PIN.")

export function SharedJourneyPage() {
  const { token = "" } = useParams()
  const { theme, setTheme } = useTheme()
  const [record, setRecord] = useState<PublicSharedJourneyRecord | null>(null)
  const [pin, setPin] = useState(() => new URLSearchParams(window.location.search).get("pin") ?? "")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingPin, setIsSubmittingPin] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDownloadingHealthRecords, setIsDownloadingHealthRecords] = useState(false)
  const [downloadingRecordIds, setDownloadingRecordIds] = useState<string[]>([])
  const [pinError, setPinError] = useState("")
  const [previewEhrRecord, setPreviewEhrRecord] = useState<HandoverEhrRecord | null>(null)
  const closeEhrPreview = useCallback(() => setPreviewEhrRecord(null), [])
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false)

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
    if (!token) return
    if (!quiet) setIsLoading(true)
    try {
      const response = await getPublicSharedJourney(token, currentPin)
      const shared = response.data ?? null
      setRecord(shared)
      if (shared?.isPinVerified) {
        setPinError("")
      } else if (shared?.pinError) {
        setPinError(shared.pinError)
      } else if (currentPin) {
        setPinError("Invalid security PIN. Please request the code from the mother.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open this shared pregnancy journey")
      setRecord(null)
    } finally {
      if (!quiet) setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    const linkPin = new URLSearchParams(window.location.search).get("pin") ?? ""
    if (linkPin) window.history.replaceState({}, "", window.location.pathname)
    void Promise.resolve().then(() => load(linkPin || undefined))
  }, [load])

  const hasAccess = Boolean(record && (!record.isPinRequired || record.isPinVerified))
  const currentPregnancy = record?.current_pregnancy
  const latestVitals = currentPregnancy?.latest_vitals
  const patientName = record?.patient?.name || "Shared Pregnancy Journey"
  const facilityName = record?.patient?.primary_facility?.facility_name || "Community Health Center"
  const pregnancyStatus = currentPregnancy?.pregnancy_status || "Active"
  const riskLevel = valueOr(latestVitals?.risk_level, "Not assessed")

  useEffect(() => {
    document.title = `${hasAccess ? patientName : "Shared Pregnancy Journey"} - Silang`
  }, [hasAccess, patientName])

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = pinSchema.safeParse(pin)
    if (!parsed.success) {
      setPinError(parsed.error.issues[0]?.message ?? "Enter the 6-digit security PIN.")
      return
    }
    setIsSubmittingPin(true)
    try {
      await load(pin)
    } finally {
      setIsSubmittingPin(false)
    }
  }

  const refreshJourney = async () => {
    setIsRefreshing(true)
    try {
      await load(pin, true)
    } finally {
      setIsRefreshing(false)
    }
  }

  const printSection = (title: string, body: string) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Allow pop-ups to print this summary")
      return
    }
    printWindow.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font:14px Arial,sans-serif;color:#111;margin:32px}h1{font-size:20px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{text-align:left;padding:8px;border-bottom:1px solid #ddd}</style></head><body><h1>${title}</h1>${body}<script>window.onload=()=>window.print()</script></body></html>`)
    printWindow.document.close()
  }

  const printClinicalSummary = () => printSection(
    `${patientName} · Pregnancy Summary`,
    `<p><b>Primary Facility:</b> ${facilityName}</p><p><b>Risk:</b> ${riskLevel}</p><p><b>Gravida / Parity:</b> G${valueOr(currentPregnancy?.gravida, "—")} P${valueOr(currentPregnancy?.parity, "—")}</p><p><b>Age of Gestation:</b> ${currentPregnancy?.gestational_age_weeks != null ? `${currentPregnancy.gestational_age_weeks} weeks` : "Not recorded"}</p><p><b>EDD:</b> ${prettyDate(currentPregnancy?.edd_date || currentPregnancy?.edd)}</p>`,
  )

  const printPrescriptions = () => {
    const rows = (record?.supplements ?? []).map((item) => `<tr><td>${item.supplement_type}</td><td>${prettyDate(item.date_given)}</td><td>${item.tablets_given_count ?? "Not recorded"}</td><td>${item.is_completed ? "Completed" : "Active"}</td></tr>`).join("")
    printSection(`${patientName} · Prescriptions`, `<table><thead><tr><th>Medication / Supplement</th><th>Date</th><th>Quantity</th><th>Status</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>No prescriptions recorded.</td></tr>"}</tbody></table>`)
  }

  const printPrenatalVisits = () => {
    const rows = (record?.prenatal_visits ?? []).map((visit) => `<tr><td>${prettyDate(visit.visit_date)}</td><td>${visit.age_of_gestation_weeks != null ? `${visit.age_of_gestation_weeks} wks` : "Not recorded"}</td><td>${visit.bp_systolic != null && visit.bp_diastolic != null ? `${visit.bp_systolic}/${visit.bp_diastolic}` : "Not recorded"}</td><td>${valueOr(visit.risk_level_assessed, "Not assessed")}</td></tr>`).join("")
    printSection(`${patientName} · Prenatal Visits`, `<table><thead><tr><th>Visit Date</th><th>AOG</th><th>Blood Pressure</th><th>Risk Level</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>No prenatal visits recorded.</td></tr>"}</tbody></table>`)
  }

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

  const downloadJourneyZip = async () => {
    setIsDownloadingHealthRecords(true)
    try {
      const healthFiles = await getHealthRecordArchiveEntries()
      if (healthFiles.length === 0) {
        healthFiles.push({ name: "Health Records/README.txt", data: new TextEncoder().encode("No health record attachments are available for this pregnancy journey.") })
      }
      const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
      const summaryDocument = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(patientName)} - Pregnancy Summary</title></head><body><h1>${escapeHtml(patientName)} · Pregnancy Summary</h1><p><b>Primary Facility:</b> ${escapeHtml(facilityName)}</p><p><b>Risk:</b> ${escapeHtml(riskLevel)}</p><p><b>Gravida / Parity:</b> G${escapeHtml(valueOr(currentPregnancy?.gravida, "—"))} P${escapeHtml(valueOr(currentPregnancy?.parity, "—"))}</p><p><b>AOG:</b> ${escapeHtml(currentPregnancy?.gestational_age_weeks != null ? `${currentPregnancy.gestational_age_weeks} weeks` : "Not recorded")}</p><p><b>EDD:</b> ${escapeHtml(prettyDate(currentPregnancy?.edd_date || currentPregnancy?.edd))}</p></body></html>`
      const prescriptionRows = (record?.supplements ?? []).map((item) => `<tr><td>${escapeHtml(item.supplement_type)}</td><td>${escapeHtml(prettyDate(item.date_given))}</td><td>${escapeHtml(item.tablets_given_count ?? "Not recorded")}</td><td>${item.is_completed ? "Completed" : "Active"}</td></tr>`).join("")
      const prescriptionsDocument = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(patientName)} - Prescriptions</title><style>body{font:14px Arial,sans-serif}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:8px;border-bottom:1px solid #ddd}</style></head><body><h1>${escapeHtml(patientName)} · Prescriptions</h1><table><thead><tr><th>Medication / Supplement</th><th>Date</th><th>Quantity</th><th>Status</th></tr></thead><tbody>${prescriptionRows || "<tr><td colspan='4'>No prescriptions recorded.</td></tr>"}</tbody></table></body></html>`
      const files = [
        { name: "Clinical Summary.html", data: new TextEncoder().encode(summaryDocument) },
        { name: "Prescriptions.html", data: new TextEncoder().encode(prescriptionsDocument) },
        ...healthFiles,
      ]
      const motherSlug = record?.patient?.name?.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "maternal-records"
      saveBlob(createZipBlob(files), `${motherSlug}-pregnancy-journey.zip`)
      toast.success("Pregnancy journey ZIP downloaded")
    } catch {
      toast.error("Could not download the pregnancy journey ZIP")
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
    cells: [
      valueOr(supplement.supplement_type),
      prettyDate(supplement.date_given),
      valueOr(supplement.tablets_given_count, "Not recorded"),
      <StatusBadge status={supplement.is_completed ? "Completed" : "Active"} />,
    ],
  }))

  const prenatalVisitRows: HandoverTableRow[] = (record?.prenatal_visits ?? []).map((visit, index) => ({
    id: visit.visit_id || `visit-${index}`,
    cells: [
      prettyDate(visit.visit_date),
      visit.age_of_gestation_weeks != null ? `${visit.age_of_gestation_weeks} weeks` : "Not recorded",
      visit.bp_systolic != null && visit.bp_diastolic != null ? `${visit.bp_systolic}/${visit.bp_diastolic}` : "Not recorded",
      visit.weight_kg != null ? `${visit.weight_kg} kg` : "Not recorded",
      <StatusBadge status={valueOr(visit.risk_level_assessed, "Not assessed")} />,
    ],
  }))

  const medicalFlags = [
    currentPregnancy?.prev_caesarean && "Previous caesarean",
    currentPregnancy?.stillbirth_history && "Stillbirth history",
    currentPregnancy?.pph_history && "Postpartum hemorrhage history",
    currentPregnancy?.has_tb && "Tuberculosis",
    currentPregnancy?.has_heart_disease && "Heart disease",
    currentPregnancy?.has_diabetes && "Diabetes",
    currentPregnancy?.has_asthma && "Asthma",
    currentPregnancy?.has_goiter && "Goiter",
  ].filter(Boolean).join(", ")

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
    <Card className="w-full max-w-md"><CardHeader><CardTitle className="text-base">Shared journey unavailable</CardTitle><p className="text-sm text-muted-foreground">This pregnancy share link may be invalid, inactive, or expired.</p></CardHeader></Card>
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
        <CardTitle className="text-base">Shared pregnancy journey</CardTitle>
        <p className="max-w-[280px] text-xs text-muted-foreground">Enter the 6-digit security PIN from the mother to view her maternal records.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-md border border-border/70 bg-muted/25 px-3 py-2.5 text-center">
          <div className="min-w-0">
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><UserRound className="size-3.5 shrink-0" />Mother</p>
            <p className="mt-1 truncate text-xs font-medium">{valueOr(record.patient_preview?.initials, "Protected Record")}</p>
          </div>
          <div className="min-w-0">
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Building2 className="size-3.5 shrink-0" />Facility</p>
            <p className="mt-1 truncate text-xs font-medium">{valueOr(record.patient_preview?.facility_name, "Community Health Center")}</p>
          </div>
        </div>
        <form onSubmit={submitPin} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shared-journey-pin">Security PIN <span className="text-destructive">*</span></Label>
            <Input
              id="shared-journey-pin"
              autoFocus
              aria-label="Six-digit security PIN"
              aria-invalid={Boolean(pinError)}
              value={pin}
              onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 6)); setPinError("") }}
              placeholder="Enter 6-digit PIN"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="h-8 text-center font-mono text-xs"
            />
            {pinError && <p role="alert" className="text-xs text-destructive">{pinError}</p>}
          </div>
          <Button type="submit" disabled={isSubmittingPin} className="h-9 w-full">{isSubmittingPin ? "Verifying…" : "View pregnancy journey"}</Button>
        </form>
      </CardContent>
    </Card>
  </main>

  return <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <Sheet open={isMobileInfoOpen} onOpenChange={setIsMobileInfoOpen}>
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
            <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Refresh journey" title="Refresh journey" disabled={isRefreshing} onClick={() => void refreshJourney()}><RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} /></Button>
            <Button type="button" variant="outline" className="hidden h-8 gap-1.5 px-2.5 text-xs sm:inline-flex" onClick={() => window.print()}><Printer className="size-3.5" />Print Summary</Button>
            <Button type="button" disabled={isDownloadingHealthRecords} className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => void downloadJourneyZip()}><Download className="size-3.5" />{isDownloadingHealthRecords ? "Preparing ZIP…" : "Export Journey"}</Button>
            <SheetTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 px-2.5 text-xs font-medium lg:hidden">
                <UserRound className="size-3.5 shrink-0" />
                <span>Mother Info</span>
              </Button>
            </SheetTrigger>
          </div>
        </div>
        <div className="hidden h-full w-[min(75vw,24rem)] shrink-0 items-center justify-between gap-3 bg-sidebar px-5 text-sidebar-foreground lg:flex lg:border-l lg:border-sidebar-border">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent ring-1 ring-sidebar-border">
              <Building2 className="size-4 text-sidebar-foreground/70" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-col text-left">
              <span className="truncate text-xs font-medium">{facilityName}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">Primary facility</span>
            </div>
          </div>
          <PageGuide />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Shared pregnancy journey content" className="min-h-0 min-w-0 overflow-y-auto bg-white px-4 py-4 text-foreground dark:bg-black sm:px-5">
          <Tabs defaultValue="summary" className="w-full min-w-0 pb-6">
            <div className="sticky top-0 z-20 -mx-4 flex w-full min-w-0 items-center justify-between gap-3 bg-white px-4 py-2 dark:bg-black sm:-mx-5 sm:px-5">
              <TabsList className="h-9 w-max max-w-full justify-start gap-1 overflow-x-auto">
                <TabsTrigger value="summary" className="h-full flex-none px-3 text-xs">Clinical Summary (1)</TabsTrigger>
                <TabsTrigger value="visits" className="h-full flex-none px-3 text-xs">Prenatal Visits ({record.prenatal_visits?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="ehr" className="h-full flex-none px-3 text-xs">Health Records ({record.lab_screenings?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="prescriptions" className="h-full flex-none px-3 text-xs">Prescriptions ({record.supplements?.length ?? 0})</TabsTrigger>
              </TabsList>
              <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
                <TabsContent value="summary" className="m-0"><Button size="sm" className="h-8 gap-1.5 text-xs" onClick={printClinicalSummary}><Printer className="size-3.5" />Print Summary</Button></TabsContent>
                <TabsContent value="visits" className="m-0"><Button size="sm" className="h-8 gap-1.5 text-xs" onClick={printPrenatalVisits}><Printer className="size-3.5" />Print Visits</Button></TabsContent>
                <TabsContent value="ehr" className="m-0"><Button disabled={downloadableEhrRecords.length === 0 || isDownloadingHealthRecords} onClick={() => void downloadHealthRecordsZip()} className="h-8 gap-1.5 px-2.5 text-xs"><Download className="size-3.5" />{isDownloadingHealthRecords ? "Preparing ZIP…" : "Download Health Records"}</Button></TabsContent>
                <TabsContent value="prescriptions" className="m-0"><Button className="h-8 gap-1.5 px-2.5 text-xs" onClick={printPrescriptions}><Printer className="size-3.5" />Print Prescriptions</Button></TabsContent>
              </div>
            </div>

            <TabsContent value="summary" className="mt-4 min-w-0">
              <div className="space-y-6">
                <section aria-labelledby="journey-clinical-summary">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 id="journey-clinical-summary" className="text-sm font-semibold text-foreground">Mother information</h2>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">Read-only maternal profile shared by the patient.</p>
                    </div>
                    <StatusBadge status={riskLevel} />
                  </div>
                  <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
                    <ClinicalField label="Patient" value={patientName} />
                    <ClinicalField label="Age" value={record.patient?.age != null ? `${record.patient.age} years` : "Not recorded"} />
                    <ClinicalField label="Date of birth" value={prettyDate(record.patient?.birth_date)} />
                    <ClinicalField label="Contact number" value={valueOr(record.patient?.phone_number)} />
                    <ClinicalField label="Civil status" value={valueOr(record.patient?.civil_status)} />
                    <ClinicalField label="Blood type" value={valueOr(record.patient?.blood_type)} />
                    <ClinicalField label="Family serial no." value={valueOr(record.patient?.family_serial_no)} />
                    <ClinicalField label="Address" value={valueOr(record.patient?.address)} className="col-span-2 md:col-span-1" />
                  </dl>
                </section>

                <section aria-labelledby="journey-latest-vitals" className="border-t border-border/70 pt-5">
                  <h3 id="journey-latest-vitals" className="text-sm font-semibold text-foreground">Latest vitals</h3>
                  <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
                    <ClinicalField label="Visit date" value={prettyDate(latestVitals?.visit_date)} />
                    <ClinicalField label="Blood pressure" value={valueOr(latestVitals?.bp)} />
                    <ClinicalField label="Pulse rate" value={latestVitals?.pulse_rate != null ? `${latestVitals.pulse_rate} bpm` : "Not recorded"} />
                    <ClinicalField label="Temperature" value={latestVitals?.temp != null ? `${latestVitals.temp} °C` : "Not recorded"} />
                    <ClinicalField label="Weight" value={latestVitals?.weight_kg != null ? `${latestVitals.weight_kg} kg` : "Not recorded"} />
                    <ClinicalField label="Fundal height" value={latestVitals?.fundic_height != null ? `${latestVitals.fundic_height} cm` : "Not recorded"} />
                    <ClinicalField label="Fetal heart tone" value={latestVitals?.fetal_heart_tone != null ? `${latestVitals.fetal_heart_tone} bpm` : "Not recorded"} />
                    <ClinicalField label="Fetal presentation" value={valueOr(latestVitals?.fetal_presentation)} />
                  </dl>
                </section>

                <section aria-labelledby="journey-pregnancy-history" className="border-t border-border/70 pt-5">
                  <h3 id="journey-pregnancy-history" className="text-sm font-semibold text-foreground">Pregnancy history</h3>
                  <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
                    <ClinicalField label="Gravida / parity" value={`G${valueOr(currentPregnancy?.gravida, "—")} P${valueOr(currentPregnancy?.parity, "—")}`} />
                    <ClinicalField label="Age of gestation" value={currentPregnancy?.gestational_age_weeks != null ? `${currentPregnancy.gestational_age_weeks} weeks` : "Not recorded"} />
                    <ClinicalField label="LMP" value={prettyDate(currentPregnancy?.lmp_date)} />
                    <ClinicalField label="EDD" value={prettyDate(currentPregnancy?.edd_date || currentPregnancy?.edd)} />
                    <ClinicalField label="BMI category" value={valueOr(currentPregnancy?.bmi_category)} />
                    <ClinicalField label="8 ANC completed" value={currentPregnancy?.completed_8anc ? "Yes" : "No"} />
                    <ClinicalField label="Previous delivery" value={valueOr(currentPregnancy?.previous_delivery_history, "None reported")} className="col-span-2 md:col-span-1" />
                    <ClinicalField label="Co-morbidities" value={valueOr(currentPregnancy?.co_morbidities, "None reported")} className="col-span-2 md:col-span-1" />
                  </dl>
                </section>

                <section aria-labelledby="journey-clinical-indicators" className="border-t border-border/70 pt-5">
                  <h3 id="journey-clinical-indicators" className="text-sm font-semibold text-foreground">Clinical indicators</h3>
                  <dl className="mt-4 grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
                    <ClinicalField label="Chief complaint" value={valueOr(latestVitals?.chief_complaint, "None reported")} className="col-span-2" />
                    <ClinicalField label="Primary danger signs" value={valueOr(latestVitals?.danger_signs, "None reported")} className="col-span-2" />
                    <ClinicalField label="Obstetric & medical flags" value={medicalFlags || "None reported"} className="col-span-2 md:col-span-3 xl:col-span-4" />
                  </dl>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="visits" className="mt-4 min-w-0">
              <HandoverTable headers={["Visit Date", "Age of Gestation", "Blood Pressure", "Weight", "Assessed Risk"]} rows={prenatalVisitRows} emptyTitle="No prenatal visits recorded" emptyDescription="Prenatal checkups recorded for this mother will appear here." />
            </TabsContent>
            <TabsContent value="ehr" className="mt-4 min-w-0">
              <HandoverTable headers={["Test", "Date", "Result", "File / Notes", ""]} rows={ehrRows} emptyTitle="No health records shared" emptyDescription="Laboratory results and attached records for this mother will appear here." />
            </TabsContent>
            <TabsContent value="prescriptions" className="mt-4 min-w-0">
              <HandoverTable headers={["Medication / Supplement", "Date", "Quantity", "Status"]} rows={prescriptionRows} emptyTitle="No prescriptions shared" emptyDescription="Prescriptions and supplements recorded for this mother will appear here." />
            </TabsContent>
          </Tabs>
        </section>

        <aside className="hidden min-h-[420px] flex-col border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:border-l print:hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            <section aria-label="Shared pregnancy status" className="-mx-5 border-b border-sidebar-border/70 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Shared journey</h2>
                <StatusBadge status={pregnancyStatus} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Link created {prettyDate(record.share_metadata?.created_at, true)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Read-only maternal summary</p>
            </section>

            <section className="pt-5 pb-4">
              <h2 className="text-sm font-semibold">Mother overview</h2>
              <p className="mt-1 text-xs text-muted-foreground">Current pregnancy and facility details.</p>
              <div className="mt-2">
                <DrawerDetail icon={UserRound} label="Patient">{patientName}</DrawerDetail>
                <DrawerDetail icon={Building2} label="Primary facility">{facilityName}</DrawerDetail>
                <DrawerDetail icon={HeartPulse} label="Assessed risk"><StatusBadge status={riskLevel} /></DrawerDetail>
                <DrawerDetail icon={CalendarDays} label="Pregnancy">G{valueOr(currentPregnancy?.gravida, "—")} P{valueOr(currentPregnancy?.parity, "—")}</DrawerDetail>
                <DrawerDetail icon={Activity} label="Age of gestation">{currentPregnancy?.gestational_age_weeks != null ? `${currentPregnancy.gestational_age_weeks} weeks` : "Not recorded"}</DrawerDetail>
                <DrawerDetail icon={Clock3} label="Expected delivery">{prettyDate(currentPregnancy?.edd_date || currentPregnancy?.edd)}</DrawerDetail>
                <DrawerDetail icon={Droplets} label="Blood type">{valueOr(record.patient?.blood_type)}</DrawerDetail>
              </div>
            </section>
          </div>
        </aside>
      </div>

      <SheetContent side="right" className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-xl border-sidebar-border bg-sidebar p-0 text-sidebar-foreground lg:hidden">
        <SheetHeader className="shrink-0 border-b border-sidebar-border px-4 py-3 pr-12 text-left">
          <SheetTitle className="text-sm">{patientName}</SheetTitle>
          <SheetDescription className="text-xs">{facilityName} · Read-only maternal summary</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <section aria-label="Shared pregnancy status" className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Shared journey</h2>
              <StatusBadge status={pregnancyStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Link created {prettyDate(record.share_metadata?.created_at, true)}</p>
          </section>
          <section className="border-t border-sidebar-border pt-4">
            <h2 className="text-sm font-semibold">Mother overview</h2>
            <div className="mt-2">
              <DrawerDetail icon={Building2} label="Primary facility">{facilityName}</DrawerDetail>
              <DrawerDetail icon={HeartPulse} label="Assessed risk"><StatusBadge status={riskLevel} /></DrawerDetail>
              <DrawerDetail icon={CalendarDays} label="Pregnancy">G{valueOr(currentPregnancy?.gravida, "—")} P{valueOr(currentPregnancy?.parity, "—")}</DrawerDetail>
              <DrawerDetail icon={Activity} label="Age of gestation">{currentPregnancy?.gestational_age_weeks != null ? `${currentPregnancy.gestational_age_weeks} weeks` : "Not recorded"}</DrawerDetail>
              <DrawerDetail icon={Clock3} label="Expected delivery">{prettyDate(currentPregnancy?.edd_date || currentPregnancy?.edd)}</DrawerDetail>
              <DrawerDetail icon={Droplets} label="Blood type">{valueOr(record.patient?.blood_type)}</DrawerDetail>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
    <HandoverEhrPreview key={previewEhrRecord?.screening_id ?? "closed"} record={previewEhrRecord} onClose={closeEhrPreview} />
  </main>
}
