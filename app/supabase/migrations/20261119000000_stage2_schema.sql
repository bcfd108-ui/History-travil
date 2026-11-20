-- History Travel — Stage 2 schema (accounts + saving).
--
-- Design notes, from the product law and ARCHITECTURE.md:
-- * The catalog (`sites`) is public read. It is written ONLY by the ingest
--   pipeline (scripts/ingest-sites.mjs, service-role key, server-side) from
--   the converter's output (data/sites.json). The converter stays the ingest
--   pipeline; this table is its database home, not a new source of truth.
-- * Everything a visitor saves is owner-only: Row Level Security is enabled
--   on every table and every policy is "your rows only" (auth.uid()).
-- * Check-ins are photo-tag claims. There are deliberately NO score, points,
--   or answer columns anywhere in this schema: the game is a scavenger hunt,
--   never a test, and reflection ground has no check-in path at all (the app
--   enforces that; this table simply records claims made on hunt ground).
-- * field_reports and study_requests are CANDIDATES. They land with
--   status 'pending_qc' and are never auto-published; a human QC pass moves
--   them, per the growth law.
-- * Claim coordinates on checkins are the corroboration point for a single
--   claim, recorded only when the player granted location at claim time.
--   Nothing in this schema stores a location trail.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, created by trigger on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sites — the published catalog, mirroring the converter's record shape
-- (lib/data.ts `Site`). `payload` keeps the complete converter record so no
-- field is lost; the typed columns serve search, filters, and the map.
-- lat/lon stay NULL wherever the dossier leaves coordinates blank — blanks
-- stay blank; nothing is geocoded or inferred at ingest.
-- ---------------------------------------------------------------------------
create table public.sites (
  slug text primary key,
  ht_id text not null,
  title text not null,
  town text not null default '',
  state text not null,
  state_code text not null,
  division text not null default '',
  themes text[] not null default '{}',
  stop_type text not null check (stop_type in ('reflection', 'view')),
  standfirst text not null default '',
  lead text not null default '',
  access text not null default '',
  story text not null default '',
  then_now text not null default '',
  still_there text not null default '',
  progression text not null default '',
  gaps text not null default '',
  photo_record text not null default '',
  more_sections jsonb not null default '[]',
  sources text not null default '',
  locator jsonb not null default '{}',
  lat double precision,
  lon double precision,
  coordinate_kind text not null default '',
  candidate_finds jsonb not null default '[]',
  published_as text not null default '',
  -- The visitable anchor, derived at ingest by the same rule whose authority
  -- is lib/data.ts getVisitableAnchor(): the lawful public ground a reader
  -- can actually go to, as the dossier's locator record names it, with its
  -- approach and its printed boundary. All three stay NULL when the dossier
  -- names no visitable anchor — flagged for the owner's ruling, never
  -- invented at ingest. Archives are sources, never anchors.
  anchor_name text,
  anchor_approach text check (anchor_approach in
    ('drive-up', 'short walk', 'city walk', 'hike', 'nearest public ground')),
  anchor_boundary text,
  payload jsonb not null,
  ingested_at timestamptz not null default now()
);

create index sites_state_code_idx on public.sites (state_code);
create index sites_stop_type_idx on public.sites (stop_type);
create index sites_coords_idx on public.sites (lat, lon) where lat is not null;

-- ---------------------------------------------------------------------------
-- plans — a visitor's day plans; plan_items are the saved entries in order.
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Day plan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_items (
  plan_id uuid not null references public.plans (id) on delete cascade,
  site_slug text not null references public.sites (slug) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (plan_id, site_slug)
);

create index plans_user_idx on public.plans (user_id);
create index plan_items_plan_idx on public.plan_items (plan_id);

-- ---------------------------------------------------------------------------
-- checkins — photo-tag claims. photo_storage_path points at the player's
-- scrapbook photo in the private `scrapbook` storage bucket (folder = the
-- owner's auth uid). claim_lat/claim_lon are the device's coordinates at
-- claim time when the player granted location; otherwise NULL.
-- ---------------------------------------------------------------------------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site_slug text not null references public.sites (slug) on delete cascade,
  hunt_slug text,
  find_label text not null default '',
  photo_storage_path text,
  claim_lat double precision,
  claim_lon double precision,
  claimed_at timestamptz not null default now()
);

create index checkins_user_idx on public.checkins (user_id, claimed_at desc);
create index checkins_site_idx on public.checkins (site_slug);

