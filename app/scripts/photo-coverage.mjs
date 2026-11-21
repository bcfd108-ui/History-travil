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
  const slugs = new Set(sites.map(s => s.slug));
  for (const slug of Object.keys(records)) {
    if (!slugs.has(slug)) throw new Error("Photo has no published entry: " + slug);
  }
  const gaps = [];
  const counts = {};
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
      if (!/^(Public domain\b|CC0\b|CC BY(?:-SA)? [1-4]\.0\b|CC BY(?:-SA)? 2\.5\b)/i.test(photo.license)) fail("unverified free license");
      if (photo.year !== null && (!Number.isInteger(photo.year) || photo.year < 1820 || photo.year > new Date().getUTCFullYear())) fail("invalid photo year");
      if (photo.representative || photo.medium !== "photograph" || urls.has(photo.imageUrl)) fail("invalid or duplicate photographic record");
      urls.add(photo.imageUrl);
      if (!/^\/photos\/[a-z0-9-]+\.webp$/.test(photo.src) || !(photo.width > 0 && photo.height > 0)) fail("invalid display asset");
      const bytes = readFileSync(join(appRoot, "public", photo.src));
      if (bytes.toString("ascii", 8, 12) !== "WEBP" || createHash("sha256").update(bytes).digest("hex") !== photo.sha256) fail("display pixels differ from inspection");
    }
    site.photos = photos;
    const status = photos.length ? "has verified photo" : "gap-listed";
    const state = counts[site.stateCode] ??= { withPhoto: 0, withoutPhoto: 0 };
    if (photos.length) state.withPhoto++;
    else {
      state.withoutPhoto++;
      gaps.push({ site, finding: findings[site.slug] ?? { searched: "Awaiting first desk search", reason: "New entry. Photo research pending.", lane: "Desk" } });
    }
    console.log("PHOTO | " + site.stateCode + " | " + site.slug + " | " + status);
  }
  const csv = cell => '"' + String(cell ?? "").replaceAll('"', '""') + '"';
  const header = ["Entry", "Town", "State", "Entry URL", "What was searched", "Why photo is needed", "Next desk or field action"];
  const lines = [header, ...gaps.map(({site, finding}) => [site.title, site.town, site.state, "https://onoldground.com/sites/" + site.slug, finding.searched, finding.reason, finding.lane])];
  const output = join(appRoot, "public", "desk");
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, "photo-gaps.csv"), lines.map(r => r.map(csv).join(",")).join("\r\n") + "\r\n");
  console.log("Photo coverage by state", JSON.stringify(counts));
}

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataset = join(appRoot, "data", "sites.json");
const sites = JSON.parse(readFileSync(dataset, "utf8"));
publishPhotos(sites, appRoot);
writeFileSync(dataset, JSON.stringify(sites, null, 1));
