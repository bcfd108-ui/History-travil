// Historic map sheets on an entry or route page, oldest first, alongside the
// entry's photograph. Three honest states per tie (rules: lib/maps-core.mjs):
//   • checked point  — the sheet with the amber mark at the stored x/y %;
//   • no point       — the sheet plain with its caption: no marker, no
//                      implied position (Boone renders exactly as before:
//                      same markup, same fields, rebuilt from the library);
//   • pending sheet  — no image at all, a plain line saying so.
import Link from "next/link";
import {
  getHistoricMapsFor,
  mapSheetPending,
  mapTieHasPoint,
  type MapSheet,
  type MapTie,
} from "@/lib/data";

function sheetLabel(sheet: MapSheet): string {
  return `${sheet.title}, ${sheet.date}`;
}

function OneSheet({ tie, sheet }: { tie: MapTie; sheet: MapSheet }) {
  if (mapSheetPending(sheet)) {
    return (
      <div className="map-pending" role="note">
        <strong>Historic map — image pending conversion.</strong>{" "}
        <Link href={`/maps/${sheet.id}`}>{sheetLabel(sheet)}</Link>
      </div>
    );
  }
  // Field mapping is the library's backCompat rule, so a v1 record (Boone)
  // renders exactly as it did. Where the record has no caption or alt, the
  // sheet's own title and date are printed — nothing is written to fill it.
  const caption = tie.caption ?? sheet.caption ?? sheetLabel(sheet);
  const alt = sheet.alt ?? sheetLabel(sheet);
  const sourceName =
    sheet.sourceName ?? `Library of Congress — Sanborn Maps Collection, item ${sheet.source.itemId}`;
  const dateNote = tie.dateNote ?? sheet.limitsNote;
  const point = mapTieHasPoint(tie) ? tie.position : null;

  return (
    <figure className="historic-photo">
      {point ? (
        <span className="map-pin-frame">
          <img src={sheet.image.src!} alt={alt} loading="lazy" />
          <span
            className="map-pin"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            role="img"
            aria-label="This entry's position on the sheet (checked point)"
          />
        </span>
      ) : (
        <img src={sheet.image.src!} alt={alt} loading="lazy" />
      )}
      <figcaption>
        <span className="hp-caption">{caption}</span>
        <span className="hp-credit">
          {sheet.credit} ·{" "}
          <a href={sheet.source.pageUrl} target="_blank" rel="noreferrer">
            {sourceName}
          </a>
        </span>
        {dateNote && <span className="hp-note">{dateNote}</span>}
        {point && (
          <span className="hp-note">
            <span className="pin-key" aria-hidden="true" /> The amber mark is this entry&apos;s
            position on the sheet — a checked point.{" "}
            <Link href={`/maps/${sheet.id}`}>Open the full sheet</Link>
          </span>
        )}
      </figcaption>
    </figure>
  );
}

export default function MapSheetFigures({ entryKey }: { entryKey: string }) {
  const ties = getHistoricMapsFor(entryKey);
  if (ties.length === 0) return null;
  return (
    <>
      {ties.map(({ tie, sheet }) => (
        <OneSheet key={`${sheet.id}-${tie.entrySlug}`} tie={tie} sheet={sheet} />
      ))}
    </>
  );
}
