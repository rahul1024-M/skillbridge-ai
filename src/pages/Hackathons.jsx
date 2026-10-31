import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  ExternalLink,
  FilterX,
  MapPin,
  Search,
  RefreshCw,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchStudentProfile } from "../services/profileRepository";
import {
  fetchHackathons,
  generateHackathonExplanation,
} from "../services/careerIntelligence";
import { supabase } from "../services/supabase";
import {
  escapeCalendarText,
  getHackathonSkillMatch,
  getRegistrationStatus,
  normalizeTechnology,
  toCalendarDate,
} from "../utils/hackathonRadar";

const PROFILE_STORAGE_KEY = "skillbridge_student_profile";
const TEAM_ROLES = [
  "Frontend developer",
  "Backend developer",
  "Full-stack developer",
  "AI / ML developer",
  "Designer",
  "Product / business",
  "Open to any role",
];

function readLocalProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch (error) {
    console.error("Unable to read the saved student profile:", error);
    return null;
  }
}

function formatDate(value, options = { dateStyle: "medium" }) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Not provided";
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

function getEventLocation(event) {
  if (event.mode === "online") return "Online";
  return event.location || (event.mode === "hybrid" ? "Online and in-person" : "Location not provided");
}

function getRegistrationUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function downloadCalendarEvent(event) {
  if (!event.starts_at || !event.ends_at) return false;
  const start = toCalendarDate(event.starts_at);
  const end = toCalendarDate(event.ends_at);
  const description = [
    event.description,
    `Organizer: ${event.organizer}`,
    `Registration: ${event.registration_url}`,
    `Source: ${event.source_url}`,
  ].filter(Boolean).map(escapeCalendarText).join("\\n");
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SkillBridge AI//Hackathon Radar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@skillbridge-ai`,
    `DTSTAMP:${toCalendarDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeCalendarText(event.name)}`,
    `LOCATION:${escapeCalendarText(getEventLocation(event))}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.name.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "") || "hackathon"}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

function Stat({ icon: Icon, label, value, accent, onClick, active }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`w-full rounded-2xl border p-4 text-left transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${active ? "border-sky-300/40 bg-white/[0.09]" : "border-white/[0.08] bg-white/[0.045]"}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={17} />
      </div>
      <p className="mt-4 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-400">{label}</p>
    </button>
  );
}

