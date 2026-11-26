"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const MobileTabsContext = React.createContext<{
  value: string | undefined
  onValueChange: (value: string) => void
} | null>(null)

function tabLabel(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children)
  if (Array.isArray(children)) return children.map(tabLabel).filter(Boolean).join(" ")
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) return tabLabel(children.props.children)
  return ""
}

function Tabs({
  className,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const activeValue = value ?? internalValue
  const changeValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }
  return (
    <MobileTabsContext.Provider value={{ value: activeValue, onValueChange: changeValue }}>
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      value={activeValue}
      onValueChange={changeValue}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
    </MobileTabsContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  mobileSelect = true,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & { mobileSelect?: boolean }) {
  const mobileTabs = React.useContext(MobileTabsContext)
  const options = React.Children.toArray(props.children)
    .filter((child): child is React.ReactElement<React.ComponentProps<typeof TabsPrimitive.Trigger>> =>
      React.isValidElement(child) && typeof (child.props as { value?: unknown }).value === "string")
    .map((child) => ({
      value: child.props.value,
      label: tabLabel(child.props.children).trim() || child.props.value.replace(/[-_]/g, " "),
    }))
  return (
    <>
    {mobileSelect && mobileTabs && options.length > 1 && (
      <Select value={mobileTabs.value ?? options[0].value} onValueChange={mobileTabs.onValueChange}>
        <SelectTrigger aria-label="Choose view" className="h-8 w-full min-w-0 text-xs md:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    )}
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), mobileSelect && options.length > 1 && "max-md:hidden", className)}
      {...props}
    />
    </>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-xs font-medium tracking-[0.01em] whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:py-[calc(--spacing(1.25))] hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-xs/relaxed outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
