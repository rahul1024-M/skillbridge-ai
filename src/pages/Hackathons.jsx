
import { useMemo, useState } from "react";
import {
  Trophy,
  Search,
  Sparkles,
  CalendarDays,
  MapPin,
  Users,
  IndianRupee,
  Bookmark,
  CheckCircle2,
  ArrowUpRight,
  X,
  Clock,
  Code2,
  Filter,
  Medal,
} from "lucide-react";

const hackathonData = [
  {
    id: 1,
    name: "National Innovation Challenge",
    organizer: "Innovation Foundation",
    mode: "Online",
    location: "Online",
    prize: "₹1,00,000",
    deadline: "2026-11-20",
    duration: "48 hours",
    teamSize: "2–4 members",
    level: "All Levels",
    category: "Innovation",
    description: "Develop innovative technology solutions to solve real-world problems.",
    skills: ["Problem Solving", "React", "Python", "AI"],
    eligibility: "Open to college students.",
  },
  {
    id: 2,
    name: "AI Buildathon 2026",
    organizer: "Tech Innovators",
    mode: "Online",
    location: "Online",
    prize: "₹75,000",
    deadline: "2026-11-25",
    duration: "36 hours",
    teamSize: "1–4 members",
    level: "Intermediate",
    category: "Artificial Intelligence",
    description: "Build AI-powered applications using modern artificial intelligence technologies.",
    skills: ["Python", "Machine Learning", "Gemini API"],
    eligibility: "Students and developers can participate.",
  },
  {
    id: 3,
    name: "Web Development Sprint",
    organizer: "Code Community",
    mode: "Offline",
    location: "Bengaluru, Karnataka",
    prize: "₹50,000",
    deadline: "2026-12-05",
    duration: "24 hours",
    teamSize: "2–3 members",
    level: "Beginner",
    category: "Web Development",
    description: "Design and develop a complete web application within the competition.",
    skills: ["HTML", "CSS", "JavaScript", "React"],
    eligibility: "Open to undergraduate students.",
  },
  {
    id: 4,
    name: "Cyber Security Challenge",
    organizer: "SecureTech Community",
    mode: "Online",
    location: "Online",
    prize: "₹60,000",
    deadline: "2026-12-12",
    duration: "48 hours",
    teamSize: "1–3 members",
    level: "Advanced",
    category: "Cyber Security",
    description: "Explore security challenges and develop practical cybersecurity solutions.",
    skills: ["Networking", "Python", "Cyber Security"],
    eligibility: "Students with basic cybersecurity knowledge.",
  },
  {
    id: 5,
    name: "Smart Campus Hackathon",
    organizer: "Student Innovation Network",
    mode: "Offline",
    location: "Mysuru, Karnataka",
    prize: "₹40,000",
    deadline: "2026-12-18",
    duration: "36 hours",
    teamSize: "2–5 members",
    level: "All Levels",
    category: "Social Innovation",
    description: "Build technology solutions that improve campus life and student experiences.",
    skills: ["IoT", "Web Development", "App Development"],
    eligibility: "Open to college students.",
  },
  {
    id: 6,
    name: "Future Tech Challenge",
    organizer: "FutureTech Community",
    mode: "Online",
    location: "Online",
    prize: "₹1,50,000",
    deadline: "2027-01-10",
    duration: "72 hours",
    teamSize: "2–4 members",
    level: "Intermediate",
    category: "Emerging Technology",
    description: "Create practical solutions using emerging technologies and modern software tools.",
    skills: ["AI", "Cloud", "Web Development"],
    eligibility: "Students and early-career developers.",
  },
];

const initialFilters = {
  mode: "All",
  level: "All",
  category: "All",
};

