
import { useEffect, useMemo, useState } from "react";
import {
  UserRound,
  GraduationCap,
  Code2,
  Sparkles,
  Pencil,
  Save,
  CheckCircle2,
  Globe,
  BriefcaseBusiness,
  Plus,
  X,
  ShieldCheck,
  Target,
  ExternalLink,
  AlertCircle,
  MapPin,
  Mail,
} from "lucide-react";

// ==========================================
// CONFIGURATION
// ==========================================

const STORAGE_KEY = "skillbridge_student_profile";

const DEFAULT_PROFILE = {
  name: "Student User",
  email: "",
  phone: "",
  college: "",
  degree: "B.E.",
  branch: "Computer Science Engineering",
  year: "2nd Year",
  location: "",
  interest: "Software Development",
  github: "",
  linkedin: "",
  bio: "",
  skills: ["Python", "JavaScript", "React", "HTML", "CSS"],
};

const REQUIRED_FIELDS = [
  "name",
  "email",
  "college",
  "branch",
  "location",
  "interest",
  "github",
  "linkedin",
  "bio",
];

// ==========================================
// STORAGE UTILITIES
// ==========================================

function loadProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return { ...DEFAULT_PROFILE };

    const parsed = JSON.parse(stored);

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      skills: Array.isArray(parsed.skills)
        ? parsed.skills
        : DEFAULT_PROFILE.skills,
    };
  } catch (error) {
    console.error("Profile loading error:", error);
    return { ...DEFAULT_PROFILE };
  }
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-default disabled:opacity-80"
      />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
        <Icon size={21} />
      </div>

      <div>
        <h2 className="font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PROFILE COMPONENT
// ==========================================

