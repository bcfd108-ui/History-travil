// Fails the build when the worker config and the workflow disagree, or when
// a secret-shaped value has been committed.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { configProblems, workflowCron } from "../lib/machine-worker.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(appRoot, "..");
const config = JSON.parse(readFileSync(join(appRoot, "machine", "worker.config.json"), "utf8"));
const workflow = readFileSync(join(repoRoot, ".github", "workflows", "machine-research.yml"), "utf8");
const runner = readFileSync(join(appRoot, "scripts", "machine-research.mjs"), "utf8");
const problems = configProblems(config);

if (workflowCron(workflow) !== config.schedule) {
  problems.push(`workflow cron ${workflowCron(workflow) || "(missing)"} does not match worker config schedule ${config.schedule}`);
}
if (!workflow.includes("secrets.MACHINE_RESEARCH_KEY")) problems.push("workflow does not read MACHINE_RESEARCH_KEY");
if (/push origin (main|master)|HEAD:(main|master)/.test(runner)) problems.push("runner can push to main");
if (!runner.includes("assertRunBranch")) problems.push("runner does not guard the publish branch");
if (!runner.includes("groundFromOpenRuns")) problems.push("runner does not read open research-run pull requests");

const secretShape = /(sk-|xai-|ghp_|github_pat_|AKIA)[A-Za-z0-9]|YOUR_API_KEY|changeme|replace-me/i;
for (const [label, text] of [
  ["worker.config.json", JSON.stringify(config)],
  ["machine-research.yml", workflow],
  ["machine-research.mjs", runner],
]) {
  if (secretShape.test(text)) problems.push(`${label} contains a secret-shaped value`);
}

if (problems.length) {
  console.error("MACHINE WORKER CHECK FAILED");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`machine: worker check passed — ${config.provider} / ${config.model}, cap ${config.perRunCap}, ${config.schedule}`);
