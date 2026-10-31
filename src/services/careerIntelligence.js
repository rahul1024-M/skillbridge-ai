import { supabase } from "./supabase";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

async function request(path, { method = "GET", token, body, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}.`);
  }
  return payload;
}

export function generateCareerPlan(token, signal) {
  return request("/api/ai/career-plan", {
    method: "POST",
    token,
    signal,
  });
}

export function generateHackathonExplanation(token, hackathonId, signal) {
  return request("/api/ai/hackathon-explanation", {
    method: "POST",
    token,
    body: { hackathonId },
    signal,
  });
}

export function fetchHackathons(filters = {}, signal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const query = params.size ? `?${params.toString()}` : "";
  return request(`/api/hackathons${query}`, { signal });
}

function internshipQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.size ? `?${params.toString()}` : "";
}

export function fetchLiveInternships(signal, filters = {}) {
  return request(`/api/opportunities/internships${internshipQuery(filters)}`, { signal });
}

export function refreshLiveInternships(filters = {}, signal) {
  return request(`/api/opportunities/internships/refresh${internshipQuery(filters)}`, {
    method: "POST",
    signal,
  });
}

export function explainInternshipMatch(token, internshipId, signal) {
  return request("/api/ai/internship-explanation", {
    method: "POST",
    token,
    body: { internshipId },
    signal,
  });
}

export async function saveCareerAnalysis(userId, plan) {
  if (!supabase) throw new Error("Career plan storage requires Supabase configuration.");
  const { error } = await supabase
    .from("student_career_analyses")
    .insert({ user_id: userId, plan });
  if (error) throw error;
}
