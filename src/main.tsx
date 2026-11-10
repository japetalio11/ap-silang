import { StrictMode, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigate, Navigate, type Location } from "react-router-dom"
import { registerSW } from "virtual:pwa-register"
import { requestPersistentStorage } from "@/lib/offline-prefetch"

registerSW({ immediate: true })
void requestPersistentStorage()

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthForm } from "@/features/auth/components/AuthForm"
import { SuperAdminLoginPage } from "@/features/auth/components/SuperAdminLoginPage"
import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout"
import { DashboardPage } from "@/features/dashboard/components/DashboardPage"
import { CalendarPage } from "@/features/calendar/components/CalendarPage"
import { TeamManagementPage } from "@/features/team/components/TeamManagementPage"
import { StaffProfilePage } from "@/features/team/components/StaffProfilePage"
import { NavigationPlaceholderPage } from "@/features/dashboard/components/NavigationPlaceholderPage"
import { MaternalRecordsPage } from "@/features/maternal-records/components/MaternalRecordsPage"
import { MaternalProfilePage } from "@/features/maternal-records/components/MaternalProfilePage"
import { ReferralsPage } from "@/features/referrals/components/ReferralsPage"
import { ReferralGatewayPage } from "@/features/referrals/components/ReferralGatewayPage"
import { MessagesPage } from "@/features/messages/components/MessagesPage"
import { SettingsPage } from "@/features/dashboard/components/SettingsPage"
import { SuperAdminLayout } from "@/features/dashboard/components/SuperAdminLayout"
import { SuperAdminBhsManagementPage, SuperAdminRhuManagementPage, SuperAdminSettingsDialog } from "@/features/dashboard/components/SuperAdminManagementPages"
import { Toaster } from "@/components/ui/sonner"
import { AuthSessionProvider, useAuthSession } from "@/features/auth/auth-session"

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthSession()
  return isAuthenticated ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation

  useEffect(() => {
    const pathname = location.pathname.replace(/\/$/, "") || "/"
    let pageTitle = "Dashboard"

    if (pathname === "/") pageTitle = "Sign In"
    else if (pathname === "/dashboard") pageTitle = "Dashboard"
    else if (pathname === "/dashboard/calendar") pageTitle = "Appointments"
    else if (pathname === "/dashboard/team") pageTitle = "Staff Management"
    else if (/^\/dashboard\/team\/[^/]+$/.test(pathname)) pageTitle = "Staff Profile"
    else if (pathname === "/dashboard/maternal-records") pageTitle = "Maternal Records"
    else if (/^\/dashboard\/maternal-records\/[^/]+$/.test(pathname)) pageTitle = "Mother Profile"
    else if (pathname === "/dashboard/referrals") pageTitle = "Inter-Clinic Referrals"
    else if (pathname === "/dashboard/messages") pageTitle = "Messages"
    else if (pathname === "/dashboard/settings") pageTitle = "Settings"
    else if (pathname === "/dashboard/user-guide") pageTitle = "User Guide"
    else if (pathname === "/dashboard/feedback") pageTitle = "Feedback"
    else if (/^\/referral\/[^/]+$/.test(pathname)) pageTitle = "Secure Referral"
    else if (pathname === "/superadmin") pageTitle = "Superadmin Sign In"
    else if (pathname.endsWith("/rhu-management")) pageTitle = "RHU Management"
    else if (pathname.endsWith("/bhs-management")) pageTitle = "BHS Management"
    else if (pathname.endsWith("/settings")) pageTitle = "Settings"

    document.title = `${pageTitle} - Silang`
  }, [location.pathname])

  return <>
    <Routes location={backgroundLocation ?? location}>
      <Route path="/" element={<AuthForm />} />
      <Route path="/superadmin" element={<Outlet />}>
        <Route index element={<SuperAdminLoginPage />} />
        <Route element={<SuperAdminLayout />}>
          <Route path="rhu-management" element={<SuperAdminRhuManagementPage />} />
          <Route path="bhs-management" element={<SuperAdminBhsManagementPage />} />
          <Route path="settings" element={<SuperAdminSettingsDialog />} />
        </Route>
      </Route>
      <Route path="/referral/:identifier" element={<ReferralGatewayPage />} />
      <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="team" element={<TeamManagementPage />} />
        <Route path="team/:staffId" element={<StaffProfilePage />} />
        <Route path="maternal-records" element={<MaternalRecordsPage />} />
        <Route path="maternal-records/:motherId" element={<MaternalProfilePage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="user-guide" element={<NavigationPlaceholderPage title="User Guide" />} />
        <Route path="settings" element={<SettingsPage onClose={() => navigate("/dashboard", { replace: true })} />} />
        <Route path="feedback" element={<div className="flex-1 w-full h-full bg-white dark:bg-black" />} />
      </Route>
    </Routes>
    {backgroundLocation && <Routes>
      <Route path="/dashboard/settings" element={<RequireAuth><SettingsPage onClose={() => navigate(-1)} /></RequireAuth>} />
    </Routes>}
  </>
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthSessionProvider>
          <AppRoutes />
          <Toaster position="bottom-right" />
        </AuthSessionProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
