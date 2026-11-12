import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import type { DateRange } from "react-day-picker"
import type { AppEvent } from "./types"

export function ExportCalendarModal({ children, events = [], viewDate = new Date(), view = "month" }: { children: React.ReactNode; events?: AppEvent[]; viewDate?: Date; view?: string }) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [fileFormat, setFileFormat] = React.useState("pdf")
  const [rangeType, setRangeType] = React.useState("current")

  const exportEvents = () => {
    let filtered = events.filter((event) => event.start)
    if (rangeType === "current") {
      filtered = filtered.filter((event) => view === "week"
        ? event.start! >= new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - ((viewDate.getDay() + 6) % 7)) && event.start! < new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - ((viewDate.getDay() + 6) % 7) + 5)
        : event.start!.getMonth() === viewDate.getMonth() && event.start!.getFullYear() === viewDate.getFullYear())
    } else if (rangeType === "next30") {
      const now = new Date()
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((event) => event.start! >= now && event.start! <= end)
    } else if (rangeType === "custom" && dateRange?.from) {
      const from = new Date(dateRange.from)
      const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from)
      to.setHours(23, 59, 59, 999)
      filtered = filtered.filter((event) => event.start! >= from && event.start! <= to)
    }
    const rows = filtered.map((event) => ({
      mother: event.patient || event.title || "",
      date: event.start ? format(event.start, "yyyy-MM-dd") : "",
      time: event.start ? format(event.start, "h:mm a") : "",
      appointmentType: event.appointmentType || "",
      status: event.status || "",
      facility: event.venue || "",
    }))
    const fileBase = `appointments-${format(viewDate, "yyyy-MM-dd")}`
    if (fileFormat === "json") {
      downloadFile(JSON.stringify(rows, null, 2), `${fileBase}.json`, "application/json;charset=utf-8")
      toast.success(`Exported ${rows.length} appointments`)
      return
    }
    if (fileFormat === "csv") {
      const columns = ["Mother", "Date", "Time", "Appointment Type", "Status", "Facility"]
      const csv = [columns, ...rows.map((row) => [row.mother, row.date, row.time, row.appointmentType, row.status, row.facility])]
        .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n")
      downloadFile(`\uFEFF${csv}`, `${fileBase}.csv`, "text/csv;charset=utf-8")
      toast.success(`Exported ${rows.length} appointments`)
      return
    }
    const printWindow = window.open("", "_blank")
    if (!printWindow) { toast.error("Allow pop-ups to print the appointment schedule"); return }
    const bodyRows = rows.map((row) => `<tr><td>${escapeHtml(row.mother)}</td><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.time)}</td><td>${escapeHtml(row.appointmentType)}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.facility)}</td></tr>`).join("")
    printWindow.document.write(`<!doctype html><html><head><title>Appointment Schedule</title><style>body{font:14px Arial,sans-serif;margin:32px;color:#111}h1{font-size:20px}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}th{background:#f3f4f6}</style></head><body><h1>Appointment Schedule</h1><p>${rows.length} appointments</p><table><thead><tr><th>Mother</th><th>Date</th><th>Time</th><th>Appointment type</th><th>Status</th><th>Facility</th></tr></thead><tbody>${bodyRows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`)
    printWindow.document.close()
    toast.success(`Prepared ${rows.length} appointments for printing`)
  }

  const downloadFile = (content: string, name: string, mimeType: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character)

  return (
    <ResponsiveModal 
      trigger={children}
      title="Export Calendar Data"
      description="Download a generated report based on your current filters."
    >
        
        <div className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">File Format</h4>
            <RadioGroup value={fileFormat} onValueChange={setFileFormat} className="gap-2.5">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="format-pdf" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="format-pdf" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">PDF Document</span> <span className="text-muted-foreground">Best for printing and sharing</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="format-csv" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="format-csv" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">CSV</span> <span className="text-muted-foreground">Raw schedule data</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">Date Range</h4>
            <RadioGroup value={rangeType} onValueChange={setRangeType} className="gap-2.5">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="current" id="range-current" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="range-current" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">Current View</span> <span className="text-muted-foreground">(June 2026)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="next30" id="range-next30" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="range-next30" className="text-xs font-normal text-foreground dark:text-white">
                  Next 30 Days
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2 mr-2">
                  <RadioGroupItem value="custom" id="range-custom" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                  <Label htmlFor="range-custom" className="text-xs font-normal text-foreground dark:text-white whitespace-nowrap">
                    Custom Range
                  </Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-[200px] justify-start text-left font-normal bg-transparent border-sidebar-border h-7 text-xs ${!dateRange ? "text-muted-foreground" : "text-foreground dark:text-white"}`}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">Visual Layout</h4>
            <RadioGroup defaultValue="weekly" className="gap-2.5">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="layout-weekly" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="layout-weekly" className="text-xs font-normal text-foreground dark:text-white">
                  Weekly Schedule
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="layout-month" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:text-primary dark:data-[state=checked]:border-white dark:data-[state=checked]:text-foreground dark:text-white h-3.5 w-3.5" />
                <Label htmlFor="layout-month" className="text-xs font-normal text-foreground dark:text-white">
                  Month Grid
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">Event Details to Show</h4>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center space-x-2">
                <Checkbox id="detail-title" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black h-3.5 w-3.5 rounded-full" />
                <Label htmlFor="detail-title" className="text-xs font-normal text-foreground dark:text-white">
                  Appointment, Mother & Provider
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="detail-location" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black h-3.5 w-3.5 rounded-full" />
                <Label htmlFor="detail-location" className="text-xs font-normal text-foreground dark:text-white">
                  Location & Venue
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="detail-staff" className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black h-3.5 w-3.5 rounded-full" />
                <Label htmlFor="detail-staff" className="text-xs font-normal text-foreground dark:text-white">
                  Assigned Staff
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Button variant="secondary" className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white h-8">
            Cancel
          </Button>
          <Button onClick={exportEvents} className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-8">
            Export Calendar
          </Button>
        </div>
    </ResponsiveModal>
  )
}

