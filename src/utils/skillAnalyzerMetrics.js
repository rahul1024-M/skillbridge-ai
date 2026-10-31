const PROFICIENCY_RANK = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function deduplicateNamedEntries(entries = []) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = String(entry?.name || "").trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeCareerSkillGaps(gaps) {
  if (!Array.isArray(gaps)) return null;
  const uniqueGaps = new Map();
  gaps.forEach((gap) => {
    const name = typeof gap === "string"
      ? gap.trim()
      : String(gap?.skill || gap?.name || "").trim();
    const key = name.toLocaleLowerCase();
    if (key && !uniqueGaps.has(key)) uniqueGaps.set(key, name);
  });
  return [...uniqueGaps.values()];
}

export function calculateSkillAnalyzerMetrics(skills = [], careerSkillGaps = null) {
  const uniqueSkills = deduplicateNamedEntries(skills);
  const proficiencyRanks = uniqueSkills
    .map((skill) => PROFICIENCY_RANK[skill.proficiency])
    .filter((rank) => Number.isInteger(rank));
  const averageProficiency = proficiencyRanks.length
    ? Math.round((proficiencyRanks.reduce((sum, rank) => sum + rank, 0) / proficiencyRanks.length / 3) * 100)
    : null;
  const normalizedGaps = normalizeCareerSkillGaps(careerSkillGaps);

  return {
    skillsIdentified: uniqueSkills.length,
    averageProficiency,
    advancedSkills: uniqueSkills.filter((skill) => skill.proficiency === "Advanced").length,
    growthOpportunities: normalizedGaps === null ? null : normalizedGaps.length,
    skillGaps: normalizedGaps,
  };
}
