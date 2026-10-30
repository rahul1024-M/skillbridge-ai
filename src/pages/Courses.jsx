
import { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  Sparkles,
  Clock,
  Bookmark,
  CheckCircle2,
  ArrowUpRight,
  X,
  GraduationCap,
  Star,
  PlayCircle,
  Filter,
  Code2,
} from "lucide-react";

const courseData = [
  {
    id: 1,
    title: "Python Programming for Beginners",
    provider: "SkillBridge Learning",
    category: "Programming",
    level: "Beginner",
    duration: "6 weeks",
    price: "Free",
    rating: "4.8",
    description: "Learn Python fundamentals, variables, loops, functions and object-oriented programming.",
    skills: ["Python", "Problem Solving", "OOP"],
    lessons: 32,
  },
  {
    id: 2,
    title: "Data Structures and Algorithms",
    provider: "Code Academy",
    category: "Computer Science",
    level: "Intermediate",
    duration: "8 weeks",
    price: "Paid",
    rating: "4.9",
    description: "Master essential data structures, algorithms, searching, sorting and problem-solving techniques.",
    skills: ["DSA", "Java", "Algorithms"],
    lessons: 48,
  },
  {
    id: 3,
    title: "Complete Web Development",
    provider: "Web Learning Hub",
    category: "Web Development",
    level: "Beginner",
    duration: "10 weeks",
    price: "Free",
    rating: "4.7",
    description: "Learn HTML, CSS and JavaScript to create responsive and interactive websites.",
    skills: ["HTML", "CSS", "JavaScript"],
    lessons: 56,
  },
  {
    id: 4,
    title: "React.js Advanced Development",
    provider: "Frontend Masters",
    category: "Web Development",
    level: "Advanced",
    duration: "5 weeks",
    price: "Paid",
    rating: "4.9",
    description: "Build scalable frontend applications using React hooks, routing, state management and APIs.",
    skills: ["React", "JavaScript", "Frontend"],
    lessons: 38,
  },
  {
    id: 5,
    title: "SQL and Database Management",
    provider: "Data Skills Academy",
    category: "Database",
    level: "Beginner",
    duration: "4 weeks",
    price: "Free",
    rating: "4.6",
    description: "Understand relational databases, SQL queries, joins and database design.",
    skills: ["SQL", "Database", "MySQL"],
    lessons: 28,
  },
  {
    id: 6,
    title: "Introduction to Artificial Intelligence",
    provider: "AI Learning Center",
    category: "Artificial Intelligence",
    level: "Intermediate",
    duration: "7 weeks",
    price: "Paid",
    rating: "4.8",
    description: "Explore artificial intelligence, machine learning fundamentals and practical AI applications.",
    skills: ["AI", "Python", "Machine Learning"],
    lessons: 42,
  },
];

const initialFilters = {
  level: "All",
  price: "All",
  category: "All",
};

