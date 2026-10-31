const ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api";
const JOBICY_API = "https://jobicy.com/api/jobs";
const JOBICY_STATUS_API = "https://jobicy.com/api/jobs/status";
const CACHE_DURATION_MS = 10 * 60 * 1000;
const JOBICY_CACHE_DURATION_MS = 6 * 60 * 60 * 1000;
const MAX_PAGES = 3;
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;
const COMPENSATION_CONTEXT =
  /\b(?:salary|stipend|compensation|remuneration|pay|allowance|reimbursement|paid internship)\b|\w*vergoeding\b/i;

let cache = { expiresAt: 0, lastUpdated: "", internships: [], provider: null };
let refreshPromise = null;
let jobicyCache = { expiresAt: 0, lastUpdated: "", internships: [], provider: null };
let jobicyRefreshPromise = null;

function stripHtml(value, limit = 8000) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => {
      const point = Number(code);
      return Number.isInteger(point) && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => {
      const point = parseInt(code, 16);
      return Number.isInteger(point) && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    })
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function toIsoDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number"
    ? new Date(value < 1e12 ? value * 1000 : value)
    : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validProviderUrl(value, hostname) {
  const url = safeHttpsUrl(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname === hostname ? parsed.href : null;
  } catch {
    return null;
  }
}

function sourceWorkMode(job) {
  const declared = [
    job.work_mode,
    job.workMode,
    job.location_type,
    job.workplace_type,
    job.location,
  ].filter((value) => typeof value === "string").join(" ");
  const description = stripHtml(job.description, 8000);
  const remoteDescription =
    /\b(fully remote|100% remote|remote[- ]first|remote (role|position|internship|workplace)|work(?:ing)? remotely|work from anywhere)\b/i;
  const hybridDescription = /\bhybrid (role|position|internship|work|schedule)\b/i;
  const onsiteDescription = /\b(on[ -]?site (role|position|internship)|in[ -]?person (role|position|internship)|office[ -]?based (role|position|internship))\b/i;
  if (
    job.remote === true ||
    /\b(remote|fully remote|work from anywhere)\b/i.test(declared) ||
    remoteDescription.test(description)
  ) {
    return "Remote";
  }
  if (
    job.hybrid === true ||
    /\bhybrid\b/i.test(declared) ||
    hybridDescription.test(description)
  ) {
    return "Hybrid";
  }
  if (
    job.remote === false ||
    job.onsite === true ||
    job.on_site === true ||
    /\b(on[ -]?site|in[ -]?person|office[ -]?based)\b/i.test(declared) ||
    onsiteDescription.test(description)
  ) {
    return "On-site";
  }
  return null;
}

function compensationFromDescription(description) {
  const amountPattern =
    /(?:[$£€₹]\s?[\d][\d,.]*(?:\s?[kKmM])?|\b(?:INR|USD|EUR|GBP)\s?[\d][\d,.]*(?:\s?[kKmM])?)/;
  const sentences = description.split(/(?<=[.!?;])\s+|\r?\n+/);

  for (const sentence of sentences) {
    if (!COMPENSATION_CONTEXT.test(sentence)) continue;
    const amount = sentence.match(amountPattern)?.[0]?.trim().replace(/[,.]+$/, "");
    if (amount) return amount;
  }
  return null;
}

