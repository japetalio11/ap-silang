import { useEffect, useState } from "react"
import { addMonths, format, isValid, parse, parseISO } from "date-fns"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DateInputProps = {
  id: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disableFuture?: boolean
  className?: string
}

/** Shared typed date input with the maternal DOB format and calendar picker. */
export function DateInput({
  id,
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  disableFuture = false,
  className,
}: DateInputProps) {
  const [internalDate, setInternalDate] = useState("")
  const [inputValue, setInputValue] = useState("")
  const dateValue = value ?? internalDate
  const selectedDate = dateValue ? parseISO(dateValue) : undefined

  useEffect(() => {
    if (value !== undefined) setInputValue(value ? format(parseISO(value), "MM/dd/yyyy") : "")
  }, [value])

  const updateDate = (nextDate: string) => {
    if (value === undefined) setInternalDate(nextDate)
    onChange?.(nextDate)
  }

  const updateInput = (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "").slice(0, 8)
    const formatted = digits.length > 4
      ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits.length > 2
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits
    setInputValue(formatted)

    if (digits.length === 8) {
      const parsed = parse(formatted, "MM/dd/yyyy", new Date())
      if (isValid(parsed) && format(parsed, "MM/dd/yyyy") === formatted) updateDate(format(parsed, "yyyy-MM-dd"))
    } else if (!digits.length) {
      updateDate("")
    }
  }

  const chooseDate = (date?: Date) => {
    if (!date) return
    updateDate(format(date, "yyyy-MM-dd"))
    setInputValue(format(date, "MM/dd/yyyy"))
  }

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={inputValue}
        onChange={(event) => updateInput(event.target.value)}
        placeholder={placeholder}
        maxLength={10}
        className={cn("h-8 bg-muted/70 pr-9 text-xs dark:bg-muted/60", className)}
      />
      <Popover>
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Choose date for ${id}`}
                  className="absolute right-0.5 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <CalendarDays className="size-3.5" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Choose date</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={chooseDate}
            disabled={disableFuture ? { after: new Date() } : undefined}
            captionLayout="dropdown"
            startMonth={new Date(1900, 0)}
            endMonth={disableFuture ? new Date() : addMonths(new Date(), 24)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
