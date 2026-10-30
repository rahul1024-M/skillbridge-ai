import { Bell, Search, ChevronDown, Sparkles, Menu } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur-xl sm:px-8">
      {/* Search */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={21} />
        </button>

        <div className="relative hidden w-full max-w-[420px] sm:block">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search skills, projects, opportunities..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
          <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-400 md:block">
            Ctrl K
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="ml-4 flex shrink-0 items-center gap-3 sm:gap-5">
        <div className="hidden items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-2 sm:flex">
          <Sparkles size={15} className="text-violet-600" />
          <span className="text-xs font-semibold text-violet-700">
            AI Powered
          </span>
        </div>

        <button
          className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <button className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
            S
          </div>

          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold text-slate-800">
              Student User
            </p>
            <p className="text-[10px] text-slate-500">Student Account</p>
          </div>

          <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
        </button>
      </div>
    </header>
  );
}