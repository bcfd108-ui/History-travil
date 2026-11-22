import { archiveGap, coverageFor, photoEligibility } from "./photo-eligibility.mjs";
import { validateAssignments } from "./photo-assignments.mjs";
import { hasApprovedPhotoLicense } from "./photo-license.mjs";
import { checkNyPhotoAdvisory } from "./photo-ny-seed-license.mjs";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The desk signs off the pixels and item-level rights together. The digest
// prevents an unreviewed replacement from inheriting an earlier inspection.
export function publishPhotos(sites, appRoot) {
  const data = join(appRoot, "data");
  const read = name => JSON.parse(readFileSync(join(data, name), "utf8"));
  const records = read("historic-photos.json");
  const findings = read("photo-search.json");
  const ledger = readFileSync(join(data, "photo-desk", "assignments.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  console.log("Verified photo assignments", validateAssignments(read("photo-desk/targets.json"), sites, ledger, records));
  const slugs = new Set(sites.map(s => s.slug));
  for (const slug of Object.keys(records)) {
    if (!slugs.has(slug)) throw new Error("Photo has no published entry: " + slug);
  }
  const gaps = [];
  const counts = {};
  const fieldTargets = [];
  for (const site of sites) {
    const photos = records[site.slug] ?? [];
    if (!Array.isArray(photos)) throw new Error("Expected photo list: " + site.slug);
    const urls = new Set();
    for (const photo of photos) {
      const fail = msg => { throw new Error(site.slug + ": " + msg); };
      for (const key of ["credit", "license", "sourceName", "caption", "alt", "groundReview", "rightsReview"]) {
        if (typeof photo[key] !== "string" || !photo[key].trim()) fail("missing " + key);
      }
      for (const key of ["imageUrl", "sourceUrl", "licenseUrl"]) {
        if (new URL(photo[key]).protocol !== "https:") fail("invalid " + key);
      }
      if (!(checkNyPhotoAdvisory(site.slug, photo) ?? hasApprovedPhotoLicense(site.slug, photo))) fail("unverified free license");
      if (photo.year !== null && (!Number.isInteger(photo.year) || photo.year < 1820 || photo.year > new Date().getUTCFullYear())) fail("invalid photo year");
      if (photo.representative || photo.medium !== "photograph" || urls.has(photo.imageUrl)) fail("invalid or duplicate photographic record");
      urls.add(photo.imageUrl);
      if (!/^\/photos\/[a-z0-9-]+\.webp$/.test(photo.src) || !(photo.width > 0 && photo.height > 0)) fail("invalid display asset");
      const bytes = readFileSync(join(appRoot, "public", photo.src));
      if (bytes.toString("ascii", 8, 12) !== "WEBP" || createHash("sha256").update(bytes).digest("hex") !== photo.sha256) fail("display pixels differ from inspection");
    }
    site.photos = photos;
    const finding = findings[site.slug] ?? {};
    const eligibility = photoEligibility(site, finding);
    site.photoEligibility = eligibility;
    const coverage = coverageFor(photos);
    const state = counts[site.stateCode] ??= { none: 0, "then-only": 0, "now-only": 0, "complete pair": 0 };
    state[coverage]++;
    if (coverage === "complete pair") continue;

    const archive = eligibility === "ARCHIVAL-ONLY";
    const missing = coverage === "then-only" ? "NOW NEEDED" : coverage === "now-only" ? "THEN NEEDED" : "FIRST PHOTO NEEDED";
    const field = eligibility === "PUBLIC GROUND" && coverage !== "now-only";
    const viewpoint = field ? finding.groundReview.viewpoint : "";
    const action = archive ? "Desk — archival period photograph only" : field ? "Field option — " + viewpoint : "Desk — verify missing era and rights";
    const identity = [site.id, site.slug, site.title, site.town, site.state, "https://onoldground.com/sites/" + site.slug];
    gaps.push([...identity, finding.searched || "Awaiting first desk search", finding.reason || "Photo research pending.",
      action, coverage, eligibility, archive ? archiveGap : missing, archive ? finding.groundReview?.basis || "Access held in the entry record." : ""]);
    if (field) fieldTargets.push([...identity, missing, viewpoint]);
  }
  const csv = cell => '"' + String(cell ?? "").replaceAll('"', '""') + '"';
  const identityHeader = ["Entry ID", "Slug", "Entry", "Town", "State", "Entry URL"];
  const output = join(appRoot, "public", "desk");
  mkdirSync(output, { recursive: true });
  function writeCsv(name, rows) {
    writeFileSync(join(output, name), rows.map(row => row.map(csv).join(",")).join("\r\n") + "\r\n");
  }
  writeCsv("photo-gaps.csv", [[...identityHeader, "What was searched", "Why photo is needed", "Next desk or field action",
    "Coverage", "Eligibility", "Gap", "Access decision"], ...gaps]);
  writeCsv("field-photo-targets.csv", [[...identityHeader, "Gap", "Public viewpoint or permitted subject"], ...fieldTargets]);
  console.log("Photo coverage by state", JSON.stringify(counts));
}

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataset = join(appRoot, "data", "sites.json");
const sites = JSON.parse(readFileSync(dataset, "utf8"));
publishPhotos(sites, appRoot);
writeFileSync(dataset, JSON.stringify(sites, null, 1));
