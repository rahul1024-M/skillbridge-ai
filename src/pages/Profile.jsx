
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
import { useAuth } from "../hooks/useAuth";
import { fetchStudentProfile, saveStudentProfile } from "../services/profileRepository";

// ==========================================
// CONFIGURATION
// ==========================================

const STORAGE_KEY = "skillbridge_student_profile";

const DEFAULT_PROFILE = {
  name: "",
  email: "",
  phone: "",
  college: "",
  degree: "",
  branch: "",
  year: "",
  graduationYear: "",
  cgpa: "",
  academicInfo: "",
  location: "",
  photoUrl: "",
  targetRole: "",
  preferredDomain: "",
  careerGoals: "",
  preferredLocation: "",
  workMode: "",
  internshipPreferences: "",
  github: "",
  linkedin: "",
  portfolioUrl: "",
  bio: "",
  skills: [],
  projects: [],
  certifications: [],
  experience: [],
  otherLinks: [],
  publicEnabled: false,
  publicSlug: "",
};

const SKILL_CATEGORIES = [
  "Programming language",
  "Framework",
  "Library",
  "Database",
  "Developer tool",
  "Other",
];

function createEntryId() {
  return crypto.randomUUID();
}

function normalizeProfile(value) {
  const parsed = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  const profile = { ...DEFAULT_PROFILE, ...parsed };

  for (const [field, defaultValue] of Object.entries(DEFAULT_PROFILE)) {
    if (typeof defaultValue === "string" && typeof profile[field] !== "string") {
      profile[field] = defaultValue;
    }
  }
  if (typeof profile.publicEnabled !== "boolean") profile.publicEnabled = false;

  const arrayFields = ["projects", "certifications", "experience", "otherLinks"];
  for (const field of arrayFields) {
    profile[field] = Array.isArray(parsed[field])
      ? parsed[field].filter((entry) => entry && typeof entry === "object")
          .map((entry) => ({
            ...entry,
            id: typeof entry.id === "string" && entry.id ? entry.id : createEntryId(),
          }))
      : [];
  }

  profile.skills = Array.isArray(parsed.skills)
    ? parsed.skills
        .map((skill) => {
          if (typeof skill === "string" && skill.trim()) {
            return {
              id: createEntryId(),
              name: skill.trim(),
              category: "Other",
              proficiency: "Beginner",
              yearsExperience: "",
            };
          }
          if (!skill || typeof skill !== "object" || typeof skill.name !== "string") {
            return null;
          }
          return {
            id: skill.id || createEntryId(),
            name: skill.name,
            category: SKILL_CATEGORIES.includes(skill.category)
              ? skill.category
              : "Other",
            proficiency: ["Beginner", "Intermediate", "Advanced"].includes(skill.proficiency)
              ? skill.proficiency
              : "Beginner",
            yearsExperience:
              typeof skill.yearsExperience === "string" ||
              typeof skill.yearsExperience === "number"
                ? String(skill.yearsExperience)
                : "",
          };
        })
        .filter(Boolean)
    : [];

  delete profile.interest;
  return profile;
}

function cloneProfile(profile) {
  return JSON.parse(JSON.stringify(profile));
}

// ==========================================
// STORAGE UTILITIES
// ==========================================

function loadProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return cloneProfile(DEFAULT_PROFILE);
    }

    const parsed = JSON.parse(stored);
    const profile = normalizeProfile(parsed);
    if (!profile.preferredDomain && typeof parsed?.interest === "string") {
      profile.preferredDomain = parsed.interest;
    }
    return profile;
  } catch (error) {
    console.error("Profile loading error:", error);
    return cloneProfile(DEFAULT_PROFILE);
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

function EntryList({
  icon,
  title,
  description,
  entries,
  fields,
  editing,
  addLabel,
  emptyMessage,
  onAdd,
  onUpdate,
  onRemove,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader icon={icon} title={title} description={description} />
        {editing && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            <Plus size={16} />
            {addLabel}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => {
                  const rawValue = entry[field.name];
                  const value = Array.isArray(rawValue)
                    ? rawValue.join(", ")
                    : rawValue || "";
                  return (
                    <div
                      key={field.name}
                      className={field.multiline ? "sm:col-span-2" : ""}
                    >
                      <label className="mb-2 block text-xs font-semibold text-slate-600">
                        {field.label}
                      </label>
                      {field.options ? (
                        <select
                          disabled={!editing}
                          value={value}
                          onChange={(event) => onUpdate(entry.id, field.name, event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 disabled:opacity-80"
                        >
                          <option value="">Select</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.multiline ? (
                        <textarea
                          rows={3}
                          disabled={!editing}
                          value={value}
                          placeholder={field.placeholder}
                          onChange={(event) => onUpdate(entry.id, field.name, event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-500 disabled:opacity-80"
                        />
                      ) : (
                        <input
                          type={field.type || "text"}
                          disabled={!editing}
                          value={value}
                          placeholder={field.placeholder}
                          onChange={(event) => onUpdate(entry.id, field.name, event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 disabled:opacity-80"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                >
                  <X size={14} /> Remove entry
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ==========================================
// MAIN PROFILE COMPONENT
// ==========================================

export default function Profile() {
  const { isConfigured, user } = useAuth();
  const [savedProfile, setSavedProfile] = useState(() =>
    isConfigured ? cloneProfile(DEFAULT_PROFILE) : loadProfile()
  );
  const [draftProfile, setDraftProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState(SKILL_CATEGORIES[0]);
  const [newSkillProficiency, setNewSkillProficiency] = useState("Beginner");
  const [newSkillExperience, setNewSkillExperience] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileLoadError, setProfileLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [profileLoading, setProfileLoading] = useState(isConfigured);
  const [saving, setSaving] = useState(false);
  const profile = editing ? draftProfile : savedProfile;

  useEffect(() => {
    if (!isConfigured || !user) {
      setProfileLoading(false);
      return undefined;
    }

    let active = true;
    setProfileLoading(true);
    setProfileLoadError("");

    fetchStudentProfile(user)
      .then((loadedProfile) => {
        if (active) setSavedProfile(normalizeProfile(loadedProfile));
      })
      .catch((loadError) => {
        if (active) {
          console.error("Profile loading error:", loadError);
          setProfileLoadError(loadError.message || "Unable to load your cloud profile.");
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isConfigured, loadAttempt, user]);

  const completion = useMemo(() => {
    const checks = [
      profile.name,
      profile.email,
      profile.phone,
      profile.location,
      profile.photoUrl,
      profile.bio,
      profile.college,
      profile.degree,
      profile.branch,
      profile.graduationYear,
      profile.cgpa,
      profile.academicInfo,
      profile.targetRole,
      profile.preferredDomain,
      profile.careerGoals,
      profile.preferredLocation,
      profile.workMode,
      profile.internshipPreferences,
      profile.skills.length > 0,
      profile.projects.length > 0,
      profile.certifications.length > 0,
      profile.experience.length > 0,
      profile.github || profile.linkedin || profile.portfolioUrl || profile.otherLinks.length > 0,
    ];
    const completed = checks.filter((value) =>
      typeof value === "boolean" ? value : String(value || "").trim().length > 0
    ).length;
    return Math.round((completed / checks.length) * 100);
  }, [profile]);

  const initials = profile.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const updateField = (field, value) => {
    setDraftProfile((previous) => ({
      ...previous,
      [field]: value,
    }));

    setMessage("");
    setError("");
  };

  const addSkill = () => {
    const skill = newSkill.trim();

    if (!skill) return;

    const exists = draftProfile.skills.some(
      (item) => item.name.toLowerCase() === skill.toLowerCase()
    );

    if (exists) {
      setError("This skill has already been added.");
      return;
    }

    setDraftProfile((previous) => ({
      ...previous,
      skills: [
        ...previous.skills,
        {
          id: createEntryId(),
          name: skill,
          category: newSkillCategory,
          proficiency: newSkillProficiency,
          yearsExperience: newSkillExperience,
        },
      ],
    }));

    setNewSkill("");
    setNewSkillExperience("");
    setError("");
    setMessage("");
  };

  const removeSkill = (skillId) => {
    setDraftProfile((previous) => ({
      ...previous,
      skills: previous.skills.filter((item) => item.id !== skillId),
    }));

    setMessage("");
  };

  const addEntry = (section, values) => {
    setDraftProfile((previous) => ({
      ...previous,
      [section]: [...previous[section], { id: createEntryId(), ...values }],
    }));
    setMessage("");
    setError("");
  };

  const updateEntry = (section, id, field, value) => {
    setDraftProfile((previous) => ({
      ...previous,
      [section]: previous[section].map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
    setMessage("");
    setError("");
  };

  const removeEntry = (section, id) => {
    setDraftProfile((previous) => ({
      ...previous,
      [section]: previous[section].filter((entry) => entry.id !== id),
    }));
    setMessage("");
  };

  const validateProfile = () => {
    if (!draftProfile.name.trim()) {
      setError("Please enter your full name.");
      return false;
    }

    if (draftProfile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftProfile.email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    if (draftProfile.phone && !/^\+?[\d().\-\s]{7,20}$/.test(draftProfile.phone.trim())) {
      setError("Please enter a valid phone number.");
      return false;
    }

    const urls = [
      ["profile photo", draftProfile.photoUrl],
      ["GitHub", draftProfile.github],
      ["LinkedIn", draftProfile.linkedin],
      ["portfolio", draftProfile.portfolioUrl],
      ...draftProfile.projects.flatMap((entry) => [
        ["project repository", entry.repositoryUrl],
        ["live project", entry.liveUrl],
      ]),
      ...draftProfile.certifications.map((entry) => ["credential", entry.credentialUrl]),
      ...draftProfile.otherLinks.map((entry) => [entry.label || "professional link", entry.url]),
    ];
    for (const [label, rawValue] of urls) {
      const value = String(rawValue || "").trim();
      if (!value) continue;
      try {
        const url = new URL(value);
        if (url.protocol !== "https:" || !url.hostname) throw new Error("Invalid URL");
      } catch {
        setError(`Please enter a valid HTTPS URL for ${label}.`);
        return false;
      }
    }

    if (
      draftProfile.graduationYear &&
      (!/^\d{4}$/.test(draftProfile.graduationYear) ||
        Number(draftProfile.graduationYear) < 1950 ||
        Number(draftProfile.graduationYear) > 2200)
    ) {
      setError("Enter a valid graduation year.");
      return false;
    }

    if (draftProfile.cgpa && (!Number.isFinite(Number(draftProfile.cgpa)) || Number(draftProfile.cgpa) < 0 || Number(draftProfile.cgpa) > 10)) {
      setError("CGPA must be between 0 and 10.");
      return false;
    }

    if (draftProfile.publicEnabled && !/^[a-zA-Z0-9-]{3,60}$/.test(draftProfile.publicSlug.trim())) {
      setError("Choose a public profile ID with 3-60 letters, numbers, or hyphens.");
      return false;
    }

    const invalidEntries = [
      ["project", draftProfile.projects, ["title"]],
      ["certification", draftProfile.certifications, ["name"]],
      ["experience", draftProfile.experience, ["organization", "role"]],
      ["professional link", draftProfile.otherLinks, ["label", "url"]],
    ];
    for (const [label, entries, requiredFields] of invalidEntries) {
      if (entries.some((entry) => requiredFields.some((field) => !String(entry[field] || "").trim()))) {
        setError(`Complete the required fields for each ${label} entry or remove the incomplete entry.`);
        return false;
      }
    }

    if (draftProfile.skills.some((skill) => skill.yearsExperience && (!Number.isFinite(Number(skill.yearsExperience)) || Number(skill.yearsExperience) < 0 || Number(skill.yearsExperience) > 80))) {
      setError("Skill experience must be between 0 and 80 years.");
      return false;
    }

    return true;
  };

  const saveProfile = async () => {
    if (!validateProfile()) return;
    setSaving(true);

    const profileToSave = normalizeProfile(draftProfile);
    for (const [field, value] of Object.entries(profileToSave)) {
      if (typeof value === "string") profileToSave[field] = value.trim();
    }
    for (const field of ["skills", "projects", "certifications", "experience", "otherLinks"]) {
      profileToSave[field] = profileToSave[field].map((entry) => ({
        ...entry,
        ...Object.fromEntries(
          Object.entries(entry)
            .filter(([, value]) => typeof value === "string")
            .map(([key, value]) => [key, value.trim()])
        ),
      }));
    }
    profileToSave.projects = profileToSave.projects.map((project) => ({
      ...project,
      technologies: Array.isArray(project.technologies)
        ? project.technologies
        : String(project.technologies || "").split(",").map((item) => item.trim()).filter(Boolean),
    }));
    profileToSave.experience = profileToSave.experience.map((entry) => ({
      ...entry,
      skillsUsed: Array.isArray(entry.skillsUsed)
        ? entry.skillsUsed
        : String(entry.skillsUsed || "").split(",").map((item) => item.trim()).filter(Boolean),
    }));

    try {
      if (isConfigured) {
        await saveStudentProfile(profileToSave);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profileToSave));
      }
      setSavedProfile(profileToSave);
      setDraftProfile(null);
      setEditing(false);
      setError("");
      setMessage(
        isConfigured
          ? "Your profile has been saved to your account."
          : "Your profile has been saved in this browser."
      );
      window.dispatchEvent(
        new CustomEvent("studentProfileUpdated", {
          detail: profileToSave,
        })
      );
    } catch (error) {
      console.error("Profile saving error:", error);
      setError(error.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    const hasChanges =
      JSON.stringify(draftProfile) !== JSON.stringify(savedProfile) ||
      Boolean(newSkill.trim());

    if (
      hasChanges &&
      !window.confirm("Discard your unsaved profile changes?")
    ) {
      return;
    }

    setDraftProfile(null);
    setEditing(false);
    setNewSkill("");
    setNewSkillExperience("");
    setError("");
    setMessage("");
  };

  const startEditing = () => {
    if (profileLoading || saving || profileLoadError) return;
    setDraftProfile(cloneProfile(savedProfile));
    setEditing(true);
    setMessage("");
    setError("");
  };

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

  if (profileLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Loading your student profile...
      </div>
    );
  }

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
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (editing) {
                  void saveProfile();
                } else {
                  startEditing();
                }
              }}
              disabled={profileLoading || saving || Boolean(profileLoadError)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editing ? <Save size={17} /> : <Pencil size={17} />}
              {saving ? "Saving..." : editing ? "Save Profile" : "Edit Profile"}
            </button>
          </div>
        </div>

        {/* FEEDBACK */}

        {profileLoadError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span className="flex items-center gap-3">
              <AlertCircle size={19} />
              {profileLoadError}
            </span>
            <button
              type="button"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

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
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={`${profile.name || "Student"} profile`}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    initials || "S"
                  )}
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
            {getInput("photoUrl", "Profile Photo URL", "https://example.com/photo.jpg", "url")}
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
            {getInput("graduationYear", "Expected Graduation Year", "e.g. 2027", "number")}
            {getInput("cgpa", "CGPA (out of 10)", "e.g. 8.5", "number")}

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
                <option value="">Select academic year</option>
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Relevant Academic Information
            </label>
            <textarea
              rows={3}
              disabled={!editing}
              value={profile.academicInfo}
              onChange={(event) => updateField("academicInfo", event.target.value)}
              placeholder="Relevant coursework, honors, or academic focus"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-blue-500 disabled:opacity-80"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            icon={Target}
            title="Career Preferences"
            description="Describe the roles and opportunities you want to pursue."
          />
          <div className="grid gap-5 md:grid-cols-2">
            {getInput("targetRole", "Target Job Role", "e.g. Frontend Developer")}
            {getInput("preferredDomain", "Preferred Domain", "e.g. Web Development")}
            {getInput("preferredLocation", "Preferred Work Location", "City, State or Anywhere")}
            {getInput("internshipPreferences", "Internship Preferences", "Duration, availability, or focus")}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Work Preference
              </label>
              <select
                disabled={!editing}
                value={profile.workMode}
                onChange={(event) => updateField("workMode", event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-500 disabled:opacity-80"
              >
                <option value="">Select preference</option>
                <option>Remote</option>
                <option>Hybrid</option>
                <option>Onsite</option>
                <option>Any</option>
              </select>
            </div>
          </div>
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Career Goals
            </label>
            <textarea
              rows={3}
              disabled={!editing}
              value={profile.careerGoals}
              onChange={(event) => updateField("careerGoals", event.target.value)}
              placeholder="What would you like to achieve in your career?"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-blue-500 disabled:opacity-80"
            />
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
                key={skill.id}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
              >
                <span>
                  {skill.name}
                  <span className="ml-2 text-xs font-medium text-blue-500">
                    {skill.proficiency}
                    {skill.yearsExperience ? ` · ${skill.yearsExperience} yrs` : ""}
                  </span>
                </span>

                {editing && (
                  <button
                    type="button"
                    onClick={() => removeSkill(skill.id)}
                    aria-label={`Remove ${skill.name}`}
                    className="text-blue-500 hover:text-red-600"
                  >
                    <X size={15} />
                  </button>
                )}
              </span>
            ))}
          </div>

          {editing && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <select
                value={newSkillCategory}
                onChange={(event) => setNewSkillCategory(event.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                {SKILL_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              <select
                value={newSkillProficiency}
                onChange={(event) => setNewSkillProficiency(event.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
              <input
                type="number"
                min="0"
                max="80"
                step="0.5"
                value={newSkillExperience}
                onChange={(event) => setNewSkillExperience(event.target.value)}
                placeholder="Years of experience"
                className="h-12 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addSkill}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:col-span-2 lg:col-span-4"
              >
                <Plus size={17} />
                Add Skill
              </button>
            </div>
          )}
        </section>

        <EntryList
          icon={Target}
          title="Projects"
          description="Showcase the work you have actually built."
          entries={profile.projects}
          editing={editing}
          addLabel="Add Project"
          emptyMessage="No projects added yet."
          onAdd={() => addEntry("projects", { title: "", status: "In progress" })}
          onUpdate={(id, field, value) => updateEntry("projects", id, field, value)}
          onRemove={(id) => removeEntry("projects", id)}
          fields={[
            { name: "title", label: "Project title" },
            { name: "status", label: "Status", options: ["Planned", "In progress", "Completed", "Archived"] },
            { name: "technologies", label: "Technologies (comma separated)" },
            { name: "repositoryUrl", label: "GitHub repository URL", placeholder: "https://github.com/username/repository" },
            { name: "liveUrl", label: "Live project URL", placeholder: "https://example.com" },
            { name: "description", label: "Description", multiline: true },
            { name: "contribution", label: "Your contribution", multiline: true },
          ]}
        />

        <EntryList
          icon={ShieldCheck}
          title="Certifications"
          description="Add credentials you have earned."
          entries={profile.certifications}
          editing={editing}
          addLabel="Add Certification"
          emptyMessage="No certifications added yet."
          onAdd={() => addEntry("certifications", { name: "" })}
          onUpdate={(id, field, value) => updateEntry("certifications", id, field, value)}
          onRemove={(id) => removeEntry("certifications", id)}
          fields={[
            { name: "name", label: "Certification name" },
            { name: "issuer", label: "Issuing organization" },
            { name: "issueDate", label: "Issue date", type: "date" },
            { name: "credentialUrl", label: "Credential URL", placeholder: "https://..." },
          ]}
        />

        <EntryList
          icon={BriefcaseBusiness}
          title="Experience"
          description="Record internships and work experience."
          entries={profile.experience}
          editing={editing}
          addLabel="Add Experience"
          emptyMessage="No work or internship experience added yet."
          onAdd={() => addEntry("experience", { organization: "", role: "" })}
          onUpdate={(id, field, value) => updateEntry("experience", id, field, value)}
          onRemove={(id) => removeEntry("experience", id)}
          fields={[
            { name: "organization", label: "Organization" },
            { name: "role", label: "Role" },
            { name: "startedOn", label: "Start date", type: "date" },
            { name: "endedOn", label: "End date", type: "date" },
            { name: "responsibilities", label: "Responsibilities", multiline: true },
            { name: "skillsUsed", label: "Skills used (comma separated)" },
          ]}
        />

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

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Portfolio
              </label>
              <FormField
                value={profile.portfolioUrl}
                disabled={!editing}
                placeholder="https://your-portfolio.example"
                onChange={(value) => updateField("portfolioUrl", value)}
              />
              {!editing && profile.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  Open portfolio <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </section>

        <EntryList
          icon={Globe}
          title="Other Professional Links"
          description="Add other relevant professional websites."
          entries={profile.otherLinks}
          editing={editing}
          addLabel="Add Link"
          emptyMessage="No additional links added."
          onAdd={() => addEntry("otherLinks", { label: "", url: "" })}
          onUpdate={(id, field, value) => updateEntry("otherLinks", id, field, value)}
          onRemove={(id) => removeEntry("otherLinks", id)}
          fields={[
            { name: "label", label: "Link label", placeholder: "e.g. Blog" },
            { name: "url", label: "URL", placeholder: "https://..." },
          ]}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            icon={ShieldCheck}
            title="Public SkillBridge ID"
            description="Choose whether to share a limited public profile. You can revoke access at any time."
          />
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={profile.publicEnabled}
              disabled={!editing || !isConfigured}
              onChange={(event) => updateField("publicEnabled", event.target.checked)}
              className="mt-1 h-4 w-4 accent-blue-600"
            />
            <span>Allow anyone with my public profile link to view my name, introduction, skills, projects, and certifications.</span>
          </label>
          {!isConfigured && (
            <p className="mt-3 text-xs text-amber-700">
              Public sharing is unavailable until Supabase is configured.
            </p>
          )}
          <div className="mt-5 max-w-xl">
            <FormField
              label="Public profile ID"
              value={profile.publicSlug}
              disabled={!editing || !profile.publicEnabled}
              placeholder="e.g. alex-student"
              onChange={(value) => updateField("publicSlug", value)}
            />
            {profile.publicEnabled && profile.publicSlug && (
              <p className="mt-2 break-all text-xs text-slate-500">
                Public link: {window.location.origin}/id/{profile.publicSlug}
              </p>
            )}
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
