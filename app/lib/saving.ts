// Saving operations — every read/write a signed-in visitor can make against
// their own rows. All functions take the browser client from
// lib/supabase/client and are only called when it exists and a user is
// signed in; Row Level Security (see supabase/migrations) enforces
// owner-only access in the database itself, so these helpers never filter
// by user id by hand — the policies do, and a missing policy would fail
// loudly rather than leak.
//
// There is deliberately no local-storage fallback in this module: if saving
// is not connected, the UI says so and nothing is persisted anywhere.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Plan {
  id: string;
  name: string;
  created_at: string;
  items: { site_slug: string; position: number }[];
}

export interface Checkin {
  id: string;
  site_slug: string;
  hunt_slug: string | null;
  find_label: string;
  photo_storage_path: string | null;
  claim_lat: number | null;
  claim_lon: number | null;
  claimed_at: string;
}

export interface Stamp {
  site_slug: string;
  first_claimed_at: string;
  claim_count: number;
}

export interface NotebookEntry {
  id: string;
  site_slug: string;
  body: string;
  updated_at: string;
}

export interface FieldReport {
  id: string;
  site_slug: string | null;
  body: string;
  status: "pending_qc" | "accepted" | "declined";
  created_at: string;
}

export interface StudyRequest {
  id: string;
  topic: string;
  place: string;
  body: string;
  status: "pending_qc" | "accepted" | "declined";
  created_at: string;
}

export interface PhotoSubmission {
  id: string;
  site_slug: string;
  storage_path: string;
  caption: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

function fail(error: { message: string } | null): string | null {
  return error ? error.message : null;
}

// --- plans -----------------------------------------------------------------

export async function listPlans(db: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await db
    .from("plans")
    .select("id, name, created_at, plan_items(site_slug, position)")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    items: [...((p.plan_items as Plan["items"]) || [])].sort(
      (a, b) => a.position - b.position,
    ),
  }));
}

export async function createPlan(
  db: SupabaseClient,
  userId: string,
  name: string,
): Promise<string | null> {
  return fail(
    (await db.from("plans").insert({ user_id: userId, name })).error,
  );
}

export async function addToPlan(
  db: SupabaseClient,
  planId: string,
  siteSlug: string,
  position: number,
): Promise<string | null> {
  return fail(
    (
      await db
        .from("plan_items")
        .insert({ plan_id: planId, site_slug: siteSlug, position })
    ).error,
  );
}

export async function removeFromPlan(
  db: SupabaseClient,
  planId: string,
  siteSlug: string,
): Promise<string | null> {
  return fail(
    (
      await db
        .from("plan_items")
        .delete()
        .eq("plan_id", planId)
        .eq("site_slug", siteSlug)
    ).error,
  );
}

// --- check-ins and the stamp book ------------------------------------------

