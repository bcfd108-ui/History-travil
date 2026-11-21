import type { SupabaseClient } from "@supabase/supabase-js";
import type { HuntFind } from "./hunts";
import { haversineKm, type LatLon } from "./geo";

export type FindRef = Pick<HuntFind, "id" | "entrySlug" | "legacyLabels">;
export type Book = { objects: Map<string, boolean>; legacy: Set<string> };
export const receiptName = (hunt: string, f: FindRef) => [hunt, f.id, f.entrySlug].join(".");

export function checked(book: Book, hunt: string, f: FindRef) {
  return !!f.entrySlug && (book.objects.has(receiptName(hunt, f)) ||
    f.legacyLabels.some(label => book.legacy.has(f.entrySlug + "::" + label)));
}

// Store a check and its optional photo as ONE private scrapbook object.
// Catalog publishes need no second ingest into the Postgres sites table.
// Its immutable key makes concurrent taps and retries count exactly once.
export async function readBook(db: SupabaseClient, uid: string): Promise<Book> {
  const objects = new Map<string, boolean>();
  const legacy = new Set<string>();
  async function receipts() {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await db.storage.from("scrapbook").list(uid + "/hunt-checks", {
        limit: 100, offset, sortBy: { column: "name", order: "asc" }
      });
      if (error) throw error;
      for (const obj of data) if (obj.id) objects.set(obj.name, !!obj.metadata?.mimetype?.startsWith("image/"));
      if (data.length < 100) break;
    }
  }
  async function oldTags() {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await db.from("checkins").select("site_slug,find_label")
        .eq("user_id", uid).order("id").range(offset, offset + 99);
      if (error) throw error;
      for (const row of data) legacy.add(row.site_slug + "::" + row.find_label);
      if (data.length < 100) break;
    }
  }
  await Promise.all([receipts(), oldTags()]);
  return { objects, legacy };
}

export async function checkGround(db: SupabaseClient, uid: string, hunt: string, f: HuntFind,
  position: LatLon, photo: File | null) {
  if (!f.entrySlug) throw new Error("This find is still in preparation.");
  if (!Number.isFinite(position.lat) || !Number.isFinite(position.lon) ||
      Math.abs(position.lat) > 90 || Math.abs(position.lon) > 180) throw new Error("Try again for a fresh location.");
  if (f.point && f.vicinityKm && haversineKm(position, f.point) > f.vicinityKm)
    throw new Error("Your position is outside this find’s area. Check in from the public ground in the entry.");
  if (photo && !photo.type.startsWith("image/")) throw new Error("Choose an image file for your scrapbook.");
  const metadata = { hunt, find: f.id, entry: f.entrySlug, ...position, checkedAt: new Date().toISOString() };
  const bucket = db.storage.from("scrapbook");
  const path = uid + "/hunt-checks/" + receiptName(hunt, f);
  const body = photo || new Blob([JSON.stringify(metadata)], { type: "application/json" });
  const { error } = await bucket.upload(path, body, { metadata, upsert: false });
  if (!error) return !!photo;
  // A different device may already have saved this exact find.
  const prior = await bucket.info(path);
  if (prior.data) return !!prior.data.contentType?.startsWith("image/");
  throw error;
}
