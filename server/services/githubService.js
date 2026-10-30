
const GITHUB_API = "https://api.github.com";

function getGitHubHeaders(accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    "User-Agent": "SkillBridge-AI",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
}

export async function getRepository(owner, repo) {
  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: getGitHubHeaders() }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found or it is private.");
    }

    if (response.status === 403 || response.status === 429) {
      throw new Error("GitHub API rate limit reached. Check your GitHub token and try again.");
    }

    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

export async function getRepositoryFiles(owner, repo, branch) {
  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: getGitHubHeaders() }
  );

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error("GitHub API rate limit reached while retrieving repository files.");
    }

    throw new Error(`Unable to retrieve repository files. GitHub status: ${response.status}`);
  }

  const data = await response.json();

  if (data.truncated) {
    throw new Error("Repository is too large for this MVP audit.");
  }

  const allowedExtensions = [
    ".js", ".jsx", ".ts", ".tsx",
    ".py", ".java", ".cpp", ".c",
    ".html", ".css", ".sql",
  ];

  const ignoredFolders = [
    "node_modules/",
    "dist/",
    "build/",
    "vendor/",
    ".git/",
    "coverage/",
  ];

  return data.tree
    .filter((file) => {
      if (file.type !== "blob") return false;
      if (file.size > 30000) return false;

      if (ignoredFolders.some((folder) => file.path.includes(folder))) {
        return false;
      }

      return allowedExtensions.some((ext) => file.path.endsWith(ext));
    })
    .sort((a, b) => a.size - b.size)
    .slice(0, 12);
}

export async function getFileContent(owner, repo, path) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");

  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
    {
      headers: getGitHubHeaders("application/vnd.github.raw+json"),
    }
  );

  if (!response.ok) {
    throw new Error(`Unable to read ${path}. GitHub status: ${response.status}`);
  }

  return response.text();
}
