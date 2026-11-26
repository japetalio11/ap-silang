import * as React from "react"
import { createPortal } from "react-dom"
import { CircleHelp, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type TourTarget = { element: HTMLElement; title: string; description: string }

function readableLabel(element: HTMLElement) {
  const explicit = element.getAttribute("data-tour-label") || element.getAttribute("aria-label")
  if (explicit) return explicit.trim()
  if (element.matches("table,[data-slot='table']")) return "Review records"
  if (element.matches("[role='tablist'],[data-slot='tabs-list']")) return "Choose a view"
  if (element.matches("section[aria-label]")) return element.getAttribute("aria-label") || "This section"
  const heading = element.querySelector("h1,h2,h3,[data-slot$='title']")
  if (heading?.textContent?.trim()) return heading.textContent.trim()
  const label = element.closest("label") || (element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`) : null)
  return (label?.textContent || element.getAttribute("placeholder") || element.textContent || "This section").trim().replace(/\s+/g, " ").replace(/\s*\*$/, "").slice(0, 64)
}

function collectTargets(root: HTMLElement, mode: "page" | "overlay"): TourTarget[] {
  const area = mode === "page" ? (root.querySelector<HTMLElement>("main") || root.querySelector<HTMLElement>("[data-slot='sidebar-inset']") || root) : root
  const explicit = Array.from(area.querySelectorAll<HTMLElement>("[data-tour-step]"))
  const selectors = mode === "page"
    ? "h1, h2, section[aria-label], [role='tablist'], [data-slot='tabs-list'], input, table, [data-slot='table'], button:not([aria-label])"
    : "[data-slot='dialog-header'], [data-slot='sheet-header'], [data-slot='drawer-header'], [data-slot='tabs-list'], [role='tablist'], label, input, textarea, select, [data-slot='select-trigger'], [data-slot='dialog-footer'], [data-slot='sheet-footer'], [data-slot='drawer-footer']"
  const candidates = explicit.length ? explicit : Array.from(area.querySelectorAll<HTMLElement>(selectors))
  const seen = new Set<string>()
  return candidates.filter((element) => {
    if (!element.getClientRects().length || element.closest("[aria-hidden='true']")) return false
    const key = element.closest("label")?.getAttribute("for") || readableLabel(element)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8).map((element, index, array) => {
    const title = readableLabel(element)
    const description = element.getAttribute("data-tour-description") || (index === 0
      ? "Start here, then follow the sections in order."
      : index === array.length - 1
        ? "Use this control when you are ready to continue."
        : title === "Review records"
          ? "Review the available records and open a row for more detail."
          : title === "Choose a view"
            ? "Switch views to focus on the information you need."
        : `Review or enter the ${title.toLowerCase()} information here.`)
    return { element, title, description }
  })
}

export function ContextualTour({ scope, mode = "overlay", className = "" }: {
  scope: React.RefObject<HTMLElement | null>
  mode?: "page" | "overlay"
  className?: string
}) {
  const [active, setActive] = React.useState(false)
  const [index, setIndex] = React.useState(0)
  const [targets, setTargets] = React.useState<TourTarget[]>([])
  const [rect, setRect] = React.useState<DOMRect | null>(null)

  const stop = React.useCallback(() => {
    setActive(false)
    setIndex(0)
    setTargets([])
    setRect(null)
  }, [])

  React.useEffect(() => {
    if (!active) return
    const target = targets[index]?.element
    if (!target?.isConnected) return
    target.scrollIntoView({ block: "nearest", behavior: "smooth" })
    const update = () => setRect(target.getBoundingClientRect())
    const animationFrame = window.requestAnimationFrame(update)
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    const frame = window.setTimeout(update, 250)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
      window.clearTimeout(frame)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [active, index, targets, stop])

  React.useEffect(() => {
    if (!active) return
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); stop() } }
    window.addEventListener("keydown", onEscape, true)
    return () => window.removeEventListener("keydown", onEscape, true)
  }, [active, stop])

  const start = () => {
    const root = scope.current
    if (!root) return
    const next = collectTargets(root, mode)
    if (!next.length) return
    setIndex(0)
    setTargets(next)
    setRect(next[0].element.getBoundingClientRect())
    setActive(true)
  }
  const current = targets[index]
  const rootRect = mode === "overlay" ? scope.current?.getBoundingClientRect() : null
  const areaWidth = rootRect?.width || window.innerWidth
  const areaHeight = rootRect?.height || window.innerHeight
  const targetLeft = rect ? rect.left - (rootRect?.left || 0) : 0
  const targetTop = rect ? rect.top - (rootRect?.top || 0) : 0
  const width = Math.max(0, Math.min(300, areaWidth - 24))
  const left = rect ? Math.max(12, Math.min(targetLeft, areaWidth - width - 12)) : 12
  const estimatedHeight = 220
  const below = rect ? areaHeight - (targetTop + rect.height + 12) >= Math.min(estimatedHeight, areaHeight / 2) : true
  const preferredTop = rect ? (below ? targetTop + rect.height + 12 : targetTop - estimatedHeight - 12) : 12
  const top = Math.max(12, Math.min(preferredTop, areaHeight - Math.min(estimatedHeight, areaHeight - 24) - 12))

  return <>
    <Button type="button" variant="ghost" size="icon-sm" className={className} aria-label="Show guide" title="Show guide" onClick={start}>
      <CircleHelp className="size-4" />
    </Button>
    {active && rect && current && createPortal(<div className={`${mode === "overlay" ? "absolute" : "fixed"} inset-0 z-[250]`} role="dialog" aria-modal="true" aria-label={`${current.title} guide`}>
      <div className="absolute inset-0" onClick={stop} />
      <div className="pointer-events-none absolute rounded-md ring-2 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" style={{ left: targetLeft - 3, top: targetTop - 3, width: rect.width + 6, height: rect.height + 6 }} />
      <div className="absolute overflow-y-auto rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-xl" style={{ left, top, width, maxHeight: Math.max(120, areaHeight - top - 12) }}>
        <span aria-hidden="true" className={`absolute left-5 size-3 rotate-45 bg-popover ${below ? "-top-1.5 border-l border-t border-border" : "-bottom-1.5 border-r border-b border-border"}`} />
        <div className="flex items-start justify-between gap-3"><div className="text-sm font-semibold">{current.title}</div><Button type="button" variant="ghost" size="icon-sm" aria-label="Close guide" onClick={stop}><X className="size-4" /></Button></div>
        <p className="mt-1 text-xs text-muted-foreground">{current.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{index + 1} of {targets.length}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</Button><Button type="button" size="sm" onClick={() => index === targets.length - 1 ? stop() : setIndex(index + 1)}>{index === targets.length - 1 ? "Done" : "Next"}</Button></div></div>
      </div>
    </div>, mode === "overlay" ? scope.current! : document.body)}
  </>
}

export function PageGuide() {
  const scope = React.useRef<HTMLElement | null>(null)
  React.useEffect(() => { scope.current = document.body }, [])
  return <ContextualTour scope={scope} mode="page" />
}
