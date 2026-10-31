import express from "express";
import {
  createCareerPlan,
  createHackathonExplanation,
  createInternshipExplanation,
} from "../controllers/aiController.js";
import { requireStudentAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.post(
  "/career-plan",
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  requireStudentAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    key: (req) => req.student?.id || req.ip,
  }),
  createCareerPlan
);

router.post(
  "/hackathon-explanation",
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  requireStudentAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 8,
    key: (req) => req.student?.id || req.ip,
  }),
  createHackathonExplanation
);

router.post(
  "/internship-explanation",
  rateLimit({ windowMs: 60 * 1000, max: 12 }),
  requireStudentAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 4,
    key: (req) => req.student?.id || req.ip,
  }),
  createInternshipExplanation
);

export default router;