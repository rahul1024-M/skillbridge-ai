import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import githubRoutes from "./routes/githubRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import opportunityRoutes from "./routes/opportunityRoutes.js";
import hackathonRoutes from "./routes/hackathonRoutes.js";
import { startHackathonFeedRefresh } from "./services/hackathonService.js";

dotenv.config({
  path: fileURLToPath(new URL("./.env", import.meta.url)),
});

const app = express();
const PORT = process.env.PORT || 5000;

// Allow all local Vite development ports
const allowedOrigins = (
  process.env.FRONTEND_ORIGINS ||
  "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without origin (Postman, server-to-server, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost and 127.0.0.1 on any port
      const isLocalhost =
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

      if (isLocalhost) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SkillBridge AI Backend is running!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    services: {
      supabase: Boolean(
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_ANON_KEY
      ),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      githubToken: Boolean(process.env.GITHUB_TOKEN),
    },
  });
});

// Routes
app.use("/api/github", githubRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/hackathons", hackathonRoutes);

// Start background hackathon refresh
startHackathonFeedRefresh();

app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request payload is too large.",
    });
  }

  console.error(
    "Unhandled API error:",
    error?.message || error
  );

  return res.status(500).json({
    message: error?.message || "An unexpected server error occurred.",
  });
});

app.listen(PORT, () => {
  console.log(`SkillBridge AI server running at http://localhost:${PORT}`);
});