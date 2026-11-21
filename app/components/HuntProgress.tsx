"use client";
// Hunt progress for a signed-in player, derived from their own check-ins —
// nothing is stored for a hunt itself. Signed out (or saving not connected)
// these components render nothing but the read-only tab.
//
// Ruling 4: only check-ins that captured location at the tap (finite
// claim_lat/claim_lon) advance hunt progress and badges. A visit without
// location is scrapbook-only and counts toward nothing. No demo, default,
// or fallback location exists anywhere.
//
// Only TIED finds count. An untied find ("catalog entry in preparation")
// is never checkable and never part of the badge or completion math.
import { useEffect, useState } from "react";
import { useAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/client";
import { claimFind, listCheckins, type Checkin } from "@/lib/saving";
import { getPositionOnce } from "@/lib/geo";
import { checkedFindKeys, computeHuntProgress } from "@/lib/hunts-core.mjs";

export interface FindRef {
  n: number;
  label: string;
  tiedSlug: string | null;
}

const key = (slug: string, label: string) => `${slug}::${label}`;
const CHECKIN_EVENT = "oog:checkin";

function useCheckins() {
  const { configured, user } = useAccount();
  const [checkins, setCheckins] = useState<Checkin[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(CHECKIN_EVENT, bump);
    return () => window.removeEventListener(CHECKIN_EVENT, bump);
  }, []);
  useEffect(() => {
    if (!configured || !user) return;
    const db = createClient();
    if (!db) return;
    let alive = true;
    listCheckins(db)
      .then((rows) => alive && setCheckins(rows))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [configured, user, version]);
  return { configured, user, checkins, err };
}

/** Completion line on a hunt card — signed-in players only. */
export function HuntCardProgress({ finds, badge }: { finds: FindRef[]; badge: string }) {
  const { user, checkins } = useCheckins();
  if (!user || !checkins) return null;
  const p = computeHuntProgress(finds, checkins);
  if (p.tied === 0) return null;
  return (
    <p className="hunt-progress">
      {p.complete ? (
        <strong>Complete — {badge} earned</strong>
      ) : (
        <>
          Your finds: <strong>{p.done} of {p.tied}</strong>
        </>
      )}
    </p>
  );
}

/** Progress panel on a hunt's page — signed-in players only. */
export function HuntProgressPanel({ finds, badge }: { finds: FindRef[]; badge: string }) {
  const { user, checkins, err } = useCheckins();
  if (!user) return null;
  if (err) return <p className="form-error">{err}</p>;
  if (!checkins) return <p className="small">Checking your finds…</p>;
  const p = computeHuntProgress(finds, checkins);
  return (
    <section className="panel" aria-label="Your progress on this hunt">
      <h2>Your progress</h2>
      {p.tied === 0 ? (
        <p>No find in this hunt can be checked yet — each one is waiting on its catalog entry.</p>
      ) : (
        <>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${(100 * p.done) / p.tied}%` }} />
          </div>
          <p>
            <strong>
              {p.done} of {p.tied} finds checked.
            </strong>{" "}
            {p.complete ? `Hunt complete — the badge ${badge} is in your stamp book.` : `Check them all to earn ${badge}.`}
          </p>
        </>
      )}
    </section>
  );
}

/** "I'm here" — check one tied find from the hunt page. Location is read at
 *  the moment of the tap and stored with the check; no location, no check.
 *  A photo is optional. */
export function CheckFind({
  huntSlug,
  find,
}: {
  huntSlug: string;
  find: FindRef;
}) {
  const { configured, user } = useAccount();
  const { checkins } = useCheckins();
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (!configured || !user || !find.tiedSlug) return null;
  const already = done || (checkins ? checkedFindKeys(checkins).has(key(find.tiedSlug, find.label)) : false);
  if (already) return <p className="find-checked">✓ Checked — you were there.</p>;
  return (
    <div className="find-check">
      <label className="small">
        Photo (optional, saved to your scrapbook){" "}
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </label>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={async () => {
          const db = createClient();
          if (!db) return;
          setBusy(true);
          setErr(null);
          setMsg(null);
          const point = await getPositionOnce();
          if (!point) {
            setBusy(false);
            setErr("Your location could not be read. A find is checked only with location captured at the tap — no location, no progress.");
            return;
          }
          const e = await claimFind(db, user.id, {
            siteSlug: find.tiedSlug!,
            findLabel: find.label,
            photo,
            claimPoint: point,
            huntSlug,
          });
          setBusy(false);
          if (e) setErr(e);
          else {
            setDone(true);
            setMsg(photo ? "Checked. Your photo is in your scrapbook." : "Checked.");
            window.dispatchEvent(new Event(CHECKIN_EVENT));
          }
        }}
      >
        {busy ? "Reading your location…" : "I'm here — check this find"}
      </button>
      {msg && <p className="form-ok">{msg}</p>}
      {err && <p className="form-error">{err}</p>}
    </div>
  );
}
