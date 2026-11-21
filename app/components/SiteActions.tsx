"use client";
// Per-entry saving: add this entry to a day plan, keep a field-notebook
// entry for it, and file a field report about it. All three live behind
// SavingGate — dormant when saving is not connected, sign-in when signed
// out, live when signed in. Field reports land as candidates flagged
// pending QC; they never edit the published record from here.
import { useEffect, useState } from "react";
import { useAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/client";
import {
  addToPlan,
  createPlan,
  getNotebookEntry,
  listPlans,
  removeFromPlan,
  saveNotebookEntry,
  submitFieldReport,
  type Plan,
} from "@/lib/saving";
import { SavingGate } from "./SavingGate";

export default function SiteActions({
  slug,
  title,
  publicVisit,
}: {
  slug: string;
  title: string;
  publicVisit: boolean;
}) {
  return (
    <section className="panel" aria-label="Save and note">
      <h2>Save &amp; note</h2>
      {publicVisit && (
        <p>Already visited the public stop described above? A dated field report about the entrance, posted hours or a closure helps the next reader. A note is enough.</p>
      )}
      <SavingGate feature="Plans, notebook, and field reports">
        <LiveActions slug={slug} title={title} />
      </SavingGate>
    </section>
  );
}

function LiveActions({ slug, title }: { slug: string; title: string }) {
  const { user } = useAccount();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [note, setNote] = useState("");
  const [report, setReport] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const db = createClient();
    if (!db || !user) return;
    let alive = true;
    (async () => {
      try {
        const [ps, entry] = await Promise.all([
          listPlans(db),
          getNotebookEntry(db, slug),
        ]);
        if (!alive) return;
        setPlans(ps);
        if (entry) setNote(entry.body);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, user]);

  if (!user) return null;
  const db = createClient();
  if (!db) return null;

  const refreshPlans = async () => setPlans(await listPlans(db));

  return (
    <div>
      <h3>Day plans</h3>
      {plans === null ? (
        <p className="small">Loading your plans…</p>
      ) : (
        <>
          {plans.length === 0 && (
            <p className="small">No plans yet — create one and add this entry to it.</p>
          )}
          <ul className="plain-list">
            {plans.map((p) => {
              const has = p.items.some((i) => i.site_slug === slug);
              return (
                <li key={p.id}>
                  {p.name} ({p.items.length} {p.items.length === 1 ? "stop" : "stops"}){" "}
                  {has ? (
                    <button
                      type="button"
                      className="btn small-btn"
                      onClick={async () => {
                        setErr(await removeFromPlan(db, p.id, slug));
                        await refreshPlans();
                      }}
                    >
                      Remove this entry
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn small-btn"
                      onClick={async () => {
                        setErr(await addToPlan(db, p.id, slug, p.items.length));
                        await refreshPlans();
                      }}
                    >
                      Add this entry
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              setErr(await createPlan(db, user.id, `Plan — ${title}`));
              await refreshPlans();
            }}
          >
            New plan with this entry in mind
          </button>
        </>
      )}

      <h3>Field notebook — this entry</h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Your own notes on this ground — what you saw, what to check next time."
        aria-label="Field notebook entry"
      />
      <p>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const e = await saveNotebookEntry(db, user.id, slug, note);
            setErr(e);
            if (!e) setMsg("Notebook saved.");
          }}
        >
          Save notebook entry
        </button>
      </p>

      <h3>Field report</h3>
      <p className="small">
        Have a correction or a link to a current operator notice? Include the date and how you know.
        Reports are stored as candidates and change nothing until a human QC pass reads them.
      </p>
      <textarea
        value={report}
        onChange={(e) => setReport(e.target.value)}
        rows={3}
        placeholder="What you found on the ground, and when."
        aria-label="Field report"
      />
      <p>
        <button
          type="button"
          className="btn"
          disabled={!report.trim()}
          onClick={async () => {
            const e = await submitFieldReport(db, user.id, slug, report.trim());
            setErr(e);
            if (!e) {
              setReport("");
              setMsg("Field report filed — pending QC.");
            }
          }}
        >
          File field report
        </button>
      </p>

      {msg && <p className="form-ok">{msg}</p>}
      {err && <p className="form-error">{err}</p>}
    </div>
  );
}
