import {
  getRepository,
  getRepositoryFiles,
  getFileContent,
  getLatestCommit,
  getRepositoryLanguages,
  redactSecrets,
} from "../services/githubService.js";
import { analyzeRepository } from "../services/geminiService.js";

export async function auditRepository(req, res) {
  let auditStage = "GitHub";
  try {
    const repoUrl = req.body?.repoUrl;

    if (typeof repoUrl !== "string" || repoUrl.length > 300) {
      return res.status(400).json({ message: "A valid GitHub repository URL is required." });
    }

    let parsed;
    try {
      parsed = new URL(repoUrl.trim());
    } catch {
      return res.status(400).json({ message: "Invalid GitHub repository URL." });
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "github.com" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parts.length !== 2 ||
      !/^[A-Za-z0-9-]{1,39}$/.test(parts[0]) ||
      !/^[A-Za-z0-9._-]{1,100}$/.test(parts[1])
    ) {
      return res.status(400).json({ message: "Invalid GitHub repository URL." });
    }

    const [owner, rawRepo] = parts;
    const repo = rawRepo.replace(/\.git$/i, "");
    const repository = await getRepository(owner, repo);
    if (!Number.isFinite(Number(repository.size))) {
      return res.status(502).json({ message: "GitHub returned invalid repository metadata." });
    }
    if (Number(repository.size) > 50 * 1024) {
      return res.status(413).json({
        message: "This repository exceeds the 50 MB repository audit limit.",
      });
    }

    const files = await getRepositoryFiles(owner, repo, repository.default_branch);
    if (!files.length) {
      return res.status(422).json({ message: "No supported source files found in this repository." });
    }

    const [commitSha, languages, fetchedFiles] = await Promise.all([
      getLatestCommit(owner, repo, repository.default_branch),
      getRepositoryLanguages(owner, repo),
      Promise.all(files.map(async (file) => ({
        path: file.path,
        content: await getFileContent(owner, repo, file.path),
      }))),
    ]);

    let totalBytes = 0;
    const reviewedFiles = fetchedFiles.map((file) => {
      const content = redactSecrets(file.content).slice(0, 12000);
      totalBytes += Buffer.byteLength(content, "utf8");
      return { path: file.path, content };
    }).filter((file) => {
      if (totalBytes <= 100_000) return true;
      totalBytes -= Buffer.byteLength(file.content, "utf8");
      return false;
    });

    if (!reviewedFiles.length) {
      return res.status(422).json({ message: "No source files fit within the audit limits." });
    }

    auditStage = "Gemini";
    const analysis = await analyzeRepository(repository, reviewedFiles);

    return res.status(200).json({
      success: true,
      repository: {
        name: repository.full_name,
        url: repository.html_url,
        filesReviewed: reviewedFiles.length,
        files: reviewedFiles.map(({ path, content }) => ({
          path,
          bytesReviewed: Buffer.byteLength(content, "utf8"),
        })),
        languages,
        commitSha,
      },
      auditedAt: new Date().toISOString(),
      analysis,
    });
  } catch (error) {
    console.error("Repository audit error:", error.message);
    if (auditStage === "Gemini") {
      if (error.status === 504 || error.name === "TimeoutError" || error.name === "AbortError") {
        return res.status(504).json({
          message: "Gemini analysis timed out. Retry the audit; no report was generated.",
        });
      }
      if (error.status === 404) {
        return res.status(503).json({
          message: "The configured Gemini model is unavailable. Check the backend model configuration.",
        });
      }
      if (error.status === 401 || error.status === 403) {
        return res.status(503).json({
          message: "Gemini could not authorize this analysis. Check the backend API key and quota.",
        });
      }
      if (error.status === 429) {
        return res.status(503).json({
          message: "Gemini is temporarily rate limited. Try again later.",
        });
      }
      if (error.message.includes("not configured")) {
        return res.status(503).json({ message: error.message });
      }
      return res.status(502).json({
        message: "Gemini could not complete the repository analysis. You can retry.",
      });
    }
    if (error.status === 404) return res.status(404).json({ message: error.message });
    if (error.status === 403 || error.status === 429) return res.status(503).json({ message: error.message });
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({ message: "A repository or analysis provider timed out. You can retry." });
    }
    if (error.message.includes("not configured")) {
      return res.status(503).json({ message: error.message });
    }
    return res.status(502).json({ message: "Repository audit failed at an upstream service. You can retry." });
  }
}