import express from "express";
import { auditRepository } from "../controllers/auditController.js";
import { requireStudentAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.post(
  "/audit",
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  requireStudentAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    key: (req) => req.student?.id || req.ip,
  }),
  auditRepository
);

export default router;