import { useMemo, useState } from "react"
import { Building2, Check, Hospital, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { FacilityItem } from "../api/superadmin-api"

interface FacilitySearchSelectProps {
  facilities: FacilityItem[]
  value: string
  onValueChange: (value: string) => void
  currentFacilityId?: string
  placeholder?: string
}

export function FacilitySearchSelect({
  facilities,
  value,
  onValueChange,
  currentFacilityId,
  placeholder = "Search clinic or health station...",
}: FacilitySearchSelectProps) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "RHU" | "BHS">("ALL")

  const availableFacilities = useMemo(() => {
    return facilities.filter((f) => !currentFacilityId || f.facility_id !== currentFacilityId)
  }, [facilities, currentFacilityId])

  const rhuCount = useMemo(() => {
    return availableFacilities.filter((f) => f.type?.toUpperCase().includes("RHU")).length
  }, [availableFacilities])

  const bhsCount = useMemo(() => {
    return availableFacilities.filter((f) => f.type?.toUpperCase().includes("BHS")).length
  }, [availableFacilities])

  const filteredFacilities = useMemo(() => {
    const q = search.trim().toLowerCase()
    return availableFacilities.filter((f) => {
      const isRhu = f.type?.toUpperCase().includes("RHU")
      const isBhs = f.type?.toUpperCase().includes("BHS")
      if (typeFilter === "RHU" && !isRhu) return false
      if (typeFilter === "BHS" && !isBhs) return false

      if (!q) return true
      const nameMatch = f.facility_name?.toLowerCase().includes(q)
      const typeMatch = f.type?.toLowerCase().includes(q)
      const addressMatch = f.address?.toLowerCase().includes(q)
      return Boolean(nameMatch || typeMatch || addressMatch)
    })
  }, [availableFacilities, search, typeFilter])

  const selectedFacility = useMemo(() => {
    return availableFacilities.find((f) => f.facility_id === value)
  }, [availableFacilities, value])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 pr-7 text-xs bg-muted/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTypeFilter("ALL")}
            className={`rounded-full px-2 py-0.5 transition-colors ${
              typeFilter === "ALL"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({availableFacilities.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("RHU")}
            className={`rounded-full px-2 py-0.5 transition-colors ${
              typeFilter === "RHU"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            RHUs ({rhuCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("BHS")}
            className={`rounded-full px-2 py-0.5 transition-colors ${
              typeFilter === "BHS"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            BHS ({bhsCount})
          </button>
        </div>
        <span className="text-muted-foreground">
          {filteredFacilities.length} {filteredFacilities.length === 1 ? "facility" : "facilities"}
        </span>
      </div>

      <div className="max-h-52 overflow-y-auto rounded-md border border-border bg-card p-1 space-y-1">
        {filteredFacilities.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            <p>No matching facilities found</p>
            {search && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1 h-6 text-xs text-primary"
                onClick={() => {
                  setSearch("")
                  setTypeFilter("ALL")
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          filteredFacilities.map((f) => {
            const isSelected = value === f.facility_id
            const isRhu = f.type?.toUpperCase().includes("RHU")
            return (
              <button
                key={f.facility_id}
                type="button"
                onClick={() => onValueChange(f.facility_id)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-primary/10 border border-primary/30 text-primary font-medium"
                    : "hover:bg-muted/80 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isRhu
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    }`}
                  >
                    {isRhu ? <Hospital className="size-3.5" /> : <Building2 className="size-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{f.facility_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 h-4 border-none font-medium ${
                          isRhu
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                        }`}
                      >
                        {f.type || (isRhu ? "RHU" : "BHS")}
                      </Badge>
                      {f.address && (
                        <span className="truncate text-[10px] text-muted-foreground">
                          {f.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            )
          })
        )}
      </div>

      {selectedFacility && (
        <div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Destination:</span>
            <span className="truncate font-medium text-foreground">{selectedFacility.facility_name}</span>
          </div>
          <button
            type="button"
            onClick={() => onValueChange("")}
            className="text-[11px] text-muted-foreground hover:text-foreground shrink-0 ml-2"
          >
            Change
          </button>
        </div>
      )}
    </div>
  )
}
