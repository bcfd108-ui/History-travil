"use client";
// Catalog browser: search + filters over the lightweight index.
// The full entry text lives on each entry's own page; rows are tappable
// through to it. Filtering is client-side over the index rows only.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { IndexRow } from "@/lib/data";

export default function CatalogBrowser({
  rows,
  states,
  themes,
}: {
  rows: IndexRow[];
  states: { code: string; name: string }[];
  themes: string[];
}) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [state, setState] = useState(params.get("state") || "");
  const [theme, setTheme] = useState(params.get("theme") || "");
  const [stop, setStop] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (state && r.stateCode !== state) return false;
      if (theme && !r.themes.includes(theme)) return false;
      if (stop && r.stopType !== stop) return false;
      if (needle && !(r.title + " " + r.town + " " + r.state + " " + r.themes.join(" ")).toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [rows, q, state, theme, stop]);

  return (
    <>
      <div className="filters">
        <input
          type="search"
          placeholder="Search titles, towns, themes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search the catalog"
        />
        <select value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Theme">
          <option value="">All themes</option>
          {themes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={stop} onChange={(e) => setStop(e.target.value)} aria-label="Stop type">
          <option value="">All stop types</option>
          <option value="view">View stops</option>
          <option value="reflection">Reflection stops</option>
        </select>
      </div>
      <p className="small">{shown.length} of {rows.length} entries</p>
      <div className="rows">
        {shown.map((r) => (
          <Link key={r.slug} className="row" href={`/sites/${r.slug}`}>
            <span className="t">{r.title}</span>
            <div className="m">
              {r.town ? `${r.town}, ` : ""}{r.state}
              {" · "}
              <span className={`badge${r.stopType === "reflection" ? " reflection" : ""}`}>
                {r.stopType === "reflection" ? "Reflection stop" : "View stop"}
              </span>
              {r.approach && <span className="badge amber">{r.approach}</span>}
              {r.hasCoordinates && <span className="badge">Coordinates recorded</span>}
              {r.hasLocator && <span className="badge">Register ID</span>}
              {r.themes.length > 0 && <span>{r.themes.join(" · ")}</span>}
            </div>
          </Link>
        ))}
        {shown.length === 0 && <p>No entries match. Loosen a filter and try again.</p>}
      </div>
    </>
  );
}