-- ---------------------------------------------------------------------------
-- stamps — the stamp book is DERIVED from check-ins, never stored: one stamp
-- per (player, site) claimed, with the first claim time. security_invoker so
-- the view respects the querying player's RLS on checkins (Postgres 15+).
-- ---------------------------------------------------------------------------
create view public.stamps
  with (security_invoker = true) as
select
  user_id,
  site_slug,
  min(claimed_at) as first_claimed_at,
  count(*) as claim_count
from public.checkins
group by user_id, site_slug;

-- ---------------------------------------------------------------------------
-- notebook — one field-notebook entry per player per site, editable.
-- ---------------------------------------------------------------------------
create table public.notebook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site_slug text not null references public.sites (slug) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, site_slug)
);

create index notebook_user_idx on public.notebook (user_id);

-- ---------------------------------------------------------------------------
-- field_reports / study_requests — candidate contributions, pending QC.
-- ---------------------------------------------------------------------------
create table public.field_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site_slug text references public.sites (slug) on delete set null,
  body text not null,
  status text not null default 'pending_qc'
    check (status in ('pending_qc', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create table public.study_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null default '',
  place text not null default '',
  body text not null default '',
  status text not null default 'pending_qc'
    check (status in ('pending_qc', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create index field_reports_user_idx on public.field_reports (user_id, created_at desc);
create index study_requests_user_idx on public.study_requests (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- photo_submissions — "now" photos offered by readers to complete an entry's
-- then/now pair. A submission is a CANDIDATE, never a publication: it lands
-- with status 'pending' and joins the published record only after a human
-- approval, under the same governance as field_reports. The photo bytes live
-- in the private `submissions` storage bucket (folder = submitter's uid).
-- submitted_lat/lon are optional and are recorded only when the submitter
-- grants location at submission time; they are a single point, not a trail.
-- ---------------------------------------------------------------------------
create table public.photo_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site_slug text not null references public.sites (slug) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  submitted_lat double precision,
  submitted_lon double precision,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index photo_submissions_user_idx on public.photo_submissions (user_id, created_at desc);
create index photo_submissions_status_idx on public.photo_submissions (status, created_at);

-- ---------------------------------------------------------------------------
-- updated_at maintenance.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger plans_touch before update on public.plans
  for each row execute function public.touch_updated_at();
create trigger notebook_touch before update on public.notebook
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Profile bootstrap: a profiles row for every new auth user.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security. Enabled on every table. The catalog is world-readable
-- and client-unwritable; every saved thing is owner-only.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.checkins enable row level security;
alter table public.notebook enable row level security;
alter table public.field_reports enable row level security;
alter table public.study_requests enable row level security;
alter table public.photo_submissions enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "sites: public read" on public.sites
  for select to anon, authenticated using (true);
-- No insert/update/delete policies for sites: only the service role
-- (ingest pipeline) writes, and it bypasses RLS by design.

create policy "plans: owner only" on public.plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "plan_items: owner only" on public.plan_items
  for all using (
    exists (select 1 from public.plans p
            where p.id = plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.plans p
            where p.id = plan_id and p.user_id = auth.uid())
  );

create policy "checkins: owner only" on public.checkins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notebook: owner only" on public.notebook
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "field_reports: owner only" on public.field_reports
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "study_requests: owner only" on public.study_requests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Submitters see and manage only their own submissions. Approval is an
-- operator act done outside the client (service role / dashboard), so there
-- is deliberately no client policy that can read or decide others' rows.
create policy "photo_submissions: owner only" on public.photo_submissions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Scrapbook photo storage: a PRIVATE bucket. A player can read and write
-- only inside a folder named with their own auth uid
-- (path shape: <uid>/<checkin-or-site>/<filename>).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('scrapbook', 'scrapbook', false)
on conflict (id) do nothing;

create policy "scrapbook: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'scrapbook' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scrapbook: write own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scrapbook' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scrapbook: update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'scrapbook' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'scrapbook' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scrapbook: delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'scrapbook' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Photo-submission storage: a second PRIVATE bucket, `submissions`, with the
-- same folder discipline (path shape: <uid>/<site-slug>/<filename>). Files
-- here are unreviewed candidates; nothing in this bucket is public, and
-- approval copies an accepted photo into the published record through the
-- operator's own pipeline — the bucket itself is never published from.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

create policy "submissions: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "submissions: write own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "submissions: update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "submissions: delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
