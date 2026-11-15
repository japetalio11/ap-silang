import { useState, useEffect } from "react"
import {
  Shield,
  FileText,
  Lock,
  HeartHandshake,
  AlertTriangle,
  Building2,
  Mail,
  MapPin,
  ExternalLink,
  CheckCircle2,
} from "lucide-react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type LegalModalTab = "terms" | "privacy" | "consent"

interface AuthLegalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: LegalModalTab
}

export function AuthLegalModal({
  open,
  onOpenChange,
  initialTab = "terms",
}: AuthLegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalModalTab>(initialTab)

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex flex-wrap items-center gap-2 pr-6">
          <span className="text-base font-semibold tracking-tight text-foreground">
            Legal & Regulatory Governance
          </span>
          <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-primary/30 text-primary">
            RA 10173 & DOH Compliant
          </Badge>
        </div>
      }
      description={
        <span className="text-xs text-muted-foreground">
          Pili Municipal Health Office • Electronic Medical Records & Data Privacy Standards
        </span>
      }
      className="sm:max-w-2xl lg:max-w-3xl"
    >
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as LegalModalTab)}
        className="w-full flex flex-col min-h-0"
      >
        <div className="border-b border-border/60 pb-2">
          <TabsList className="grid grid-cols-3 w-full h-9 bg-muted/60 p-1">
            <TabsTrigger value="terms" className="text-xs flex items-center justify-center gap-1.5">
              <FileText className="size-3.5 text-muted-foreground" />
              <span>Terms of Service</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs flex items-center justify-center gap-1.5">
              <Lock className="size-3.5 text-muted-foreground" />
              <span>Health Data Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="consent" className="text-xs flex items-center justify-center gap-1.5">
              <HeartHandshake className="size-3.5 text-muted-foreground" />
              <span>Clinical Consent</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="max-h-[62dvh] overflow-y-auto overscroll-contain pr-1 py-3 text-xs leading-relaxed text-muted-foreground space-y-4">
          <TabsContent value="terms" className="space-y-4 mt-0 focus-visible:outline-none">
            <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
              <div className="flex items-start gap-2.5">
                <Building2 className="size-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground">Municipal Health Platform Operating Agreement</h4>
                  <p className="mt-0.5 text-muted-foreground">
                    Operated by the Municipal Health Office of Pili, Camarines Sur across Rural Health Units (RHU 1, RHU 2) and Barangay Health Stations (BHS) in accordance with the Local Government Code (RA 7160) and Universal Health Care Act (RA 11223).
                  </p>
                </div>
              </div>
            </div>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">1. User Eligibility & Authorized Clinical Credentials</span>
                <Badge variant="secondary" className="text-[10px] font-mono">RBAC Protocol</Badge>
              </div>
              <p>
                Access to the Pili municipal health portal is strictly granted to authorized healthcare personnel (licensed physicians, registered midwives, public health nurses, barangay health workers, medical technologists) and designated municipal health administrators. Users must hold verified institutional credentials. Account sharing, credential pooling, or logging in on behalf of unauthorized third parties is strictly prohibited.
              </p>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">2. Professional Standard of Care & Clinical Documentation</span>
                <Badge variant="secondary" className="text-[10px] font-mono">DOH AO 2010-0036</Badge>
              </div>
              <p>
                The platform functions as an Electronic Medical Records (EMR) system under Department of Health guidelines. Practitioners are legally and professionally accountable for the timeliness, veracity, and completeness of all clinical entries, including gravidity, parity, vital signs, lab screenings, and consultation findings. All entries must reflect actual physical or telemedicine assessments conducted with the patient.
              </p>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">3. Clinical Decision Support System (CDSS) Advisory Disclaimer</span>
                <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-600 dark:text-amber-400">Advisory Only</Badge>
              </div>
              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-foreground/90">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p>
                    The platform incorporates algorithmic Clinical Decision Support Systems (CDSS) for automated risk stratification (Normal, Moderate, High Risk) and perinatal warning detection (preeclampsia, gestational hypertension, gestational diabetes, anemia). CDSS alerts serve solely as auxiliary clinical recommendations. They do not replace, supersede, or substitute for the independent diagnostic judgment of a licensed physician or registered midwife.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">4. Emergency Intrapartum & Acute Care Limitation</span>
                <Badge variant="destructive" className="text-[10px] font-mono">Emergency Protocol</Badge>
              </div>
              <p>
                This platform is an ambulatory care coordination and electronic health documentation suite; it is not an emergency dispatch or continuous patient resuscitation system. In cases of acute maternal hemorrhage, severe preeclampsia, eclamptic seizures, obstructed labor, or fetal distress, attending personnel must immediately initiate local emergency transport protocols to designated Comprehensive Emergency Obstetric and Newborn Care (CEmONC) referral hospitals.
              </p>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">5. Device Custody, Offline Caching & PIN Security</span>
                <Badge variant="secondary" className="text-[10px] font-mono">ISO 27799 § 9</Badge>
              </div>
              <p>
                To support uninterrupted healthcare delivery during rural power or connectivity outages across Pili barangays, the application caches encrypted maternal health records locally via client-side IndexedDB storage (Dexie). Users operating municipal tablets, laptops, or desktop workstations must:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Maintain physical possession and visual custody of devices containing cached patient records.</li>
                <li>Never disclose or share their 4-digit offline authentication PIN.</li>
                <li>Ensure automatic screen-lock timeouts are configured on all clinic terminals.</li>
                <li>Immediately lock or sign out of the active workspace prior to leaving physical workstations unattended.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">6. Prohibited Conduct & Cybercrime Compliance</span>
                <Badge variant="secondary" className="text-[10px] font-mono">RA 10175</Badge>
              </div>
              <p>
                Under the Cybercrime Prevention Act of 2012 (Republic Act No. 10175), unauthorized system access, illegal interception of clinical transmissions, intentional data interference, introduction of malicious software, and curiosity-driven browsing of patient charts outside one&apos;s direct care responsibilities constitute criminal offenses subject to institutional sanctions, administrative revocation of license, and criminal prosecution.
              </p>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">7. Immutable Audit Logging</span>
                <Badge variant="secondary" className="text-[10px] font-mono">HIPAA § 164.312(b)</Badge>
              </div>
              <p>
                Every action executed on the platform—including authentication attempts, patient chart lookups, vital sign entries, laboratory result views, inter-facility referral handovers, and password modifications—is immutably recorded with UTC timestamps, user identity, facility assignment, and network IP addresses. Audit logs are continuously reviewed by the Municipal Data Protection Officer.
              </p>
            </section>

            <section className="space-y-1.5">
              <span className="font-semibold text-foreground">8. Inactivity, Suspension & Credential Revocation</span>
              <p>
                User sessions automatically time out after prolonged inactivity. User accounts are systematically suspended or revoked upon resignation, retirement, reassignment outside the municipality, or pending disciplinary proceedings regarding breach of patient confidentiality.
              </p>
            </section>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4 mt-0 focus-visible:outline-none">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-start gap-2.5">
                <Shield className="size-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground">Philippine Data Privacy Act (RA 10173) & NPC Alignment</h4>
                  <p className="mt-0.5 text-muted-foreground">
                    The Municipal Health Office of Pili, Camarines Sur acts as the Personal Information Controller (PIC). We process Personal Information and Sensitive Personal Information (SPI) strictly adhering to the principles of Transparency, Legitimate Purpose, and Proportionality.
                  </p>
                </div>
              </div>
            </div>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">1. Legal Basis for Processing Health Information</span>
                <Badge variant="secondary" className="text-[10px] font-mono">RA 10173 Sec. 12 & 13</Badge>
              </div>
              <p>
                Processing of maternal and neonatal health data is carried out under the statutory authority of:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Section 13(a)</strong>: Explicit informed consent provided by the patient or authorized representative upon clinical intake.</li>
                <li><strong className="text-foreground">Section 13(c)</strong>: Protection of vital interests, maternal life, and neonatal health during medical urgency.</li>
                <li><strong className="text-foreground">Section 13(f)</strong>: Medical treatment and healthcare operations carried out by licensed medical practitioners, midwives, and public health facilities.</li>
                <li><strong className="text-foreground">GDPR Article 9(2)(h) & Article 6(1)(c)</strong>: Healthcare diagnosis, health treatment, and compliance with statutory public health mandates.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">2. Inventory of Sensitive Personal Information (SPI) Collected</span>
                <Badge variant="secondary" className="text-[10px] font-mono">Data Minimization</Badge>
              </div>
              <p>
                Under the principle of proportionality, the platform collects only the minimal information necessary for obstetric care:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                <div className="rounded border border-border/70 p-2.5 bg-background">
                  <div className="font-medium text-foreground mb-1">Demographic Identifiers</div>
                  <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                    <li>• Full legal name, civil status, date of birth, age</li>
                    <li>• Complete residential address (Barangay, Sitio in Pili, Cam Sur)</li>
                    <li>• Active mobile contact number</li>
                    <li>• PhilHealth Identification Number (PIN)</li>
                    <li>• Emergency contact & next-of-kin details</li>
                  </ul>
                </div>
                <div className="rounded border border-border/70 p-2.5 bg-background">
                  <div className="font-medium text-foreground mb-1">Obstetric & Clinical Records</div>
                  <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                    <li>• Gravida, Para, Full-term, Pre-term, Abortion, Living (GPFPAL)</li>
                    <li>• Last Menstrual Period (LMP) & Estimated Delivery Date (EDD)</li>
                    <li>• Blood pressure, pulse, temperature, fundic height, fetal heart rate</li>
                    <li>• Lab screens: CBC, Blood typing, Urinalysis, HBsAg, Syphilis, HIV</li>
                    <li>• Ultrasound reports, clinical notes, CDSS risk badges</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">3. Multi-Tenant Facility Isolation & Role-Based Segregation</span>
                <Badge variant="secondary" className="text-[10px] font-mono">HIPAA Minimum Necessary</Badge>
              </div>
              <p>
                The platform enforces strict facility-level data partitioning across Pili. Healthcare workers assigned to a specific Rural Health Unit or Barangay Health Station are cryptographically and logically restricted to viewing records of patients registered under their primary facility or actively referred to their clinic. SuperAdministrators supervise municipal infrastructure, accounts, and audit trails, with strictly disabled clinical record mutation capabilities.
              </p>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">4. Strict Prohibition of Commercialization & Third-Party Sale</span>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-600 dark:text-emerald-400">Zero Commercialization</Badge>
              </div>
              <p>
                Patient health records are strictly confidential and protected by doctor-patient and midwife-patient privileged communication. The Municipal Health Office never sells, rents, monetizes, or shares health data with commercial advertisers, pharmaceutical marketing representatives, consumer profiling brokers, or insurance underwriters.
              </p>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">5. Data Retention & Statutory Medical Record Archival</span>
                <Badge variant="secondary" className="text-[10px] font-mono">DOH Retention Rules</Badge>
              </div>
              <p>
                In compliance with Philippine Department of Health (DOH) medical record retention standards (DOH DC No. 70 s. 1996 and hospital licensing regulations):
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">General Adult Records:</strong> Retained for a minimum period of ten (10) years following the final recorded clinical encounter.</li>
                <li><strong className="text-foreground">Obstetric & Delivery Records:</strong> Retained until the child reaches the legal age of majority (18 years) plus the ten-year statutory prescription period—constituting a mandatory retention timeframe of at least twenty-eight (28) years.</li>
                <li><strong className="text-foreground">Archival & Disposal:</strong> Expired records are disposed of via secure cryptographic data shredding and certified electronic file purging.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">6. Data Subject Rights under RA 10173 Section 16</span>
                <Badge variant="secondary" className="text-[10px] font-mono">DPA Bill of Rights</Badge>
              </div>
              <p>
                Every registered patient is entitled to the full protections of Philippine data privacy legislation:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Right to be Informed:</strong> To understand how their health information is gathered, analyzed, and shared.</li>
                <li><strong className="text-foreground">Right to Access:</strong> To request inspection or certified copies of their maternal health chart.</li>
                <li><strong className="text-foreground">Right to Rectification:</strong> To challenge and correct inaccurate, outdated, or erroneous clinical documentation.</li>
                <li><strong className="text-foreground">Right to Erasure or Blocking:</strong> To request removal of data processed unlawfully, subject to statutory medical retention mandates.</li>
                <li><strong className="text-foreground">Right to Damages:</strong> To be indemnified for damages incurred due to inaccurate, incomplete, or unauthorized processing.</li>
                <li><strong className="text-foreground">Right to File a Complaint:</strong> To lodge formal complaints before the National Privacy Commission (NPC).</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">7. Mandatory 72-Hour Security Breach Notification</span>
                <Badge variant="destructive" className="text-[10px] font-mono">NPC Circ. 16-03</Badge>
              </div>
              <p>
                Pursuant to NPC Circular 16-03 and international breach management protocols (GDPR Art. 33), in the event of confirmed unauthorized acquisition or accidental disclosure of Sensitive Personal Information, the Municipal Health Office will notify the National Privacy Commission and affected data subjects within seventy-two (72) hours of verification.
              </p>
            </section>

            <section className="rounded-lg border border-border/80 bg-muted/40 p-3 space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="size-4 text-primary" />
                <span>Data Protection Officer (DPO) Contact Channel</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                To exercise data privacy rights, submit inquiries, or report security incidents, contact:
              </p>
              <div className="text-[11px] space-y-1 text-foreground/90 pl-1 border-l-2 border-primary/40">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <span>Municipal Health Office, Municipality of Pili</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span>Municipal Hall Complex, San Isidro, Pili, Camarines Sur 4418, Philippines</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  <span>Email: <a href="mailto:dpo.pili@camsur.gov.ph" className="text-primary hover:underline">dpo.pili@camsur.gov.ph</a> • <a href="mailto:mho.pili@camsur.gov.ph" className="text-primary hover:underline">mho.pili@camsur.gov.ph</a></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                  <span>National Privacy Commission: <a href="mailto:complaints@privacy.gov.ph" className="text-primary hover:underline">complaints@privacy.gov.ph</a></span>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="consent" className="space-y-4 mt-0 focus-visible:outline-none">
            <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
              <div className="flex items-start gap-2.5">
                <HeartHandshake className="size-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground">Informed Clinical Consent & Care Coordination Governance</h4>
                  <p className="mt-0.5 text-muted-foreground">
                    Explicit consent authorizations granted by mothers during enrollment into the Pili Maternal Care Network under RA 10173 Section 13(a) and the Universal Health Care Act (RA 11223).
                  </p>
                </div>
              </div>
            </div>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">1. Comprehensive Prenatal & Postpartum Care Tracking</span>
                <Badge variant="secondary" className="text-[10px] font-mono">Continuity of Care</Badge>
              </div>
              <p>
                Consent authorizes registered midwives, public health nurses, and medical officers to conduct regular perinatal assessments, record vital indicators, document obstetric history, and maintain longitudinal medical files across all gestational trimesters and postpartum follow-ups.
              </p>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">2. Inter-Clinic Referrals & Apex Hospital Handover</span>
                <Badge variant="secondary" className="text-[10px] font-mono">HIE Protocol</Badge>
              </div>
              <p>
                When a pregnant patient is identified with high-risk clinical factors (e.g. preeclampsia, previous cesarean delivery, gestational diabetes, malpresentation), consent authorizes the electronic transfer of clinical handover summaries, vital sign trends, and ultrasound/lab records between Barangay Health Stations, Rural Health Units, and designated provincial tertiary referral facilities (such as Bicol Medical Center or Camarines Sur Provincial Hospital).
              </p>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">3. Automated SMS Gateway Alerts & Telehealth Reminders</span>
                <Badge variant="secondary" className="text-[10px] font-mono">Telecommunications</Badge>
              </div>
              <p>
                Patients consent to receiving non-marketing, clinical-only automated SMS reminders to their registered mobile numbers for:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Upcoming prenatal and postpartum appointment dates.</li>
                <li>Tetanus toxoid immunization schedules and laboratory testing reminders.</li>
                <li>Ferrous sulfate, folic acid, and calcium micronutrient supplementation schedules.</li>
                <li>Critical weather or public health immunization drives.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">4. Emergency Clinical Override (&quot;Break-Glass&quot;)</span>
                <Badge variant="outline" className="text-[10px] font-mono border-destructive/40 text-destructive">Emergency Exception</Badge>
              </div>
              <p>
                In scenarios where a patient arrives in active labor, eclamptic shock, or altered consciousness without accompanied relatives, licensed emergency medical personnel are legally authorized under RA 10173 Section 13(c) to access critical obstetric history and blood typing data to preserve maternal and fetal life.
              </p>
            </section>

            <section className="space-y-1.5">
              <span className="font-semibold text-foreground">5. Voluntary Withdrawal & Effects on Care</span>
              <p>
                Patients retain the right to withdraw voluntary consent for optional features (such as automated SMS reminders) at any time through their assigned health worker. Statutory public health reporting and mandatory clinical documentation for services already rendered remain protected under DOH licensing mandates.
              </p>
            </section>
          </TabsContent>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-primary shrink-0" />
            <span>Effective: November 2026 • Municipal Health Office of Pili, Camarines Sur</span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 text-xs w-full sm:w-auto"
          >
            I Understand & Acknowledge
          </Button>
        </div>
      </Tabs>
    </ResponsiveModal>
  )
}
