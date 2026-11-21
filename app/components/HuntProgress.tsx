"use client";
// Hunt progress, derived from the player's own claims — nothing is stored
// for a hunt itself. A find counts as tagged when one of the player's
// check-ins (lib/saving.ts listCheckins) carries the find's entry slug and
// the find's label, exactly as the entry page's ClaimFind panel recorded
// it. Completion is a stamp-book record — the hunt's badge, earned when
// every taggable find is tagged — never a score.
//
// Only finds tied to a catalog entry (entrySlug set) can be tagged, from
// that entry's page. Finds carried untied (their ground has no entry in
// this edition yet) are listed on their own text and counted honestly:
// they are not part of the tagged-of total, and the page says why.
//
// The founding hunts are ACTIVE (owner's ruling, Nov 20, 2026 — activated
// on his word alone, no field check). Their finds rest on the research
// record; nothing here represents a find as field-verified.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/client";
import { listCheckins, type Checkin } from "@/lib/saving";
import type { HuntFind } from "@/lib/data";

type FindRef = Pick<HuntFind, "entrySlug" | "label">;

function taggedKeys(checkins: Checkin[]): Set<string> {
  return new Set(checkins.map((c) => `${c.site_slug}::${c.find_label}`));
}

function useCheckins() {
  const { configured, user } = useAccount();
  const [checkins, setCheckins] = useState<Checkin[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !user) return;
    const db = createClient();
    if (!db) return;
    let alive = true;
    listCheckins(db)
      .then((rows) => {
        if (alive) setCheckins(rows);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [configured, user]);

  return { configured, user, checkins, err };
}

/** The one-line progress shown on the hunts index for a signed-in player.
 *  Renders nothing signed out, unconfigured, or while loading — the index
 *  stays a reading page for everyone else. */
export function HuntProgressLine({ finds, badge }: { finds: FindRef[]; badge?: string }) {
  const { user, checkins } = useCheckins();
  if (!user || !checkins) return null;
  const taggable = finds.filter((f) => f.entrySlug);
  if (taggable.length === 0) return null;
  const keys = taggedKeys(checkins);
  const done = taggable.filter((f) => keys.has(`${f.entrySlug}::${f.label}`)).length;
  const complete = done === taggable.length;
  return (
    <p className="small">
      <strong>
        Your progress: {done} of {taggable.length} finds tagged
        {complete
          ? badge
            ? ` — hunt complete; the badge ${badge} is recorded in your stamp book.`
            : " — hunt complete, recorded in your stamp book."
          : "."}
      </strong>
    </p>
  );
}

/** The find list on a hunt's own page, with the signed-in player's tagged
 *  state on each find and the hunt's progress and completion above it. */
export function HuntFindList({
  badge,
  finds,
}: {
  badge: string;
  finds: HuntFind[];
}) {
  const { user, checkins, err } = useCheckins();
  const taggable = finds.filter((f) => f.entrySlug);
  const untied = finds.length - taggable.length;
  const keys = checkins ? taggedKeys(checkins) : new Set<string>();
  const done = taggable.filter((f) => keys.has(`${f.entrySlug}::${f.label}`)).length;
  const complete = !!user && taggable.length > 0 && done === taggable.length;

  return (
    <>
      {user && err && <p className="form-error">{err}</p>}
      {user && !checkins && !err && <p className="small">Checking your tags…</p>}
      {user && checkins && (
        <section className="panel" aria-label="Your progress on this hunt">
          <h2>Your progress</h2>
          {taggable.length === 0 ? (
            <p>
              This hunt is active, but none of its finds can be tagged yet — every
              find&apos;s ground is still waiting for its catalog entry, and those entries
              are in preparation. When an entry is published, its find becomes taggable
              from that entry&apos;s page, and your progress will be counted here.
            </p>
          ) : (
            <>
              <p>
                <strong>
                  {done} of {taggable.length} finds tagged.
                </strong>
              </p>
              {complete ? (
                <p>
                  <strong>Hunt complete.</strong> Every find with a catalog entry is
                  tagged, and the badge <strong>{badge}</strong> is earned — recorded in
                  your stamp book. Completion is a stamp-book record, not a score — the
                  ground was the prize.
                </p>
              ) : (
                <p className="small">
                  Tag a find from its entry&apos;s page — being there is the tag, and a
                  photo is yours to add, never required. When every find with an entry is
                  tagged, the hunt completes and the badge {badge} is recorded in your
                  stamp book.
                </p>
              )}
              {untied > 0 && (
                <p className="small">
                  {untied} more {untied === 1 ? "find is" : "finds are"} carried untied
                  below — their catalog {untied === 1 ? "entry is" : "entries are"} in
                  preparation, so they cannot be tagged yet and do not count toward the
                  badge yet. Each joins the total the moment its entry is published.
                </p>
              )}
            </>
          )}
        </section>
      )}

      <div className="rows">
        {finds.map((f) => {
          const tagged = !!f.entrySlug && keys.has(`${f.entrySlug}::${f.label}`);
          const inner = (
            <>
              <span className="t">
                Find {f.n} — {f.label}
                {tagged ? " ✓ Tagged" : ""}
              </span>
              <span className="small">
                {f.groundName} · {f.place} ·{" "}
                {f.status === "active" ? (
                  <span className="badge amber">Active find</span>
                ) : (
                  <span className="badge amber">Candidate find — not yet field-checked or activated</span>
                )}
              </span>
              <span>{f.task}</span>
              {f.hint && (
                <span className="small">
                  <strong>Hint:</strong> {f.hint}
                </span>
              )}
              {!f.entrySlug && (
                <span className="small">
                  This find&apos;s catalog entry is in preparation — the find is carried on
                  its own text until the entry is published, and tagging opens from that
                  entry&apos;s page. It does not count toward the badge yet.
                </span>
              )}
            </>
          );
          return f.entrySlug ? (
            <Link key={f.n} className="row" href={`/sites/${f.entrySlug}`}>
              {inner}
            </Link>
          ) : (
            <div key={f.n} className="row">
              {inner}
            </div>
          );
        })}
      </div>
    </>
  );
}
