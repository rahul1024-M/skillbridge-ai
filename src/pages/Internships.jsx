
import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Search,
  Sparkles,
  MapPin,
  Clock,
  IndianRupee,
  Bookmark,
  CheckCircle2,
  ArrowUpRight,
  X,
  Building2,
  GraduationCap,
  Filter,
} from "lucide-react";

const internshipData = [
  {
    id: 1,
    role: "Frontend Developer Intern",
    company: "TechNova Solutions",
    location: "Remote",
    type: "Remote",
    stipend: "₹8,000–₹12,000/month",
    duration: "3 months",
    category: "Web Development",
    level: "Beginner",
    paid: true,
    skills: ["HTML", "CSS", "JavaScript", "React"],
    description: "Work on responsive interfaces and interactive web applications with an experienced development team.",
    requirements: ["HTML and CSS fundamentals", "Basic JavaScript", "Interest in React"],
  },
  {
    id: 2,
    role: "Python Developer Intern",
    company: "CodeCraft Labs",
    location: "Bengaluru, Karnataka",
    type: "On-site",
    stipend: "₹10,000–₹15,000/month",
    duration: "4 months",
    category: "Software Development",
    level: "Intermediate",
    paid: true,
    skills: ["Python", "Django", "SQL", "Git"],
    description: "Contribute to backend development, API integration and database-driven applications.",
    requirements: ["Python fundamentals", "Basic SQL knowledge", "Problem-solving skills"],
  },
  {
    id: 3,
    role: "AI / ML Research Intern",
    company: "InnovateAI",
    location: "Remote",
    type: "Remote",
    stipend: "Unpaid",
    duration: "2 months",
    category: "Artificial Intelligence",
    level: "Advanced",
    paid: false,
    skills: ["Python", "Machine Learning", "NumPy", "Pandas"],
    description: "Explore machine learning workflows and assist with experimental AI projects.",
    requirements: ["Python programming", "Basic statistics", "Interest in machine learning"],
  },
  {
    id: 4,
    role: "Full Stack Developer Intern",
    company: "WebSphere Technologies",
    location: "Hyderabad, Telangana",
    type: "Hybrid",
    stipend: "₹12,000–₹18,000/month",
    duration: "6 months",
    category: "Full Stack",
    level: "Intermediate",
    paid: true,
    skills: ["React", "Node.js", "Express", "MongoDB"],
    description: "Build and maintain full-stack web applications and work with REST APIs.",
    requirements: ["JavaScript knowledge", "Frontend fundamentals", "Basic database concepts"],
  },
  {
    id: 5,
    role: "Java Developer Intern",
    company: "NextGen Systems",
    location: "Remote",
    type: "Remote",
    stipend: "₹7,000–₹10,000/month",
    duration: "3 months",
    category: "Software Development",
    level: "Beginner",
    paid: true,
    skills: ["Java", "OOP", "SQL", "Data Structures"],
    description: "Learn enterprise application development and contribute to Java-based projects.",
    requirements: ["Core Java fundamentals", "Object-oriented programming", "Basic SQL"],
  },
  {
    id: 6,
    role: "UI/UX Design Intern",
    company: "PixelWorks Studio",
    location: "Pune, Maharashtra",
    type: "Hybrid",
    stipend: "₹6,000–₹9,000/month",
    duration: "3 months",
    category: "Design",
    level: "Beginner",
    paid: true,
    skills: ["Figma", "Wireframing", "Prototyping", "UI Design"],
    description: "Assist in creating user-friendly interfaces, wireframes and interactive prototypes.",
    requirements: ["Design fundamentals", "Figma basics", "Creative problem solving"],
  },
];

const initialFilters = {
  type: "All",
  payment: "All",
  level: "All",
};

