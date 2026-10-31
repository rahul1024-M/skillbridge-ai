import { fetchStudentProfile } from "./profileRepository";
import { fetchLiveInternships, fetchHackathons } from "./careerIntelligence";
import { fetchInternshipTracking } from "./internshipTracking";
import { fetchActiveRoadmap } from "./roadmapRepository";
import { supabase } from "./supabase";
import { projectData } from "../pages/Projects";
import { courseCatalogs } from "../pages/Courses";
import { makeGlobalSearchEntry } from "../utils/globalSearch";

const MAX_SEARCH_PAGES = 20;

async function fetchAllLiveInternships() {
  const firstPage = await fetchLiveInternships(undefined, { page: 1 });
  const totalPages = Math.max(1, Number(firstPage.pagination?.totalPages) || 1);
  const pageCount = Math.min(totalPages, MAX_SEARCH_PAGES);
  const pageResults = await Promise.allSettled(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      fetchLiveInternships(undefined, {
        page: index + 2,
        perPage: firstPage.pagination?.perPage,
      })
    )
  );
  const failures = pageResults
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);
  if (totalPages > MAX_SEARCH_PAGES) {
    failures.push(new Error(`Global internship search limited to the first ${MAX_SEARCH_PAGES} pages.`));
  }
  return {
    internships: [
      ...(firstPage.internships || []),
      ...pageResults.flatMap((result) => result.status === "fulfilled" ? result.value.internships || [] : []),
    ],
    failures,
  };
}

function settledValue(result, fallback, onError) {
  if (result.status === "fulfilled") return result.value;
  onError(result.reason);
  return fallback;
}

export async function fetchGlobalSearchIndex(user) {
  const authenticated = Boolean(user?.id && supabase);
  const tasks = [
    fetchAllLiveInternships(),
    fetchHackathons({ status: "all", sort: "date" }),
    authenticated ? fetchStudentProfile(user) : Promise.resolve(null),
    authenticated ? fetchInternshipTracking(user.id) : Promise.resolve([]),
    authenticated ? fetchActiveRoadmap(user.id) : Promise.resolve(null),
    authenticated
      ? supabase.from("saved_hackathons")
      .select("hackathon_id,hackathons(name,organizer,description,location,technologies,registration_url,source_url)")
        .eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
  ];
  const settled = await Promise.allSettled(tasks);
  const failures = [];
  const internshipsResponse = settledValue(settled[0], null, (error) => failures.push(error));
  failures.push(...(internshipsResponse?.failures || []));
  const hackathonsResponse = settledValue(settled[1], null, (error) => failures.push(error));
  const profile = settledValue(settled[2], null, (error) => failures.push(error));
  const tracking = settledValue(settled[3], [], (error) => failures.push(error));
  const roadmap = settledValue(settled[4], null, (error) => failures.push(error));
  const savedHackathonsResult = settledValue(settled[5], { data: [], error: null }, (error) => failures.push(error));
  if (savedHackathonsResult.error) failures.push(savedHackathonsResult.error);

  const entries = [];
  for (const internship of internshipsResponse?.internships || []) {
    entries.push(makeGlobalSearchEntry({
      id: internship.id || internship.externalId || internship.applicationUrl,
      title: internship.title,
      category: "Internship",
      description: `${internship.company || "Company not listed"} · ${internship.location || internship.workMode || "Location not listed"}`,
      path: `/internships?search=${encodeURIComponent(internship.title || "")}`,
      searchText: [
        internship.company,
        internship.description,
        internship.location,
        internship.workMode,
        ...(internship.requiredSkills || []),
        ...(internship.sourceTags || []),
      ].join(" "),
    }));
  }

  const savedTracking = (tracking || []).filter((record) => record.is_saved && record.listing_snapshot);
  for (const record of savedTracking) {
    const listing = record.listing_snapshot;
    const title = listing.title || listing.name;
    if (!title) continue;
    entries.push(makeGlobalSearchEntry({
      id: `${record.source_name}:${record.external_id}`,
      title,
      category: "Saved internship",
      description: `${listing.company || "Company not listed"} · ${listing.location || listing.workMode || "Location not listed"}`,
      path: `/internships?view=saved&source=${encodeURIComponent(record.source_name)}&id=${encodeURIComponent(record.external_id)}`,
      searchText: [
        listing.description,
        listing.company,
        listing.location,
        listing.workMode,
        record.source_name,
        ...(Array.isArray(listing.requiredSkills) ? listing.requiredSkills : []),
        ...(Array.isArray(listing.skills) ? listing.skills : []),
        ...(Array.isArray(listing.technologies) ? listing.technologies : []),
      ].join(" "),
      saved: true,
    }));
  }

  for (const event of hackathonsResponse?.events || []) {
    entries.push(makeGlobalSearchEntry({
      id: event.id,
      title: event.name,
      category: "Hackathon",
      description: `${event.organizer || "Organizer not listed"} · ${event.location || event.mode || "Location not listed"}`,
      path: `/hackathons?search=${encodeURIComponent(event.name || "")}`,
      searchText: `${event.description || ""} ${event.location || ""} ${(event.technologies || []).join(" ")}`,
    }));
  }

  for (const row of savedHackathonsResult.data || []) {
    const event = row.hackathons;
    if (!event?.name) continue;
    entries.push(makeGlobalSearchEntry({
      id: row.hackathon_id,
      title: event.name,
      category: "Saved hackathon",
      description: `${event.organizer || "Organizer not listed"} · ${event.location || "Location not listed"}`,
      path: `/hackathons?search=${encodeURIComponent(event.name)}&id=${encodeURIComponent(row.hackathon_id)}`,
      searchText: `${event.organizer || ""} ${event.description || ""} ${event.location || ""} ${(event.technologies || []).join(" ")}`,
      saved: true,
    }));
  }

  for (const skill of profile?.skills || []) {
    entries.push(makeGlobalSearchEntry({
      id: skill.id || skill.name,
      title: skill.name,
      category: "Skill",
      description: `${skill.category || "Profile skill"} · ${skill.proficiency || "Proficiency not listed"}`,
      path: `/skills?skill=${encodeURIComponent(skill.name || "")}`,
    }));
  }

  for (const project of profile?.projects || []) {
    entries.push(makeGlobalSearchEntry({
      id: project.id || project.title,
      title: project.title,
      category: "Project",
      description: project.description || (project.technologies || []).join(", "),
      path: `/profile?project=${encodeURIComponent(project.id || "")}`,
      searchText: `${(project.technologies || []).join(" ")} ${project.contribution || ""}`,
    }));
  }

  for (const project of projectData) {
    entries.push(makeGlobalSearchEntry({
      id: project.id,
      title: project.title,
      category: "Project",
      description: project.description,
      path: `/projects?search=${encodeURIComponent(project.title)}`,
      searchText: `${project.category} ${project.level} ${project.technologies.join(" ")} ${project.skills.join(" ")}`,
    }));
  }

  for (const course of courseCatalogs) {
    entries.push(makeGlobalSearchEntry({
      id: course.url,
      title: course.name,
      category: "Course catalog",
      description: course.description,
      path: "/courses",
      externalUrl: course.url,
      searchText: course.source,
    }));
  }

  for (const item of roadmap?.items || []) {
    entries.push(makeGlobalSearchEntry({
      id: item.id,
      title: item.skill || item.title,
      category: "Learning Roadmap",
      description: item.description || item.stage || "Task in your active learning roadmap.",
      path: `/roadmap?task=${encodeURIComponent(item.id)}`,
      searchText: `${item.stage || ""} ${(item.topics || []).join(" ")}`,
    }));
  }

  return { entries, failures };
}
