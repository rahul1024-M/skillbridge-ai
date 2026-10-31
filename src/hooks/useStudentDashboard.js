import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { fetchStudentProfile } from "../services/profileRepository";
import { fetchLiveInternships } from "../services/careerIntelligence";
import { supabase } from "../services/supabase";

const STORAGE_KEY = "skillbridge_student_profile";

function readLocalProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch (error) {
    console.error("Unable to read local dashboard profile:", error);
    return null;
  }
}

async function queryOwned(table, userId, columns, orderColumn = "created_at") {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("user_id", userId)
    .order(orderColumn, { ascending: false })
    .limit(30);
  if (error) throw error;
  return data || [];
}

async function queryInternshipTracking(userId) {
  const { data, error } = await supabase
    .from("student_internship_tracking")
    .select("id,listing_snapshot,is_saved,application_status,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error?.code === "42P01" || error?.code === "PGRST205") {
    console.warn("Internship tracking is unavailable until its Supabase migration is applied.");
    return [];
  }
  if (error) throw error;
  return data || [];
}

export function useStudentDashboard() {
  const { isConfigured, user } = useAuth();
  const [data, setData] = useState({
    profile: null,
    roadmaps: [],
    roadmapItems: [],
    activities: [],
    audits: [],
    submissions: [],
    opportunities: [],
    learningPlan: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const [opportunityError, setOpportunityError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    const handleProfileUpdate = () => refresh();
    window.addEventListener("studentProfileUpdated", handleProfileUpdate);
    window.addEventListener("studentProgressUpdated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("studentProfileUpdated", handleProfileUpdate);
      window.removeEventListener("studentProgressUpdated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController();
    setOpportunityError("");
    fetchLiveInternships(controller.signal)
      .then((response) => setOpportunities(response.internships || []))
      .catch((loadError) => {
        if (loadError.name !== "AbortError") {
          setOpportunities([]);
          setOpportunityError(loadError.message || "Verified internship listings are unavailable.");
        }
      });
    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    if (!isConfigured) {
      setData({
        profile: readLocalProfile(),
        roadmaps: [],
        roadmapItems: [],
        activities: [],
        audits: [],
        submissions: [],
        learningPlan: null,
      });
      setLoading(false);
      return () => { active = false; };
    }

    if (!user || !supabase) {
      setData({
        profile: null,
        roadmaps: [],
        roadmapItems: [],
        activities: [],
        audits: [],
        submissions: [],
        learningPlan: null,
      });
      setLoading(false);
      return () => { active = false; };
    }

    const load = async () => {
      const profilePromise = fetchStudentProfile(user);
      const [
        profile,
        roadmapsResult,
        activities,
        audits,
        submissions,
        projects,
        certifications,
        skills,
        learningPlanResult,
        internshipTracking,
      ] = await Promise.all([
        profilePromise,
        queryOwned("learning_roadmaps", user.id, "id,title,target_role,status,created_at,updated_at", "updated_at"),
        queryOwned("student_progress", user.id, "id,activity_type,description,metadata,occurred_at", "occurred_at"),
        queryOwned("proof_of_work_audits", user.id, "id,score,status,audited_at,repository_url", "audited_at"),
        queryOwned("proof_of_work_submissions", user.id, "id,status,submitted_at", "submitted_at"),
        queryOwned("projects", user.id, "id,title,status,created_at"),
        queryOwned("certifications", user.id, "id,name,created_at"),
        queryOwned("skills", user.id, "id,name,proficiency,created_at"),
        supabase.from("student_career_analyses")
          .select("id,plan,generated_at")
          .eq("user_id", user.id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        queryInternshipTracking(user.id),
      ]);
      if (learningPlanResult.error) throw learningPlanResult.error;
      const activeRoadmap = roadmapsResult.find((roadmap) => roadmap.status === "active");
      let roadmapItems = [];
      if (activeRoadmap) {
        const { data: items, error: itemsError } = await supabase
          .from("roadmap_items")
          .select("id,title,skill,status,completed_at,position")
          .eq("user_id", user.id)
          .eq("roadmap_id", activeRoadmap.id)
          .order("position", { ascending: true });
        if (itemsError) throw itemsError;
        roadmapItems = items || [];
      }

      const derivedActivities = [
        ...activities.map((item) => ({
          id: item.id,
          title: item.description,
          occurredAt: item.occurred_at,
          kind: item.activity_type,
        })),
        ...audits.map((item) => ({
          id: `audit-${item.id}`,
          title: `Repository audit reviewed: ${item.repository_url}`,
          occurredAt: item.audited_at,
          kind: "repository_audit",
        })),
        ...projects.map((item) => ({
          id: `project-${item.id}`,
          title: `Project added: ${item.title}`,
          occurredAt: item.created_at,
          kind: "project",
        })),
        ...certifications.map((item) => ({
          id: `cert-${item.id}`,
          title: `Certification added: ${item.name}`,
          occurredAt: item.created_at,
          kind: "certification",
        })),
        ...skills.map((item) => ({
          id: `skill-${item.id}`,
          title: `Skill added: ${item.name}`,
          occurredAt: item.created_at,
          kind: "skill",
        })),
        ...internshipTracking.map((item) => ({
          id: `internship-${item.id}`,
          title: item.application_status
            ? `Internship ${item.application_status.toLowerCase()}: ${item.listing_snapshot?.title || "application"}`
            : `Internship saved: ${item.listing_snapshot?.title || "listing"}`,
          occurredAt: item.updated_at,
          kind: "internship",
        })),
      ].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 10);

      if (active) {
        setData({
          profile,
          roadmaps: roadmapsResult,
          roadmapItems,
          activities: derivedActivities,
          audits,
          submissions,
          learningPlan: learningPlanResult.data?.plan || null,
        });
      }
    };

    load()
      .catch((loadError) => {
        if (active) {
          console.error("Dashboard data load error:", loadError);
          setError(loadError.message || "Unable to load your dashboard data.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [isConfigured, user, refreshKey]);

  return { ...data, opportunities, opportunityError, loading, error, refresh };
}
