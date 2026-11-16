import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Mail,
  User,
  Phone,
  Building2,
  Send,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ShieldAlert,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiRequest, ApiError } from "@/lib/api"
import { toast } from "sonner"
import silangLogo from "@/assets/silang.svg"

type QuickIssue = {
  label: string
  subject: string
  template: string
  isUrgent?: boolean
}

const QUICK_ISSUES: QuickIssue[] = [
  {
    label: "Account Locked",
    subject: "Account Locked / Password Reset Request",
    template: "Good day Admin, my account is currently locked out after multiple login attempts. Could you please trigger a password reset for my account so I can resume patient documentation?",
    isUrgent: true,
  },
  {
    label: "New Staff Access",
    subject: "New Staff Credentials & Onboarding Request",
    template: "Good day Admin, I have recently been assigned to this health facility and require active staff credentials to access maternal care and appointment scheduling.",
  },
  {
    label: "Offline PIN Reset",
    subject: "Offline PIN Reset & Device Re-authentication",
    template: "Good day Admin, I am having trouble with the 4-digit offline PIN on our clinic tablet. Kindly assist in resetting my offline workspace credentials.",
    isUrgent: true,
  },
  {
    label: "Facility Transfer",
    subject: "Facility Reassignment & Access Permission Update",
    template: "Good day Admin, I have been reassigned to a different clinic/station and need my assigned facility profile updated in the system.",
  },
  {
    label: "General Help",
    subject: "System Assistance & Technical Support Request",
    template: "Good day Admin, I am encountering an issue while attempting to access the platform. Details of the issue: ",
  },
]

const PILI_FACILITIES = [
  "RHU 1 (Main Birthing Clinic - San Isidro)",
  "RHU 2 (Rural Health Unit - Poblacion)",
  "BHS Cadlan Health Station",
  "BHS San Agustin Health Station",
  "BHS Curry Health Station",
  "BHS Anayan Health Station",
  "BHS Himaao Health Station",
  "BHS Bagong Sirang Health Station",
  "BHS Binanuaanan Health Station",
  "Other / Unlisted Station",
]

type DispatchResult = {
  adminEmail: string
  senderName: string
  subject: string
  emailSent: boolean
  inSystemNotificationSent: boolean
  adminFound: boolean
  adminName: string | null
}

