import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthForm } from "@/features/auth/components/AuthForm"
import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout"
import { DashboardPage } from "@/features/dashboard/components/DashboardPage"
import { CampaignReviewPage } from "@/features/campaigns/components/CampaignReviewPage"
import { CampaignListPage } from "@/features/campaigns/components/CampaignListPage"
import { CalendarPage } from "@/features/calendar/components/CalendarPage"
import { MasterAvailabilityPage } from "@/features/master-availability/components/MasterAvailabilityPage"
import { TeamManagementPage } from "@/features/team/components/TeamManagementPage"
import { AnalyticsPage } from "@/features/analytics/components/AnalyticsPage"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth Route */}
          <Route path="/" element={<AuthForm />} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="campaigns/review" element={<CampaignReviewPage />} />
            {/* Placeholder routes for navigation */}
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="campaigns/list" element={<CampaignListPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="master-availability" element={<MasterAvailabilityPage />} />
            <Route path="team" element={<TeamManagementPage />} />
            <Route path="settings" element={<div className="flex-1 w-full h-full bg-white dark:bg-black" />} />
            <Route path="feedback" element={<div className="flex-1 w-full h-full bg-white dark:bg-black" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
