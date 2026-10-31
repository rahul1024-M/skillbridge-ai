import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Route,
  Sparkles,
  Target,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { fetchStudentProfile } from "../services/profileRepository";
import { generateCareerPlan } from "../services/careerIntelligence";
import { supabase } from "../services/supabase";
import {
  fetchActiveRoadmap,
  replaceActiveRoadmap,
  updateRoadmapItemStatus,
} from "../services/roadmapRepository";

const LEVEL_SCORE = { Beginner: 1, Intermediate: 2, Advanced: 3 };

function readLocalProfile() {
  try {
    const saved = localStorage.getItem("skillbridge_student_profile");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function Roadmap() {
  const { isConfigured, user, session } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState(() => isConfigured ? null : readLocalProfile());
  const [roadmap, setRoadmap] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(isConfigured);
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener("studentProfileUpdated", handleUpdate);
    window.addEventListener("studentProgressUpdated", handleUpdate);
    return () => {
      window.removeEventListener("studentProfileUpdated", handleUpdate);
      window.removeEventListener("studentProgressUpdated", handleUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!isConfigured || !user) {
      setProfile(readLocalProfile());
      setRoadmap(null);
      setPlan(null);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError("");
    Promise.all([
      fetchStudentProfile(user),
      fetchActiveRoadmap(user.id),
      supabase.from("student_career_analyses")
        .select("plan")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data, error: queryError }) => {
          if (queryError) throw queryError;
          return data?.plan || null;
        }),
    ])
      .then(([savedProfile, savedRoadmap, savedPlan]) => {
        if (!active) return;
        setProfile(savedProfile);
        setRoadmap(savedRoadmap);
        setPlan(savedPlan);
      })
      .catch((loadError) => {
        if (active) {
          console.error("Roadmap load error:", loadError);
          setError(loadError.message || "Unable to load your roadmap.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [isConfigured, user, refreshKey]);

  const completedCount = roadmap?.items?.filter((item) => item.status === "completed").length || 0;
  const totalCount = roadmap?.items?.length || 0;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextTask = roadmap?.items?.find((item) => item.status !== "completed");
  const skills = profile?.skills || [];

  useEffect(() => {
    const taskId = new URLSearchParams(location.search).get("task");
    if (!taskId || !roadmap?.items?.some((item) => item.id === taskId)) return undefined;
    const timer = window.setTimeout(() => {
      const task = document.getElementById(`roadmap-task-${taskId}`);
      task?.scrollIntoView({ behavior: "smooth", block: "center" });
      task?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.search, roadmap]);

  const proficiencySummary = useMemo(() => {
    if (!skills.length) return "No skills are saved in your profile yet.";
    const score = skills.reduce((sum, skill) => sum + (LEVEL_SCORE[skill.proficiency] || 1), 0);
    const average = score / skills.length;
    return `Current self-reported proficiency average: ${average.toFixed(1)} of 3 across ${skills.length} saved skills.`;
  }, [skills]);

  const handleGenerate = async () => {
    if (!isConfigured || !session?.access_token) return;
    if (!profile?.targetRole) {
      setError("Add a target job role to your profile before generating a personalized roadmap.");
      return;
    }
    if (!profile.skills?.length) {
      setError("Add at least one saved skill to your profile so the roadmap can identify relevant learning gaps.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const generated = await generateCareerPlan(session.access_token);
      if (!generated.roadmap?.length) {
        throw new Error("The career plan did not include any roadmap tasks. Try again.");
      }
      await replaceActiveRoadmap({
        title: `Learning plan: ${profile.targetRole}`,
        targetRole: profile.targetRole,
        sourceProfile: {
          targetRole: profile.targetRole,
          preferredDomain: profile.preferredDomain,
          skills: profile.skills.map(({ name, proficiency }) => ({ name, proficiency })),
        },
        items: generated.roadmap,
        plan: generated,
      });
      setPlan(generated);
      await refresh();
      window.dispatchEvent(new CustomEvent("studentProgressUpdated"));
    } catch (generationError) {
      console.error("Career plan generation error:", generationError);
      setError(generationError.message || "Unable to generate your personalized roadmap.");
    } finally {
      setGenerating(false);
    }
  };

  const handleStatus = async (item, status) => {
    setUpdatingId(item.id);
    setError("");
    try {
      await updateRoadmapItemStatus(item.id, status);
      await refresh();
      window.dispatchEvent(new CustomEvent("studentProgressUpdated"));
    } catch (updateError) {
      console.error("Roadmap progress update error:", updateError);
      setError(updateError.message || "Unable to update this task.");
    } finally {
      setUpdatingId("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-5 sm:p-8" aria-busy="true">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            <Sparkles size={14} /> Personalized learning
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Learning Roadmap
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Build a learning plan from your saved skills and career goal. Tasks and completion are stored in your student account.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!isConfigured || !profile?.targetRole || !profile?.skills?.length || generating}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          {generating ? "Generating plan..." : roadmap ? "Regenerate roadmap" : "Generate roadmap"}
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button type="button" className="ml-auto font-semibold underline" onClick={refresh}>Retry</button>
        </div>
      )}

      {!isConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Personalized AI roadmaps require a configured Supabase account and backend. No sample learning plan is displayed as your progress.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Target size={19} className="text-blue-600" /> Career target
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {profile?.targetRole || "No target role saved"}
              {profile?.preferredDomain ? ` · ${profile.preferredDomain}` : ""}
            </p>
            <p className="mt-1 text-xs text-slate-500">{proficiencySummary}</p>
          </div>
          <a href="/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">
            Update profile <ArrowUpRight size={15} />
          </a>
        </div>

        {(!profile?.targetRole || !profile?.skills?.length) && (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            {!profile?.targetRole && !profile?.skills?.length
              ? "Add a target job role and at least one skill to your profile before generating a personalized plan."
              : !profile?.targetRole
                ? "Add a target job role to your profile before generating a personalized plan."
                : "Add at least one skill to your profile before generating a personalized plan."}
            {" "}Your education details can further tailor recommendations.
          </p>
        )}
      </section>

      {roadmap ? (
        <>
          <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-violet-900 p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-200">
                  <Route size={15} /> Saved learning plan
                </p>
                <h2 className="mt-3 text-2xl font-bold">{roadmap.title}</h2>
                <p className="mt-2 text-sm text-blue-100">
                  {completedCount} of {totalCount} roadmap tasks complete
                </p>
              </div>
              <p className="text-3xl font-bold">{progress}%</p>
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
            </div>
            {nextTask && (
              <p className="mt-4 text-sm text-blue-100">
                Next task: <span className="font-semibold text-white">{nextTask.title}</span>
              </p>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Learning stages</h2>
            {roadmap.items.map((item, index) => (
              <article id={`roadmap-task-${item.id}`} key={item.id} tabIndex={-1} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    {item.status === "completed" ? <CheckCircle2 size={21} /> : <BookOpen size={21} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      Stage {index + 1}: {item.stage || "Learning task"}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">{item.skill || item.title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status !== "in_progress" && item.status !== "completed" && (
                      <button
                        type="button"
                        disabled={Boolean(updatingId)}
                        onClick={() => handleStatus(item, "in_progress")}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Start task
                      </button>
                    )}
                    {item.status !== "completed" ? (
                      <button
                        type="button"
                        disabled={Boolean(updatingId)}
                        onClick={() => handleStatus(item, "completed")}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {updatingId === item.id ? "Saving..." : "Mark complete"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(updatingId)}
                        onClick={() => handleStatus(item, "in_progress")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Completed
                      </button>
                    )}
                  </div>
                </div>

                {item.topics?.length > 0 && (
                  <p className="mt-4 text-xs leading-5 text-slate-600">
                    <strong>Topics:</strong> {item.topics.join(" · ")}
                  </p>
                )}
                {item.assignment && (
                  <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
                    <strong>Assignment:</strong> {item.assignment}
                  </p>
                )}
                {item.project_milestones?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    {item.project_milestones.map((milestone) => <li key={milestone}>• {milestone}</li>)}
                  </ul>
                )}
                {item.resources?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {item.resources.map((resource) => (
                      <a
                        key={resource.url}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                      >
                        <BookOpen size={13} /> {resource.title} <ArrowUpRight size={12} />
                      </a>
                    ))}
                  </div>
                )}
                <p className="mt-4 flex items-center gap-1 text-xs text-slate-400">
                  <Clock3 size={13} /> Estimated {Math.max(1, Math.round((item.estimated_minutes || 0) / 300))} week(s)
                  {item.status === "completed" && item.completed_at ? ` · Completed ${new Date(item.completed_at).toLocaleDateString()}` : ""}
                </p>
              </article>
            ))}
          </section>

          {plan?.skillGaps?.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Lightbulb size={19} className="text-amber-500" /> Skill gaps and improvement priorities
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                AI-generated suggestions based on profile details you provided; review them as guidance, not verified requirements.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {plan.skillGaps.map((gap, index) => (
                  <article key={`${gap.skill}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{gap.skill}</h3>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">
                        {gap.importance} priority
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      {gap.status === "improve" ? `Current: ${gap.currentLevel} · ` : "Not listed in your profile · "}
                      Suggested level: {gap.recommendedLevel}
                    </p>
                    <p className="mt-2 text-sm leading-5 text-slate-600">{gap.why}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {plan?.projects?.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Code2 size={19} className="text-violet-600" /> Project ideas for this goal
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {plan.projects.map((project) => (
                  <article key={project.title} className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold text-violet-700">
                      {project.difficulty} · {project.estimatedWeeks} weeks
                    </p>
                    <h3 className="mt-1 font-bold text-slate-900">{project.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-slate-600">{project.description}</p>
                    {project.technologies?.length > 0 && (
                      <p className="mt-3 text-xs text-slate-500">{project.technologies.join(" · ")}</p>
                    )}
                    {project.features?.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-slate-600">
                        {project.features.map((feature) => <li key={feature}>• {feature}</li>)}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Route size={26} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">No saved roadmap yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            {isConfigured
              ? "Save a target role and at least one skill in your profile, then generate a roadmap based on your actual skills and education."
              : "Configure Supabase and the backend to generate and persist a personalized plan. No illustrative progress is shown."}
          </p>
        </section>
      )}

      <p className="text-center text-xs text-slate-400">
        AI recommendations are guidance, not verified career requirements. Review the cited learning resources independently.
      </p>
    </div>
  );
}