export default function Hackathons() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [saved, setSaved] = useState([]);
  const [joined, setJoined] = useState([]);
  const [selected, setSelected] = useState(null);

  const filteredHackathons = useMemo(() => {
    return hackathonData.filter((item) => {
      const query = search.toLowerCase();

      const matchesSearch = [
        item.name,
        item.organizer,
        item.category,
        item.location,
        ...item.skills,
      ].join(" ").toLowerCase().includes(query);

      return (
        matchesSearch &&
        (filters.mode === "All" || item.mode === filters.mode) &&
        (filters.level === "All" || item.level === filters.level) &&
        (filters.category === "All" || item.category === filters.category)
      );
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

  const toggleJoined = (id) => {
    setJoined((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const formatDate = (date) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const daysLeft = (date) =>
    Math.ceil(
      (new Date(`${date}T00:00:00`).getTime() -
        new Date(new Date().toDateString()).getTime()) /
        86400000
    );

  return (
    <div className="min-h-screen space-y-7 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            <Sparkles size={14} /> Innovation & Competition
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Hackathon Explorer
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Discover hackathons, explore innovation challenges and turn your ideas into working solutions.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          <Trophy size={18} /> Competition Hub
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Trophy} label="Available Hackathons" value={hackathonData.length} />
        <Stat icon={Bookmark} label="Saved Events" value={saved.length} />
        <Stat icon={CheckCircle2} label="Participation Tracked" value={joined.length} />
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
              <Sparkles size={15} /> BUILD · INNOVATE · COMPETE
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">
              Your next big idea starts here.
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Participate in challenges, collaborate with talented people and demonstrate your practical skills.
            </p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <Medal size={40} className="text-blue-200" />
          </div>
        </div>
      </div>

      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Explore Hackathons</h2>
          <p className="mt-1 text-xs text-slate-500">
            Find competitions that match your interests and skills.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hackathons, organizers, technologies..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter size={15} /> Filters
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <FilterSelect
              label="Event mode"
              value={filters.mode}
              onChange={(value) => updateFilter("mode", value)}
              options={["All", "Online", "Offline"]}
            />
            <FilterSelect
              label="Difficulty"
              value={filters.level}
              onChange={(value) => updateFilter("level", value)}
              options={["All", "Beginner", "Intermediate", "Advanced", "All Levels"]}
            />
            <FilterSelect
              label="Category"
              value={filters.category}
              onChange={(value) => updateFilter("category", value)}
              options={[
                "All",
                ...new Set(hackathonData.map((item) => item.category)),
              ]}
            />
          </div>

          <button
            onClick={() => {
              setSearch("");
              setFilters(initialFilters);
            }}
            className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Reset filters
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Upcoming Opportunities</h3>
          <span className="text-xs text-slate-400">{filteredHackathons.length} results</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {filteredHackathons.map((item) => {
            const remaining = daysLeft(item.deadline);

            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Trophy size={23} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{item.organizer}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSaved(item.id)}
                    title="Save hackathon"
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
                  <Tag>{item.mode}</Tag>
                  <Tag>{item.level}</Tag>
                  <Tag>{item.category}</Tag>
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">{item.description}</p>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Info icon={IndianRupee} label="Prize pool" value={item.prize} />
                  <Info icon={CalendarDays} label="Registration deadline" value={formatDate(item.deadline)} />
                  <Info icon={Clock} label="Event duration" value={item.duration} />
                  <Info icon={Users} label="Team size" value={item.teamSize} />
                  <Info icon={MapPin} label="Location" value={item.location} />
                  <Info icon={Code2} label="Difficulty" value={item.level} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {item.skills.map((skill) => (
                    <span key={skill} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-medium text-slate-600">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className={`text-xs font-semibold ${
                    remaining < 0 ? "text-slate-400" :
                    remaining <= 7 ? "text-red-500" : "text-emerald-600"
                  }`}>
                    {remaining < 0 ? "Deadline passed" : remaining === 0 ? "Deadline today" : `${remaining} days left`}
                  </span>

                  <button
                    onClick={() => setSelected(item)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    View Details <ArrowUpRight size={14} />
                  </button>
                </div>

                {joined.includes(item.id) && (
                  <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 size={15} /> Participation tracked
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {filteredHackathons.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Search size={30} className="mx-auto text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-800">No hackathons found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try another search or filter.
            </p>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <Sparkles className="mt-0.5 shrink-0 text-amber-600" size={20} />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Hackathon information disclaimer</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            These are sample hackathons created for demonstration. Organizers, prize pools, deadlines and eligibility are illustrative, not verified live events. Confirm all details on the official event website before registering.
          </p>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{selected.category}</p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">{selected.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.organizer}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">{selected.description}</p>

            <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Eligibility</h3>
            <p className="mt-2 text-sm text-slate-700">{selected.eligibility}</p>

            <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Required skills / technologies</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.skills.map((skill) => <Tag key={skill}>{skill}</Tag>)}
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <Info icon={IndianRupee} label="Prize pool" value={selected.prize} />
              <div className="mt-3">
                <Info icon={CalendarDays} label="Deadline" value={formatDate(selected.deadline)} />
              </div>
              <div className="mt-3">
                <Info icon={Users} label="Team size" value={selected.teamSize} />
              </div>
              <div className="mt-3">
                <Info icon={MapPin} label="Location" value={selected.location} />
              </div>
            </div>

            <button
              onClick={() => {
                toggleJoined(selected.id);
                setSelected(null);
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {joined.includes(selected.id) ? "Remove Participation Tracking" : "Track My Participation"}
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
      <div className="w-fit rounded-xl bg-blue-50 p-3 text-blue-600">
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
