export function normalizeTechnology(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

export function getHackathonSkillMatch(skills, technologies) {
  const studentSkills = new Map(
    (skills || [])
      .map((skill) => {
        const name = typeof skill === "string" ? skill : skill?.name;
        return [normalizeTechnology(name), name];
      })
      .filter(([normalized, name]) => normalized && name)
  );
  const normalizedTechnologies = [...new Set(
    (technologies || []).map(normalizeTechnology).filter(Boolean)
  )];
  const matchingSkills = normalizedTechnologies
    .filter((technology) => studentSkills.has(technology))
    .map((technology) => studentSkills.get(technology));
  const missingSkills = normalizedTechnologies.filter(
    (technology) => !studentSkills.has(technology)
  );
  return {
    matchingSkills,
    missingSkills,
    percentage: normalizedTechnologies.length
      ? Math.round((matchingSkills.length / normalizedTechnologies.length) * 100)
      : null,
  };
}

export function getRegistrationStatus(event, now = Date.now()) {
  const end = event.ends_at ? new Date(event.ends_at).getTime() : NaN;
  const start = event.starts_at ? new Date(event.starts_at).getTime() : NaN;
  if ((Number.isFinite(end) && end < now) ||
    (!Number.isFinite(end) && Number.isFinite(start) && start < now)) {
    return "closed";
  }
  if (typeof event.registration_open === "boolean") {
    return event.registration_open ? "open" : "closed";
  }
  if (event.registration_deadline) {
    return new Date(event.registration_deadline).getTime() >= now ? "open" : "closed";
  }
  return new Date(event.starts_at).getTime() >= now ? "open" : "closed";
}

export function escapeCalendarText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function toCalendarDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
