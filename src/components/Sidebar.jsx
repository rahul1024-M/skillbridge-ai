import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  BrainCircuit,
  ShieldCheck,
  Route,
  FolderKanban,
  BriefcaseBusiness,
  Trophy,
  BookOpen,
  TrendingUp,
  Settings,
  GraduationCap,
  Sparkles,
} from "lucide-react";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
      { name: "My Profile", path: "/profile", icon: UserRound },
    ],
  },
  {
    title: "AI CAREER TOOLS",
    items: [
      { name: "Skill Analyzer", path: "/skills", icon: BrainCircuit },
      { name: "Proof of Work", path: "/proof", icon: ShieldCheck },
      { name: "Learning Roadmap", path: "/roadmap", icon: Route },
    ],
  },
  {
    title: "OPPORTUNITIES",
    items: [
      { name: "Projects", path: "/projects", icon: FolderKanban },
      { name: "Internships", path: "/internships", icon: BriefcaseBusiness },
      { name: "Hackathons", path: "/hackathons", icon: Trophy },
      { name: "Courses", path: "/courses", icon: BookOpen },
    ],
  },
  {
    title: "PERFORMANCE",
    items: [
      { name: "My Progress", path: "/progress", icon: TrendingUp },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-[260px] shrink-0 flex-col border-r border-slate-800 bg-[#111827] text-white lg:flex">
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
          <GraduationCap size={23} />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight">
            SkillBridge <span className="text-blue-400">AI</span>
          </h1>
          <p className="text-[10px] tracking-[2px] text-slate-400">
            CAREER INTELLIGENCE
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-4 py-7">
        {navigation.map((section) => (
          <div key={section.title}>
            <p className="mb-3 px-3 text-[10px] font-bold tracking-[1.7px] text-slate-500">
              {section.title}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-all ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-blue-400">
            <Sparkles size={16} />
            <span className="text-xs font-semibold">AI Career Assistant</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Discover your strengths and build a career-ready skill profile.
          </p>
        </div>

        <NavLink
          to="/settings"
          className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}