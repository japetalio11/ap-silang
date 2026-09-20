"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"

export type Classname = string
export type WeightedDateEntry = {
  date: Date
  weight: number
}

export type CalendarHeatmapProps = React.ComponentProps<typeof Calendar> & {
  variantClassnames: Classname[]
  weightedDates?: WeightedDateEntry[]
  datesPerVariant?: Date[][]
}

function categorizeDatesPerVariant(
  weightedDates: WeightedDateEntry[],
  noOfVariants: number
) {
  if (!weightedDates || weightedDates.length === 0) {
    return Array.from({ length: noOfVariants }, () => [])
  }
  
  const sortedEntries = [...weightedDates].sort((a, b) => a.weight - b.weight)
  const categorizedRecord: Date[][] = Array.from({ length: noOfVariants }, () => [])

  const minNumber = sortedEntries[0].weight
  const maxNumber = sortedEntries[sortedEntries.length - 1].weight
  const range = minNumber === maxNumber ? 1 : (maxNumber - minNumber) / noOfVariants

  sortedEntries.forEach((entry) => {
    const category = Math.min(
      Math.floor((entry.weight - minNumber) / range),
      noOfVariants - 1
    )
    categorizedRecord[category].push(entry.date)
  })

  return categorizedRecord
}

export function CalendarHeatmap({
  variantClassnames,
  datesPerVariant,
  weightedDates,
  modifiers: userModifiers,
  modifiersClassNames: userModifiersClassNames,
  ...props
}: CalendarHeatmapProps) {
  const noOfVariants = variantClassnames.length

  const computedDatesPerVariant =
    datesPerVariant ?? categorizeDatesPerVariant(weightedDates ?? [], noOfVariants)

  const variantLabels = Array.from({ length: noOfVariants }).map(
    (_, idx) => `__variant${idx}`
  )

  const generatedModifiers = variantLabels.reduce((acc, key, index) => {
    acc[key] = computedDatesPerVariant[index]
    return acc
  }, {} as Record<string, Date[]>)

  const generatedModifiersClassNames = variantLabels.reduce((acc, key, index) => {
    acc[key] = variantClassnames[index]
    return acc
  }, {} as Record<string, string>)

  return (
    <Calendar
      modifiers={{ ...userModifiers, ...generatedModifiers }}
      modifiersClassNames={{ ...userModifiersClassNames, ...generatedModifiersClassNames }}
      {...props}
    />
  )
}
CalendarHeatmap.displayName = "CalendarHeatmap"
