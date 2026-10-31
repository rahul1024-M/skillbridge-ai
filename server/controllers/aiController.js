import {
  generateCareerPlan,
  generateHackathonExplanation,
  generateInternshipExplanation,
} from "../services/geminiService.js";
import {
  fetchStudentCareerContext,
  fetchStudentHackathonContext,
  fetchStudentInternshipContext,
  fetchVerifiedHackathon,
} from "../services/studentDataService.js";
import { getHackathonForExplanation } from "../services/hackathonService.js";
import { getInternshipForExplanation } from "../services/opportunityService.js";

const MAX_PROFILE_ITEMS = 60;

function cleanText(value, maxLength = 500) {
  const text = typeof value === "string"
    ? value
    : typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : "";
  return text
    ? text.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength)
    : "";
}

function normalizeProfile(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const education = input.education || {};
  const career = input.career || {};

  const normalizeEntries = (value, fields) =>
    Array.isArray(value)
      ? value.slice(0, MAX_PROFILE_ITEMS).map((entry) => {
          const normalized = {};
          for (const [field, length] of fields) {
            normalized[field] = Array.isArray(entry?.[field])
              ? entry[field].slice(0, length).map((item) => cleanText(item, 100))
              : cleanText(entry?.[field], length);
          }
          return normalized;
        })
      : [];

  return {
    education: {
      college: cleanText(education.college, 180),
      degree: cleanText(education.degree, 120),
      branch: cleanText(education.branch, 120),
      academicYear: cleanText(education.academicYear, 40),
      graduationYear: cleanText(education.graduationYear, 4),
      cgpa: cleanText(education.cgpa, 8),
      academicInfo: cleanText(education.academicInfo, 500),
    },
    skills: normalizeEntries(input.skills, [
      ["name", 80],
      ["category", 50],
      ["proficiency", 20],
      ["yearsExperience", 20],
    ]),
    projects: normalizeEntries(input.projects, [
      ["title", 120],
      ["description", 500],
      ["technologies", 12],
      ["status", 30],
      ["contribution", 500],
    ]),
    certifications: normalizeEntries(input.certifications, [
      ["name", 120],
      ["issuer", 120],
      ["issued_on", 20],
    ]),
    experience: normalizeEntries(input.experience, [
      ["organization", 120],
      ["role", 120],
      ["responsibilities", 500],
      ["skills_used", 20],
    ]),
    career: {
      targetRole: cleanText(career.targetRole, 120),
      preferredDomain: cleanText(career.preferredDomain, 120),
      goals: cleanText(career.goals, 500),
      preferredLocation: cleanText(career.preferredLocation, 120),
      workMode: cleanText(career.workMode, 40),
      internshipPreferences: cleanText(career.internshipPreferences, 300),
    },
    learning: {
      activeRoadmap: cleanText(input.learning?.activeRoadmap, 160),
      tasks: normalizeEntries(input.learning?.tasks, [
        ["title", 120],
        ["skill", 80],
        ["status", 20],
        ["topics", 10],
      ]),
      recentActivity: normalizeEntries(input.learning?.recentActivity, [
        ["type", 80],
        ["description", 200],
        ["occurredAt", 40],
      ]),
    },
    evidence: Array.isArray(input.evidence)
      ? input.evidence.slice(0, 20).map((entry) => ({
          status: cleanText(entry?.status, 40),
          summary: cleanText(entry?.summary, 300),
          skills: Array.isArray(entry?.skills)
            ? entry.skills.slice(0, 10).map((skill) => ({
                name: cleanText(skill?.name, 80),
                level: cleanText(skill?.level, 20),
                evidence: cleanText(skill?.evidence, 300),
              }))
            : [],
          auditedAt: cleanText(entry?.auditedAt, 40),
        }))
      : [],
  };
}

export async function createCareerPlan(req, res, next) {
  try {
    const storedProfile = await fetchStudentCareerContext(
      req.student.id,
      req.student.accessToken
    );
    const profile = normalizeProfile(storedProfile);
    if (!profile.career.targetRole) {
      return res.status(422).json({ message: "Add a target job role to your profile first." });
    }
    const plan = await generateCareerPlan(profile);
    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      ...plan,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createHackathonExplanation(req, res, next) {
  try {
    const hackathonId = cleanText(req.body?.hackathonId, 36);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hackathonId);
    const isUnstopId = /^unstop:\d{1,20}$/.test(hackathonId);
    if (!isUuid && !isUnstopId) {
      return res.status(400).json({ message: "A valid hackathon listing ID is required." });
    }

    const [student, hackathon] = await Promise.all([
      fetchStudentHackathonContext(req.student.id, req.student.accessToken),
      isUnstopId
        ? getHackathonForExplanation(hackathonId)
        : fetchVerifiedHackathon(hackathonId, req.student.accessToken),
    ]);
    if (!hackathon) {
      return res.status(404).json({ message: "Verified hackathon not found." });
    }

    const explanation = await generateHackathonExplanation(student, hackathon);
    return res.json({ success: true, ...explanation });
  } catch (error) {
    return next(error);
  }
}

export async function createInternshipExplanation(req, res, next) {
  try {
    const internshipId = cleanText(req.body?.internshipId, 200);
    if (!/^(arbeitnow:[a-zA-Z0-9._-]{1,180}|jobicy:\d{1,20})$/.test(internshipId)) {
      return res.status(400).json({ message: "A valid live internship listing ID is required." });
    }

    const [storedProfile, internship] = await Promise.all([
      fetchStudentInternshipContext(req.student.id, req.student.accessToken),
      getInternshipForExplanation(internshipId),
    ]);
    if (!internship) {
      return res.status(404).json({ message: "The live internship listing is no longer available." });
    }

    const explanation = await generateInternshipExplanation(
      normalizeProfile(storedProfile),
      internship
    );
    return res.json({ success: true, ...explanation });
  } catch (error) {
    return next(error);
  }
}