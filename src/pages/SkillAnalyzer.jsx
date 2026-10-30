
import { useMemo, useState } from "react";
import {
  BrainCircuit,
  Sparkles,
  Target,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Code2,
  Award,
  ArrowRight,
  X,
  Plus,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

const initialSkills = [
  { name: "Python", level: "Intermediate", score: 68, category: "Programming" },
  { name: "Java", level: "Beginner", score: 35, category: "Programming" },
  { name: "HTML & CSS", level: "Advanced", score: 85, category: "Web Development" },
  { name: "JavaScript", level: "Intermediate", score: 60, category: "Web Development" },
  { name: "SQL", level: "Beginner", score: 30, category: "Database" },
];

const recommendations = [
  { name: "Data Structures & Algorithms", reason: "Build problem-solving foundations", priority: "High" },
  { name: "React.js", reason: "Strengthen modern frontend development", priority: "High" },
  { name: "Database Management", reason: "Improve your data handling skills", priority: "Medium" },
];

const levelFromScore = (score) => {
  if (score >= 80) return "Advanced";
  if (score >= 60) return "Intermediate";
  return "Beginner";
};

export default function SkillAnalyzer() {
  const [skills, setSkills] = useState(initialSkills);
  const [skillName, setSkillName] = useState("");
  const [category, setCategory] = useState("Programming");
  const [score, setScore] = useState(50);
  const [showForm, setShowForm] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const averageScore = useMemo(
    () => Math.round(skills.reduce((sum, skill) => sum + skill.score, 0) / Math.max(skills.length, 1)),
    [skills]
  );

  const addSkill = () => {
    const name = skillName.trim();
    if (!name || skills.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;

    setSkills((current) => [
      ...current,
      { name, category, score: Number(score), level: levelFromScore(Number(score)) },
    ]);
    setSkillName("");
    setScore(50);
    setShowForm(false);
  };

  const removeSkill = (name) => {
    setSkills((current) => current.filter((skill) => skill.name !== name));
    if (selectedSkill?.name === name) setSelectedSkill(null);
  };

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            <Sparkles size={14} /> AI Career Intelligence
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Skill Analyzer
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Understand your current capabilities, identify skill gaps, and build a stronger career profile.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
        >
          <Plus size={17} /> Add Skill
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BrainCircuit} label="Skills Identified" value={skills.length} detail="In your profile" />
        <StatCard icon={TrendingUp} label="Average Proficiency" value={`${averageScore}%`} detail="Based on self-assessment" />
        <StatCard icon={Award} label="Advanced Skills" value={skills.filter((s) => s.score >= 80).length} detail="Strong skill areas" />
        <StatCard icon={Target} label="Growth Opportunities" value={recommendations.length} detail="Suggested learning areas" />
      </div>

      {showForm && (
        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Add a new skill</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Skill name</label>
              <input
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="e.g. React, Python, SQL"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
              >
                <option>Programming</option>
                <option>Web Development</option>
                <option>Database</option>
                <option>AI & Machine Learning</option>
                <option>Cloud & DevOps</option>
                <option>Soft Skills</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <label>Self-assessed proficiency</label>
              <span className="text-blue-600">{score}% · {levelFromScore(score)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="mt-3 w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>Beginner</span><span>Intermediate</span><span>Advanced</span>
            </div>
          </div>

          <button
            onClick={addSkill}
            disabled={!skillName.trim() || skills.some((s) => s.name.toLowerCase() === skillName.trim().toLowerCase())}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save Skill
          </button>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Skill Portfolio</h2>
              <p className="mt-1 text-xs text-slate-500">Your current self-assessed proficiency levels</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              {skills.length} skills
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {skills.map((skill) => (
              <div key={skill.name} className="group">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => setSelectedSkill(skill)} className="text-left">
                    <span className="text-sm font-semibold text-slate-800 hover:text-blue-600">{skill.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{skill.category}</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500">{skill.level}</span>
                    <span className="w-10 text-right text-sm font-bold tabular-nums text-slate-800">{skill.score}%</span>
                    <button onClick={() => removeSkill(skill.name)} title="Remove skill" className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100">
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" style={{ width: `${skill.score}%` }} />
                </div>
              </div>
            ))}

            {skills.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No skills added yet. Add your first skill to begin.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Target size={21} /></div>
            <div>
              <h2 className="font-bold text-slate-900">Skill Distribution</h2>
              <p className="text-xs text-slate-500">Your proficiency mix</p>
            </div>
          </div>

          <div className="mt-7 flex justify-center">
            <div
              className="relative flex h-44 w-44 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#2563eb 0% ${skills.filter((s) => s.score >= 80).length / Math.max(skills.length, 1) * 100}%, #818cf8 ${skills.filter((s) => s.score >= 80).length / Math.max(skills.length, 1) * 100}% ${skills.filter((s) => s.score >= 80 || (s.score >= 60 && s.score < 80)).length / Math.max(skills.length, 1) * 100}%, #e2e8f0 ${skills.filter((s) => s.score >= 80 || (s.score >= 60 && s.score < 80)).length / Math.max(skills.length, 1) * 100}% 100%)`,
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-3xl font-extrabold text-slate-900">{averageScore}%</span>
                <span className="mt-1 text-xs text-slate-400">Average score</span>
              </div>
            </div>
          </div>

          <div className="mt-7 space-y-3">
            <Legend color="bg-blue-600" label="Advanced" count={skills.filter((s) => s.score >= 80).length} />
            <Legend color="bg-indigo-400" label="Intermediate" count={skills.filter((s) => s.score >= 60 && s.score < 80).length} />
            <Legend color="bg-slate-200" label="Beginner" count={skills.filter((s) => s.score < 60).length} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="text-amber-500" size={20} />
              <h2 className="text-lg font-bold text-slate-900">Recommended Skill Development</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Suggested learning priorities based on this demo profile</p>
          </div>
          <button onClick={() => setShowRecommendations(!showRecommendations)} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
            {showRecommendations ? "Hide details" : "View recommendations"} <ArrowRight size={16} />
          </button>
        </div>

        {showRecommendations && (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {recommendations.map((item) => (
              <div key={item.name} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <BookOpen size={19} className="text-blue-600" />
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.priority === "High" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                    {item.priority} priority
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-800">{item.name}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{item.reason}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedSkill && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Code2 className="text-blue-600" size={22} />
              <div>
                <h3 className="font-bold text-slate-900">{selectedSkill.name}</h3>
                <p className="text-xs text-slate-500">{selectedSkill.category} · {selectedSkill.level}</p>
              </div>
            </div>
            <button onClick={() => setSelectedSkill(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
          </div>
          <p className="mt-3 text-sm text-slate-700">
            Your current self-assessment is {selectedSkill.score}%. Add practical project evidence in Proof of Work to support this skill claim.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-700">
            <ShieldCheck size={15} /> Self-assessed · Not independently verified
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={20} />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Evidence-based skill development</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            These proficiency values are demonstration data and self-assessments, not AI-verified results. Use real projects, code reviews, and assessments to validate your abilities.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={20} /></div>
        <TrendingUp size={17} className="text-emerald-500" />
      </div>
      <p className="mt-5 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function Legend({ color, label, count }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-slate-600">{label}</span>
      </div>
      <span className="font-semibold text-slate-800">{count}</span>
    </div>
  );
}
