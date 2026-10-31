
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  FolderKanban,
  Sparkles,
  Search,
  Code2,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  X,
  Layers,
  Target,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { fetchStudentProfile } from "../services/profileRepository";
import { generateCareerPlan, saveCareerAnalysis } from "../services/careerIntelligence";
import { supabase } from "../services/supabase";

export const projectData = [
  {
    id: 1,
    title: "Student Management System",
    category: "Full Stack",
    level: "Beginner",
    duration: "2 weeks",
    description: "Create a platform to manage student profiles, attendance and academic records.",
    technologies: ["React", "Node.js", "MongoDB"],
    skills: ["React", "JavaScript", "Database"],
  },
  {
    id: 2,
    title: "AI Resume Analyzer",
    category: "Artificial Intelligence",
    level: "Intermediate",
    duration: "3 weeks",
    description: "Build a tool that analyses resumes and identifies missing skills and improvement areas.",
    technologies: ["Python", "Flask", "Gemini API"],
    skills: ["Python", "AI", "API"],
  },
  {
    id: 3,
    title: "Personal Portfolio Website",
    category: "Web Development",
    level: "Beginner",
    duration: "1 week",
    description: "Develop a professional portfolio to showcase your skills, projects and achievements.",
    technologies: ["HTML", "CSS", "JavaScript"],
    skills: ["HTML", "CSS", "JavaScript"],
  },
  {
    id: 4,
    title: "Online Learning Platform",
    category: "Full Stack",
    level: "Advanced",
    duration: "5 weeks",
    description: "Create a learning platform with courses, student accounts and progress tracking.",
    technologies: ["React", "Express", "Supabase"],
    skills: ["React", "Backend", "Database"],
  },
  {
    id: 5,
    title: "Smart Expense Tracker",
    category: "Application Development",
    level: "Intermediate",
    duration: "2 weeks",
    description: "Build an application to record expenses, categorize transactions and visualize spending.",
    technologies: ["React", "JavaScript", "Chart.js"],
    skills: ["JavaScript", "React", "Data Visualization"],
  },
  {
    id: 6,
    title: "Campus Event Management",
    category: "Web Development",
    level: "Intermediate",
    duration: "3 weeks",
    description: "Develop a system for discovering campus events and managing registrations.",
    technologies: ["React", "Node.js", "Supabase"],
    skills: ["React", "APIs", "Database"],
  },
];

const filters = ["All", "Beginner", "Intermediate", "Advanced"];
const PROJECT_IDEA_PREFIX = "SkillBridge curated project idea:";

function ideaMarker(projectId) {
  return `${PROJECT_IDEA_PREFIX} ${projectId}`;
}

