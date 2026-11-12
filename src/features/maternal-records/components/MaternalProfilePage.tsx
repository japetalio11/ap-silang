import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Baby,
  CalendarDays,
  CalendarPlus,
  Camera,
  Download,
  FileText,
  HeartPulse,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Upload,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableEmptyState } from "@/components/ui/table-empty-state"
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer"
import { ConfirmSensitiveActionDialog } from "@/components/ui/confirm-sensitive-action-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { TableRowActions } from "@/components/ui/table-row-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useAuthSession } from "@/features/auth/auth-session"
import { verifyCurrentUserPassword } from "@/features/auth/password-verification"
import { db } from "@/lib/db/silangDatabase"
import { CreateAppointmentModal, type AppointmentMotherOption } from "@/features/calendar/components/CreateAppointmentModal"
import type { AppointmentFormValues } from "@/features/calendar/components/CreateAppointmentModal"
import { createAppointment } from "@/features/calendar/api"
import type { AppEvent } from "@/features/calendar/components/types"
import { CreateReferralModal } from "@/features/referrals/components/CreateReferralModal"
import { createReferral, getReferralFacilities, type CreateReferralInput, type ReferralFacility } from "@/features/referrals/api"
import {
  assignMaternalStaff,
  cancelMaternalAppointment,
  deleteMaternalLabScreening,
  getLatestMaternalPregnancy,
  getLatestPrenatalVisit,
  getMaternalProfile,
  getMaternalStaff,
  normalizeMaternalRisk,
  overrideMaternalRisk,
  registerMaternalLabScreening,
  registerDeliveryOutcome,
  registerPrenatalVisit,
  registerPregnancy,
  uploadMaternalLabFile,
  updateMaternalRecord,
  type MaternalCompositeRecord,
  type MaternalDelivery,
  type MaternalLabRecord,
  type MaternalPregnancy,
  type MaternalPrenatalVisit,
  type MaternalStaff,
  type RegisterDeliveryOutcomeInput,
} from "../api"
import { AppointmentDetailsDialog } from "./AppointmentDetailsDialog"
import { DeliveryDetailsDrawer } from "./DeliveryDetailsDrawer"
import { DeliveryOutcomeDialog } from "./DeliveryOutcomeDialog"
import { CreatePrescriptionDialog } from "./CreatePrescriptionDialog"
import { ChangeStaffDialog, ConfirmRiskOverridePasswordDialog, EhrExportDialog, LaboratoryRecordDialog, PrenatalVitalsDialog, RiskOverrideDialog, type EncounterValues, type LaboratoryFormValues } from "./MaternalProfileActionModals"
import { EditMaternalProfileDialog, NewPregnancyDialog, type RegistrationValues } from "./MaternalRegistrationModal"
import { MaternalAvatar } from "./MaternalAvatar"
import { UploadAvatarDialog } from "./UploadAvatarDialog"
import { VitalDetailsDrawer } from "./VitalDetailsDrawer"

const riskStyles = {
  "Low Risk": {
    card: "border-emerald-500/45 bg-emerald-50/85 dark:bg-emerald-950/35",
    label: "text-emerald-900/70 dark:text-emerald-200/75",
    value: "text-emerald-950 dark:text-emerald-50",
    icon: "bg-emerald-700 text-white",
    panel: "bg-gradient-to-r from-emerald-200 via-emerald-100 to-emerald-50/40 dark:from-emerald-900/80 dark:via-emerald-950/65 dark:to-transparent",
  },
  "Moderate Risk": {
    card: "border-amber-500/45 bg-amber-50/85 dark:bg-amber-950/35",
    label: "text-amber-950/70 dark:text-amber-200/75",
    value: "text-amber-950 dark:text-amber-50",
    icon: "bg-amber-600 text-white",
    panel: "bg-gradient-to-r from-amber-200 via-amber-100 to-amber-50/40 dark:from-amber-900/80 dark:via-amber-950/65 dark:to-transparent",
  },
  "High Risk": {
    card: "border-rose-500/50 bg-rose-50/85 dark:bg-rose-950/35",
    label: "text-rose-950/70 dark:text-rose-200/75",
    value: "text-rose-950 dark:text-rose-50",
    icon: "bg-rose-700 text-white",
    panel: "bg-gradient-to-r from-rose-200 via-rose-100 to-rose-50/40 dark:from-rose-900/80 dark:via-rose-950/65 dark:to-transparent",
  },
  "Not assessed": {
    card: "border-sidebar-border bg-card",
    label: "text-muted-foreground",
    value: "text-foreground",
    icon: "bg-muted text-muted-foreground",
    panel: "bg-muted/60",
  },
}

function formatRecordDate(value?: string | null) {
  return value ? format(new Date(value), "MMM d, yyyy") : "—"
}

function formatStatusLabel(value?: string | null) {
  return (value || "Scheduled")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function classifyBp(systolic?: number | null, diastolic?: number | null) {
  if (systolic == null || diastolic == null) return { label: "Not recorded", className: "text-muted-foreground" }
  if (systolic >= 140 || diastolic >= 90) return { label: "Hypertensive", className: "text-rose-600 dark:text-rose-400 font-semibold" }
  if (systolic >= 120 && diastolic < 80) return { label: "Elevated", className: "text-amber-600 dark:text-amber-400" }
  return { label: "Normal", className: "text-emerald-600 dark:text-emerald-400" }
}

function getAttachmentName(fileUrl?: string | null, fallback = "EHR record") {
  if (!fileUrl) return fallback
  if (fileUrl.startsWith("blob-")) return fallback
  try {
    const pathname = new URL(fileUrl, window.location.origin).pathname
    const name = decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "")
    if (!name || name.startsWith("blob-")) return fallback
    return name
  } catch {
    return fallback
  }
}

function resolveAttachmentUrl(fileUrl?: string | null) {
  if (!fileUrl) return ""
  try {
    return new URL(fileUrl, window.location.origin).href
  } catch {
    return fileUrl
  }
}

function EhrRecordPreview({ record, onClose }: { record: MaternalLabRecord | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(100)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [blobInfo, setBlobInfo] = useState<{ mimeType?: string; filename?: string } | null>(null)
  const fileUrl = record?.file_url

  useEffect(() => {
    let active = true
    let createdUrl: string | null = null

    if (fileUrl && fileUrl.startsWith("blob-")) {
      db.blobs.get(fileUrl).then((localBlob) => {
        if (!active || !localBlob) return
        createdUrl = URL.createObjectURL(localBlob.data)
        setBlobUrl(createdUrl)
        setBlobInfo({ mimeType: localBlob.mime_type, filename: localBlob.filename })
      }).catch(() => {})
    } else {
      setBlobUrl(null)
      setBlobInfo(null)
    }

    return () => {
      active = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [fileUrl])

  useEffect(() => {
    if (!record) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [record, onClose])

  if (!record || !fileUrl) return null

  const rawFileName = blobInfo?.filename || (record as any)?.file_name || getAttachmentName(fileUrl, record?.screening_type || "EHR record")
  const fileName = rawFileName.startsWith("blob-") ? (record?.screening_type || "EHR Record") : rawFileName
  const mime = blobInfo?.mimeType?.toLowerCase() || ""
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""
  const isImage = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(extension)
  const isPdf = mime.includes("pdf") || extension === "pdf"
  const previewUrl = blobUrl || resolveAttachmentUrl(fileUrl)

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 text-foreground" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Preview ${fileName}`} className="fixed inset-0" onClick={(event) => event.stopPropagation()}>
        <header className="fixed inset-x-0 top-0 z-[101] flex h-14 items-center justify-between gap-3 border-b border-sidebar-border bg-background px-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{fileName}</div>
            <div className="truncate text-xs text-muted-foreground">{record.screening_type || "EHR Record"}{record.date_of_screening ? ` · ${formatRecordDate(record.date_of_screening)}` : ""}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-sidebar-border p-0.5">
              <Button variant="ghost" size="icon" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 50} onClick={() => setZoom((value) => Math.max(50, value - 25))} className="size-7"><ZoomOut className="size-4" /></Button>
              <button type="button" onClick={() => setZoom(100)} className="min-w-12 px-1 text-center text-xs tabular-nums text-muted-foreground" aria-label="Reset zoom">{zoom}%</button>
              <Button variant="ghost" size="icon" aria-label="Zoom in" title="Zoom in" disabled={zoom >= 200} onClick={() => setZoom((value) => Math.min(200, value + 25))} className="size-7"><ZoomIn className="size-4" /></Button>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs">
              <a href={previewUrl} download={fileName}><Download className="size-3.5" /><span className="hidden sm:inline">Download</span></a>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Close preview" title="Close" onClick={onClose} className="size-8 text-muted-foreground"><X className="size-4" /></Button>
          </div>
        </header>
        <main className="fixed inset-x-0 bottom-0 top-14 flex items-center justify-center overflow-auto bg-muted/35 p-3 sm:p-6">
          {isImage && previewUrl ? <img src={previewUrl} alt={fileName} className="max-h-full max-w-full object-contain transition-transform duration-150" style={{ transform: `scale(${zoom / 100})` }} />
            : isPdf && previewUrl ? <iframe src={previewUrl} title={fileName} className="h-full min-h-0 w-full border-0 bg-background transition-transform duration-150" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }} />
              : <div className="flex flex-col items-center gap-3 text-center">
                <FileText className="size-10 text-muted-foreground" />
                <p className="text-sm font-medium">Preview isn’t available for this file</p>
                {previewUrl && <Button asChild className="h-8 gap-1.5 px-3 text-xs"><a href={previewUrl} download={fileName}><Download className="size-3.5" />Download file</a></Button>}
              </div>}
        </main>
      </div>
    </div>
  )
}

