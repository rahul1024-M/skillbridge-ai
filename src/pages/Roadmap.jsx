
import { useMemo, useState } from "react";
import {
  Route,
  CircleCheck,
  Circle,
  Clock,
  Sparkles,
  Code2,
  BookOpen,
  Target,
  Trophy,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Rocket,
  Lightbulb,
} from "lucide-react";

const initialPhases = [
  {
    id: 1,
    name: "Programming Foundations",
    level: "Beginner",
    duration: "2 weeks",
    description: "Build a strong foundation in programming and logical thinking.",
    icon: Code2,
    color: "blue",
    tasks: [
      "Understand variables, data types and operators",
      "Learn conditional statements and loops",
      "Practice functions and object-oriented programming",
      "Solve 15 beginner programming problems",
    ],
    project: "Build a Student Grade Calculator",
  },
  {
    id: 2,
    name: "Data Structures & Algorithms",
    level: "Beginner to Intermediate",
    duration: "4 weeks",
    description: "Develop problem-solving skills and understand core data structures.",
    icon: Target,
    color: "violet",
    tasks: [
      "Learn arrays, strings and linked lists",
      "Understand stacks and queues",
      "Practice searching and sorting algorithms",
      "Solve basic recursion and tree problems",
      "Practice problems on coding platforms",
    ],
    project: "Build a Contact Management System",
  },
  {
    id: 3,
    name: "Frontend Development",
    level: "Intermediate",
    duration: "3 weeks",
    description: "Create responsive and interactive web applications.",
    icon: Code2,
    color: "cyan",
    tasks: [
      "Master HTML semantic elements",
      "Learn CSS layouts, Flexbox and Grid",
      "Understand JavaScript and DOM manipulation",
      "Learn React components, hooks and routing",
    ],
    project: "Build a Personal Portfolio Website",
  },
  {
    id: 4,
    name: "Backend Development",
    level: "Intermediate",
    duration: "4 weeks",
    description: "Learn how servers, APIs, databases and authentication work.",
    icon: Rocket,
    color: "emerald",
    tasks: [
      "Learn Node.js and Express",
      "Understand REST API development",
      "Learn SQL and database operations",
      "Implement authentication and authorization",
      "Connect frontend with backend APIs",
    ],
    project: "Build a Full-Stack Student Management System",
  },
  {
    id: 5,
    name: "Real-World Projects & Deployment",
    level: "Advanced",
    duration: "3 weeks",
    description: "Convert your knowledge into practical, demonstrable experience.",
    icon: Trophy,
    color: "amber",
    tasks: [
      "Build a complete full-stack application",
      "Upload and document projects on GitHub",
      "Write project documentation and README",
      "Deploy your application online",
      "Prepare a technical project demonstration",
    ],
    project: "Launch a Production-Ready Web Application",
  },
];

