import express from "express";
import { searchLiveInternships } from "../services/opportunityService.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();
const readLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  key: (req) => `internship-read:${req.ip}`,
});
const refreshLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  key: (req) => `internship-refresh:${req.ip}`,
});

async function sendInternships(req, res) {
  try {
    const result = await searchLiveInternships({
      search: req.query.search,
      location: req.query.location,
      country: req.query.country,
      domain: req.query.domain,
      workMode: req.query.workMode,
      paidStatus: req.query.paidStatus,
      duration: req.query.duration,
      experience: req.query.experience,
      sort: req.query.sort,
      page: req.query.page,
      perPage: req.query.perPage,
      refresh: req.method === "POST",
    });
    res.set("Cache-Control", req.method === "POST" ? "no-store" : "public, max-age=60");
    return res.json(result);
  } catch (error) {
    const invalidFilter = error.message.startsWith("Invalid") ||
      error.message.startsWith("Expected an integer");
    if (invalidFilter) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Internship provider error:", error.message);
    return res.status(502).json({
      message: "All live internship sources are unavailable. No sample opportunities are substituted.",
      providers: Array.isArray(error.providers)
        ? error.providers
        : [
            { source: "Arbeitnow", status: "error", errors: [error.message] },
            { source: "Jobicy", status: "error", errors: [error.message] },
          ],
      internships: [],
    });
  }
}

router.get("/internships", readLimit, sendInternships);
router.post("/internships/refresh", refreshLimit, sendInternships);

export default router;
