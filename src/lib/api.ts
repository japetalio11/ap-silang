import { getApiCacheScope, readCachedApiValue, writeCachedApiValue } from "@/lib/offline-api-cache"

export type ApiErrorBody = {
  error?: string
  message?: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

const configuredOrigin = import.meta.env.VITE_BACKEND_API_URL?.trim().replace(/\/+$/, "")
const apiRoot = configuredOrigin
  ? `${configuredOrigin.endsWith("/api/v1") ? configuredOrigin : `${configuredOrigin}/api/v1`}`
  : "/api/v1"

export function backendAssetUrl(path: string) {
  if (/^(https?|data|blob):/i.test(path)) return path
  const origin = configuredOrigin?.replace(/\/api\/v1$/, "")
  if (!origin) return path
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...requestOptions } = options
  const requestHeaders = new Headers(headers)

  if (token) requestHeaders.set("Authorization", `Bearer ${token}`)
  if (requestOptions.body && !(requestOptions.body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json")
  }

  const url = `${apiRoot}${path.startsWith("/") ? path : `/${path}`}`
  const isCacheableRead = (requestOptions.method ?? "GET").toUpperCase() === "GET" && requestOptions.cache !== "no-store"
  const cacheScope = isCacheableRead ? await getApiCacheScope(token) : null
  if (isCacheableRead && typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = await readCachedApiValue<T>(cacheScope, url)
    if (cached !== undefined) return cached
    throw new Error("This information is not available offline yet. Reconnect to load it once, then it will be available offline.")
  }
  let response: Response
  try {
    response = await fetch(url, { ...requestOptions, headers: requestHeaders })
  } catch (error) {
    if (isCacheableRead) {
      try {
        const cached = await readCachedApiValue<T>(cacheScope, url)
        if (cached !== undefined) return cached
      } catch {
        // A local storage failure should not hide the original network error.
      }
    }
    throw error
  }

  const responseText = await response.text()
  let responseBody: unknown
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = responseText
    }
  }

  if (!response.ok) {
    const body = responseBody as ApiErrorBody | undefined
    const errorMessage = body?.message || body?.error || ""
    if (token && (response.status === 401 || (response.status === 403 && /invalid or expired token/i.test(errorMessage)))) {
      window.dispatchEvent(new Event("silang:auth-expired"))
    }
    // Vite's development proxy can return a 500 when its upstream API is
    // unreachable. Treat gateway/server failures on reads like network errors
    // so a previously cached route still renders while offline.
    if (isCacheableRead && response.status >= 500) {
      try {
        const cached = await readCachedApiValue<T>(cacheScope, url)
        if (cached !== undefined) return cached
      } catch {
        // Preserve the API error if local storage cannot be read.
      }
    }
    throw new ApiError(errorMessage || `Request failed (${response.status})`, response.status)
  }

  if (isCacheableRead && responseBody !== undefined) {
    try {
      await writeCachedApiValue(cacheScope, url, responseBody)
    } catch {
      // The online request is still valid if browser storage is unavailable or full.
    }
  }

  return responseBody as T
}
