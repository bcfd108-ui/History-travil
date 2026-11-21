// Build-time check for the Phase 1 queues (runs in `npm run build` after
// the converter has refreshed data/sites.json). Regenerates the three queue
// files in memory and fails LOUDLY when a committed file differs, and when
// the regenerated documents fail schema validation.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildQueues, diffText, schemaProblems, stableStringify } from "../lib/machine-queue.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const queues = buildQueues(appRoot);
const problems = schemaProblems(queues);
const files = [
  ["research-queue.json", queues.research],
  ["verification-queue.json", queues.verification],
  ["photo-queue.json", queues.photo],
];
for (const [name, doc] of files) {
  const path = join(appRoot, "data", "machine", name);
  let committed = "";
  try {
    committed = readFileSync(path, "utf8");
  } catch {
    problems.push(`${name} is not committed at data/machine/${name}`);
    continue;
  }
  const diff = diffText(stableStringify(doc), committed);
  if (diff) problems.push(`data/machine/${name} does not match its sources (${diff})`);
}
const research = queues.research.counts;
const photo = queues.photo;
console.log(
  `machine: research ${research.items}; verification ${queues.verification.counts.items}; photo ${photo.counts.items} (${photo.status})`,
);
if (problems.length) {
  console.error("MACHINE QUEUE CHECK FAILED");
  console.error(problems.map((problem) => `  ${problem}`).join("\n"));
  process.exit(1);
}
console.log("machine: queue check passed — committed files match a fresh build");
