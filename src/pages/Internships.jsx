import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Clock3,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchStudentProfile } from "../services/profileRepository";
import {
  explainInternshipMatch,
  fetchLiveInternships,
  refreshLiveInternships,
} from "../services/careerIntelligence";
import {
  fetchInternshipTracking,
  saveInternshipTracking,
  trackingKey,
} from "../services/internshipTracking";
import { supabase } from "../services/supabase";
import {
  getInternshipMatch,
  getRoadmapSuggestions,
} from "../utils/internshipMatching";

const PROFILE_STORAGE_KEY = "skillbridge_student_profile";
const PAGE_SIZE = 24;
const APPLICATION_STATUSES = ["Interested", "Applied", "Interview", "Selected", "Rejected"];
const DOMAINS = [
  "Web Development",
  "App Development",
  "AI/ML",
  "Data Science",
  "Cybersecurity",
  "Cloud",
  "Design",
  "Other",
];
const INITIAL_FILTERS = {
  search: "",
  domain: "",
  location: "",
  country: "",
  workMode: "",
  paidStatus: "",
  duration: "",
  experience: "",
  sort: "relevance",
  view: "all",
  page: 1,
};

function readLocalProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    return profile && typeof profile === "object" && !Array.isArray(profile)
      ? profile
      : null;
  } catch (error) {
    console.error("Unable to read saved internship profile:", error);
    return null;
  }
}

