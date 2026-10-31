const GITHUB_API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_FILE_BYTES = 30_000;
const MAX_FILES = 12;
const MAX_JSON_RESPONSE_BYTES = 1_000_000;
const MAX_TREE_RESPONSE_BYTES = 5_000_000;

function getGitHubHeaders(accept = "application/vnd.github+json") {
  const headers = {
    Accept: accept,
    "User-Agent": "SkillBridge-AI",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function githubFetch(url, accept) {
  const response = await fetch(url, {
    headers: getGitHubHeaders(accept),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const error = new Error(
      response.status === 404
        ? "Repository not found or it is private."
        : response.status === 403 || response.status === 429
          ? "GitHub API rate limit reached. Try again later."
          : `GitHub API returned HTTP ${response.status}.`
    );
    error.status = response.status;
    throw error;
  }
  return response;
}

async function readResponseText(response, maxBytes, errorMessage) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("GitHub returned an empty response.");

  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(errorMessage);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

async function readJsonResponse(response, maxBytes = MAX_JSON_RESPONSE_BYTES) {
  const body = await readResponseText(
    response,
    maxBytes,
    "GitHub response exceeds the review size limit."
  );
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("GitHub returned an invalid response.");
  }
}

export async function getRepository(owner, repo) {
  const response = await githubFetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  );
  const repository = await readJsonResponse(response);
  if (repository.private || !repository.default_branch || !repository.html_url) {
    throw new Error("Only accessible public repositories can be reviewed.");
  }
  return repository;
}

export async function getRepositoryFiles(owner, repo, branch) {
  const response = await githubFetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  const data = await readJsonResponse(response, MAX_TREE_RESPONSE_BYTES);
  if (data.truncated) {
    throw new Error("Repository file tree is too large to safely audit.");
  }

  const allowedExtensions = new Set([
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".java", ".cpp",
    ".c", ".h", ".go", ".rs", ".html", ".css", ".sql", ".php", ".rb",
  ]);
  const ignoredSegments = new Set([
    "node_modules", "dist", "build", "vendor", ".git", "coverage",
    ".next", "target", "venv", ".venv", "__pycache__",
  ]);
  const blockedNames = new Set([
    ".env", ".env.local", ".env.production", "package-lock.json",
    "pnpm-lock.yaml", "yarn.lock", "composer.lock", "poetry.lock",
  ]);

  return data.tree
    .filter((file) => {
      if (file.type !== "blob" || file.size > MAX_FILE_BYTES) return false;
      const segments = file.path.split("/");
      if (
        segments.some((segment) => ignoredSegments.has(segment)) ||
        segments.some((segment) => blockedNames.has(segment))
      ) return false;
      const extension = file.path.slice(file.path.lastIndexOf(".")).toLowerCase();
      return allowedExtensions.has(extension);
    })
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_FILES);
}

export async function getFileContent(owner, repo, path) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await githubFetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
    "application/vnd.github.raw+json"
  );
  return readResponseText(
    response,
    MAX_FILE_BYTES,
    `Selected file exceeds the review size limit: ${path}`
  );
}

export async function getLatestCommit(owner, repo, branch) {
  const response = await githubFetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(branch)}`
  );
  const commit = await readJsonResponse(response);
  return typeof commit.sha === "string" ? commit.sha : null;
}

export async function getRepositoryLanguages(owner, repo) {
  const response = await githubFetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`
  );
  const languages = await readJsonResponse(response);
  return Object.keys(languages).slice(0, 20);
}

export function redactSecrets(source) {
  return source
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED PRIVATE KEY]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED TOKEN]")
    .replace(/((?:api[_-]?key|secret|password|access[_-]?token|client[_-]?secret)\s*[:=]\s*["']?)[^\s"'`,;]+/gi, "$1[REDACTED]");
}