export async function listCheckins(db: SupabaseClient): Promise<Checkin[]> {
  const { data, error } = await db
    .from("checkins")
    .select(
      "id, site_slug, hunt_slug, find_label, photo_storage_path, claim_lat, claim_lon, claimed_at",
    )
    .order("claimed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Checkin[];
}

/** The stamp book is derived from check-ins by the `stamps` view — never stored. */
export async function listStamps(db: SupabaseClient): Promise<Stamp[]> {
  const { data, error } = await db
    .from("stamps")
    .select("site_slug, first_claimed_at, claim_count")
    .order("first_claimed_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Stamp[];
}

export async function claimFind(
  db: SupabaseClient,
  userId: string,
  args: {
    siteSlug: string;
    findLabel: string;
    photo: File | null;
    claimPoint: { lat: number; lon: number } | null;
    /** Set when the claim is a hunt find check (the hunt's slug). */
    huntSlug?: string | null;
  },
): Promise<string | null> {
  let photoPath: string | null = null;
  if (args.photo) {
    const ext = (args.photo.name.split(".").pop() || "jpg").toLowerCase();
    photoPath = `${userId}/${args.siteSlug}/${Date.now()}.${ext}`;
    const up = await db.storage
      .from("scrapbook")
      .upload(photoPath, args.photo, { upsert: false });
    if (up.error) return up.error.message;
  }
  return fail(
    (
      await db.from("checkins").insert({
        user_id: userId,
        site_slug: args.siteSlug,
        find_label: args.findLabel,
        hunt_slug: args.huntSlug ?? null,
        photo_storage_path: photoPath,
        claim_lat: args.claimPoint?.lat ?? null,
        claim_lon: args.claimPoint?.lon ?? null,
      })
    ).error,
  );
}

// --- notebook ---------------------------------------------------------------

export async function getNotebookEntry(
  db: SupabaseClient,
  siteSlug: string,
): Promise<NotebookEntry | null> {
  const { data, error } = await db
    .from("notebook")
    .select("id, site_slug, body, updated_at")
    .eq("site_slug", siteSlug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as NotebookEntry) || null;
}

export async function listNotebook(db: SupabaseClient): Promise<NotebookEntry[]> {
  const { data, error } = await db
    .from("notebook")
    .select("id, site_slug, body, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as NotebookEntry[];
}

export async function saveNotebookEntry(
  db: SupabaseClient,
  userId: string,
  siteSlug: string,
  body: string,
): Promise<string | null> {
  return fail(
    (
      await db
        .from("notebook")
        .upsert(
          { user_id: userId, site_slug: siteSlug, body },
          { onConflict: "user_id,site_slug" },
        )
    ).error,
  );
}

// --- field reports and study requests (candidates, pending QC) --------------

export async function submitFieldReport(
  db: SupabaseClient,
  userId: string,
  siteSlug: string | null,
  body: string,
): Promise<string | null> {
  return fail(
    (
      await db
        .from("field_reports")
        .insert({ user_id: userId, site_slug: siteSlug, body })
    ).error,
  );
}

export async function listFieldReports(db: SupabaseClient): Promise<FieldReport[]> {
  const { data, error } = await db
    .from("field_reports")
    .select("id, site_slug, body, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as FieldReport[];
}

export async function submitStudyRequest(
  db: SupabaseClient,
  userId: string,
  topic: string,
  place: string,
  body: string,
): Promise<string | null> {
  return fail(
    (
      await db
        .from("study_requests")
        .insert({ user_id: userId, topic, place, body })
    ).error,
  );
}

export async function listStudyRequests(db: SupabaseClient): Promise<StudyRequest[]> {
  const { data, error } = await db
    .from("study_requests")
    .select("id, topic, place, body, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as StudyRequest[];
}

// --- "now" photo submissions (candidates, pending approval) ------------------

export async function submitNowPhoto(
  db: SupabaseClient,
  userId: string,
  args: {
    siteSlug: string;
    photo: File;
    caption: string;
    point: { lat: number; lon: number } | null;
  },
): Promise<string | null> {
  const ext = (args.photo.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${args.siteSlug}/${Date.now()}.${ext}`;
  const up = await db.storage
    .from("submissions")
    .upload(path, args.photo, { upsert: false });
  if (up.error) return up.error.message;
  return fail(
    (
      await db.from("photo_submissions").insert({
        user_id: userId,
        site_slug: args.siteSlug,
        storage_path: path,
        caption: args.caption,
        submitted_lat: args.point?.lat ?? null,
        submitted_lon: args.point?.lon ?? null,
      })
    ).error,
  );
}

// Newly published dossiers can reach readers before the catalog is mirrored
// into Postgres. A field report can retain the public slug in its text until
// that mirror catches up. Files offered this way stay in the private bucket.
export async function submitVisitorUpdate(
  db: SupabaseClient,
  userId: string,
  siteSlug: string,
  body: string,
  photo: File | null,
): Promise<string | null> {
  const lookup = await db.from("sites").select("slug").eq("slug", siteSlug).maybeSingle();
  if (lookup.error) return lookup.error.message;
  const report = lookup.data ? body : `Entry: ${siteSlug}\n${body}`;
  if (!photo) return submitFieldReport(db, userId, lookup.data ? siteSlug : null, report);

  const path = `${userId}/${siteSlug}/${crypto.randomUUID()}`;
  const bucket = db.storage.from("submissions");
  const uploaded = await bucket.upload(path, photo, { upsert: false, contentType: photo.type });
  if (uploaded.error) return uploaded.error.message;

  const result = lookup.data
    ? await db.from("photo_submissions").insert({
        user_id: userId, site_slug: siteSlug, storage_path: path, caption: report,
      })
    : await db.from("field_reports").insert({
        user_id: userId, body: `${report}\nPrivate photo for review: submissions/${path}`,
      });
  // Clean up only on a definite database rejection. A dropped connection can
  // leave the receipt uncertain even after the database has accepted it.
  if (result.error && /^[0-9A-Z]{5}$/.test(result.error.code)) await bucket.remove([path]);
  return fail(result.error);
}

export async function listPhotoSubmissions(
  db: SupabaseClient,
): Promise<PhotoSubmission[]> {
  const { data, error } = await db
    .from("photo_submissions")
    .select("id, site_slug, storage_path, caption, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as PhotoSubmission[];
}