function formatDate(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function safeDateLabel(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDate(date);
}

function cardTracking(item, records) {
  const key = item.externalId ? trackingKey(item.source, item.externalId) : item.id;
  return records[key] || records[item.id] || {
    is_saved: false,
    application_status: null,
    application_date: "",
    notes: "",
  };
}

function filterTrackedItems(items, filters, profile) {
  const search = filters.search.trim().toLocaleLowerCase();
  const location = filters.location.trim().toLocaleLowerCase();
  const country = filters.country.trim().toLocaleLowerCase();
  const duration = filters.duration.trim().toLocaleLowerCase();
  const experience = filters.experience.trim().toLocaleLowerCase();
  const filtered = items.filter((item) => {
    const searchText = [
      item.title,
      item.company,
      item.location,
      item.country,
      item.description,
      item.remoteEligibility,
      ...(item.sourceTags || []),
      ...(item.requiredSkills || []),
    ].join(" ").toLocaleLowerCase();
    return (!search || searchText.includes(search)) &&
      (!location || String(item.location || "").toLocaleLowerCase().includes(location)) &&
      (!country || `${item.country || ""} ${item.location || ""}`.toLocaleLowerCase().includes(country)) &&
      (!filters.domain || item.domain === filters.domain) &&
      (!filters.workMode || item.workMode === filters.workMode) &&
      (!filters.paidStatus || item.paidStatus === filters.paidStatus) &&
      (!duration || String(item.duration || "").toLocaleLowerCase().includes(duration)) &&
      (!experience || String(item.experience || "").toLocaleLowerCase().includes(experience));
  });
  if (filters.sort === "company") {
    filtered.sort((left, right) => String(left.company || "").localeCompare(String(right.company || "")));
  } else if (filters.sort === "deadline") {
    filtered.sort((left, right) =>
      (Date.parse(left.deadline || "") || Infinity) -
      (Date.parse(right.deadline || "") || Infinity)
    );
  } else if (filters.sort === "relevance") {
    filtered.sort((left, right) =>
      (getInternshipMatch(profile, right).percentage ?? -1) -
      (getInternshipMatch(profile, left).percentage ?? -1)
    );
  } else {
    filtered.sort((left, right) =>
      (Date.parse(right.publishedAt || "") || 0) -
      (Date.parse(left.publishedAt || "") || 0)
    );
  }
  return filtered;
}

function InternshipCard({
  item,
  profile,
  roadmapItems,
  tracking,
  authenticated,
  saving,
  explanation,
  explanationLoading,
  onTrackingChange,
  onExplain,
}) {
  const [notesDraft, setNotesDraft] = useState(tracking.notes || "");
  useEffect(() => setNotesDraft(tracking.notes || ""), [tracking.notes]);
  const match = getInternshipMatch(profile, item);
  const roadmapSuggestions = getRoadmapSuggestions(roadmapItems, match.missingSkills);
  const publishedLabel = safeDateLabel(item.publishedAt);
  const deadlineLabel = safeDateLabel(item.deadline);
  const deadlineDays = item.deadline
    ? Math.ceil((Date.parse(item.deadline) - Date.now()) / 86400000)
    : null;
  const statusLabel = tracking.application_status || "Not tracked";

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {item.companyLogo ? (
            <img
              src={item.companyLogo}
              alt=""
              loading="lazy"
              className="h-11 w-11 shrink-0 rounded-xl border border-slate-100 object-contain p-1"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 size={21} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="break-words font-bold text-slate-900">{item.title}</h2>
            <p className="mt-1 truncate text-xs text-slate-500">{item.company}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={!authenticated || saving}
          aria-label={tracking.is_saved ? "Remove saved internship" : "Save internship"}
          aria-pressed={tracking.is_saved}
          onClick={() => onTrackingChange(item, { ...tracking, is_saved: !tracking.is_saved })}
          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          title={authenticated ? (tracking.is_saved ? "Remove from saved" : "Save internship") : "Sign in to save internships"}
        >
          <Bookmark size={16} fill={tracking.is_saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full px-2.5 py-1 font-semibold ${
          item.isCurrentListing === false
            ? "bg-slate-100 text-slate-600"
            : "bg-emerald-50 text-emerald-700"
        }`}>
          {item.isCurrentListing === false
            ? "Saved snapshot · not in current feed"
            : `Live source listing · ${item.source || "Source unavailable"}`}
        </span>
        {match.percentage !== null && (
          <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
            {match.percentage}% profile evidence match
          </span>
        )}
        {item.domain && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{item.domain}</span>
        )}
        {deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7 && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
            Deadline in {deadlineDays} day{deadlineDays === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {item.description && (
        <p className="mt-4 line-clamp-4 text-xs leading-5 text-slate-600">{item.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} /> {item.location || "Location not provided"}
        </span>
        {item.country && item.country !== item.location && <span>{item.country}</span>}
        <span>{item.workMode || "Work mode not provided"}</span>
        <span>{item.compensation || (item.compensationMentioned ? "Compensation details in source description" : "Compensation not provided")}</span>
        {(item.duration || item.durationMentioned) && <span>{item.duration || "Duration in source description"}</span>}
      </div>

      <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600 sm:grid-cols-2">
        <p>Source-listed eligibility: {item.eligibility || (item.eligibilityMentioned ? "See source description" : "Not provided")}</p>
        {item.remoteEligibility && <p>Remote eligibility/location: {item.remoteEligibility}</p>}
        <p>Source-listed level/experience: {item.experience || (item.experienceMentioned ? "See source description" : "Not provided")}</p>
        <p>Application deadline: {deadlineLabel || (item.deadlineMentioned ? "See source description; exact date not parsed" : "Not provided")}</p>
        <p>Posted: {publishedLabel || "Not provided"}</p>
        {item.compensationMentioned && <p>Pay status: {item.paidStatus || "Not stated"}</p>}
      </div>

      {item.sourceTags?.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Source tags</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.sourceTags.slice(0, 10).map((tag) => (
              <span key={tag} className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {match.percentage !== null && (
        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
          <p className="text-xs font-semibold text-violet-900">Profile skill comparison</p>
          <p className="mt-1 text-[10px] leading-4 text-violet-800">
            Deterministic score: rounded matched evidence weight ÷ {match.totalWeight} observed listing signals. Beginner profile skills weigh 0.5, intermediate 0.75, advanced 1, project evidence 0.75, experience evidence 0.85, and career/education context 0.5. Signals are exact source-listed skills/tags or exact profile-evidence mentions in the title, description, eligibility, or experience text. Provider tags may be categories, not requirements; this score does not establish eligibility.
          </p>
          <p className="mt-1 text-[10px] text-violet-800">
            Score calculation: round({match.matchedWeight.toFixed(2)} ÷ {match.totalWeight} × 100) = {match.percentage}%.
          </p>
          {match.matchingSkills.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-700">
              Matching profile skills: {match.matchingSkills.map((skill) =>
                `${skill.name}${skill.proficiency ? ` (${skill.proficiency})` : ""}`
              ).join(", ")}
            </p>
          )}
          {match.matchingEvidence.some((evidence) => evidence.source !== "profile skill") && (
            <p className="mt-1 text-[11px] text-slate-700">
              Other profile evidence: {match.matchingEvidence
                .filter((evidence) => evidence.source !== "profile skill")
                .map((evidence) => `${evidence.tag} (${evidence.source})`)
                .join(", ")}
            </p>
          )}
          {match.missingSkills.length > 0 && (
            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/70 p-2.5">
              <p className="text-[11px] font-semibold text-amber-900">Skills or listing signals to explore before applying</p>
              <p className="mt-1 text-[11px] text-slate-700">{match.missingSkills.join(", ")}</p>
              <p className="mt-1 text-[10px] text-amber-800">These are source-listed skills/tags not found in your profile. Tags may be categories; they are not confirmed requirements or an eligibility decision.</p>
            </div>
          )}
          {match.unmatchedProfileSkills.length > 0 && (
            <p className="mt-1 text-[11px] text-slate-700">
              Your profile skills not mentioned in this listing: {match.unmatchedProfileSkills.slice(0, 8).join(", ")}.
            </p>
          )}
          {match.roleRelevance && (
            <p className="mt-1 text-[11px] text-slate-700">
              The title also includes your stated target role.
            </p>
          )}
          {roadmapSuggestions.length > 0 && (
            <div className="mt-2 border-t border-violet-100 pt-2">
              <p className="text-[11px] font-semibold text-violet-900">Skills to explore and related active-roadmap items</p>
              <p className="mt-1 text-[10px] text-violet-800">These are unmatched source signals, not confirmed internship requirements.</p>
              <ul className="mt-1 list-inside list-disc text-[11px] text-slate-700">
                {roadmapSuggestions.slice(0, 3).map((entry) => (
                  <li key={entry.id}>{entry.title} ({entry.status.replaceAll("_", " ")})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {!match.hasProfile && (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
          Add skills, projects, experience, education, or career interests to your profile to calculate a personalized match. No score or skill gaps are inferred from a missing profile.
        </div>
      )}

      <details className="mt-4 rounded-xl border border-slate-100 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700">Details and application tracking</summary>
        <div className="mt-3 space-y-3">
          {item.description && (
            <p className="whitespace-pre-line text-xs leading-5 text-slate-600">{item.description}</p>
          )}
          {item.jobTypes?.length > 0 && (
            <p className="text-xs text-slate-600">Source listing type: {item.jobTypes.join(", ")}</p>
          )}
          <p className="text-[11px] text-slate-500">
            Source: {item.source} · Provider updated: {safeDateLabel(item.sourceUpdatedAt) || "Not provided"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-medium text-slate-600">
              Application status
              <select
                value={tracking.application_status || ""}
                disabled={!authenticated || saving}
                onChange={(event) => onTrackingChange(item, {
                  ...tracking,
                  application_status: event.target.value || null,
                })}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs disabled:bg-slate-50"
              >
                <option value="">Not tracked</option>
                {APPLICATION_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-medium text-slate-600">
              Application date
              <input
                type="date"
                value={tracking.application_date || ""}
                disabled={!authenticated || saving || !tracking.application_status}
                onChange={(event) => onTrackingChange(item, {
                  ...tracking,
                  application_date: event.target.value || null,
                })}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs disabled:bg-slate-50"
              />
            </label>
          </div>
          <label className="block text-[11px] font-medium text-slate-600">
            Personal notes
            <textarea
              value={notesDraft}
              maxLength={2000}
              disabled={!authenticated || saving || (!tracking.is_saved && !tracking.application_status)}
              onChange={(event) => setNotesDraft(event.target.value)}
              onBlur={() => onTrackingChange(item, { ...tracking, notes: notesDraft })}
              rows={2}
              placeholder="Private notes about this opportunity"
              className="mt-1 block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:bg-slate-50"
            />
          </label>
          <p className="text-[10px] text-slate-500">Status: {statusLabel}. Saved records are private to your account.</p>
        </div>
      </details>

      {explanation && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-900">Gemini explanation</p>
          <p className="mt-1 text-xs leading-5 text-slate-700">{explanation.whyMatches}</p>
          {explanation.preparationSuggestions?.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-[11px] text-slate-600">
              {explanation.preparationSuggestions.map((suggestion, index) => (
                <li key={`${index}-${suggestion}`}>{suggestion}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <a
          href={item.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          {item.source === "Jobicy" ? "View on Jobicy" : "Apply on source"} <ExternalLink size={14} />
        </a>
        <button
          type="button"
          onClick={() => onExplain(item)}
          disabled={!authenticated || explanationLoading || item.isCurrentListing === false}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-200 px-3 py-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
          title={authenticated ? "Generate a profile-grounded explanation" : "Sign in for a Gemini explanation"}
        >
          <Sparkles size={14} />           {item.isCurrentListing === false ? "Source listing unavailable" : explanationLoading ? "Explaining…" : "Explain fit"}
        </button>
        {saving && <span className="text-[11px] text-slate-500">Saving…</span>}
      </div>
    </article>
  );
}

export default function Internships() {
  const { user, session, isConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [feed, setFeed] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roadmapItems, setRoadmapItems] = useState([]);
  const [trackingRecords, setTrackingRecords] = useState({});
  const [explanations, setExplanations] = useState({});
  const [explanationErrors, setExplanationErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [savingIds, setSavingIds] = useState({});
  const [explainingIds, setExplainingIds] = useState({});
  const forceRefreshRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get("search");
    const requestedView = ["all", "saved", "tracking"].includes(params.get("view"))
      ? params.get("view")
      : search !== null ? "all" : null;
    if (search !== null || requestedView) {
      setFilters((previous) => previous.search === (search ?? previous.search) &&
        previous.view === (requestedView ?? previous.view) && previous.page === 1
        ? previous
        : { ...previous, ...(search !== null ? { search } : {}), ...(requestedView ? { view: requestedView } : {}), page: 1 });
    }
  }, [location.search]);

  const serverFilters = useMemo(() => ({
    search: filters.search.trim(),
    domain: filters.domain,
    location: filters.location,
    country: filters.country,
    workMode: filters.workMode,
    paidStatus: filters.paidStatus,
    duration: filters.duration,
    experience: filters.experience,
    sort: filters.sort === "relevance" ? "newest" : filters.sort,
    page: filters.page,
    perPage: filters.sort === "relevance" ? 60 : PAGE_SIZE,
  }), [filters]);

  const patchFilter = useCallback((key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "page" ? {} : { page: 1 }),
    }));
    if (key === "search") {
      const params = new URLSearchParams(location.search);
      if (value.trim()) params.set("search", value);
      else params.delete("search");
      const query = params.toString();
      navigate(`${location.pathname}${query ? `?${query}` : ""}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    const force = forceRefreshRef.current;
    forceRefreshRef.current = false;
    setLoading(true);
    setError("");

    const load = force
      ? refreshLiveInternships(serverFilters, controller.signal)
      : fetchLiveInternships(controller.signal, serverFilters);
    load
      .then(setFeed)
      .catch((loadError) => {
        if (loadError.name !== "AbortError") {
          setError(loadError.message || "The live internship feed is unavailable.");
          setFeed(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey, serverFilters]);

  const loadStudentContext = useCallback(async () => {
    setProfileLoading(true);
    setProfileError("");
    setRoadmapItems([]);
    if (!isConfigured || !user) {
      setProfile(readLocalProfile());
      setProfileLoading(false);
      return;
    }

    try {
      const savedProfile = await fetchStudentProfile(user);
      setProfile(savedProfile);
      if (supabase) {
        const { data: roadmap, error: roadmapError } = await supabase
          .from("learning_roadmaps")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (roadmapError) throw roadmapError;
        if (roadmap) {
          const { data: items, error: itemError } = await supabase
            .from("roadmap_items")
            .select("id,title,skill,status")
            .eq("user_id", user.id)
            .eq("roadmap_id", roadmap.id)
            .order("position", { ascending: true });
          if (itemError) throw itemError;
          setRoadmapItems(items || []);
        }
      }
    } catch (loadError) {
      console.error("Internship profile load failed:", loadError);
      setProfile(null);
      setProfileError(loadError.message || "Your saved profile could not be loaded.");
    } finally {
      setProfileLoading(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    loadStudentContext();
  }, [loadStudentContext]);

  useEffect(() => {
    const handleProfileUpdate = () => loadStudentContext();
    window.addEventListener("studentProfileUpdated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("studentProfileUpdated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, [loadStudentContext]);

  useEffect(() => {
    let active = true;
    setTrackingRecords({});
    setTrackingError("");
    if (!isConfigured || !user) {
      setTrackingLoading(false);
      return () => { active = false; };
    }

    setTrackingLoading(true);
    fetchInternshipTracking(user.id)
      .then((records) => {
        if (!active) return;
        setTrackingRecords(Object.fromEntries(
          records.map((record) => [
            trackingKey(record.source_name, record.external_id),
            record,
          ])
        ));
      })
      .catch((loadError) => {
        if (!active) return;
        console.error("Internship tracking load failed:", loadError);
        setTrackingError(loadError.message || "Your saved internships could not be loaded.");
      })
      .finally(() => {
        if (active) setTrackingLoading(false);
      });
    return () => { active = false; };
  }, [isConfigured, user]);

  const handleRefresh = () => {
    forceRefreshRef.current = true;
    setReloadKey((key) => key + 1);
  };

  const handleTrackingChange = async (item, nextTracking, persist = true) => {
    if (!persist) return;
    if (!isConfigured || !user) {
      setTrackingError("Sign in with Supabase configured to save or track internships.");
      return;
    }
    setTrackingError("");
    setSavingIds((previous) => ({ ...previous, [item.id]: true }));
    try {
      const row = await saveInternshipTracking(user.id, item, nextTracking);
      setTrackingRecords((previous) => {
        const next = { ...previous };
        const key = trackingKey(item.source, item.externalId);
        if (row) next[key] = row;
        else delete next[key];
        return next;
      });
      window.dispatchEvent(new CustomEvent("studentProgressUpdated", {
        detail: { type: "internship_tracking", internshipId: item.id },
      }));
    } catch (saveError) {
      console.error("Internship tracking save failed:", saveError);
      setTrackingError(saveError.message || "Unable to save internship tracking.");
    } finally {
      setSavingIds((previous) => ({ ...previous, [item.id]: false }));
    }
  };

  const handleExplain = async (item) => {
    if (!session?.access_token || explanations[item.id] || explainingIds[item.id]) return;
    setExplanationErrors((previous) => ({ ...previous, [item.id]: "" }));
    setExplainingIds((previous) => ({ ...previous, [item.id]: true }));
    try {
      const result = await explainInternshipMatch(session.access_token, item.id);
      setExplanations((previous) => ({ ...previous, [item.id]: result }));
    } catch (explanationError) {
      console.error("Internship explanation failed:", explanationError);
      setExplanationErrors((previous) => ({
        ...previous,
        [item.id]: explanationError.message || "Unable to generate an explanation.",
      }));
    } finally {
      setExplainingIds((previous) => ({ ...previous, [item.id]: false }));
    }
  };

  const pageItems = useMemo(() => {
    const items = (feed?.internships || []).map((item) => ({
      ...item,
      isCurrentListing: true,
    }));
    if (filters.sort === "relevance") {
      items.sort((left, right) => {
        const priority = (item) =>
          (item.workMode === "Remote" ? 1 : 0) +
          (item.country?.toLocaleLowerCase() === "india" ||
            /\bindia\b/i.test(item.location || "") ? 2 : 0);
        const priorityDifference = priority(right) - priority(left);
        if (priorityDifference) return priorityDifference;
        const leftMatch = getInternshipMatch(profile, left).percentage ?? -1;
        const rightMatch = getInternshipMatch(profile, right).percentage ?? -1;
        return rightMatch - leftMatch;
      });
    }
    return items;
  }, [feed, filters.sort, profile]);

  const trackedItems = useMemo(() => {
    const liveById = new Map(pageItems.map((item) => [
      trackingKey(item.source, item.externalId),
      item,
    ]));
    return Object.values(trackingRecords)
      .filter((record) => record.is_saved || record.application_status)
      .map((record) => {
        const id = trackingKey(record.source_name, record.external_id);
        const current = liveById.get(id);
        if (current) return current;
        const snapshot = record.listing_snapshot || {};
        return {
          ...snapshot,
          id,
          externalId: record.external_id,
          applicationUrl: record.application_url,
          source: record.source_name,
          sourceTags: Array.isArray(snapshot.sourceTags) ? snapshot.sourceTags : [],
          requiredSkills: Array.isArray(snapshot.requiredSkills) ? snapshot.requiredSkills : [],
          jobTypes: Array.isArray(snapshot.jobTypes) ? snapshot.jobTypes : [],
          isCurrentListing: false,
        };
      });
  }, [pageItems, trackingRecords]);

  const visibleItems = useMemo(() => {
    if (filters.view === "saved") {
      const savedItems = filterTrackedItems(
        trackedItems.filter((item) => cardTracking(item, trackingRecords).is_saved),
        filters,
        profile
      );
      const params = new URLSearchParams(location.search);
      const source = params.get("source");
      const externalId = params.get("id");
      return source && externalId
        ? savedItems.filter((item) => trackingKey(item.source, item.externalId) === trackingKey(source, externalId))
        : savedItems;
    }
    if (filters.view === "tracking") {
      return filterTrackedItems(
        trackedItems.filter((item) => cardTracking(item, trackingRecords).application_status),
        filters,
        profile
      );
    }
    return pageItems;
  }, [filters, location.search, pageItems, profile, trackedItems, trackingRecords]);

  const savedCount = Object.values(trackingRecords).filter((record) => record.is_saved).length;
  const trackedCount = Object.values(trackingRecords).filter((record) => record.application_status).length;
  const totalPages = feed?.pagination?.totalPages || 0;
  const feedLastUpdated = safeDateLabel(feed?.lastUpdated);
  const isAuthenticated = Boolean(isConfigured && user && supabase);
  const selectSummaryView = (view) => {
    setFilters({ ...INITIAL_FILTERS, view });
  };

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            <Sparkles size={14} /> Career opportunities
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Internship Explorer
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Live internship listings from public job-board sources. Each action opens the source-provided listing; unavailable fields are not inferred.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh feed
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={BriefcaseBusiness}
          label="Live matching listings"
          value={feed?.totalListings ?? (loading ? "Loading" : 0)}
          onClick={() => selectSummaryView("all")}
        />
        <Stat
          icon={Bookmark}
          label="Saved internships"
          value={trackingLoading ? "Loading" : savedCount}
          onClick={() => selectSummaryView("saved")}
        />
        <Stat
          icon={Clock3}
          label="Applications tracked"
          value={trackingLoading ? "Loading" : trackedCount}
          onClick={() => selectSummaryView("tracking")}
        />
      </section>

      {feed?.providers?.some((provider) => provider.status !== "ok") && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Some sources are temporarily unavailable or returned partial results. Available listings from other sources are still shown.
          <span className="mt-1 block text-xs">
            {feed.providers.map((provider) =>
              `${provider.source}: ${provider.status}${provider.count ? ` (${provider.count})` : ""}`
            ).join(" · ")}
          </span>
        </div>
      )}

      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative block md:col-span-2">
              <span className="sr-only">Search internship listings</span>
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(event) => patchFilter("search", event.target.value)}
                placeholder="Search role, company, or skills"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
              {filters.search && (
                <button
                  type="button"
                  aria-label="Clear internship search"
                  onClick={() => patchFilter("search", "")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <FilterSelect label="Domain" value={filters.domain} onChange={(value) => patchFilter("domain", value)} options={DOMAINS} />
            <FilterSelect label="Work mode" value={filters.workMode} onChange={(value) => patchFilter("workMode", value)} options={["Remote", "Hybrid", "On-site"]} />
            <label>
              <span className="sr-only">Filter by location</span>
              <input value={filters.location} onChange={(event) => patchFilter("location", event.target.value)} placeholder="Location" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" />
            </label>
            <label>
              <span className="sr-only">Filter by country</span>
              <input value={filters.country} onChange={(event) => patchFilter("country", event.target.value)} placeholder="Country" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" />
            </label>
            <FilterSelect label="Compensation" value={filters.paidStatus} onChange={(value) => patchFilter("paidStatus", value)} options={["Paid", "Unpaid"]} />
            <label>
              <span className="sr-only">Filter by duration</span>
              <input value={filters.duration} onChange={(event) => patchFilter("duration", event.target.value)} placeholder="Duration (source-provided)" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" />
            </label>
            <label>
              <span className="sr-only">Filter by experience</span>
              <input value={filters.experience} onChange={(event) => patchFilter("experience", event.target.value)} placeholder="Experience (source-provided)" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" />
            </label>
            <FilterSelect
              label="Sort listings"
              value={filters.sort}
              onChange={(value) => patchFilter("sort", value)}
              options={[
                ["relevance", "Profile relevance"],
                ["newest", "Newest"],
                ["deadline", "Deadline"],
                ["company", "Company"],
              ]}
            />
            <FilterSelect
              label="My internships"
              value={filters.view}
              onChange={(value) => patchFilter("view", value)}
              options={[
                ["all", "All listings"],
                ["saved", "Saved"],
                ["tracking", "Application tracking"],
              ]}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {feed?.providers?.length
                ? `Source updates: ${feed.providers.map((provider) =>
                    `${provider.source} ${provider.count} · ${
                      provider.lastUpdated
                        ? new Date(provider.lastUpdated).toLocaleString()
                        : "time unavailable"
                    }`
                  ).join(" | ")}.`
                : feedLastUpdated
                  ? `Source fetched ${new Date(feed.lastUpdated).toLocaleString()}.`
                  : "Source fetch time not available."}
              {" "}India and remote roles are prioritized when the source identifies them. Arbeitnow does not provide complete stipend, deadline, country or eligibility fields for every listing.
            </p>
            <button type="button" onClick={() => setFilters(INITIAL_FILTERS)} className="text-xs font-semibold text-blue-600 hover:underline">
              Clear all filters
            </button>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            Sign in with Supabase configured to save listings and persist application tracking. Public feed and local profile matching remain available.
          </div>
        )}
        {profileError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle size={17} className="mt-0.5 shrink-0" /> {profileError}
          </div>
        )}
        {trackingError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle size={17} className="mt-0.5 shrink-0" /> {trackingError}
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error} No sample listings are substituted.</span>
            <button type="button" onClick={handleRefresh} className="ml-auto font-semibold underline">Retry</button>
          </div>
        )}

        {explanationErrors && Object.values(explanationErrors).some(Boolean) && (
          <div role="status" className="text-xs text-amber-700">
            {Object.values(explanationErrors).find(Boolean)}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-800">
            {filters.view === "saved" ? "Saved internships" : filters.view === "tracking" ? "Tracked applications" : "Internships matching your filters"}
          </h2>
          <span className="text-xs text-slate-400">
            {filters.view === "all"
              ? `${feed?.pagination?.total ?? 0} listings · page ${feed?.pagination?.page || 1} of ${totalPages || 1}`
              : `${visibleItems.length} tracked listings`}
          </span>
        </div>

        {loading || profileLoading ? (
          <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-slate-200" />)}
          </div>
        ) : visibleItems.length ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleItems.map((item) => (
                <InternshipCard
                  key={item.id}
                  item={item}
                  profile={profile}
                  roadmapItems={roadmapItems}
                  tracking={cardTracking(item, trackingRecords)}
                  authenticated={isAuthenticated}
                  saving={Boolean(savingIds[item.id])}
                  explanation={explanations[item.id]}
                  explanationLoading={Boolean(explainingIds[item.id])}
                  onTrackingChange={handleTrackingChange}
                  onExplain={handleExplain}
                />
              ))}
            </div>
            {totalPages > 1 && filters.view === "all" && (
              <div className="flex items-center justify-center gap-3">
                <button type="button" disabled={filters.page <= 1} onClick={() => patchFilter("page", filters.page - 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold disabled:opacity-40">Previous</button>
                <span className="text-xs text-slate-500">Page {filters.page} of {totalPages}</span>
                <button type="button" disabled={filters.page >= totalPages} onClick={() => patchFilter("page", filters.page + 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold disabled:opacity-40">Next</button>
              </div>
            )}
          </>
        ) : !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-9 text-center">
            {filters.view === "saved" ? <Bookmark size={30} className="mx-auto text-slate-300" /> : <BriefcaseBusiness size={30} className="mx-auto text-slate-300" />}
            <h3 className="mt-3 font-bold text-slate-800">No listings match this view</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Try different filters or refresh the live provider feed. Listings are not fabricated to fill empty results.
            </p>
            <button type="button" onClick={() => setFilters(INITIAL_FILTERS)} className="mt-4 text-sm font-semibold text-blue-600 underline">
              Clear filters
            </button>
          </div>
        )}
      </section>

      <p className="text-center text-[11px] leading-5 text-slate-400">
        Data sources:{" "}
        <a href="https://www.arbeitnow.com/api/job-board-api" target="_blank" rel="noopener noreferrer" className="underline">
          Arbeitnow public job-board API
        </a>
        {" and "}
        <a href="https://jobicy.com/jobs-rss-feed" target="_blank" rel="noopener noreferrer" className="underline">
          Jobicy public jobs API
        </a>
        . Listings are source-provided, not independently employer-verified. Jobicy links open its listing page; confirm current availability, employer application steps, and eligibility there.
      </p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => {
          const [optionValue, optionLabel] = Array.isArray(option) ? option : [option, option];
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
    </label>
  );
}

function Stat({ icon: Icon, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={`Show ${label.toLowerCase()}`}
    >
      <span className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={20} /></span>
      <p className="mt-4 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </button>
  );
}
