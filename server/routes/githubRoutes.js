import express from "express";
import { auditRepository } from "../controllers/auditController.js";

const router = express.Router();

router.post("/audit", auditRepository);

export default router;