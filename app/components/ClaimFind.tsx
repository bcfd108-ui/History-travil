"use client";
// Claim a candidate find the only way the game allows: by being there.
// The visit is the tag — there is no question to answer and nothing to
// unlock. A photo may be attached, and is always optional. The claim records the entry, the find as the research record
// names it, the time, the photo in the player's own scrapbook, and — only
// when the player grants it at claim time — the device's coordinates as
// the corroboration point. Nothing is scored; the stamp book simply
// derives from claims.
//
// This panel is rendered only for entries that carry candidate finds, are
// not reflection ground (reflection entries never render it — the server
// page enforces that), and are not flagged anchorless. Candidate status is
// printed on the panel itself: these finds are from the research record,
// not yet field-checked or activated, and a claim here is the player's own
// scrapbook record, not an official activation.
import { useState } from "react";
import { useAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/client";
import { claimFind } from "@/lib/saving";
import { getPositionOnce } from "@/lib/geo";
import { SavingGate } from "./SavingGate";

export default function ClaimFind({
  slug,
  finds,
}: {
  slug: string;
  finds: string[];
}) {
  return (
    <SavingGate feature="Photo tags">
      <ClaimForm slug={slug} finds={finds} />
    </SavingGate>
  );
}

function ClaimForm({ slug, finds }: { slug: string; finds: string[] }) {
  const { user } = useAccount();
  const [find, setFind] = useState(finds[0] || "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [useLocation, setUseLocation] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!user) return null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const db = createClient();
        if (!db) return;
        setBusy(true);
        setErr(null);
        const point = useLocation ? await getPositionOnce() : null;
        const errMsg = await claimFind(db, user.id, {
          siteSlug: slug,
          findLabel: find,
          photo,
          claimPoint: point,
        });
        setBusy(false);
        if (errMsg) {
          setErr(errMsg);
        } else {
          setMsg(
            point
              ? "Tagged — photo saved to your scrapbook, with your position as the witness."
              : "Tagged — photo saved to your scrapbook. No position was recorded.",
          );
          setPhoto(null);
        }
      }}
    >
      <label>
        The find, as the record names it{" "}
        <select value={find} onChange={(e) => setFind(e.target.value)}>
          {finds.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>
      <label>
        Your photo of it{" "}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={useLocation}
          onChange={(e) => setUseLocation(e.target.checked)}
        />{" "}
        Record where I stood (your device&apos;s position, this once, as the witness to the
        tag — never a trail, never used for anything else)
      </label>
      <p>
        <button type="submit" className="btn" disabled={busy || !photo}>
          {busy ? "Saving the tag…" : "Tag it with this photo"}
        </button>
      </p>
      {msg && <p className="form-ok">{msg}</p>}
      {err && <p className="form-error">{err}</p>}
    </form>
  );
}
