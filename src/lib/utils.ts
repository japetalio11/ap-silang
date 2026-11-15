import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeInitial(value: string) {
  return value.replace(/(^\s*[a-z])/, (initial) => initial.toUpperCase())
}

const statusPayloadKeys = new Set([
  "status",
  "pregnancy_status",
  "risk_level",
  "risk_level_assessed",
  "maternal_outcome",
  "outcome",
])

function normalizeStatusPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeStatusPayload)
  if (!value || typeof value !== "object") return value

  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    typeof entry === "string" && statusPayloadKeys.has(key.toLowerCase())
      ? capitalizeInitial(entry)
      : normalizeStatusPayload(entry),
  ]))
}

export function normalizeStatusJsonBody(body: BodyInit | null | undefined): BodyInit | null | undefined {
  if (typeof body !== "string") return body
  try {
    return JSON.stringify(normalizeStatusPayload(JSON.parse(body)))
  } catch {
    return body
  }
}
