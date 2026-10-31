import express from "express";
import { getHackathons, geocodeCity } from "../services/hackathonService.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();
const refreshRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  key: (req) => `manual-refresh:${req.ip}`,
});

router.get(
  "/geocode",
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  async (req, res) => {
    try {
      const location = await geocodeCity(req.query.city);
      if (!location) {
        return res.status(404).json({
          message: "We couldn't find that city. Check the spelling and try again.",
        });
      }
      res.set("Cache-Control", "public, max-age=86400");
      return res.json({
        ...location,
        attribution: "© OpenStreetMap contributors",
        attributionUrl: "https://www.openstreetmap.org/copyright",
      });
    } catch (error) {
      const status = /between 1 and 120 characters/.test(error.message) ? 400 : 502;
      console.error("Hackathon city geocoding failed:", error.message);
      return res.status(status).json({
        message: status === 400
          ? error.message
          : "City lookup is temporarily unavailable. Please try again or use GPS.",
      });
    }
  }
);

router.get(
  "/",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    key: (req) => `feed:${req.ip}`,
  }),
  (req, res, next) => req.query.refresh === "true"
    ? refreshRateLimit(req, res, next)
    : next(),
  async (req, res) => {
    try {
      const result = await getHackathons({
        search: req.query.search,
        technology: req.query.technology,
        city: req.query.city,
        latitude: req.query.latitude,
        longitude: req.query.longitude,
        radius: req.query.radius,
        mode: req.query.mode,
        status: req.query.status,
        source: req.query.source,
        sort: req.query.sort,
        refresh: req.query.refresh === "true",
      });
      res.set("Cache-Control", req.query.refresh === "true" ? "no-store" : "public, max-age=60");
      return res.json(result);
    } catch (error) {
      console.error("Hackathon feed request failed:", error.message);
      return res.status(
        error.message.startsWith("Invalid") ||
        error.message.startsWith("Radius") ||
        error.message.startsWith("Both latitude")
        ? 400
        : 502
      ).json({
        message: error.message || "Hackathon listings are temporarily unavailable.",
        lastUpdated: null,
        providers: [],
        events: [],
      });
    }
  }
);

export default router;
