import { BookOpen, ExternalLink, GraduationCap, Info, Sparkles } from "lucide-react";

export const courseCatalogs = [
  {
    name: "freeCodeCamp Learn",
    description: "Official curriculum and interactive learning catalog. Course-level availability and requirements are shown by the provider.",
    url: "https://www.freecodecamp.org/learn/",
    source: "freeCodeCamp",
  },
  {
    name: "MDN Learn Web Development",
    description: "Web-development curriculum maintained by the MDN community, with beginner learning paths and modules.",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
    source: "MDN Web Docs",
  },
];

export default function Courses() {
  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      <header>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
          <Sparkles size={14} /> Continuous learning
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Course Explorer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Course catalogs from established learning providers. Individual course listings, pricing, and access details are not currently integrated or independently verified by SkillBridge AI.
        </p>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3 text-amber-900">
          <Info size={19} className="mt-0.5 shrink-0" />
          <p className="text-sm leading-6">
            No sample course titles, prices, ratings, or completion stats are shown as real offerings. Follow a provider link to review its current catalog.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {courseCatalogs.map((catalog) => (
          <article key={catalog.url} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-600"><BookOpen size={22} /></span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">{catalog.source}</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">{catalog.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{catalog.description}</p>
            <a href={catalog.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Open provider catalog <ExternalLink size={15} />
            </a>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <GraduationCap size={21} className="text-violet-600" />
          <h2 className="font-bold text-slate-900">Personalized course feed unavailable</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          A verified course catalog integration is not configured. Provider links above are catalogs, not claims that a particular course matches your profile.
        </p>
      </section>

      <p className="text-center text-[11px] text-slate-400">
        Catalog pages checked on October 31, 2026. Verify current course details directly with each provider.
      </p>
    </div>
  );
}
