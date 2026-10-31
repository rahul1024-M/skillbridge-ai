const UNSTOP_API =
  "https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons";
const UNSTOP_LISTING_URL = "https://unstop.com/hackathons";
const CACHE_DURATION_MS = 15 * 60 * 1000;
const MAX_PAGES = 3;
const PAGE_SIZE = 50;
const DEFAULT_TIMEOUT_MS = 12000;

let cache = {
  expiresAt: 0,
  lastUpdated: null,
  events: [],
  providers: [],
};
let refreshPromise = null;
const geocodeCache = new Map();
let geocodeQueue = Promise.resolve();
let lastGeocodeRequestAt = 0;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value, limit = 1200) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const decodeCodePoint = (value) => {
    const codePoint = Number(value);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : " ";
  };
  const decodeHexCodePoint = (value) => {
    const codePoint = parseInt(value, 16);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : " ";
  };
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => decodeCodePoint(code))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => decodeHexCodePoint(code))
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function validCoordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

function validDate(value) {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return new Date(value).toISOString();
}

function getEligibility(item) {
  const filters = Array.isArray(item.filters)
    ? item.filters.filter((filter) => filter?.type === "eligible")
      .map((filter) => text(filter?.name, 100)).filter(Boolean)
    : [];
  if (filters.length) return [...new Set(filters)].join(", ");

  if (typeof item.regnRequirements?.eligibility !== "string") return null;
  try {
    const eligibility = JSON.parse(item.regnRequirements.eligibility);
    if (!isRecord(eligibility)) return null;
    const groups = [
      ["sector", "Sector"],
      ["engineering", "Engineering"],
      ["bSchools", "Business schools"],
      ["arts", "Arts"],
      ["medicine", "Medicine"],
      ["law", "Law"],
      ["others", "Other"],
      ["experience", "Experience"],
    ];
    const details = groups.flatMap(([key, label]) => {
      const values = Array.isArray(eligibility[key])
        ? eligibility[key].map((value) => text(value, 80)).filter((value) => value && value.toLowerCase() !== "all")
        : [];
      return values.length ? [`${label}: ${values.join(", ")}`] : [];
    });
    return details.length ? details.join("; ").slice(0, 500) : null;
  } catch {
    return null;
  }
}

function sourceEventToRow(item) {
  if (
    !isRecord(item) ||
    item.type !== "hackathons" ||
    item.visibility !== "public" ||
    item.status !== "LIVE"
  ) {
    return null;
  }

  const id = item.id === null || item.id === undefined ? "" : String(item.id);
  const name = text(item.title, 180);
  const organizer = text(item.organisation?.name, 180);
  const registrationUrl = validHttpsUrl(item.seo_url || item.short_url);
  if (!id || !name || !organizer || !registrationUrl) return null;

  const address = isRecord(item.address_with_country_logo)
    ? item.address_with_country_logo
    : {};
  const locationParts = [
    text(address.address, 240),
    text(address.city, 120),
    text(address.state, 120),
    text(address.country?.name, 120),
  ].filter(Boolean);
  const country = text(address.country?.name, 120) || null;
  const sourceRegion = text(item.region, 40).toLowerCase();
  if (!["online", "hybrid", "offline"].includes(sourceRegion)) return null;
  const mode = sourceRegion === "offline" ? "in_person" : sourceRegion;
  const technologies = [
    ...(Array.isArray(item.required_skills)
      ? item.required_skills.map((skill) => text(skill?.skill_name || skill?.skill, 80))
      : []),
    ...(Array.isArray(item.tags)
      ? item.tags.map((tag) => text(tag?.name || tag?.tag, 80))
      : []),
  ].filter((value, index, values) => value && values.findIndex(
    (candidate) => candidate.toLocaleLowerCase() === value.toLocaleLowerCase()
  ) === index).slice(0, 40);

  const eligibility = getEligibility(item);

  const prizeParts = Array.isArray(item.prizes)
    ? item.prizes.map((prize) => {
        const rank = text(prize?.rank, 80);
        const amount = Number.isFinite(Number(prize?.cash)) && Number(prize.cash) > 0
          ? text(prize.cash, 60)
          : "";
        const currency = text(prize?.currencyCode, 12);
        const other = text(prize?.others, 160);
        const award = [rank, amount ? `${currency ? `${currency} ` : ""}${amount}` : "", other]
          .filter(Boolean).join(": ");
        return amount || other ? award : "";
      }).filter(Boolean).slice(0, 6)
    : [];

  const registrationDeadline =
    item.regnRequirements?.show_deadline === 1
      ? validDate(item.regnRequirements?.end_regn_dt)
      : null;
  const start = validDate(item.start_date);
  const end = validDate(item.end_date);

  return {
    id: `unstop:${id}`,
    external_id: id,
    source_name: "Unstop",
    name,
    organizer,
    description: text(item.details, 4000),
    location: mode === "online" ? "Online" : locationParts.join(", "),
    country,
    mode,
    latitude: validCoordinate(address.lat, -90, 90),
    longitude: validCoordinate(address.lng, -180, 180),
    starts_at: start,
    ends_at: end,
    registration_deadline: registrationDeadline,
    prize_pool: prizeParts.length ? prizeParts.join(" · ").slice(0, 500) : null,
    technologies,
    eligibility,
    registration_url: registrationUrl,
    source_url: UNSTOP_LISTING_URL,
    source_updated_at: validDate(item.updated_at),
    registration_open: item.regn_open === 1 || item.regn_open === true,
  };
}

