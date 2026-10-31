import { supabase } from "./supabase";

function assertClient() {
  if (!supabase) throw new Error("Roadmap cloud storage requires Supabase configuration.");
}

export async function fetchActiveRoadmap(userId) {
  assertClient();
  const { data: roadmap, error: roadmapError } = await supabase
    .from("learning_roadmaps")
    .select("id,title,target_role,status,created_at,updated_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (roadmapError) throw roadmapError;
  if (!roadmap) return null;

  const { data: items, error: itemError } = await supabase
    .from("roadmap_items")
    .select("id,title,description,resources,assignment,estimated_minutes,position,status,completed_at,stage,skill,topics,project_milestones")
    .eq("user_id", userId)
    .eq("roadmap_id", roadmap.id)
    .order("position", { ascending: true });
  if (itemError) throw itemError;
  return { ...roadmap, items: items || [] };
}

export async function replaceActiveRoadmap({ title, targetRole, sourceProfile, items, plan }) {
  assertClient();
  const { data: id, error } = await supabase.rpc("replace_student_roadmap", {
    p_title: title,
    p_target_role: targetRole,
    p_source_profile: sourceProfile,
    p_career_plan: plan,
    p_items: items.map((item, index) => ({
      title: item.skill,
      skill: item.skill,
      stage: item.stage,
      description: item.objectives.join("\n"),
      resources: item.resources,
      assignment: item.assignment,
      estimated_minutes: item.estimatedWeeks * 5 * 60,
      position: index,
      topics: item.topics,
      project_milestones: item.milestones,
    })),
  });
  if (error) throw error;
  return id;
}

export async function updateRoadmapItemStatus(itemId, status) {
  assertClient();
  const { data, error } = await supabase.rpc("set_roadmap_item_status", {
    p_item_id: itemId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}