export default function Internships() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [saved, setSaved] = useState([]);
  const [applied, setApplied] = useState([]);
  const [selected, setSelected] = useState(null);

  const filteredInternships = useMemo(() => {
    return internshipData.filter((item) => {
      const query = search.toLowerCase();

      const matchesSearch = [
        item.role,
        item.company,
        item.category,
        item.location,
        ...item.skills,
      ].join(" ").toLowerCase().includes(query);

      const matchesType =
        filters.type === "All" || item.type === filters.type;

      const matchesPayment =
        filters.payment === "All" ||
        (filters.payment === "Paid" && item.paid) ||
        (filters.payment === "Unpaid" && !item.paid);

      const matchesLevel =
        filters.level === "All" || item.level === filters.level;

      return matchesSearch && matchesType && matchesPayment && matchesLevel;
    });
  }, [search, filters]);

  const updateFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const toggleSaved = (id) => {
    setSaved((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const toggleApplied = (id) => {
    setApplied((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            <Sparkles size={14} /> Career Opportunities
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Internship Explorer
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Discover opportunities, explore company requirements and find internships that help you gain practical industry experience.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          <BriefcaseBusiness size={18} /> Opportunity Hub
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={BriefcaseBusiness} label="Opportunities" value={internshipData.length} />
        <Stat icon={Bookmark} label="Saved Internships" value={saved.length} />
        <Stat icon={CheckCircle2} label="Tracked Applications" value={applied.length} />
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
              <Sparkles size={15} /> YOUR NEXT CAREER OPPORTUNITY
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">
              Turn your learning into experience.
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Explore roles, understand eligibility requirements and prepare your skills for real-world opportunities.
            </p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <GraduationCap size={40} className="text-blue-200" />
          </div>
        </div>
      </div>

      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Find Your Internship</h2>
          <p className="mt-1 text-xs text-slate-500">
            Search and filter opportunities based on your preferences.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job title, company, skills or location..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter size={15} /> Filters
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <FilterSelect
              label="Work mode"
              value={filters.type}
              onChange={(value) => updateFilter("type", value)}
              options={["All", "Remote", "On-site", "Hybrid"]}
            />
            <FilterSelect
              label="Compensation"
              value={filters.payment}
              onChange={(value) => updateFilter("payment", value)}
              options={["All", "Paid", "Unpaid"]}
            />
            <FilterSelect
              label="Experience level"
              value={filters.level}
              onChange={(value) => updateFilter("level", value)}
              options={["All", "Beginner", "Intermediate", "Advanced"]}
            />
          </div>

          <button
            onClick={() => {
              setSearch("");
              setFilters(initialFilters);
            }}
            className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Reset all filters
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Available Opportunities</h3>
          <span className="text-xs text-slate-400">{filteredInternships.length} results</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {filteredInternships.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Building2 size={23} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">{item.role}</h3>
                    <p className="mt-1 text-xs text-slate-500">{item.company}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSaved(item.id)}
                  title="Save internship"
                  className={`rounded-xl border p-2.5 transition ${
                    saved.includes(item.id)
                      ? "border-blue-200 bg-blue-50 text-blue-600"
                      : "border-slate-200 text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <Bookmark size={17} fill={saved.includes(item.id) ? "currentColor" : "none"} />
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Tag>{item.level}</Tag>
                <Tag>{item.type}</Tag>
                <Tag>{item.category}</Tag>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                {item.description}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Info icon={MapPin} label="Location" value={item.location} />
                <Info icon={Clock} label="Duration" value={item.duration} />
                <Info icon={IndianRupee} label="Stipend" value={item.stipend} />
                <Info icon={GraduationCap} label="Experience" value={item.level} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {item.skills.map((skill) => (
                  <span key={skill} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-medium text-slate-600">
                    {skill}
                  </span>
                ))}
              </div>

              {applied.includes(item.id) && (
                <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 size={15} /> Application marked as tracked
                </p>
              )}

              <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setSelected(item)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View Details <ArrowUpRight size={14} />
                </button>
                <button
                  onClick={() => toggleApplied(item.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  {applied.includes(item.id) ? "Untrack" : "Track Application"}
                </button>
              </div>
            </article>
          ))}
        </div>

        {filteredInternships.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Search size={30} className="mx-auto text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-800">No matching internships</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <Sparkles className="mt-0.5 shrink-0 text-amber-600" size={20} />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Internship data disclaimer</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            These are sample opportunities created for the SkillBridge AI demonstration. They are not verified live vacancies. Company names, compensation and requirements are illustrative. Verify an opportunity on the employer's official website before applying.
          </p>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  {selected.category}
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">{selected.role}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.company}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">{selected.description}</p>

            <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Eligibility and requirements</h3>
            <ul className="mt-3 space-y-3">
              {selected.requirements.map((requirement) => (
                <li key={requirement} className="flex gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  {requirement}
                </li>
              ))}
            </ul>

            <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Required skills</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.skills.map((skill) => (
                <Tag key={skill}>{skill}</Tag>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <Info icon={MapPin} label="Location" value={selected.location} />
              <div className="mt-3">
                <Info icon={Clock} label="Duration" value={selected.duration} />
              </div>
              <div className="mt-3">
                <Info icon={IndianRupee} label="Stipend" value={selected.stipend} />
              </div>
            </div>

            <button
              onClick={() => {
                toggleApplied(selected.id);
                setSelected(null);
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {applied.includes(selected.id) ? "Remove Application Tracking" : "Track This Application"}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="rounded-xl bg-blue-50 p-3 text-blue-600 w-fit">
        <Icon size={20} />
      </div>
      <p className="mt-5 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">
      {children}
    </span>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon size={15} className="mt-0.5 shrink-0 text-blue-600" />
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-xs font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
