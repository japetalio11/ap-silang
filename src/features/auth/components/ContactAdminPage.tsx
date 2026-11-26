import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiRequest, ApiError } from "@/lib/api"
import { toast } from "sonner"

type QuickIssue = {
  label: string
  subject: string
  template: string
}

const QUICK_ISSUES: QuickIssue[] = [
  {
    label: "Account Locked",
    subject: "Account Locked / Password Reset Request",
    template: "Good day Admin, my account is currently locked out after multiple login attempts. Could you please trigger a password reset for my account so I can resume patient documentation?",
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<DispatchResult | null>(null)

  const handleSelectQuickIssue = (issue: QuickIssue) => {
    setSubject(issue.subject)
    setMessage(issue.template)
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
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-xl space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 gap-2 px-0 text-xs text-muted-foreground"><ArrowLeft className="size-4" /> Back to sign in</Button>
        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight">Contact your administrator</h1>
          <p className="text-xs text-muted-foreground">Send a request for help with your account or facility access.</p>
        </div>
        {result ? (
          <div className="space-y-4 rounded-lg border border-border p-5">
            <div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-green-500" /><h2 className="text-base font-semibold">Request sent</h2></div>
            <p className="text-xs text-muted-foreground">Your request was sent to {result.adminEmail}.</p>
            <div className="flex gap-3"><Button variant="outline" onClick={handleResetForm}>Send another</Button><Button onClick={() => navigate("/")}>Back to sign in</Button></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="admin-email">Administrator email <span className="text-destructive">*</span></Label><Input id="admin-email" type="email" placeholder="admin@clinic.ph" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} disabled={isSubmitting} className="text-xs/relaxed placeholder:text-xs/relaxed" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="sender-name">Your name <span className="text-destructive">*</span></Label><Input id="sender-name" placeholder="Maria Santos" value={senderName} onChange={e => setSenderName(e.target.value)} disabled={isSubmitting} className="text-xs/relaxed placeholder:text-xs/relaxed" /></div>
              <div className="space-y-1.5"><Label htmlFor="sender-email">Your email <span className="text-destructive">*</span></Label><Input id="sender-email" type="email" placeholder="maria@example.com" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} disabled={isSubmitting} className="text-xs/relaxed placeholder:text-xs/relaxed" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="sender-phone">Phone number <span className="font-normal text-muted-foreground">(Optional)</span></Label><Input id="sender-phone" type="tel" placeholder="0912 345 6789" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} disabled={isSubmitting} className="text-xs/relaxed placeholder:text-xs/relaxed" /></div>
              <div className="space-y-1.5"><Label htmlFor="facility-select">Facility</Label><Select value={facilityName} onValueChange={setFacilityName} disabled={isSubmitting}><SelectTrigger id="facility-select" className="w-full text-xs/relaxed"><SelectValue placeholder="Select facility" /></SelectTrigger><SelectContent position="popper">{PILI_FACILITIES.map(fac => <SelectItem key={fac} value={fac}>{fac}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {facilityName === "Other / Unlisted Station" && <div className="space-y-1.5"><Label htmlFor="custom-facility">Facility name</Label><Input id="custom-facility" placeholder="Enter facility name" value={customFacility} onChange={e => setCustomFacility(e.target.value)} className="text-xs/relaxed placeholder:text-xs/relaxed" /></div>}
            <div className="space-y-1.5"><Label htmlFor="issue-select">Reason</Label><Select value={subject} onValueChange={value => { const issue = QUICK_ISSUES.find(item => item.subject === value); if (issue) handleSelectQuickIssue(issue) }} disabled={isSubmitting}><SelectTrigger id="issue-select" className="w-full text-xs/relaxed"><SelectValue placeholder="Select a reason" /></SelectTrigger><SelectContent position="popper">{QUICK_ISSUES.map(issue => <SelectItem key={issue.subject} value={issue.subject}>{issue.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="message-body">Message <span className="text-destructive">*</span></Label><Textarea id="message-body" rows={4} placeholder="Describe what you need help with" value={message} onChange={e => setMessage(e.target.value)} disabled={isSubmitting} className="text-xs/relaxed placeholder:text-xs/relaxed" /></div>
            <div className="flex items-center justify-between gap-3 pt-2"><Button type="button" variant="outline" onClick={() => navigate("/")} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="size-4 animate-spin" /> Sending...</> : <><Send className="size-4" /> Send request</>}</Button></div>
          </form>
        )}
      </div>
    </main>
  )
}
