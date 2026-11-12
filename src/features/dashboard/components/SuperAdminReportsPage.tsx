import { useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  Baby,
  Download,
  Hospital,
  RefreshCw,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuthSession } from "@/features/auth/auth-session"
import { fetchMunicipalReports, type MunicipalReports } from "../api/superadmin-api"

const RISK_COLORS = ["#10b981", "#ef4444"]

export function SuperAdminReportsPage() {
  const { session } = useAuthSession()
  const [data, setData] = useState<MunicipalReports | null>(null)
  const [loading, setLoading] = useState(true)

  const loadReports = async () => {
    if (!session?.token) return
    setLoading(true)
    try {
      const reports = await fetchMunicipalReports(session.token)
      setData(reports)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load municipal reports"
      toast.error("Error loading reports", { description: message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [session?.token])

  const exportFhsisCsv = () => {
    if (!data) return
    const kpis = data.kpis
    const rows = [
      ["Silang Municipal Health Office - FHSIS Maternal & Child Health Summary"],
      ["Generated Date", new Date().toLocaleDateString()],
      [],
      ["Maternal Health Indicator", "Total Count", "Notes / DOH Form M Standards"],
      ["Total Registered Mothers in Registry", kpis.totalMothers.toString(), "Universal municipal registry"],
      ["Active Pregnancies Currently Monitored", kpis.activePregnancies.toString(), "In-progress gestational care"],
      ["Completed / Delivered Pregnancies", kpis.completedPregnancies.toString(), "Post-delivery or resolved"],
      ["High-Risk Pregnancies Flagged", kpis.highRiskPregnancies.toString(), "History of CS, PPH, or comorbidities"],
      ["Low-Risk Pregnancies", kpis.lowRiskPregnancies.toString(), "Standard maternal trajectory"],
      ["Total Recorded Deliveries", kpis.totalDeliveries.toString(), "Facility and community handovers"],
      ["Live Newborn Deliveries", kpis.liveBirths.toString(), "Alive at delivery"],
      ["Stillbirth Deliveries", kpis.stillBirths.toString(), "Fetal death recorded"],
      ["Immediate Breastfeeding Initiation Rate", `${kpis.breastfeedingRate}%`, "Initiated within 1 hour"],
      ["Total Inter-Facility Referrals Handled", kpis.totalReferrals.toString(), "Inter-clinic and apex hospital transfers"],
      [],
      ["Delivery Venues Breakdown", "Count"],
      ...data.deliveryPlaces.map((p) => [p.place, p.count.toString()]),
      [],
      ["Facility Care Breakdown", "Type", "Enrolled Mothers", "Referrals Sent", "Appointments"],
      ...data.facilitiesSummary.map((f) => [
        f.facility_name,
        f.type,
        f.enrolledMothers.toString(),
        f.referralsSent.toString(),
        f.appointments.toString(),
      ]),
    ]

    const csvContent = `\ufeff${rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\r\n")}`
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `Silang_Maternal_Health_FHSIS_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success("FHSIS summary CSV exported successfully")
  }

  const riskChartData = data
    ? [
        { name: "Low Risk", value: data.kpis.lowRiskPregnancies },
        { name: "High Risk", value: data.kpis.highRiskPregnancies },
      ]
    : []

  return (
    <section className="w-full space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Municipal Health Intelligence & FHSIS Reporting
          </h1>
          <p className="text-xs text-muted-foreground">
            Aggregated maternal care statistics, risk profiles, delivery outcomes, and DOH FHSIS reporting for Silang.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={exportFhsisCsv}
            disabled={loading || !data}
          >
            <Download className="size-3.5" />
            Export FHSIS CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              loadReports()
              toast.success("Reports refreshed")
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Enrolled Mothers</CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{data?.kpis.totalMothers ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">Across all barangay catchment areas</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Pregnancies</CardTitle>
            <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{data?.kpis.activePregnancies ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">Receiving scheduled prenatal care</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">High-Risk Cases</CardTitle>
            <AlertTriangle className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{data?.kpis.highRiskPregnancies ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">Flagged for specialized obstetric care</p>
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Deliveries</CardTitle>
            <Baby className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{data?.kpis.totalDeliveries ?? 0}</div>
            <p className="text-[11px] text-muted-foreground">
              {data?.kpis.breastfeedingRate ?? 0}% immediate breastfeeding
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-sidebar-border bg-card">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Maternal Risk Level Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">
              Proportion of low-risk vs high-risk pregnancies requiring tertiary referral.
            </p>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Loading analytics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {riskChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-sidebar-border bg-card">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Delivery Locations Recorded</CardTitle>
            <p className="text-xs text-muted-foreground">
              Distribution of births across RHUs, hospitals, and community sites.
            </p>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Loading analytics...
              </div>
            ) : !data?.deliveryPlaces.length ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No delivery outcomes recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.deliveryPlaces}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="place" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#003f2c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-sidebar-border bg-card">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Facility Care & Catchment Breakdown</CardTitle>
          <p className="text-xs text-muted-foreground">
            Operational distribution across Rural Health Units and Barangay Health Stations in Silang.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Enrolled Mothers</TableHead>
                <TableHead className="text-right">Referrals Sent</TableHead>
                <TableHead className="text-right">Appointments Logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                    Loading facility metrics...
                  </TableCell>
                </TableRow>
              ) : !data?.facilitiesSummary.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                    No facilities registered.
                  </TableCell>
                </TableRow>
              ) : (
                data.facilitiesSummary.map((f) => (
                  <TableRow key={f.facility_id}>
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <Hospital className="size-3.5 text-primary" />
                        {f.facility_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium">
                        {f.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">{f.enrolledMothers}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{f.referralsSent}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{f.appointments}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