function normalizeJob(job, fetchedAt) {
  if (!job || typeof job !== "object" || Array.isArray(job)) return null;
  const title = stripHtml(job.title, 240);
  const jobTypes = Array.isArray(job.job_types)
    ? job.job_types.map((type) => stripHtml(type, 80)).filter(Boolean)
    : [];
  const isInternship =
    /\bintern(ship)?\b/i.test(title) ||
    jobTypes.some((type) => /\bintern(ship)?\b/i.test(type));
  if (!isInternship) return null;

  const applicationUrl = safeHttpsUrl(job.url);
  const providerStatus = String(job.status || "").toLowerCase();
  if (!title || !applicationUrl || job.closed === true ||
    ["closed", "expired", "inactive"].includes(providerStatus)) return null;

  const sourceTags = Array.isArray(job.tags)
    ? [...new Set(job.tags.map((tag) => stripHtml(tag, 80)).filter(Boolean))].slice(0, 40)
    : [];
  const requiredSkills = [
    job.required_skills,
    job.requiredSkills,
    job.skills,
  ].flatMap((values) => Array.isArray(values) ? values : [])
    .map((skill) => stripHtml(
      typeof skill === "string" ? skill : skill?.name || skill?.skill,
      80
    ))
    .filter(Boolean)
    .filter((skill, index, skills) =>
      skills.findIndex((candidate) => normalizedText(candidate) === normalizedText(skill)) === index
    )
    .slice(0, 40);
  const publishedAt = toIsoDate(job.created_at || job.publication_date);
  const deadline = toIsoDate(job.deadline || job.application_deadline);
  const expiresAt = toIsoDate(job.expires_at || job.closing_date);
  if (expiresAt && Date.parse(expiresAt) < Date.now()) return null;
  if (deadline && Date.parse(deadline) < Date.now()) return null;

  const salary = stripHtml(job.salary || job.stipend, 160) || null;
  const description = stripHtml(job.description);
  const descriptionCompensation = compensationFromDescription(description);
  const compensationMentioned = Boolean(descriptionCompensation) ||
    COMPENSATION_CONTEXT.test(description);
  const workMode = sourceWorkMode(job);
  const duration = stripHtml(job.duration || job.internship_duration, 100) || null;
  const experience = stripHtml(job.experience || job.experience_level, 120) || null;
  const eligibility = stripHtml(job.eligibility || job.candidate_requirements, 500) || null;
  const requirements = typeof job.requirements === "string"
    ? stripHtml(job.requirements, 1000)
    : null;
  const companyLogo = safeHttpsUrl(job.company_logo_url || job.company_logo);
  let id = stripHtml(job.slug || job.id, 180);
  if (!/^[a-zA-Z0-9._-]{1,180}$/.test(id)) {
    id = stripHtml(new URL(applicationUrl).pathname.split("/").filter(Boolean).pop(), 180);
  }
  if (!/^[a-zA-Z0-9._-]{1,180}$/.test(id)) return null;

  return {
    id: `arbeitnow:${id}`,
    externalId: id,
    title,
    company: stripHtml(job.company_name, 180) || "Not specified",
    companyLogo,
    description,
    location: stripHtml(job.location, 180) || null,
    country: stripHtml(job.country, 100) || null,
    workMode,
    compensation: salary || descriptionCompensation,
    compensationMentioned,
    paidStatus: /\bunpaid\b/i.test(`${title} ${description} ${jobTypes.join(" ")}`)
      ? "Unpaid"
      : salary || descriptionCompensation || /\bpaid\b/i.test(description) ? "Paid" : null,
    duration,
    durationMentioned: Boolean(duration) ||
      /\b(duration|internship period|weeks?|months?)\b/i.test(description),
    experience,
    experienceMentioned: Boolean(experience) ||
      /\b(skills?\s*&\s*experience|experience requirements?|years? of experience)\b/i.test(description),
    eligibility,
    requirements,
    eligibilityMentioned: Boolean(eligibility) ||
      /\b(eligib|qualification|must be enrolled|citizenship|permanent residency)\b/i.test(description),
    deadlineMentioned: Boolean(deadline) ||
      /\b(application deadline|apply by|applications close|closing date)\b/i.test(description),
    requiredSkills,
    sourceTags,
    jobTypes,
    domain: deriveDomain(title, sourceTags),
    deadline,
    applicationUrl,
    source: "Arbeitnow",
    sourceUrl: ARBEITNOW_API,
    publishedAt,
    sourceUpdatedAt: toIsoDate(job.updated_at),
    expiresAt,
    fetchedAt,
  };
}

function jobicySalary(job) {
  const minimum = job.salaryMin === null || job.salaryMin === undefined || job.salaryMin === ""
    ? Number.NaN
    : Number(job.salaryMin);
  const maximum = job.salaryMax === null || job.salaryMax === undefined || job.salaryMax === ""
    ? Number.NaN
    : Number(job.salaryMax);
  const currency = stripHtml(job.salaryCurrency, 12);
  if (!currency || (!Number.isFinite(minimum) && !Number.isFinite(maximum))) return null;
  const format = (amount) => new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(amount);
  if (Number.isFinite(minimum) && Number.isFinite(maximum)) {
    return `${currency} ${format(minimum)}–${format(maximum)} (source pay range)`;
  }
  return `${currency} ${format(Number.isFinite(minimum) ? minimum : maximum)} (source pay range)`;
}

function jobicyDuration(description) {
  const contextual = description.match(
    /\b(?:internship|program|placement|term|duration)\b[^.\n]{0,100}\b(\d{1,2})[- ]?(weeks?|months?)\b/i
  ) || description.match(
    /\b(\d{1,2})[- ]?(weeks?|months?)\b[^.\n]{0,80}\b(?:internship|program|placement|term)\b/i
  );
  if (!contextual) return null;
  const amount = Number(contextual[1]);
  const unit = contextual[2].toLowerCase();
  return `${amount} ${unit.endsWith("s") || amount === 1 ? unit : `${unit}s`}`;
}

