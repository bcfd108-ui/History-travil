// One research run. Reads the queue, writes drafts, opens one pull request.
// A missing MACHINE_RESEARCH_OPENROUTER_KEY exits clean. A broken queue files an issue
// and stops. This process never merges and never pushes to main.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertRunBranch,
  completeWithProvider,
  entryFromDossier,
  groundFromOpenRuns,
  loadWorkerConfig,
  runResearch,
} from "../lib/machine-worker.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(appRoot, "..");

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(redact((result.stderr || result.stdout || `git ${args[0]} failed`).trim()));
  return result.stdout;
}

function loadGround() {
  const entries = [];
  const slugs = new Set();
  const seen = new Set();
  for (const dir of [join(repoRoot, "corpus"), repoRoot]) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.startsWith("HT-RES-") || !name.endsWith(".md") || seen.has(name)) continue;
      seen.add(name);
      const entry = entryFromDossier(name, readFileSync(join(dir, name), "utf8"));
      entries.push(entry);
      if (entry.slug) slugs.add(entry.slug);
    }
  }
  return { entries, slugs };
}

function writeSummary(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}

function redact(text) {
  let out = String(text || "");
  for (const secret of [process.env.GH_TOKEN, process.env.GITHUB_TOKEN, process.env[config.secretName]]) {
    if (secret && secret.length > 4) out = out.split(secret).join("[redacted]");
  }
  return out.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function gh(args) {
  const result = spawnSync("gh", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(redact((result.stderr || result.stdout || `gh ${args[0]} failed`).trim()));
  return result.stdout;
}

function repoSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = git(["remote", "get-url", "origin"]).trim();
  const match = url.match(/github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?$/);
  if (!match) throw new Error("could not read the GitHub repository from origin");
  return match[1];
}

function loadOpenRunGround() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  if (!token.trim()) throw new Error("No GitHub token was available to read open research-run pull requests.");
  const listed = JSON.parse(gh(["pr", "list", "--state", "open", "--limit", "200", "--json", "number,headRefName,files"]));
  const repo = repoSlug();
  return groundFromOpenRuns(listed, (path, branch) => {
    const route = `repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    return gh(["api", "-H", "Accept: application/vnd.github.raw", route]);
  });
}

async function fileIssue({ title, body }) {
  const result = spawnSync("gh", ["issue", "create", "--title", title, "--body", redact(body)], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(redact((result.stderr || "could not file the issue").trim()));
}

async function openPr({ branch, title, body, files }) {
  assertRunBranch(branch);
  for (const file of files) {
    const path = join(repoRoot, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content);
  }
  git(["checkout", "-B", branch]);
  git(["add", "--", ...files.map((file) => file.path)]);
  git([
    "-c", "user.name=github-actions[bot]",
    "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
    "commit", "-m", title,
  ]);
  git(["push", "origin", `HEAD:refs/heads/${branch}`]);
  const pr = spawnSync(
    "gh",
    ["pr", "create", "--base", "main", "--head", branch, "--title", title, "--body", redact(body)],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (pr.status !== 0) throw new Error(redact((pr.stderr || "could not open the pull request").trim()));
}

let config;
try {
  config = loadWorkerConfig(appRoot);
} catch {
  // Invalid config cannot choose a credential or initiate a GitHub/provider call.
  console.error("Research worker config is invalid. Nothing was researched.");
  process.exit(1);
}
const key = process.env[config.secretName] || "";
let openGround = { entries: [], slugs: [], skipIds: [], problems: [] };
if (String(key).trim()) {
  try {
    openGround = loadOpenRunGround();
  } catch (error) {
    const summary = `The research run stopped before researching. Open research-run pull requests could not be read. ${redact(error.message)}`;
    try {
      await fileIssue({ title: "Machine research run stopped: could not read open runs", body: summary });
    } catch (issueError) {
      console.error(redact(issueError.message));
    }
    writeSummary(summary);
    process.exit(1);
  }
  if (openGround.problems.length) {
    const summary = `The research run stopped before researching. An open research-run pull request could not be read in full.\n${openGround.problems.join("\n")}`;
    try {
      await fileIssue({ title: "Machine research run stopped: could not read open runs", body: summary });
    } catch (issueError) {
      console.error(redact(issueError.message));
    }
    writeSummary(summary);
    process.exit(1);
  }
}
const queueText = readFileSync(join(appRoot, "data", "machine", "research-queue.json"), "utf8");
const ground = loadGround();
try {
  const result = await runResearch({
    config,
    key,
    queueText,
    entries: [...ground.entries, ...openGround.entries],
    existingSlugs: new Set([...ground.slugs, ...openGround.slugs]),
    skipIds: openGround.skipIds,
    now: new Date(),
    runId: process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
    complete: completeWithProvider,
    openPr,
    fileIssue,
  });
  writeSummary(result.summary);
  process.exit(result.exitCode);
} catch (error) {
  const summary = `The research run failed and stopped. ${redact(error.message)}`;
  try {
    await fileIssue({ title: "Machine research run failed", body: summary });
  } catch (issueError) {
    console.error(redact(issueError.message));
  }
  writeSummary(summary);
  process.exit(1);
}
