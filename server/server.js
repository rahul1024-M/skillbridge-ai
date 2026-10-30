import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import githubRoutes from "./routes/githubRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
}));

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SkillBridge AI Backend is running!",
  });
});

app.use("/api/github", githubRoutes);

app.listen(PORT, () => {
  console.log(`SkillBridge AI server running at http://localhost:${PORT}`);
});