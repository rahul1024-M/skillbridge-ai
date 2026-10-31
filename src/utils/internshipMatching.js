function normalize(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ");
}

function containsPhrase(text, phrase) {
  const normalizedText = normalize(text);
  const normalizedPhrase = normalize(phrase);
  return Boolean(normalizedPhrase && ` ${normalizedText} `.includes(` ${normalizedPhrase} `));
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function addEvidence(evidence, value, source, weight, proficiency = null) {
  const name = typeof value === "string" ? value.trim() : "";
  const key = normalize(name);
  if (!key) return;

  const current = evidence.get(key);
  if (!current) {
    evidence.set(key, { name, source, weight, proficiency, sources: [source] });
    return;
  }

  if (!current.sources.includes(source)) current.sources.push(source);
  if (current.weight < weight) {
    evidence.set(key, { name, source, weight, proficiency, sources: current.sources });
  }
}

function profileEvidence(profile) {
  const evidence = new Map();
  for (const skill of asList(profile?.skills)) {
    const name = typeof skill === "string" ? skill : skill?.name;
    const proficiency = typeof skill === "object" ? skill?.proficiency || null : null;
    const weight = {
      Beginner: 0.5,
      Intermediate: 0.75,
      Advanced: 1,
    }[proficiency] || 0.5;
    addEvidence(evidence, name, "profile skill", weight, proficiency);
  }

  for (const project of asList(profile?.projects)) {
    for (const technology of asList(project.technologies)) {
      addEvidence(evidence, technology, "project technology", 0.75);
    }
    const projectText = [project.title, project.description, project.contribution]
      .filter(Boolean)
      .join(" ");
    for (const skill of asList(profile?.skills)) {
      const name = typeof skill === "string" ? skill : skill?.name;
      if (containsPhrase(projectText, name)) {
        addEvidence(evidence, name, "project evidence", 0.75);
      }
    }
  }

  for (const experience of asList(profile?.experience)) {
    const skills = Array.isArray(experience.skillsUsed)
      ? experience.skillsUsed
      : asList(experience.skills_used);
    for (const skill of skills) {
      addEvidence(evidence, skill, "experience skill", 0.85);
    }
    const experienceText = [
      experience.role,
      experience.organization,
      experience.responsibilities,
    ].filter(Boolean).join(" ");
    for (const skill of asList(profile?.skills)) {
      const name = typeof skill === "string" ? skill : skill?.name;
      if (containsPhrase(experienceText, name)) {
        addEvidence(evidence, name, "experience evidence", 0.85);
      }
    }
  }

  const career = profile?.career || {};
  const education = profile?.education || {};
  const contextualEvidence = [
    [profile?.targetRole || career.targetRole, "career interest"],
    [profile?.preferredDomain || career.preferredDomain, "career interest"],
    [profile?.careerGoals || career.goals, "career interest"],
    [profile?.preferredLocation || career.preferredLocation, "career interest"],
    [profile?.workMode || career.workMode, "career interest"],
    [education.degree, "education"],
    [education.branch || education.department, "education"],
    [education.academicInfo, "education"],
  ];
  for (const [value, source] of contextualEvidence) {
    addEvidence(evidence, value, source, 0.5);
  }

  return evidence;
}

function sourceSignals(internship) {
  const signals = new Map();
  for (const value of [
    ...asList(internship?.requiredSkills),
    ...asList(internship?.sourceTags),
  ]) {
    const name = typeof value === "string" ? value.trim() : "";
    const key = normalize(name);
    if (key && !signals.has(key)) {
      signals.set(key, {
        name,
        source: asList(internship?.requiredSkills).includes(value)
          ? "source-listed skill"
          : "source tag",
      });
    }
  }
  return signals;
}

export function getInternshipMatch(profile, internship) {
  const evidenceByName = profileEvidence(profile);
  const listingSignals = sourceSignals(internship);
  const listingText = [
    internship?.title,
    internship?.description,
    internship?.requirements,
    internship?.eligibility,
    internship?.experience,
    ...asList(internship?.requiredSkills),
    ...asList(internship?.sourceTags),
  ].filter(Boolean).join(" ");

  const matchingEvidence = [];
  const matchedEvidenceKeys = new Set();
  const missingSkills = [];
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const [key, signal] of listingSignals) {
    const evidence = evidenceByName.get(key);
    totalWeight += 1;
    if (!evidence) {
      missingSkills.push(signal.name);
      continue;
    }
    matchedWeight += evidence.weight;
    matchedEvidenceKeys.add(key);
    matchingEvidence.push({
      tag: signal.name,
      ...evidence,
      signalSource: signal.source,
    });
  }

  for (const [key, evidence] of evidenceByName) {
    if (matchedEvidenceKeys.has(key) || !containsPhrase(listingText, evidence.name)) continue;
    totalWeight += 1;
    matchedWeight += evidence.weight;
    matchedEvidenceKeys.add(key);
    matchingEvidence.push({
      tag: evidence.name,
      ...evidence,
      signalSource: "exact mention in listing text",
    });
  }

  const profileSkills = new Map(asList(profile?.skills).map((skill) => {
    const name = typeof skill === "string" ? skill : skill?.name;
    return [normalize(name), {
      name,
      proficiency: typeof skill === "object" ? skill?.proficiency || null : null,
    }];
  }));
  const matchingSkills = matchingEvidence
    .filter((match) => match.sources.includes("profile skill"))
    .map((match) => profileSkills.get(normalize(match.tag)))
    .filter(Boolean);
  const matchedNames = new Set(matchingEvidence.map((match) => normalize(match.tag)));
  const hasProfile = evidenceByName.size > 0;
  const role = normalize(
    profile?.targetRole ||
    profile?.career?.targetRole ||
    profile?.career?.target_role
  );
  const title = normalize(internship?.title);
  const roleRelevance = Boolean(role && title.includes(role));

  return {
    percentage: hasProfile && totalWeight
      ? Math.round((matchedWeight / totalWeight) * 100)
      : null,
    matchingSkills,
    matchingEvidence,
    missingSkills: hasProfile ? missingSkills : [],
    unmatchedProfileSkills: asList(profile?.skills)
      .map((skill) => typeof skill === "string" ? skill : skill?.name)
      .filter((name) => name && !matchedNames.has(normalize(name))),
    roleRelevance,
    hasProfile,
    hasSourceSignals: listingSignals.size > 0,
    signalCount: totalWeight,
    matchedWeight,
    totalWeight,
    scoreBasis: totalWeight
      ? "source-listed skills and tags plus exact profile-evidence mentions in the listing"
      : "no identifiable source skill signals or exact profile-evidence mentions",
  };
}

export function getRoadmapSuggestions(roadmapItems, missingSkills) {
  const normalizedMissing = new Set(missingSkills.map(normalize));
  if (!normalizedMissing.size) return [];
  return (Array.isArray(roadmapItems) ? roadmapItems : []).filter((item) =>
    normalizedMissing.has(normalize(item.skill)) ||
    [...normalizedMissing].some((skill) => normalize(item.title).includes(skill))
  );
}
