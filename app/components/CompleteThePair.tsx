"use client";
// Complete the pair: this entry's record holds a historic photograph of the
// ground but no modern counterpart. A reader who stands there can offer the
// "now" photo. The submission goes into a PENDING-APPROVAL queue — it is a
// candidate, reviewed by a human before anything joins the published
// record, under the same governance as field reports. The panel renders
// only where lib/data.ts thenNowInvitation() derives the missing pair from
// the dossier's own photo record (visitable ground, a named "then", no
// stated "now") — never on reflection ground, never without an anchor.
import { useState } from "react";
import { useAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/client";
import { submitNowPhoto } from "@/lib/saving";
import { getPositionOnce } from "@/lib/geo";
import { SavingGate } from "./SavingGate";

export default function CompleteThePair({ slug }: { slug: string }) {
  return (
    <section className="panel" aria-label="Complete the then and now pair">
      <h2>Complete the pair</h2>
      <p>
        The record holds a historic photograph of this ground, and no modern counterpart.
        If you stand there, your photograph could complete the then/now pair. Submissions are
        reviewed before anything joins the record — sending a photo offers it as a candidate,
        not a publication.
      </p>
      <SavingGate feature="Photo submissions">
        <PairForm slug={slug} />
      </SavingGate>
    </section>
  );
}

function PairForm({ slug }: { slug: string }) {
  const { user } = useAccount();
  const [photo, setPhoto] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [useLocation, setUseLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!user) return null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const db = createClient();
        if (!db || !photo) return;
        setBusy(true);
        setErr(null);
        const point = useLocation ? await getPositionOnce() : null;
        const errMsg = await submitNowPhoto(db, user.id, {
          siteSlug: slug,
          photo,
          caption: caption.trim(),
          point,
        });
        setBusy(false);
        if (errMsg) {
          setErr(errMsg);
        } else {
          setMsg("Submitted — it sits in the pending-approval queue until a human reviews it.");
          setPhoto(null);
          setCaption("");
        }
      }}
    >
      <label>
        Your “now” photo of this ground{" "}
        <input
          type="file"
          accept="image/*"
          required
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </label>
      <label>
        Caption (where you stood, when){" "}
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="From the public sidewalk, November 2026"
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={useLocation}
          onChange={(e) => setUseLocation(e.target.checked)}
        />{" "}
        Attach where I stood (your device&apos;s position, this once — helps the reviewer line
        the pair up; never a trail)
      </label>
      <p>
        <button type="submit" className="btn" disabled={busy || !photo}>
          {busy ? "Sending…" : "Offer this photo"}
        </button>
      </p>
      {msg && <p className="form-ok">{msg}</p>}
      {err && <p className="form-error">{err}</p>}
    </form>
  );
}
