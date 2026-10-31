import { supabase } from "./supabase";

function assertAuthenticatedUser(userId) {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!userId) throw new Error("Sign in to view your notifications.");
}

export async function fetchStudentNotifications(userId) {
  assertAuthenticatedUser(userId);
  const [recordsResult, unreadResult] = await Promise.all([
    supabase
      .from("student_notifications")
      .select("id,title,message,category,metadata,created_at,read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("student_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);
  if (recordsResult.error) throw recordsResult.error;
  if (unreadResult.error) throw unreadResult.error;
  return { notifications: recordsResult.data || [], unreadCount: unreadResult.count || 0 };
}

export async function markStudentNotificationRead(userId, notificationId) {
  assertAuthenticatedUser(userId);
  const { data, error } = await supabase
    .from("student_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id,read_at")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function markAllStudentNotificationsRead(userId) {
  assertAuthenticatedUser(userId);
  const { data, error } = await supabase
    .from("student_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id");
  if (error) throw error;
  return data || [];
}
