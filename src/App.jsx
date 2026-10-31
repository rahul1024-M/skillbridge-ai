
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";

import SkillAnalyzer from "./pages/SkillAnalyzer";
import ProofOfWork from "./pages/ProofOfWork";
import Roadmap from "./pages/Roadmap";
import Projects from "./pages/Projects";
import Internships from "./pages/Internships";
import Hackathons from "./pages/Hackathons";
import Courses from "./pages/Courses";
import Progress from "./pages/Progress";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SkillBridgeID from "./pages/SkillBridgeID";
import { useState } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";

function AppLayout() {
  const { isConfigured, configurationError } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar
          isMobileOpen={mobileMenuOpen}
          onMobileNavigate={() => setMobileMenuOpen(false)}
        />

        <main className="min-w-0 flex-1">
          <Navbar
            isMenuOpen={mobileMenuOpen}
            onMenuClick={() => setMobileMenuOpen(true)}
          />

          <div className="mx-auto w-full max-w-[1800px]">
            {!isConfigured && (
              <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs text-amber-800">
              {configurationError
                ? `Supabase configuration issue: ${configurationError} Local mode is active; profile changes stay in this browser.`
                : "Local mode: authentication and cloud sync are not configured. Profile changes stay in this browser."}
              </p>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/id/:slug" element={<SkillBridgeID />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="skills" element={<SkillAnalyzer />} />
              <Route path="proof" element={<ProofOfWork />} />
              <Route path="roadmap" element={<Roadmap />} />
              <Route path="projects" element={<Projects />} />
              <Route path="internships" element={<Internships />} />
              <Route path="hackathons" element={<Hackathons />} />
              <Route path="courses" element={<Courses />} />
              <Route path="progress" element={<Progress />} />
              <Route path="settings" element={<Settings />} />
              <Route path="skillbridge-id" element={<SkillBridgeID />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
