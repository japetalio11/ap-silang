import { createContext, useContext } from "react"

export const TooltipTriggerContext = createContext(false)
export const CompositeTriggerContext = createContext(false)

export function useTooltipTriggerContext() {
  return useContext(TooltipTriggerContext)
}

export function useCompositeTriggerContext() {
  return useContext(CompositeTriggerContext)
}
