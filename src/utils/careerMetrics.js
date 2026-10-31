const PROFICIENCY = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function getCareerReadiness(data) {
  const { learningPlan, profile, roadmapItems, audits, submissions } = data;
  const components = [];
  const requirements = learningPlan?.requirements;
  if (Array.isArray(requirements) && requirements.length) {
    const coverage = requirements.reduce((sum, item) => {
      if (item.status === "existing") return sum + 1;
      if (item.status === "improve") return sum + 0.5;
      return sum;
    }, 0) / requirements.length;
    components.push({ label: "Target-skill coverage", value: Math.round(coverage * 100) });
  }

  if (profile?.skills?.length) {
    const score = profile.skills.reduce(
      (sum, skill) => sum + (PROFICIENCY[skill.proficiency] || 1),
      0
    ) / profile.skills.length;
    components.push({ label: "Self-reported proficiency", value: Math.round((score / 3) * 100) });
  }
  if (profile?.projects?.length) {
    const completed = profile.projects.filter((project) => project.status === "Completed").length;
    components.push({
      label: "Completed projects",
      value: Math.round((completed / profile.projects.length) * 100),
    });
  }
  if (submissions.length) {
    const reviewed = audits.filter((audit) => audit.status === "Evidence reviewed").length;
    components.push({
      label: "Repository evidence reviewed",
      value: Math.min(100, Math.round((reviewed / submissions.length) * 100)),
    });
  }
  if (roadmapItems.length) {
    const completed = roadmapItems.filter((item) => item.status === "completed").length;
    components.push({
      label: "Roadmap task completion",
      value: Math.round((completed / roadmapItems.length) * 100),
    });
  }

  return {
    score: components.length === 5
      ? Math.round(components.reduce((sum, component) => sum + component.value, 0) / components.length)
      : null,
    components,
  };
}
