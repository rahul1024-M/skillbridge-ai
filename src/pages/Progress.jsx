import { useMemo, useState } from "react";
import {
  TrendingUp,
  Target,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  BookOpen,
  Code2,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

const activities = [
  {
    title: "Completed JavaScript Fundamentals",
    category: "Course",
    date: "Today",
    status: "Completed",
    icon: BookOpen,
  },
  {
    title: "Submitted Portfolio Website",
    category: "Project",
    date: "Yesterday",
    status: "Reviewed",
    icon: Code2,
  },
  {
    title: "Completed Problem Solving Practice",
    category: "Skill",
    date: "2 days ago",
    status: "Completed",
    icon: Target,
  },
  {
    title: "Started React Development",
    category: "Course",
    date: "3 days ago",
    status: "In Progress",
    icon: BookOpen,
  },
];

const weeklyData = [
  { day: "Mon", hours: 2 },
  { day: "Tue", hours: 4 },
  { day: "Wed", hours: 3 },
  { day: "Thu", hours: 5 },
  { day: "Fri", hours: 2 },
  { day: "Sat", hours: 6 },
  { day: "Sun", hours: 3 },
];

export default function Progress() {
  const [filter, setFilter] = useState("All");

  const filteredActivities = useMemo(() => {
    if (filter === "All") return activities;
    return activities.filter((item) => item.category === filter);
  }, [filter]);

  const stats = [
    {
      title: "Learning Progress",
      value: "68%",
      detail: "+12% this month",
      icon: TrendingUp,
    },
    {
      title: "Skills Developed",
      value: "12",
      detail: "8 verified skills",
      icon: Target,
    },
    {
      title: "Projects Completed",
      value: "06",
      detail: "2 this month",
      icon: Award,
    },
    {
      title: "Learning Streak",
      value: "07 Days",
      detail: "Keep it going!",
      icon: Flame,
    },
  ];

  const maxHours = Math.max(...weeklyData.map((item) => item.hours));

  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        <div>
          <p className="text-sm font-semibold text-blue-600">
            PERFORMANCE TRACKER
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            My Progress
          </h1>
          <p className="mt-2 text-slate-500">
            Track your learning journey and celebrate your achievements.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{item.title}</p>
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Icon size={21} />
                  </div>
                </div>

                <h2 className="mt-5 text-3xl font-bold text-slate-900">
                  {item.value}
                </h2>

                <p className="mt-2 text-sm font-medium text-emerald-600">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>

        {/* Progress and weekly activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Overall Career Readiness
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your current development level
                </p>
              </div>
              <Target className="text-blue-600" size={24} />
            </div>

            <div className="mt-8 flex items-center gap-6">
              <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    "conic-gradient(#2563eb 0% 74%, #e2e8f0 74% 100%)",
                }}
              >
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white">
                  <span className="text-3xl font-bold text-slate-900">
                    74%
                  </span>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  Good Progress!
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Keep improving your technical skills and completing
                  practical projects to increase your career readiness.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Weekly Learning Activity
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Learning hours throughout the week
                </p>
              </div>
              <CalendarDays className="text-blue-600" size={23} />
            </div>

            <div className="mt-8 flex h-40 items-end justify-between gap-3">
              {weeklyData.map((item) => (
                <div
                  key={item.day}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {item.hours}h
                  </span>

                  <div className="flex h-28 w-full items-end overflow-hidden rounded-lg bg-slate-100">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-indigo-400"
                      style={{
                        height: `${(item.hours / maxHours) * 100}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs text-slate-500">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skill progress */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Skill Development
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Track your progress across different technical skills.
          </p>

          <div className="mt-7 space-y-6">
            {[
              { name: "Python", value: 85 },
              { name: "JavaScript", value: 75 },
              { name: "React", value: 60 },
              { name: "Data Structures", value: 55 },
              { name: "SQL", value: 70 },
            ].map((skill) => (
              <div key={skill.name}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    {skill.name}
                  </span>
                  <span className="font-semibold text-slate-600">
                    {skill.value}%
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500"
                    style={{ width: `${skill.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Recent Activities
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your latest learning achievements.
              </p>
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Activities</option>
              <option value="Course">Courses</option>
              <option value="Project">Projects</option>
              <option value="Skill">Skills</option>
            </select>
          </div>

          <div className="mt-6 space-y-4">
            {filteredActivities.map((activity) => {
              const Icon = activity.icon;

              return (
                <div
                  key={activity.title}
                  className="flex items-center gap-4 rounded-xl border border-slate-100 p-4"
                >
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Icon size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {activity.category} • {activity.date}
                    </p>
                  </div>

                  <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-block">
                    {activity.status}
                  </span>
                </div>
              );
            })}

            {filteredActivities.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                No activities found.
              </p>
            )}
          </div>
        </div>

        {/* Motivation */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold">
                Keep Building Your Future!
              </h2>
              <p className="mt-2 text-sm text-blue-100">
                Every skill you learn and every project you build brings
                you one step closer to your career goal.
              </p>
            </div>

            <div className="flex items-center gap-2 font-semibold">
              <Flame size={22} />
              Stay Consistent
              <ArrowUpRight size={18} />
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Demo progress data — connect your account to track actual activity.
        </p>

      </div>
    </div>
  );
}