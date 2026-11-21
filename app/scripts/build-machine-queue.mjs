// Rebuild the Phase 1 queues from desk/machine-sources, the corpus, and
// data/sites.json when the converter has already written it. No network.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildQueues, stableStringify } from "../lib/machine-queue.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const queues = buildQueues(appRoot);
const outDir = join(appRoot, "data", "machine");
mkdirSync(outDir, { recursive: true });
const files = {
  "research-queue.json": queues.research,
  "verification-queue.json": queues.verification,
  "photo-queue.json": queues.photo,
};
for (const [name, doc] of Object.entries(files)) {
  writeFileSync(join(outDir, name), stableStringify(doc));
}
const research = queues.research.counts;
const verification = queues.verification.counts;
const photo = queues.photo;
console.log(`machine queue: research ${research.items} (${Object.entries(research.byQueueState).map(([k, v]) => `${k} ${v}`).join(", ")})`);
console.log(`machine queue: research by state ${Object.entries(research.byState).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`machine queue: verification ${verification.items} (${verification.dated} dated, ${verification.unrecorded} unrecorded)`);
console.log(`machine queue: photo ${photo.status} (${photo.counts.items})`);
