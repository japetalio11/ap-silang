import { useEffect, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { toast } from "sonner"
import { useAuthSession } from "@/features/auth/auth-session"

export function isUserSuperAdmin(role?: string | null): boolean {
  if (!role) return false
  const normalized = String(role).toLowerCase().trim().replace(/[\s_-]/g, "")
  return normalized === "systemadmin" || normalized === "superadmin"
}

export function RequireSuperAdminAuth({ children }: { children: ReactNode }) {
  const { session, isAuthenticated } = useAuthSession()
  const location = useLocation()

  const isSuperAdmin = Boolean(session && isUserSuperAdmin(session.user.role))

  useEffect(() => {
    if (isAuthenticated && session && !isSuperAdmin) {
      toast.error("Access Restricted", {
        description: "Only Municipal Super Administrators have access to this portal.",
      })
    }
  }, [isAuthenticated, session, isSuperAdmin])

  if (!isAuthenticated || !session) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

