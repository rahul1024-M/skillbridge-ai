import assert from "node:assert/strict";
import test from "node:test";
import { calculateSkillAnalyzerMetrics } from "./skillAnalyzerMetrics.js";

test("calculates unique profile metrics from the stored proficiency scale", () => {
  const metrics = calculateSkillAnalyzerMetrics([
    { name: "Python", proficiency: "Intermediate" },
    { name: "python", proficiency: "Advanced" },
    { name: "SQL", proficiency: "Beginner" },
    { name: "React", proficiency: "Advanced" },
  ], [
    { skill: "React" },
    { skill: "react" },
    { skill: "TypeScript" },
  ]);

  assert.equal(metrics.skillsIdentified, 3);
  assert.equal(metrics.averageProficiency, 67);
  assert.equal(metrics.advancedSkills, 1);
  assert.equal(metrics.growthOpportunities, 2);
  assert.deepEqual(metrics.skillGaps, ["React", "TypeScript"]);
});

test("uses honest empty and unavailable metric values", () => {
  const withoutCareerAnalysis = calculateSkillAnalyzerMetrics([]);
  assert.deepEqual(withoutCareerAnalysis, {
    skillsIdentified: 0,
    averageProficiency: null,
    advancedSkills: 0,
    growthOpportunities: null,
    skillGaps: null,
  });

  const withEmptyCareerAnalysis = calculateSkillAnalyzerMetrics([], []);
  assert.equal(withEmptyCareerAnalysis.growthOpportunities, 0);
  assert.equal(withEmptyCareerAnalysis.averageProficiency, null);
});
