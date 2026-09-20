import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ExportCampaignModal({ children }: { children: React.ReactNode }) {
  return (
    <ResponsiveModal 
      trigger={children}
      title="Export Campaign Data"
      description="Download a generated report based on your current filters."
    >
        
        <div className="flex flex-col gap-6 py-2">
          {/* File Format */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">File Format</h4>
            <RadioGroup defaultValue="excel" className="gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="r1" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
                <Label htmlFor="r1" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">Excel (.xlsx)</span> <span className="text-muted-foreground">Best for spreadsheets and manual review</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="r2" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
                <Label htmlFor="r2" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">CSV</span> <span className="text-muted-foreground">Best for importing into other systems</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="r3" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
                <Label htmlFor="r3" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">PDF Summary</span> <span className="text-muted-foreground">Best for stakeholder meetings</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Data Scope */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">Data Scope</h4>
            <RadioGroup defaultValue="filtered" className="gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filtered" id="s1" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
                <Label htmlFor="s1" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">Current Filtered View</span> <span className="text-muted-foreground">(3 items)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="s2" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
                <Label htmlFor="s2" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">All Campaigns</span> <span className="text-muted-foreground">(152 items)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Included Columns */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium text-foreground dark:text-white">Included Columns</h4>
            <RadioGroup defaultValue="standard" className="gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="c1" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
                <Label htmlFor="c1" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">Standard View</span> <span className="text-muted-foreground">(Matches your current table columns)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="c2" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
                <Label htmlFor="c2" className="text-xs font-normal">
                  <span className="text-foreground dark:text-white">All Data Fields</span> <span className="text-muted-foreground">(Includes hidden metadata and logs)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Button variant="secondary" className="flex-1 text-xs font-medium border-sidebar-border text-foreground hover:bg-accent dark:bg-[#1e1e1e] dark:hover:bg-[#1e1e1e]/80 dark:text-white dark:border-sidebar-border">
            Cancel
          </Button>
          <Button className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
            Export Campaign
          </Button>
        </div>
    </ResponsiveModal>
  )
}

