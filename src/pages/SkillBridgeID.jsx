import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { AlertCircle, Award, BriefcaseBusiness, CalendarDays, CheckCircle2, Code2, ExternalLink, GraduationCap, LoaderCircle, ShieldCheck } from "lucide-react";
import { fetchPublicStudentProfile, fetchStudentProfile } from "../services/profileRepository";
import {
  isSupabaseConfigured,
  supabaseConfigurationError,
} from "../services/supabase";
import { useAuth } from "../hooks/useAuth";

export default function SkillBridgeID() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [ownProfile, setOwnProfile] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ownLoading, setOwnLoading] = useState(true);
  const [ownError, setOwnError] = useState("");

  useEffect(() => {
    if (slug || !isSupabaseConfigured || !user) {
      setOwnLoading(false);
      return undefined;
    }

    let active = true;
    setOwnLoading(true);
    fetchStudentProfile(user)
      .then(async (studentProfile) => {
        if (!active) return;
        setOwnProfile(studentProfile);
        if (studentProfile.publicEnabled && studentProfile.publicSlug) {
          const url = `${window.location.origin}/id/${encodeURIComponent(studentProfile.publicSlug)}`;
          setQrCode(await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 220 }));
        }
      })
      .catch((loadError) => {
        if (active) {
          console.error("Unable to load SkillBridge ID settings:", loadError);
          setOwnError("Unable to load your public profile settings.");
        }
      })
      .finally(() => {
        if (active) setOwnLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, user]);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setQrCode("");
    setError("");

    if (!isSupabaseConfigured || !/^[a-zA-Z0-9-]{3,60}$/.test(slug)) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    fetchPublicStudentProfile(slug)
      .then(async (publicProfile) => {
        if (!active) return;
        if (!publicProfile) {
          setError("This profile is unavailable or its owner has disabled public sharing.");
          return;
        }

        setProfile(publicProfile);
        const url = `${window.location.origin}/id/${encodeURIComponent(slug)}`;
        const code = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 220,
        });
        if (active) setQrCode(code);
      })
      .catch((loadError) => {
        if (active) {
          console.error("Unable to load public student profile:", loadError);
          setError("Unable to load this public profile right now.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (!slug) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 sm:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
              <ShieldCheck size={15} /> Public identity
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">SkillBridge ID</h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage and share only the profile information you have explicitly made public.
            </p>
          </div>
          {!isSupabaseConfigured ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              {supabaseConfigurationError || "Public IDs require Supabase. Configure it before enabling public sharing."}
            </div>
          ) : ownLoading ? (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin" /> Loading sharing settings...
            </div>
          ) : ownError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-700">{ownError}</div>
          ) : ownProfile?.publicEnabled ? (
            <section className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:flex-row sm:text-left">
              {qrCode && <img src={qrCode} alt="QR code for your public SkillBridge ID" className="h-[220px] w-[220px]" />}
              <div>
                <h2 className="text-lg font-bold text-slate-900">Public sharing is enabled</h2>
                <p className="mt-2 break-all text-sm text-blue-700">
                  {window.location.origin}/id/{ownProfile.publicSlug}
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Public viewers can see your name, introduction, skills, projects, and certifications. Contact and academic details stay private.
                </p>
                <Link to="/profile" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800">
                  Edit or revoke sharing
                </Link>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-bold text-slate-900">Your profile is private</h2>
              <p className="mt-2 text-sm text-slate-500">
                You have not enabled public sharing. Your private profile information is not available at a public URL.
              </p>
              <Link to="/profile" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800">
                Review profile sharing options
              </Link>
            </section>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
              <GraduationCap size={24} />
            </span>
            <span className="font-bold text-slate-900">
              SkillBridge <span className="text-blue-600">ID</span>
            </span>
          </Link>
          <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={15} /> Public sharing
          </span>
        </header>

        {!isSupabaseConfigured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Public SkillBridge IDs require Supabase configuration.
          </div>
        ) : loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" /> Loading public profile...
          </div>
        ) : error ? (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : profile ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600" />
                <div className="p-7 sm:p-9">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Student profile
                  </p>
                  <h1 className="mt-3 text-3xl font-bold text-slate-900">
                    {profile.name || "Student"}
                  </h1>
                  {profile.introduction && (
                    <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {profile.introduction}
                    </p>
                  )}
                  <p className="mt-5 text-xs text-slate-400">
                    Shared by the profile owner. Private contact details, grades, and academic notes are not shown.
                  </p>
                </div>
              </section>

              {(profile.education || profile.career) && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <GraduationCap size={20} className="text-violet-600" />
                    <h2 className="font-bold text-slate-900">Education and career interests</h2>
                  </div>
                  {profile.education && (
                    <div className="text-sm text-slate-700">
                      <p className="font-semibold">{profile.education.degree || "Education"}{profile.education.department ? ` · ${profile.education.department}` : ""}</p>
                      {profile.education.institution && <p className="mt-1">{profile.education.institution}</p>}
                      {(profile.education.academic_year || profile.education.graduation_year) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {[profile.education.academic_year, profile.education.graduation_year && `Graduation ${profile.education.graduation_year}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  )}
                  {profile.career && (profile.career.target_role || profile.career.preferred_domain) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[profile.career.target_role, profile.career.preferred_domain].filter(Boolean).map((interest) => (
                        <span key={interest} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <Code2 size={20} className="text-blue-600" />
                  <h2 className="font-bold text-slate-900">Skills</h2>
                </div>
                {profile.skills.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span key={skill.id} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                        {skill.name} <span className="text-xs font-medium text-blue-500">{skill.proficiency}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No skills shared.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <ShieldCheck size={20} className="text-emerald-600" />
                  <h2 className="font-bold text-slate-900">Reviewed evidence</h2>
                </div>
                {profile.evidence?.length ? (
                  <div className="space-y-4">
                    {profile.evidence.map((evidence, index) => (
                      <article key={`${evidence.repository_url}-${index}`} className="rounded-xl border border-slate-100 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">{evidence.repository || "Public repository"}</h3>
                            <p className="mt-1 text-xs text-slate-500">Evidence reviewed · {evidence.audited_at ? new Date(evidence.audited_at).toLocaleDateString() : "Date unavailable"}</p>
                          </div>
                          {evidence.repository_url && (
                            <a href={evidence.repository_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                              Repository <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        {evidence.summary && <p className="mt-3 text-sm leading-6 text-slate-600">{evidence.summary}</p>}
                        {Array.isArray(evidence.skills) && evidence.skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {evidence.skills.map((skill, skillIndex) => (
                              <span key={`${skill.name}-${skillIndex}`} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                                {skill.name} · evidence reviewed
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-3 text-[11px] leading-5 text-amber-700">
                          This limited AI review is evidence, not proof of authorship, formal certification, or verified proficiency.
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No reviewed evidence has been shared.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <CalendarDays size={20} className="text-blue-600" />
                  <h2 className="font-bold text-slate-900">Development timeline</h2>
                </div>
                {profile.timeline?.length ? (
                  <ol className="space-y-4">
                    {profile.timeline.map((event, index) => (
                      <li key={`${event.type}-${event.occurred_at}-${index}`} className="flex gap-3">
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{event.title}</p>
                          <p className="mt-1 text-xs text-slate-400">{event.occurred_at ? new Date(event.occurred_at).toLocaleDateString() : "Date unavailable"}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-slate-500">No timeline events have been shared.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <Code2 size={20} className="text-violet-600" />
                  <h2 className="font-bold text-slate-900">Projects</h2>
                </div>
                {profile.projects.length ? (
                  <div className="space-y-4">
                    {profile.projects.map((project) => (
                      <article key={project.id} className="rounded-xl border border-slate-100 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{project.title}</h3>
                            <p className="mt-1 text-xs text-slate-500">{project.status}</p>
                          </div>
                          <div className="flex gap-3 text-xs font-semibold text-blue-600">
                            {project.repository_url && (
                              <a href={project.repository_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                                Source <ExternalLink size={12} />
                              </a>
                            )}
                            {project.live_url && (
                              <a href={project.live_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                                Live <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                        {project.description && <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p>}
                        {project.technologies?.length > 0 && (
                          <p className="mt-3 text-xs text-slate-500">{project.technologies.join(" · ")}</p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No projects shared.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <Award size={20} className="text-amber-600" />
                  <h2 className="font-bold text-slate-900">Certifications</h2>
                </div>
                {profile.certifications.length ? (
                  <ul className="space-y-3">
                    {profile.certifications.map((certification) => (
                      <li key={certification.id} className="flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-800">
                          {certification.name}
                          {certification.issuer && <span className="ml-2 text-slate-500">· {certification.issuer}</span>}
                        </span>
                        {certification.credential_url && (
                          <a href={certification.credential_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                            Credential <ExternalLink size={12} />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No certifications shared.</p>
                )}
              </section>
            </div>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 text-center">
              <h2 className="font-semibold text-slate-900">Scan SkillBridge ID</h2>
              {qrCode ? (
                <img src={qrCode} alt="QR code for this public SkillBridge ID" className="mx-auto mt-4 h-[220px] w-[220px]" />
              ) : (
                <div className="mx-auto mt-4 flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
                  Preparing QR code...
                </div>
              )}
              <p className="mt-3 break-all text-xs text-slate-500">
                {window.location.origin}/id/{slug}
              </p>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}