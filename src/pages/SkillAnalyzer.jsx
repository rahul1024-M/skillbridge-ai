import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Award,
  BrainCircuit,
  Code2,
  Lightbulb,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { fetchStudentProfile, saveStudentProfile } from "../services/profileRepository";
import { supabase } from "../services/supabase";
import {
  calculateSkillAnalyzerMetrics,
  deduplicateNamedEntries,
  normalizeCareerSkillGaps,
} from "../utils/skillAnalyzerMetrics";

const LEVEL_SCORE = { Beginner: 33, Intermediate: 67, Advanced: 100 };
const LEVEL_RANK = { Beginner: 1, Intermediate: 2, Advanced: 3 };

function getEvidenceSkills(audits) {
  const skills = [];
  audits.forEach((audit) => {
    (Array.isArray(audit.skills) ? audit.skills : []).forEach((item) => {
      const name = typeof item === "string" ? item.trim() : String(item?.name || "").trim();
      if (name) skills.push({ name, evidence: typeof item === "object" ? item.evidence : "" });
    });
  });
  return deduplicateNamedEntries(skills);
}

export default function SkillAnalyzer() {
  const { isConfigured, user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [evidenceSkills, setEvidenceSkills] = useState([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [skillGaps, setSkillGaps] = useState(null);
  const [evidenceError, setEvidenceError] = useState("");
  const [skillName, setSkillName] = useState("");
  const [category, setCategory] = useState("Programming");
  const [proficiency, setProficiency] = useState("Intermediate");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    if (!isConfigured || !user || !supabase) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError("Sign in with a configured student account to load and manage profile skills.");
      setEvidenceSkills([]);
      setEvidenceLoading(false);
      setSkillGaps(null);
      return () => { active = false; };
    }

    setProfileLoading(true);
    setProfile(null);
    setEvidenceSkills([]);
    setSkillGaps(null);
    setEvidenceLoading(true);
    setProfileError("");
    setEvidenceError("");
    Promise.all([
      fetchStudentProfile(user),
      supabase.from("proof_of_work_audits").select("skills,audited_at").eq("user_id", user.id).order("audited_at", { ascending: false }).limit(50),
      supabase.from("student_career_analyses").select("plan,generated_at").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([studentProfile, auditsResult, analysisResult]) => {
      if (!active) return;
      setProfile(studentProfile);
      if (auditsResult.error) {
        console.error("Unable to load repository audit skill evidence:", auditsResult.error);
        setEvidenceError("Repository audit evidence is unavailable right now.");
      } else {
        setEvidenceSkills(getEvidenceSkills(auditsResult.data || []));
      }
      if (analysisResult.error) {
        console.error("Unable to load saved career skill gaps:", analysisResult.error);
        setEvidenceError((current) => [current, "Saved skill recommendations could not be loaded."].filter(Boolean).join(" "));
        setSkillGaps(null);
      } else {
        setSkillGaps(normalizeCareerSkillGaps(analysisResult.data?.plan?.skillGaps));
      }
    }).catch((error) => {
      if (active) {
        console.error("Unable to load the authenticated student's skills:", error);
        setProfileError(error.message || "Your saved profile skills could not be loaded.");
        setEvidenceError("Audit evidence and saved skill recommendations could not be loaded.");
      }
    }).finally(() => {
      if (active) setProfileLoading(false);
      if (active) setEvidenceLoading(false);
    });

    return () => { active = false; };
  }, [authLoading, isConfigured, user]);

  const skills = useMemo(() => deduplicateNamedEntries(
    (profile?.skills || []).map((skill) => ({
      ...skill,
      level: skill.proficiency,
      score: LEVEL_SCORE[skill.proficiency],
    }))
  ), [profile]);
  useEffect(() => {
    const skillName = new URLSearchParams(location.search).get("skill");
    if (!skillName) return;
    const skill = skills.find((item) => item.name.toLocaleLowerCase() === skillName.toLocaleLowerCase());
    if (skill) setSelectedSkill(skill);
  }, [location.search, skills]);
  const metrics = useMemo(
    () => calculateSkillAnalyzerMetrics(profile?.skills || [], skillGaps),
    [profile, skillGaps]
  );
  const averageScore = metrics.averageProficiency;
  const advancedCount = metrics.advancedSkills;
  const displayedSkills = portfolioFilter === "advanced"
    ? skills.filter((skill) => skill.proficiency === "Advanced")
    : skills;
  const focusSection = (sectionId) => {
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const focusPortfolio = (filter) => {
    setPortfolioFilter(filter);
    focusSection("skill-portfolio");
  };
  const focusRecommendations = () => {
    setShowRecommendations(true);
    focusSection("skill-recommendations");
  };
  const distribution = useMemo(() => ({
    Beginner: skills.filter((skill) => skill.proficiency === "Beginner").length,
    Intermediate: skills.filter((skill) => skill.proficiency === "Intermediate").length,
    Advanced: advancedCount,
  }), [advancedCount, skills]);

  const openAddForm = () => {
    setEditingId(null);
    setSkillName("");
    setCategory("Programming");
    setProficiency("Intermediate");
    setSaveError("");
    setShowForm(true);
  };

  const openEditForm = (skill) => {
    setEditingId(skill.id);
    setSkillName(skill.name);
    setCategory(skill.category || "Programming");
    setProficiency(skill.proficiency || "Intermediate");
    setSaveError("");
    setShowForm(true);
  };

  const persistSkills = async (nextSkills) => {
    if (!user || !profile) {
      setSaveError("Sign in and load your student profile before changing skills.");
      return false;
    }
    setSaving(true);
    setSaveError("");
    try {
      const nextProfile = { ...profile, skills: nextSkills };
      await saveStudentProfile(nextProfile);
      setProfile(nextProfile);
      window.dispatchEvent(new CustomEvent("studentProfileUpdated", { detail: { name: nextProfile.name } }));
      return true;
    } catch (error) {
      console.error("Unable to save profile skills:", error);
      setSaveError(error.message || "Your skills could not be saved.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSkill = async () => {
    const name = skillName.trim();
    if (!name || !profile) return;
    const duplicate = skills.some((skill) =>
      skill.name.toLocaleLowerCase() === name.toLocaleLowerCase() && skill.id !== editingId
    );
    if (duplicate) {
      setSaveError("A skill with this name is already in your profile.");
      return;
    }
    const currentSkills = profile.skills || [];
    const nextSkills = editingId
      ? currentSkills.map((skill) => skill.id === editingId
        ? { ...skill, name, category, proficiency }
        : skill)
      : [...currentSkills, { name, category, proficiency, yearsExperience: "" }];
    if (await persistSkills(nextSkills)) {
      setShowForm(false);
      setEditingId(null);
      setSelectedSkill(null);
    }
  };

  const removeSkill = async (skill) => {
    if (!profile) return;
    if (await persistSkills(profile.skills.filter((item) => item.id !== skill.id))) {
      if (selectedSkill?.id === skill.id) setSelectedSkill(null);
    }
  };

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            <Sparkles size={14} /> AI Career Intelligence
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Skill Analyzer</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Understand your current capabilities, identify skill gaps, and build a stronger career profile.
          </p>
        </div>
        <button
          onClick={openAddForm}
          disabled={!profile || profileLoading || saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} /> Add Skill
        </button>
      </div>

      {(profileError || saveError || evidenceError) && (
        <div role="alert" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {profileError && <p>{profileError}</p>}
          {saveError && <p>{saveError}</p>}
          {evidenceError && <p>{evidenceError}</p>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BrainCircuit} label="Skills Identified" value={profileLoading ? "…" : metrics.skillsIdentified} detail="Unique saved profile skills · view portfolio" onClick={() => focusPortfolio("all")} />
        <StatCard icon={TrendingUp} label="Average Proficiency" value={profileLoading ? "…" : averageScore === null ? "—" : `${averageScore}%`} detail="Mean level ÷ 3 × 100 · Beginner=1, Advanced=3" onClick={() => focusSection("skill-distribution")} />
        <StatCard icon={Award} label="Advanced Skills" value={profileLoading ? "…" : advancedCount} detail="Self-assessed as Advanced · view skills" onClick={() => focusPortfolio("advanced")} />
        <StatCard icon={Target} label="Growth Opportunities" value={profileLoading ? "…" : metrics.growthOpportunities === null ? "—" : metrics.growthOpportunities} detail="Distinct gaps in latest saved AI analysis" onClick={focusRecommendations} />
      </div>

      {showForm && (
        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{editingId ? "Edit skill" : "Add a new skill"}</h2>
            <button onClick={() => setShowForm(false)} aria-label="Close skill form" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Skill name</label>
              <input value={skillName} onChange={(event) => setSkillName(event.target.value)} placeholder="e.g. React, Python, SQL" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Category</label>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500">
                <option>Programming</option><option>Web Development</option><option>Database</option>
                <option>AI &amp; Machine Learning</option><option>Cloud &amp; DevOps</option><option>Soft Skills</option><option>Other</option>
              </select>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <label htmlFor="skill-proficiency">Self-assessed proficiency</label>
              <span className="text-blue-600">{proficiency}</span>
            </div>
            <input id="skill-proficiency" type="range" min="1" max="3" step="1" value={LEVEL_RANK[proficiency]} onChange={(event) => setProficiency(["Beginner", "Intermediate", "Advanced"][Number(event.target.value) - 1])} className="mt-3 w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-slate-400"><span>Beginner</span><span>Intermediate</span><span>Advanced</span></div>
          </div>
          <button onClick={saveSkill} disabled={!skillName.trim() || saving} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "Saving…" : editingId ? "Save Changes" : "Save Skill"}
          </button>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <section id="skill-portfolio" className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Skill Portfolio</h2>
              <p className="mt-1 text-xs text-slate-500">Self-assessed skills saved to your authenticated profile</p>
            </div>
            <div className="flex items-center gap-2">
              {portfolioFilter === "advanced" && <button type="button" onClick={() => setPortfolioFilter("all")} className="text-xs font-semibold text-blue-600 hover:underline">Show all</button>}
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{profileLoading ? "…" : `${displayedSkills.length} skills`}</span>
            </div>
          </div>
          <div className="mt-6 space-y-5">
            {displayedSkills.map((skill) => (
              <div key={skill.id || skill.name} className="group">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => setSelectedSkill(skill)} className="text-left">
                    <span className="text-sm font-semibold text-slate-800 hover:text-blue-600">{skill.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{skill.category}</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500">{skill.proficiency}</span>
                    <span className="w-10 text-right text-sm font-bold tabular-nums text-slate-800">{skill.score}%</span>
                    <button onClick={() => openEditForm(skill)} title={`Edit ${skill.name}`} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Edit</button>
                    <button onClick={() => removeSkill(skill)} disabled={saving} title="Remove skill" className="text-slate-300 transition hover:text-red-500 disabled:opacity-50"><X size={15} /></button>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" style={{ width: `${skill.score}%` }} />
                </div>
              </div>
            ))}
            {!profileLoading && displayedSkills.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{portfolioFilter === "advanced" ? "No skills are currently self-assessed as Advanced." : "No profile skills saved yet. Add a skill to begin."}</p>
            )}
          </div>
        </section>

        <section id="skill-distribution" className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Target size={21} /></div>
            <div><h2 className="font-bold text-slate-900">Skill Distribution</h2><p className="text-xs text-slate-500">Saved proficiency categories</p></div>
          </div>
          <div className="mt-7 flex justify-center">
            <div
              className="relative flex h-44 w-44 items-center justify-center rounded-full"
              style={{ background: skills.length
                ? `conic-gradient(#2563eb 0% ${distribution.Advanced / skills.length * 100}%, #818cf8 ${distribution.Advanced / skills.length * 100}% ${(distribution.Advanced + distribution.Intermediate) / skills.length * 100}%, #e2e8f0 ${(distribution.Advanced + distribution.Intermediate) / skills.length * 100}% 100%)`
                : "#e2e8f0" }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-3xl font-extrabold text-slate-900">{averageScore === null ? "—" : `${averageScore}%`}</span>
                <span className="mt-1 text-xs text-slate-400">Average proficiency</span>
              </div>
            </div>
          </div>
          <div className="mt-7 space-y-3">
            <Legend color="bg-blue-600" label="Advanced" count={distribution.Advanced} />
            <Legend color="bg-indigo-400" label="Intermediate" count={distribution.Intermediate} />
            <Legend color="bg-slate-200" label="Beginner" count={distribution.Beginner} />
          </div>
        </section>
      </div>

      <section id="skill-recommendations" className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Lightbulb className="text-amber-500" size={20} /><h2 className="text-lg font-bold text-slate-900">Recommended Skill Development</h2></div>
            <p className="mt-1 text-xs text-slate-500">Skill gaps from your latest saved AI career analysis</p>
          </div>
          <button onClick={() => setShowRecommendations((current) => !current)} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
            {showRecommendations ? "Hide details" : "View recommendations"}
          </button>
        </div>
        {showRecommendations && skillGaps === null && (
          <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No saved career analysis is available yet. Generate a personalized roadmap to see evidence-based skill gaps.</p>
        )}
        {showRecommendations && skillGaps?.length === 0 && (
          <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">The latest saved career analysis did not identify specific skill gaps.</p>
        )}
        {showRecommendations && skillGaps?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {skillGaps.map((gap) => <span key={gap.toLocaleLowerCase()} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">{gap}</span>)}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-violet-100 bg-white p-6">
        <div className="flex items-start gap-3">
          <BrainCircuit className="mt-0.5 shrink-0 text-violet-600" size={20} />
          <div>
            <h2 className="text-sm font-bold text-slate-900">AI-identified repository evidence</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">Skills listed by saved Proof of Work audits are separate evidence—not self-assessed profile skills and not independently verified certifications.</p>
            {evidenceSkills.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {evidenceSkills.map((skill) => <span key={skill.name.toLocaleLowerCase()} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800">{skill.name} · AI-identified</span>)}
              </div>
            ) : evidenceLoading ? (
              <p className="mt-3 text-xs text-slate-500">Loading saved audit evidence…</p>
            ) : !evidenceError && (
              <p className="mt-3 text-xs text-slate-500">No skills have been identified by a saved repository audit.</p>
            )}
          </div>
        </div>
      </section>

      {selectedSkill && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Code2 className="text-blue-600" size={22} />
              <div><h3 className="font-bold text-slate-900">{selectedSkill.name}</h3><p className="text-xs text-slate-500">{selectedSkill.category} · {selectedSkill.proficiency}</p></div>
            </div>
            <button onClick={() => setSelectedSkill(null)} aria-label="Close skill details" className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
          </div>
          <p className="mt-3 text-sm text-slate-700">This proficiency is self-assessed and stored on your student profile. Add practical project evidence in Proof of Work to provide additional context.</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-700"><ShieldCheck size={15} /> Self-assessed · Not independently verified</div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={20} />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Evidence-based skill development</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">Saved profile proficiency is student self-assessment. Repository audit skills are AI-identified from reviewed evidence. Neither is labeled independently verified here.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={20} /></div>
        <TrendingUp size={17} className="text-emerald-500" />
      </div>
      <p className="mt-5 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </button>
  );
}

function Legend({ color, label, count }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="text-slate-600">{label}</span></div>
      <span className="font-semibold text-slate-800">{count}</span>
    </div>
  );
}
