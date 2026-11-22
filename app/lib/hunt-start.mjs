import { computeHuntProgress } from "./hunts-core.mjs";

/** One anchor format shared by links and their rendered find cards. */
export function findAnchor(n) {
  return `find-${n}`;
}

/**
 * Navigation only. Reading and choosing where to begin never creates a check-in,
 * asks for location, or changes existing completion or badge rules.
 * @template {{ n: number, label: string, tiedSlug: string | null, status: string }} T
 * @param {T[]} finds
 * @param {Parameters<typeof computeHuntProgress>[1]} checkins
 * @param {boolean} active
 * @returns {{kind: "browse" | "start" | "resume" | "complete", find: T | null}}
 */
export function huntStart(finds, checkins, active) {
  if (!active) return { kind: "browse", find: null };
  const choices = finds.filter((f) => f.status === "active" && !!f.tiedSlug)
    .sort((a, b) => a.n - b.n);
  if (choices.length === 0) return { kind: "browse", find: null };
  const progress = computeHuntProgress(choices, checkins);
  if (progress.complete) return { kind: "complete", find: null };
  if (!progress.done) return { kind: "start", find: choices[0] };
  const next = choices.find((f) => !progress.checkedKeys.has(`${f.tiedSlug}::${f.label}`));
  return { kind: "resume", find: next ?? null };
}
