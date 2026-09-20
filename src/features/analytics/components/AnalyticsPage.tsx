import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, PieChart, Pie, Cell, Legend, XAxis, YAxis, CartesianGrid } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Droplet, Activity, Target, Users } from "lucide-react"

const LOCATION_YIELD_DATA = [
  { rank: 1, location: "Bagumbayan Sur, Naga City", donors: 450, units: 410 },
  { rank: 2, location: "San Felipe, Naga City", donors: 380, units: 350 },
  { rank: 3, location: "Concepcion Pequeña, Naga City", donors: 310, units: 295 },
  { rank: 4, location: "Peñafrancia, Naga City", donors: 240, units: 220 },
  { rank: 5, location: "Pacol, Naga City", donors: 150, units: 140 },
]

const STAKEHOLDER_DATA = [
  { partner: "Naga City LGU", clicks: 1200, reserved: 450, successful: 410 },
  { partner: "Ateneo de Naga", clicks: 850, reserved: 380, successful: 350 },
  { partner: "Bicol University", clicks: 640, reserved: 290, successful: 275 },
  { partner: "Rotary Club Naga", clicks: 420, reserved: 150, successful: 145 },
]

const LINE_CHART_DATA = [
  { month: "Jan", campaigns: 150, walkins: 80 },
  { month: "Feb", campaigns: 230, walkins: 120 },
  { month: "Mar", campaigns: 180, walkins: 90 },
  { month: "Apr", campaigns: 290, walkins: 150 },
  { month: "May", campaigns: 200, walkins: 110 },
  { month: "Jun", campaigns: 320, walkins: 170 },
]

const PIE_CHART_DATA = [
  { name: "Advocacy", value: 275 },
  { name: "Blood Drive", value: 200 },
  { name: "Training", value: 187 },
  { name: "Walk-in", value: 173 },
]

const PIE_COLORS = ["#404040", "#737373", "#a3a3a3", "#d4d4d4"] // Grays

const pieChartConfig = {
  Advocacy: { label: "Advocacy", color: PIE_COLORS[0] },
  "Blood Drive": { label: "Blood Drive", color: PIE_COLORS[1] },
  Training: { label: "Training", color: PIE_COLORS[2] },
  "Walk-in": { label: "Walk-in", color: PIE_COLORS[3] },
}

export function AnalyticsPage() {
  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-y-auto bg-background dark:bg-black text-foreground relative">
      <div className="flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        {/* Executive Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 border border-sidebar-border rounded-xl bg-card dark:bg-[#0a0a0a] shadow-sm mb-6">
          
          {/* Metric 1 */}
          <div className="flex flex-col p-6 border-b md:border-b-0 md:border-r border-sidebar-border">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-semibold text-foreground dark:text-white">Total Blood Units</span>
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <Droplet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground dark:text-white mt-1">1,265</div>
            <p className="text-[11px] font-medium text-[#22C55E] mt-1">+12.5% from last month</p>
          </div>

          {/* Metric 2 */}
          <div className="flex flex-col p-6 border-b md:border-b-0 md:border-r border-sidebar-border">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-semibold text-foreground dark:text-white">Active Donor Pool</span>
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground dark:text-white mt-1">3,842</div>
            <p className="text-[11px] font-medium text-[#22C55E] mt-1">+5.2% from last month</p>
          </div>

          {/* Metric 3 */}
          <div className="flex flex-col p-6 border-b md:border-b-0 md:border-r border-sidebar-border">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-semibold text-foreground dark:text-white">Goal Attainment</span>
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground dark:text-white mt-1">92%</div>
            <p className="text-[11px] font-medium text-red-500 mt-1">-2.1% from last month</p>
          </div>

          {/* Metric 4 */}
          <div className="flex flex-col p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-semibold text-foreground dark:text-white">Capacity Utilization</span>
              <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground dark:text-white mt-1">84%</div>
            <p className="text-[11px] font-medium text-[#22C55E] mt-1">+1.4% from last month</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-2 flex flex-col pt-6 pb-6 rounded-xl border border-sidebar-border bg-card dark:bg-[#0a0a0a] shadow-sm overflow-hidden w-full h-full">
            <div className="flex items-center justify-between px-6 pb-4">
              <span className="text-sm font-semibold text-foreground dark:text-white">Donation Trends</span>
              <Select defaultValue="2026">
                <SelectTrigger className="w-[85px] h-8 text-xs bg-transparent border-sidebar-border focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-h-[300px] px-6">
              <ChartContainer config={{ 
                  campaigns: { label: "Campaigns", color: "hsl(var(--foreground))" },
                  walkins: { label: "Walk-ins", color: "hsl(var(--muted-foreground))" }
                }} className="w-full h-full">
                <LineChart data={LINE_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} />
                  <YAxis tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="campaigns" stroke="var(--color-campaigns)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-campaigns)" }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="walkins" stroke="var(--color-walkins)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-walkins)" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ChartContainer>
            </div>
          </div>

          <div className="xl:col-span-1 flex flex-col pt-6 pb-6 rounded-xl border border-sidebar-border bg-card dark:bg-[#0a0a0a] shadow-sm overflow-hidden w-full h-full">
            <div className="flex items-center justify-between px-6 pb-2">
              <span className="text-sm font-semibold text-foreground dark:text-white">Donations by Type</span>
            </div>
            <div className="flex-1 min-h-[300px] px-2 flex items-center justify-center">
              <ChartContainer config={pieChartConfig} className="w-full h-[300px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={PIE_CHART_DATA}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ value }) => `${value}`}
                    labelLine={true}
                    stroke="none"
                  >
                    {PIE_CHART_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ChartContainer>
            </div>
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-0 pt-6 pb-6 rounded-xl border border-sidebar-border bg-card dark:bg-[#0a0a0a] shadow-sm overflow-hidden w-full h-full">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground dark:text-white px-6 pb-4">
              Yield by Location
            </div>
            <div className="overflow-x-auto w-full px-2">
              <Table>
                <TableHeader className="bg-muted/50 dark:bg-black/50">
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead className="w-[80px]">Rank</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Total Donors</TableHead>
                    <TableHead className="text-right">Blood Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {LOCATION_YIELD_DATA.map((item) => (
                    <TableRow key={item.rank} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5">
                      <TableCell className="font-medium text-foreground dark:text-white">#{item.rank}</TableCell>
                      <TableCell className="text-muted-foreground">{item.location}</TableCell>
                      <TableCell className="text-right text-foreground dark:text-white">{item.donors}</TableCell>
                      <TableCell className="text-right font-bold text-foreground dark:text-white">{item.units}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-0 pt-6 pb-6 rounded-xl border border-sidebar-border bg-card dark:bg-[#0a0a0a] shadow-sm overflow-hidden w-full h-full">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground dark:text-white px-6 pb-4">
              Stakeholder Link Engagement
            </div>
            <div className="overflow-x-auto w-full px-2">
              <Table>
                <TableHeader className="bg-muted/50 dark:bg-black/50">
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead>Partner Name</TableHead>
                    <TableHead className="text-right">Link Clicks</TableHead>
                    <TableHead className="text-right">Reserved Slots</TableHead>
                    <TableHead className="text-right">Successful</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STAKEHOLDER_DATA.map((item, idx) => (
                    <TableRow key={idx} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5">
                      <TableCell className="font-medium text-foreground dark:text-white">{item.partner}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.clicks}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.reserved}</TableCell>
                      <TableCell className="text-right font-bold text-foreground dark:text-white">{item.successful}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
