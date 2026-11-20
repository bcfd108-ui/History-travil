"use client";
// Your scrapbook: everything the account holds — day plans, photo tags, the
// stamp book derived from them, notebook entries, and the candidates you
// have filed (field reports, study requests, "now" photos) with their
// review state printed honestly. Reading never needs this page; it exists
// only for saving.
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/client";
import {
  listCheckins,
  listFieldReports,
  listNotebook,
  listPhotoSubmissions,
  listPlans,
  listStamps,
  listStudyRequests,
  submitStudyRequest,
  type Checkin,
  type FieldReport,
  type NotebookEntry,
  type PhotoSubmission,
  type Plan,
  type Stamp,
  type StudyRequest,
} from "@/lib/saving";
import { SavingGate } from "@/components/SavingGate";

export default function AccountPage() {
  return (
    <>
      <h1>Your scrapbook</h1>
      <Suspense fallback={null}>
        <Notice />
      </Suspense>
      <SavingGate feature="Your scrapbook">
        <Scrapbook />
      </SavingGate>
    </>
  );
}

function Notice() {
  const params = useSearchParams();
  const notice = params.get("notice");
  if (notice === "not-connected")
    return (
      <p className="form-error">
        That sign-in link landed before saving was connected — there is no session to open.
      </p>
    );
  if (notice === "link-failed")
    return (
      <p className="form-error">
        That sign-in link did not work — it may have expired. Ask for a fresh one below.
      </p>
    );
  return null;
}

function Scrapbook() {
  const { user } = useAccount();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [checkins, setCheckins] = useState<Checkin[] | null>(null);
  const [stamps, setStamps] = useState<Stamp[] | null>(null);
  const [notes, setNotes] = useState<NotebookEntry[] | null>(null);
  const [reports, setReports] = useState<FieldReport[] | null>(null);
  const [requests, setRequests] = useState<StudyRequest[] | null>(null);
  const [subs, setSubs] = useState<PhotoSubmission[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const db = createClient();
    if (!db || !user) return;
    let alive = true;
    (async () => {
      try {
        const [p, c, s, n, r, q, ph] = await Promise.all([
          listPlans(db),
          listCheckins(db),
          listStamps(db),
          listNotebook(db),
          listFieldReports(db),
          listStudyRequests(db),
          listPhotoSubmissions(db),
        ]);
        if (!alive) return;
        setPlans(p);
        setCheckins(c);
        setStamps(s);
        setNotes(n);
        setReports(r);
        setRequests(q);
        setSubs(ph);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) return null;
  if (err) return <p className="form-error">{err}</p>;
  if (plans === null) return <p className="small">Loading your scrapbook…</p>;

  return (
    <>
      <section className="panel">
        <h2>Stamp book</h2>
        {stamps && stamps.length > 0 ? (
          <ul className="plain-list">
            {stamps.map((s) => (
              <li key={s.site_slug}>
                <Link href={`/sites/${s.site_slug}`}>{s.site_slug}</Link> — first tagged{" "}
                {new Date(s.first_claimed_at).toLocaleDateString()}
                {s.claim_count > 1 ? ` · ${s.claim_count} tags` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">
            No stamps yet. A stamp is earned the only way the game allows: go to the ground,
            find the thing, and the photo is the tag.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Day plans</h2>
        {plans && plans.length > 0 ? (
          plans.map((p) => (
            <div key={p.id}>
              <h3>{p.name}</h3>
              {p.items.length === 0 ? (
                <p className="small">Empty — add entries from their pages.</p>
              ) : (
                <ol>
                  {p.items.map((i) => (
                    <li key={i.site_slug}>
                      <Link href={`/sites/${i.site_slug}`}>{i.site_slug}</Link>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))
        ) : (
          <p className="small">No plans yet. Open any entry and start one.</p>
        )}
      </section>

      <section className="panel">
        <h2>Photo tags</h2>
        {checkins && checkins.length > 0 ? (
          <ul className="plain-list">
            {checkins.map((c) => (
              <li key={c.id}>
                <Link href={`/sites/${c.site_slug}`}>{c.site_slug}</Link> — {c.find_label} ·{" "}
                {new Date(c.claimed_at).toLocaleString()}
                {c.claim_lat != null && c.claim_lon != null
                  ? " · position witnessed"
                  : " · no position recorded"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">No tags yet.</p>
        )}
      </section>

      <section className="panel">
        <h2>Field notebook</h2>
        {notes && notes.length > 0 ? (
          <ul className="plain-list">
            {notes.map((n) => (
              <li key={n.id}>
                <Link href={`/sites/${n.site_slug}`}>{n.site_slug}</Link> — updated{" "}
                {new Date(n.updated_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">No notebook entries yet.</p>
        )}
      </section>

      <section className="panel">
        <h2>Your candidates</h2>
        <p className="small">
          Everything you file is a candidate until a human QC pass rules on it. The state of
          each one is printed here exactly as the record holds it.
        </p>
        <h3>Field reports</h3>
        {reports && reports.length > 0 ? (
          <ul className="plain-list">
            {reports.map((r) => (
              <li key={r.id}>
                {r.site_slug ? (
                  <Link href={`/sites/${r.site_slug}`}>{r.site_slug}</Link>
                ) : (
                  "General"
                )}{" "}
                — {r.status.replace("_", " ")} · {new Date(r.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">None filed.</p>
        )}
        <h3>“Now” photo submissions</h3>
        {subs && subs.length > 0 ? (
          <ul className="plain-list">
            {subs.map((s) => (
              <li key={s.id}>
                <Link href={`/sites/${s.site_slug}`}>{s.site_slug}</Link> — {s.status} ·{" "}
                {new Date(s.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">None offered.</p>
        )}
        <h3>Study requests</h3>
        {requests && requests.length > 0 ? (
          <ul className="plain-list">
            {requests.map((r) => (
              <li key={r.id}>
                {r.topic || r.place || "Study request"} — {r.status.replace("_", " ")} ·{" "}
                {new Date(r.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">None filed.</p>
        )}
        <StudyRequestForm onFiled={async () => {
          const db = createClient();
          if (db) setRequests(await listStudyRequests(db));
        }} />
      </section>
    </>
  );
}

function StudyRequestForm({ onFiled }: { onFiled: () => Promise<void> }) {
  const { user } = useAccount();
  const [topic, setTopic] = useState("");
  const [place, setPlace] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!user) return null;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const db = createClient();
        if (!db) return;
        const errMsg = await submitStudyRequest(db, user.id, topic.trim(), place.trim(), body.trim());
        setErr(errMsg);
        if (!errMsg) {
          setTopic("");
          setPlace("");
          setBody("");
          setMsg("Filed — pending QC, like everything that joins the record.");
          await onFiled();
        }
      }}
    >
      <h3>Ask for a study</h3>
      <p className="small">
        A place or a question the catalog does not cover yet. Requests join the research queue
        as candidates — the same standard applies to whatever comes back.
      </p>
      <label>
        Topic <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} />
      </label>
      <label>
        Place <input type="text" value={place} onChange={(e) => setPlace(e.target.value)} />
      </label>
      <label>
        What you want to know{" "}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
      </label>
      <p>
        <button type="submit" className="btn" disabled={!topic.trim() && !place.trim()}>
          File study request
        </button>
      </p>
      {msg && <p className="form-ok">{msg}</p>}
      {err && <p className="form-error">{err}</p>}
    </form>
  );
}