export default function Courses() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [saved, setSaved] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selected, setSelected] = useState(null);

  const filteredCourses = useMemo(() => {
    return courseData.filter((course) => {
      const query = search.toLowerCase();

      const matchesSearch = [
        course.title,
        course.provider,
        course.category,
        ...course.skills,
      ].join(" ").toLowerCase().includes(query);

      return (
        matchesSearch &&
        (filters.level === "All" || course.level === filters.level) &&
        (filters.price === "All" || course.price === filters.price) &&
        (filters.category === "All" || course.category === filters.category)
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

  const toggleEnrollment = (id) => {
    setEnrolled((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );

    setCompleted((previous) => previous.filter((item) => item !== id));
  };

  const toggleCompleted = (id) => {
    setCompleted((previous) =>
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
            <Sparkles size={14} /> Continuous Learning
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Course Explorer
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Discover courses, learn in-demand technologies and develop skills that support your career goals.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          <GraduationCap size={18} /> Learning Hub
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpen} label="Available Courses" value={courseData.length} />
        <Stat icon={PlayCircle} label="Enrolled Courses" value={enrolled.length} />
        <Stat icon={Bookmark} label="Saved Courses" value={saved.length} />
        <Stat icon={CheckCircle2} label="Completed Courses" value={completed.length} />
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
              <Sparkles size={15} /> YOUR PERSONAL LEARNING SPACE
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">
              Learn today. Build your future.
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Explore technical courses, strengthen your knowledge and turn learning into practical skills.
            </p>
          </div>

          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <GraduationCap size={40} className="text-blue-200" />
          </div>
        </div>
      </div>

      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Explore Courses</h2>
          <p className="mt-1 text-xs text-slate-500">
            Find courses that match your interests and experience.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses, technologies or providers..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter size={15} /> Filters
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <FilterSelect
              label="Difficulty"
              value={filters.level}
              onChange={(value) => updateFilter("level", value)}
              options={["All", "Beginner", "Intermediate", "Advanced"]}
            />
            <FilterSelect
              label="Course type"
              value={filters.price}
              onChange={(value) => updateFilter("price", value)}
              options={["All", "Free", "Paid"]}
            />
            <FilterSelect
              label="Category"
              value={filters.category}
              onChange={(value) => updateFilter("category", value)}
              options={[
                "All",
                ...new Set(courseData.map((course) => course.category)),
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
          <h3 className="text-sm font-bold text-slate-800">Recommended Learning</h3>
          <span className="text-xs text-slate-400">{filteredCourses.length} results</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <article key={course.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BookOpen size={23} />
                </div>

                <button
                  onClick={() => toggleSaved(course.id)}
                  title="Save course"
                  className={`rounded-xl border p-2.5 transition ${
                    saved.includes(course.id)
                      ? "border-blue-200 bg-blue-50 text-blue-600"
                      : "border-slate-200 text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <Bookmark size={17} fill={saved.includes(course.id) ? "currentColor" : "none"} />
                </button>
              </div>

              <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                {course.category}
              </p>

              <h3 className="mt-2 text-base font-bold text-slate-900">{course.title}</h3>
              <p className="mt-1 text-xs text-slate-400">By {course.provider}</p>

              <p className="mt-3 min-h-[60px] text-xs leading-5 text-slate-500">
                {course.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Tag>{course.level}</Tag>
                <Tag>{course.price}</Tag>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock size={14} /> {course.duration}</span>
                <span className="flex items-center gap-1"><BookOpen size={14} /> {course.lessons} lessons</span>
              </div>

              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-amber-500">
                <Star size={14} fill="currentColor" /> {course.rating}
                <span className="font-normal text-slate-400">Demo rating</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {course.skills.map((skill) => (
                  <span key={skill} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-medium text-slate-600">
                    {skill}
                  </span>
                ))}
              </div>

              {enrolled.includes(course.id) && (
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 size={15} />
                  {completed.includes(course.id) ? "Course completed" : "Currently enrolled"}
                </div>
              )}

              <button
                onClick={() => setSelected(course)}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white transition hover:bg-blue-700 mt-5"
              >
                View Course <ArrowUpRight size={14} />
              </button>
            </article>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Search size={30} className="mx-auto text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-800">No courses found</h3>
            <p className="mt-1 text-sm text-slate-500">Try another search or filter.</p>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <Sparkles size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Course information</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            These are sample course listings for the SkillBridge AI demonstration. Providers, prices, ratings, durations and lesson counts are illustrative, not verified live offerings.
          </p>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{selected.category}</p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">{selected.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.provider}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">{selected.description}</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Info icon={Clock} label="Duration" value={selected.duration} />
              <Info icon={BookOpen} label="Lessons" value={selected.lessons} />
              <Info icon={Star} label="Demo rating" value={selected.rating} />
              <Info icon={GraduationCap} label="Level" value={selected.level} />
            </div>

            <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Skills covered</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.skills.map((skill) => <Tag key={skill}>{skill}</Tag>)}
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Course access</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{selected.price}</p>
              <p className="mt-1 text-xs text-slate-500">
                This is a demo course listing. No external enrollment is connected yet.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => toggleSaved(selected.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Bookmark size={15} /> {saved.includes(selected.id) ? "Saved" : "Save"}
              </button>

              <button
                onClick={() => {
                  if (enrolled.includes(selected.id)) {
                    toggleCompleted(selected.id);
                  } else {
                    toggleEnrollment(selected.id);
                  }
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {enrolled.includes(selected.id)
                  ? completed.includes(selected.id) ? "Completed" : "Mark Completed"
                  : "Start Learning"}
                <ArrowUpRight size={15} />
              </button>
            </div>

            {enrolled.includes(selected.id) && !completed.includes(selected.id) && (
              <button
                onClick={() => toggleEnrollment(selected.id)}
                className="mt-3 w-full text-xs font-medium text-red-500 hover:text-red-700"
              >
                Cancel enrollment
              </button>
            )}
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
