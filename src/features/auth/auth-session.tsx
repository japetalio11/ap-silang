import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { apiRequest } from "@/lib/api"
import { requestPersistentStorage, warmOfflineData } from "@/lib/offline-prefetch"
import { toast } from "sonner"

const SESSION_KEY = "silang.auth.session"

export type AuthUser = {
  user_id: string
  first_name: string
  middle_name?: string | null
  last_name: string
  role: string
  facility_id: string | null
}

export type AuthFacility = {
  facility_id: string
  facility_name: string
  type: string
  facility_profile_url?: string | null
}

type AuthSession = { token: string; user: AuthUser; facility?: AuthFacility }
type LoginWorkspace = "admin" | "staff"
type LoginCredentials = { identifier: string; password: string; rememberMe: boolean; workspace?: LoginWorkspace }

type AuthSessionContextValue = {
  session: AuthSession | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  loginWithGoogle: (accessToken: string, rememberMe: boolean, workspace?: LoginWorkspace) => Promise<void>
  logout: () => void
}

function isTokenExpired(token: string) {
  try {
    const payload = token.split(".")[1]
    if (!payload) return true
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const decoded = JSON.parse(window.atob(base64 + "=".repeat((4 - base64.length % 4) % 4))) as { exp?: number }
    return typeof decoded.exp === "number" && decoded.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

function getStoredSession(): AuthSession | null {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const value = storage.getItem(SESSION_KEY)
    if (!value) continue
    try {
      const session = JSON.parse(value) as AuthSession
      if (session.token && session.user?.user_id) {
        if (!isTokenExpired(session.token) || !navigator.onLine) return session
      }
      storage.removeItem(SESSION_KEY)
    } catch {
      storage.removeItem(SESSION_KEY)
    }
  }
  return null
}

function clearStoredSession() {
  window.localStorage.removeItem(SESSION_KEY)
  window.sessionStorage.removeItem(SESSION_KEY)
}

function persistStoredSession(session: AuthSession) {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const saved = storage.getItem(SESSION_KEY)
    if (!saved) continue
    try {
      const current = JSON.parse(saved) as AuthSession
      if (current.token === session.token) {
        storage.setItem(SESSION_KEY, JSON.stringify(session))
        return
      }
    } catch {
      storage.removeItem(SESSION_KEY)
    }
  }
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())

  const logout = useCallback(() => {
    clearStoredSession()
    setSession(null)
  }, [])

  useEffect(() => {
    const onExpired = () => logout()
    window.addEventListener("silang:auth-expired", onExpired)
    return () => window.removeEventListener("silang:auth-expired", onExpired)
  }, [logout])

  useEffect(() => {
    if (!session) return
    const requireOnlineSignIn = () => {
      if (!isTokenExpired(session.token)) return
      logout()
      toast.info("Please sign in again to sync", { description: "Your saved offline records are still on this device." })
    }
    window.addEventListener("online", requireOnlineSignIn)
    return () => window.removeEventListener("online", requireOnlineSignIn)
  }, [logout, session])

  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Partial<AuthUser>>).detail
      if (!detail) return
      setSession((current) => {
        if (!current) return current
        const nextSession = { ...current, user: { ...current.user, ...detail } }
        persistStoredSession(nextSession)
        return nextSession
      })
    }
    const onFacilityUpdated = (event: Event) => {
      const detail = (event as CustomEvent<AuthFacility>).detail
      if (!detail?.facility_id) return
      setSession((current) => {
        if (!current || current.user.facility_id !== detail.facility_id) return current
        const nextSession = { ...current, facility: detail }
        persistStoredSession(nextSession)
        return nextSession
      })
    }
    window.addEventListener("silang:profile-updated", onProfileUpdated)
    window.addEventListener("silang:facility-updated", onFacilityUpdated)
    return () => {
      window.removeEventListener("silang:profile-updated", onProfileUpdated)
      window.removeEventListener("silang:facility-updated", onFacilityUpdated)
    }
  }, [])

  useEffect(() => {
    const facilityId = session?.user.facility_id
    if (!session || !facilityId || session.facility?.facility_id === facilityId) return

    let isCurrent = true
    apiRequest<{ result: AuthFacility }>(`/facility/${encodeURIComponent(facilityId)}`, { token: session.token })
      .then(({ result }) => {
        if (!isCurrent || !result?.facility_id) return
        const nextSession = { ...session, facility: result }
        persistStoredSession(nextSession)
        setSession((current) => current?.token === session.token ? nextSession : current)
      })
      .catch(() => {
        if (isCurrent) toast.error("Unable to load the assigned facility", { description: "Refresh and try again." })
      })

    return () => { isCurrent = false }
  }, [session])

  useEffect(() => {
    if (!session) return
    const facilityId = session.user.facility_id
    const warm = () => {
      if (isTokenExpired(session.token)) return
      void warmOfflineData(session.token, session.user.user_id, facilityId)
    }

    void requestPersistentStorage()
    warm()
    window.addEventListener("online", warm)
    return () => window.removeEventListener("online", warm)
  }, [session?.token, session?.user.user_id, session?.user.facility_id])

  const completeLogin = useCallback((response: { token: string; user: AuthUser }, rememberMe: boolean, workspace?: LoginWorkspace) => {
    if (!response?.token || !response.user?.user_id) {
      throw new Error("The server returned an incomplete sign-in response.")
    }

    if (response.user.role === "Mother") {
      throw new Error("This account uses the patient portal and cannot open the staff workspace.")
    }
    if (workspace) {
      const adminRoles = new Set(["Admin", "SystemAdmin"])
      const isAdmin = adminRoles.has(response.user.role)
      if ((workspace === "admin") !== isAdmin) {
        throw new Error(isAdmin
          ? "This account belongs to the Administrator workspace. Select Administrator and try again."
          : "This account belongs to the Health worker workspace. Select Health worker and try again.")
      }
    }

    const nextSession = { token: response.token, user: response.user }
    clearStoredSession()
    const storage = rememberMe ? window.localStorage : window.sessionStorage
    storage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }, [])

  const login = useCallback(async ({ identifier, password, rememberMe, workspace }: LoginCredentials) => {
    const response = await apiRequest<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    })
    completeLogin(response, rememberMe, workspace)
  }, [completeLogin])

  const loginWithGoogle = useCallback(async (accessToken: string, rememberMe: boolean, workspace?: LoginWorkspace) => {
    const response = await apiRequest<{ token: string; user: AuthUser }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    })
    completeLogin(response, rememberMe, workspace)
  }, [completeLogin])

  const value = useMemo(() => ({ session, isAuthenticated: Boolean(session), login, loginWithGoogle, logout }), [session, login, loginWithGoogle, logout])

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthSession() {
  const context = useContext(AuthSessionContext)
  if (!context) throw new Error("useAuthSession must be used inside AuthSessionProvider")
  return context
}