function isJobicyInternship(job) {
  const jobType = Array.isArray(job?.jobType)
    ? job.jobType
    : [];
  return /\bintern(ship)?\b/i.test(String(job?.jobTitle || "")) ||
    jobType.some((value) => /\bintern(ship)?\b/i.test(String(value || "")));
}

function normalizeJobicyJob(job, fetchedAt, statusById) {
  if (!job || typeof job !== "object" || Array.isArray(job)) return null;
  const jobType = Array.isArray(job.jobType)
    ? job.jobType.map((value) => stripHtml(value, 80)).filter(Boolean)
    : [];
  const title = stripHtml(job.jobTitle, 240);
  if (!title || !isJobicyInternship(job)) return null;

  const id = String(job.id || "").trim();
  if (!/^\d{1,20}$/.test(id)) return null;
  const applicationUrl = validProviderUrl(job.url, "jobicy.com");
  if (!applicationUrl) return null;
  const sourceStatus = statusById.get(id) || "unknown";
  if (["closed", "expired", "inactive"].includes(sourceStatus.toLowerCase())) return null;

  const location = stripHtml(job.jobGeo, 180) || null;
  const tags = Array.isArray(job.jobIndustry)
    ? job.jobIndustry
    : typeof job.jobIndustry === "string" ? [job.jobIndustry] : [];
  const sourceTags = [...new Set(tags.map((tag) => stripHtml(tag, 80)).filter(Boolean))].slice(0, 40);
  const fetchedDescription = stripHtml(job.jobDescription || job.jobExcerpt);
  const salary = jobicySalary(job);
  const duration = jobicyDuration(fetchedDescription);
  const experience = stripHtml(job.jobLevel, 120) || null;
  return {
    id: `jobicy:${id}`,
    externalId: id,
    title,
    company: stripHtml(job.companyName, 180) || "Not specified",
    companyLogo: safeHttpsUrl(job.companyLogo),
    description: fetchedDescription,
    location,
    country: location,
    workMode: "Remote",
    remoteEligibility: location,
    compensation: salary,
    compensationMentioned: Boolean(salary),
    paidStatus: salary ? "Paid" : null,
    duration,
    durationMentioned: Boolean(duration),
    experience,
    experienceMentioned: Boolean(experience),
    eligibility: location ? `Source-listed candidate location: ${location}` : null,
    eligibilityMentioned: Boolean(location),
    deadline: null,
    deadlineMentioned: false,
    requiredSkills: [],
    sourceTags,
    jobTypes: jobType,
    domain: deriveDomain(title, sourceTags),
    applicationUrl,
    source: "Jobicy",
    sourceUrl: JOBICY_API,
    publishedAt: toIsoDate(job.pubDate),
    sourceUpdatedAt: null,
    expiresAt: null,
    sourceStatus,
    fetchedAt,
  };
}

function deriveDomain(title, tags) {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  const domains = [
    ["AI/ML", /\b(ai|artificial intelligence|machine learning|deep learning|nlp)\b/],
    ["Data Science", /\b(data science|data analyst|analytics|data engineer)\b/],
    ["Cybersecurity", /\b(cyber|security|infosec|penetration)\b/],
    ["Cloud", /\b(cloud|devops|aws|azure|gcp)\b/],
    ["Design", /\b(design|ui\/?ux|product designer)\b/],
    ["App Development", /\b(android|ios|mobile|app developer)\b/],
    ["Web Development", /\b(web|frontend|front-end|backend|back-end|fullstack|software development)\b/],
  ];
  return domains.find(([, pattern]) => pattern.test(text))?.[0] || "Other";
}