function escapeHtml(value: unknown) {
  return String(value ?? "—").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character)
}

function ProfileTable({ headers, rows, emptyState, renderRowAction, onRowClick }: { headers: string[]; rows: ReactNode[][]; emptyState: { icon: LucideIcon; title: string; description: string }; renderRowAction?: (rowIndex: number) => ReactNode; onRowClick?: (rowIndex: number) => void }) {
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const allRowsSelected = rows.length > 0 && rows.every((_, index) => selectedRows.includes(index))
  const toggleAllRows = (checked: boolean | "indeterminate") => setSelectedRows(checked === true ? rows.map((_, index) => index) : [])

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="w-full overflow-hidden rounded-md border border-sidebar-border">
      <Table className="w-full table-fixed text-xs">
        <TableHeader className="bg-muted/50 dark:bg-muted/30">
          <TableRow className="border-sidebar-border hover:bg-transparent">
            <TableHead className="w-12 pl-4 text-center">
              <Checkbox aria-label="Select all rows" checked={allRowsSelected} onCheckedChange={toggleAllRows} className="border-sidebar-border" />
            </TableHead>
            {headers.map((header) => <TableHead key={header} className="whitespace-normal break-words px-2 text-xs font-medium leading-tight">{header}</TableHead>)}
            <TableHead aria-label="Actions" className="w-12 px-1 text-xs" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} onClick={() => onRowClick?.(rowIndex)} onKeyDown={(event) => { if (event.target === event.currentTarget && onRowClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRowClick(rowIndex) } }} tabIndex={onRowClick ? 0 : undefined} className={`border-sidebar-border ${onRowClick ? "cursor-pointer hover:bg-muted/40" : ""}`}>
              <TableCell className="w-12 pl-4 text-center" onClick={(event) => event.stopPropagation()}>
                <Checkbox aria-label={`Select row ${rowIndex + 1}`} checked={selectedRows.includes(rowIndex)} onCheckedChange={(checked) => setSelectedRows((current) => checked === true ? [...current, rowIndex] : current.filter((index) => index !== rowIndex))} className="border-sidebar-border" />
              </TableCell>
              {row.map((cell, cellIndex) => <TableCell key={cellIndex} className="whitespace-normal break-words px-2">{cell}</TableCell>)}
              <TableCell className="w-12 px-1" onClick={(event) => event.stopPropagation()}>
                {renderRowAction?.(rowIndex)}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && <TableEmptyState colSpan={headers.length + 2} {...emptyState} />}
        </TableBody>
      </Table>
      </div>
      <TablePaginationFooter rowCount={rows.length} selectedCount={selectedRows.length} />
    </div>
  )
}

function ToolbarSearch({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative min-w-[320px] max-w-md flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input aria-label={placeholder} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-full bg-muted/70 pl-8 text-xs dark:bg-muted/60" />
    </div>
  )
}

