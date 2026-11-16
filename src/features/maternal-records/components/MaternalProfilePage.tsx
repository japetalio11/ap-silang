import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import {
  ArrowLeft,
  ArrowLeftRight,
  Baby,
  CalendarDays,
  CalendarPlus,
  Camera,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  RefreshCw,
  RotateCcw,
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
import { isUserSuperAdmin } from "@/features/auth/components/RequireSuperAdminAuth"
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
  deleteDeliveryOutcome,
  deleteMaternalAppointment,
  deleteMaternalLabScreening,
  deleteMaternalSupplement,
  deletePregnancy,
  deletePrenatalVisit,
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
  updateDeliveryOutcome,
  updateMaternalAppointment,
  updateMaternalRecord,
  updateMaternalSupplement,
  updatePregnancy,
  updatePrenatalVisit,
  uploadMaternalLabFile,
  type MaternalAppointment,
  type MaternalCompositeRecord,
  type MaternalDelivery,
  type MaternalLabRecord,
  type MaternalPregnancy,
  type MaternalPrenatalVisit,
  type MaternalStaff,
  type MaternalSupplement,
  type RegisterDeliveryOutcomeInput,
  type RegisterPrenatalVisitInput,
  type UpdateDeliveryOutcomeInput,
  type UpdateMaternalAppointmentInput,
  type UpdateMaternalSupplementInput,
  type UpdatePregnancyInput,
  type UpdatePrenatalVisitInput,
} from "../api"
import { AppointmentDetailsDialog } from "./AppointmentDetailsDialog"
import { DeliveryDetailsDrawer } from "./DeliveryDetailsDrawer"
import { EditAppointmentDialog } from "./EditAppointmentDialog"
import { EditDeliveryDialog } from "./EditDeliveryDialog"
import { DeliveryOutcomeDialog } from "./DeliveryOutcomeDialog"
import { PrescriptionDetailsDrawer } from "./PrescriptionDetailsDrawer"
import { EditPrescriptionDialog } from "./EditPrescriptionDialog"
import { CreatePrescriptionDialog } from "./CreatePrescriptionDialog"
import { PregnancyDetailsDrawer } from "./PregnancyDetailsDrawer"
import { EditPregnancyDialog } from "./EditPregnancyDialog"
import { ChangeStaffDialog, ConfirmRiskOverridePasswordDialog, EhrExportDialog, LaboratoryRecordDialog, PrenatalVitalsDialog, RiskOverrideDialog, type EncounterValues, type LaboratoryFormValues } from "./MaternalProfileActionModals"
import { EditMaternalProfileDialog, NewPregnancyDialog, type RegistrationValues } from "./MaternalRegistrationModal"
import { MaternalAvatar } from "./MaternalAvatar"
import { UploadAvatarDialog } from "./UploadAvatarDialog"
import { evaluateLocalVisitRisk } from "@/lib/cdss/cdssEngine"

const riskStyles = {
  "Low Risk": {
    card: "border-sidebar-border bg-card",
    label: "text-muted-foreground",
    value: "text-foreground",
    icon: "bg-emerald-700 text-white",
    panel: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  "Moderate Risk": {
    card: "border-sidebar-border bg-card",
    label: "text-muted-foreground",
    value: "text-foreground",
    icon: "bg-amber-600 text-white",
    panel: "bg-amber-50 dark:bg-amber-950/30",
  },
  "High Risk": {
    card: "border-sidebar-border bg-card",
    label: "text-muted-foreground",
    value: "text-foreground",
    icon: "bg-rose-700 text-white",
    panel: "bg-rose-50 dark:bg-rose-950/30",
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

function getAttachmentName(fileUrl?: string | null, fallback = "Health record") {
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

  const rawFileName = blobInfo?.filename || (record as any)?.file_name || getAttachmentName(fileUrl, record?.screening_type || "Health record")
  const fileName = rawFileName.startsWith("blob-") ? (record?.screening_type || "Health Record") : rawFileName
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
            <div className="truncate text-xs text-muted-foreground">{record.screening_type || "Health Record"}{record.date_of_screening ? ` · ${formatRecordDate(record.date_of_screening)}` : ""}</div>
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRows, setSelectedRows] = useState<number[]>([])

  useEffect(() => {
    setCurrentPage(1)
  }, [rows.length])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize)

  const allRowsSelected = rows.length > 0 && rows.every((_, index) => selectedRows.includes(index))
  const toggleAllRows = (checked: boolean | "indeterminate") => setSelectedRows(checked === true ? rows.map((_, index) => index) : [])

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="hidden w-full overflow-hidden rounded-md border border-sidebar-border md:block">
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
          {paginatedRows.map((row, localIndex) => {
            const actualIndex = startIndex + localIndex
            return (
              <TableRow key={actualIndex} onClick={() => onRowClick?.(actualIndex)} onKeyDown={(event) => { if (event.target === event.currentTarget && onRowClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRowClick(actualIndex) } }} tabIndex={onRowClick ? 0 : undefined} className={`border-sidebar-border ${onRowClick ? "cursor-pointer hover:bg-muted/40" : ""}`}>
                <TableCell className="w-12 pl-4 text-center" onClick={(event) => event.stopPropagation()}>
                  <Checkbox aria-label={`Select row ${actualIndex + 1}`} checked={selectedRows.includes(actualIndex)} onCheckedChange={(checked) => setSelectedRows((current) => checked === true ? [...current, actualIndex] : current.filter((index) => index !== actualIndex))} className="border-sidebar-border" />
                </TableCell>
                {row.map((cell, cellIndex) => <TableCell key={cellIndex} className="whitespace-normal break-words px-2">{cell}</TableCell>)}
                <TableCell className="w-12 px-1" onClick={(event) => event.stopPropagation()}>
                  {renderRowAction?.(actualIndex)}
                </TableCell>
              </TableRow>
            )
          })}
          {rows.length === 0 && <TableEmptyState colSpan={headers.length + 2} {...emptyState} />}
        </TableBody>
      </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {paginatedRows.map((row, localIndex) => {
          const actualIndex = startIndex + localIndex
          return (
            <article key={actualIndex} className="rounded-md border border-sidebar-border bg-card p-4 text-xs">
              <div className="flex items-start justify-between gap-3">
                <button type="button" disabled={!onRowClick} onClick={() => onRowClick?.(actualIndex)} className="min-w-0 flex-1 text-left text-sm font-semibold text-foreground disabled:cursor-default">{row[0]}</button>
                {renderRowAction?.(actualIndex)}
              </div>
              <dl className="mt-3 grid gap-2">
                {row.slice(1).map((cell, index) => <div key={index} className="flex items-start justify-between gap-3"><dt className="shrink-0 text-muted-foreground">{headers[index + 1]}</dt><dd className="min-w-0 text-right text-foreground">{cell}</dd></div>)}
              </dl>
            </article>
          )
        })}
        {rows.length === 0 && <div className="rounded-md border border-sidebar-border p-6 text-center text-sm text-muted-foreground">{emptyState.title}</div>}
      </div>
      <TablePaginationFooter
        rowCount={rows.length}
        selectedCount={selectedRows.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize)
          setCurrentPage(1)
        }}
      />
    </div>
  )
}