export default function Projects() {
  const { isConfigured, user, session } = useAuth();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [projectView, setProjectView] = useState("all");
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [projectAction, setProjectAction] = useState("");
  const [projectMessage, setProjectMessage] = useState("");
  const [projectError, setProjectError] = useState("");
  const [personalizedProjects, setPersonalizedProjects] = useState([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    let active = true;
    if (!isConfigured || !user || !supabase) {
      setProfile(null);
      setProfileLoading(false);
      return () => { active = false; };
    }
    setProfileLoading(true);
    fetchStudentProfile(user)
      .then((studentProfile) => {
        if (active) setProfile(studentProfile);
      })
      .catch((loadError) => {
        if (active) {
          console.error("Project recommendation profile load error:", loadError);
          setPlanError(loadError.message || "Unable to load your profile.");
          setProjectError(loadError.message || "Your student projects could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    const handleProfileUpdate = (event) => {
      if (event.detail?.projects && active) setProfile(event.detail);
      else if (active) {
        fetchStudentProfile(user)
          .then((studentProfile) => { if (active) setProfile(studentProfile); })
          .catch((loadError) => {
            if (active) setPlanError(loadError.message || "Unable to refresh your profile.");
          });
      }
    };
    window.addEventListener("studentProfileUpdated", handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener("studentProfileUpdated", handleProfileUpdate);
    };
  }, [isConfigured, user]);

  const generateProjects = async () => {
    if (!profile?.targetRole || !session?.access_token || !user) return;
    setPlanLoading(true);
    setPlanError("");
    try {
      const response = await generateCareerPlan(session.access_token);
      await saveCareerAnalysis(user.id, response);
      setPersonalizedProjects(response.projects || []);
      window.dispatchEvent(new CustomEvent("studentProgressUpdated"));
    } catch (generationError) {
      console.error("Personalized project generation error:", generationError);
      setPlanError(generationError.message || "Unable to generate project suggestions.");
    } finally {
      setPlanLoading(false);
    }
  };

  const filteredProjects = projectData.filter((project) => {
    const matchesSearch = `${project.title} ${project.category} ${project.description} ${project.technologies.join(" ")} ${project.skills.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const savedProject = profile?.projects?.find((item) => item.contribution === ideaMarker(project.id));
    const isSaved = Boolean(savedProject);
    const isStarted = savedProject?.status === "In progress" || savedProject?.status === "Completed";
    const matchesView = projectView === "all" ||
      (projectView === "saved" && isSaved) ||
      (projectView === "started" && isStarted);
    return matchesSearch && matchesView && (filter === "All" || project.level === filter);
  });

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const searchQuery = query.get("search");
    if (searchQuery !== null) setSearch(searchQuery);
  }, [location.search]);

  useEffect(() => {
    const searchQuery = new URLSearchParams(location.search).get("search");
    if (!searchQuery) return;
    const match = projectData.find((project) =>
      project.title.toLocaleLowerCase() === searchQuery.toLocaleLowerCase()
    );
    if (match) setSelected(match);
  }, [location.search]);

  useEffect(() => {
    const requestedView = new URLSearchParams(location.search).get("view");
    if (["all", "saved", "started"].includes(requestedView)) {
      setProjectView(requestedView);
    }
  }, [location.search]);

  const saveProjectIdea = async (project, status) => {
    if (!isConfigured || !user || !supabase) {
      setProjectError("Sign in with a configured student account to save project activity.");
      return;
    }
    setProjectAction(String(project.id));
    setProjectError("");
    setProjectMessage("");
    const marker = ideaMarker(project.id);
    try {
      const existing = profile?.projects?.find((item) => item.contribution === marker);
      if (status === "remove") {
        if (!existing || existing.status !== "Planned") {
          throw new Error("Only a saved project that has not been started can be removed.");
        }
        const { error } = await supabase
          .from("projects")
          .delete()
          .eq("user_id", user.id)
          .eq("id", existing.id);
        if (error) throw error;
        setProfile((current) => ({
          ...current,
          projects: (current?.projects || []).filter((item) => item.id !== existing.id),
        }));
        setProjectMessage(`${project.title} removed from saved projects.`);
      } else {
        const record = {
          user_id: user.id,
          title: project.title,
          description: project.description,
          technologies: project.technologies,
          status,
          contribution: marker,
        };
        let savedRecord;
        if (existing) {
          const { data, error } = await supabase
            .from("projects")
            .update(record)
            .eq("user_id", user.id)
            .eq("id", existing.id)
            .select("id,title,description,technologies,status,contribution")
            .single();
          if (error) throw error;
          savedRecord = data;
        } else {
          const { data, error } = await supabase
            .from("projects")
            .insert(record)
            .select("id,title,description,technologies,status,contribution")
            .single();
          if (error) throw error;
          savedRecord = data;
        }
        const normalizedRecord = {
          id: savedRecord.id,
          title: savedRecord.title,
          description: savedRecord.description || "",
          technologies: savedRecord.technologies || [],
          status: savedRecord.status,
          contribution: savedRecord.contribution,
          repositoryUrl: "",
          liveUrl: "",
        };
        setProfile((current) => ({
          ...(current || {}),
          projects: [
            ...(current?.projects || []).filter((item) => item.contribution !== marker),
            normalizedRecord,
          ],
        }));
        setProjectMessage(status === "Planned"
          ? `${project.title} saved to your profile.`
          : `${project.title} added to your active projects.`);
      }
      window.dispatchEvent(new CustomEvent("studentProgressUpdated"));
    } catch (actionError) {
      console.error("Unable to update saved project activity:", actionError);
      setProjectError(actionError.message || "The project activity could not be saved.");
    } finally {
      setProjectAction("");
    }
  };

  const ideaRecord = (project) =>
    profile?.projects?.find((item) => item.contribution === ideaMarker(project.id));
  const savedProjects = projectData.filter((project) => Boolean(ideaRecord(project)));
  const startedProjects = projectData.filter((project) =>
    ["In progress", "Completed"].includes(ideaRecord(project)?.status)
  );
  const selectProjectView = (view) => {
    setProjectView(view);
    document.getElementById("project-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            <Sparkles size={14} /> Practical Experience
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Project Discovery
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Discover practical projects, strengthen your technical skills and build a portfolio that demonstrates what you can do.
          </p>
        </div>
        <button type="button" onClick={() => document.getElementById("project-catalog")?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100">
          <FolderKanban size={18} /> Project Hub
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Layers} label="Available Projects" value={projectData.length} onClick={() => selectProjectView("all")} />
        <Stat icon={CheckCircle2} label="Projects Started" value={profileLoading ? "…" : startedProjects.length} onClick={() => selectProjectView("started")} />
        <Stat icon={Target} label="Saved Projects" value={profileLoading ? "…" : savedProjects.length} onClick={() => selectProjectView("saved")} />
      </div>
      {(projectMessage || projectError || (!profileLoading && (!isConfigured || !user))) && (
        <div role={projectError ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${projectError ? "border-red-200 bg-red-50 text-red-700" : "border-blue-100 bg-blue-50 text-blue-800"}`}>
          {projectError || projectMessage || "Sign in to save or start projects to your student profile."}
          {projectError && <button type="button" onClick={() => setProjectError("")} className="ml-3 font-semibold underline">Dismiss</button>}
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
              <Sparkles size={15} /> SKILL-BASED PROJECT LEARNING
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">
              Turn your skills into real projects.
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Learn by building. Select a project, explore its technology stack and create practical evidence of your abilities.
            </p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <Code2 size={38} className="text-blue-200" />
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700">
              <Sparkles size={14} /> Profile-based project ideas
            </p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">
              {profile?.targetRole ? `Build toward ${profile.targetRole}` : "Set a career target to personalize project ideas"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              AI suggestions use your saved skills and goal. They are proposals, not existing projects or verified opportunities.
            </p>
          </div>
          <button
            type="button"
            onClick={generateProjects}
            disabled={!isConfigured || !session || !profile?.targetRole || planLoading}
            className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {planLoading ? "Generating..." : "Generate project ideas"}
          </button>
        </div>
        {!isConfigured && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            AI project suggestions require configured Supabase authentication and the backend. No generated suggestions are being simulated.
          </p>
        )}
        {planError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{planError}</p>}
        {personalizedProjects.length > 0 && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {personalizedProjects.map((project) => (
              <article key={project.title} className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                <p className="text-xs font-semibold text-violet-700">
                  {project.difficulty} · Estimated {project.estimatedWeeks} weeks
                </p>
                <h3 className="mt-1 font-bold text-slate-900">{project.title}</h3>
                <p className="mt-2 text-sm leading-5 text-slate-600">{project.description}</p>
                {project.technologies?.length > 0 && (
                  <p className="mt-3 text-xs text-slate-500">{project.technologies.join(" · ")}</p>
                )}
                {project.milestones?.length > 0 && (
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-slate-600">
                    {project.milestones.map((milestone) => <li key={milestone}>{milestone}</li>)}
                  </ol>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="project-catalog" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Explore Projects</h2>
            <p className="mt-1 text-xs text-slate-500">Choose a project based on your current experience.</p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {filteredProjects.length} results
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, technologies..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  filter === item
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Project activity filter">
          {[
            ["all", "All projects"],
            ["saved", "Saved"],
            ["started", "Started"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setProjectView(value)}
              aria-pressed={projectView === value}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${projectView === value ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <article key={project.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              {(() => {
                const record = ideaRecord(project);
                const isStarted = ["In progress", "Completed"].includes(record?.status);
                const isSaved = Boolean(record);
                const isBusy = Boolean(projectAction);
                return (
                  <>
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <FolderKanban size={22} />
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                  project.level === "Beginner"
                    ? "bg-emerald-50 text-emerald-700"
                    : project.level === "Intermediate"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-violet-50 text-violet-700"
                }`}>
                  {project.level}
                </span>
              </div>

              <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                {project.category}
              </p>
              <h3 className="mt-2 text-base font-bold text-slate-900">{project.title}</h3>
              <p className="mt-2 min-h-[60px] text-xs leading-5 text-slate-500">
                {project.description}
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Clock size={14} /> Estimated: {project.duration}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span key={tech} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-medium text-slate-600">
                    {tech}
                  </span>
                ))}
              </div>

              {isStarted && (
                <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 size={15} /> Added to your active projects
                </p>
              )}

              <div className="mt-auto flex items-center gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => setSelected(project)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View Details <ArrowUpRight size={14} />
                </button>
                <button
                  type="button"
                  disabled={isBusy || profileLoading || (isStarted && record?.status !== "Planned")}
                  onClick={() => saveProjectIdea(project, isSaved ? "remove" : "Planned")}
                  title={isStarted ? "Move an active project back to saved ideas before removing it" : isSaved ? "Remove saved project" : "Save project"}
                  aria-label={isSaved ? `Remove ${project.title} from saved projects` : `Save ${project.title}`}
                  className={`rounded-xl border p-2.5 transition ${
                    isSaved
                      ? "border-blue-200 bg-blue-50 text-blue-600"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isBusy ? <span className="text-[10px]">…</span> : isSaved ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                </button>
                <button
                  type="button"
                  disabled={isBusy || profileLoading || isStarted}
                  onClick={() => saveProjectIdea(project, "In progress")}
                  className="rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Saving…" : isStarted ? "Started" : "Start"}
                </button>
              </div>
                  </>
                );
              })()}
            </article>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Search size={30} className="mx-auto text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-800">No projects found</h3>
            <p className="mt-1 text-sm text-slate-500">{projectView === "saved" ? "No saved projects match. Save a project from All projects to see it here." : projectView === "started" ? "No started projects match. Start a project to track it here." : "Try another search or difficulty filter."}</p>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <Sparkles className="mt-0.5 shrink-0 text-blue-600" size={20} />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Build. Document. Demonstrate.</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            These are curated demonstration recommendations, not live AI-generated suggestions. Add your completed project to GitHub and use Proof of Work to review its technical evidence.
          </p>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{selected.category}</p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">{selected.description}</p>

            <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Skills you'll practice</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.skills.map((skill) => (
                <span key={skill} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{skill}</span>
              ))}
            </div>

            <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Recommended technology stack</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.technologies.map((tech) => (
                <span key={tech} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">{tech}</span>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <Clock size={15} /> Estimated duration: {selected.duration}
              <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 font-semibold">{selected.level}</span>
            </div>

            <button
              type="button"
              disabled={Boolean(projectAction) || profileLoading}
              onClick={() => {
                const record = ideaRecord(selected);
                const isStarted = ["In progress", "Completed"].includes(record?.status);
                void saveProjectIdea(selected, isStarted ? "Planned" : "In progress");
                setSelected(null);
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {["In progress", "Completed"].includes(ideaRecord(selected)?.status) ? "Move back to Saved Projects" : "Start This Project"}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={20} /></div>
      </div>
      <p className="mt-5 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
    </button>
  );
}
