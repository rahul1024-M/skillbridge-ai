import {
  ArrowUpRight,
  ArrowRight,
  BrainCircuit,
  ShieldCheck,
  Target,
  TrendingUp,
  BriefcaseBusiness,
  Code2,
  Sparkles,
  Clock3,
  CircleCheck,
  ChevronRight,
  Zap,
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const stats = [
  {
    label: "Skills Identified",
    value: "12",
    change: "+3 this month",
    icon: BrainCircuit,
    color: "blue",
  },
  {
    label: "Verified Evidence",
    value: "08",
    change: "6 reviewed",
    icon: ShieldCheck,
    color: "violet",
  },
  {
    label: "Learning Progress",
    value: "68%",
    change: "+12% this month",
    icon: Target,
    color: "emerald",
  },
  {
    label: "Career Readiness",
    value: "74%",
    change: "Good progress",
    icon: TrendingUp,
    color: "amber",
  },
];

const progressData = [
  { month: "May", progress: 22 },
  { month: "Jun", progress: 32 },
  { month: "Jul", progress: 29 },
  { month: "Aug", progress: 43 },
  { month: "Sep", progress: 57 },
  { month: "Oct", progress: 68 },
];

const activities = [
  {
    title: "GitHub repository submitted",
    detail: "Proof of Work · Sample activity",
    time: "2 hours ago",
    icon: Code2,
    color: "blue",
  },
  {
    title: "Python skill assessment completed",
    detail: "Skill Analyzer · Sample activity",
    time: "Yesterday",
    icon: BrainCircuit,
    color: "violet",
  },
  {
    title: "Learning roadmap updated",
    detail: "Learning Roadmap · Sample activity",
    time: "2 days ago",
    icon: CircleCheck,
    color: "emerald",
  },
];

const opportunities = [
  {
    title: "Frontend Developer Intern",
    company: "Tech Innovation Labs",
    type: "Internship",
    match: "94% match",
    icon: BriefcaseBusiness,
  },
  {
    title: "Build with AI Challenge",
    company: "Developer Community",
    type: "Hackathon",
    match: "89% match",
    icon: Zap,
  },
];

const colorStyles = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {action && (
        <button className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
          {action} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function StatCard({ item }) {
  const Icon = item.icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{item.label}</p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {item.value}
          </h3>
        </div>
        <div className={`rounded-xl p-3 ${colorStyles[item.color]}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 flex items-center gap-1 text-xs font-medium text-emerald-600">
        <TrendingUp size={13} />
        {item.change}
      </p>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#172554] via-[#1e40af] to-[#6d28d9] p-7 text-white shadow-xl shadow-blue-950/10 sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-blue-100">
            <Sparkles size={13} />
            YOUR AI-POWERED CAREER COMPANION
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, Future Engineer!
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
            Your career journey starts with knowing your skills. Discover your
            strengths, validate your work, and build the future you deserve.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-blue-800 transition hover:bg-blue-50">
              Explore My Skills <ArrowUpRight size={15} />
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-semibold text-white transition hover:bg-white/20">
              Verify My Work <ShieldCheck size={15} />
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-40 right-28 h-80 w-80 rounded-full border-[45px] border-white/5" />

        <div className="pointer-events-none absolute right-10 top-10 hidden h-36 w-36 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm xl:flex">
          <BrainCircuit size={70} className="text-white/90" />
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </section>

      {/* Main content */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Progress chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 xl:col-span-2">
          <SectionHeading
            title="Your Learning Journey"
            subtitle="Illustrative progress across the last six months"
            action="View progress"
          />

          <div className="mb-5 flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-slate-900">68%</span>
              <span className="ml-2 text-xs text-slate-500">
                Overall progress
              </span>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              +12% this month
            </span>
          </div>

          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value}%`, "Progress"]}
                />
                <Area
                  type="monotone"
                  dataKey="progress"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#progressFill)"
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Career readiness */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <SectionHeading
            title="Career Readiness"
            subtitle="Illustrative readiness score"
          />

          <div className="flex flex-col items-center py-5">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: "conic-gradient(#4f46e5 0% 74%, #e2e8f0 74% 100%)",
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-4xl font-bold text-slate-900">74%</span>
                <span className="mt-1 text-[10px] font-medium text-slate-500">
                  READINESS
                </span>
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold text-slate-800">
              You're making progress!
            </p>
            <p className="mt-1 text-center text-xs leading-5 text-slate-500">
              Strengthen your project evidence and practical skills.
            </p>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Technical skills</span>
              <span className="font-semibold text-slate-800">82%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[82%] rounded-full bg-blue-500" />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Practical evidence</span>
              <span className="font-semibold text-slate-800">61%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[61%] rounded-full bg-violet-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Bottom sections */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <SectionHeading
            title="Recent Activity"
            subtitle="A snapshot of your recent actions"
            action="View all"
          />

          <div className="space-y-5">
            {activities.map((activity) => {
              const Icon = activity.icon;

              return (
                <div key={activity.title} className="flex items-center gap-4">
                  <div className={`rounded-xl p-3 ${colorStyles[activity.color]}`}>
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.detail}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {activity.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opportunities */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <SectionHeading
            title="Recommended Opportunities"
            subtitle="Illustrative matches based on your skills"
            action="Explore all"
          />

          <div className="space-y-3">
            {opportunities.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                >
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.company} · {item.type}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
                      {item.match}
                    </span>
                    <ChevronRight size={15} className="ml-auto mt-2 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Next step */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm">
            <Clock3 size={21} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Your next step: Validate your skills
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Submit a GitHub repository to receive an AI-powered evidence review.
            </p>
          </div>
        </div>

        <button className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
          Start Proof of Work <ArrowRight size={15} />
        </button>
      </section>

      <p className="pb-2 text-center text-[16px] text-slate-800">
        © 2026 SkillBridge AI. All Rights Reserved.
      </p>
    </div>
  );
}