function isExpired(event, now = Date.now()) {
  const endDate = event.ends_at ? Date.parse(event.ends_at) : NaN;
  if (Number.isFinite(endDate)) return endDate < now;
  const startDate = event.starts_at ? Date.parse(event.starts_at) : NaN;
  return Number.isFinite(startDate) && startDate < now;
}

function isRegistrationOpen(event, now = Date.now()) {
  if (isExpired(event, now)) return false;
  if (event.registration_deadline) {
    const deadline = Date.parse(event.registration_deadline);
    if (!Number.isFinite(deadline) || deadline < now) return false;
  }
  if (event.registration_open !== undefined) return event.registration_open;
  const start = event.starts_at ? Date.parse(event.starts_at) : NaN;
  return Number.isFinite(start) && start > now;
}

function getEventStatus(event, now = Date.now()) {
  if (isExpired(event, now)) return "expired";
  if (isRegistrationOpen(event, now)) return "open";
  const start = event.starts_at ? Date.parse(event.starts_at) : NaN;
  const end = event.ends_at ? Date.parse(event.ends_at) : NaN;
  return (Number.isFinite(start) && start >= now) ||
    (Number.isFinite(end) && end >= now)
    ? "upcoming"
    : "unknown";
}

function matchesSearch(event, search) {
  if (!search) return true;
  const needle = search.toLocaleLowerCase();
  return [
    event.name,
    event.organizer,
    ...(event.technologies || []),
  ].some((value) => String(value || "").toLocaleLowerCase().includes(needle));
}

function matchesTechnology(event, technology) {
  if (!technology) return true;
  const normalized = technology.toLocaleLowerCase();
  return (event.technologies || []).some(
    (item) => String(item).toLocaleLowerCase() === normalized
  );
}

function eventDistance(origin, event) {
  if (
    !origin ||
    event.mode === "online" ||
    validCoordinate(event.latitude, -90, 90) === null ||
    validCoordinate(event.longitude, -180, 180) === null
  ) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitude = Number(event.latitude);
  const longitude = Number(event.longitude);
  const dLat = radians(latitude - origin.latitude);
  const dLon = radians(longitude - origin.longitude);
  const lat1 = radians(origin.latitude);
  const lat2 = radians(latitude);
  const h = Math.min(1, Math.max(0,
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  ));
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function parseCoordinates(value, minimum, maximum) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
    throw new Error("Invalid location coordinates.");
  }
  return coordinate;
}

function configuredSupabase() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

function configuredSupabaseRead() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

