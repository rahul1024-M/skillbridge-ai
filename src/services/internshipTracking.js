import { supabase } from "./supabase";

const TABLE = "student_internship_tracking";

function assertClient(userId) {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!userId) throw new Error("Sign in to save or track internships.");
}

export async function fetchInternshipTracking(userId) {
  assertClient(userId);
  const { data, error } = await supabase
    .from(TABLE)
    .select("id,source_name,external_id,application_url,listing_snapshot,is_saved,application_status,application_date,notes,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveInternshipTracking(userId, internship, tracking) {
  assertClient(userId);
  const existing = tracking || {};
  const isSaved = existing.is_saved === true;
  const applicationStatus = existing.application_status || null;

  if (!isSaved && !applicationStatus) {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("source_name", internship.source)
      .eq("external_id", internship.externalId);
    if (error) throw error;
    return null;
  }

  const row = {
    user_id: userId,
    source_name: internship.source,
    external_id: internship.externalId,
    application_url: internship.applicationUrl,
    listing_snapshot: {
      ...internship,
      description: String(internship.description || "").slice(0, 8000),
    },
    is_saved: isSaved,
    application_status: applicationStatus,
    application_date: existing.application_date || null,
    notes: String(existing.notes || "").trim().slice(0, 2000),
  };
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: "user_id,source_name,external_id" })
    .select("id,source_name,external_id,application_url,listing_snapshot,is_saved,application_status,application_date,notes,created_at,updated_at")
    .single();
  if (error) throw error;
  return data;
}

export function trackingKey(source, externalId) {
  return `${String(source || "").toLowerCase()}:${externalId}`;
}
