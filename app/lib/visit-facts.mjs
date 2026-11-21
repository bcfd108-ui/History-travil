// An editor selects the field, edits the display value and pins the passage.
// Passage numbers in the ledger and the desk report are one-based.
import { createHash } from "node:crypto";

export const visitLabels = {
  go: "Go to", address: "Address", hours: "Hours", admission: "Admission",
  phone: "Phone", website: "Website", closed: "Closed", boundary: "Where you may stand",
  parking: "Parking", accessibility: "Accessibility", research: "Research access",
  check: "Check before you go",
};

export function evidenceText(site, field) {
  if (field.startsWith("locator.extra.")) {
    const key = field.slice("locator.extra.".length);
    return site.locator.extra.find(item => item.key === key)?.value;
  }
  if (/^locator\.(stableName|address|operator)$/.test(field)) return site.locator[field.slice(8)];
  const paragraph = /^(access|sources)\[(\d+)\]$/.exec(field);
  if (paragraph) return site[paragraph[1]].split("\n\n")[Number(paragraph[2]) - 1];
  if (["access", "story", "thenNow", "stillThere", "progression", "lead", "standfirst"].includes(field)) return site[field];
}

export function checkEntry(site, record, top) {
  const issues = [];
  const approved = [site.slug, top, record.rows, record.warning || null, !!record.reading, record.voices || []];
  if (createHash("sha256").update(JSON.stringify(approved)).digest("hex") !== record.reviewDigest)
    issues.push("edited copy or slug needs review");
  if (!top?.sections?.length) issues.push("missing plain top");
  if (!record.rows.go) issues.push("missing Go to row");
  for (const [field, hash] of Object.entries(record.evidence)) {
    const text = evidenceText(site, field);
    if (typeof text !== "string" || createHash("sha256").update(text).digest("hex") !== hash)
      issues.push("changed or missing dossier field " + field);
  }
  const all = { ...record.rows, ...(record.warning && { warning: record.warning }) };
  for (const [key, fact] of Object.entries(all)) {
    if (key !== "warning" && !Object.hasOwn(visitLabels, key)) issues.push("unrecognized row " + key);
    if (!fact.value.trim() || /\n|\[\d|\*\*/.test(fact.value)) issues.push("invalid display value for " + key);
    if (!fact.from.length || fact.from.some(field => !record.evidence[field] || !evidenceText(site, field)?.trim()))
      issues.push("missing evidence for " + key);
    if (key === "website" && (!/^https?:\/\//.test(fact.value) ||
        !fact.from.some(field => field.startsWith("sources[") && evidenceText(site, field)?.includes(fact.value))))
      issues.push("website missing from the recorded sources");
  }
  if (record.reading && (!record.warning || record.rows.go?.value !== "No visitable ground — reading entry")) issues.push("reading boundary missing");
  return issues;
}