async function fetchUnstopPage(page) {
  const url = new URL(UNSTOP_API);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(PAGE_SIZE));
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "SkillBridgeAI-HackathonRadar/1.0",
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Unstop returned HTTP ${response.status}.`);
  }
  const payload = await response.json();
  const rows = payload?.data?.data;
  if (!Array.isArray(rows)) {
    throw new Error("Unstop returned an unsupported event response.");
  }
  return rows;
}

async function fetchUnstopEvents() {
  const pageResults = await Promise.allSettled(
    Array.from({ length: MAX_PAGES }, (_unused, index) => fetchUnstopPage(index + 1))
  );
  const pages = pageResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const errors = pageResults
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason?.message || "Provider page request failed.");
  if (!pages.length) throw new Error(errors.join(" "));

  const seen = new Set();
  return {
    events: pages.flat()
      .map(sourceEventToRow)
      .filter((event) => {
        if (!event) return false;
        const key = event.registration_url.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    errors,
  };
}

async function persistUnstopEvents(events) {
  const config = configuredSupabase();
  if (!config || !events.length) return new Map();

  const existingUrl = new URL(`${config.url}/rest/v1/hackathons`);
  existingUrl.searchParams.set("select", "id,external_id,registration_url,verification_status,is_published");
  existingUrl.searchParams.set("source_name", "eq.Unstop");
  existingUrl.searchParams.set(
    "external_id",
    `in.(${events.map((event) => event.external_id).join(",")})`
  );
  const existingResponse = await fetch(existingUrl, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  if (!existingResponse.ok) {
    throw new Error(`Supabase event lookup failed (HTTP ${existingResponse.status}).`);
  }
  const existingRows = await existingResponse.json();
  if (!Array.isArray(existingRows)) {
    throw new Error("Supabase returned an invalid existing-event response.");
  }
  const existingBySourceId = new Map(
    existingRows.map((row) => [String(row.external_id), row])
  );
  const ids = new Map(existingRows.map((row) => [String(row.external_id), row.id]));
  const conflictingRegistrationUrls = new Set();
  for (let offset = 0; offset < events.length; offset += 25) {
    const chunk = events.slice(offset, offset + 25);
    const matchingUrl = new URL(`${config.url}/rest/v1/hackathons`);
    matchingUrl.searchParams.set("select", "id,source_name,external_id,registration_url");
    matchingUrl.searchParams.set(
      "registration_url",
      `in.(${chunk.map((event) => JSON.stringify(event.registration_url)).join(",")})`
    );
    const matchingResponse = await fetch(matchingUrl, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!matchingResponse.ok) {
      throw new Error(`Supabase URL deduplication lookup failed (HTTP ${matchingResponse.status}).`);
    }
    const matchingRows = await matchingResponse.json();
    if (!Array.isArray(matchingRows)) {
      throw new Error("Supabase returned an invalid URL deduplication response.");
    }
    for (const row of matchingRows) {
      const sourceId = String(row.external_id || "");
      const sameSourceEvent = row.source_name === "Unstop" &&
        existingBySourceId.get(sourceId)?.id === row.id;
      if (!sameSourceEvent) {
        conflictingRegistrationUrls.add(String(row.registration_url || "").toLowerCase());
      }
    }
  }
  const toUpsert = events.filter((event) => {
    const existing = existingBySourceId.get(event.external_id);
    return existing?.verification_status !== "verified" &&
      !conflictingRegistrationUrls.has(event.registration_url.toLowerCase());
  });
  if (!toUpsert.length) return ids;

  const response = await fetch(
    `${config.url}/rest/v1/hackathons?on_conflict=source_name,external_id`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(toUpsert.map((event) => ({
        source_name: event.source_name,
        external_id: event.external_id,
        name: event.name,
        organizer: event.organizer,
        description: event.description,
        location: event.location,
        country: event.country,
        mode: event.mode,
        latitude: event.latitude,
        longitude: event.longitude,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        registration_deadline: event.registration_deadline,
        prize_pool: event.prize_pool,
        technologies: event.technologies,
        eligibility: event.eligibility,
        registration_url: event.registration_url,
        source_url: event.source_url,
        source_updated_at: event.source_updated_at,
      }))),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    }
  );
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase event sync failed (HTTP ${response.status}): ${details.slice(0, 300)}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Supabase returned an invalid event sync response.");
  }
  for (const row of rows) ids.set(String(row.external_id), row.id);
  return ids;
}

async function updateRefreshMetadata({
  lastUpdated,
  resultCount,
  errorMessage = null,
  successful = false,
}) {
  const config = configuredSupabase();
  if (!config) return;
  const refresh = {
    source_name: "Unstop",
    last_attempt_at: new Date().toISOString(),
    last_error: errorMessage,
  };
  if (Number.isInteger(resultCount)) refresh.event_count = resultCount;
  if (successful) refresh.last_success_at = lastUpdated;

  const response = await fetch(
    `${config.url}/rest/v1/hackathon_feed_refreshes?on_conflict=source_name`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(refresh),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    }
  );
  if (!response.ok) {
    throw new Error(`Supabase refresh metadata sync failed (HTTP ${response.status}).`);
  }
}

async function fetchAdminVerifiedEvents() {
  const config = configuredSupabaseRead();
  if (!config) {
    return { events: [], status: "not_configured" };
  }
  const queryRows = async (select) => {
    const url = new URL(`${config.url}/rest/v1/hackathons`);
    url.searchParams.set("select", select);
    url.searchParams.set("is_published", "eq.true");
    url.searchParams.set("verification_status", "eq.verified");
    url.searchParams.set("order", "starts_at.asc.nullslast");
    const response = await fetch(url, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  };
  let { response, payload: rows } = await queryRows(
    "id,name,organizer,description,location,country,mode,latitude,longitude,starts_at,ends_at,registration_deadline,prize_pool,technologies,eligibility,registration_url,source_url,source_name,external_id,source_updated_at,verification_status,verified_at,is_published"
  );
  let status = "ok";
  if (
    response.status === 400 &&
    rows?.code === "42703" &&
    /^column hackathons\.(country|eligibility|source_name|external_id|source_updated_at) does not exist$/i.test(rows.message || "")
  ) {
    ({ response, payload: rows } = await queryRows(
      "id,name,organizer,description,location,mode,latitude,longitude,starts_at,ends_at,registration_deadline,prize_pool,technologies,registration_url,source_url,verification_status,verified_at,is_published"
    ));
    status = "partial";
  }
  if (!response.ok) {
    throw new Error(`Supabase verified events returned HTTP ${response.status}: ${rows?.message || "request failed"}`);
  }
  if (!Array.isArray(rows)) {
    throw new Error("Supabase returned an invalid verified-events response.");
  }
  return {
    events: rows.map((row) => ({
      ...row,
      source_name: row.source_name || "SkillBridge administrator",
      registration_open: undefined,
      persisted: true,
      provider_status: "verified",
    })),
    status,
  };
}

async function fetchProviders() {
  const [unstopResult, databaseResult] = await Promise.allSettled([
    fetchUnstopEvents(),
    fetchAdminVerifiedEvents(),
  ]);
  const providerStatuses = [];
  let sourceEvents = [];

  if (unstopResult.status === "fulfilled") {
    let ids = new Map();
    let persistenceStatus = "not_configured";
    if (configuredSupabase()) {
      try {
        ids = await persistUnstopEvents(unstopResult.value.events);
        persistenceStatus = "ok";
      } catch (error) {
        persistenceStatus = "error";
        console.error("Unstop-to-Supabase sync failed:", error.message);
      }
    }
    sourceEvents = unstopResult.value.events.map((event) => ({
      ...event,
      id: ids.get(event.external_id) || event.id,
      persisted: ids.has(event.external_id),
      provider_status: "source_listed",
    }));
    const persistenceError = persistenceStatus === "error"
      ? "Events could not be saved to Supabase; account save and team features may be unavailable."
      : null;
    providerStatuses.push({
      source: "Unstop",
      status: unstopResult.value.errors.length || persistenceError ? "partial" : "ok",
      count: sourceEvents.length,
      persistence: persistenceStatus,
      errors: [...unstopResult.value.errors, ...(persistenceError ? [persistenceError] : [])],
    });
  } else {
    providerStatuses.push({
      source: "Unstop",
      status: "error",
      error: unstopResult.reason?.message || "Provider request failed.",
    });
  }

  if (databaseResult.status === "fulfilled") {
    const databaseEvents = databaseResult.value.events;
    const verifiedByUrl = new Map(databaseEvents.map((event) => [
      String(event.registration_url || "").toLowerCase(),
      event,
    ]));
    sourceEvents = sourceEvents.map((event) => {
      const verified = verifiedByUrl.get(event.registration_url.toLowerCase());
      return verified
        ? {
            ...event,
            ...verified,
            registration_open: event.registration_open,
            provider_status: "verified",
            persisted: true,
          }
        : event;
    });
    const canonicalUrls = new Set(sourceEvents.map((event) => event.registration_url.toLowerCase()));
    sourceEvents.push(...databaseEvents.filter(
      (event) => !canonicalUrls.has(String(event.registration_url || "").toLowerCase())
    ));
    providerStatuses.push({
      source: "SkillBridge verified events",
      status: databaseResult.value.status,
      count: databaseEvents.length,
      ...(databaseResult.value.status === "partial"
        ? { error: "Optional source metadata columns are missing in the deployed schema; showing verified events without those fields." }
        : {}),
    });
  } else {
    providerStatuses.push({
      source: "SkillBridge verified events",
      status: "error",
      error: databaseResult.reason?.message || "Database request failed.",
    });
  }

  const hasUsableSource =
    unstopResult.status === "fulfilled" ||
    (databaseResult.status === "fulfilled" && databaseResult.value.events.length > 0);
  if (!hasUsableSource) {
    throw new Error(providerStatuses.map(({ source, error }) => `${source}: ${error}`).join(" "));
  }

  return { events: sourceEvents, providers: providerStatuses };
}

export async function refreshHackathons({ force = false } = {}) {
  if (!force && cache.expiresAt > Date.now()) return cache;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    let result;
    try {
      result = await fetchProviders();
    } catch (error) {
      try {
        await updateRefreshMetadata({ errorMessage: error.message });
      } catch (metadataError) {
        console.error("Unable to persist failed hackathon feed refresh:", metadataError.message);
      }
      throw error;
    }

    const lastUpdated = new Date().toISOString();
    cache = {
      expiresAt: Date.now() + CACHE_DURATION_MS,
      lastUpdated,
      ...result,
    };
    const unstopProvider = result.providers.find((provider) => provider.source === "Unstop");
    const syncErrors = [
      unstopProvider?.error,
      unstopProvider?.persistence === "error" ? "Event persistence failed." : null,
    ].filter(Boolean);
    try {
      await updateRefreshMetadata({
        lastUpdated,
        resultCount: result.events.length,
        errorMessage: syncErrors.join("; ") || null,
        successful: unstopProvider?.status === "ok" || unstopProvider?.status === "partial",
      });
    } catch (error) {
      console.error("Unable to persist hackathon feed refresh metadata:", error.message);
    }
    return cache;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function getHackathons(filters = {}) {
  const refreshed = await refreshHackathons({ force: filters.refresh === true });
  const search = String(filters.search || "").trim().slice(0, 120);
  const mode = String(filters.mode || "").trim().toLowerCase().slice(0, 20);
  const source = String(filters.source || "").trim().toLocaleLowerCase().slice(0, 100);
  const technology = String(filters.technology || "").trim().slice(0, 80);
  const status = String(filters.status || "upcoming").trim().toLowerCase().slice(0, 20);
  const city = String(filters.city || "").trim().toLocaleLowerCase().slice(0, 120);
  const radius = filters.radius === undefined ? null : Number(filters.radius);
  if (!["expired", "open", "upcoming", "all"].includes(status)) {
    throw new Error("Invalid hackathon status filter.");
  }
  if (radius !== null && (!Number.isFinite(radius) || radius < 0 || radius > 20000)) {
    throw new Error("Radius must be a valid distance in kilometers.");
  }
  const latitude = parseCoordinates(filters.latitude, -90, 90);
  const longitude = parseCoordinates(filters.longitude, -180, 180);
  if ((latitude === null) !== (longitude === null)) {
    throw new Error("Both latitude and longitude are required for radius filtering.");
  }
  const origin = latitude === null ? null : { latitude, longitude };
  const now = Date.now();

  let events = refreshed.events.filter((event) => {
    const expired = isExpired(event, now);
    const registrationOpen = isRegistrationOpen(event, now);
    const eventStatus = getEventStatus(event, now);
    if (status === "expired" && !expired) return false;
    if (status === "open" && !registrationOpen) return false;
    if (status === "upcoming" && !["open", "upcoming"].includes(eventStatus)) return false;
    if (mode && (mode === "online"
      ? !["online", "hybrid"].includes(event.mode)
      : event.mode !== mode)) return false;
    if (source && String(event.source_name || "").toLocaleLowerCase() !== source) return false;
    if (city && !`${event.location || ""} ${event.country || ""}`.toLocaleLowerCase().includes(city)) return false;
    if (!matchesSearch(event, search)) return false;
    if (!matchesTechnology(event, technology)) return false;
    if (origin && radius !== null) {
      if (event.mode === "online") return true;
      const distance = eventDistance(origin, event);
      if (distance === null || distance > radius) return false;
    }
    return true;
  });

  const sortBy = String(filters.sort || "date").toLowerCase();
  events.sort((left, right) => {
    const leftValue = Date.parse(sortBy === "deadline" ? left.registration_deadline : left.starts_at);
    const rightValue = Date.parse(sortBy === "deadline" ? right.registration_deadline : right.starts_at);
    if (!Number.isFinite(leftValue)) return Number.isFinite(rightValue) ? 1 : 0;
    if (!Number.isFinite(rightValue)) return -1;
    return sortBy === "date_desc" ? rightValue - leftValue : leftValue - rightValue;
  });

  const enriched = events.map((event) => ({
    ...event,
    registration_open: isRegistrationOpen(event, now),
    event_status: getEventStatus(event, now),
    distance_km: origin && event.mode !== "online"
      ? eventDistance(origin, event)
      : null,
  }));
  return {
    events: enriched,
    lastUpdated: refreshed.lastUpdated,
    cacheExpiresAt: new Date(refreshed.expiresAt).toISOString(),
    providers: refreshed.providers,
    refreshIntervalMs: CACHE_DURATION_MS,
  };
}

export async function getHackathonForExplanation(id) {
  const refreshed = await refreshHackathons();
  const event = refreshed.events.find(
    (candidate) => candidate.id === id && candidate.source_name === "Unstop"
  );
  if (!event) return null;
  return {
    name: event.name,
    organizer: event.organizer,
    description: event.description,
    location: event.location,
    country: event.country,
    mode: event.mode,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    registration_deadline: event.registration_deadline,
    technologies: event.technologies,
    eligibility: event.eligibility,
    source_name: event.source_name,
    source_url: event.source_url,
    registration_url: event.registration_url,
  };
}

export async function geocodeCity(city) {
  const normalizedCity = String(city || "").trim().replace(/\s+/g, " ");
  if (!normalizedCity || normalizedCity.length > 120) {
    throw new Error("Enter a city name between 1 and 120 characters.");
  }

  const cacheKey = normalizedCity.toLocaleLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const task = geocodeQueue.then(async () => {
    const wait = Math.max(0, 1000 - (Date.now() - lastGeocodeRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastGeocodeRequestAt = Date.now();

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", normalizedCity);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SkillBridgeAI-HackathonRadar/1.0 (city lookup)",
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`City lookup provider returned HTTP ${response.status}.`);
    }
    const results = await response.json();
    const result = Array.isArray(results) ? results[0] : null;
    const latitude = validCoordinate(result?.lat, -90, 90);
    const longitude = validCoordinate(result?.lon, -180, 180);
    if (!result || latitude === null || longitude === null) return null;

    const value = {
      city: normalizedCity,
      displayName: text(result.display_name, 240),
      latitude,
      longitude,
    };
    geocodeCache.set(cacheKey, { value, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    return value;
  });
  geocodeQueue = task.then(() => undefined, () => undefined);
  return task;
}

export function startHackathonFeedRefresh() {
  refreshHackathons()
    .catch((error) => console.error("Initial hackathon feed refresh failed:", error.message));
  const timer = setInterval(() => {
    refreshHackathons({ force: true })
      .catch((error) => console.error("Scheduled hackathon feed refresh failed:", error.message));
  }, CACHE_DURATION_MS);
  timer.unref?.();
  return timer;
}
