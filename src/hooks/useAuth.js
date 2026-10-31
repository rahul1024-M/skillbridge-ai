import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigurationError,
} from "../services/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
        setError("");
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(sessionError.message);
        } else {
          setSession(data.session);
        }
        setLoading(false);
      })
      .catch((sessionError) => {
        if (!active) return;
        setError(sessionError.message || "Unable to restore your session.");
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      error,
      configurationError: supabaseConfigurationError,
      isConfigured: isSupabaseConfigured,
      signIn: async (email, password) => {
        if (!supabase) throw new Error("Supabase authentication is not configured.");
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        return data;
      },
      signUp: async (email, password, fullName) => {
        if (!supabase) throw new Error("Supabase authentication is not configured.");
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (authError) throw authError;
        return data;
      },
      resendSignupConfirmation: async (email) => {
        if (!supabase) throw new Error("Supabase authentication is not configured.");
        const { data, error: authError } = await supabase.auth.resend({
          type: "signup",
          email,
        });
        if (authError) throw authError;
        return data;
      },
      signOut: async () => {
        if (!supabase) throw new Error("Supabase authentication is not configured.");
        const { error: authError } = await supabase.auth.signOut();
        if (authError) throw authError;
      },
    }),
    [error, loading, session]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}