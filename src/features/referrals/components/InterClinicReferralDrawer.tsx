import { useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Baby,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Droplets,
  FileText,
  HeartPulse,
  MessageSquare,
  MapPin,
  Phone,
  Printer,
  Ruler,
  Thermometer,
  X,
  UserRound,
  UsersRound,
  Weight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { DrawerHeading } from "@/components/ui/drawer-heading"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import type { ReferralApiRecord } from "../api"
import { getReferralGatewayLink } from "../api"

export type ReferralClinicalContext = {
  serial: string
  age: string
  birthday: string
  bloodType: string
  contact: string
  address: string
  civilStatus: string
  pregnancy: string
  lmp: string
  edd: string
  aog: string
  chiefComplaint: string
  referralReason: string
  requestedAction: string
  additionalNotes: string
  previousDelivery: string
  comorbidities: string
  dangerSigns: string
  tews: string
  originFacility: string
  vitals: Record<string, string>
}

export type ReferralDrawerRecord = {
  id: string
  mother: string
  initiatedAt: string
  risk: "Low Risk" | "Moderate Risk" | "High Risk" | "Not assessed"
  status: "Accepted" | "Pending" | "In Transit" | "Admitted" | "Completed" | "Cancelled" | "Rejected"
  transferLink: string
  transferCode: string
  destination: string
  lastUpdatedAt?: string
  source?: ReferralApiRecord
  clinical?: ReferralClinicalContext
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Building2
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-2 items-center gap-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </span>
      <div className="min-w-0 text-xs font-medium">{children}</div>
    </div>
  )
}

