// Strict worker/desk workflow contract check. The workflow itself is desk-owned.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { configProblems, SECRET_NAME, WORKFLOW_PATH, workflowCron } from "../lib/machine-worker.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(appRoot, "..");
const configPath = join(appRoot, "machine", "worker.config.json");
const runnerPath = join(appRoot, "scripts", "machine-research.mjs");
const configText = readFileSync(configPath, "utf8");
const config = JSON.parse(configText);
const runner = readFileSync(runnerPath, "utf8");
const problems = configProblems(config);
const args = process.argv.slice(2);
let workflow;
if (args.length && (args.length !== 2 || args[0] !== "--workflow" || !args[1])) {
  problems.push("usage: check-machine-worker.mjs [--workflow PATH]");
} else {
  const workflowPath = args.length ? resolve(args[1]) : join(repoRoot, WORKFLOW_PATH);
  try {
    workflow = readFileSync(workflowPath, "utf8");
  } catch (error) {
    problems.push(error.code === "ENOENT"
      ? `research workflow missing: ${args[1] || WORKFLOW_PATH}; for a desk-held copy use --workflow PATH`
      : "research workflow could not be read");
  }
}

const builderSlot = "MACHINE_BUILDER_KEY";
const retiredSlot = "MACHINE_RESEARCH_KEY";
const rejectOtherSlots = (label, text) => {
  for (const token of [builderSlot, retiredSlot]) {
    if (text.includes(token)) problems.push(`${label}: ${token} is forbidden in research workflow and runtime`);
  }
};
if (workflow !== undefined) {
  if (workflowCron(workflow) !== config.schedule) {
    problems.push(`workflow cron ${workflowCron(workflow) || "(missing)"} does not match worker config schedule ${config.schedule}`);
  }
  rejectOtherSlots("research workflow", workflow);
  const bindings = [];
  // Reject bracket/dynamic access or whole-context export as well as extra secrets.
  // Only the named inference secret and the normal GitHub repository token may be read.
  for (const expression of workflow.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
    for (const secretUse of expression[1].matchAll(/\bsecrets\b(?:\s*\.\s*([\w-]+))?/gi)) {
      const name = secretUse[1];
      if (!name || ![SECRET_NAME, "GITHUB_TOKEN"].includes(name)) problems.push("unapproved workflow secret reference");
      if (name === SECRET_NAME) bindings.push(expression[1].trim());
    }
  }
  const mapping = new RegExp(`^[ \\t]+${SECRET_NAME}:[ \\t]*["']?\\$\\{\\{[ \\t]*secrets\\.${SECRET_NAME}[ \\t]*\\}\\}["']?[ \\t]*(?:#.*)?$`, "gm");
  if (bindings.length !== 1 || [...workflow.matchAll(mapping)].length !== 1) {
    problems.push(`workflow must map exactly one ${SECRET_NAME} secret to its same-named environment slot`);
  }
}
if (/push origin (main|master)|HEAD:(main|master)/.test(runner)) problems.push("runner can push to main");
if (!runner.includes("assertRunBranch")) problems.push("runner does not guard the publish branch");
if (!runner.includes("groundFromOpenRuns")) problems.push("runner does not read open research-run pull requests");

const secretShape = /(?:^|[^\w])(?:sk-|xai-|ghp_|github_pat_|AKIA)[A-Za-z0-9]|YOUR_API_KEY|changeme|replace-me/i;
for (const [label, text] of [
  ["worker.config.json", configText],
  ["research workflow", workflow ?? ""],
  ["machine-research.mjs", runner],
  ["machine-worker.mjs", readFileSync(join(appRoot, "lib", "machine-worker.mjs"), "utf8")],
]) {
  if (secretShape.test(text)) problems.push(`${label} contains a secret-shaped value`);
}

// Traverse the research code/config trees, not historical corpus/data or dependencies.
// Tests and this checker necessarily contain the reserved identifiers as negative controls.
function scanRuntime(path) {
  for (const item of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, item.name);
    if (item.isDirectory()) {
      if (!["node_modules", "__tests__", "test", "tests", "fixtures"].includes(item.name)) scanRuntime(child);
    } else if (item.isFile() && child !== fileURLToPath(import.meta.url)
      && !/\.(?:test|spec)\.[^.]+$/i.test(item.name) && !/\.(?:md|mdx)$/i.test(item.name)) {
      rejectOtherSlots(relative(appRoot, child), readFileSync(child, "utf8"));
    }
  }
}
for (const dir of ["lib", "scripts", "machine"]) scanRuntime(join(appRoot, dir));
rejectOtherSlots("package.json", readFileSync(join(appRoot, "package.json"), "utf8"));

if (problems.length) {
  console.error("MACHINE WORKER CHECK FAILED");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`machine: worker check passed — ${config.provider} / ${config.model}, cap ${config.perRunCap}, ${config.schedule}`);
