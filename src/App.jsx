
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import SkillAnalyzer from "./pages/SkillAnalyzer";
import ProofOfWork from "./pages/ProofOfWork";
import Roadmap from "./pages/Roadmap";
import Projects from "./pages/Projects";
import Internships from "./pages/Internships";

const Placeholder = ({ title }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
    <p className="mt-2 text-slate-500">
      This module is currently under development.
    </p>
  </div>
);

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <Navbar />

          <div className="mx-auto w-full max-w-[1800px]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/skills" element={<SkillAnalyzer />} />
              <Route path="/proof" element={<ProofOfWork />} />
              <Route path="/roadmap" element={<Roadmap />} />

              <Route path="/projects" element={<Projects />} />
              <Route path="/internships" element={<Internships />} />
              <Route path="/hackathons" element={<Placeholder title="Hackathons" />} />
              <Route path="/courses" element={<Placeholder title="Courses" />} />
              <Route path="/progress" element={<Placeholder title="My Progress" />} />
              <Route path="/settings" element={<Placeholder title="Settings" />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