function SummaryField({ label, value }: { label: string; value: string }) {
  const iconByLabel: Record<string, typeof FileText> = {
    "Chief complaint": MessageSquare,
    "Complete Name": UserRound,
    Age: CalendarDays,
    Address: MapPin,
    "CP Number": Phone,
    "Civil Status": UsersRound,
    Birthday: CalendarDays,
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

  return (
    <div className="grid grid-cols-2 items-start gap-3 py-2.5">
      <dt className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span>{label}</span>
      </dt>
      <dd className="min-w-0 break-words text-xs font-medium leading-relaxed">
        {value}
      </dd>
    </div>
  )
}

function TransferLifecycle({
  status,
  processedAt,
  lastUpdatedAt,
}: {
  status: ReferralDrawerRecord["status"]
  processedAt: string
  lastUpdatedAt: string
}) {
  const isAdmitted = ["Accepted", "In Transit", "Admitted", "Completed"].includes(status)
  const isReferred = ["Rejected", "Cancelled"].includes(status)
  const currentStage = isAdmitted ? "Admitted" : isReferred ? "Referred" : status

  return (
    <section
      aria-label="Transfer lifecycle handshake"
      className="border-b border-sidebar-border/70 px-5 py-4"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{currentStage}</h2>
          <StatusBadge status={status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Processed at {processedAt}
        </p>
        <div className="my-3 grid grid-cols-2 gap-1.5" aria-label={`Transfer progress: ${currentStage}`}>
          {[0, 1].map((index) => <span key={index} className={`h-1 rounded-full ${isAdmitted ? "bg-emerald-500" : isReferred ? "bg-orange-500" : index === 0 ? "bg-orange-500" : "bg-border"}`} />)}
        </div>
        <div className="grid grid-cols-2 text-xs text-muted-foreground"><span>Sent</span><span className="text-right">{isAdmitted ? "Admitted" : isReferred ? "Referred" : "Awaiting"}</span></div>
        <p className="mt-1 text-xs text-muted-foreground">
          Last updated: {lastUpdatedAt}
        </p>
      </div>
    </section>
  )
}

export function InterClinicReferralDrawer({
  open,
  onOpenChange,
  referral,
  currentFacilityId,
  isUpdating = false,
  onStatusChange,
  onCancelTransfer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  referral: ReferralDrawerRecord | null
  currentFacilityId?: string | null
  isUpdating?: boolean
  onStatusChange?: (status: string) => Promise<void>
  onCancelTransfer?: () => void
}) {
  const [activeTab, setActiveTab] = useState("clinical")
  const [copied, setCopied] = useState<"link" | "code" | "pin" | null>(null)
  const isCreate = !referral
  const mother = referral?.mother ?? "Referral"
  const patient = referral?.clinical
  const patientAge = patient?.age ?? "Not recorded"
  const patientBirthday = patient?.birthday ?? "Not recorded"
  const referralVitalRows = [
    ["Temperature", patient?.vitals.temperature ?? "Not recorded"],
    ["Pulse Rate", patient?.vitals.pulse ?? "Not recorded"],
    ["Blood Pressure", patient?.vitals.bloodPressure ?? "Not recorded"],
    ["Weight", patient?.vitals.weight ?? "Not recorded"],
    ["Height", patient?.vitals.height ?? "Not recorded"],
  ]
  const maternalVitalRows = [
    ["Blood Pressure", patient?.vitals.bloodPressure ?? "Not recorded"],
    ["Heart Rate", patient?.vitals.pulse ?? "Not recorded"],
    ["Blood Sugar", patient?.vitals.bloodSugar ?? "Not recorded"],
    ["Body Temp", patient?.vitals.temperature ?? "Not recorded"],
    ["Weight", patient?.vitals.weight ?? "Not recorded"],
    ["Respiratory Rate", patient?.vitals.respiratoryRate ?? "Not recorded"],
    ["O2 Saturation", patient?.vitals.oxygenSaturation ?? "Not recorded"],
  ]
  const risk = referral?.risk ?? "Not assessed"
  const tews = patient?.tews ?? "Not recorded"
  const transferCode = referral?.transferCode ?? ""
  const transferLink = referral?.id ? getReferralGatewayLink(referral.id) : ""
  const destination = referral?.destination ?? "Not specified"
  const status = referral?.status ?? "Pending"
  const isReceivingFacility = Boolean(currentFacilityId && referral?.source?.to_facility_id === currentFacilityId)
  const isOriginFacility = Boolean(currentFacilityId && referral?.source?.from_facility_id === currentFacilityId)
  const initiatedAt = referral?.initiatedAt ?? "Not yet submitted"
  const lastUpdatedAt = referral?.lastUpdatedAt ?? initiatedAt

  const copyValue = (kind: "link" | "code" | "pin", value: string) => {
    if (!value) return
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value)
        .then(() => toast.success(kind === "link" ? "Transfer link copied" : "Transfer code copied"))
        .catch(() => toast.error("Unable to copy to clipboard"))
    }
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 1600)
  }
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName="bg-transparent backdrop-blur-none supports-backdrop-filter:backdrop-blur-none"
        className="w-3/4 gap-0 border-sidebar-border bg-background p-0 sm:max-w-sm"
      >
        <TooltipProvider delayDuration={500}>
        <DrawerHeading
          icon={Building2}
          title={isCreate ? "New Referral" : `${mother} — Referral Details`}
          description="Review transfer progress, clinical information, and handover details."
          trailing={<Tooltip><TooltipTrigger asChild><Button
            variant="ghost"
            size="icon"
            aria-label="Close referral details"
            onClick={close}
            className="size-8 shrink-0 text-muted-foreground"
          >
            <X className="size-4" />
          </Button></TooltipTrigger><TooltipContent>Close referral details</TooltipContent></Tooltip>}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {referral && (
            <TransferLifecycle
              status={status}
              processedAt={initiatedAt}
              lastUpdatedAt={lastUpdatedAt}
            />
          )}

          <div className="px-5">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mx-auto w-full max-w-5xl gap-0 pb-6"
            >
              <section className="-mx-5 border-b border-sidebar-border/70">
                <div className="flex min-w-0 flex-col gap-2 px-5 py-4">
                  <span className="text-xs font-medium">
                    Transfer record link
                  </span>
                  <div className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-sidebar-border/70 bg-muted/40 px-2.5">
                    <a
                      href={transferLink}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-foreground hover:underline"
                    >
                      {transferLink.replace(/^https?:\/\//, "")}
                    </a>
                    <Tooltip><TooltipTrigger asChild><Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy transfer link"
                      onClick={() => copyValue("link", transferLink)}
                      className="size-7 shrink-0 text-muted-foreground"
                    >
                      {copied === "link" ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button></TooltipTrigger><TooltipContent>Copy transfer link</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><a
                      href={transferLink}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open transfer record"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUpRight className="size-3.5" />
                    </a></TooltipTrigger><TooltipContent>Open transfer record</TooltipContent></Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Open the referral record shared with the destination.
                  </p>
                </div>
                <div className="flex min-w-0 flex-col gap-2 border-t border-sidebar-border/70 px-5 py-4">
                  <span className="text-xs font-medium">Transfer code</span>
                  <div className="flex h-9 items-center justify-between rounded-md border border-sidebar-border/70 bg-muted/40 px-2.5">
                    <span className="font-mono text-xs tracking-wide">
                      {transferCode}
                    </span>
                    <Tooltip><TooltipTrigger asChild><Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy transfer code"
                      onClick={() => copyValue("code", transferCode)}
                      className="size-7 text-muted-foreground"
                    >
                      {copied === "code" ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button></TooltipTrigger><TooltipContent>Copy transfer code</TooltipContent></Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this code to verify the transfer at handover.
                  </p>
                </div>
              </section>
              <div className="py-3">
                <TabsList className="grid h-9 w-full grid-cols-3 gap-1">
                  {[
                    ["clinical", "Clinical"],
                    ["details", "Details"],
                    ["activity", "Activity"],
                  ].map(([value, label]) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="h-full min-w-0 px-2 text-xs font-medium"
                      >
                        <span className="truncate">{label}</span>
                      </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <TabsContent value="details" className="mt-0">
                <section className="py-4">
                  <h2 className="text-sm font-semibold">Referral information</h2>
                  <p className="mt-1 text-xs font-normal text-muted-foreground">Transfer routing and current handover status.</p>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <DetailRow icon={Clock3} label="Created time">
                      {initiatedAt}
                    </DetailRow>
                    <DetailRow icon={Activity} label="Status">
                      <StatusBadge status={status} />
                    </DetailRow>
                    <DetailRow icon={HeartPulse} label="Assessed risk">
                      <StatusBadge status={risk} />
                    </DetailRow>
                    <DetailRow icon={MapPin} label="Destination">
                      {destination}
                    </DetailRow>
                    <DetailRow icon={Building2} label="Origin facility">
                      {patient?.originFacility ?? "Not recorded"}
                    </DetailRow>
                    <DetailRow icon={Clock3} label="Pregnancy">
                      {patient?.pregnancy ?? "Not recorded"} · {patient?.aog ?? "Not recorded"}
                    </DetailRow>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="clinical" className="mt-0">
                <div className="space-y-5 py-4">
                  <section>
                    <h2 className="text-sm font-semibold">Clinical summary</h2>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">Patient context and findings shared with the receiving facility.</p>
                    <dl className="mt-2">
                      <SummaryField
                        label="Chief complaint"
                        value={patient?.chiefComplaint ?? "Not recorded"}
                      />
                      <SummaryField label="Reason for referral" value={patient?.referralReason ?? "Not recorded"} />
                      <SummaryField label="Requested clinical action" value={patient?.requestedAction ?? "Not recorded"} />
                      <SummaryField label="Complete Name" value={mother} />
                      <SummaryField label="Age" value={patientAge} />
                      <SummaryField label="Address" value={patient?.address ?? "Not recorded"} />
                      <SummaryField label="CP Number" value={patient?.contact ?? "Not recorded"} />
                      <SummaryField label="Civil Status" value={patient?.civilStatus ?? "Not recorded"} />
                      <SummaryField label="Blood Type" value={patient?.bloodType ?? "Not recorded"} />
                      <SummaryField label="Family Serial No." value={patient?.serial ?? "Not recorded"} />
                      <SummaryField label="Birthday" value={patientBirthday} />
                    </dl>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-foreground">Referral vitals</h3>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">Measurements included with this transfer.</p>
                    <dl className="mt-1">
                      {referralVitalRows.map(([label, value]) => (
                        <SummaryField key={label} label={label} value={value} />
                      ))}
                    </dl>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-foreground">Pregnancy history</h3>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">Obstetric dates and previous delivery details.</p>
                    <dl className="mt-1">
                      <SummaryField label="LMP" value={patient?.lmp ?? "Not recorded"} />
                      <SummaryField label="EDC / EDD" value={patient?.edd ?? "Not recorded"} />
                      <SummaryField label="AOG" value={patient?.aog ?? "Not recorded"} />
                      <SummaryField label="Gravida / Para" value={patient?.pregnancy ?? "Not recorded"} />
                      <SummaryField label="Previous Delivery" value={patient?.previousDelivery ?? "Not recorded"} />
                      <SummaryField label="Co-morbidities" value={patient?.comorbidities ?? "Not recorded"} />
                      <SummaryField label="Handover notes" value={patient?.additionalNotes ?? "Not recorded"} />
                    </dl>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-foreground">Clinical indicators</h3>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">Reported warning signs for triage.</p>
                    <dl className="mt-1">
                      <SummaryField
                        label="Primary Danger Signs"
                        value={patient?.dangerSigns ?? "Not recorded"}
                      />
                    </dl>
                  </section>

                  <section className="pb-2">
                    <h3 className="text-sm font-semibold text-foreground">Latest maternal vitals</h3>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">Most recent observations on record.</p>
                    <dl className="mt-1">
                      {maternalVitalRows.map(([label, value]) => (
                        <SummaryField key={label} label={label} value={value} />
                      ))}
                    </dl>
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <section className="py-3">
                  <h2 className="text-sm font-semibold">Activity log</h2>
                  <p className="mt-1 text-xs font-normal text-muted-foreground">Recent steps in the transfer process.</p>
                  <div className="mt-3 flex flex-col">
                    {[
                      [
                        "Referral initiated",
                        isCreate ? "New referral summary" : initiatedAt,
                      ],
                      ["Clinical risk assessed", `${risk} · TEWS ${tews}`],
                      ["Transfer prepared", `Code ${transferCode} created`],
                      ["Receiving facility", destination],
                    ].map(([title, detail], index) => (
                      <div key={title} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3 py-3 first:pt-1 last:pb-1">
                        <div className="relative flex justify-center">
                          <span
                            className={`mt-1 size-2.5 rounded-full ring-4 ring-background ${index === 0 ? "bg-primary" : "bg-muted-foreground/40"}`}
                          />
                          {index < 3 && (
                            <span className="absolute top-4 bottom-[-10px] w-px bg-sidebar-border/70" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-relaxed">{title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        </TooltipProvider>

        <div className="shrink-0 border-t border-sidebar-border px-5 py-3">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-2">
            {isOriginFacility && !["Completed", "Cancelled", "Rejected"].includes(status) && <Button
              type="button"
              variant="outline"
              onClick={() => { onCancelTransfer?.(); close() }}
              className="h-9 text-xs"
            >Cancel Transfer</Button>}
            {isReceivingFacility && status === "Pending" && <>
              <Button type="button" variant="outline" disabled={isUpdating} onClick={() => void onStatusChange?.("rejected")} className="h-9 text-xs">Refer Back</Button>
              <Button type="button" disabled={isUpdating} onClick={() => void onStatusChange?.("admitted")} className="h-9 text-xs">Accept Transfer</Button>
            </>}
            <Button
              type="button"
              onClick={() => window.print()}
              className="h-9 gap-1.5 text-xs"
            >
              <Printer className="size-3.5" />
              Print Transfer Form
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
