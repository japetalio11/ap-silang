import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/ui/status-badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { TableRowActions } from "@/components/ui/table-row-actions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { TableSkeletonRows } from "@/components/ui/table-skeleton-rows"
import { ConfirmSensitiveActionDialog } from "@/components/ui/confirm-sensitive-action-dialog"
import { MaternalRegistrationModal, type RegistrationValues } from "./MaternalRegistrationModal"
import { ConnectMotherQrModal } from "./ConnectMotherQrModal"
import { ExportMaternalRecordsModal, type MaternalExportOptions } from "./ExportMaternalRecordsModal"
import {
  Download,
  PlusCircle,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { differenceInCalendarDays, format, isValid } from "date-fns"
import { useAuthSession } from "@/features/auth/auth-session"
import { connectMotherToFacility, deleteMaternalRecord, getLatestMaternalPregnancy, getLatestPrenatalVisit, getMaternalRecords, normalizeMaternalRisk, registerMaternalRecord, registerPregnancy, type MaternalRecord } from "../api"
import { MaternalAvatar } from "./MaternalAvatar"

const recordTabs = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "referred", label: "Referred" },
  { value: "postpartum", label: "Postpartum" },
]

const filters = [
  {
    name: "Risk Flag",
    options: [
      { label: "All" },
      { label: "Low Risk", color: "bg-emerald-500" },
      { label: "Moderate Risk", color: "bg-amber-500" },
      { label: "High Risk", color: "bg-rose-500" },
    ],
  },
  {
    name: "Barangay",
    options: [
      { label: "San Isidro" },
      { label: "Carolina" },
      { label: "Pili" },
    ],
  },
  {
    name: "Trimester",
    options: [
      { label: "1st Trimester" },
      { label: "2nd Trimester" },
      { label: "3rd Trimester" },
      { label: "Postpartum" },
    ],
  },
]