function ToolbarSearch({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative min-w-0 w-full max-w-md flex-1 md:min-w-[320px]">
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
  const location = useLocation()
  const { motherId } = useParams()
  const { session } = useAuthSession()
  const isSuperAdminView = location.pathname.startsWith("/superadmin") || isUserSuperAdmin(session?.user?.role)
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
  const [appointmentToCancel, setAppointmentToCancel] = useState<MaternalAppointment | null>(null)
  const [appointmentToDelete, setAppointmentToDelete] = useState<MaternalAppointment | null>(null)
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false)
  const [appointmentForEdit, setAppointmentForEdit] = useState<MaternalAppointment | null>(null)
  const [visitForEdit, setVisitForEdit] = useState<MaternalPrenatalVisit | null>(null)
  const [pregnancyForEdit, setPregnancyForEdit] = useState<MaternalPregnancy | null>(null)
  const [visitToDelete, setVisitToDelete] = useState<MaternalPrenatalVisit | null>(null)
  const [labFileToDelete, setLabFileToDelete] = useState<string | null>(null)
  const [historyTab, setHistoryTab] = useState("appointments")
  const [deliverySearch, setDeliverySearch] = useState("")
  const [deliveryFilters, setDeliveryFilters] = useState<string[]>([])
  const [appointmentSearch, setAppointmentSearch] = useState("")
  const [appointmentStatusFilters, setAppointmentStatusFilters] = useState<string[]>([])
  const [appointmentTypeFilters, setAppointmentTypeFilters] = useState<string[]>([])
  const [selectedVitalVisit, setSelectedVitalVisit] = useState<{ visit: MaternalPrenatalVisit; pregnancy?: MaternalPregnancy } | null>(null)
  const [pregnancySearch, setPregnancySearch] = useState("")
  const [pregnancyStatusFilters, setPregnancyStatusFilters] = useState<string[]>([])
  const [laboratorySearch, setLaboratorySearch] = useState("")
  const [prescriptionSearch, setPrescriptionSearch] = useState("")
  const [selectedLabRows, setSelectedLabRows] = useState<number[]>([])
  const [labPage, setLabPage] = useState(1)
  const [labPageSize, setLabPageSize] = useState(10)
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
  const [selectedPrescription, setSelectedPrescription] = useState<MaternalSupplement | null>(null)
  const [isPrescriptionDrawerOpen, setIsPrescriptionDrawerOpen] = useState(false)
  const [isEditPrescriptionOpen, setIsEditPrescriptionOpen] = useState(false)
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<string | null>(null)
  const [selectedPregnancyRecord, setSelectedPregnancyRecord] = useState<MaternalPregnancy | null>(null)
  const [isPregnancyDrawerOpen, setIsPregnancyDrawerOpen] = useState(false)
  const [isEditPregnancyOpen, setIsEditPregnancyOpen] = useState(false)
  const [pregnancyToDelete, setPregnancyToDelete] = useState<string | null>(null)
  const [isEditDeliveryOpen, setIsEditDeliveryOpen] = useState(false)
  const [deliveryToDelete, setDeliveryToDelete] = useState<string | null>(null)
  const [resolvedFacilityName, setResolvedFacilityName] = useState(session?.facility?.facility_name ?? "")

  useEffect(() => {
    const enrollments = maternalRecord?.facilityEnrollments ?? []
    const activeEnrollment = enrollments.find((e) => (e.status || "").toLowerCase() === "active") || enrollments[0]
    const directName = activeEnrollment?.facility?.facility_name || maternalRecord?.facility?.facility_name || session?.facility?.facility_name
    if (directName) {
      setResolvedFacilityName(directName)
      return
    }
    const targetFacilityId = activeEnrollment?.facility_id || maternalRecord?.facility_id || maternalRecord?.user?.facility_id || session?.user?.facility_id
    if (!targetFacilityId) return
    db.facilities.where("facility_id").equals(targetFacilityId).first().then((fac) => {
      if (fac?.facility_name) {
        setResolvedFacilityName(fac.facility_name)
      }
    }).catch(() => {})
  }, [maternalRecord, session?.facility?.facility_name, session?.user?.facility_id])
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
          getAttachmentName(lab.file_url, lab.screening_type || "Health record"),
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
    const handleOpenConsultation = () => setIsVitalsOpen(true)
    window.addEventListener("silang:open-log-consultation", handleOpenConsultation)
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get("openConsultation") === "true") {
      setIsVitalsOpen(true)
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, "", cleanUrl)
    }
    return () => {
      window.removeEventListener("silang:open-log-consultation", handleOpenConsultation)
    }
  }, [])

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

  const handleSaveEditDelivery = async (deliveryId: string, input: UpdateDeliveryOutcomeInput) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again.")
    await updateDeliveryOutcome(session.token, deliveryId, input)
    refreshProfile()
    if (selectedDelivery) {
      setSelectedDelivery((prev) =>
        prev
          ? {
              ...prev,
              delivery: {
                ...prev.delivery,
                ...input,
                newbornRecords: input.newborns ?? prev.delivery.newbornRecords,
              },
            }
          : null
      )
    }
  }

  const handleSaveEditAppointment = async (appointmentId: string, input: UpdateMaternalAppointmentInput) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again.")
    await updateMaternalAppointment(session.token, appointmentId, input)
    refreshProfile()
  }

  const handleSaveEditVisit = async (visitId: string, input: UpdatePrenatalVisitInput) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again.")
    await updatePrenatalVisit(session.token, visitId, input)
    refreshProfile()
  }

  const handleCreateVisitForAppointment = async (input: RegisterPrenatalVisitInput) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again.")
    await registerPrenatalVisit(session.token, {
      ...input,
      health_worker_id: input.health_worker_id || session.user.user_id,
    })
    refreshProfile()
  }

  const handleConfirmDeleteDelivery = async () => {
    if (!session?.token || !deliveryToDelete) return
    try {
      await deleteDeliveryOutcome(session.token, deliveryToDelete)
      toast.success("Delivery record deleted")
      setIsDeliveryDrawerOpen(false)
      setSelectedDelivery(null)
      refreshProfile()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete delivery record")
    } finally {
      setDeliveryToDelete(null)
    }
  }

  const handleSaveEditPregnancy = async (pregnancyId: string, input: UpdatePregnancyInput) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again.")
    await updatePregnancy(session.token, pregnancyId, input)
    refreshProfile()
    if (selectedPregnancyRecord) {
      setSelectedPregnancyRecord((prev) => prev ? { ...prev, ...input } : null)
    }
  }

  const handleConfirmDeletePregnancy = async () => {
    if (!session?.token || !pregnancyToDelete) return
    try {
      await deletePregnancy(session.token, pregnancyToDelete)
      toast.success("Pregnancy record deleted")
      setIsPregnancyDrawerOpen(false)
      setSelectedPregnancyRecord(null)
      refreshProfile()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete pregnancy record")
    } finally {
      setPregnancyToDelete(null)
    }
  }

  const handleSaveEditPrescription = async (input: UpdateMaternalSupplementInput) => {
    if (!session?.token) throw new Error("Your session has expired. Sign in again.")
    await updateMaternalSupplement(session.token, input)
    refreshProfile()
    if (selectedPrescription) {
      setSelectedPrescription((prev) => prev ? { ...prev, ...input, date_given: input.date_given ?? prev.date_given } : null)
    }
  }

  const handleConfirmDeletePrescription = async () => {
    if (!session?.token || !prescriptionToDelete) return
    try {
      await deleteMaternalSupplement(session.token, prescriptionToDelete)
      toast.success("Prescription deleted")
      setIsPrescriptionDrawerOpen(false)
      setSelectedPrescription(null)
      refreshProfile()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete prescription")
    } finally {
      setPrescriptionToDelete(null)
    }
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
  const appointmentVisit = selectedVitalVisit?.visit
  const appointmentPregnancy = selectedVitalVisit?.pregnancy ?? maternalRecord?.pregnancies?.find((pregnancy) => pregnancy.pregnancy_id === appointmentVisit?.pregnancy_id)
  const appointmentSupplements = (maternalRecord?.supplements ?? []).filter((supplement) =>
    (Boolean(appointmentVisit?.visit_id) && supplement.visit_id === appointmentVisit?.visit_id)
    || (Boolean(appointmentPregnancy?.pregnancy_id) && supplement.pregnancy_id === appointmentPregnancy?.pregnancy_id)
  )
  const latestVisit = getLatestPrenatalVisit(currentPregnancy)
  const localCdss = useMemo(() => {
    if (!latestVisit) return null
    return evaluateLocalVisitRisk({
      vitals: {
        bp_systolic: latestVisit.bp_systolic,
        bp_diastolic: latestVisit.bp_diastolic,
        pulse_rate_bpm: latestVisit.pulse_rate_bpm,
        temperature_celsius: latestVisit.temperature_celsius,
        has_vaginal_bleeding: Boolean(latestVisit.has_vaginal_bleeding),
        has_fever: Boolean(latestVisit.has_fever),
        has_edema: Boolean(latestVisit.has_edema),
        has_pallor: Boolean(latestVisit.has_pallor),
        danger_signs_observed: latestVisit.danger_signs_observed,
      },
      mother: maternalRecord ? { age: maternalRecord.age } : null,
      pregnancy: currentPregnancy,
      overrideRiskLevel: latestVisit.risk_level_assessed,
    })
  }, [latestVisit, maternalRecord, currentPregnancy])

  const effectiveRiskLevel = latestVisit?.risk_level_assessed
    ? normalizeMaternalRisk(latestVisit.risk_level_assessed)
    : (localCdss?.risk_level_label ?? "Low Risk")
  const effectiveTews = latestVisit?.tews_score ?? localCdss?.tews_score ?? 0

  const dangerSigns = [
    latestVisit?.has_vaginal_bleeding && "Vaginal bleeding",
    latestVisit?.has_fever && "Maternal fever",
    latestVisit?.has_edema && "Edema",
    latestVisit?.has_pallor && "Severe pallor",
    latestVisit?.danger_signs_observed?.trim(),
  ].filter(Boolean)
  const riskAssessment = {
    level: effectiveRiskLevel as keyof typeof riskStyles,
    tews: effectiveTews,
    verdict: latestVisit
      ? dangerSigns.length
        ? `Triggered by: ${dangerSigns.join(", ")}.`
        : effectiveRiskLevel === "Low Risk"
          ? "All recorded vital signs are within routine clinical limits. No danger signs reported."
          : (localCdss?.protocols?.[0] || "Risk assessment recorded for the latest visit. Review the clinical measurements and history.")
      : "Log a consultation to see the current clinical assessment.",
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
      <StatusBadge status={delivery.maternal_outcome || "Alive"} />,
      newbornSummary,
      delivery.birth_attendant || "—",
    ]
  })
  const appointmentEntries = (() => {
    const matchedVisitIds = new Set<string>()
    const resolveVisitRisk = (v?: MaternalPrenatalVisit | null) => {
      if (!v) return "Not assessed"
      if (v.risk_level_assessed) return normalizeMaternalRisk(v.risk_level_assessed)
      return evaluateLocalVisitRisk({
        vitals: {
          bp_systolic: v.bp_systolic,
          bp_diastolic: v.bp_diastolic,
          pulse_rate_bpm: v.pulse_rate_bpm,
          temperature_celsius: v.temperature_celsius,
          has_vaginal_bleeding: Boolean(v.has_vaginal_bleeding),
          has_fever: Boolean(v.has_fever),
          has_edema: Boolean(v.has_edema),
          has_pallor: Boolean(v.has_pallor),
          danger_signs_observed: v.danger_signs_observed,
        },
        mother: maternalRecord ? { age: maternalRecord.age } : null,
        pregnancy: currentPregnancy,
      }).risk_level_label
    }

    const scheduledEntries = appointmentRowsState.map((baseRow, index) => {
      const appointment = maternalRecord?.appointments?.[index]
      const visit = appointment ? allVitals.find((candidate) => {
        if (!candidate.visit_date || !appointment.appointment_date) return false
        const matchesDate = new Date(candidate.visit_date).toDateString() === new Date(appointment.appointment_date).toDateString()
        const notAlreadyMatched = !candidate.visit_id || !matchedVisitIds.has(candidate.visit_id)
        if (matchesDate && notAlreadyMatched && candidate.visit_id) matchedVisitIds.add(candidate.visit_id)
        return matchesDate && notAlreadyMatched
      }) : undefined
      const row: ReactNode[] = [
        <div className="flex flex-col gap-0.5"><span className="font-medium">{baseRow[0]}</span>{visit && <span className="text-[11px] text-muted-foreground">Visit #{visit.visit_number ?? "—"} · {visit.age_of_gestation_weeks ?? "—"}w AOG</span>}</div>,
        visit ? `${String(baseRow[1] ?? "Appointment")} · Consultation` : baseRow[1],
        visit ? <StatusBadge status={resolveVisitRisk(visit)} /> : "—",
        baseRow[2],
      ]
      return { row, appointment, index, visit, pregnancy: visit?.pregnancy }
    })
    const standaloneVisits = allVitals.filter((visit) => !visit.visit_id || !matchedVisitIds.has(visit.visit_id)).map((visit) => {
      return {
        appointment: undefined,
        index: -1,
        visit,
        pregnancy: visit.pregnancy,
        row: [
          <div className="flex flex-col gap-0.5"><span className="font-medium">{formatRecordDate(visit.visit_date)}</span><span className="text-[11px] text-muted-foreground">Visit #{visit.visit_number ?? "—"} · {visit.age_of_gestation_weeks ?? "—"}w AOG</span></div>,
          "Consultation",
          <StatusBadge status={resolveVisitRisk(visit)} />,
          <StatusBadge status="Completed" />,
        ] as ReactNode[],
      }
    })
    return [...scheduledEntries, ...standaloneVisits]
  })()
  const filteredAppointmentEntries = appointmentEntries.filter(({ row, appointment }) => {
    const text = rowText(row)
    const matchesSearch = !appointmentSearch || text.includes(appointmentSearch.toLowerCase())
    const status = appointment?.status?.toLowerCase() ?? "completed"
    const matchesStatus = appointmentStatusFilters.length === 0 || appointmentStatusFilters.some((filter) => filter.toLowerCase() === status)
    const matchesType = appointmentTypeFilters.length === 0 || appointmentTypeFilters.some((type) => text.toLowerCase().includes(type.toLowerCase()))
    return matchesSearch && matchesStatus && matchesType
  })
  const filteredAppointments = filteredAppointmentEntries.map(({ row }) => row)
  const filteredPregnancyEntries = (maternalRecord?.pregnancies ?? []).filter((pregnancy) => {
    const text = `G${pregnancy.gravida ?? ""} P${pregnancy.parity ?? ""} ${formatRecordDate(pregnancy.lmp_date)} ${formatRecordDate(pregnancy.edd_date)} ${pregnancy.pregnancy_status ?? ""}`.toLowerCase()
    const matchesSearch = !pregnancySearch || text.includes(pregnancySearch.toLowerCase())
    const status = pregnancy.pregnancy_status || "Active"
    const matchesStatus = pregnancyStatusFilters.length === 0 || pregnancyStatusFilters.includes(status)
    return matchesSearch && matchesStatus
  })
  const filteredPregnancies = filteredPregnancyEntries.map((pregnancy) => {
    const lmp = pregnancy.lmp_date ? new Date(pregnancy.lmp_date) : null
    const days = lmp && !Number.isNaN(lmp.getTime()) ? Math.max(0, Math.floor((Date.now() - lmp.getTime()) / 86_400_000)) : null
    const aog = days === null ? "—" : `${Math.floor(days / 7)}w ${days % 7}d`
    return [
      `G${pregnancy.gravida ?? "—"} P${pregnancy.parity ?? "—"}`,
      formatRecordDate(pregnancy.lmp_date),
      formatRecordDate(pregnancy.edd_date),
      aog,
      <StatusBadge key={pregnancy.pregnancy_id} status={pregnancy.pregnancy_status || "Active"} />,
    ]
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
  const totalLabPages = Math.max(1, Math.ceil(filteredLaboratoryRows.length / labPageSize))
  const safeLabPage = Math.min(labPage, totalLabPages)
  const startLabIndex = (safeLabPage - 1) * labPageSize
  const paginatedLaboratoryRows = filteredLaboratoryRows.slice(startLabIndex, startLabIndex + labPageSize)
  const filteredPrescriptions = (maternalRecord?.supplements ?? []).filter((supplement) => {
    const text = `${supplement.supplement_type ?? "Supplement"} ${supplement.tablets_given_count ?? ""} ${formatRecordDate(supplement.date_given)} ${supplement.is_completed ? "completed" : "active"}`.toLowerCase()
    return !prescriptionSearch || text.includes(prescriptionSearch.toLowerCase())
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
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto px-4 pb-4 pt-4" aria-label="Loading maternal profile" aria-busy="true">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-8" /></div>
      </div>
      <section className="shrink-0 rounded-md border border-sidebar-border p-4">
        <div className="flex items-center gap-3"><Skeleton className="size-9 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div><Skeleton className="h-5 w-16 rounded-sm" /></div>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-3 w-4/5" />)}</div>
      </section>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <div className="rounded-md border border-sidebar-border p-3">
          <div className="space-y-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex gap-4"><Skeleton className="h-3.5 w-1/4" /><Skeleton className="h-3.5 w-1/5" /><Skeleton className="h-3.5 flex-1" /></div>)}</div>
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
      <StatusBadge key={appointment.appointment_id} status={appointment.status || "Scheduled"} label={formatStatusLabel(appointment.status)} />,
    ]])
    refreshProfile()
    return { ...event, id: appointment.appointment_id, appointmentId: appointment.appointment_id }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden px-4 pb-4 pt-4 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="h-8 w-fit gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            const locState = location.state as { returnTo?: string; returnLabel?: string } | null
            if (locState?.returnTo) {
              navigate(locState.returnTo)
            } else if (isSuperAdminView) {
              navigate(-1)
            } else {
              navigate("/dashboard/maternal-records")
            }
          }}
        >
          <ArrowLeft className="size-3.5" />
          {isSuperAdminView
            ? (location.state as { returnLabel?: string } | null)?.returnLabel
              ? `Back to ${(location.state as { returnLabel?: string }).returnLabel}`
              : "Back to Facility"
            : "Maternal Records"}
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isSuperAdminView ? (
            <>
              <div className="flex items-center gap-1.5 rounded-md border border-sidebar-border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                <Eye className="size-3.5" />
                <span>Read-Only Oversight</span>
              </div>
              <Button variant="outline" onClick={() => setIsEhrExportOpen(true)} className="h-8 gap-1.5 border-sidebar-border px-2.5 text-xs">
                <Download className="size-3.5" />
                Export EHR Record
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      <section aria-label="Maternal overview" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto pr-1 pb-8">
          <Card className={`min-w-0 shrink-0 gap-5 rounded-md border py-4 shadow-none ring-0 ${riskStyle.card}`}>
            <CardHeader className="flex flex-row items-center gap-4 px-4 pb-1">
              <div className="relative group shrink-0">
                <MaternalAvatar
                  src={maternalRecord?.user?.profile_url || maternalRecord?.profile_url || maternalRecord?.photo_url}
                  name={patientName}
                  className="size-12 border-2 border-sidebar-border text-sm"
                />
                {!isSuperAdminView && (
                  <button
                    type="button"
                    onClick={() => setIsUploadAvatarOpen(true)}
                    aria-label="Change profile photo"
                    title="Change profile photo"
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Camera className="size-4" />
                  </button>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className={`truncate text-base font-semibold ${riskStyle.value}`}>{profile.fullName}</CardTitle>
                <p className={`mt-0.5 text-xs ${riskStyle.label}`}>Maternal record · {profile.serialNo}</p>
              </div>
              <StatusBadge status={latestVisit ? riskAssessment.level : "Not assessed"} />
            </CardHeader>
            <CardContent className="grid gap-5 px-4 pt-1 sm:grid-cols-2 lg:grid-cols-3">
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground">Patient</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <CardDetail label="Age / DOB" value={profile.ageDob} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Contact" value={profile.contact} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Civil Status" value={profile.civilStatus} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Blood Type" value={profile.bloodType} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <div className="col-span-2"><CardDetail label="Address" value={profile.address} labelClassName={riskStyle.label} valueClassName={riskStyle.value} /></div>
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground">Pregnancy</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <CardDetail label="Gravida / Parity" value={profile.gravidaParity} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="AOG" value={profile.gestationalAge} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="LMP" value={profile.lmp} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="EDD" value={profile.edd} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="First Trimester BMI" value={profile.bmi} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                </div>
              </section>
              <section className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><h3 className="text-xs font-semibold text-foreground">Latest Vitals</h3><span className="text-xs text-muted-foreground">{latestVisit ? displayDate(latestVisit.visit_date) : "No visit recorded"}</span></div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <CardDetail label="Blood Pressure" value={profile.bloodPressure} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Pulse Rate" value={latestVisit?.pulse_rate_bpm != null ? `${latestVisit.pulse_rate_bpm} bpm` : "—"} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Temperature" value={latestVisit?.temperature_celsius != null ? `${latestVisit.temperature_celsius} °C` : "—"} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Weight" value={latestVisit?.weight_kg != null ? `${latestVisit.weight_kg} kg` : "—"} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Fetal Heart Tone" value={latestVisit?.fetal_heart_tone_bpm != null ? `${latestVisit.fetal_heart_tone_bpm} bpm` : "—"} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                  <CardDetail label="Fundal Height" value={latestVisit?.fundic_height_cm != null ? `${latestVisit.fundic_height_cm} cm` : "—"} labelClassName={riskStyle.label} valueClassName={riskStyle.value} />
                </div>
              </section>
              <section className={`flex items-start gap-3 rounded-md px-3 py-3 sm:col-span-2 lg:col-span-3 ${riskStyle.panel}`} aria-label="Clinical risk assessment">
                <div aria-hidden="true" className={`flex size-7 shrink-0 items-center justify-center rounded-md ${riskStyle.icon}`}>{riskAssessment.level === "Low Risk" ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}</div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-semibold text-foreground">Clinical Risk Assessment</h3>{latestVisit && <span className="text-xs text-muted-foreground">TEWS {riskAssessment.tews}</span>}</div>
                  <p className={`text-xs leading-relaxed ${riskStyle.value}`}>{riskAssessment.verdict}</p>
                </div>
              </section>
            </CardContent>
          </Card>

          <section className="flex w-full min-w-0 shrink-0 flex-col gap-3 pt-2 sm:pt-3" aria-labelledby="clinical-history-heading">
            <div>
              <h2 id="clinical-history-heading" className="text-sm font-semibold text-foreground">Clinical History</h2>
              <p className="mt-1 text-xs font-normal text-muted-foreground">Review appointments, consultation vitals, deliveries, pregnancies, and health records.</p>
            </div>
            <Tabs value={historyTab} onValueChange={setHistoryTab} className="w-full min-w-0">
              <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <TabsList className="h-9 w-max max-w-full justify-start gap-1 overflow-x-auto">
                  <TabsTrigger value="appointments" className="h-full flex-initial px-3 text-xs">Appointments ({appointmentEntries.length})</TabsTrigger>
                  <TabsTrigger value="deliveries" className="h-full flex-initial px-3 text-xs">Deliveries ({deliveryEntries.length})</TabsTrigger>
                  <TabsTrigger value="pregnancies" className="h-full flex-initial px-3 text-xs">Pregnancies ({pregnancyRowsState.length})</TabsTrigger>
                  <TabsTrigger value="ehr" className="h-full flex-initial px-3 text-xs">Health Records ({laboratoryRowsState.length})</TabsTrigger>
                  <TabsTrigger value="prescriptions" className="h-full flex-initial px-3 text-xs">Prescriptions ({maternalRecord.supplements?.length ?? 0})</TabsTrigger>
                </TabsList>
                <TooltipProvider>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Export clinical history" onClick={() => setIsEhrExportOpen(true)} className="size-8 border-sidebar-border"><Download className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Export</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Refresh clinical history" onClick={refreshProfile} className="size-8 border-sidebar-border"><RefreshCw className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Refresh</TooltipContent></Tooltip>
                    {!isSuperAdminView && (
                      <>
                        {historyTab === "deliveries" && <Button onClick={() => setIsDeliveryDialogOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><Baby className="size-3.5" />Record Delivery</Button>}
                        {historyTab === "appointments" && <Button onClick={() => setIsScheduleAppointmentOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><CalendarPlus className="size-3.5" />Schedule Appointment</Button>}
                        {historyTab === "pregnancies" && <Button onClick={() => setIsNewPregnancyOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><Baby className="size-3.5" />New Pregnancy</Button>}
                        {historyTab === "ehr" && <Button onClick={() => setIsLabRecordOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><Upload className="size-3.5" />Upload Health Record</Button>}
                        {historyTab === "prescriptions" && <Button onClick={() => setIsPrescriptionOpen(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"><PlusCircle className="size-3.5" />Create Prescription</Button>}
                      </>
                    )}
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
                  renderRowAction={(rowIndex) => {
                    const entry = filteredDeliveryEntries[rowIndex]
                    return (
                      <TableRowActions label="Delivery actions">
                        <DropdownMenuItem onSelect={() => { if (entry) { setSelectedDelivery(entry); setIsDeliveryDrawerOpen(true) } }}>View Delivery Details</DropdownMenuItem>
                        {!isSuperAdminView && entry && (
                          <>
                            <DropdownMenuItem onSelect={() => { setSelectedDelivery(entry); setIsEditDeliveryOpen(true) }}>Edit Delivery</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeliveryToDelete(entry.delivery.delivery_id)}>Delete Delivery</DropdownMenuItem>
                          </>
                        )}
                      </TableRowActions>
                    )
                  }}
                />
              </TabsContent>
              <TabsContent value="appointments" className="mt-3 flex w-full min-w-0 flex-col gap-3">
                <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <ToolbarSearch placeholder="Search appointments or visits..." value={appointmentSearch} onChange={setAppointmentSearch} />
                  <ToolbarFilter label="Status" options={["Scheduled", "Completed", "Cancelled", "Missed"]} selected={appointmentStatusFilters} onChange={setAppointmentStatusFilters} />
                  <ToolbarFilter label="Appointment Type" options={["ANC follow-up", "Laboratory", "Ultrasound", "Postpartum", "Consultation"]} selected={appointmentTypeFilters} onChange={setAppointmentTypeFilters} />
                  {hasAppointmentFilters && <ResetFilterButton onClick={resetAppointmentFilters} />}
                </div>
                <ProfileTable
                  headers={["Date & Visit", "Type", "Risk", "Status"]}
                  rows={filteredAppointments}
                  emptyState={{ icon: CalendarPlus, title: "No appointments or visits found", description: "Scheduled visits and recorded consultation vitals will appear here." }}
                  onRowClick={(rowIndex) => { const entry = filteredAppointmentEntries[rowIndex]; if (entry) { setSelectedAppointmentId(entry.appointment?.appointment_id ?? null); setSelectedVitalVisit(entry.visit ? { visit: entry.visit, pregnancy: entry.pregnancy } : null); setIsAppointmentDetailsOpen(true) } }}
                  renderRowAction={(rowIndex) => {
                    const entry = filteredAppointmentEntries[rowIndex]
                    const appt = entry?.appointment
                    const vst = entry?.visit
                    return (
                      <TableRowActions label="Appointment actions">
                        <DropdownMenuItem onSelect={() => { if (entry) { setSelectedAppointmentId(appt?.appointment_id ?? null); setSelectedVitalVisit(vst ? { visit: vst, pregnancy: entry.pregnancy } : null); setIsAppointmentDetailsOpen(true) } }}>View Details</DropdownMenuItem>
                        {!isSuperAdminView && (
                          <>
                            <DropdownMenuItem onSelect={() => {
                              setAppointmentForEdit(appt ?? null)
                              setVisitForEdit(vst ?? null)
                              setPregnancyForEdit(entry?.pregnancy ?? null)
                              setIsEditAppointmentOpen(true)
                            }}>
                              {appt && vst ? "Edit Appointment & Vitals" : appt ? "Edit Appointment" : "Edit Consultation Vitals"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setIsVitalsOpen(true)}>Log Consultation</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setIsPrescriptionOpen(true)}>Create Prescription</DropdownMenuItem>
                            {appt && (
                              <>
                                {appt.status?.toLowerCase() !== "cancelled" && appt.status?.toLowerCase() !== "completed" && (
                                  <DropdownMenuItem variant="destructive" onSelect={() => setAppointmentToCancel(appt)}>Cancel Appointment</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setAppointmentToDelete(appt)}>Delete Appointment</DropdownMenuItem>
                              </>
                            )}
                            {!appt && vst && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setVisitToDelete(vst)}>Delete Consultation</DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
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
                <ProfileTable
                  headers={["G/P", "LMP", "EDD", "AOG", "Status"]}
                  rows={filteredPregnancies}
                  emptyState={{ icon: CalendarDays, title: "No pregnancy records", description: "Pregnancy history will appear here when it is recorded." }}
                  onRowClick={(rowIndex) => {
                    const entry = filteredPregnancyEntries[rowIndex]
                    if (entry) {
                      setSelectedPregnancyRecord(entry)
                      setIsPregnancyDrawerOpen(true)
                    }
                  }}
                  renderRowAction={(rowIndex) => {
                    const entry = filteredPregnancyEntries[rowIndex]
                    return (
                      <TableRowActions label="Pregnancy actions">
                        <DropdownMenuItem onSelect={() => { if (entry) { setSelectedPregnancyRecord(entry); setIsPregnancyDrawerOpen(true) } }}>View Pregnancy Details</DropdownMenuItem>
                        {!isSuperAdminView && entry && (
                          <>
                            <DropdownMenuItem onSelect={() => { setSelectedPregnancyRecord(entry); setIsEditPregnancyOpen(true) }}>Edit Pregnancy</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setPregnancyToDelete(entry.pregnancy_id)}>Delete Pregnancy</DropdownMenuItem>
                          </>
                        )}
                      </TableRowActions>
                    )
                  }}
                />
              </TabsContent>
              <TabsContent value="ehr" className="mt-3 flex w-full min-w-0 flex-col gap-3">
                <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <ToolbarSearch placeholder="Search health records..." value={laboratorySearch} onChange={setLaboratorySearch} />
                  {laboratorySearch.trim() && <ResetFilterButton onClick={() => setLaboratorySearch("")} />}
                </div>
                <div className="flex w-full flex-col gap-1">
                  <div className="hidden w-full overflow-hidden rounded-md border border-sidebar-border md:block">
                    <Table className="w-full table-fixed text-xs">
                      <TableHeader className="bg-muted/50 dark:bg-muted/30">
                        <TableRow className="border-sidebar-border hover:bg-transparent">
                          <TableHead className="w-12 pl-4 text-center"><Checkbox aria-label="Select all health records" checked={allLabRowsSelected} onCheckedChange={(checked) => setSelectedLabRows(checked === true ? filteredLaboratoryRows.map((_, index) => index) : [])} className="border-sidebar-border" /></TableHead>
                          <TableHead className="px-2 text-xs font-medium">Test / Attachment</TableHead>
                          <TableHead className="w-32 px-2 text-xs font-medium">Date</TableHead>
                          <TableHead aria-label="Actions" className="w-12 px-1" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLaboratoryRows.map(([fileName, , test, date, , , screeningId], localIndex) => {
                          const actualIndex = startLabIndex + localIndex
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
                            <TableCell className="w-12 pl-4 text-center" onClick={(event) => event.stopPropagation()}><Checkbox aria-label={`Select ${test}`} checked={selectedLabRows.includes(actualIndex)} onCheckedChange={(checked) => setSelectedLabRows((current) => checked === true ? [...current, actualIndex] : current.filter((rowIndex) => rowIndex !== actualIndex))} className="border-sidebar-border" /></TableCell>
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
                                {!isSuperAdminView && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem variant="destructive" onSelect={() => setLabFileToDelete(screeningId)}>Delete Health Record</DropdownMenuItem>
                                  </>
                                )}
                              </TableRowActions>
                            </TableCell>
                          </TableRow>
                        })}
                        {filteredLaboratoryRows.length === 0 && <TableEmptyState colSpan={4} icon={FileText} title="No health records" description="Clinical documents and screening records will appear here when added." />}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-2 md:hidden">
                    {paginatedLaboratoryRows.map(([fileName, , test, date, , , screeningId], localIndex) => {
                      const actualIndex = startLabIndex + localIndex
                      const record = maternalRecord.labRecords?.find((lab) => lab.screening_id === screeningId)
                      const openPreview = () => { if (record?.file_url) setPreviewEhrRecord(record) }
                      return <div key={screeningId} className="rounded-md border border-sidebar-border p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox aria-label={`Select ${test}`} checked={selectedLabRows.includes(actualIndex)} onCheckedChange={(checked) => setSelectedLabRows((current) => checked === true ? [...current, actualIndex] : current.filter((rowIndex) => rowIndex !== actualIndex))} className="mt-1 border-sidebar-border" />
                          <button type="button" className="min-w-0 flex-1 text-left" onClick={openPreview} disabled={!record?.file_url}>
                            <span className="block truncate text-xs font-medium">{test}</span>
                            <span className="block truncate text-xs text-muted-foreground">{fileName}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">{date}</span>
                          </button>
                          <TableRowActions label={`Actions for ${test}`}>
                            {record?.file_url && <DropdownMenuItem onSelect={openPreview}>Preview Attachment</DropdownMenuItem>}
                            <DropdownMenuItem onSelect={() => { if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(test) }}>Copy Test Name</DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => setLabFileToDelete(screeningId)}>Delete Health Record</DropdownMenuItem>
                          </TableRowActions>
                        </div>
                      </div>
                    })}
                    {filteredLaboratoryRows.length === 0 && <div className="rounded-md border border-sidebar-border p-6 text-center text-xs"><p className="font-medium">No health records</p><p className="mt-1 text-muted-foreground">Clinical documents and screening records will appear here when added.</p></div>}
                  </div>
                  <TablePaginationFooter
                    rowCount={filteredLaboratoryRows.length}
                    selectedCount={selectedLabRows.length}
                    page={safeLabPage}
                    pageSize={labPageSize}
                    onPageChange={setLabPage}
                    onPageSizeChange={(newSize) => {
                      setLabPageSize(newSize)
                      setLabPage(1)
                    }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="prescriptions" className="mt-3 flex w-full min-w-0 flex-col gap-3">
                <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <ToolbarSearch placeholder="Search prescriptions..." value={prescriptionSearch} onChange={setPrescriptionSearch} />
                  {prescriptionSearch.trim() && <ResetFilterButton onClick={() => setPrescriptionSearch("")} />}
                </div>
                <ProfileTable
                  headers={["Medication", "Tablets Given", "Date Given", "Status"]}
                  rows={filteredPrescriptions.map((prescription) => [
                    prescription.supplement_type || "Supplement",
                    prescription.tablets_given_count ?? "—",
                    formatRecordDate(prescription.date_given),
                    <StatusBadge key={prescription.supplement_id} status={prescription.is_completed ? "Completed" : "Active"} />,
                  ])}
                  emptyState={{ icon: FileText, title: "No prescriptions recorded", description: "Medications and supplements for this mother will appear here." }}
                  onRowClick={(rowIndex) => {
                    const entry = filteredPrescriptions[rowIndex]
                    if (entry) {
                      setSelectedPrescription(entry)
                      setIsPrescriptionDrawerOpen(true)
                    }
                  }}
                  renderRowAction={(rowIndex) => {
                    const entry = filteredPrescriptions[rowIndex]
                    return (
                      <TableRowActions label="Prescription actions">
                        <DropdownMenuItem onSelect={() => { if (entry) { setSelectedPrescription(entry); setIsPrescriptionDrawerOpen(true) } }}>View Details</DropdownMenuItem>
                        {!isSuperAdminView && entry && (
                          <>
                            <DropdownMenuItem onSelect={() => { setSelectedPrescription(entry); setIsEditPrescriptionOpen(true) }}>Edit Prescription</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setPrescriptionToDelete(entry.supplement_id)}>Delete Prescription</DropdownMenuItem>
                          </>
                        )}
                      </TableRowActions>
                    )
                  }}
                />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </section>

      <EhrExportDialog open={isEhrExportOpen} onOpenChange={setIsEhrExportOpen} patientName={patientName} maternalRecord={maternalRecord} onExport={handleEhrExport} />
      <DeliveryDetailsDrawer
        open={isDeliveryDrawerOpen}
        onOpenChange={setIsDeliveryDrawerOpen}
        patientName={patientName}
        delivery={selectedDelivery?.delivery ?? null}
        pregnancy={selectedDelivery?.pregnancy}
        onEdit={!isSuperAdminView ? () => setIsEditDeliveryOpen(true) : undefined}
        onDelete={!isSuperAdminView ? () => { if (selectedDelivery) setDeliveryToDelete(selectedDelivery.delivery.delivery_id) } : undefined}
        readOnly={isSuperAdminView}
      />
      <PrescriptionDetailsDrawer
        open={isPrescriptionDrawerOpen}
        onOpenChange={setIsPrescriptionDrawerOpen}
        patientName={patientName}
        prescription={selectedPrescription}
        pregnancy={maternalRecord?.pregnancies?.find((p) => p.pregnancy_id === selectedPrescription?.pregnancy_id)}
        onEdit={!isSuperAdminView ? () => setIsEditPrescriptionOpen(true) : undefined}
        onDelete={!isSuperAdminView ? () => { if (selectedPrescription) setPrescriptionToDelete(selectedPrescription.supplement_id) } : undefined}
        readOnly={isSuperAdminView}
      />
      <PregnancyDetailsDrawer
        open={isPregnancyDrawerOpen}
        onOpenChange={setIsPregnancyDrawerOpen}
        patientName={patientName}
        pregnancy={selectedPregnancyRecord}
        onEdit={!isSuperAdminView ? () => setIsEditPregnancyOpen(true) : undefined}
        onDelete={!isSuperAdminView ? () => { if (selectedPregnancyRecord) setPregnancyToDelete(selectedPregnancyRecord.pregnancy_id) } : undefined}
        readOnly={isSuperAdminView}
      />
      <AppointmentDetailsDialog
        open={isAppointmentDetailsOpen}
        onOpenChange={setIsAppointmentDetailsOpen}
        patientName={patientName}
        appointment={selectedAppointment}
        pregnancy={appointmentPregnancy}
        consultation={appointmentVisit}
        supplements={appointmentSupplements}
        onEdit={!isSuperAdminView && (selectedAppointment || appointmentVisit) ? () => {
          setAppointmentForEdit(selectedAppointment ?? null)
          setVisitForEdit(appointmentVisit ?? null)
          setPregnancyForEdit(appointmentPregnancy ?? null)
          setIsEditAppointmentOpen(true)
        } : undefined}
        onCancel={!isSuperAdminView && selectedAppointment ? () => {
          setAppointmentToCancel(selectedAppointment)
        } : undefined}
        onDelete={!isSuperAdminView && (selectedAppointment || appointmentVisit) ? () => {
          if (selectedAppointment) {
            setAppointmentToDelete(selectedAppointment)
          } else if (appointmentVisit) {
            setVisitToDelete(appointmentVisit)
          }
        } : undefined}
        readOnly={isSuperAdminView}
      />
      <EhrRecordPreview key={previewEhrRecord?.screening_id ?? "closed"} record={previewEhrRecord} onClose={() => setPreviewEhrRecord(null)} />
      {!isSuperAdminView && (
        <>
          <RiskOverrideDialog open={isRiskOverrideOpen} onOpenChange={setIsRiskOverrideOpen} patientName={patientName} pregnancyLabel={currentPregnancy ? `Active Pregnancy · G${currentPregnancy.gravida ?? "—"} P${currentPregnancy.parity ?? "—"}` : "No pregnancy record"} currentRisk={riskAssessment.level} onSubmit={prepareRiskOverride} />
          <ConfirmRiskOverridePasswordDialog open={isRiskPasswordOpen} onOpenChange={(open) => { setIsRiskPasswordOpen(open); if (!open) setPendingRiskOverride(null) }} patientName={patientName} riskLevel={pendingRiskOverride?.riskLevel ?? "the selected level"} onConfirm={confirmRiskOverride} />
          <PrenatalVitalsDialog open={isVitalsOpen} onOpenChange={setIsVitalsOpen} pregnancies={maternalRecord.pregnancies ?? []} onSave={handleSaveEncounter} />
          <DeliveryOutcomeDialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen} pregnancies={maternalRecord.pregnancies ?? []} onSave={handleSaveDelivery} defaultPlaceOfDelivery={resolvedFacilityName} />
          <EditDeliveryDialog
            key={selectedDelivery?.delivery?.delivery_id ?? "delivery-empty"}
            open={isEditDeliveryOpen}
            onOpenChange={setIsEditDeliveryOpen}
            delivery={selectedDelivery?.delivery ?? null}
            pregnancies={maternalRecord.pregnancies ?? []}
            onSave={handleSaveEditDelivery}
          />
          <EditPrescriptionDialog
            open={isEditPrescriptionOpen}
            onOpenChange={setIsEditPrescriptionOpen}
            prescription={selectedPrescription}
            pregnancies={maternalRecord.pregnancies ?? []}
            onSave={handleSaveEditPrescription}
          />
          <EditPregnancyDialog
            key={selectedPregnancyRecord?.pregnancy_id ?? "none"}
            open={isEditPregnancyOpen}
            onOpenChange={setIsEditPregnancyOpen}
            pregnancy={selectedPregnancyRecord}
            onSave={handleSaveEditPregnancy}
          />
          <EditAppointmentDialog
            key={`${appointmentForEdit?.appointment_id ?? "no-appt"}-${visitForEdit?.visit_id ?? "no-visit"}`}
            open={isEditAppointmentOpen}
            onOpenChange={setIsEditAppointmentOpen}
            appointment={appointmentForEdit}
            visit={visitForEdit}
            pregnancy={pregnancyForEdit}
            pregnancies={maternalRecord.pregnancies ?? []}
            patientName={patientName}
            facilityId={session?.user?.facility_id}
            onSaveAppointment={handleSaveEditAppointment}
            onSaveVisit={handleSaveEditVisit}
            onCreateVisit={handleCreateVisitForAppointment}
          />
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
          <NewPregnancyDialog open={isNewPregnancyOpen} onOpenChange={setIsNewPregnancyOpen} onSubmit={handleCreatePregnancy} birthDate={maternalRecord.birth_date} />
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
            open={deliveryToDelete !== null}
            onOpenChange={(open) => { if (!open) setDeliveryToDelete(null) }}
            title="Are you sure you want to delete this delivery record?"
            description="This will permanently delete the delivery outcome and linked newborn birth records from this profile."
            confirmLabel="I understand, delete this delivery"
            onConfirm={handleConfirmDeleteDelivery}
          />
          <ConfirmSensitiveActionDialog
            open={pregnancyToDelete !== null}
            onOpenChange={(open) => { if (!open) setPregnancyToDelete(null) }}
            title="Are you sure you want to delete this pregnancy record?"
            description="This will permanently delete the pregnancy profile and its associated clinical consultation history."
            confirmLabel="I understand, delete this pregnancy"
            onConfirm={handleConfirmDeletePregnancy}
          />
          <ConfirmSensitiveActionDialog
            open={prescriptionToDelete !== null}
            onOpenChange={(open) => { if (!open) setPrescriptionToDelete(null) }}
            title="Are you sure you want to delete this prescription?"
            description="This will permanently remove the medication dispensing record from this patient profile."
            confirmLabel="I understand, delete this prescription"
            onConfirm={handleConfirmDeletePrescription}
          />
          <ConfirmSensitiveActionDialog
            open={Boolean(appointmentToCancel)}
            onOpenChange={(open) => { if (!open) setAppointmentToCancel(null) }}
            title={`Are you sure you want to cancel “${appointmentToCancel?.appointment_type ?? "this appointment"}”?`}
            description="The appointment will be marked as cancelled in this maternal record."
            confirmLabel="I understand, cancel this appointment"
            onConfirm={async () => {
              if (!appointmentToCancel || !session?.token) return
              try {
                await cancelMaternalAppointment(session.token, appointmentToCancel.appointment_id)
                toast.success("Appointment cancelled")
                refreshProfile()
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to cancel this appointment")
              } finally {
                setAppointmentToCancel(null)
              }
            }}
          />
          <ConfirmSensitiveActionDialog
            open={Boolean(appointmentToDelete)}
            onOpenChange={(open) => { if (!open) setAppointmentToDelete(null) }}
            title={`Are you sure you want to delete “${appointmentToDelete?.appointment_type ?? "this appointment"}”?`}
            description="This will permanently delete this appointment record. This action cannot be undone."
            confirmLabel="I understand the consequences, delete this appointment"
            onConfirm={async () => {
              if (!appointmentToDelete || !session?.token) return
              try {
                await deleteMaternalAppointment(session.token, appointmentToDelete.appointment_id)
                toast.success("Appointment record deleted")
                if (selectedAppointmentId === appointmentToDelete.appointment_id) {
                  setIsAppointmentDetailsOpen(false)
                  setSelectedAppointmentId(null)
                }
                refreshProfile()
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to delete this appointment")
              } finally {
                setAppointmentToDelete(null)
              }
            }}
          />
          <ConfirmSensitiveActionDialog
            open={Boolean(visitToDelete)}
            onOpenChange={(open) => { if (!open) setVisitToDelete(null) }}
            title="Are you sure you want to delete this consultation visit record?"
            description="This will permanently delete this prenatal consultation and its recorded vitals. This action cannot be undone."
            confirmLabel="I understand the consequences, delete this consultation"
            onConfirm={async () => {
              if (!visitToDelete?.visit_id || !session?.token) return
              try {
                await deletePrenatalVisit(session.token, visitToDelete.visit_id)
                toast.success("Consultation visit deleted")
                if (selectedVitalVisit?.visit?.visit_id === visitToDelete.visit_id) {
                  setIsAppointmentDetailsOpen(false)
                  setSelectedVitalVisit(null)
                }
                refreshProfile()
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to delete this consultation visit")
              } finally {
                setVisitToDelete(null)
              }
            }}
          />
          <ConfirmSensitiveActionDialog
            open={labFileToDelete !== null}
            onOpenChange={(open) => { if (!open) setLabFileToDelete(null) }}
            title={`Are you sure you want to delete “${maternalRecord.labRecords?.find((lab) => lab.screening_id === labFileToDelete)?.screening_type ?? "this health record"}”?`}
            description="This will permanently remove the health record and its attachment from this profile."
            confirmLabel="I understand, delete this health record"
            onConfirm={() => {
              const record = maternalRecord.labRecords?.find((lab) => lab.screening_id === labFileToDelete)
              if (!record || !session?.token) { toast.error("Unable to find this health record"); setLabFileToDelete(null); return }
              void deleteMaternalLabScreening(session.token, record.screening_id)
                .then(() => { toast.success("Health record deleted"); refreshProfile() })
                .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to delete this health record"))
                .finally(() => setLabFileToDelete(null))
            }}
          />
        </>
      )}

    </div>
  )
}