function normalizedText(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

async function fetchPage(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" ||
    !["www.arbeitnow.com", "arbeitnow.com"].includes(parsed.hostname)) {
    throw new Error("Arbeitnow returned an invalid pagination URL.");
  }
  const response = await fetch(parsed, {
    headers: { Accept: "application/json", "User-Agent": "SkillBridge-AI/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Arbeitnow returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload.data)) {
    throw new Error("Arbeitnow returned an unsupported response.");
  }
  return {
    jobs: payload.data,
    next: typeof payload.links?.next === "string" ? payload.links.next : null,
  };
}

async function fetchArbeitnow() {
  const fetchedAt = new Date().toISOString();
  const unique = new Map();
  let nextUrl = ARBEITNOW_API;
  const errors = [];
  let pagesFetched = 0;

  while (nextUrl && pagesFetched < MAX_PAGES) {
    try {
      const page = await fetchPage(nextUrl);
      pagesFetched += 1;
      for (const rawJob of page.jobs) {
        const job = normalizeJob(rawJob, fetchedAt);
        if (job && !unique.has(job.applicationUrl.toLowerCase())) {
          unique.set(job.applicationUrl.toLowerCase(), job);
        }
      }
      nextUrl = page.next ? new URL(page.next, ARBEITNOW_API).href : null;
    } catch (error) {
      errors.push(error.message || "Arbeitnow page request failed.");
      break;
    }
  }

  if (!pagesFetched) throw new Error(errors.join(" "));
  return {
    internships: [...unique.values()],
    lastUpdated: fetchedAt,
    provider: {
      source: "Arbeitnow",
      status: errors.length ? "partial" : "ok",
      count: unique.size,
      pagesFetched,
      errors,
    },
  };
}

async function fetchJobicyPage(query) {
  const url = new URL(JOBICY_API);
  url.search = new URLSearchParams(query).toString();
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "SkillBridge-AI/1.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Jobicy returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload.jobs)) {
    throw new Error("Jobicy returned an unsupported response.");
  }
  return payload.jobs;
}

async function fetchJobicyStatuses(jobs) {
  const ids = [...new Set(jobs.map((job) => String(job.id || "")).filter((id) => /^\d{1,20}$/.test(id)))];
  if (!ids.length) return { statuses: new Map(), error: null };
  try {
    const url = new URL(JOBICY_STATUS_API);
    url.searchParams.set("ids", ids.join(","));
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "SkillBridge-AI/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Jobicy status check returned HTTP ${response.status}.`);
    const payload = await response.json();
    if (!Array.isArray(payload.jobs)) throw new Error("Jobicy returned an invalid status response.");
    return {
      statuses: new Map(payload.jobs.map((item) => [String(item.id), String(item.status || "unknown")])),
      error: null,
    };
  } catch (error) {
    return { statuses: new Map(), error: error.message || "Jobicy status check failed." };
  }
}

async function fetchJobicy() {
  const fetchedAt = new Date().toISOString();
  const errors = [];
  const batches = await Promise.all([
    fetchJobicyPage({ count: "100", tag: "intern" }).catch((error) => {
      errors.push(error.message || "Jobicy internship query failed.");
      return [];
    }),
    fetchJobicyPage({ count: "100", geo: "apac" }).catch((error) => {
      errors.push(error.message || "Jobicy APAC query failed.");
      return [];
    }),
  ]);
  const candidates = batches.flat().filter(isJobicyInternship);
  const rawJobs = [...new Map(candidates.map((job) => [String(job.id), job])).values()];
  if (errors.length === 2) throw new Error(errors.join(" "));

  const { statuses, error: statusError } = await fetchJobicyStatuses(rawJobs);
  if (statusError) errors.push(statusError);
  const unique = new Map();
  for (const rawJob of rawJobs) {
    const job = normalizeJobicyJob(rawJob, fetchedAt, statuses);
    if (job && !unique.has(job.applicationUrl.toLowerCase())) {
      unique.set(job.applicationUrl.toLowerCase(), job);
    }
  }

  return {
    internships: [...unique.values()],
    provider: {
      source: "Jobicy",
      status: errors.length ? "partial" : "ok",
      count: unique.size,
      errors,
    },
  };
}

async function getJobicyInternships() {
  if (jobicyCache.expiresAt > Date.now()) return jobicyCache;
  if (jobicyRefreshPromise) return jobicyRefreshPromise;
  jobicyRefreshPromise = (async () => {
    const result = await fetchJobicy();
    jobicyCache = {
      ...result,
      lastUpdated: new Date().toISOString(),
      expiresAt: Date.now() + JOBICY_CACHE_DURATION_MS,
    };
    return jobicyCache;
  })();
  try {
    return await jobicyRefreshPromise;
  } finally {
    jobicyRefreshPromise = null;
  }
}

export async function getLiveInternships({ force = false } = {}) {
  if (!force && cache.expiresAt > Date.now()) return cache;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const providerResults = await Promise.allSettled([
      fetchArbeitnow(),
      getJobicyInternships(),
    ]);
    const errors = [];
    const providers = providerResults.map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const source = index === 0 ? "Arbeitnow" : "Jobicy";
      errors.push(`${source}: ${result.reason?.message || "Provider request failed."}`);
      return {
        internships: [],
        provider: {
          source,
          status: "error",
          count: 0,
          errors: [result.reason?.message || "Provider request failed."],
        },
        lastUpdated: "",
      };
    });
    const successful = providers.filter((provider) => provider.provider.status !== "error");
    if (!successful.length) {
      const error = new Error(errors.join(" ") || "All internship sources are unavailable.");
      error.providers = providers.map((provider) => provider.provider);
      throw error;
    }

    const unique = new Map();
    for (const provider of successful) {
      for (const internship of provider.internships) {
        const key = internship.applicationUrl.toLowerCase();
        if (!unique.has(key)) unique.set(key, internship);
      }
    }
    const lastUpdated = successful
      .map((provider) => provider.lastUpdated)
      .filter(Boolean)
      .sort()
      .at(-1) || new Date().toISOString();
    const result = {
      internships: [...unique.values()],
      provider: providers[0].provider,
      providers: providers.map((provider) => ({
        ...provider.provider,
        lastUpdated: provider.lastUpdated || null,
      })),
      lastUpdated,
    };
    cache = {
      ...result,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    };
    return cache;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export function getInternshipForExplanation(id) {
  return getLiveInternships().then((feed) =>
    feed.internships.find((internship) => internship.id === id) || null
  );
}

