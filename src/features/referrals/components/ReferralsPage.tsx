import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeftRight,
  Copy,
  Download,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyStateContent, TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { TableSkeletonRows } from "@/components/ui/table-skeleton-rows"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmSensitiveActionDialog } from "@/components/ui/confirm-sensitive-action-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { TableRowActions } from "@/components/ui/table-row-actions"
import { InterClinicReferralDrawer, type ReferralDrawerRecord } from "./InterClinicReferralDrawer"
import { CreateReferralModal } from "./CreateReferralModal"
import { useAuthSession } from "@/features/auth/auth-session"
import { getMaternalRecords, normalizeMaternalRisk, type MaternalRecord } from "@/features/maternal-records/api"
import { createReferral, getReferralFacilities, getReferralGatewayLink, getReferrals, updateReferralStatus, type CreateReferralInput, type ReferralApiRecord, type ReferralFacility } from "../api"

type Referral = ReferralDrawerRecord

const riskOptions = ["Low Risk", "Moderate Risk", "High Risk", "Not assessed"] as const

function displayDate(value?: string | null, withTime = false) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", withTime
    ? { month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function reasonValue(reason: string, label: string) {
  const line = reason.split(/\r?\n/).find((item) => item.toLowerCase().startsWith(label.toLowerCase()))
  return line?.slice(label.length).replace(/^\s*:?\s*/, "").trim() || "Not recorded"
}

function mapReferral(record: ReferralApiRecord): Referral {
  const pregnancy = record.pregnancy
  const mother = pregnancy?.mother
  const user = mother?.user
  const visit = pregnancy?.prenatalVisits?.[0]
  const fullName = [user?.first_name, user?.middle_name, user?.last_name].filter(Boolean).join(" ") || "Unnamed patient"
  const birthDate = mother?.birth_date
  const age = mother?.age ?? (birthDate ? Math.max(0, new Date().getFullYear() - new Date(birthDate).getFullYear()) : null)
  const alertSeverity = pregnancy?.cdssAlerts?.[0]?.severity?.toLowerCase() ?? ""
  const rawRisk = normalizeMaternalRisk(visit?.risk_level_assessed ?? alertSeverity)
  const risk = rawRisk === "Not assessed" && (alertSeverity.includes("critical") || alertSeverity.includes("severe")) ? "High Risk" : rawRisk
  const rawStatus = (record.status || "pending").toLowerCase().replace(/[_-]/g, " ")
  const status = rawStatus === "accepted" ? "Accepted"
    : rawStatus === "in transit" ? "In Transit"
    : rawStatus === "admitted" ? "Admitted"
    : rawStatus === "completed" ? "Completed"
    : rawStatus === "cancelled" || rawStatus === "canceled" ? "Cancelled"
    : rawStatus === "rejected" || rawStatus === "referred" ? "Rejected"
    : "Pending"
  const reason = record.reason ?? ""
  const bpMatch = reason.match(/BP:\s*([^·\n]+)/i)
  const tempMatch = reason.match(/T:\s*([^·\n]+)/i)
  const pulseMatch = reason.match(/PR:\s*([^·\n]+)/i)
  const weightMatch = reason.match(/wt:\s*([^·\n]+)/i)
  const heightMatch = reason.match(/ht:\s*([^·\n]+)/i)
  const lmp = pregnancy?.lmp_date
  const aogWeeks = visit?.age_of_gestation_weeks
  const aog = aogWeeks == null ? "Not recorded" : `${aogWeeks} weeks`
  const tews = visit?.tews_score == null ? "Not recorded" : String(visit.tews_score)
  const origin = record.fromFacility?.facility_name || "Not recorded"
  const transferLink = getReferralGatewayLink(record.referral_id)
  return {
    id: record.referral_id,
    mother: fullName,
    initiatedAt: displayDate(record.date_referred, true),
    risk,
    status,
    transferLink,
    transferCode: record.shared_pin ?? "—",
    destination: record.toFacility?.facility_name || record.external_facility_name || "Not specified",
    lastUpdatedAt: displayDate(record.updated_at || record.date_responded || record.date_referred, true),
    source: record,
    clinical: {
      serial: mother?.family_serial_no || "Not recorded",
      age: age == null ? "Not recorded" : `${age} years`,
      birthday: displayDate(birthDate),
      bloodType: mother?.blood_type || "Not recorded",
      contact: user?.phone_number || "Not recorded",
      address: user?.address || "Not recorded",
      civilStatus: mother?.civil_status || "Not recorded",
      pregnancy: `G${pregnancy?.gravida ?? "—"} P${pregnancy?.parity ?? "—"}`,
      lmp: displayDate(lmp),
      edd: displayDate(pregnancy?.edd_date),
      aog,
      chiefComplaint: reasonValue(reason, "CC") !== "Not recorded" ? reasonValue(reason, "CC") : visit?.chief_complaint || "Not recorded",
      referralReason: reasonValue(reason, "Reason for referral"),
      requestedAction: reasonValue(reason, "Requested clinical action"),
      additionalNotes: reasonValue(reason, "Additional handover notes"),
      previousDelivery: reasonValue(reason, "Previous delivery"),
      comorbidities: reasonValue(reason, "Co-morbidities"),
      dangerSigns: visit?.danger_signs_observed || pregnancy?.cdssAlerts?.map((alert) => alert.alert_message).filter(Boolean).join(", ") || "None reported",
      tews,
      originFacility: origin,
      vitals: {
        temperature: tempMatch?.[1]?.trim() || (visit?.temperature_celsius != null ? `${visit.temperature_celsius} °C` : "Not recorded"),
        pulse: pulseMatch?.[1]?.trim() || (visit?.pulse_rate_bpm != null ? `${visit.pulse_rate_bpm} bpm` : "Not recorded"),
        bloodPressure: bpMatch?.[1]?.trim() || (visit?.bp_systolic != null ? `${visit.bp_systolic}/${visit.bp_diastolic ?? "—"} mmHg` : "Not recorded"),
        weight: weightMatch?.[1]?.trim() || (visit?.weight_kg != null ? `${visit.weight_kg} kg` : "Not recorded"),
        height: heightMatch?.[1]?.trim() || "Not recorded",
        bloodSugar: "Not recorded",
        respiratoryRate: "Not recorded",
        oxygenSaturation: "Not recorded",
      },
    },
  }
}

function toCsv(rows: Referral[]) {
  const fields = ["Mother Name", "Initiated At", "Risk Flag", "Status", "Transfer Record Link", "Transfer Code", "Destination Facility"]
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  return [fields, ...rows.map((row) => [row.mother, row.initiatedAt, row.risk, row.status, row.transferLink, row.transferCode, row.destination])]
    .map((row) => row.map(quote).join(",")).join("\r\n")
}

function copyToClipboard(value: string) {
  if (!value) return
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(value).then(() => toast.success("Copied to clipboard")).catch(() => toast.error("Unable to copy to clipboard"))
  }
}

