import { publicSupabase, supabase } from "./supabase";

function assertClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
}

async function loadSingle(table, userId) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadCollection(table, userId) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchStudentProfile(user) {
  assertClient();
  const userId = user?.id;
  if (!userId) throw new Error("An authenticated student account is required.");

  const [
    profile,
    education,
    preferences,
    skills,
    projects,
    certifications,
    experience,
    links,
  ] = await Promise.all([
    loadSingle("student_profiles", userId),
    loadSingle("education", userId),
    loadSingle("career_preferences", userId),
    loadCollection("skills", userId),
    loadCollection("projects", userId),
    loadCollection("certifications", userId),
    loadCollection("experience", userId),
    loadCollection("student_links", userId),
  ]);

  if (!profile) {
    throw new Error("Your student profile is not available. Apply the Supabase database migration.");
  }

  const linksByLabel = new Map(links.map((link) => [link.label.toLowerCase(), link]));
  const otherLinks = links.filter(
    (link) => !["github", "linkedin", "portfolio"].includes(link.label.toLowerCase())
  );

  return {
    name: profile.display_name || user.user_metadata?.full_name || "",
    email: profile.email || user.email || "",
    phone: profile.phone || "",
    location: profile.location || "",
    bio: profile.introduction || "",
    photoUrl: profile.photo_path || "",
    publicEnabled: profile.public_enabled === true,
    publicSlug: profile.public_slug || "",
    college: education?.institution || "",
    degree: education?.degree || "",
    branch: education?.department || "",
    year: education?.academic_year || "",
    graduationYear: education?.graduation_year ? String(education.graduation_year) : "",
    cgpa: education?.cgpa === null || education?.cgpa === undefined ? "" : String(education.cgpa),
    academicInfo: education?.academic_information || "",
    targetRole: preferences?.target_role || "",
    preferredDomain: preferences?.preferred_domain || "",
    careerGoals: preferences?.goals || "",
    preferredLocation: preferences?.preferred_location || "",
    workMode: preferences?.work_mode || "",
    internshipPreferences: preferences?.internship_preferences || "",
    github: linksByLabel.get("github")?.url || "",
    linkedin: linksByLabel.get("linkedin")?.url || "",
    portfolioUrl: linksByLabel.get("portfolio")?.url || "",
    skills: skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
      yearsExperience:
        skill.years_experience === null ? "" : String(skill.years_experience ?? ""),
    })),
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description || "",
      technologies: project.technologies || [],
      repositoryUrl: project.repository_url || "",
      liveUrl: project.live_url || "",
      status: project.status,
      contribution: project.contribution || "",
    })),
    certifications: certifications.map((certification) => ({
      id: certification.id,
      name: certification.name,
      issuer: certification.issuer || "",
      issueDate: certification.issued_on || "",
      credentialUrl: certification.credential_url || "",
    })),
    experience: experience.map((entry) => ({
      id: entry.id,
      organization: entry.organization,
      role: entry.role,
      startedOn: entry.started_on || "",
      endedOn: entry.ended_on || "",
      responsibilities: entry.responsibilities || "",
      skillsUsed: entry.skills_used || [],
    })),
    otherLinks: otherLinks.map((link) => ({
      id: link.id,
      label: link.label,
      url: link.url,
    })),
  };
}

export async function saveStudentProfile(profile) {
  assertClient();

  const payload = {
    ...profile,
    skills: profile.skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
      years_experience: skill.yearsExperience,
    })),
    projects: profile.projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      technologies: project.technologies,
      repository_url: project.repositoryUrl,
      live_url: project.liveUrl,
      status: project.status,
      contribution: project.contribution,
    })),
    certifications: profile.certifications.map((certification) => ({
      id: certification.id,
      name: certification.name,
      issuer: certification.issuer,
      issue_date: certification.issueDate,
      credential_url: certification.credentialUrl,
    })),
    experience: profile.experience.map((entry) => ({
      id: entry.id,
      organization: entry.organization,
      role: entry.role,
      started_on: entry.startedOn,
      ended_on: entry.endedOn,
      responsibilities: entry.responsibilities,
      skills_used: entry.skillsUsed,
    })),
  };

  const { error } = await supabase.rpc("save_student_profile", {
    p_profile: payload,
  });
  if (error) throw error;
}

export async function fetchPublicStudentProfile(slug) {
  if (!publicSupabase) {
    throw new Error("Public profile viewing is not configured.");
  }

  const { data: profile, error } = await publicSupabase.rpc(
    "get_public_student_profile",
    { p_slug: slug }
  );
  if (error) throw error;
  if (!profile) return null;

  return profile;
}