export function ContactAdminPage() {
  const navigate = useNavigate()
  const [adminEmail, setAdminEmail] = useState("")
  const [senderName, setSenderName] = useState("")
  const [senderEmail, setSenderEmail] = useState("")
  const [senderPhone, setSenderPhone] = useState("")
  const [facilityName, setFacilityName] = useState(PILI_FACILITIES[0])
  const [customFacility, setCustomFacility] = useState("")
  const [subject, setSubject] = useState(QUICK_ISSUES[0].subject)
  const [message, setMessage] = useState(QUICK_ISSUES[0].template)
  const [isUrgent, setIsUrgent] = useState(QUICK_ISSUES[0].isUrgent || false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<DispatchResult | null>(null)

  const handleSelectQuickIssue = (issue: QuickIssue) => {
    setSubject(issue.subject)
    setMessage(issue.template)
    setIsUrgent(issue.isUrgent || false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedAdminEmail = adminEmail.trim()
    const trimmedSenderName = senderName.trim()
    const trimmedSenderEmail = senderEmail.trim()
    const trimmedSenderPhone = senderPhone.trim()
    const finalFacility = facilityName === "Other / Unlisted Station" && customFacility.trim()
      ? customFacility.trim()
      : facilityName

    if (!trimmedAdminEmail) {
      toast.error("Missing Administrator Email", { description: "Please enter your administrator's email address." })
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(trimmedAdminEmail)) {
      toast.error("Invalid Admin Email", { description: "Please enter a valid administrator email address (e.g. admin@clinic.ph)." })
      return
    }

    if (!trimmedSenderName) {
      toast.error("Missing Name", { description: "Please enter your full name so your administrator can verify your identity." })
      return
    }

    if (!trimmedSenderEmail) {
      toast.error("Missing Email Address", { description: "Please enter your email address so the administrator can reply to you." })
      return
    }

    if (!emailPattern.test(trimmedSenderEmail)) {
      toast.error("Invalid Sender Email", { description: "Please enter a valid email address for yourself." })
      return
    }

    if (!message.trim()) {
      toast.error("Missing Message", { description: "Please provide the details of your request." })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await apiRequest<{
        message: string
        emailSent: boolean
        inSystemNotificationSent: boolean
        adminFound: boolean
        adminName: string | null
      }>("/auth/contact-admin", {
        method: "POST",
        body: JSON.stringify({
          adminEmail: trimmedAdminEmail,
          senderName: trimmedSenderName,
          senderEmail: trimmedSenderEmail,
          senderPhone: trimmedSenderPhone,
          senderContact: trimmedSenderPhone ? `${trimmedSenderEmail} • ${trimmedSenderPhone}` : trimmedSenderEmail,
          facilityName: finalFacility,
          subject: subject.trim(),
          message: message.trim(),
          priority: isUrgent ? "urgent" : "normal",
        }),
      })

      setResult({
        adminEmail: trimmedAdminEmail,
        senderName: trimmedSenderName,
        subject: subject.trim(),
        emailSent: response.emailSent,
        inSystemNotificationSent: response.inSystemNotificationSent,
        adminFound: response.adminFound,
        adminName: response.adminName,
      })

      toast.success("Dispatch Sent", {
        description: `Your assistance message was delivered to ${trimmedAdminEmail}.`,
      })
    } catch (error) {
      const errorMsg = error instanceof ApiError || error instanceof Error
        ? error.message
        : "Failed to dispatch message to clinic administrator. Please try again."
      toast.error("Dispatch Failed", { description: errorMsg })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetForm = () => {
    setResult(null)
    setMessage(QUICK_ISSUES[0].template)
    setSubject(QUICK_ISSUES[0].subject)
  }

  return (
    <main
      className="min-h-dvh w-full bg-background px-4 py-6 sm:px-6 lg:px-8 text-xs text-foreground flex flex-col justify-between"
      style={{ fontFamily: "'Inter Variable', Inter, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col justify-center">
        <div className="mb-4 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Sign In</span>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Pili Municipal Health Office</span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-primary/30 text-primary">
              Access Support
            </Badge>
          </div>
        </div>

        {result ? (
          <Card className="border-border/80 shadow-sm bg-card">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Assistance Request Dispatched
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Your message has been dispatched to your facility administrator. They have received your notification and will assist you shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="rounded-lg border border-border/80 bg-muted/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground font-medium">Recipient Administrator:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="size-3 text-primary" />
                    {result.adminEmail}
                    {result.adminName && <span className="text-muted-foreground font-normal">({result.adminName})</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground font-medium">Email Dispatch:</span>
                  <Badge variant={result.emailSent ? "default" : "outline"} className="text-[10px] gap-1">
                    {result.emailSent ? <CheckCircle2 className="size-3 text-emerald-300" /> : <AlertCircle className="size-3 text-amber-500" />}
                    {result.emailSent ? "Email Sent Successfully" : "Email Queued"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground font-medium">In-System Dashboard Notification:</span>
                  <Badge variant={result.inSystemNotificationSent ? "default" : "secondary"} className="text-[10px] gap-1">
                    {result.inSystemNotificationSent ? <CheckCircle2 className="size-3 text-emerald-300" /> : <HelpCircle className="size-3" />}
                    {result.inSystemNotificationSent ? "Logged to Admin Center" : "External Administrator"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-muted-foreground font-medium">Subject:</span>
                  <span className="text-foreground font-medium text-right max-w-xs truncate">{result.subject}</span>
                </div>
              </div>

              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-muted-foreground text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldAlert className="size-4 shrink-0 text-primary mt-0.5" />
                <p>
                  If you are experiencing an urgent patient care situation and require immediate system access, you may also contact your clinic head or visit the Rural Health Unit in person at the Pili Municipal Hall Complex.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetForm}
                  className="h-8 text-xs w-full sm:w-auto"
                >
                  Send Another Message
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate("/")}
                  className="h-8 text-xs w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Return to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/80 shadow-sm bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <img src={silangLogo} alt="" className="size-6 object-contain dark:hidden" />
                  <img src="/silang.svg" alt="" className="hidden size-6 object-contain dark:block" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Contact Clinic Administrator
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Send an official support message to request account recovery, credentials, or facility updates.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                  <div className="text-[11px] font-semibold text-foreground mb-1.5">
                    Quick Issue Pre-fills:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ISSUES.map((issue) => (
                      <button
                        key={issue.label}
                        type="button"
                        onClick={() => handleSelectQuickIssue(issue)}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                          subject === issue.subject
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {issue.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="admin-email" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Mail className="size-3 text-muted-foreground" />
                      <span>Administrator&apos;s Email</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="admin-email"
                      type="email"
                      required
                      placeholder="e.g. admin@clinic.ph or mho.pili@camsur.gov.ph"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="h-8 text-xs bg-muted/50 dark:bg-muted/40"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Enter the official email address of your RHU or BHS clinic administrator.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sender-name" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <User className="size-3 text-muted-foreground" />
                      <span>Your Full Name</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sender-name"
                      type="text"
                      required
                      placeholder="e.g. Maria Santos, RM"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      disabled={isSubmitting}
                      className="h-8 text-xs bg-muted/50 dark:bg-muted/40"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="sender-email" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Mail className="size-3 text-muted-foreground" />
                        <span>Your Email Address</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="sender-email"
                        type="email"
                        required
                        placeholder="e.g. maria.santos@clinic.ph"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        disabled={isSubmitting}
                        className="h-8 text-xs bg-muted/50 dark:bg-muted/40"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="sender-phone" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Phone className="size-3 text-muted-foreground" />
                        <span>Phone Number</span>
                        <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                      </Label>
                      <Input
                        id="sender-phone"
                        type="tel"
                        placeholder="e.g. 0917-xxx-xxxx"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        disabled={isSubmitting}
                        className="h-8 text-xs bg-muted/50 dark:bg-muted/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="facility-select" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Building2 className="size-3 text-muted-foreground" />
                      <span>Facility / Health Station</span>
                    </Label>
                    <select
                      id="facility-select"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      disabled={isSubmitting}
                      className="h-8 w-full rounded-md border border-input bg-muted/50 dark:bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {PILI_FACILITIES.map((fac) => (
                        <option key={fac} value={fac} className="bg-background text-foreground">
                          {fac}
                        </option>
                      ))}
                    </select>

                    {facilityName === "Other / Unlisted Station" && (
                      <Input
                        type="text"
                        placeholder="Specify your facility or station name"
                        value={customFacility}
                        onChange={(e) => setCustomFacility(e.target.value)}
                        disabled={isSubmitting}
                        className="h-8 text-xs bg-muted/50 dark:bg-muted/40 mt-1.5"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="message-subject" className="text-xs font-medium text-foreground">
                      Subject <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="message-subject"
                      type="text"
                      required
                      placeholder="Summary of your request"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={isSubmitting}
                      className="h-8 text-xs bg-muted/50 dark:bg-muted/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="message-body" className="text-xs font-medium text-foreground">
                        Message Body <span className="text-destructive">*</span>
                      </Label>
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isUrgent}
                          onChange={(e) => setIsUrgent(e.target.checked)}
                          className="rounded size-3 text-primary focus:ring-primary"
                        />
                        <span className={isUrgent ? "font-semibold text-destructive" : ""}>Mark as Urgent</span>
                      </label>
                    </div>
                    <Textarea
                      id="message-body"
                      required
                      rows={5}
                      placeholder="Explain your access issue or request with specific details..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isSubmitting}
                      className="text-xs bg-muted/50 dark:bg-muted/40 resize-y min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Mail className="size-3 text-primary" />
                    <span>Sends email & logs in-system notification</span>
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/")}
                      disabled={isSubmitting}
                      className="h-8 text-xs flex-1 sm:flex-initial"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="h-8 gap-1.5 text-xs flex-1 sm:flex-initial bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isSubmitting ? (
                        <>
                          <LoaderCircle className="size-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Send className="size-3.5" />
                          <span>Send Message & Alert</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="mt-6 text-center text-[11px] text-muted-foreground">
        Municipal Health Office • Pili, Camarines Sur • Central Clinical Support
      </footer>
    </main>
  )
}
