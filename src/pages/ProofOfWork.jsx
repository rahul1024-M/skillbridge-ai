
import { useState } from "react";
import {
  ShieldCheck,
  Search,
  Code2,
  BrainCircuit,
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ExternalLink,
  Sparkles,
  FileCode2,
  Target,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function ProofOfWork() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const validateGitHubUrl = (url) => {
    try {
      const parsed = new URL(url.trim());

      if (
        parsed.protocol !== "https:" ||
        parsed.hostname !== "github.com"
      ) {
        return false;
      }

      const parts = parsed.pathname.split("/").filter(Boolean);

      return parts.length === 2;
    } catch {
      return false;
    }
  };

  const handleAudit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    const cleanUrl = repoUrl.trim().replace(/\/+$/, "");

    if (!validateGitHubUrl(cleanUrl)) {
      setError("Enter a valid public GitHub repository URL.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/github/audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl: cleanUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Repository analysis failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the audit server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      {/* Header */}
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
          <Sparkles size={13} />
          AI-POWERED SKILL VERIFICATION
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Proof of Work
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Turn your actual coding work into structured skill evidence.
          Submit your GitHub repository and let AI review your code.
        </p>
      </div>

      {/* Main audit card */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                <Code2 size={27} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  GitHub Repository Audit
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Analyze a public repository
                </p>
              </div>
            </div>

            <form onSubmit={handleAudit}>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Repository URL
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Code2
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(event) =>
                      setRepoUrl(event.target.value)
                    }
                    placeholder="https://github.com/username/repository"
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !repoUrl.trim()}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search size={17} />
                      Analyze Repository
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                  {error}
                </div>
              )}
            </form>

            <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-100 pt-5">
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <LockKeyhole
                  size={14}
                  className="text-emerald-600"
                />
                Public repositories only
              </span>

              <span className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck
                  size={14}
                  className="text-emerald-600"
                />
                Evidence-based review
              </span>
            </div>
          </section>

          {/* Result */}
          {result && (
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 size={19} />
                    <span className="text-sm font-bold">
                      Analysis completed
                    </span>
                  </div>

                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {result.repository?.name || "Repository Report"}
                  </h2>
                </div>

                {result.repository?.url && (
                  <a
                    href={result.repository.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    View GitHub <ExternalLink size={13} />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ResultMetric
                  label="Audit Score"
                  value={`${result.analysis?.score ?? "—"}/100`}
                  icon={Target}
                />

                <ResultMetric
                  label="Files Reviewed"
                  value={result.repository?.filesReviewed ?? "—"}
                  icon={FileCode2}
                />

                <ResultMetric
                  label="Review Status"
                  value={result.analysis?.status || "Reviewed"}
                  icon={ShieldCheck}
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">
                  AI Assessment
                </h3>

                <p className="text-sm leading-6 text-slate-600">
                  {result.analysis?.summary ||
                    "No summary was returned."}
                </p>
              </div>

              <ResultList
                title="Identified strengths"
                items={result.analysis?.strengths}
              />

              <ResultList
                title="Areas to improve"
                items={result.analysis?.improvements}
              />

              {Array.isArray(result.analysis?.skills) &&
                result.analysis.skills.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-slate-900">
                      Skills identified
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {result.analysis.skills.map((skill, index) => (
                        <span
                          key={`${skill.name}-${index}`}
                          className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                        >
                          {skill.name}
                          {skill.level ? ` · ${skill.level}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <p className="border-t border-slate-100 pt-4 text-[11px] leading-5 text-slate-400">
                AI-generated assessment based on the files reviewed.
                This is not a formal certification or proof of
                authorship. Scores are indicative and should be
                interpreted with the reviewed evidence.
              </p>
            </section>
          )}

          {/* Empty state */}
          {!result && (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Code2 size={27} />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-900">
                Your evidence report will appear here
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
                Submit a public GitHub repository to generate a
                structured code review and skills assessment.
              </p>
            </section>
          )}
        </div>

        {/* Information panel */}
        <aside className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-[#172554] to-[#4338ca] p-6 text-white">
            <div className="mb-4 inline-flex rounded-xl bg-white/10 p-3">
              <BrainCircuit size={25} />
            </div>

            <h3 className="text-lg font-bold">Beyond a Resume</h3>

            <p className="mt-2 text-xs leading-6 text-blue-100">
              SkillBridge AI focuses on what students can demonstrate
              through their actual projects, not just the skills they list.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="mb-5 text-sm font-bold text-slate-900">
              What we evaluate
            </h3>

            {[
              ["Code quality", "Structure and readability"],
              ["Problem solving", "Logic and implementation"],
              ["Engineering practices", "Error handling and testing"],
              ["Technical skills", "Tools and technologies used"],
            ].map(([title, description]) => (
              <div
                key={title}
                className="mb-5 flex gap-3 last:mb-0"
              >
                <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-600">
                  <CheckCircle2 size={16} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {title}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle size={17} />
              <h3 className="text-xs font-bold">Important</h3>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-amber-800/80">
              Only public repositories are supported in this MVP.
              AI analysis cannot establish who authored the submitted
              code. Review results are indicative, not official
              certifications.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ResultMetric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <Icon size={18} className="text-blue-600" />
      <p className="mt-3 text-xl font-bold text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function ResultList({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-slate-900">
        {title}
      </h3>

      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-xs leading-5 text-slate-600"
          >
            <CheckCircle2
              size={15}
              className="mt-0.5 shrink-0 text-emerald-600"
            />
            {typeof item === "string"
              ? item
              : item.description || item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
