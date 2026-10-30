import {
  getRepository,
  getRepositoryFiles,
  getFileContent,
} from "../services/githubService.js";

import { analyzeRepository } from "../services/geminiService.js";

export async function auditRepository(req, res) {
  try {
    const { repoUrl } = req.body;

    if (typeof repoUrl !== "string" || repoUrl.length > 300) {
      return res.status(400).json({
        message: "A valid GitHub repository URL is required.",
      });
    }

    const match = repoUrl.match(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/
    );

    if (!match) {
      return res.status(400).json({
        message: "Invalid GitHub repository URL.",
      });
    }

    const [, owner, repo] = match;

    const repository = await getRepository(owner, repo);
    const files = await getRepositoryFiles(
      owner,
      repo,
      repository.default_branch
    );

    if (!files.length) {
      return res.status(400).json({
        message: "No supported source files found in this repository.",
      });
    }

    const reviewedFiles = await Promise.all(
      files.map(async (file) => ({
        path: file.path,
        content: (await getFileContent(owner, repo, file.path)).slice(0, 12000),
      }))
    );

    const analysis = await analyzeRepository(repository, reviewedFiles);

    return res.status(200).json({
      success: true,
      repository: {
        name: repository.full_name,
        url: repository.html_url,
        filesReviewed: reviewedFiles.length,
      },
      analysis,
    });
  } catch (error) {
    console.error("Repository audit error:", error.message);

    return res.status(500).json({
      message: error.message || "Repository audit failed.",
    });
  }
}