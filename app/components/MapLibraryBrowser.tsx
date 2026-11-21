"use client";
// The library index: sheets grouped by state, then place, filterable by map
// type and era. The sheet list arrives from the server, computed from
// data/historic-map-library.json; the filter only hides and shows.
import { useMemo, useState } from "react";
import Link from "next/link";

export interface SheetRow {
  id: string;
  title: string;
  date: string;
  dateSort: string;
  type: string;
  era: string;
  stateCode: string;
  stateName: string;
  town: string;
  county: string;
  sheetNumber: string | null;
  setSize: number | null;
  thumb: string | null;
  pending: boolean;
  ties: number;
  points: number;
}

export default function MapLibraryBrowser({ rows }: { rows: SheetRow[] }) {
  const types = useMemo(() => [...new Set(rows.map((r) => r.type))].sort(), [rows]);
  const eras = useMemo(() => [...new Set(rows.map((r) => r.era))].sort(), [rows]);
  const [type, setType] = useState("");
  const [era, setEra] = useState("");
  const shown = rows.filter((r) => (!type || r.type === type) && (!era || r.era === era));

  const groups = new Map<string, Map<string, SheetRow[]>>();
  for (const r of shown) {
    const st = groups.get(r.stateName) || new Map<string, SheetRow[]>();
    const key = `${r.town}${r.county ? `, ${r.county}` : ""}`;
    st.set(key, [...(st.get(key) || []), r]);
    groups.set(r.stateName, st);
  }
  const states = [...groups.keys()].sort();

  return (
    <>
      <div className="filters" role="search">
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Map type">
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={era} onChange={(e) => setEra(e.target.value)} aria-label="Era">
          <option value="">All eras</option>
          {eras.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="small filter-count">
          {shown.length} of {rows.length} sheets
        </span>
      </div>
      {states.map((st) => (
        <section key={st} className="map-state">
          <h2>{st}</h2>
          {[...groups.get(st)!.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([place, sheets]) => (
              <div key={place} className="map-place">
                <h3>{place}</h3>
                <div className="sheet-grid">
                  {sheets
                    .sort((a, b) => a.dateSort.localeCompare(b.dateSort) || a.id.localeCompare(b.id))
                    .map((s) => (
                      <Link key={s.id} href={`/maps/${s.id}`} className="sheet-tile">
                        {s.pending || !s.thumb ? (
                          <span className="sheet-thumb pending">Pending conversion</span>
                        ) : (
                          <img className="sheet-thumb" src={s.thumb} alt="" loading="lazy" />
                        )}
                        <span className="st-date">{s.date}</span>
                        <span className="st-title">
                          {s.type}
                          {s.sheetNumber ? ` · sheet ${s.sheetNumber}${s.setSize ? ` of ${s.setSize}` : ""}` : ""}
                        </span>
                        <span className="st-ties">
                          {s.ties} {s.ties === 1 ? "entry" : "entries"}
                          {s.points ? ` · ${s.points} marked` : ""}
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            ))}
        </section>
      ))}
      {shown.length === 0 && <p>No sheets match.</p>}
    </>
  );
}
