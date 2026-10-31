import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStudentDashboard } from "../hooks/useStudentDashboard";
import { getCareerReadiness } from "../utils/careerMetrics";

function formatRelativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not provided";
  return date.toLocaleDateString();
}

function getActivityChart(activities) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const key = day.toDateString();
    const count = activities.filter((activity) =>
      activity.kind?.startsWith("roadmap_item_") &&
      new Date(activity.occurredAt).toDateString() === key
    ).length;
    return {
      day: day.toLocaleDateString(undefined, { weekday: "short" }),
      activities: count,
    };
  });
}

function StatCard({ title, value, detail, icon: Icon, tone, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`rounded-xl p-3 ${tone}`}>
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-4 text-xs text-slate-500">{detail}</p>
    </button>
  );
}

function EmptyState({ children }) {
  return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{children}</p>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const data = useStudentDashboard();
  const {
    profile,
    roadmapItems,
    activities,
    audits,
    submissions,
    opportunities,
    opportunityError,
    learningPlan,
    loading,
    error,
    refresh,
  } = data;

  const readiness = useMemo(() => getCareerReadiness(data), [data]);
  const completedTasks = roadmapItems.filter((item) => item.status === "completed").length;
  const learningProgress = roadmapItems.length
    ? Math.round((completedTasks / roadmapItems.length) * 100)
    : null;
  const chartData = useMemo(() => getActivityChart(activities), [activities]);
  const nextTask = roadmapItems.find((item) => item.status !== "completed");
  const nextAction = !profile?.targetRole
    ? { title: "Add your career goal", detail: "Set a target role in your profile before generating a skill-gap analysis.", path: "/profile", label: "Complete profile" }
    : !profile?.skills?.length
      ? { title: "Add your technical skills", detail: "Your listed skills are used to tailor career guidance.", path: "/profile", label: "Add skills" }
      : !learningPlan
        ? { title: "Generate a personalized learning plan", detail: "Use your target role and skills to identify learning priorities.", path: "/roadmap", label: "Create roadmap" }
        : nextTask
          ? { title: `Continue: ${nextTask.title}`, detail: "Resume the next incomplete learning task in your saved roadmap.", path: "/roadmap", label: "Continue learning" }
          : !audits.length
            ? { title: "Submit public work for review", detail: "A limited code review can provide evidence about a public project.", path: "/proof", label: "Review repository" }
            : { title: "Review your development progress", detail: "Check your saved skills, activity, and evidence.", path: "/progress", label: "View progress" };

  if (loading) {
    return (
      <div className="space-y-6 p-5 sm:p-8" aria-busy="true">
        <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={refresh} className="ml-auto font-semibold underline">Retry</button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#172554] via-[#1e40af] to-[#6d28d9] p-7 text-white shadow-xl sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-blue-100">
            <Sparkles size={13} /> STUDENT CAREER WORKSPACE
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome{profile?.name ? `, ${profile.name}` : ""}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
            {profile?.targetRole
              ? `Your saved career target is ${profile.targetRole}. Track your own skills, learning activity, and reviewed evidence here.`
              : "Complete your profile with a career target and skills to make your workspace more useful."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate("/profile")} className="rounded-xl bg-white px-5 py-3 text-xs font-bold text-blue-800 hover:bg-blue-50">
              Update my profile <ArrowUpRight size={14} className="ml-1 inline" />
            </button>
            <button type="button" onClick={() => navigate("/roadmap")} className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-semibold text-white hover:bg-white/20">
              Learning roadmap <Route size={14} className="ml-1 inline" />
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border-[35px] border-white/5" />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Skills in profile" value={profile?.skills?.length ?? 0} detail="Self-reported skills · open analyzer" icon={BrainCircuit} tone="bg-blue-50 text-blue-600" onClick={() => navigate("/skills")} />
        <StatCard title="Evidence reviewed" value={audits.length} detail="Repository review records · open evidence" icon={ShieldCheck} tone="bg-violet-50 text-violet-600" onClick={() => navigate("/proof")} />
        <StatCard title="Learning progress" value={learningProgress === null ? "—" : `${learningProgress}%`} detail={roadmapItems.length ? `${completedTasks} of ${roadmapItems.length} saved roadmap tasks` : "No saved roadmap tasks"} icon={Target} tone="bg-emerald-50 text-emerald-600" onClick={() => navigate("/roadmap")} />
        <StatCard title="Career readiness" value={readiness.score === null ? "—" : `${readiness.score}%`} detail={readiness.score === null ? "More profile, role, learning, and evidence data is needed" : "Equal-weight indicator · open skill analysis"} icon={TrendingUp} tone="bg-amber-50 text-amber-600" onClick={() => navigate("/skills")} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 xl:col-span-2">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recorded learning activity</h2>
              <p className="mt-1 text-xs text-slate-500">Roadmap task events saved during the last seven days. No events are inferred.</p>
            </div>
            <button type="button" onClick={() => navigate("/progress")} className="shrink-0 text-xs font-semibold text-blue-600 hover:underline">View progress</button>
          </div>
          {activities.some((activity) => activity.kind?.startsWith("roadmap_item_")) ? (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="studentActivityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="activities" name="Roadmap actions" stroke="#3b82f6" strokeWidth={3} fill="url(#studentActivityFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState>No roadmap activity is available yet. Generate a plan and update task statuses to begin recording progress.</EmptyState>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">Career readiness breakdown</h2>
            <button type="button" onClick={() => navigate("/skills")} className="shrink-0 text-xs font-semibold text-blue-600 hover:underline">View skills</button>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            The indicator is an equal-weight average of five recorded dimensions. It appears only when all five have data; it is not an employment prediction.
          </p>
          <div className="mt-5 space-y-4">
            {readiness.components.map((component) => (
              <div key={component.label}>
                <div className="mb-1.5 flex justify-between gap-2 text-xs">
                  <span className="text-slate-600">{component.label}</span>
                  <span className="font-semibold text-slate-800">{component.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${component.value}%` }} />
                </div>
              </div>
            ))}
            {readiness.score === null && (
              <EmptyState>
                Indicator unavailable: missing dimensions include career-role skill analysis, self-reported skills, projects, audit submissions, or roadmap tasks.
              </EmptyState>
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">My skills</h2>
              <p className="mt-1 text-xs text-slate-500">Proficiency levels come from your profile and are self-reported.</p>
            </div>
            <button type="button" onClick={() => navigate("/profile")} className="text-xs font-semibold text-blue-600">Edit</button>
          </div>
          {profile?.skills?.length ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill.id || skill.name} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                  {skill.name} · {skill.proficiency || "Unspecified"}
                </span>
              ))}
            </div>
          ) : <EmptyState>No skills saved yet.</EmptyState>}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent student activity</h2>
              <p className="mt-1 text-xs text-slate-500">Activity from saved profile records and completed actions.</p>
            </div>
            <button type="button" onClick={() => navigate("/progress")} className="text-xs font-semibold text-blue-600">Progress</button>
          </div>
          {activities.length ? (
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-lg bg-emerald-50 p-2 text-emerald-600"><CheckCircle2 size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatRelativeDate(activity.occurredAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState>No saved activity is available yet.</EmptyState>}
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <BriefcaseBusiness size={18} className="text-blue-600" /> Internship listings
              </h2>
              <p className="mt-1 text-xs text-slate-500">Live listings sourced from Arbeitnow. Details not supplied by the source are marked unavailable.</p>
            </div>
            <button type="button" onClick={() => navigate("/internships")} className="shrink-0 text-xs font-semibold text-blue-600 hover:underline">Browse</button>
          </div>
          {opportunities.length ? (
            <div className="space-y-3">
              {opportunities.slice(0, 4).map((item) => (
                <a key={item.id} href={item.applicationUrl} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-100 p-4 hover:border-blue-200 hover:bg-blue-50/30">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.company} · {item.location}</p>
                  <p className="mt-2 text-[11px] text-slate-400">Source checked {formatRelativeDate(item.verifiedAt)} · Deadline not provided</p>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState>{opportunityError || "No live internship listings are currently available from the source."}</EmptyState>
          )}
          <p className="mt-4 text-[11px] leading-5 text-slate-400">
            Listings are not personalized, eligibility is not independently verified, and no match score is claimed.{" "}
            <a href="https://www.arbeitnow.com/api/job-board-api" target="_blank" rel="noreferrer" className="font-semibold text-blue-600 underline">Provider source</a>
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Upcoming deadlines</h2>
              <p className="mt-1 text-xs text-slate-500">Only deadlines included in verified source records are shown.</p>
            </div>
            <button type="button" onClick={() => navigate("/hackathons")} className="shrink-0 text-xs font-semibold text-blue-600 hover:underline">Events</button>
          </div>
          <EmptyState>No verified internship, hackathon, or course deadlines are available.</EmptyState>
        </article>
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-white p-3 text-blue-600 shadow-sm"><Clock3 size={20} /></span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{nextAction.title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">{nextAction.detail}</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate(nextAction.path)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white hover:bg-blue-700">
          {nextAction.label} <ArrowRight size={14} />
        </button>
      </section>

      <p className="pb-2 text-center text-xs text-slate-400">
        Dashboard facts reflect saved student information. External listings link to their source; unavailable data is not estimated.
      </p>
    </div>
  );
}
