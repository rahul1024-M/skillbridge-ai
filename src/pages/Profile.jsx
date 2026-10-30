import { UserRound, Mail, GraduationCap, Code2, Sparkles } from "lucide-react";

export default function Profile() {
  return (
    <div className="min-h-screen space-y-6 p-5 sm:p-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Student Workspace
        </span>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          My Profile
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your student information and career identity.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-7">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-3xl font-bold text-white">
            S
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Student User</h2>
            <p className="mt-1 text-sm text-slate-500">SkillBridge AI Student</p>
            <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles size={12} className="mr-1 inline" /> Career Explorer
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Full Name", value: "Student User", icon: UserRound },
          { label: "Email", value: "Not connected", icon: Mail },
          { label: "Education", value: "Engineering Student", icon: GraduationCap },
          { label: "Primary Interest", value: "Software Development", icon: Code2 },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <Icon size={20} className="text-blue-600" />
              <p className="mt-3 text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}