export default function Roadmap() {
  const [phases, setPhases] = useState(initialPhases);
  const [expanded, setExpanded] = useState(1);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [completedProjects, setCompletedProjects] = useState([]);

  const totalTasks = phases.reduce((sum, phase) => sum + phase.tasks.length + 1, 0);
  const completedCount = completedTasks.length + completedProjects.length;

  const progress = useMemo(
    () => Math.round((completedCount / totalTasks) * 100),
    [completedCount, totalTasks]
  );

  const toggleTask = (phaseId, taskIndex) => {
    const key = `${phaseId}-${taskIndex}`;
    setCompletedTasks((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key]
    );
  };

  const toggleProject = (phaseId) => {
    setCompletedProjects((previous) =>
      previous.includes(phaseId)
        ? previous.filter((item) => item !== phaseId)
        : [...previous, phaseId]
    );
  };

  const completedPhases = phases.filter((phase) =>
    phase.tasks.every((_, index) =>
      completedTasks.includes(`${phase.id}-${index}`)
    ) && completedProjects.includes(phase.id)
  ).length;

  const totalDuration = phases.reduce(
    (sum, phase) => sum + Number.parseInt(phase.duration, 10),
    0
  );

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            <Sparkles size={14} /> Personalized Learning
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Learning Roadmap
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Your structured journey from programming fundamentals to building real-world software projects.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          <Route size={18} /> Developer Path
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-violet-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
              Your career development journey
            </span>
            <h2 className="mt-5 text-2xl font-extrabold">Become a Software Developer</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-blue-100">
              Learn essential technologies, complete practical tasks and build projects that demonstrate your abilities.
            </p>
          </div>
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <span className="text-2xl font-extrabold">{progress}%</span>
            <span className="text-[10px] text-blue-100">COMPLETED</span>
          </div>
        </div>

        <div className="mt-7">
          <div className="mb-2 flex justify-between text-xs text-blue-100">
            <span>Overall roadmap progress</span>
            <span>{completedCount}/{totalTasks} activities</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-white transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpen} label="Learning Phases" value={phases.length} detail="Structured stages" />
        <Stat icon={CheckCircle2} label="Completed Phases" value={completedPhases} detail="All tasks and projects done" />
        <Stat icon={Clock} label="Estimated Duration" value={`${totalDuration} weeks`} detail="Based on suggested schedule" />
        <Stat icon={Trophy} label="Completed Activities" value={`${completedCount}/${totalTasks}`} detail="Tasks and projects" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Learning Path</h2>
              <p className="mt-1 text-xs text-slate-500">Expand each phase to view its milestones.</p>
            </div>
          </div>

          {phases.map((phase, index) => {
            const Icon = phase.icon;
            const isExpanded = expanded === phase.id;
            const phaseCompleted = phase.tasks.every((_, taskIndex) =>
              completedTasks.includes(`${phase.id}-${taskIndex}`)
            ) && completedProjects.includes(phase.id);

            const phaseDone = phase.tasks.filter((_, taskIndex) =>
              completedTasks.includes(`${phase.id}-${taskIndex}`)
            ).length + (completedProjects.includes(phase.id) ? 1 : 0);

            const phaseTotal = phase.tasks.length + 1;
            const phaseProgress = Math.round((phaseDone / phaseTotal) * 100);

            return (
              <div key={phase.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  onClick={() => setExpanded(isExpanded ? null : phase.id)}
                  className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    phaseCompleted ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {phaseCompleted ? <CheckCircle2 size={23} /> : <Icon size={23} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        PHASE {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                        {phase.level}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{phase.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{phase.duration} · {phaseDone}/{phaseTotal} activities</p>
                  </div>

                  <div className="hidden w-24 sm:block">
                    <p className="mb-1 text-right text-xs font-bold text-slate-600">{phaseProgress}%</p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${phaseProgress}%` }} />
                    </div>
                  </div>

                  {isExpanded ? <ChevronUp className="shrink-0 text-slate-400" size={19} /> : <ChevronDown className="shrink-0 text-slate-400" size={19} />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-5">
                    <p className="text-sm leading-6 text-slate-600">{phase.description}</p>

                    <h4 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Learning milestones
                    </h4>

                    <div className="mt-4 space-y-4">
                      {phase.tasks.map((task, taskIndex) => {
                        const key = `${phase.id}-${taskIndex}`;
                        const done = completedTasks.includes(key);

                        return (
                          <button
                            key={key}
                            onClick={() => toggleTask(phase.id, taskIndex)}
                            className="flex w-full items-start gap-3 text-left"
                          >
                            {done
                              ? <CircleCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                              : <Circle size={20} className="mt-0.5 shrink-0 text-slate-300" />}
                            <span className={`text-sm leading-5 ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                              {task}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <Rocket size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Practical project</span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-900">{phase.project}</p>
                      <button
                        onClick={() => toggleProject(phase.id)}
                        className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                          completedProjects.includes(phase.id)
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {completedProjects.includes(phase.id)
                          ? <><CheckCircle2 size={15} /> Project completed</>
                          : <><Circle size={15} /> Mark project complete</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600"><Lightbulb size={21} /></div>
              <div>
                <h3 className="font-bold text-slate-900">Learning Strategy</h3>
                <p className="text-xs text-slate-500">Make every week count</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <Tip title="Learn consistently" text="Spend 1–2 focused hours every day learning and practicing." />
              <Tip title="Build while learning" text="Turn every major concept into a small working project." />
              <Tip title="Track your evidence" text="Upload your code to GitHub and use Proof of Work to review it." />
              <Tip title="Revise regularly" text="Revisit difficult topics and solve additional problems." />
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white">
            <Trophy size={25} />
            <h3 className="mt-4 font-bold">Your next milestone</h3>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              {phases.find((phase) => !(
                phase.tasks.every((_, i) => completedTasks.includes(`${phase.id}-${i}`)) &&
                completedProjects.includes(phase.id)
              ))?.name || "All learning phases completed!"}
            </p>
            <p className="mt-3 text-xs text-blue-100">
              Complete the learning tasks and practical project in each phase.
            </p>
          </div>
        </aside>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <Sparkles className="mt-0.5 shrink-0 text-blue-600" size={20} />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Your roadmap, your progress</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            This roadmap is a suggested software development learning path. The duration is an estimate, and completion is currently tracked in this page session. It is not yet personalized by Gemini or saved to Supabase.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={20} /></div>
      </div>
      <p className="mt-5 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function Tip({ title, text }) {
  return (
    <div className="flex gap-3">
      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
