import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, GraduationCap, LoaderCircle, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { isConfigured, configurationError, loading, session, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (authError) {
      setError(authError.message || "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
            <GraduationCap size={26} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">
              SkillBridge <span className="text-blue-600">AI</span>
            </p>
            <p className="text-xs text-slate-500">Student account sign in</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <Sparkles size={14} /> Welcome back
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your saved profile and career workspace.
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {configurationError
              ? `Supabase configuration issue: ${configurationError}`
              : <>Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{" "}
                  <code>VITE_SUPABASE_ANON_KEY</code> in the frontend environment to enable account sign-in.</>}
            Local workspace mode remains available.
            <Link to="/" className="mt-2 block font-semibold underline">
              Continue in local mode
            </Link>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-5 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!isConfigured || loading || submitting}
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!isConfigured || loading || submitting}
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
            />
          </div>
          <button
            type="submit"
            disabled={!isConfigured || loading || submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <LoaderCircle size={17} className="animate-spin" />}
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to SkillBridge AI?{" "}
          <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-800">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}