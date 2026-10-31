import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, GraduationCap, LoaderCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const RESEND_COOLDOWN_SECONDS = 60;

function isEmailRateLimitError(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  return error?.status === 429 ||
    code.includes("email_rate_limit") ||
    code.includes("over_email_send_rate_limit") ||
    (/email/.test(message) && /rate limit|too many requests/.test(message)) ||
    /over_email_send_rate_limit/.test(message);
}

function emailRateLimitMessage() {
  return "Confirmation emails are temporarily rate-limited. Wait at least 60 seconds before requesting another email. We will not retry automatically; if the limit continues, wait a few minutes and try again.";
}

export default function Signup() {
  const {
    isConfigured,
    configurationError,
    loading,
    session,
    signUp,
    resendSignupConfirmation,
  } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(
      () => setResendCooldown((remaining) => Math.max(0, remaining - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  if (session) return <Navigate to="/" replace />;

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (pendingConfirmation) return;

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    const normalizedEmail = email.trim();
    try {
      const { session: newSession } = await signUp(normalizedEmail, password, name.trim());
      if (newSession) {
        navigate("/", { replace: true });
      } else {
        setPendingEmail(normalizedEmail);
        setPendingConfirmation(true);
        setPassword("");
        setConfirmation("");
        startResendCooldown();
        setMessage("If this address is awaiting confirmation, check your inbox for the verification link. Confirm your email before signing in.");
      }
    } catch (authError) {
      if (isEmailRateLimitError(authError)) {
        setPendingEmail(normalizedEmail);
        setPendingConfirmation(true);
        setPassword("");
        setConfirmation("");
        startResendCooldown();
        setError(emailRateLimitMessage());
      } else {
        setError(authError.message || "Unable to create your account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingEmail || resendCooldown > 0 || resending) return;
    setError("");
    setMessage("");
    setResending(true);

    try {
      await resendSignupConfirmation(pendingEmail);
      setMessage("If this address is awaiting confirmation, a new verification email has been requested. Check your inbox and spam folder.");
      startResendCooldown();
    } catch (resendError) {
      if (isEmailRateLimitError(resendError)) {
        setError(emailRateLimitMessage());
        startResendCooldown();
      } else {
        setError(resendError.message || "Unable to request a confirmation email. Please try again later.");
      }
    } finally {
      setResending(false);
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
            <p className="text-xs text-slate-500">Create a student account</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your profile will be private to your authenticated account.
        </p>

        {!isConfigured && (
          <div className="my-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {configurationError
              ? `Supabase configuration issue: ${configurationError}`
              : <>Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{" "}
                  <code>VITE_SUPABASE_ANON_KEY</code> before creating an account.</>}
          </div>
        )}
        {error && (
          <div role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="signup-name" className="mb-2 block text-sm font-semibold text-slate-700">
              Full name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              maxLength={120}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!isConfigured || loading || submitting || pendingConfirmation}
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!isConfigured || loading || submitting || pendingConfirmation}
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!isConfigured || loading || submitting || pendingConfirmation}
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="signup-confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">
              Confirm password
            </label>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={!isConfigured || loading || submitting || pendingConfirmation}
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
            />
          </div>
          <button
            type="submit"
            disabled={!isConfigured || loading || submitting || pendingConfirmation}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <LoaderCircle size={17} className="animate-spin" />}
            {submitting ? "Creating account..." : pendingConfirmation ? "Confirmation pending" : "Create account"}
          </button>
        </form>

        {pendingConfirmation && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm leading-6 text-blue-900">
              Confirmation email for <strong>{pendingEmail}</strong>
            </p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={!isConfigured || resending || resendCooldown > 0}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending && <LoaderCircle size={16} className="animate-spin" />}
              {resending
                ? "Requesting email..."
                : resendCooldown > 0
                  ? `Resend available in ${resendCooldown}s`
                  : "Resend confirmation email"}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-800">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}