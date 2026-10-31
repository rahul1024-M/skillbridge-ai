import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const configurationIssues = [];
if (supabaseUrl && !supabaseAnonKey) {
  configurationIssues.push("VITE_SUPABASE_ANON_KEY is missing.");
}
if (supabaseAnonKey && !supabaseUrl) {
  configurationIssues.push("VITE_SUPABASE_URL is missing.");
}
if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
      configurationIssues.push("VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.");
    }
  } catch {
    configurationIssues.push("VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.");
  }
}

export const supabaseConfigurationError = configurationIssues.join(" ");
export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) && !supabaseConfigurationError;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const publicSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: "skillbridge-public-profile",
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;