export default function Profile() {
  const [profile, setProfile] = useState(loadProfile);
  const [editing, setEditing] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Profile completion calculation
  const completion = useMemo(() => {
    const completed = REQUIRED_FIELDS.filter((field) =>
      String(profile[field] || "").trim()
    ).length;

    return Math.round(
      (completed / REQUIRED_FIELDS.length) * 100
    );
  }, [profile]);

  // Profile initials
  const initials = profile.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  // Update profile fields
  const updateField = (field, value) => {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));

    setMessage("");
    setError("");
  };

  // Add a skill
  const addSkill = () => {
    const skill = newSkill.trim();

    if (!skill) return;

    const exists = profile.skills.some(
      (item) => item.toLowerCase() === skill.toLowerCase()
    );

    if (exists) {
      setError("This skill has already been added.");
      return;
    }

    setProfile((previous) => ({
      ...previous,
      skills: [...previous.skills, skill],
    }));

    setNewSkill("");
    setError("");
    setMessage("");
  };

  // Remove a skill
  const removeSkill = (skill) => {
    setProfile((previous) => ({
      ...previous,
      skills: previous.skills.filter(
        (item) => item !== skill
      ),
    }));

    setMessage("");
  };

  // Validate profile
  const validateProfile = () => {
    if (!profile.name.trim()) {
      setError("Please enter your full name.");
      return false;
    }

    if (
      profile.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)
    ) {
      setError("Please enter a valid email address.");
      return false;
    }

    for (const field of ["github", "linkedin"]) {
      if (
        profile[field] &&
        !/^https?:\/\/.+/i.test(profile[field])
      ) {
        setError(
          `Please enter a valid ${field} URL starting with https://`
        );
        return false;
      }
    }

    return true;
  };

  // Save profile
  const saveProfile = () => {
    if (!validateProfile()) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(profile)
      );

      setEditing(false);
      setError("");
      setMessage("Your profile has been saved successfully.");
    } catch (error) {
      console.error("Profile saving error:", error);
      setError("Unable to save your profile in this browser.");
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setProfile(loadProfile());
    setEditing(false);
    setError("");
    setMessage("");
  };

  // Reusable field renderer
  const getInput = (
    field,
    label,
    placeholder,
    type = "text"
  ) => (
    <FormField
      label={label}
      value={profile[field]}
      placeholder={placeholder}
      type={type}
      disabled={!editing}
      onChange={(value) => updateField(field, value)}
    />
  );

  // Persist edits while the user is working.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(profile)
      );
    } catch {
      // Save errors are reported when the user clicks Save Profile.
    }
  }, [profile]);

  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* PAGE HEADER */}

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
              <Sparkles size={15} />
              Student Workspace
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              My Profile
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Build your professional identity and showcase your skills.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {editing && (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (editing) {
                  saveProfile();
                } else {
                  setEditing(true);
                  setMessage("");
                  setError("");
                }
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              {editing ? <Save size={17} /> : <Pencil size={17} />}
              {editing ? "Save Profile" : "Edit Profile"}
            </button>
          </div>
        </div>

        {/* FEEDBACK */}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} />
            {error}
          </div>
        )}

        {message && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={19} />
            {message}
          </div>
        )}

        {/* PROFILE OVERVIEW */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600" />

          <div className="p-6 md:p-8">
            <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">

              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-3xl font-bold text-white shadow-lg shadow-blue-500/20">
                  {initials || "S"}
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-slate-900">
                    {profile.name || "Your Name"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {profile.branch} · {profile.year}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      <Sparkles size={13} />
                      Career Explorer
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <ShieldCheck size={13} />
                      Student Account
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full lg:max-w-xs">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    Profile Completion
                  </span>

                  <span className="text-2xl font-bold text-blue-600">
                    {completion}%
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500 transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {completion === 100
                    ? "Your profile is complete!"
                    : "Complete more details to strengthen your profile."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PERSONAL INFORMATION */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            icon={UserRound}
            title="Personal Information"
            description="Your basic information and professional introduction."
          />

          <div className="grid gap-5 md:grid-cols-2">
            {getInput("name", "Full Name", "Enter your full name")}
            {getInput("email", "Email Address", "name@example.com", "email")}
            {getInput("phone", "Phone Number", "Enter phone number", "tel")}
            {getInput("location", "Location", "City, State")}
            {getInput("interest", "Career Interest", "e.g. AI Engineering")}
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              About Me
            </label>

            <textarea
              rows={4}
              disabled={!editing}
              value={profile.bio}
              onChange={(event) =>
                updateField("bio", event.target.value)
              }
              placeholder="Tell recruiters about your interests, experience and goals..."
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-default disabled:opacity-80"
            />
          </div>
        </section>

        {/* EDUCATION */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            icon={GraduationCap}
            title="Education Details"
            description="Your academic background and current education."
          />

          <div className="grid gap-5 md:grid-cols-2">
            {getInput("college", "College / University", "Enter institution name")}
            {getInput("degree", "Degree", "e.g. Bachelor of Engineering")}
            {getInput("branch", "Branch / Specialization", "Enter your branch")}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Current Academic Year
              </label>

              <select
                disabled={!editing}
                value={profile.year}
                onChange={(event) =>
                  updateField("year", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-default disabled:opacity-80"
              >
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>
            </div>
          </div>
        </section>

        {/* TECHNICAL SKILLS */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            icon={Code2}
            title="Technical Skills"
            description="Showcase your programming languages, tools and technologies."
          />

          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
              >
                {skill}

                {editing && (
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="text-blue-500 hover:text-red-600"
                  >
                    <X size={15} />
                  </button>
                )}
              </span>
            ))}
          </div>

          {editing && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                value={newSkill}
                onChange={(event) => setNewSkill(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Enter a new technical skill"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />

              <button
                type="button"
                onClick={addSkill}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
              >
                <Plus size={17} />
                Add Skill
              </button>
            </div>
          )}
        </section>

        {/* PROFESSIONAL LINKS */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            icon={Globe}
            title="Professional Links"
            description="Connect your coding portfolio and professional identity."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Code2 size={17} />
                GitHub Profile
              </label>

              <FormField
                value={profile.github}
                disabled={!editing}
                placeholder="https://github.com/username"
                onChange={(value) => updateField("github", value)}
              />

              {!editing && profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  Open GitHub <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BriefcaseBusiness size={17} />
                LinkedIn Profile
              </label>

              <FormField
                value={profile.linkedin}
                disabled={!editing}
                placeholder="https://linkedin.com/in/username"
                onChange={(value) => updateField("linkedin", value)}
              />

              {!editing && profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  Open LinkedIn <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* CAREER GUIDANCE */}

        <section className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/15 p-3">
              <Target size={24} />
            </div>

            <div>
              <h3 className="text-lg font-bold">
                Build a Strong Career Identity
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Keep your education, skills, projects and professional
                links updated. A complete profile helps present your
                abilities clearly to recruiters.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}

        <p className="pb-4 text-center text-xs text-slate-400">
        
        </p>
      </div>
    </div>
  );
}
