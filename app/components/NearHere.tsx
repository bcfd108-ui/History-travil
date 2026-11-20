"use client";
// Near Here: the on-the-ground lens. NOTHING happens until the player taps
// the button — only then does the browser ask for a position, and the
// position is used once, in this tab, to sort the entries that carry
// recorded coordinates by distance. It is never sent anywhere, never
// stored, and never asked for again unless the player taps again.
//
// Entries whose dossiers leave coordinates blank do not appear here at
// all: they are not offered as ground to stand on. That is most of the
// catalog, and the page says so plainly rather than pad the list.
import { useMemo, useState } from "react";
import Link from "next/link";
import { getPositionOnce, haversineKm, formatDistance, type LatLon } from "@/lib/geo";

export interface NearRow {
  slug: string;
  title: string;
  town: string;
  state: string;
  stopType: "reflection" | "view";
  approach: string | null;
  lat: number;
  lon: number;
}

type Phase =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "denied" }
  | { kind: "ready"; at: LatLon };

export default function NearHere({ rows }: { rows: NearRow[] }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const sorted = useMemo(() => {
    if (phase.kind !== "ready") return [];
    return rows
      .map((r) => ({ r, km: haversineKm(phase.at, { lat: r.lat, lon: r.lon }) }))
      .sort((a, b) => a.km - b.km);
  }, [phase, rows]);

  return (
    <>
      <p className="lede">
        What happened near where you are standing? Tap the button and this device will ask for
        its position — used once, here, to sort the record by distance. Nothing is sent
        anywhere, nothing is kept, and reading the catalog never needs it.
      </p>
      <p className="small">
        Only entries whose dossiers print coordinates can be sorted this way — {rows.length} of
        them. The rest leave coordinates blank on purpose: a missing point is the record being
        honest, not a gap in the app. Entries with no named visitable anchor are not offered
        as ground to stand on here either.
      </p>

      {phase.kind === "idle" && (
        <p>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              setPhase({ kind: "asking" });
              const at = await getPositionOnce();
              setPhase(at ? { kind: "ready", at } : { kind: "denied" });
            }}
          >
            Use my location
          </button>
        </p>
      )}
      {phase.kind === "asking" && <p>Asking the device where you are…</p>}
      {phase.kind === "denied" && (
        <>
          <p>
            No position came back — the permission was declined, or this device cannot provide
            one. Nothing was recorded. The catalog works the same as always:
          </p>
          <p>
            <Link href="/catalog">Browse the catalog</Link>
          </p>
        </>
      )}
      {phase.kind === "ready" && (
        <>
          <p className="small">
            Sorted by distance from where you are standing now. Distances are straight-line;
            the entry&apos;s trip gate governs where you may actually stand.
          </p>
          <div className="rows">
            {sorted.map(({ r, km }) => (
              <Link key={r.slug} className="row" href={`/sites/${r.slug}`}>
                <span className="t">{r.title}</span>
                <div className="m">
                  {formatDistance(km)} · {r.town ? `${r.town}, ` : ""}{r.state}
                  {" · "}
                  <span className={`badge${r.stopType === "reflection" ? " reflection" : ""}`}>
                    {r.stopType === "reflection" ? "Reflection stop" : "View stop"}
                  </span>
                  {r.approach && <span className="badge">{r.approach}</span>}
                </div>
              </Link>
            ))}
          </div>
          <p>
            <button
              type="button"
              className="linklike"
              onClick={() => setPhase({ kind: "idle" })}
            >
              Clear my position
            </button>
          </p>
        </>
      )}
    </>
  );
}
