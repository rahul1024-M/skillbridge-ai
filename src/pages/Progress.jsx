import { useMemo } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  Target,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudentDashboard } from "../hooks/useStudentDashboard";
import { getCareerReadiness } from "../utils/careerMetrics";

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString();
}

export default function Progress() {
  const navigate = useNavigate();
  const data = useStudentDashboard();
  const { profile, roadmapItems, activities, audits, loading, error, refresh } = data;
  const readiness = getCareerReadiness(data);
  const completedTasks = roadmapItems.filter((item) => item.status === "completed").length;
  const progress = roadmapItems.length ? Math.round((completedTasks / roadmapItems.length) * 100) : null;
  const completedProjects = profile?.projects?.filter((project) => project.status === "Completed").length || 0;
  const recentWeek = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const count = activities.filter((item) => new Date(item.occurredAt).toDateString() === date.toDateString()).length;
    return { day: date.toLocaleDateString(undefined, { weekday: "short" }), count };
  }), [activities]);
  const maxActivity = Math.max(1, ...recentWeek.map((day) => day.count));

  if (loading) {
    return (
      <div className="space-y-6 p-5 md:p-8" aria-busy="true">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-sm font-semibold text-blue-600">PERFORMANCE TRACKER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">My Progress</h1>
          <p className="mt-2 text-sm text-slate-500">A view of saved student records and recorded actions.</p>
        </header>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button type="button" onClick={refresh} className="ml-auto font-semibold underline">Retry</button>
          </div>
        )}

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Learning progress" value={progress === null ? "—" : `${progress}%`} detail={roadmapItems.length ? `${completedTasks}/${roadmapItems.length} saved roadmap tasks complete` : "No saved roadmap tasks"} icon={TrendingUp} onClick={() => navigate("/roadmap")} />
          <Stat title="Profile skills" value={profile?.skills?.length || 0} detail="Self-reported entries · open analyzer" icon={Target} onClick={() => navigate("/skills")} />
          <Stat title="Completed projects" value={completedProjects} detail={`${profile?.projects?.length || 0} projects in profile · manage projects`} icon={Award} onClick={() => navigate("/profile")} />
          <Stat title="Evidence reviews" value={audits.length} detail="Repository review records · open evidence" icon={Code2} onClick={() => navigate("/proof")} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Career readiness indicator</h2>
                <p className="mt-1 text-xs text-slate-500">Equal-weight average; shown only when all five dimensions have data.</p>
              </div>
              <Target className="text-blue-600" size={23} />
            </div>
            {readiness.score === null ? (
              <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                Not yet calculable. Add a target role and skills, generate a role-skill analysis, record projects, review repository evidence, and complete roadmap tasks.
              </p>
            ) : (
              <>
                <p className="mt-6 text-4xl font-bold text-slate-900">{readiness.score}%</p>
                <div className="mt-5 space-y-4">
                  {readiness.components.map((component) => (
                    <div key={component.label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-slate-600">{component.label}</span>
                        <span className="font-semibold">{component.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${component.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="mt-4 text-[11px] leading-5 text-slate-400">
              Role coverage is AI-estimated; proficiency is self-reported. This is not a hiring prediction or certification.
            </p>
            <button type="button" onClick={() => navigate("/skills")} className="mt-4 text-xs font-semibold text-blue-600 hover:underline">Review skill analysis</button>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <Clock3 className="text-blue-600" size={23} />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recorded activity, last 7 days</h2>
                <p className="mt-1 text-xs text-slate-500">Counts from saved profile and progress events, not estimated hours.</p>
              </div>
            </div>
            <div className="mt-7 flex h-40 items-end justify-between gap-3">
              {recentWeek.map((day) => (
                <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs text-slate-500">{day.count || ""}</span>
                  <div className="flex h-28 w-full items-end rounded-lg bg-slate-100">
                    <div className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-indigo-400" style={{ height: `${day.count ? Math.max(8, (day.count / maxActivity) * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{day.day}</span>
                </div>
              ))}
            </div>
            {!activities.length && <p className="mt-4 text-center text-xs text-slate-400">No recorded activity yet.</p>}
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <BookOpen className="text-blue-600" size={22} />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Skill development</h2>
              <p className="mt-1 text-sm text-slate-500">Proficiency reflects the levels entered by you in your profile.</p>
            </div>
          </div>
          {profile?.skills?.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.skills.map((skill) => (
                <button key={skill.id || skill.name} type="button" onClick={() => navigate(`/skills?skill=${encodeURIComponent(skill.name)}`)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 p-4 text-left hover:border-blue-200 hover:bg-blue-50/30">
                  <span className="font-semibold text-slate-800">{skill.name}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{skill.proficiency || "Unspecified"}</span>
                </button>
              ))}
            </div>
          ) : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No skills saved yet.</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Recent activities</h2>
          {activities.length ? (
            <div className="mt-5 space-y-3">
              {activities.map((activity) => (
                <article key={activity.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(activity.occurredAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No recorded activities are available.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ title, value, detail, icon: Icon, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={20} /></span>
      </div>
      <p className="mt-5 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </button>
  );
}
