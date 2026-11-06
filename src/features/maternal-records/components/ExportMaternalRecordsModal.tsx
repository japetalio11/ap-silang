import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type MaternalExportOptions = {
  format: "csv" | "pdf" | "json"
  scope: "filtered" | "all"
  fieldDepth: "standard" | "comprehensive"
  risk: string
}

export function ExportMaternalRecordsModal({ open, onOpenChange, exportCount, allCount, onExport }: { open: boolean; onOpenChange: (open: boolean) => void; exportCount: number; allCount: number; onExport: (options: MaternalExportOptions) => void }) {
  const [format, setFormat] = useState("csv")
  const [scope, setScope] = useState("filtered")
  const [fieldDepth, setFieldDepth] = useState("standard")
  const [risk, setRisk] = useState("all")
  const activeCount = scope === "all" ? allCount : exportCount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-md gap-4 overflow-y-auto rounded-xl border-sidebar-border bg-background p-5 text-foreground sm:max-w-md">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base font-semibold">Export Maternal Registry</DialogTitle>
          <DialogDescription className="text-xs">Generate a report from the active maternal register.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="maternal-export-format-label" className="flex min-w-0 flex-col gap-1.5">
            <h3 id="maternal-export-format-label" className="text-xs font-medium text-foreground dark:text-white">Export Format</h3>
            <Tabs value={format} onValueChange={setFormat} className="w-full">
              <TabsList className="h-9 w-full justify-between gap-1">
                <TabsTrigger value="csv" className="px-2 text-xs">CSV</TabsTrigger>
                <TabsTrigger value="pdf" className="px-2 text-xs">PDF</TabsTrigger>
                <TabsTrigger value="json" className="px-2 text-xs">JSON</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {format === "csv" ? "Spreadsheet" : format === "pdf" ? "Printable registry sheet" : "Raw JSON backup"}
            </p>
          </section>

          <section aria-labelledby="maternal-export-scope-label" className="flex min-w-0 flex-col gap-1.5">
            <h3 id="maternal-export-scope-label" className="text-xs font-medium text-foreground dark:text-white">Data Scope</h3>
            <RadioGroup value={scope} onValueChange={setScope} className="gap-2 sm:grid-cols-2">
              <Label htmlFor="maternal-scope-filtered" className="flex cursor-pointer items-center gap-2.5 font-normal">
                <RadioGroupItem id="maternal-scope-filtered" value="filtered" />
                <span className="text-xs">Filtered View <span className="text-muted-foreground">({exportCount} mothers)</span></span>
              </Label>
              <Label htmlFor="maternal-scope-all" className="flex cursor-pointer items-center gap-2.5 font-normal">
                <RadioGroupItem id="maternal-scope-all" value="all" />
                <span className="text-xs">Full Registry <span className="text-muted-foreground">({allCount} mothers)</span></span>
              </Label>
            </RadioGroup>
          </section>

          <section aria-labelledby="maternal-export-fields-label" className="flex min-w-0 flex-col gap-1.5">
            <h3 id="maternal-export-fields-label" className="text-xs font-medium text-foreground dark:text-white">Field Depth</h3>
            <RadioGroup value={fieldDepth} onValueChange={setFieldDepth} className="gap-2 sm:grid-cols-2">
              <Label htmlFor="maternal-fields-standard" className="flex cursor-pointer items-center gap-2.5 font-normal">
                <RadioGroupItem id="maternal-fields-standard" value="standard" />
                <span className="text-xs">Standard <span className="text-muted-foreground">(Demographics &amp; AOG)</span></span>
              </Label>
              <Label htmlFor="maternal-fields-comprehensive" className="flex cursor-pointer items-center gap-2.5 font-normal">
                <RadioGroupItem id="maternal-fields-comprehensive" value="comprehensive" />
                <span className="text-xs">Comprehensive EHR <span className="text-muted-foreground">(Full TCL &amp; vitals)</span></span>
              </Label>
            </RadioGroup>
          </section>

          <section aria-labelledby="maternal-export-risk-label" className="flex min-w-0 flex-col gap-1.5">
            <h3 id="maternal-export-risk-label" className="text-xs font-medium text-foreground dark:text-white">CDSS Risk Filter</h3>
            <Select value={risk} onValueChange={setRisk}>
              <SelectTrigger id="maternal-export-risk" className="h-8 w-full text-xs">
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels (Complete Register)</SelectItem>
                <SelectItem value="high">High Risk (TEWS ≥ 6 / Danger Flags)</SelectItem>
                <SelectItem value="moderate">Moderate Risk (TEWS 4–5)</SelectItem>
                <SelectItem value="low">Low Risk (Routine ANC)</SelectItem>
              </SelectContent>
            </Select>
          </section>
        </div>

        <DialogFooter className="flex-row justify-between gap-3 sm:justify-between pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 flex-1 text-xs sm:flex-initial sm:min-w-24">Cancel</Button>
          <Button type="button" onClick={() => { onExport({ format: format as MaternalExportOptions["format"], scope: scope as MaternalExportOptions["scope"], fieldDepth: fieldDepth as MaternalExportOptions["fieldDepth"], risk }); onOpenChange(false) }} className="h-8 flex-1 gap-2 text-xs sm:flex-initial sm:min-w-40">
            <Download className="size-3.5" /> Export Registry ({activeCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