function ToolbarFilter({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (selected: string[]) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="filter" size="filter">
          <PlusCircle className="size-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <div className="flex flex-col gap-3">
          {options.map((option) => {
            const id = `${label}-${option}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
            return (
              <label key={option} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox
                  id={id}
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) => onChange(checked === true ? [...selected, option] : selected.filter((value) => value !== option))}
                  className="size-3.5 rounded-[4px] border-sidebar-border"
                />
                <span>{option}</span>
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CardDetail({ label, value, labelClassName = "", valueClassName = "" }: { label: string; value: string; labelClassName?: string; valueClassName?: string }) {
  return (
    <div className="min-w-0">
      <div className={`text-xs text-muted-foreground ${labelClassName}`}>{label}</div>
      <div className={`truncate text-xs font-medium text-foreground ${valueClassName}`} title={value}>{value}</div>
    </div>
  )
}

function rowText(row: ReactNode[]) {
  return row.filter((cell): cell is string => typeof cell === "string").join(" ").toLowerCase()
}

function ResetFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick} className="h-8 shrink-0 gap-2 px-2 text-xs font-medium text-muted-foreground">
      <RotateCcw className="size-3.5" />
      Reset Filter
    </Button>
  )
}

export function MaternalProfilePage() {
  const navigate = useNavigate()
  const { motherId } = useParams()
  const { session } = useAuthSession()
  const [maternalRecord, setMaternalRecord] = useState<MaternalCompositeRecord | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [profileRevision, setProfileRevision] = useState(0)
  const [staffOptions, setStaffOptions] = useState<MaternalStaff[]>([])
  const [isStaffLoading, setIsStaffLoading] = useState(false)
  const [referralFacilities, setReferralFacilities] = useState<ReferralFacility[]>([])
  const [isCreatingReferral, setIsCreatingReferral] = useState(false)
  const [appointmentRowsState, setAppointmentRowsState] = useState<ReactNode[][]>([])
  const [deliveryEntries, setDeliveryEntries] = useState<Array<{ delivery: MaternalDelivery; pregnancy: MaternalPregnancy }>>([])
  const [pregnancyRowsState, setPregnancyRowsState] = useState<ReactNode[][]>([])
  const [laboratoryRowsState, setLaboratoryRowsState] = useState<string[][]>([])
  const [previewEhrRecord, setPreviewEhrRecord] = useState<MaternalLabRecord | null>(null)
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null)
  const [labFileToDelete, setLabFileToDelete] = useState<string | null>(null)
  const [historyTab, setHistoryTab] = useState("appointments")
  const [deliverySearch, setDeliverySearch] = useState("")
  const [deliveryFilters, setDeliveryFilters] = useState<string[]>([])
  const [appointmentSearch, setAppointmentSearch] = useState("")
  const [appointmentStatusFilters, setAppointmentStatusFilters] = useState<string[]>([])
  const [appointmentTypeFilters, setAppointmentTypeFilters] = useState<string[]>([])
  const [selectedVitalVisit, setSelectedVitalVisit] = useState<{ visit: MaternalPrenatalVisit; pregnancy?: MaternalPregnancy } | null>(null)
  const [isVitalDrawerOpen, setIsVitalDrawerOpen] = useState(false)
  const [vitalSearch, setVitalSearch] = useState("")
  const [vitalTrimesterFilters, setVitalTrimesterFilters] = useState<string[]>([])
  const [vitalRiskFilters, setVitalRiskFilters] = useState<string[]>([])
  const [vitalSignsFilters, setVitalSignsFilters] = useState<string[]>([])
  const [pregnancySearch, setPregnancySearch] = useState("")
  const [pregnancyStatusFilters, setPregnancyStatusFilters] = useState<string[]>([])
  const [laboratorySearch, setLaboratorySearch] = useState("")
  const [selectedLabRows, setSelectedLabRows] = useState<number[]>([])
  const [isRiskOverrideOpen, setIsRiskOverrideOpen] = useState(false)
  const [isRiskPasswordOpen, setIsRiskPasswordOpen] = useState(false)
  const [pendingRiskOverride, setPendingRiskOverride] = useState<{ riskLevel: string; reason: string } | null>(null)
  const [isEhrExportOpen, setIsEhrExportOpen] = useState(false)
  const [isVitalsOpen, setIsVitalsOpen] = useState(false)
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false)
  const [isDeliveryDrawerOpen, setIsDeliveryDrawerOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<{ delivery: MaternalDelivery; pregnancy: MaternalPregnancy } | null>(null)
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] = useState(false)
  const [isScheduleAppointmentOpen, setIsScheduleAppointmentOpen] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false)
  const [isLabRecordOpen, setIsLabRecordOpen] = useState(false)
  const [isNewPregnancyOpen, setIsNewPregnancyOpen] = useState(false)
  const [isChangeStaffOpen, setIsChangeStaffOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [isUploadAvatarOpen, setIsUploadAvatarOpen] = useState(false)
  const [isReferralOpen, setIsReferralOpen] = useState(false)
  useEffect(() => {
    if (!session?.token || !motherId) return
    let active = true
    getMaternalProfile(session.token, motherId)
      .then(({ result }) => {
        if (!active) return
        setMaternalRecord(result)
        setAppointmentRowsState((result.appointments ?? []).map((appointment) => [
          `${formatRecordDate(appointment.appointment_date)} · ${appointment.appointment_time || "Time not set"}`,
          appointment.appointment_type || "Appointment",
          appointment.reason || "—",
          <StatusBadge key={appointment.appointment_id} status={appointment.status || "Scheduled"} label={formatStatusLabel(appointment.status)} />,
        ]))
        const pregnancies = result.pregnancies ?? []
        setPregnancyRowsState(pregnancies.map((pregnancy) => {
          const lmp = pregnancy.lmp_date ? new Date(pregnancy.lmp_date) : null
          const days = lmp && !Number.isNaN(lmp.getTime()) ? Math.max(0, Math.floor((Date.now() - lmp.getTime()) / 86_400_000)) : null
          const aog = days === null ? "—" : `${Math.floor(days / 7)}w ${days % 7}d`
          return [`G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"}`, formatRecordDate(pregnancy.lmp_date), formatRecordDate(pregnancy.edd_date), aog, <StatusBadge key={pregnancy.pregnancy_id} status={pregnancy.pregnancy_status || "Active"} />]
        }))
        setDeliveryEntries(pregnancies.flatMap((pregnancy) => (pregnancy.deliveryOutcomes ?? []).map((delivery) => ({ delivery, pregnancy }))))
        setLaboratoryRowsState((result.labRecords ?? []).map((lab) => [
          getAttachmentName(lab.file_url, lab.screening_type || "EHR record"),
          "",
          lab.screening_type || "Laboratory screening",
          formatRecordDate(lab.date_of_screening),
          lab.result || "",
          "—",
          lab.screening_id,
        ]))
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : "Unable to load this maternal profile")
      })
      .finally(() => { if (active) setIsProfileLoading(false) })
    return () => { active = false }
  }, [session?.token, motherId, profileRevision])

  useEffect(() => {
    if (!isChangeStaffOpen || !session?.token) return
    setIsStaffLoading(true)
    getMaternalStaff(session.token)
      .then(({ result }) => setStaffOptions(result.filter((staff) => staff.is_active !== false)))
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to load facility staff"))
      .finally(() => setIsStaffLoading(false))
  }, [isChangeStaffOpen, session?.token])

  useEffect(() => {
    if (!isReferralOpen) return
    getReferralFacilities()
      .then(({ result }) => setReferralFacilities(Array.isArray(result) ? result : []))
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to load receiving facilities"))
  }, [isReferralOpen])

  const refreshProfile = () => setProfileRevision((revision) => revision + 1)

  const handleEditProfile = async (values: RegistrationValues) => {
    if (!session?.token || !motherId) throw new Error("Your session has expired. Sign in again.")
    if (!maternalRecord) throw new Error("Maternal profile is still loading. Try again.")
    const changes = {
      first_name: values.firstName.trim(),
      middle_name: values.middleName.trim(),
      last_name: values.lastName.trim(),
      birth_date: values.dateOfBirth,
      phone_number: values.contactNumber.trim(),
      email: values.email.trim(),
      address: values.address.trim(),
      family_serial_no: values.familySerialNo.trim(),
      civilStatus: values.civilStatus,
      bloodType: values.bloodType,
      civil_status: values.civilStatus,
      blood_type: values.bloodType,
      profile_url: values.profileUrl,
      photo_url: values.profileUrl,
    }
    const motherName = [changes.first_name, changes.middle_name, changes.last_name].filter(Boolean).join(" ")
    const result = await updateMaternalRecord(session.token, motherId, changes, { baseRecord: maternalRecord, motherName })
    if (result.queued) {
      setMaternalRecord((current) => current ? {
        ...current,
        birth_date: changes.birth_date,
        family_serial_no: changes.family_serial_no,
        civil_status: changes.civil_status,
        blood_type: changes.blood_type,
        profile_url: changes.profile_url || current.profile_url,
        photo_url: changes.photo_url || current.photo_url,
        user: {
          ...current.user,
          first_name: changes.first_name,
          middle_name: changes.middle_name,
          last_name: changes.last_name,
          phone_number: changes.phone_number,
          email: changes.email,
          address: changes.address,
          profile_url: changes.profile_url || current.user?.profile_url,
          photo_url: changes.photo_url || current.user?.photo_url,
        },
      } : current)
      setIsEditProfileOpen(false)
      toast.info("Profile changes saved on this device", { description: "They will sync when the connection returns." })
      return
    }
    if (changes.profile_url) {
      setMaternalRecord((current) => current ? {
        ...current,
        profile_url: changes.profile_url || current.profile_url,
        photo_url: changes.photo_url || current.photo_url,
        user: {
          ...current.user,
          profile_url: changes.profile_url || current.user?.profile_url,
          photo_url: changes.photo_url || current.user?.photo_url,
        },
      } : current)
    }
    toast.success("Maternal profile updated")
    refreshProfile()
  }

  const handleAssignStaff = async (staffId: string) => {
    if (!session?.token || !motherId) throw new Error("Your session has expired. Sign in again.")
    await assignMaternalStaff(session.token, motherId, staffId)
    toast.success("Assigned care provider updated")
    refreshProfile()
  }

  const handleCreateReferral = async (input: CreateReferralInput) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again.")
    setIsCreatingReferral(true)
    try {
      await createReferral(session.token, input)
      toast.success("Referral initiated")
      setIsReferralOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to initiate referral")
      throw error
    } finally {
      setIsCreatingReferral(false)
    }
  }

  const handleRiskOverride = async (riskLevel: string, reason: string) => {
    if (!session?.token || !motherId) throw new Error("Your session has expired. Sign in again.")
    await overrideMaternalRisk(session.token, latestVisit?.visit_id, {
      risk_level: riskLevel,
      override_reason: reason,
      pregnancy_id: currentPregnancy?.pregnancy_id,
      mother_id: maternalRecord?.mother_id ?? motherId,
    })
    toast.success("Clinical risk level updated")
    refreshProfile()
  }

  const prepareRiskOverride = async (riskLevel: string, reason: string) => {
    setPendingRiskOverride({ riskLevel, reason })
    setIsRiskPasswordOpen(true)
  }

  const confirmRiskOverride = async (password: string) => {
    if (!session?.token || !session.user.user_id || !pendingRiskOverride) throw new Error("Risk override details are missing. Please start again.")
    await verifyCurrentUserPassword(session.token, session.user.user_id, password)
    await handleRiskOverride(pendingRiskOverride.riskLevel, pendingRiskOverride.reason)
    setPendingRiskOverride(null)
  }

  const handleCreatePregnancy = async (values: RegistrationValues) => {
    if (!session?.token || !maternalRecord) throw new Error("Your session has expired. Sign in again.")
    await registerPregnancy(session.token, {
      motherId: maternalRecord.mother_id,
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
      co_morbidities: values.otherComorbidities,
      previous_delivery_history: values.deliveryHistoryNotes,
    })
    toast.success("Pregnancy record created")
    refreshProfile()
  }

  const handleSaveEncounter = async (values: EncounterValues) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again.")
    const dangerSigns = [
      values.vaginalBleeding && "Vaginal bleeding",
      values.fever && "Maternal fever",
      values.edema && "Edema",
      values.pallor && "Severe pallor",
      values.additionalSigns.trim(),
    ].filter(Boolean).join("; ")
    await registerPrenatalVisit(session.token, {
      pregnancy_id: values.pregnancyId,
      health_worker_id: session.user.user_id,
      visit_number: Number(values.visitNumber),
      age_of_gestation_weeks: Number(values.aogWeeks),
      trimester: Number(values.trimester),
      bp_systolic: Number(values.systolic),
      bp_diastolic: Number(values.diastolic),
      weight_kg: Number(values.weight),
      pulse_rate_bpm: Number(values.pulse),
      temperature_celsius: Number(values.temperature),
      fundic_height_cm: values.fundalHeight ? Number(values.fundalHeight) : undefined,
      fetal_heart_tone_bpm: values.fetalHeartTone ? Number(values.fetalHeartTone) : undefined,
      fetal_presentation: values.fetalPresentation || undefined,
      chief_complaint: values.notes.trim() || undefined,
      danger_signs_observed: dangerSigns || undefined,
      has_vaginal_bleeding: values.vaginalBleeding,
      has_fever: values.fever,
      has_edema: values.edema,
      has_pallor: values.pallor,
    })
    toast.success("Consultation recorded")
    refreshProfile()
  }

  const handleSaveDelivery = async (input: RegisterDeliveryOutcomeInput) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again.")
    await registerDeliveryOutcome(session.token, input)
    toast.success("Delivery and newborn record saved")
    refreshProfile()
  }

  const handleSaveLabRecord = async (values: LaboratoryFormValues) => {
    if (!session?.token || !maternalRecord) throw new Error("Your session has expired or patient record is missing.")
    const uploadedFiles = values.files.length
      ? await Promise.all(values.files.map(async (file) => uploadMaternalLabFile(session.token, file)))
      : [{ file_url: undefined, file_name: undefined }]
    for (const uploaded of uploadedFiles) {
      await registerMaternalLabScreening(session.token, {
        mother_id: maternalRecord.mother_id,
        pregnancy_id: values.pregnancyId,
        visit_id: values.visitId || undefined,
        screening_type: values.screeningType,
        date_of_screening: values.screeningDate ? new Date(values.screeningDate).toISOString() : new Date().toISOString(),
        result: values.result || undefined,
        remarks: values.remarks || undefined,
        file_url: uploaded.file_url,
        file_name: (uploaded as any).file_name,
      })
    }
    toast.success("Laboratory record saved")
    refreshProfile()
  }

  const patientName = [maternalRecord?.user?.first_name, maternalRecord?.user?.middle_name, maternalRecord?.user?.last_name].filter(Boolean).join(" ") || "Maternal record"
  useEffect(() => {
    if (maternalRecord) document.title = `${patientName} - Silang`
  }, [maternalRecord, patientName])
  const currentPregnancy = getLatestMaternalPregnancy(maternalRecord?.pregnancies)
  const selectedAppointment = maternalRecord?.appointments?.find((appointment) => appointment.appointment_id === selectedAppointmentId)
  const appointmentVisit = selectedAppointment ? (maternalRecord?.prenatalVisits ?? []).find((visit) => {
    if (!visit.visit_date || !selectedAppointment.appointment_date) return false
    return new Date(visit.visit_date).toDateString() === new Date(selectedAppointment.appointment_date).toDateString()
  }) : undefined
  const appointmentPregnancy = maternalRecord?.pregnancies?.find((pregnancy) => pregnancy.pregnancy_id === appointmentVisit?.pregnancy_id)
  const appointmentSupplements = (maternalRecord?.supplements ?? []).filter((supplement) => supplement.visit_id === appointmentVisit?.visit_id || supplement.pregnancy_id === appointmentPregnancy?.pregnancy_id)
  const latestVisit = getLatestPrenatalVisit(currentPregnancy)
  const riskLevel = normalizeMaternalRisk(latestVisit?.risk_level_assessed)
  const riskAssessment = {
    level: riskLevel as keyof typeof riskStyles,
    tews: latestVisit?.tews_score ?? 0,
    verdict: latestVisit?.danger_signs_observed || (latestVisit ? "Clinical assessment recorded for the latest visit." : "No clinical assessment recorded yet."),
  }
  const riskStyle = riskStyles[riskAssessment.level]
  const displayDate = (date?: string | null) => date ? format(new Date(date), "MMM d, yyyy") : "—"
  const profile = {
    fullName: patientName,
    ageDob: `${maternalRecord?.age ?? "—"} years · ${displayDate(maternalRecord?.birth_date)}`,
    contact: maternalRecord?.user?.phone_number || "—",
    civilStatus: maternalRecord?.civil_status || "—",
    bloodType: maternalRecord?.blood_type || "—",
    serialNo: maternalRecord?.family_serial_no || "—",
    address: maternalRecord?.user?.address || "—",
    gravidaParity: currentPregnancy ? `G${currentPregnancy.gravida ?? "—"} P${currentPregnancy.parity ?? "—"}` : "—",
    lmp: displayDate(currentPregnancy?.lmp_date),
    edd: displayDate(currentPregnancy?.edd_date),
    gestationalAge: latestVisit?.age_of_gestation_weeks ? `${latestVisit.age_of_gestation_weeks} weeks` : "—",
    bloodPressure: latestVisit ? `${latestVisit.bp_systolic}/${latestVisit.bp_diastolic} mmHg` : "—",
    bmi: currentPregnancy?.bmi_1st_trimester ? `${currentPregnancy.bmi_1st_trimester}${currentPregnancy.bmi_category ? ` · ${currentPregnancy.bmi_category}` : ""}` : "—",
  }
  const handleEhrExport = (formatType: string) => {
    const record = maternalRecord
    if (!record) return false
    const fileBase = `${patientName.trim().replace(/\s+/g, "-").toLowerCase()}-clinical-record`
    if (formatType === "json") {
      const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${fileBase}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("Clinical record downloaded")
      return true
    }
    if (formatType === "csv") {
      const visits = allVitals
      const columns = ["Visit number", "Visit date", "AOG weeks", "Trimester", "Blood pressure", "Pulse rate", "Temperature", "Weight", "Fundic height", "Fetal heart tone", "Risk", "Clinical notes"]
      const rows = visits.map((visit) => [
        visit.visit_number,
        visit.visit_date,
        visit.age_of_gestation_weeks,
        visit.trimester,
        `${visit.bp_systolic ?? ""}/${visit.bp_diastolic ?? ""}`,
        visit.pulse_rate_bpm,
        visit.temperature_celsius,
        visit.weight_kg,
        visit.fundic_height_cm,
        visit.fetal_heart_tone_bpm,
        visit.risk_level_assessed,
        visit.chief_complaint,
      ])
      const csv = [columns, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n")
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${fileBase}-visits.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("Clinical visit timeline downloaded")
      return true
    }
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Allow pop-ups to open the printable clinical record")
      return false
    }
    const visits = (record.prenatalVisits ?? []).map((visit) => `<tr><td>${escapeHtml(visit.visit_number)}</td><td>${escapeHtml(formatRecordDate(visit.visit_date))}</td><td>${escapeHtml(visit.age_of_gestation_weeks)} weeks</td><td>${escapeHtml(`${visit.bp_systolic ?? "—"}/${visit.bp_diastolic ?? "—"} mmHg`)}</td><td>${escapeHtml(visit.risk_level_assessed)}</td><td>${escapeHtml(visit.chief_complaint || visit.danger_signs_observed)}</td></tr>`).join("")
    const labs = (record.labRecords ?? []).map((lab) => `<tr><td>${escapeHtml(lab.screening_type)}</td><td>${escapeHtml(formatRecordDate(lab.date_of_screening))}</td><td>${escapeHtml(lab.result || lab.remarks)}</td></tr>`).join("")
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(patientName)} · Clinical Record</title><style>body{font:14px Arial,sans-serif;color:#111;margin:32px}h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:28px 0 8px}p{margin:4px 0;color:#444}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-top:18px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:7px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{background:#f3f4f6}@media print{body{margin:16mm}}</style></head><body><h1>${escapeHtml(patientName)}</h1><p>Clinical Health Record · Printed ${escapeHtml(format(new Date(), "MMMM d, yyyy"))}</p><div class="grid"><p><b>Age / DOB</b><br>${escapeHtml(profile.ageDob)}</p><p><b>Contact</b><br>${escapeHtml(profile.contact)}</p><p><b>Family Serial No.</b><br>${escapeHtml(profile.serialNo)}</p><p><b>Address</b><br>${escapeHtml(profile.address)}</p><p><b>Gravida / Parity</b><br>${escapeHtml(profile.gravidaParity)}</p><p><b>LMP / EDD</b><br>${escapeHtml(`${profile.lmp} / ${profile.edd}`)}</p></div><h2>Prenatal consultations</h2><table><thead><tr><th>Visit</th><th>Date</th><th>AOG</th><th>Blood pressure</th><th>Risk</th><th>Clinical notes</th></tr></thead><tbody>${visits || "<tr><td colspan=\"6\">No consultations recorded.</td></tr>"}</tbody></table><h2>Laboratory screenings</h2><table><thead><tr><th>Test</th><th>Date</th><th>Result / Notes</th></tr></thead><tbody>${labs || "<tr><td colspan=\"3\">No laboratory screenings recorded.</td></tr>"}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`)
    printWindow.document.close()
    toast.success("Printable clinical record opened")
    return true
  }

  const allVitals = useMemo(() => {
    const directVisits = maternalRecord?.prenatalVisits ?? []
    const pregnancyVisits = (maternalRecord?.pregnancies ?? []).flatMap((pregnancy) =>
      (pregnancy.prenatalVisits ?? []).map((visit) => ({ ...visit, pregnancy }))
    )
    const combined = directVisits.length > 0
      ? directVisits.map((visit) => {
          const pregnancy = maternalRecord?.pregnancies?.find((p) => p.pregnancy_id === visit.pregnancy_id)
          return { ...visit, pregnancy }
        })
      : pregnancyVisits

    const seenIds = new Set<string>()
    const unique = combined.filter((item) => {
      const id = item.visit_id || `${item.visit_date}-${item.visit_number}`
      if (seenIds.has(id)) return false
      seenIds.add(id)
      return true
    })

    return unique.sort((a, b) => {
      const dateA = new Date(a.visit_date ?? 0).getTime()
      const dateB = new Date(b.visit_date ?? 0).getTime()
      if (dateA !== dateB) return dateB - dateA
      return (Number(b.visit_number) || 0) - (Number(a.visit_number) || 0)
    })
  }, [maternalRecord])

  const filteredVitals = allVitals.filter((visit) => {
    const provider = visit.healthWorker ? `${visit.healthWorker.first_name ?? ""} ${visit.healthWorker.last_name ?? ""}` : ""
    const bpText = visit.bp_systolic != null && visit.bp_diastolic != null ? `${visit.bp_systolic}/${visit.bp_diastolic}` : ""
    const text = [
      formatRecordDate(visit.visit_date),
      `visit ${visit.visit_number ?? ""}`,
      `trimester ${visit.trimester ?? ""}`,
      bpText,
      visit.risk_level_assessed ?? "",
      visit.chief_complaint ?? "",
      visit.danger_signs_observed ?? "",
      provider,
    ].join(" ").toLowerCase()

    const matchesSearch = !vitalSearch || text.includes(vitalSearch.toLowerCase())

    const matchesTrimester = vitalTrimesterFilters.length === 0 || vitalTrimesterFilters.some((filter) => {
      if (filter === "1st Trimester") return visit.trimester === 1
      if (filter === "2nd Trimester") return visit.trimester === 2
      if (filter === "3rd Trimester") return visit.trimester === 3
      return false
    })

    const matchesRisk = vitalRiskFilters.length === 0 || vitalRiskFilters.some((risk) => {
      const visitRisk = normalizeMaternalRisk(visit.risk_level_assessed)
      return visitRisk.toLowerCase() === risk.toLowerCase()
    })

    const hasDanger = Boolean(
      visit.has_vaginal_bleeding ||
      visit.has_fever ||
      visit.has_edema ||
      visit.has_pallor ||
      (visit.danger_signs_observed && visit.danger_signs_observed.trim())
    )

    const matchesSigns = vitalSignsFilters.length === 0 || vitalSignsFilters.some((sign) => {
      if (sign === "Danger Signs Observed") return hasDanger
      if (sign === "Normal / No Signs") return !hasDanger
      return true
    })

    return matchesSearch && matchesTrimester && matchesRisk && matchesSigns
  })

  const resetVitalFilters = () => {
    setVitalSearch("")
    setVitalTrimesterFilters([])
    setVitalRiskFilters([])
    setVitalSignsFilters([])
  }

  const hasVitalFilters = Boolean(vitalSearch.trim() || vitalTrimesterFilters.length || vitalRiskFilters.length || vitalSignsFilters.length)

  const filteredVitalRows = filteredVitals.map((visit) => {
    const bpClassification = classifyBp(visit.bp_systolic, visit.bp_diastolic)
    const providerName = visit.healthWorker ? `${visit.healthWorker.first_name ?? ""} ${visit.healthWorker.last_name ?? ""}`.trim() : ""
    const hasDanger = Boolean(
      visit.has_vaginal_bleeding ||
      visit.has_fever ||
      visit.has_edema ||
      visit.has_pallor ||
      (visit.danger_signs_observed && visit.danger_signs_observed.trim())
    )

    return [
      <div key="date-visit" className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{formatRecordDate(visit.visit_date)}</span>
        <span className="text-[11px] text-muted-foreground">Visit #{visit.visit_number ?? "—"}</span>
      </div>,
      <div key="aog-trimester" className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{visit.age_of_gestation_weeks != null ? `${visit.age_of_gestation_weeks} weeks` : "—"}</span>
        <span className="text-[11px] text-muted-foreground">{visit.trimester ? `${visit.trimester}${visit.trimester === 1 ? "st" : visit.trimester === 2 ? "nd" : "rd"} Trimester` : "—"}</span>
      </div>,
      <div key="blood-pressure" className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">
          {visit.bp_systolic != null && visit.bp_diastolic != null ? `${visit.bp_systolic}/${visit.bp_diastolic} mmHg` : "—"}
        </span>
        <span className={`text-[10px] ${bpClassification.className}`}>
          {bpClassification.label}
        </span>
      </div>,
      <div key="heart-rate" className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{visit.pulse_rate_bpm != null ? `${visit.pulse_rate_bpm} bpm` : "—"}</span>
        <span className="text-[11px] text-muted-foreground">Pulse rate</span>
      </div>,
      <div key="temp-weight" className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{visit.temperature_celsius != null ? `${visit.temperature_celsius} °C` : "—"}</span>
        <span className="text-[11px] text-muted-foreground">{visit.weight_kg != null ? `${visit.weight_kg} kg` : "—"}</span>
      </div>,
      <div key="fundic-fht" className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{visit.fundic_height_cm != null ? `${visit.fundic_height_cm} cm` : "—"}</span>
        <span className="text-[11px] text-muted-foreground">{visit.fetal_heart_tone_bpm != null ? `${visit.fetal_heart_tone_bpm} bpm` : "—"}</span>
      </div>,
      <div key="danger-risk" className="flex flex-col items-start gap-1">
        <StatusBadge status={visit.risk_level_assessed || "Low Risk"} />
        {hasDanger ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
            <AlertTriangle className="size-3 shrink-0" />
            <span>Signs reported</span>
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">No signs reported</span>
        )}
      </div>,
      <div key="provider" className="truncate text-xs font-medium text-foreground" title={providerName || "Provider not set"}>
        {providerName || "—"}
      </div>,
    ]
  })

  const filteredDeliveryEntries = deliveryEntries.filter(({ delivery, pregnancy }) => {
    const text = [formatRecordDate(delivery.delivery_date), delivery.mode_of_delivery, delivery.place_of_delivery, delivery.maternal_outcome, delivery.birth_attendant, pregnancy.gravida, pregnancy.parity, ...(delivery.newbornRecords ?? []).flatMap((newborn) => [newborn.sex, newborn.status_at_birth, newborn.birth_weight_kg, newborn.apgar_score])].join(" ").toLowerCase()
    const matchesSearch = !deliverySearch || text.includes(deliverySearch.toLowerCase())
    const matchesType = deliveryFilters.length === 0 || deliveryFilters.some((filter) => {
      const type = filter.toLowerCase().split("·").at(-1)?.trim() ?? filter.toLowerCase()
      const newbornStatus = (delivery.newbornRecords ?? []).map((newborn) => newborn.status_at_birth ?? "").join(" ")
      return `${delivery.mode_of_delivery ?? ""} ${delivery.maternal_outcome ?? ""} ${newbornStatus}`.toLowerCase().includes(type)
    })
    return matchesSearch && matchesType
  })
  const filteredDeliveries = filteredDeliveryEntries.map(({ delivery }) => {
    const newborns = delivery.newbornRecords ?? []
    const newbornSummary = newborns.length
      ? `${newborns.length} · ${newborns.map((newborn) => `${newborn.sex ?? "—"}, ${newborn.birth_weight_kg ?? "—"} kg, APGAR ${newborn.apgar_score ?? "—"}`).join("; ")}`
      : "No newborn details"
    return [
      formatRecordDate(delivery.delivery_date),
      delivery.mode_of_delivery || "—",
      delivery.place_of_delivery || "—",
      delivery.maternal_outcome || "Alive",
      newbornSummary,
      delivery.birth_attendant || "—",
    ]
  })
  const filteredAppointmentEntries = appointmentRowsState.map((row, index) => ({ row, index })).filter(({ row, index }) => {
    const text = rowText(row)
    const matchesSearch = !appointmentSearch || text.includes(appointmentSearch.toLowerCase())
    const status = maternalRecord?.appointments?.[index]?.status?.toLowerCase() ?? "scheduled"
    const matchesStatus = appointmentStatusFilters.length === 0 || appointmentStatusFilters.some((filter) => filter.toLowerCase() === status)
    const matchesType = appointmentTypeFilters.length === 0 || appointmentTypeFilters.some((type) => text.includes(type.toLowerCase()))
    return matchesSearch && matchesStatus && matchesType
  })
  const filteredAppointments = filteredAppointmentEntries.map(({ row }) => row)
  const filteredPregnancies = pregnancyRowsState.filter((row) => {
    const text = row.join(" ").toLowerCase()
    const matchesSearch = !pregnancySearch || text.includes(pregnancySearch.toLowerCase())
    const matchesStatus = pregnancyStatusFilters.length === 0 || pregnancyStatusFilters.includes(rowText([row[4]]))
    return matchesSearch && matchesStatus
  })
  const filteredLaboratoryRows = laboratoryRowsState.filter((row) => {
    const fileName = row[0]
    const test = row[2]
    const date = row[3]
    const facility = row[5]
    const searchText = `${fileName} ${test} ${date} ${facility}`.toLowerCase()
    const matchesSearch = !laboratorySearch || searchText.includes(laboratorySearch.toLowerCase())
    return matchesSearch
  })

  const allLabRowsSelected = filteredLaboratoryRows.length > 0 && selectedLabRows.length === filteredLaboratoryRows.length

  const resetDeliveryFilters = () => {
    setDeliverySearch("")
    setDeliveryFilters([])
  }
  const resetAppointmentFilters = () => {
    setAppointmentSearch("")
    setAppointmentStatusFilters([])
    setAppointmentTypeFilters([])
  }
  const hasDeliveryFilters = Boolean(deliverySearch.trim() || deliveryFilters.length)
  const hasAppointmentFilters = Boolean(appointmentSearch.trim() || appointmentStatusFilters.length || appointmentTypeFilters.length)

  if (isProfileLoading) return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden px-4 pb-4 pt-4" aria-label="Loading maternal profile" aria-busy="true">
      <div className="flex shrink-0 items-center justify-between gap-3"><Skeleton className="h-8 w-36" /><div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-36" /><Skeleton className="size-8" /></div></div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <section className="shrink-0 rounded-md border border-sidebar-border p-4"><div className="flex items-center gap-3"><Skeleton className="size-11 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div><Skeleton className="h-6 w-20" /></div><div className="mt-6 grid gap-5 md:grid-cols-3">{Array.from({ length: 3 }, (_, col) => <div key={col} className="space-y-4">{Array.from({ length: 4 }, (_, row) => <div key={row} className="space-y-1.5"><Skeleton className="h-3 w-24" /><Skeleton className="h-3.5 w-full" /></div>)}</div>)}</div></section>
          <div className="flex min-h-0 flex-1 flex-col gap-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-80 max-w-full" /><Skeleton className="h-8 w-full max-w-2xl" /><div className="flex-1 rounded-md border border-sidebar-border p-3"><div className="space-y-4">{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex gap-4"><Skeleton className="h-4 w-1/5" /><Skeleton className="h-4 w-1/6" /><Skeleton className="h-4 flex-1" /></div>)}</div></div></div>
        </div>
      </div>
    </div>
  )
  if (!maternalRecord) return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm text-muted-foreground">This maternal profile could not be loaded.</p>
      <Button variant="outline" onClick={() => navigate("/dashboard/maternal-records")}>Back to Maternal Records</Button>
    </div>
  )

  const appointmentMother: AppointmentMotherOption = {
    id: maternalRecord.mother_id,
    name: patientName,
    serial: maternalRecord.family_serial_no || "No family serial number",
    age: `${maternalRecord.age ?? "—"} years`,
  }
  const handleScheduleAppointment = async (event: AppEvent, values: AppointmentFormValues) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again to schedule an appointment.")
    const start = event.start instanceof Date ? event.start : new Date()
    const response = await createAppointment(session.token, {
      mother_id: maternalRecord.mother_id,
      appointment_date: values.date,
      appointment_time: values.time,
      appointment_type: values.appointmentType,
    })
    const savedAppointment = response.data
    const appointment = {
      appointment_id: savedAppointment.appointment_id,
      appointment_date: savedAppointment.appointment_date ?? format(start, "yyyy-MM-dd"),
      appointment_time: savedAppointment.appointment_time ?? values.time,
      appointment_type: savedAppointment.appointment_type || event.appointmentType || "Appointment",
      reason: savedAppointment.reason ?? "",
      status: savedAppointment.status || "Scheduled",
    }
    setMaternalRecord((current) => current ? { ...current, appointments: [...(current.appointments ?? []), appointment] } : current)
    setAppointmentRowsState((current) => [...current, [
      `${formatRecordDate(appointment.appointment_date)} · ${appointment.appointment_time}`,
      appointment.appointment_type,
      "—",
      <StatusBadge key={appointment.appointment_id} status={appointment.status || "Scheduled"} label={formatStatusLabel(appointment.status)} />,
    ]])
    return { ...event, id: appointment.appointment_id, appointmentId: appointment.appointment_id }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden px-4 pb-4 pt-4 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" className="h-8 w-fit gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => navigate("/dashboard/maternal-records")}>
          <ArrowLeft className="size-3.5" />
          Maternal Records
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setIsRiskOverrideOpen(true)} className="h-8 gap-1.5 border-sidebar-border px-2.5 text-xs"><ShieldAlert className="size-3.5" />Override Risk</Button>
          <Button onClick={() => setIsVitalsOpen(true)} className="h-8 gap-1.5 px-2.5 text-xs"><Stethoscope className="size-3.5" />Log Consultation</Button>
          <DropdownMenu>
            <TooltipProvider delayDuration={500}>
            <Tooltip><TooltipTrigger asChild><DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More profile actions" className="size-8 border-sidebar-border"><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger></TooltipTrigger><TooltipContent>More profile actions</TooltipContent></Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsReferralOpen(true)}><ArrowLeftRight />Initiate Referral</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEhrExportOpen(true)}><Download />Export Clinical Record</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsChangeStaffOpen(true)}><UserCog />Change Staff</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)}><Pencil />Edit Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsUploadAvatarOpen(true)}><Camera />Change Profile Photo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <section aria-label="Maternal overview" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto pr-1 pb-8">
          <Card className={`min-w-0 shrink-0 gap-4 rounded-md border py-4 shadow-none ring-0 ${riskStyle.card}`}>
            <CardHeader className="flex flex-row items-center gap-4 px-4 pb-1">
              <div className="relative group shrink-0">
                <MaternalAvatar
                  src={maternalRecord?.user?.profile_url || maternalRecord?.profile_url || maternalRecord?.photo_url}
                  name={patientName}
                  className="size-12 border-2 border-sidebar-border text-sm"
                />
                <button
                  type="button"
                  onClick={() => setIsUploadAvatarOpen(true)}
                  aria-label="Change profile photo"
                  title="Change profile photo"
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Camera className="size-4" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className={`truncate text-base font-semibold ${riskStyle.value}`}>{profile.fullName}</CardTitle>
                <p className={`mt-0.5 text-xs ${riskStyle.label}`}>Maternal record · {profile.serialNo}</p>
              </div>
              {latestVisit?.risk_level_assessed ? <StatusBadge status={riskAssessment.level} /> : <span className="text-xs text-muted-foreground">Not assessed</span>}
            </CardHeader>
            <CardContent className="grid gap-4 px-4 pt-1 md:grid-cols-3 md:gap-5">
              <section className="space-y-3">
                <h3 className={`text-xs font-semibold ${riskStyle.value}`}>Identity</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <CardDetail label="Age / DOB" value={profile.ageDob} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Contact" value={profile.contact} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Civil Status" value={profile.civilStatus} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <div className="col-span-2"><CardDetail label="Address" value={profile.address} labelClassName={riskStyle.label} valueClassName={riskStyle.value} /></div>
                </div>
              </section>
              <section className="space-y-3">
                <h3 className={`text-xs font-semibold ${riskStyle.value}`}>Obstetric Baseline</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <CardDetail label="Gravida / Parity" value={profile.gravidaParity} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Gestational Age" value={profile.gestationalAge} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="LMP" value={profile.lmp} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="EDD" value={profile.edd} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                </div>
              </section>
              <section className="space-y-3">
                <h3 className={`text-xs font-semibold ${riskStyle.value}`}>Biometrics &amp; CDSS</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <CardDetail label="Blood Type" value={profile.bloodType} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Baseline BP" value={profile.bloodPressure} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="BMI" value={profile.bmi} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <div><div className={`mb-1 text-xs ${riskStyle.label}`}>TEWS Score</div>{latestVisit ? <StatusBadge status={riskAssessment.level} label={`TEWS ${riskAssessment.tews} · ${riskAssessment.level}`} /> : <span className="text-xs text-muted-foreground">Not assessed</span>}</div>
                  <div className="col-span-2"><CardDetail label="Active Danger Signs" value={latestVisit?.danger_signs_observed || (latestVisit ? "None reported" : "Not recorded")} labelClassName={riskStyle.label} valueClassName={riskStyle.value} /></div>
                </div>
                <div className={`flex items-start gap-2 rounded-md px-3 py-2 ${riskStyle.panel}`}>
                  <div aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-md ${riskStyle.icon}`}>{riskAssessment.level === "Low Risk" ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}</div>
                  <p className={`text-xs leading-relaxed ${riskStyle.value}`}>{riskAssessment.verdict}</p>
                </div>
              </section>
            </CardContent>
          </Card>

          <section className="flex w-full min-w-0 shrink-0 flex-col gap-3" aria-labelledby="clinical-history-heading">
            <div>
              <h2 id="clinical-history-heading" className="text-sm font-semibold text-foreground">Clinical History</h2>
              <p className="mt-1 text-xs font-normal text-muted-foreground">Review appointments, past vitals logs, deliveries, pregnancies, and EHR records.</p>
            </div>
            <Tabs value={historyTab} onValueChange={setHistoryTab} className="w-full min-w-0">
              <div className="flex w-full min-w-0 items-center justify-between gap-2">
                <TabsList className="h-9 w-max max-w-full justify-start gap-1 overflow-x-auto">
                  <TabsTrigger value="appointments" className="h-full flex-initial px-3 text-xs">Appointments</TabsTrigger>
                  <TabsTrigger value="vitals" className="h-full flex-initial px-3 text-xs">Past Vitals</TabsTrigger>
                  <TabsTrigger value="deliveries" className="h-full flex-initial px-3 text-xs">Deliveries</TabsTrigger>
                  <TabsTrigger value="pregnancies" className="h-full flex-initial px-3 text-xs">Pregnancies</TabsTrigger>
                  <TabsTrigger value="ehr" className="h-full flex-initial px-3 text-xs">Health Records</TabsTrigger>
                </TabsList>
                <TooltipProvider>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Export clinical history" onClick={() => setIsEhrExportOpen(true)} className="size-8 border-sidebar-border"><Download className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Export</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Refresh clinical history" onClick={refreshProfile} className="size-8 border-sidebar-border"><RefreshCw className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Refresh</TooltipContent></Tooltip>
                    {historyTab === "vitals" && <Button onClick={() => setIsVitalsOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><Stethoscope className="size-3.5" />Log Consultation</Button>}
                    {historyTab === "deliveries" && <Button onClick={() => setIsDeliveryDialogOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><Baby className="size-3.5" />Record Delivery</Button>}
                    {historyTab === "appointments" && <Button onClick={() => setIsScheduleAppointmentOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><CalendarPlus className="size-3.5" />Schedule Appointment</Button>}
                    {historyTab === "pregnancies" && <Button onClick={() => setIsNewPregnancyOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><Baby className="size-3.5" />New Pregnancy</Button>}
                    {historyTab === "ehr" && <Button onClick={() => setIsLabRecordOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><Upload className="size-3.5" />Upload EHR Record</Button>}
                  </div>
                </TooltipProvider>
              </div>
              <TabsContent value="deliveries" className="mt-3 flex w-full min-w-0 flex-col gap-3">
                <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <ToolbarSearch placeholder="Search by delivery date or attendant..." value={deliverySearch} onChange={setDeliverySearch} />
                  <ToolbarFilter label="Outcome / Delivery Type" options={["Live birth · Vaginal", "Live birth · Cesarean", "Stillbirth", "Miscarriage"]} selected={deliveryFilters} onChange={setDeliveryFilters} />
                  {hasDeliveryFilters && <ResetFilterButton onClick={resetDeliveryFilters} />}
                </div>
                <ProfileTable
                  headers={["Date", "Mode", "Facility", "Outcome", "Newborns", "Attendant"]}
                  rows={filteredDeliveries}
                  emptyState={{ icon: Baby, title: "No deliveries recorded", description: "Delivery outcomes and newborn details will appear here." }}
                  onRowClick={(rowIndex) => { const entry = filteredDeliveryEntries[rowIndex]; if (entry) { setSelectedDelivery(entry); setIsDeliveryDrawerOpen(true) } }}
                  renderRowAction={(rowIndex) => (
                    <TableRowActions label="Delivery actions">
                      <DropdownMenuItem onSelect={() => { const entry = filteredDeliveryEntries[rowIndex]; if (entry) { setSelectedDelivery(entry); setIsDeliveryDrawerOpen(true) } }}>View Delivery Details</DropdownMenuItem>
                    </TableRowActions>
                  )}
                />
              </TabsContent>
              <TabsContent value="appointments" className="mt-3 flex w-full min-w-0 flex-col gap-3">
                <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <ToolbarSearch placeholder="Search by appointment purpose..." value={appointmentSearch} onChange={setAppointmentSearch} />
                  <ToolbarFilter label="Status" options={["Scheduled", "Completed", "Cancelled", "Missed"]} selected={appointmentStatusFilters} onChange={setAppointmentStatusFilters} />
                  <ToolbarFilter label="Appointment Type" options={["ANC follow-up", "Laboratory", "Ultrasound", "Postpartum"]} selected={appointmentTypeFilters} onChange={setAppointmentTypeFilters} />
                  {hasAppointmentFilters && <ResetFilterButton onClick={resetAppointmentFilters} />}
                </div>
                <ProfileTable
                  headers={["Date & Time", "Type", "Purpose / Visit", "Status"]}
                  rows={filteredAppointments}
                  emptyState={{ icon: CalendarPlus, title: "No appointments found", description: "Appointments for this mother will appear here." }}
                  onRowClick={(rowIndex) => { const originalIndex = filteredAppointmentEntries[rowIndex]?.index; const appointment = originalIndex === undefined ? undefined : maternalRecord.appointments?.[originalIndex]; if (appointment) { setSelectedAppointmentId(appointment.appointment_id); setIsAppointmentDetailsOpen(true) } }}
                  renderRowAction={(rowIndex) => (
                    <TableRowActions label="Appointment actions">
                      <DropdownMenuItem onSelect={() => { const originalIndex = filteredAppointmentEntries[rowIndex]?.index; const appointment = originalIndex === undefined ? undefined : maternalRecord.appointments?.[originalIndex]; if (appointment) { setSelectedAppointmentId(appointment.appointment_id); setIsAppointmentDetailsOpen(true) } }}>View Appointment</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setIsVitalsOpen(true)}>Log Consultation</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setIsPrescriptionOpen(true)}>Create Prescription</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setAppointmentToCancel(filteredAppointmentEntries[rowIndex]?.index ?? null)}>Cancel Appointment</DropdownMenuItem>
                    </TableRowActions>
                  )}
                />
              </TabsContent>
              <TabsContent value="vitals" className="mt-3 flex w-full min-w-0 flex-col gap-3">
                {allVitals.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-md border border-sidebar-border bg-card p-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Activity className="size-3.5" />
                        <span>Latest Blood Pressure</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {allVitals[0].bp_systolic != null && allVitals[0].bp_diastolic != null ? `${allVitals[0].bp_systolic}/${allVitals[0].bp_diastolic} mmHg` : "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {allVitals[0].visit_date ? formatRecordDate(allVitals[0].visit_date) : "Recorded"}
                      </div>
                    </div>
                    <div className="rounded-md border border-sidebar-border bg-card p-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <HeartPulse className="size-3.5" />
                        <span>Latest Pulse &amp; Temp</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {allVitals[0].pulse_rate_bpm != null ? `${allVitals[0].pulse_rate_bpm} bpm` : "—"} · {allVitals[0].temperature_celsius != null ? `${allVitals[0].temperature_celsius} °C` : "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Resting vitals</div>
                    </div>
                    <div className="rounded-md border border-sidebar-border bg-card p-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Scale className="size-3.5" />
                        <span>Latest Weight &amp; AOG</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {allVitals[0].weight_kg != null ? `${allVitals[0].weight_kg} kg` : "—"} {allVitals[0].age_of_gestation_weeks != null ? `· ${allVitals[0].age_of_gestation_weeks}w` : ""}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Gestation progress</div>
                    </div>
                    <div className="rounded-md border border-sidebar-border bg-card p-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Stethoscope className="size-3.5" />
                        <span>Total Vitals Logged</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {allVitals.length} {allVitals.length === 1 ? "consultation" : "consultations"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Recorded visits</div>
                    </div>
                  </div>
                )}
                <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <ToolbarSearch placeholder="Search vitals by date, notes, danger signs, provider..." value={vitalSearch} onChange={setVitalSearch} />
                  <ToolbarFilter label="Trimester" options={["1st Trimester", "2nd Trimester", "3rd Trimester"]} selected={vitalTrimesterFilters} onChange={setVitalTrimesterFilters} />
                  <ToolbarFilter label="Risk Level" options={["Low Risk", "Moderate Risk", "High Risk"]} selected={vitalRiskFilters} onChange={setVitalRiskFilters} />
                  <ToolbarFilter label="Clinical Signs" options={["Danger Signs Observed", "Normal / No Signs"]} selected={vitalSignsFilters} onChange={setVitalSignsFilters} />
                  {hasVitalFilters && <ResetFilterButton onClick={resetVitalFilters} />}
                </div>
                <ProfileTable
                  headers={["Date & Visit", "AOG / Trimester", "Blood Pressure", "Heart Rate", "Temp & Weight", "Fundic / FHT", "Danger Signs & Risk", "Attending Provider"]}
                  rows={filteredVitalRows}
                  emptyState={{ icon: HeartPulse, title: "No vitals logs recorded", description: "Consultation vitals, physiological readings, and clinical evaluations will appear here." }}
                  onRowClick={(rowIndex) => {
                    const item = filteredVitals[rowIndex]
                    if (item) {
                      setSelectedVitalVisit({ visit: item, pregnancy: item.pregnancy })
                      setIsVitalDrawerOpen(true)
                    }
                  }}
                  renderRowAction={(rowIndex) => {
                    const item = filteredVitals[rowIndex]
                    return (
                      <TableRowActions label="Vital log actions">
                        <DropdownMenuItem onSelect={() => {
                          if (item) {
                            setSelectedVitalVisit({ visit: item, pregnancy: item.pregnancy })
                            setIsVitalDrawerOpen(true)
                          }
                        }}>
                          View Vital Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsVitalsOpen(true)}>
                          Log New Consultation
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => {
                          if (item && navigator.clipboard?.writeText) {
                            const summary = `Visit #${item.visit_number ?? "—"} (${formatRecordDate(item.visit_date)}): BP ${item.bp_systolic ?? "—"}/${item.bp_diastolic ?? "—"} mmHg, PR ${item.pulse_rate_bpm ?? "—"} bpm, Temp ${item.temperature_celsius ?? "—"}°C, Weight ${item.weight_kg ?? "—"}kg, AOG ${item.age_of_gestation_weeks ?? "—"}w`
                            void navigator.clipboard.writeText(summary)
                            toast.success("Vital summary copied")
                          }
                        }}>
                          Copy Vital Summary
                        </DropdownMenuItem>
                      </TableRowActions>
                    )
                  }}
                />
              </TabsContent>
              <TabsContent value="pregnancies" className="mt-3 flex w-full min-w-0 flex-col gap-3">
                <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <ToolbarSearch placeholder="Search by G/P, LMP, or EDD..." value={pregnancySearch} onChange={setPregnancySearch} />
                  <ToolbarFilter label="Status" options={["Active", "Completed", "Postpartum"]} selected={pregnancyStatusFilters} onChange={setPregnancyStatusFilters} />
                  {(pregnancySearch.trim() || pregnancyStatusFilters.length > 0) && <ResetFilterButton onClick={() => { setPregnancySearch(""); setPregnancyStatusFilters([]) }} />}
                </div>
                <ProfileTable headers={["G/P", "LMP", "EDD", "AOG", "Status"]} rows={filteredPregnancies} emptyState={{ icon: CalendarDays, title: "No pregnancy records", description: "Pregnancy history will appear here when it is recorded." }} />
              </TabsContent>
              <TabsContent value="ehr" className="mt-3 flex w-full min-w-0 flex-col gap-3">
                <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <ToolbarSearch placeholder="Search EHR records..." value={laboratorySearch} onChange={setLaboratorySearch} />
                  {laboratorySearch.trim() && <ResetFilterButton onClick={() => setLaboratorySearch("")} />}
                </div>
                <div className="flex w-full flex-col gap-1">
                  <div className="w-full overflow-hidden rounded-md border border-sidebar-border">
                    <Table className="w-full table-fixed text-xs">
                      <TableHeader className="bg-muted/50 dark:bg-muted/30">
                        <TableRow className="border-sidebar-border hover:bg-transparent">
                          <TableHead className="w-12 pl-4 text-center"><Checkbox aria-label="Select all EHR records" checked={allLabRowsSelected} onCheckedChange={(checked) => setSelectedLabRows(checked === true ? filteredLaboratoryRows.map((_, index) => index) : [])} className="border-sidebar-border" /></TableHead>
                          <TableHead className="px-2 text-xs font-medium">Test / Attachment</TableHead>
                          <TableHead className="w-32 px-2 text-xs font-medium">Date</TableHead>
                          <TableHead aria-label="Actions" className="w-12 px-1" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLaboratoryRows.map(([fileName, , test, date, , , screeningId], index) => {
                          const record = maternalRecord.labRecords?.find((lab) => lab.screening_id === screeningId)
                          const hasAttachment = Boolean(record?.file_url)
                          const openPreview = () => { if (record?.file_url) setPreviewEhrRecord(record) }
                          return <TableRow
                            key={screeningId}
                            className={`border-sidebar-border ${hasAttachment ? "cursor-pointer hover:bg-muted/40" : ""}`}
                            role={hasAttachment ? "button" : undefined}
                            onClick={openPreview}
                            onKeyDown={(event) => { if (hasAttachment && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openPreview() } }}
                            tabIndex={hasAttachment ? 0 : undefined}
                            aria-label={hasAttachment ? `Preview ${fileName}` : undefined}
                          >
                            <TableCell className="w-12 pl-4 text-center" onClick={(event) => event.stopPropagation()}><Checkbox aria-label={`Select ${test}`} checked={selectedLabRows.includes(index)} onCheckedChange={(checked) => setSelectedLabRows((current) => checked === true ? [...current, index] : current.filter((rowIndex) => rowIndex !== index))} className="border-sidebar-border" /></TableCell>
                            <TableCell className="min-w-0 px-2">
                              <div className="min-w-0">
                                <div className="truncate font-medium" title={test}>{test}</div>
                                <div className="truncate text-muted-foreground" title={fileName}>{fileName}</div>
                              </div>
                            </TableCell>
                            <TableCell className="px-2 text-muted-foreground">{date}</TableCell>
                            <TableCell className="w-12 px-1" onClick={(event) => event.stopPropagation()}>
                              <TableRowActions label={`Actions for ${test}`}>
                                {hasAttachment && <DropdownMenuItem onSelect={openPreview}>Preview Attachment</DropdownMenuItem>}
                                <DropdownMenuItem onSelect={() => { if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(test) }}>Copy Test Name</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => { if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(fileName) }}>Copy File Name</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setLabFileToDelete(screeningId)}>Delete EHR Record</DropdownMenuItem>
                              </TableRowActions>
                            </TableCell>
                          </TableRow>
                        })}
                        {filteredLaboratoryRows.length === 0 && <TableEmptyState colSpan={4} icon={FileText} title="No EHR records" description="Clinical documents and screening records will appear here when added." />}
                      </TableBody>
                    </Table>
                  </div>
                  <TablePaginationFooter rowCount={filteredLaboratoryRows.length} selectedCount={selectedLabRows.length} />
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </section>

      <RiskOverrideDialog open={isRiskOverrideOpen} onOpenChange={setIsRiskOverrideOpen} patientName={patientName} pregnancyLabel={currentPregnancy ? `Active Pregnancy · G${currentPregnancy.gravida ?? "—"} P${currentPregnancy.parity ?? "—"}` : "No pregnancy record"} currentRisk={riskAssessment.level} onSubmit={prepareRiskOverride} />
      <ConfirmRiskOverridePasswordDialog open={isRiskPasswordOpen} onOpenChange={(open) => { setIsRiskPasswordOpen(open); if (!open) setPendingRiskOverride(null) }} patientName={patientName} riskLevel={pendingRiskOverride?.riskLevel ?? "the selected level"} onConfirm={confirmRiskOverride} />
      <EhrExportDialog open={isEhrExportOpen} onOpenChange={setIsEhrExportOpen} patientName={patientName} maternalRecord={maternalRecord} onExport={handleEhrExport} />
      <PrenatalVitalsDialog open={isVitalsOpen} onOpenChange={setIsVitalsOpen} pregnancies={maternalRecord.pregnancies ?? []} onSave={handleSaveEncounter} />
      <DeliveryOutcomeDialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen} pregnancies={maternalRecord.pregnancies ?? []} onSave={handleSaveDelivery} />
      <DeliveryDetailsDrawer open={isDeliveryDrawerOpen} onOpenChange={setIsDeliveryDrawerOpen} patientName={patientName} delivery={selectedDelivery?.delivery ?? null} pregnancy={selectedDelivery?.pregnancy} />
      <VitalDetailsDrawer open={isVitalDrawerOpen} onOpenChange={setIsVitalDrawerOpen} patientName={patientName} visit={selectedVitalVisit?.visit ?? null} pregnancy={selectedVitalVisit?.pregnancy} />
      <AppointmentDetailsDialog open={isAppointmentDetailsOpen} onOpenChange={setIsAppointmentDetailsOpen} patientName={patientName} appointment={selectedAppointment} pregnancy={appointmentPregnancy} consultation={appointmentVisit} supplements={appointmentSupplements} />
      <CreateAppointmentModal open={isScheduleAppointmentOpen} onOpenChange={setIsScheduleAppointmentOpen} initialMother={appointmentMother} onCreate={handleScheduleAppointment} />
      {maternalRecord && <CreatePrescriptionDialog
        open={isPrescriptionOpen}
        onOpenChange={setIsPrescriptionOpen}
        patientName={patientName}
        motherId={maternalRecord.mother_id}
        pregnancies={maternalRecord.pregnancies ?? []}
        onSuccess={refreshProfile}
      />}
      <LaboratoryRecordDialog open={isLabRecordOpen} onOpenChange={setIsLabRecordOpen} pregnancies={maternalRecord.pregnancies ?? []} onSave={handleSaveLabRecord} />
      <EhrRecordPreview key={previewEhrRecord?.screening_id ?? "closed"} record={previewEhrRecord} onClose={() => setPreviewEhrRecord(null)} />
      <NewPregnancyDialog open={isNewPregnancyOpen} onOpenChange={setIsNewPregnancyOpen} onSubmit={handleCreatePregnancy} />
      <ChangeStaffDialog open={isChangeStaffOpen} onOpenChange={setIsChangeStaffOpen} patientName={patientName} staff={staffOptions} currentStaff={maternalRecord.assignedWorker} isLoading={isStaffLoading} onAssign={handleAssignStaff} />
      <EditMaternalProfileDialog key={JSON.stringify([maternalRecord.mother_id, maternalRecord.birth_date, maternalRecord.user?.first_name, maternalRecord.user?.middle_name, maternalRecord.user?.last_name, maternalRecord.user?.phone_number, maternalRecord.user?.email, maternalRecord.user?.address, maternalRecord.family_serial_no, maternalRecord.civil_status, maternalRecord.blood_type, maternalRecord.user?.profile_url, maternalRecord.profile_url])} open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen} profile={maternalRecord} onSubmit={handleEditProfile} />
      <UploadAvatarDialog
        open={isUploadAvatarOpen}
        onOpenChange={setIsUploadAvatarOpen}
        motherId={maternalRecord.mother_id}
        patientName={patientName}
        currentPhotoUrl={maternalRecord.user?.profile_url || maternalRecord.profile_url || maternalRecord.photo_url}
        onSuccess={(newPhotoUrl) => {
          setMaternalRecord((current) => current ? {
            ...current,
            profile_url: newPhotoUrl,
            photo_url: newPhotoUrl,
            user: { ...(current.user || {}), profile_url: newPhotoUrl, photo_url: newPhotoUrl },
          } : current)
        }}
      />
      <CreateReferralModal open={isReferralOpen} onOpenChange={setIsReferralOpen} mothers={[maternalRecord]} facilities={referralFacilities} originFacilityId={session?.user.facility_id} initialMotherId={maternalRecord.mother_id} isSaving={isCreatingReferral} onSubmit={handleCreateReferral} />
      <ConfirmSensitiveActionDialog
        open={appointmentToCancel !== null}
        onOpenChange={(open) => { if (!open) setAppointmentToCancel(null) }}
        title={`Are you sure you want to cancel “${appointmentToCancel === null ? "this appointment" : String(appointmentRowsState[appointmentToCancel]?.[1] ?? "this appointment") }”?`}
        description="The appointment will be marked as cancelled in this maternal record."
        confirmLabel="I understand, cancel this appointment"
        onConfirm={() => {
          const appointment = appointmentToCancel === null ? undefined : maternalRecord.appointments?.[appointmentToCancel]
          if (!appointment || !session?.token) { toast.error("Unable to find this appointment record"); setAppointmentToCancel(null); return }
          void cancelMaternalAppointment(session.token, appointment.appointment_id)
            .then(() => { toast.success("Appointment cancelled"); refreshProfile() })
            .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to cancel this appointment"))
            .finally(() => setAppointmentToCancel(null))
        }}
      />
      <ConfirmSensitiveActionDialog
        open={labFileToDelete !== null}
        onOpenChange={(open) => { if (!open) setLabFileToDelete(null) }}
        title={`Are you sure you want to delete “${maternalRecord.labRecords?.find((lab) => lab.screening_id === labFileToDelete)?.screening_type ?? "this EHR record"}”?`}
        description="This will permanently remove the EHR record and its attachment from this profile."
        confirmLabel="I understand, delete this EHR record"
        onConfirm={() => {
          const record = maternalRecord.labRecords?.find((lab) => lab.screening_id === labFileToDelete)
          if (!record || !session?.token) { toast.error("Unable to find this EHR record"); setLabFileToDelete(null); return }
          void deleteMaternalLabScreening(session.token, record.screening_id)
            .then(() => { toast.success("EHR record deleted"); refreshProfile() })
            .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to delete this EHR record"))
            .finally(() => setLabFileToDelete(null))
        }}
      />

    </div>
  )
}