function ReferralTabs({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const tabs = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "admitted", label: "Admitted" },
    { value: "referred", label: "Referred" },
  ]

  return (
    <Tabs value={value} onValueChange={onChange} className="w-max shrink-0">
      <TabsList className="h-9 w-max justify-start gap-1">
        {tabs.map(({ value: tabValue, label }) => (
          <TabsTrigger key={tabValue} value={tabValue} className="h-full flex-initial px-2 py-1 text-xs font-medium">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export function ReferralsPage() {
  const { session } = useAuthSession()
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [riskFilters, setRiskFilters] = useState<Referral["risk"][]>([])
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [activeReferral, setActiveReferral] = useState<Referral | null>(null)
  const [referralRows, setReferralRows] = useState<Referral[]>([])
  const [mothers, setMothers] = useState<MaternalRecord[]>([])
  const [facilities, setFacilities] = useState<ReferralFacility[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdatingReferral, setIsUpdatingReferral] = useState(false)
  const [referralToCancel, setReferralToCancel] = useState<Referral | null>(null)
  const [isReferralDrawerOpen, setIsReferralDrawerOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const openReferral = (referral: Referral) => {
    setActiveReferral(referral)
    setIsReferralDrawerOpen(true)
  }
  const closeDrawer = (open: boolean) => {
    setIsReferralDrawerOpen(open)
    if (open) return
    setActiveReferral(null)
  }
  const openCreateReferral = () => {
    setIsCreateModalOpen(true)
  }

  const loadReferralData = useCallback(async (refresh = false) => {
    if (!session?.token) return
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const [referralResponse, motherResponse, facilityResponse] = await Promise.all([
        getReferrals(session.token),
        getMaternalRecords(session.token),
        getReferralFacilities(),
      ])
      setReferralRows(Array.isArray(referralResponse.data) ? referralResponse.data.map(mapReferral) : [])
      setMothers(Array.isArray(motherResponse.result) ? motherResponse.result : [])
      setFacilities(Array.isArray(facilityResponse.result) ? facilityResponse.result : [])
      if (refresh) toast.success("Referrals refreshed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load referrals")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [session])

  useEffect(() => {
    if (!session?.token) return
    let active = true
    Promise.all([getReferrals(session.token), getMaternalRecords(session.token), getReferralFacilities()])
      .then(([referralResponse, motherResponse, facilityResponse]) => {
        if (!active) return
        setReferralRows(Array.isArray(referralResponse.data) ? referralResponse.data.map(mapReferral) : [])
        setMothers(Array.isArray(motherResponse.result) ? motherResponse.result : [])
        setFacilities(Array.isArray(facilityResponse.result) ? facilityResponse.result : [])
      })
      .catch((error: unknown) => { if (active) toast.error(error instanceof Error ? error.message : "Unable to load referrals") })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [session?.token])

  const handleCreateReferral = async (input: CreateReferralInput) => {
    if (!session?.token) throw new Error("Your session has expired. Please sign in again.")
    setIsCreating(true)
    try {
      await createReferral(session.token, input)
      toast.success("Referral created")
      setIsCreateModalOpen(false)
      await loadReferralData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create referral")
      throw error
    } finally {
      setIsCreating(false)
    }
  }

  const exportReferrals = () => {
    const blob = new Blob([`\ufeff${toCsv(filteredReferrals)}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "inter-clinic-referrals.csv"
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("Referral list exported")
  }

  const cancelReferral = async () => {
    if (!referralToCancel?.source || !session?.token) return
    try {
      await updateReferralStatus(session.token, referralToCancel.source, "cancelled")
      setReferralRows((current) => current.map((row) => row.id === referralToCancel.id ? { ...row, status: "Cancelled" } : row))
      toast.success("Transfer cancelled")
      setReferralToCancel(null)
      await loadReferralData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel transfer")
    }
  }

  const handleReferralStatusChange = async (status: string) => {
    if (!activeReferral?.source || !session?.token) return
    setIsUpdatingReferral(true)
    try {
      const response = await updateReferralStatus(session.token, activeReferral.source, status)
      const updatedRecord = response.data ? { ...activeReferral.source, ...response.data } : activeReferral.source
      const updatedReferral = mapReferral(updatedRecord)
      setReferralRows((current) => current.map((row) => row.id === updatedReferral.id ? updatedReferral : row))
      setActiveReferral(updatedReferral)
      toast.success("Referral status updated")
      await loadReferralData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update referral status")
    } finally {
      setIsUpdatingReferral(false)
    }
  }

  const filteredReferrals = referralRows.filter((referral) => {
    const matchesTab = activeTab === "all"
      || (activeTab === "pending" && referral.status === "Pending")
      || (activeTab === "admitted" && referral.status === "Admitted")
      || (activeTab === "referred" && ["Rejected", "Cancelled"].includes(referral.status))
    const searchText = `${referral.mother} ${referral.initiatedAt} ${referral.transferCode} ${referral.transferLink} ${referral.destination} ${referral.status}`.toLowerCase()
    const matchesSearch = !search.trim() || searchText.includes(search.trim().toLowerCase())
    const matchesRisk = riskFilters.length === 0 || riskFilters.includes(referral.risk)
    return matchesTab && matchesSearch && matchesRisk
  })

  const toggleRiskFilter = (risk: Referral["risk"]) => {
    setRiskFilters((current) => current.includes(risk) ? current.filter((item) => item !== risk) : [...current, risk])
  }
  const allVisibleSelected = filteredReferrals.length > 0 && filteredReferrals.every(({ id }) => selectedRows.includes(id))
  const toggleVisibleRows = () => setSelectedRows((current) => allVisibleSelected
    ? current.filter((id) => !filteredReferrals.some((referral) => referral.id === id))
    : [...new Set([...current, ...filteredReferrals.map(({ id }) => id)])])

  return (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-y-auto text-foreground">
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-background p-4 dark:bg-black">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <ReferralTabs value={activeTab} onChange={setActiveTab} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TooltipProvider delayDuration={500}>
              <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Export referrals" onClick={exportReferrals} className="size-8 border-sidebar-border"><Download className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Export referrals</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Refresh referrals" disabled={isRefreshing} onClick={() => void loadReferralData(true)} className="size-8 border-sidebar-border"><RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} /></Button></TooltipTrigger><TooltipContent>Refresh referrals</TooltipContent></Tooltip>
            </TooltipProvider>
            <Button type="button" onClick={openCreateReferral} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs font-medium"><PlusCircle className="size-3.5" />Create Referral</Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="relative min-w-[240px] max-w-md flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search referrals" placeholder="Search referrals..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 w-full bg-muted/70 pl-8 text-xs dark:bg-muted/60" />
          </div>
          <Popover>
            <PopoverTrigger asChild><Button variant="filter" size="filter"><PlusCircle className="size-3.5" />Risk Level</Button></PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-3">
              <div className="flex flex-col gap-3">
                {riskOptions.map((risk) => <label key={risk} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={riskFilters.includes(risk)} onCheckedChange={() => toggleRiskFilter(risk)} /><span>{risk}</span></label>)}
              </div>
            </PopoverContent>
          </Popover>
          {(search.trim().length > 0 || riskFilters.length > 0) && <Button variant="ghost" onClick={() => { setSearch(""); setRiskFilters([]) }} className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground"><RotateCcw className="size-3.5" />Reset Filter</Button>}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 pb-6 md:pt-0">
        <div className="hidden overflow-hidden rounded-md border border-sidebar-border bg-background dark:bg-black xl:block">
            <Table className="w-full table-fixed">
              <colgroup>
                <col className="w-[4.5%]" /><col className="w-[14%]" /><col className="w-[17%]" />
                <col className="w-[10%]" /><col className="w-[11%]" /><col className="w-[16%]" />
                <col className="w-[11%]" /><col className="w-[13%]" /><col className="w-[3.5%]" />
              </colgroup>
              <TableHeader className="bg-card dark:bg-[#111]">
                <TableRow className="border-sidebar-border hover:bg-transparent">
                  <TableHead className="w-12 pl-4 text-center"><Checkbox aria-label="Select all referrals" checked={allVisibleSelected} onCheckedChange={toggleVisibleRows} className="border-sidebar-border" /></TableHead>
                  <TableHead className="whitespace-normal break-words px-1.5 text-xs font-medium leading-tight text-foreground">Mother Name</TableHead>
                  <TableHead className="whitespace-normal break-words px-1.5 text-xs font-medium leading-tight text-foreground">Initiated At</TableHead>
                  <TableHead className="whitespace-normal break-words px-1.5 text-xs font-medium leading-tight text-foreground">Risk Flag</TableHead>
                  <TableHead className="whitespace-normal break-words px-1.5 text-xs font-medium leading-tight text-foreground">Status</TableHead>
                  <TableHead className="whitespace-normal break-words px-1.5 text-xs font-medium leading-tight text-foreground">Transfer Record Link</TableHead>
                  <TableHead className="whitespace-normal break-words px-1.5 text-xs font-medium leading-tight text-foreground">Transfer Code</TableHead>
                  <TableHead className="whitespace-normal break-words px-1.5 text-xs font-medium leading-tight text-foreground">Destination Facility</TableHead>
                  <TableHead aria-label="Actions" className="px-0.5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableSkeletonRows columns={9} rows={6} /> : filteredReferrals.map((referral) => (
                  <TableRow key={referral.id} onClick={() => openReferral(referral)} className="cursor-pointer border-sidebar-border">
                    <TableCell className="w-12 pl-4 text-center" onClick={(event) => event.stopPropagation()}><Checkbox aria-label={`Select ${referral.mother} referral`} checked={selectedRows.includes(referral.id)} onCheckedChange={() => setSelectedRows((current) => current.includes(referral.id) ? current.filter((id) => id !== referral.id) : [...current, referral.id])} className="border-sidebar-border" /></TableCell>
                    <TableCell className="truncate px-1.5 text-xs font-medium" title={referral.mother}>{referral.mother}</TableCell>
                    <TableCell className="whitespace-normal break-words px-1.5 text-xs leading-tight">{referral.initiatedAt}</TableCell>
                    <TableCell className="px-1.5"><StatusBadge status={referral.risk} className="px-1.5" /></TableCell>
                    <TableCell className="px-1.5"><StatusBadge status={referral.status} className="px-1.5" /></TableCell>
                    <TableCell className="px-1.5">
                      <div className="group flex min-w-0 items-center gap-0.5">
                        <a href={getReferralGatewayLink(referral.id)} target="_blank" rel="noreferrer" title={getReferralGatewayLink(referral.id)} className="min-w-0 truncate text-xs underline decoration-muted-foreground/50 underline-offset-2 hover:text-primary">{getReferralGatewayLink(referral.id).replace(/^https?:\/\//, "")}</a>
                        <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Copy transfer link" onClick={() => copyToClipboard(getReferralGatewayLink(referral.id))} className="size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"><Copy className="size-3" /></Button></TooltipTrigger><TooltipContent>Copy transfer link</TooltipContent></Tooltip></TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell className="px-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="rounded-sm border border-sidebar-border bg-muted px-1.5 py-0.5 text-xs font-mono dark:bg-[#222]">{referral.transferCode}</span>
                        <TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Copy transfer code" onClick={() => copyToClipboard(referral.transferCode)} className="size-6 shrink-0 text-muted-foreground"><Copy className="size-3" /></Button></TooltipTrigger><TooltipContent>Copy transfer code</TooltipContent></Tooltip></TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell className="truncate px-1.5 text-xs" title={referral.destination}>{referral.destination}</TableCell>
                    <TableCell className="px-0.5" onClick={(event) => event.stopPropagation()}>
                      <TableRowActions label={`Actions for ${referral.mother}`}>
                        <DropdownMenuItem onSelect={() => openReferral(referral)}>View Referral Details</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openReferral(referral)}>Manage Transfer</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => copyToClipboard(getReferralGatewayLink(referral.id))}>Copy Transfer Link</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => copyToClipboard(referral.transferCode)}>Copy Transfer Code</DropdownMenuItem>
                        {referral.source?.from_facility_id === session?.user.facility_id && !["Completed", "Cancelled", "Rejected"].includes(referral.status) && <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setReferralToCancel(referral)}>Cancel Transfer</DropdownMenuItem>
                        </>}
                      </TableRowActions>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredReferrals.length === 0 && (
                  <TableEmptyState
                    colSpan={9}
                    icon={ArrowLeftRight}
                    title="No referrals found"
                    description="Inter-clinic transfers matching this view will appear here."
                    action={<Button onClick={openCreateReferral} className="h-8 gap-1.5 px-2.5 text-xs"><PlusCircle className="size-3.5" />Create Referral</Button>}
                  />
                )}
              </TableBody>
            </Table>
        </div>

        <div className="flex flex-col gap-2 xl:hidden">
          {isLoading ? Array.from({ length: 4 }, (_, index) => <article key={`referral-skeleton-${index}`} className="flex flex-col gap-3 rounded-md border border-sidebar-border p-3" aria-hidden="true"><div className="flex justify-between gap-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-24" /></div><div className="flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-20" /></div><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3.5 w-1/2" /></article>) : filteredReferrals.map((referral) => (
            <article key={referral.id} onClick={() => openReferral(referral)} className="flex min-w-0 cursor-pointer flex-col gap-3 rounded-md border border-sidebar-border bg-background p-3 dark:bg-black">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <Checkbox aria-label={`Select ${referral.mother} referral`} checked={selectedRows.includes(referral.id)} onClick={(event) => event.stopPropagation()} onCheckedChange={() => setSelectedRows((current) => current.includes(referral.id) ? current.filter((id) => id !== referral.id) : [...current, referral.id])} />
                  <div className="min-w-0"><p className="truncate text-xs font-medium">{referral.mother}</p><p className="mt-1 text-xs text-muted-foreground">{referral.initiatedAt}</p></div>
                </div>
                <TableRowActions label={`Actions for ${referral.mother}`} className="-mt-1" >
                  <DropdownMenuItem onSelect={() => openReferral(referral)}>View Referral Details</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => openReferral(referral)}>Manage Transfer</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => copyToClipboard(getReferralGatewayLink(referral.id))}>Copy Transfer Link</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => copyToClipboard(referral.transferCode)}>Copy Transfer Code</DropdownMenuItem>
                  {referral.source?.from_facility_id === session?.user.facility_id && !["Completed", "Cancelled", "Rejected"].includes(referral.status) && <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setReferralToCancel(referral)}>Cancel Transfer</DropdownMenuItem>
                  </>}
                </TableRowActions>
              </div>
              <div className="flex flex-wrap items-center gap-1.5"><StatusBadge status={referral.risk} /><StatusBadge status={referral.status} /></div>
              <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-xs">
                <span className="text-muted-foreground">Transfer link</span>
                <div className="flex min-w-0 items-center gap-1"><a href={getReferralGatewayLink(referral.id)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="truncate underline decoration-muted-foreground/50 underline-offset-2">{getReferralGatewayLink(referral.id).replace(/^https?:\/\//, "")}</a><TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Copy transfer link" onClick={(event) => { event.stopPropagation(); copyToClipboard(getReferralGatewayLink(referral.id)) }} className="size-6 shrink-0"><Copy className="size-3" /></Button></TooltipTrigger><TooltipContent>Copy transfer link</TooltipContent></Tooltip></TooltipProvider></div>
                <span className="text-muted-foreground">Transfer code</span>
                <div className="flex items-center gap-1"><span className="rounded-sm border border-sidebar-border bg-muted px-1.5 py-0.5 font-mono text-xs dark:bg-[#222]">{referral.transferCode}</span><TooltipProvider delayDuration={500}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Copy transfer code" onClick={(event) => { event.stopPropagation(); copyToClipboard(referral.transferCode) }} className="size-6"><Copy className="size-3" /></Button></TooltipTrigger><TooltipContent>Copy transfer code</TooltipContent></Tooltip></TooltipProvider></div>
                <span className="text-muted-foreground">Destination</span><span className="truncate">{referral.destination}</span>
              </div>
            </article>
          ))}
          {!isLoading && filteredReferrals.length === 0 && (
            <div className="rounded-md border border-sidebar-border bg-card dark:bg-[#111]">
              <EmptyStateContent
                icon={ArrowLeftRight}
                title="No referrals found"
                description="Inter-clinic transfers matching this view will appear here."
                action={<Button onClick={openCreateReferral} className="h-8 gap-1.5 px-2.5 text-xs"><PlusCircle className="size-3.5" />Create Referral</Button>}
              />
            </div>
          )}
        </div>

        <TablePaginationFooter rowCount={filteredReferrals.length} selectedCount={selectedRows.length} />

      </div>

      <InterClinicReferralDrawer
        key={activeReferral?.id ?? "closed"}
        open={isReferralDrawerOpen}
        onOpenChange={closeDrawer}
        referral={activeReferral}
        currentFacilityId={session?.user.facility_id}
        isUpdating={isUpdatingReferral}
        onStatusChange={handleReferralStatusChange}
        onCancelTransfer={() => { if (activeReferral) setReferralToCancel(activeReferral) }}
      />
      <CreateReferralModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        mothers={mothers}
        facilities={facilities}
        originFacilityId={session?.user.facility_id}
        isSaving={isCreating}
        onSubmit={handleCreateReferral}
      />
      <ConfirmSensitiveActionDialog
        open={referralToCancel !== null}
        onOpenChange={(open) => { if (!open) setReferralToCancel(null) }}
        title={`Are you sure you want to cancel the transfer for “${referralToCancel?.mother ?? "this mother"}”?`}
        description="The receiving facility will no longer be able to continue this transfer."
        confirmLabel="I understand, cancel this transfer"
        onConfirm={cancelReferral}
      />
    </div>
  )
}