function HackathonCard({
  event,
  selected,
  saved,
  profileSkills,
  onSave,
  onSelect,
  onExplain,
  onFindTeams,
  explanation,
  explanationLoading,
  teams,
  teamsLoading,
  user,
  ownRequest,
  onTeamRequest,
  onUpdateRequest,
}) {
  const match = getHackathonSkillMatch(profileSkills, event.technologies);
  const registrationOpen = getRegistrationStatus(event) === "open";
  const registrationUrl = getRegistrationUrl(event.registration_url);
  const canSave = event.persisted === true && Boolean(user);
  const canUseTeamMatching = event.provider_status === "verified" && Boolean(user);
  const [preferredRole, setPreferredRole] = useState(TEAM_ROLES[0]);
  const [shareConsent, setShareConsent] = useState(false);
  const [teamMessage, setTeamMessage] = useState("");
  const [teamMessageError, setTeamMessageError] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1932] shadow-[0_16px_45px_rgba(0,0,0,0.18)]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                event.provider_status === "verified"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-sky-400/20 bg-sky-400/10 text-sky-200"
              }`}>
                {event.provider_status === "verified" ? <CheckCircle2 size={12} /> : <ExternalLink size={12} />}
                {event.provider_status === "verified" ? "Verified" : `${event.source_name || "Source"} listing`}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                registrationOpen
                  ? "bg-sky-400/10 text-sky-300"
                  : "bg-slate-700/70 text-slate-400"
              }`}>
                Registration {registrationOpen ? "open" : "closed"}
              </span>
            </div>
            <h2 className="text-xl font-bold leading-tight text-white">{event.name}</h2>
            <p className="mt-1 text-sm text-slate-400">Organized by {event.organizer}</p>
          </div>
          <div className="rounded-xl border border-violet-300/15 bg-violet-400/[0.08] px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/70">Skill match</p>
            <p className="mt-0.5 text-xl font-bold text-violet-200">
              {match.percentage === null ? "—" : `${match.percentage}%`}
            </p>
          </div>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-300">
          {event.description || "The organizer has not provided a description."}
        </p>
        <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
          <p className="flex items-center gap-2"><MapPin size={14} className="text-sky-300" />{getEventLocation(event)}</p>
          <p className="flex items-center gap-2"><CalendarDays size={14} className="text-sky-300" />{event.starts_at ? formatDate(event.starts_at) : "Start date not listed"} – {event.ends_at ? formatDate(event.ends_at) : "End date not listed"}</p>
          <p className="flex items-center gap-2"><Clock3 size={14} className="text-sky-300" />Deadline: {formatDate(event.registration_deadline)}</p>
          <p className="flex items-center gap-2"><Users size={14} className="text-sky-300" />{event.mode === "online" ? "Online event" : event.mode === "hybrid" ? "Hybrid event" : "In person"}</p>
        </div>

        {event.prize_pool && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-200">
            Prize pool: {event.prize_pool}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {(event.technologies || []).map((technology) => {
            const matched = match.matchingSkills.some(
              (skill) => normalizeTechnology(skill) === normalizeTechnology(technology)
            );
            return (
              <span key={technology} className={`rounded-full border px-2.5 py-1 text-[11px] ${
                matched
                  ? "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100"
                  : "border-white/[0.08] bg-white/[0.04] text-slate-400"
              }`}>
                {technology}
              </span>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-3 text-xs leading-5 text-slate-400">
          <p><span className="font-semibold text-emerald-200">Matching skills:</span> {match.matchingSkills.join(", ") || "None listed in your profile"}</p>
          <p className="mt-1"><span className="font-semibold text-amber-200">Skills to explore:</span> {match.missingSkills.join(", ") || "No additional technologies listed"}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {registrationUrl && registrationOpen ? (
            <a href={registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-3.5 py-2.5 text-xs font-bold text-white transition hover:brightness-110">
              Register now <ArrowUpRight size={14} />
            </a>
          ) : (
            <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-700 px-3.5 py-2.5 text-xs font-bold text-slate-400">
              {registrationUrl ? "Registration closed" : "Registration link unavailable"}
            </button>
          )}
          <button type="button" disabled={!event.starts_at || !event.ends_at} onClick={() => downloadCalendarEvent(event)} title={!event.starts_at || !event.ends_at ? "The source did not provide both event dates." : "Add to calendar"} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">
            Add to calendar <CalendarDays size={13} />
          </button>
          {user && (
            <button type="button" disabled={!canSave} title={!canSave ? "Account saving requires server-side Supabase sync configuration." : undefined} onClick={() => onSave(event)} className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
              saved ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : "border-white/10 text-slate-300 hover:bg-white/[0.05]"
            } disabled:cursor-not-allowed disabled:opacity-40`}>
              <Bookmark size={13} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : canSave ? "Save event" : "Save unavailable"}
            </button>
          )}
          <button type="button" onClick={() => onSelect(event.id)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.05]">
            View details <ArrowUpRight size={13} />
          </button>
        </div>

        {event.source_url && (
          <p className="mt-3 text-[11px] text-slate-500">
            Verified listing · <a href={event.source_url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">Organizer source <ExternalLink className="inline" size={11} /></a>
          </p>
        )}
        {event.eligibility && (
          <p className="mt-3 text-xs leading-5 text-slate-400"><span className="font-semibold text-slate-300">Eligibility:</span> {event.eligibility}</p>
        )}
        {event.source_updated_at && (
          <p className="mt-2 text-[10px] text-slate-500">Source updated {formatDate(event.source_updated_at, { dateStyle: "medium", timeStyle: "short" })}</p>
        )}
      </div>

      {selected && (
        <div className="border-t border-white/[0.07] bg-[#0a152b] px-5 py-5 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Sparkles size={15} className="text-violet-300" /> Personalized guidance</h3>
                <button type="button" onClick={() => onExplain(event.id)} disabled={explanationLoading} className="rounded-lg border border-violet-300/20 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-300/10 disabled:opacity-50">
                  {explanationLoading ? "Thinking…" : "Explain my match"}
                </button>
              </div>
              {explanation ? (
                <div className="mt-3 space-y-3 text-xs leading-5 text-slate-300">
                  <p>{explanation.whyMatches}</p>
                  {explanation.preparationSuggestions?.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-slate-400">
                      {explanation.preparationSuggestions.map((suggestion, index) => <li key={`${index}-${suggestion}`}>{suggestion}</li>)}
                    </ul>
                  )}
                  {explanation.error && <p className="text-amber-200">{explanation.error}</p>}
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Transparent match is based on exact skill names in your profile. AI can add context, but does not calculate the match score.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <Link to="/profile" className="text-sky-300 hover:underline">Update profile skills</Link>
                <Link to="/roadmap" className="text-sky-300 hover:underline">Open learning roadmap</Link>
                <Link to="/progress" className="text-sky-300 hover:underline">View progress</Link>
              </div>
            </section>

            <section className="border-t border-white/[0.07] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Users size={15} className="text-cyan-300" /> Team matching</h3>
              {!user || !canUseTeamMatching ? (
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  {!user
                    ? "Sign in to find consenting students or share your own team request."
                    : "Team requests are available after an event is approved and published by an administrator."}
                </p>
              ) : (
                <>
                  <button type="button" onClick={() => onFindTeams(event.id)} disabled={teamsLoading} className="mt-3 rounded-lg border border-cyan-300/20 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-50">
                    {teamsLoading ? "Searching…" : "Find consenting teammates"}
                  </button>
                  {teams?.map((team) => {
                    const shared = team.skills.filter((skill) =>
                      profileSkills.some((ownSkill) => normalizeTechnology(typeof ownSkill === "string" ? ownSkill : ownSkill?.name) === normalizeTechnology(skill))
                    );
                    return (
                      <div key={team.request_id} className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
                        <p className="text-xs font-semibold text-white">{team.display_name || "SkillBridge student"} · {team.preferred_role}</p>
                        <p className="mt-1 text-[11px] text-slate-400">Shared skills: {shared.join(", ") || "No exact overlap listed"}</p>
                      </div>
                    );
                  })}
                  {teams?.length === 0 && <p className="mt-2 text-xs text-slate-500">No students have consented to share a request for this event yet.</p>}
                  <div className="mt-4 rounded-xl border border-white/[0.07] p-3">
                    <label className="block text-[11px] font-semibold text-slate-300" htmlFor={`role-${event.id}`}>Preferred team role</label>
                    <select id={`role-${event.id}`} value={preferredRole} onChange={(e) => setPreferredRole(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#101f3a] px-3 py-2 text-xs text-white">
                      {TEAM_ROLES.map((role) => <option key={role}>{role}</option>)}
                    </select>
                    <label className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-slate-400">
                      <input type="checkbox" checked={shareConsent} onChange={(e) => setShareConsent(e.target.checked)} className="mt-0.5 accent-cyan-400" />
                      I consent to showing my profile name, selected role, and skills to other students looking for this event team.
                    </label>
                    <button type="button" disabled={!shareConsent} onClick={async () => {
                      try {
                        const result = await onTeamRequest(event, preferredRole, shareConsent);
                        setTeamMessage(result.message);
                        setTeamMessageError(!result.success);
                      } catch (requestError) {
                        setTeamMessage(requestError.message || "Could not save your team request.");
                        setTeamMessageError(true);
                      }
                    }} className="mt-3 rounded-lg bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-40">
                      {ownRequest?.status === "looking" ? "Update team request" : "I’m looking for a team"}
                    </button>
                    {ownRequest && (
                      <button type="button" onClick={() => onUpdateRequest(ownRequest.id, ownRequest.status === "closed" ? "looking" : "closed")} className="ml-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
                        {ownRequest.status === "closed" ? "Reopen request" : "Close request"}
                      </button>
                    )}
                    {teamMessage && <p className={`mt-2 text-[11px] ${teamMessageError ? "text-amber-200" : "text-emerald-200"}`}>{teamMessage}</p>}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </article>
  );
}

export default function Hackathons() {
  const { isConfigured, user, session } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [providerStatuses, setProviderStatuses] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [ownRequests, setOwnRequests] = useState([]);
  const [profile, setProfile] = useState(() => readLocalProfile());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [technology, setTechnology] = useState("");
  const [mode, setMode] = useState("");
  const [registration, setRegistration] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("soonest");
  const [eventStatus, setEventStatus] = useState("upcoming");
  const [sourceFilter, setSourceFilter] = useState("");
  const [summaryFilter, setSummaryFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [explanations, setExplanations] = useState({});
  const [explanationLoading, setExplanationLoading] = useState(null);
  const [teams, setTeams] = useState({});
  const [teamsLoading, setTeamsLoading] = useState(null);
  const eventRequest = useRef(null);
  const eventCount = useRef(0);
  const lastUpdatedRef = useRef(null);

  useEffect(() => {
    const search = new URLSearchParams(location.search).get("search");
    if (search !== null) setQuery((current) => current === search ? current : search);
  }, [location.search]);

  useEffect(() => {
    const search = new URLSearchParams(location.search).get("search");
    const eventId = new URLSearchParams(location.search).get("id");
    const match = (eventId && events.find((event) => event.id === eventId)) ||
      (search && events.find((event) => event.name.toLocaleLowerCase() === search.toLocaleLowerCase()));
    if (match) setSelectedId(match.id);
  }, [events, location.search]);

  const loadEvents = useCallback(async ({ force = false } = {}) => {
    eventRequest.current?.abort();
    const controller = new AbortController();
    eventRequest.current = controller;
    setLoading(eventCount.current === 0);
    setRefreshing(force);
    setError("");
    try {
      const filters = {
        search: query.trim(),
        technology,
        city: locationFilter.trim(),
        mode,
        status: eventStatus,
        source: sourceFilter,
        sort: sortOrder === "latest" ? "date_desc" : sortOrder === "deadline" ? "deadline" : "date",
        refresh: force ? "true" : "",
      };

      const result = await fetchHackathons(filters, controller.signal);
      if (controller.signal.aborted) return;
      setEvents(result.events || []);
      setLastUpdated(result.lastUpdated || null);
      eventCount.current = (result.events || []).length;
      lastUpdatedRef.current = result.lastUpdated || null;
      setProviderStatuses(result.providers || []);
      const failedProviders = (result.providers || []).filter((provider) => provider.status === "error");
      const partialProviders = (result.providers || []).filter((provider) => provider.status === "partial");
      const providerIssues = [...failedProviders, ...partialProviders].map((provider) => {
        const detail = provider.error || provider.errors?.filter(Boolean).join(" ");
        return detail ? `${provider.source}: ${detail}` : `${provider.source} is unavailable.`;
      });
      setError(providerIssues.length
        ? `Some event sources are unavailable or limited. Available listings remain visible. ${providerIssues.join(" ")}`
        : "");
    } catch (loadError) {
      if (loadError.name !== "AbortError" && !controller.signal.aborted) {
        console.error("Unable to load the live hackathon feed:", loadError);
        setError(eventCount.current > 0
          ? `Live refresh failed. Showing the last loaded listings${lastUpdatedRef.current ? ` from ${formatDate(lastUpdatedRef.current, { dateStyle: "medium", timeStyle: "short" })}` : ""}.`
          : loadError.message || "Hackathon listings are temporarily unavailable.");
      }
    } finally {
      if (eventRequest.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    eventStatus,
    locationFilter,
    mode,
    query,
    sortOrder,
    sourceFilter,
    technology,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => loadEvents(), 250);
    return () => window.clearTimeout(timeout);
  }, [loadEvents]);

  useEffect(() => {
    let active = true;
    if (!isConfigured || !user || !supabase) {
      setProfile(readLocalProfile());
      setSavedIds([]);
      setOwnRequests([]);
      return () => { active = false; };
    }

    const loadAccountData = async () => {
      try {
        const [savedResult, requestResult] = await Promise.all([
          supabase.from("saved_hackathons").select("hackathon_id").eq("user_id", user.id),
          supabase
            .from("hackathon_team_requests")
            .select("id,hackathon_id,preferred_role,skills_snapshot,share_with_students,status,updated_at")
            .eq("user_id", user.id),
        ]);
        if (savedResult.error) throw savedResult.error;
        if (requestResult.error) throw requestResult.error;
        if (active) {
          setSavedIds((savedResult.data || []).map((entry) => entry.hackathon_id));
          setOwnRequests(requestResult.data || []);
        }
        try {
          const studentProfile = await fetchStudentProfile(user);
          if (active) setProfile(studentProfile);
        } catch (profileError) {
          console.error("Unable to load profile skills for hackathon matching:", profileError);
          if (active) {
            setProfile(null);
            setNotice("Events loaded, but profile skills are unavailable. Update your student profile to personalize matches.");
          }
        }
      } catch (accountError) {
        console.error("Unable to load saved hackathons or team requests:", accountError);
        if (active) setNotice(accountError.message || "Unable to load saved hackathons and team requests.");
      }
    };
    loadAccountData();
    return () => { active = false; };
  }, [isConfigured, user]);

  useEffect(() => () => eventRequest.current?.abort(), []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      if (isConfigured && user) {
        fetchStudentProfile(user)
          .then(setProfile)
          .catch((profileError) => {
            console.error("Unable to refresh profile skills:", profileError);
            setNotice("Your profile could not be refreshed for skill matching.");
          });
      } else {
        setProfile(readLocalProfile());
      }
    };
    window.addEventListener("studentProfileUpdated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("studentProfileUpdated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, [isConfigured, user]);

  const profileSkills = useMemo(() => [
    ...(profile?.skills || []),
    ...(profile?.projects || []).flatMap((project) =>
      (project.technologies || []).map((name) => ({ name, category: "Project" }))
    ),
    ...(profile?.experience || []).flatMap((experience) =>
      (experience.skillsUsed || []).map((name) => ({ name, category: "Experience" }))
    ),
    ...[profile?.targetRole, profile?.preferredDomain]
      .filter(Boolean)
      .map((name) => ({ name, category: "Career interest" })),
  ], [profile]);
  const technologyOptions = useMemo(
    () => [...new Set(events.flatMap((event) => event.technologies || []))].sort((a, b) => a.localeCompare(b)),
    [events]
  );
  const sourceOptions = useMemo(
    () => [...new Set(events.map((event) => event.source_name).filter(Boolean))].sort(),
    [events]
  );

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return events
      .filter((event) => {
        const searchMatches = !normalizedQuery ||
          `${event.name} ${event.organizer} ${(event.technologies || []).join(" ")}`.toLocaleLowerCase().includes(normalizedQuery);
        const technologyMatches = !technology ||
          (event.technologies || []).some((item) => normalizeTechnology(item) === normalizeTechnology(technology));
        const modeMatches = !mode || (mode === "online"
          ? event.mode === "online" || event.mode === "hybrid"
          : event.mode === mode);
        const registrationMatches = !registration || getRegistrationStatus(event) === registration;
        const statusMatches = eventStatus === "all" ||
          (eventStatus === "open" && event.event_status === "open") ||
          (eventStatus === "expired" && event.event_status === "expired") ||
          (eventStatus === "upcoming" && ["open", "upcoming"].includes(event.event_status));
        const sourceMatches = !sourceFilter ||
          String(event.source_name || "").toLocaleLowerCase() === sourceFilter.toLocaleLowerCase();
        const locationMatches = !locationFilter ||
          `${event.location || ""} ${event.country || ""} ${event.mode}`.toLocaleLowerCase().includes(locationFilter.toLocaleLowerCase());
        const summaryMatches = summaryFilter === "" ||
          (summaryFilter === "open" && getRegistrationStatus(event) === "open") ||
          (summaryFilter === "online" && ["online", "hybrid"].includes(event.mode)) ||
          (summaryFilter === "saved" && savedIds.includes(event.id)) ||
          (summaryFilter === "recommended" && getHackathonSkillMatch(profileSkills, event.technologies).matchingSkills.length > 0);
        return searchMatches && technologyMatches && modeMatches && statusMatches && sourceMatches &&
          registrationMatches && locationMatches && summaryMatches;
      })
      .sort((a, b) => {
        const leftDate = sortOrder === "deadline" ? a.registration_deadline : a.starts_at;
        const rightDate = sortOrder === "deadline" ? b.registration_deadline : b.starts_at;
        const delta = new Date(leftDate) - new Date(rightDate);
        return sortOrder === "latest" ? -delta : delta;
      });
  }, [events, locationFilter, mode, profileSkills, query, registration, savedIds, sortOrder, technology, sourceFilter, eventStatus, summaryFilter]);

  const recommendedEvents = events.filter(
    (event) => getHackathonSkillMatch(profileSkills, event.technologies).matchingSkills.length > 0
  );
  const onlineCount = events.filter((event) => event.mode === "online" || event.mode === "hybrid").length;
  const openCount = events.filter((event) => getRegistrationStatus(event) === "open").length;
  const selectSummaryFilter = (filter) => {
    if (filter === "saved" && !user) {
      setNotice("Sign in to view your saved hackathons.");
      return;
    }
    setSummaryFilter((current) => current === filter ? "" : filter);
    setEventStatus("all");
    setQuery("");
    setTechnology("");
    setMode("");
    setRegistration("");
    setLocationFilter("");
    setSourceFilter("");
    document.getElementById("hackathon-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleSaved = async (event) => {
    if (!user || !supabase) {
      setNotice("Sign in to save hackathons to your account.");
      return;
    }
    const isSaved = savedIds.includes(event.id);
    try {
      const result = isSaved
        ? await supabase.from("saved_hackathons").delete().eq("user_id", user.id).eq("hackathon_id", event.id)
        : await supabase.from("saved_hackathons").insert({ user_id: user.id, hackathon_id: event.id });
      if (result.error) {
        setNotice(result.error.message || "Could not update your saved hackathons.");
        return;
      }
      setSavedIds((current) => isSaved
        ? current.filter((id) => id !== event.id)
        : [...current, event.id]);
      if (!isSaved) {
        const { error: progressError } = await supabase.from("student_progress").insert({
          user_id: user.id,
          activity_type: "hackathon_saved",
          description: `Saved hackathon: ${event.name}`,
          metadata: { hackathon_id: event.id },
        });
        if (progressError) {
          console.error("Hackathon was saved but its progress event could not be recorded:", progressError);
          setNotice("Hackathon saved, but the activity could not be added to your progress history.");
        } else {
          window.dispatchEvent(new CustomEvent("studentProgressUpdated"));
          setNotice("Hackathon saved to your account and added to your progress history.");
        }
        return;
      }
      setNotice("Removed from saved hackathons.");
    } catch (saveError) {
      console.error("Unable to update saved hackathons:", saveError);
      setNotice(saveError.message || "Could not update your saved hackathons.");
    }
  };

  const explainMatch = async (hackathonId) => {
    if (!session?.access_token) {
      setExplanations((current) => ({
        ...current,
        [hackathonId]: { error: "Sign in to request an AI explanation." },
      }));
      return;
    }
    setExplanationLoading(hackathonId);
    setExplanations((current) => ({ ...current, [hackathonId]: null }));
    try {
      const result = await generateHackathonExplanation(session.access_token, hackathonId);
      setExplanations((current) => ({
        ...current,
        [hackathonId]: {
          whyMatches: result.whyMatches,
          preparationSuggestions: result.preparationSuggestions || [],
        },
      }));
    } catch (explanationError) {
      setExplanations((current) => ({
        ...current,
        [hackathonId]: {
          error: explanationError.message || "AI explanations are unavailable right now. The transparent skill match remains available.",
        },
      }));
    } finally {
      setExplanationLoading(null);
    }
  };

  const findTeams = async (hackathonId) => {
    if (!supabase) return;
    setTeamsLoading(hackathonId);
    try {
      const { data, error: teamError } = await supabase.rpc(
        "find_hackathon_team_requests",
        { p_hackathon_id: hackathonId }
      );
      if (teamError) throw teamError;
      setTeams((current) => ({ ...current, [hackathonId]: data || [] }));
    } catch (teamError) {
      setNotice(teamError.message || "Team matching is unavailable until its migration is applied.");
    } finally {
      setTeamsLoading(null);
    }
  };

  const submitTeamRequest = async (event, preferredRole, shareConsent) => {
    if (!user || !supabase) return { success: false, message: "Sign in to create a team request." };
    try {
      const skillsSnapshot = profileSkills
        .map((skill) => (typeof skill === "string" ? skill : skill?.name))
        .filter(Boolean)
        .slice(0, 30);
      const { data, error: requestError } = await supabase
        .from("hackathon_team_requests")
        .upsert({
          user_id: user.id,
          hackathon_id: event.id,
          preferred_role: preferredRole,
          skills_snapshot: skillsSnapshot,
          share_with_students: shareConsent,
          status: "looking",
        }, { onConflict: "user_id,hackathon_id" })
        .select("id,hackathon_id,preferred_role,skills_snapshot,share_with_students,status,updated_at")
        .single();
      if (requestError) return { success: false, message: requestError.message || "Could not save your team request." };
      setOwnRequests((current) => [
        ...current.filter((entry) => entry.hackathon_id !== event.id),
        data,
      ]);
      return { success: true, message: "Your consent-based team request is live." };
    } catch (requestError) {
      console.error("Unable to save team request:", requestError);
      return { success: false, message: requestError.message || "Could not save your team request." };
    }
  };

  const updateTeamRequest = async (requestId, status) => {
    if (!supabase || !user) return;
    try {
      const { data, error: requestError } = await supabase
        .from("hackathon_team_requests")
        .update({ status })
        .eq("id", requestId)
        .eq("user_id", user.id)
        .select("id,hackathon_id,preferred_role,skills_snapshot,share_with_students,status,updated_at")
        .single();
      if (requestError) {
        setNotice(requestError.message || "Could not update your team request.");
        return;
      }
      setOwnRequests((current) => current.map((request) => request.id === requestId ? data : request));
      setNotice(status === "closed" ? "Your team request is closed." : "Your team request is open again.");
    } catch (requestError) {
      console.error("Unable to update team request:", requestError);
      setNotice(requestError.message || "Could not update your team request.");
    }
  };

  const resetFilters = () => {
    setQuery("");
    setTechnology("");
    setMode("");
    setRegistration("");
    setLocationFilter("");
    setSortOrder("soonest");
    setEventStatus("upcoming");
    setSourceFilter("");
    setSummaryFilter("");
    setNotice("");
  };

  return (
    <main className="min-h-screen bg-[#071226] px-4 py-6 text-slate-100 sm:px-7 lg:px-9">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(ellipse_at_75%_0%,rgba(59,130,246,0.18),transparent_44%),linear-gradient(130deg,#101d39,#0a1429_65%)] p-6 sm:p-9">
          <div className="relative z-10 max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              <Activity size={15} /> Verified hackathon listings
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Hackathons</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Discover live source listings and admin-verified events, compare your profile skills, and connect with students who choose to share team requests.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/profile" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Update student profile <ArrowUpRight size={14} /></Link>
              <Link to="/skills" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Skill Analyzer <ArrowUpRight size={14} /></Link>
              <Link to="/roadmap" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Learning Roadmap <ArrowUpRight size={14} /></Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-20 hidden h-72 w-72 rounded-full border border-sky-300/10 sm:block" />
          <div className="pointer-events-none absolute -right-1 -top-10 hidden h-52 w-52 rounded-full border border-sky-300/10 sm:block" />
        </header>

        {notice && (
          <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-sky-300/15 bg-sky-300/[0.07] px-4 py-3 text-sm text-sky-100">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message" className="text-sky-200/70 hover:text-white">×</button>
          </div>
        )}
        {error && (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.07] px-4 py-3 text-sm leading-5 text-amber-100">
            <AlertCircle size={17} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <Stat icon={Compass} label="Live event listings" value={events.length} accent="bg-blue-400/10 text-blue-200" active={!summaryFilter} onClick={() => selectSummaryFilter("")} />
          <Stat icon={Clock3} label="Registration open" value={openCount} accent="bg-emerald-400/10 text-emerald-200" active={summaryFilter === "open"} onClick={() => selectSummaryFilter("open")} />
          <Stat icon={Wifi} label="Online / hybrid" value={onlineCount} accent="bg-cyan-400/10 text-cyan-200" active={summaryFilter === "online"} onClick={() => selectSummaryFilter("online")} />
          <Stat icon={Bookmark} label="Saved by you" value={savedIds.length} accent="bg-amber-400/10 text-amber-200" active={summaryFilter === "saved"} onClick={() => selectSummaryFilter("saved")} />
          <Stat icon={Sparkles} label="Skill-recommended" value={recommendedEvents.length} accent="bg-violet-400/10 text-violet-200" active={summaryFilter === "recommended"} onClick={() => selectSummaryFilter("recommended")} />
        </section>

        <section id="hackathon-list" className="grid gap-5">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1932] p-4 sm:p-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="relative block xl:col-span-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search event, organizer, or skill" aria-label="Search hackathons by title, organizer, or skill" className="w-full rounded-xl border border-white/[0.09] bg-[#08152b] py-3 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50" />
                </label>
                <select value={technology} onChange={(e) => setTechnology(e.target.value)} aria-label="Filter by technology" className="rounded-xl border border-white/[0.09] bg-[#08152b] px-3 py-3 text-sm text-slate-200 outline-none focus:border-sky-400/50">
                  <option value="">All technologies</option>
                  {technologyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Filter by event mode" className="rounded-xl border border-white/[0.09] bg-[#08152b] px-3 py-3 text-sm text-slate-200 outline-none focus:border-sky-400/50">
                  <option value="">All event types</option><option value="online">Online</option><option value="hybrid">Hybrid</option><option value="in_person">In person</option>
                </select>
                <select value={registration} onChange={(e) => setRegistration(e.target.value)} aria-label="Filter by registration status" className="rounded-xl border border-white/[0.09] bg-[#08152b] px-3 py-3 text-sm text-slate-200 outline-none focus:border-sky-400/50">
                  <option value="">Any registration status</option><option value="open">Registration open</option><option value="closed">Registration closed</option>
                </select>
                <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Filter by city or country" aria-label="Filter by event city or country" className="rounded-xl border border-white/[0.09] bg-[#08152b] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50" />
                <select value={eventStatus} onChange={(e) => setEventStatus(e.target.value)} aria-label="Filter by event status" className="rounded-xl border border-white/[0.09] bg-[#08152b] px-3 py-3 text-sm text-slate-200 outline-none focus:border-sky-400/50">
                  <option value="upcoming">Upcoming and open</option><option value="open">Registration open</option><option value="expired">Expired</option><option value="all">All statuses</option>
                </select>
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} aria-label="Filter by event source" className="rounded-xl border border-white/[0.09] bg-[#08152b] px-3 py-3 text-sm text-slate-200 outline-none focus:border-sky-400/50">
                  <option value="">All sources</option>
                  {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label="Sort hackathons" className="rounded-xl border border-white/[0.09] bg-[#08152b] px-3 py-3 text-sm text-slate-200 outline-none focus:border-sky-400/50">
                  <option value="soonest">Starting soonest</option><option value="latest">Starting latest</option><option value="deadline">Registration deadline</option>
                </select>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                <div>
                  <p className="text-xs text-slate-400">Showing <span className="font-semibold text-white">{visibleEvents.length}</span> live listings</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {lastUpdated ? `Last updated ${formatDate(lastUpdated, { dateStyle: "medium", timeStyle: "short" })}` : "Feed has not refreshed yet"}
                    {providerStatuses.length > 0 && ` · ${providerStatuses.filter((provider) => ["ok", "partial"].includes(provider.status)).length} source(s) responding`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => loadEvents({ force: true })} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-sky-300/15 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-300/10 disabled:opacity-50">
                    <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Refreshing…" : "Refresh"}
                  </button>
                  <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.05]"><FilterX size={14} /> Reset filters</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1932] p-10 text-center text-sm text-slate-400">Loading the live event feed and your profile…</div>
            ) : visibleEvents.length ? (
              visibleEvents.map((event) => (
                <HackathonCard
                  key={event.id}
                  event={event}
                  selected={selectedId === event.id}
                  saved={savedIds.includes(event.id)}
                  profileSkills={profileSkills}
                  onSave={toggleSaved}
                  onSelect={(id) => setSelectedId((current) => current === id ? null : id)}
                  onExplain={explainMatch}
                  onFindTeams={findTeams}
                  explanation={explanations[event.id]}
                  explanationLoading={explanationLoading === event.id}
                  teams={teams[event.id]}
                  teamsLoading={teamsLoading === event.id}
                  user={user}
                  ownRequest={ownRequests.find((request) => request.hackathon_id === event.id)}
                  onTeamRequest={submitTeamRequest}
                  onUpdateRequest={updateTeamRequest}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1932] p-7 sm:p-10">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200"><Compass size={23} /></div>
                <h2 className="mt-4 text-center text-lg font-bold text-white">
                  {events.length ? "No events match these filters" : error ? "Hackathon listings are unavailable" : "No upcoming hackathons available"}
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-slate-400">
                  {events.length
                    ? "Adjust or reset your filters to see other source listings."
                    : error
                      ? "The live provider could not be reached. Retry in a moment; no placeholder or fabricated listings are shown."
                      : "No source listings match this status right now. Try refreshing or selecting another status."}
                </p>
                {events.length === 0 && !error && (
                  <div className="mt-5 text-center">
                    <a href="https://devpost.com/hackathons" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-sky-300/20 px-4 py-2.5 text-xs font-semibold text-sky-200 hover:bg-sky-300/10">
                      Browse Devpost directory <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-white/[0.08] bg-[#0c1932] p-5">
              <h2 className="text-sm font-bold text-white">Your team requests</h2>
              {ownRequests.length ? (
                <div className="mt-3 space-y-2">
                  {ownRequests.map((request) => {
                    const event = events.find((item) => item.id === request.hackathon_id);
                    return (
                      <div key={request.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                        <p className="text-xs font-semibold text-slate-200">{event?.name || "Verified event"} · {request.preferred_role}</p>
                        <p className="mt-1 text-[11px] text-slate-500">Status: {request.status} · {request.share_with_students ? "Shared with consent" : "Private"}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-xs leading-5 text-slate-400">Your team requests will appear here. Requests stay private unless you explicitly consent to share.</p>
              )}
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,rgba(124,58,237,0.13),rgba(12,25,50,0.9))] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200"><Sparkles size={17} /></div>
              <h2 className="mt-3 text-sm font-bold text-white">Profile-based, not made-up</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Match percentages are the exact overlap between your saved skill names and an event’s published technologies. AI explanations are optional and cannot change that score.
              </p>
              <Link to="/dashboard" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 hover:underline">Go to dashboard <ArrowUpRight size={13} /></Link>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