function parsePositiveInteger(value, fallback, maximum) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`Expected an integer between 1 and ${maximum}.`);
  }
  return parsed;
}

export async function searchLiveInternships(filters = {}) {
  const feed = await getLiveInternships({ force: filters.refresh === true });
  const page = parsePositiveInteger(filters.page, 1, 10000);
  const perPage = parsePositiveInteger(filters.perPage, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const search = normalizedText(filters.search).slice(0, 120);
  const location = normalizedText(filters.location).slice(0, 120);
  const country = normalizedText(filters.country).slice(0, 100);
  const domain = normalizedText(filters.domain);
  const workMode = String(filters.workMode || "").trim();
  const paidStatus = String(filters.paidStatus || "").trim();
  const duration = normalizedText(filters.duration);
  const experience = normalizedText(filters.experience);
  const sort = String(filters.sort || "newest");

  if (!["", "Remote", "Hybrid", "On-site"].includes(workMode)) {
    throw new Error("Invalid work mode filter.");
  }
  if (!["", "Paid", "Unpaid"].includes(paidStatus)) {
    throw new Error("Invalid compensation filter.");
  }
  if (!["newest", "deadline", "company"].includes(sort)) {
    throw new Error("Invalid internship sort option.");
  }

  let results = feed.internships.filter((item) => {
    const searchText = [
      item.title,
      item.company,
      item.location,
      item.country,
      item.remoteEligibility,
      item.description,
      ...item.sourceTags,
      ...item.requiredSkills,
    ].join(" ").toLocaleLowerCase();
    if (search && !searchText.includes(search)) return false;
    if (location && !normalizedText(item.location).includes(location)) return false;
    if (country &&
      !`${item.country || ""} ${item.location || ""}`.toLocaleLowerCase().includes(country)) {
      return false;
    }
    if (domain && normalizedText(item.domain) !== domain) return false;
    if (workMode && item.workMode !== workMode) return false;
    if (paidStatus && item.paidStatus !== paidStatus) return false;
    if (duration && !normalizedText(item.duration).includes(duration)) return false;
    if (experience && !normalizedText(item.experience).includes(experience)) return false;
    return true;
  });

  if (sort === "company") {
    results.sort((left, right) => left.company.localeCompare(right.company));
  } else if (sort === "deadline") {
    results.sort((left, right) => {
      const leftDate = left.deadline ? Date.parse(left.deadline) : Infinity;
      const rightDate = right.deadline ? Date.parse(right.deadline) : Infinity;
      return leftDate - rightDate;
    });
  } else {
    results.sort((left, right) =>
      (Date.parse(right.publishedAt || "") || 0) - (Date.parse(left.publishedAt || "") || 0)
    );
  }

  const total = results.length;
  const start = (page - 1) * perPage;
  return {
    source: "Arbeitnow and Jobicy",
    sourceUrl: ARBEITNOW_API,
    totalListings: feed.internships.length,
    lastUpdated: feed.lastUpdated,
    verifiedAt: feed.lastUpdated,
    cacheExpiresAt: new Date(feed.expiresAt).toISOString(),
    provider: feed.provider,
    providers: feed.providers,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
    internships: results.slice(start, start + perPage),
  };
}