export function MaternalRecordsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const { session } = useAuthSession()
  const [records, setRecords] = useState<MaternalRecord[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(session?.token))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedMotherIds, setSelectedMotherIds] = useState<string[]>([])
  const [motherToDelete, setMotherToDelete] = useState<MaternalRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const hasActiveFilters = Object.entries(selectedFilters).some(([name, values]) =>
    name === "Risk Flag" ? values.some((value) => value !== "All") : values.length > 0
  )

  const updateFilter = (name: string, value: string, checked: boolean) => {
    setSelectedFilters((current) => {
      const currentValues = current[name] ?? []
      let nextValues: string[]

      if (name === "Risk Flag" && value === "All" && checked) {
        nextValues = ["All"]
      } else if (name === "Risk Flag" && checked) {
        nextValues = [...currentValues.filter((item) => item !== "All"), value]
      } else {
        nextValues = checked
          ? [...currentValues, value]
          : currentValues.filter((item) => item !== value)
      }

      const next = { ...current }
      if (nextValues.length > 0) next[name] = nextValues
      else delete next[name]
      return next
    })
  }

  const loadRecords = async (refresh = false) => {
    if (!session?.token) return
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const response = await getMaternalRecords(session.token)
      setRecords(Array.isArray(response.result) ? response.result : [])
      if (refresh) toast.success("Maternal records refreshed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load maternal records")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const token = session?.token
    if (!token) return
    let active = true
    getMaternalRecords(token)
      .then((response) => { if (active) setRecords(Array.isArray(response.result) ? response.result : []) })
      .catch((error: unknown) => { if (active) toast.error(error instanceof Error ? error.message : "Unable to load maternal records") })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [session?.token])

  const viewRows = useMemo(() => records.map((record) => {
    const user = record.user
    const name = [user?.first_name, user?.middle_name, user?.last_name].filter(Boolean).join(" ") || "Unnamed patient"
    const latestPregnancy = getLatestMaternalPregnancy(record.pregnancies)
    const latestVisit = getLatestPrenatalVisit(latestPregnancy)
    const lmp = latestPregnancy?.lmp_date ? new Date(latestPregnancy.lmp_date) : null
    const edd = latestPregnancy?.edd_date ? new Date(latestPregnancy.edd_date) : null
    const gestationDays = lmp && isValid(lmp) ? Math.max(0, differenceInCalendarDays(new Date(), lmp)) : null
    const aog = gestationDays === null ? "—" : `${Math.floor(gestationDays / 7)}w ${gestationDays % 7}d`
    const riskLabel = normalizeMaternalRisk(latestVisit?.risk_level_assessed)
    const pregnancyStatus = latestPregnancy?.pregnancy_status?.toLowerCase() ?? ""
    const address = user?.address ?? "—"
    const nextFollowUp = "—"
    const searchText = [name, record.family_serial_no, record.age, latestPregnancy?.gravida, latestPregnancy?.parity, aog, edd?.toLocaleDateString(), riskLabel, address, user?.phone_number].join(" ").toLowerCase()
    return { record, name, latestPregnancy, latestVisit, lmp, edd, aog, riskLabel, pregnancyStatus, address, nextFollowUp, searchText }
  }), [records])

  const selectedRisks = selectedFilters["Risk Flag"] ?? []
  const selectedBarangays = selectedFilters.Barangay ?? []
  const selectedTrimesters = selectedFilters.Trimester ?? []
  const filteredRows = viewRows.filter((row) => {
    const matchesSearch = !search.trim() || row.searchText.includes(search.trim().toLowerCase())
    const matchesRisk = selectedRisks.length === 0 || selectedRisks.includes("All") || selectedRisks.includes(row.riskLabel)
    const barangay = row.address.toLowerCase()
    const matchesBarangay = selectedBarangays.length === 0 || selectedBarangays.some((value) => barangay.includes(value.toLowerCase()))
    const lmpDays = row.lmp ? Math.max(0, differenceInCalendarDays(new Date(), row.lmp)) : null
    const trimester = lmpDays === null ? "" : lmpDays < 98 ? "1st Trimester" : lmpDays < 196 ? "2nd Trimester" : "3rd Trimester"
    const matchesTrimester = selectedTrimesters.length === 0 || selectedTrimesters.includes(trimester) || selectedTrimesters.includes("Postpartum") && row.pregnancyStatus.includes("postpartum")
    const matchesTab = activeTab === "all"
      || activeTab === "active" && row.pregnancyStatus === "active"
      || activeTab === "referred" && row.pregnancyStatus.includes("refer")
      || activeTab === "postpartum" && (row.pregnancyStatus.includes("postpartum") || row.pregnancyStatus.includes("delivered"))
    return matchesSearch && matchesRisk && matchesBarangay && matchesTrimester && matchesTab
  })
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
  const hasSearchOrFilter = Boolean(search.trim()) || hasActiveFilters
  const resetMotherView = () => {
    setSearch("")
    setSelectedFilters({})
    setActiveTab("all")
    setPage(1)
  }

  const handleRegister = async (values: RegistrationValues) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in and try again.")
    const response = await registerMaternalRecord(session.token, {
      first_name: values.firstName.trim(),
      middle_name: values.middleName.trim() || undefined,
      last_name: values.lastName.trim(),
      address: values.address.trim(),
      phone_number: values.contactNumber.trim(),
      email: values.email.trim() || undefined,
      facility_id: session.user.facility_id ?? undefined,
      assigned_worker_id: values.healthWorker || undefined,
      family_serial_no: values.familySerialNo.trim() || undefined,
      birth_date: values.dateOfBirth,
      civil_status: values.civilStatus,
      blood_type: values.bloodType,
    })
    const mother = response.result?.mother ?? response.mother
    const motherId = mother?.mother_id
    if (!motherId) throw new Error("The mother profile was saved, but the server did not return its record ID.")

    if (values.lastMenstrualPeriod) {
      const chronic = [...values.chronicConditions, values.otherComorbidities.trim()].filter(Boolean).join(", ")
      try {
        await registerPregnancy(session.token, {
        motherId,
        lmp_date: values.lastMenstrualPeriod,
        edd_date: values.estimatedDueDate || undefined,
        gravida: Number(values.gravida),
        parity: Number(values.parity),
        age_group: values.ageGroup,
        pregnancy_status: values.pregnancyStatus,
        height_cm: values.heightCm ? Number(values.heightCm) : undefined,
        bmi_1st_trimester: values.firstTrimesterBmi ? Number(values.firstTrimesterBmi) : undefined,
        bmi_category: values.bmiCategory || undefined,
        completed_8anc: values.completedEightAncVisits,
        prev_caesarean: values.previousCesarean,
        consecutive_miscarriages: values.recurrentMiscarriages,
        stillbirth_history: values.stillbirth,
        pph_history: values.postpartumHemorrhage,
        has_heart_disease: values.chronicConditions.includes("Heart Disease"),
        has_diabetes: values.chronicConditions.includes("Diabetes"),
        has_tb: values.chronicConditions.includes("Tuberculosis"),
        has_asthma: values.chronicConditions.includes("Asthma"),
        has_goiter: values.chronicConditions.includes("Goiter"),
        co_morbidities: chronic || undefined,
        previous_delivery_history: values.deliveryHistoryNotes.trim() || undefined,
        })
      } catch (error) {
        await loadRecords()
        throw new Error(`The maternal profile was created, but its pregnancy details could not be saved: ${error instanceof Error ? error.message : "Please try again."}`, { cause: error })
      }
    }
    toast.success(response.already_exists ? "Mother added to this facility" : response.offline ? "Maternal record saved offline" : "Maternal record created")
    await loadRecords()
  }

  const confirmDelete = async () => {
    if (!motherToDelete || !session?.token) return
    setIsDeleting(true)
    try {
      await deleteMaternalRecord(session.token, motherToDelete.mother_id)
      toast.success("Maternal record deleted")
      setMotherToDelete(null)
      await loadRecords()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete maternal record")
    } finally {
      setIsDeleting(false)
    }
  }

  const connectMother = async (code: string) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in and try again.")
    await connectMotherToFacility(session.token, code)
    await loadRecords()
  }

  const exportRegistry = ({ format: exportFormat, scope, fieldDepth, risk }: MaternalExportOptions) => {
    const sourceRows = scope === "all" ? viewRows : filteredRows
    const exportRows = risk === "all" ? sourceRows : sourceRows.filter((row) => row.riskLabel.toLowerCase().includes(risk))
    const comprehensive = fieldDepth === "comprehensive"
    const data = exportRows.map(({ record, name, latestPregnancy, aog, riskLabel, address }) => ({
      "Family Serial No.": record.family_serial_no || "",
      "Full Name": name,
      Age: record.age ?? "",
      "Date of Birth": record.birth_date || "",
      Risk: riskLabel,
      AOG: aog,
      EDD: latestPregnancy?.edd_date || "",
      Barangay: address,
      Phone: record.user?.phone_number || "",
      ...(comprehensive ? {
        Email: record.user?.email || "",
        "Civil Status": record.civil_status || "",
        "Blood Type": record.blood_type || "",
        Gravida: latestPregnancy?.gravida ?? "",
        Parity: latestPregnancy?.parity ?? "",
        LMP: latestPregnancy?.lmp_date || "",
      } : {}),
    }))
    const filename = `maternal-registry-${new Date().toISOString().slice(0, 10)}`
    if (exportFormat === "pdf") {
      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        toast.error("Allow pop-ups to print the registry sheet")
        return
      }
      printWindow.opener = null
      const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!)
      const headers = Object.keys(data[0] ?? { "Full Name": "" })
      printWindow.document.write(`<html><head><title>Maternal Registry</title><style>body{font:12px Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #bbb;padding:7px;text-align:left}th{background:#eee}</style></head><body><h1>Maternal Registry</h1><p>${data.length} records · ${new Date().toLocaleDateString()}</p><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${data.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header as keyof typeof row])}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`)
      printWindow.document.close()
      toast.success("Printable registry opened")
      return
    }
    const content = exportFormat === "json"
      ? JSON.stringify(comprehensive ? exportRows.map(({ record }) => record) : data, null, 2)
      : [Object.keys(data[0] ?? { "Full Name": "" }).join(","), ...data.map((row) => Object.values(row).map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))].join("\r\n")
    const blob = new Blob([exportFormat === "csv" ? `\uFEFF${content}` : content], { type: exportFormat === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.${exportFormat}`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`${exportRows.length} maternal record${exportRows.length === 1 ? "" : "s"} exported`)
  }

  return (
    <div className="relative flex h-full w-full items-start overflow-hidden">
      <div className="relative flex h-full min-w-0 w-full flex-col overflow-y-auto text-foreground">
        <div className="sticky top-0 z-10 flex flex-col gap-3 bg-background p-4 dark:bg-black">
          <div className="flex min-w-0 items-center justify-between gap-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="shrink-0">
              <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setPage(1) }} className="w-max">
                <TabsList className="h-9 w-max justify-start gap-1">
                  {recordTabs.map(({ value, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="h-full flex-initial border px-2 py-1 text-xs font-medium"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <TooltipProvider>
              <div className="flex shrink-0 flex-nowrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Export CSV" onClick={() => setIsExportOpen(true)} className="size-8 border-sidebar-border">
                      <Download className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export CSV</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Refresh maternal records" onClick={() => void loadRecords(true)} disabled={isRefreshing} className="size-8 border-sidebar-border">
                      <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
                <Button variant="outline" onClick={() => setIsQrModalOpen(true)} className="h-8 gap-2 border-sidebar-border px-2 text-xs font-medium">
                  <QrCode className="size-3.5" />
                  Scan QR
                </Button>
                <Button onClick={() => setIsRegistrationOpen(true)} className="h-8 shrink-0 gap-2 bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  <UserPlus className="size-3.5" />
                  Create Maternal Record
                </Button>
              </div>
            </TooltipProvider>
          </div>

          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="relative min-w-[280px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                aria-label="Search mothers"
                placeholder="Search by mother's name, family serial no., or phone..."
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                className="h-8 w-full bg-muted/70 pl-8 text-xs dark:bg-muted/60"
              />
            </div>
            {filters.map((filter) => (
              <Popover key={filter.name}>
                <PopoverTrigger asChild>
                  <Button variant="filter" size="filter">
                    <PlusCircle className="size-3.5" />
                    {filter.name}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-3">
                  <div className="flex flex-col gap-3">
                    {filter.options.map((option) => {
                      const optionId = `${filter.name}-${option.label}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                      return (
                        <label key={option.label} htmlFor={optionId} className="flex cursor-pointer items-center gap-2 text-xs">
                          <Checkbox
                            id={optionId}
                            checked={(selectedFilters[filter.name] ?? []).includes(option.label)}
                            onCheckedChange={(checked) => { updateFilter(filter.name, option.label, checked === true); setPage(1) }}
                            className="size-3.5 rounded-[4px] border-sidebar-border"
                          />
                          {"color" in option && <span className={`size-2 rounded-full ${option.color}`} />}
                          <span>{option.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            ))}
            {hasSearchOrFilter && (
              <Button
                variant="ghost"
                className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"
                onClick={resetMotherView}
              >
                <RotateCcw className="size-3.5" />
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 pb-6 md:pt-0">
          <div className="overflow-x-auto rounded-md border border-sidebar-border bg-background dark:bg-black">
            <div className="min-w-[980px]">
              <Table>
                <TableHeader className="bg-card dark:bg-[#111]">
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead className="w-12 pl-4 text-center"><Checkbox aria-label="Select all mothers on this page" checked={pagedRows.length > 0 && pagedRows.every((row) => selectedMotherIds.includes(row.record.mother_id))} onCheckedChange={(checked) => setSelectedMotherIds((current) => {
                      const visibleIds = pagedRows.map((row) => row.record.mother_id)
                      return checked === true ? Array.from(new Set([...current, ...visibleIds])) : current.filter((id) => !visibleIds.includes(id))
                    })} className="border-sidebar-border" /></TableHead>
                    <TableHead className="text-xs font-medium text-foreground">Patient Details</TableHead>
                    <TableHead className="text-xs font-medium text-foreground">Obstetric Info</TableHead>
                    <TableHead className="text-xs font-medium text-foreground">AOG &amp; EDD</TableHead>
                    <TableHead className="text-xs font-medium text-foreground">Risk Status</TableHead>
                    <TableHead className="text-xs font-medium text-foreground">Barangay / Address</TableHead>
                    <TableHead className="text-xs font-medium text-foreground">Next Follow-up</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeletonRows columns={8} rows={6} />
                  ) : pagedRows.length > 0 ? pagedRows.map((row) => {
                    const { record, name, latestPregnancy, aog, edd, riskLabel, address } = row
                    const selected = selectedMotherIds.includes(record.mother_id)
                    const goToProfile = () => navigate(`/dashboard/maternal-records/${encodeURIComponent(record.mother_id)}`)
                    return <TableRow
                      key={record.mother_id}
                      role="link"
                      tabIndex={0}
                      aria-label={`Open ${name}'s maternal profile`}
                      onClick={goToProfile}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          goToProfile()
                        }
                      }}
                      className="cursor-pointer border-sidebar-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <TableCell className="w-12 pl-4 text-center" onClick={(event) => event.stopPropagation()}>
                        <Checkbox aria-label={`Select ${name}`} checked={selected} onCheckedChange={(checked) => setSelectedMotherIds((current) => checked === true ? [...current, record.mother_id] : current.filter((id) => id !== record.mother_id))} className="border-sidebar-border" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <MaternalAvatar
                            src={record.user?.profile_url || record.profile_url}
                            name={name}
                            className="size-7 text-[11px] border border-sidebar-border"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{name}</span>
                            {(record.sync_status === "pending_create" || record.mother_id.startsWith("temp-")) && (
                              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                Offline
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{latestPregnancy ? `G${latestPregnancy.gravida ?? "—"} P${latestPregnancy.parity ?? "—"}` : "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span>{aog}</span>
                          <span className="text-xs text-muted-foreground">{edd && isValid(edd) ? format(edd, "MMM d, yyyy") : "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{riskLabel === "Not assessed" ? <span className="text-muted-foreground">Not assessed</span> : <StatusBadge status={riskLabel} />}</TableCell>
                      <TableCell className="max-w-48 truncate" title={address}>{address}</TableCell>
                      <TableCell><span className="text-muted-foreground">Not scheduled</span></TableCell>
                      <TableCell className="w-12 px-1" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                        <TableRowActions label={`Actions for ${name}`}>
                          <DropdownMenuItem onSelect={goToProfile}>View Profile</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => { if (record.family_serial_no && navigator.clipboard?.writeText) void navigator.clipboard.writeText(record.family_serial_no).then(() => toast.success("Family serial number copied")) }}>Copy Family Serial No.</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setMotherToDelete(record)}>Delete Maternal Record</DropdownMenuItem>
                        </TableRowActions>
                      </TableCell>
                    </TableRow>
                  }) : (
                    <TableEmptyState
                      colSpan={8}
                      icon={UsersRound}
                      title={hasSearchOrFilter ? "No mothers match this view" : activeTab === "referred" ? "No referred mothers" : activeTab === "postpartum" ? "No postpartum records" : "No maternal records yet"}
                      description={hasSearchOrFilter ? "Try adjusting or clearing the search and filters." : "Maternal records for this view will appear here when available."}
                      action={hasSearchOrFilter || activeTab !== "all" ? <Button variant="outline" onClick={resetMotherView} className="h-8 px-2.5 text-xs">View All</Button> : <Button onClick={() => setIsRegistrationOpen(true)} className="h-8 gap-1.5 px-2.5 text-xs"><UserPlus className="size-3.5" />Create Maternal Record</Button>}
                    />
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <TablePaginationFooter
            rowCount={filteredRows.length}
            selectedCount={selectedMotherIds.filter((id) => filteredRows.some((row) => row.record.mother_id === id)).length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />
        </div>
      </div>
      <MaternalRegistrationModal open={isRegistrationOpen} onOpenChange={setIsRegistrationOpen} onSubmit={handleRegister} currentStaffId={session?.user.user_id} currentStaffLabel={`${session?.user.first_name ?? "Current"} ${session?.user.last_name ?? "staff"} (You - Default)`} />
      <ConnectMotherQrModal open={isQrModalOpen} onOpenChange={setIsQrModalOpen} onConnect={connectMother} />
      <ExportMaternalRecordsModal open={isExportOpen} onOpenChange={setIsExportOpen} exportCount={filteredRows.length} allCount={records.length} onExport={exportRegistry} />
      <ConfirmSensitiveActionDialog
        open={Boolean(motherToDelete)}
        onOpenChange={(open) => { if (!open && !isDeleting) setMotherToDelete(null) }}
        title={`Are you sure you want to delete “${motherToDelete?.user?.first_name ?? "this"} ${motherToDelete?.user?.last_name ?? "record"}”?`}
        description="This will deactivate the maternal record in this facility registry."
        confirmLabel="I understand, delete this maternal record"
        onConfirm={() => { void confirmDelete() }}
      />
    </div>
  )
}
