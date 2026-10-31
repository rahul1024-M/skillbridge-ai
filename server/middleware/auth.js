const authTimeoutMs = 8000;

export async function requireStudentAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const tokenMatch = authorization.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({
      message: "Student-specific services require Supabase configuration.",
    });
  }

  if (!tokenMatch) {
    return res.status(401).json({ message: "A valid student session is required." });
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${tokenMatch[1]}`,
      },
      signal: AbortSignal.timeout(authTimeoutMs),
    });

    if (!response.ok) {
      return res.status(401).json({ message: "Your session is invalid or expired." });
    }

    const user = await response.json();
    if (typeof user.id !== "string") {
      return res.status(401).json({ message: "Your session is invalid or expired." });
    }

    req.student = { id: user.id, accessToken: tokenMatch[1] };
    return next();
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(503).json({ message: "Authentication service timed out." });
    }
    return next(error);
  }
}
