function profileRestUrl(table, query) {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  if (!baseUrl || !process.env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured on the backend.");
  }
  const params = new URLSearchParams(query);
  return `${baseUrl}/rest/v1/${table}?${params}`;
}

async function fetchOwnedRows(table, select, userId, accessToken, limit = 100, filters = {}) {
  const response = await fetch(profileRestUrl(table, {
    select,
    user_id: `eq.${userId}`,
    limit: String(limit),
    ...filters,
  }), {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Supabase denied access to the authenticated student profile.");
    }
    throw new Error(`Unable to load student career data (HTTP ${response.status}).`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Supabase returned an invalid student data response.");
  return rows;
}

export async function fetchStudentCareerContext(userId, accessToken) {
  const [
    profiles,
    education,
    preferences,
    skills,
    projects,
    certifications,
    experience,
    roadmaps,
    audits,
    progress,
  ] = await Promise.all([
    fetchOwnedRows("student_profiles", "display_name,location,introduction", userId, accessToken, 1),
    fetchOwnedRows("education", "institution,degree,department,academic_year,graduation_year,cgpa,academic_information", userId, accessToken, 1),
    fetchOwnedRows("career_preferences", "target_role,preferred_domain,goals,preferred_location,work_mode,internship_preferences", userId, accessToken, 1),
    fetchOwnedRows("skills", "name,category,proficiency,years_experience", userId, accessToken, 100),
    fetchOwnedRows("projects", "title,description,technologies,status", userId, accessToken, 50),
    fetchOwnedRows("certifications", "name,issuer,issued_on", userId, accessToken, 50),
    fetchOwnedRows("experience", "organization,role,responsibilities,skills_used", userId, accessToken, 30),
    fetchOwnedRows("learning_roadmaps", "id,title,target_role,status,updated_at", userId, accessToken, 20),
    fetchOwnedRows("proof_of_work_audits", "status,summary,skills,audited_at", userId, accessToken, 20),
    fetchOwnedRows("student_progress", "activity_type,description,occurred_at", userId, accessToken, 30),
  ]);
  if (!profiles[0]) {
    throw new Error("The authenticated student profile was not found. Apply the Supabase migrations first.");
  }

  const activeRoadmap = roadmaps.find((roadmap) => roadmap.status === "active");
  let roadmapItems = [];
  if (activeRoadmap) {
    roadmapItems = await fetchOwnedRows(
      "roadmap_items",
      "roadmap_id,title,skill,status,topics,completed_at,position",
      userId,
      accessToken,
      40,
      { roadmap_id: `eq.${activeRoadmap.id}` }
    );
    roadmapItems = roadmapItems.sort((a, b) => a.position - b.position);
  }

  return {
    education: {
      college: education[0]?.institution || "",
      degree: education[0]?.degree || "",
      branch: education[0]?.department || "",
      academicYear: education[0]?.academic_year || "",
      graduationYear: education[0]?.graduation_year || "",
      cgpa: education[0]?.cgpa ?? "",
      academicInfo: education[0]?.academic_information || "",
    },
    skills: skills.map((skill) => ({
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
      yearsExperience: skill.years_experience,
    })),
    projects: projects.map((project) => ({
      title: project.title,
      description: project.description || "",
      technologies: project.technologies || [],
      status: project.status,
    })),
    certifications,
    experience,
    career: {
      targetRole: preferences[0]?.target_role || "",
      preferredDomain: preferences[0]?.preferred_domain || "",
      goals: preferences[0]?.goals || "",
      preferredLocation: preferences[0]?.preferred_location || "",
      workMode: preferences[0]?.work_mode || "",
      internshipPreferences: preferences[0]?.internship_preferences || "",
    },
    learning: {
      activeRoadmap: activeRoadmap?.title || "",
      tasks: roadmapItems.slice(0, 40).map((item) => ({
        title: item.title,
        skill: item.skill,
        status: item.status,
        topics: item.topics || [],
      })),
      recentActivity: progress.slice(0, 20).map((item) => ({
        type: item.activity_type,
        description: item.description,
        occurredAt: item.occurred_at,
      })),
    },
    evidence: audits.slice(0, 20).map((audit) => ({
      status: audit.status,
      summary: audit.summary,
      skills: audit.skills,
      auditedAt: audit.audited_at,
    })),
  };
}

export async function fetchStudentInternshipContext(userId, accessToken) {
  const [education, preferences, skills, projects, experience] = await Promise.all([
    fetchOwnedRows(
      "education",
      "institution,degree,department,academic_year,graduation_year,academic_information",
      userId,
      accessToken,
      1
    ),
    fetchOwnedRows(
      "career_preferences",
      "target_role,preferred_domain,goals,preferred_location,work_mode,internship_preferences",
      userId,
      accessToken,
      1
    ),
    fetchOwnedRows("skills", "name,category,proficiency,years_experience", userId, accessToken, 100),
    fetchOwnedRows("projects", "title,description,technologies,status,contribution", userId, accessToken, 50),
    fetchOwnedRows("experience", "organization,role,responsibilities,skills_used", userId, accessToken, 30),
  ]);

  return {
    education: {
      college: education[0]?.institution || "",
      degree: education[0]?.degree || "",
      branch: education[0]?.department || "",
      academicYear: education[0]?.academic_year || "",
      graduationYear: education[0]?.graduation_year || "",
      academicInfo: education[0]?.academic_information || "",
    },
    skills: skills.map((skill) => ({
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
      yearsExperience: skill.years_experience,
    })),
    projects: projects.map((project) => ({
      title: project.title,
      description: project.description || "",
      technologies: project.technologies || [],
      status: project.status,
      contribution: project.contribution || "",
    })),
    experience: experience.map((entry) => ({
      organization: entry.organization,
      role: entry.role,
      responsibilities: entry.responsibilities || "",
      skills_used: entry.skills_used || [],
    })),
    career: {
      targetRole: preferences[0]?.target_role || "",
      preferredDomain: preferences[0]?.preferred_domain || "",
      goals: preferences[0]?.goals || "",
      preferredLocation: preferences[0]?.preferred_location || "",
      workMode: preferences[0]?.work_mode || "",
      internshipPreferences: preferences[0]?.internship_preferences || "",
    },
  };
}

export async function fetchVerifiedHackathon(hackathonId, accessToken) {
  const response = await fetch(profileRestUrl("hackathons", {
    select: "id,name,organizer,description,location,mode,starts_at,ends_at,registration_deadline,technologies",
    id: `eq.${hackathonId}`,
    is_published: "eq.true",
    verification_status: "eq.verified",
    limit: "1",
  }), {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Unable to load verified hackathon (HTTP ${response.status}).`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Supabase returned an invalid hackathon response.");
  }
  return rows[0] || null;
}

export async function fetchStudentHackathonContext(userId, accessToken) {
  const [preferences, skills, projects, experience] = await Promise.all([
    fetchOwnedRows(
      "career_preferences",
      "target_role,preferred_domain,goals,internship_preferences",
      userId,
      accessToken,
      1
    ),
    fetchOwnedRows("skills", "name,proficiency", userId, accessToken, 100),
    fetchOwnedRows("projects", "title,technologies", userId, accessToken, 50),
    fetchOwnedRows("experience", "role,skills_used", userId, accessToken, 30),
  ]);
  return {
    targetRole: preferences[0]?.target_role || "",
    interests: [
      preferences[0]?.preferred_domain,
      preferences[0]?.goals,
      preferences[0]?.internship_preferences,
    ].filter(Boolean),
    skills: skills.map(({ name, proficiency }) => ({ name, proficiency })),
    projects: projects.map(({ title, technologies }) => ({ title, technologies })),
    experience: experience.map(({ role, skills_used }) => ({ role, skills: skills_used || [] })),
  };
}
