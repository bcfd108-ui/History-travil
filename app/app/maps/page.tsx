import {
  getMapLibrary,
  getSites,
  mapLibraryCounts,
  mapSheetEra,
  mapSheetPending,
  mapTieHasPoint,
} from "@/lib/data";
import MapLibraryBrowser, { type SheetRow } from "@/components/MapLibraryBrowser";

export const metadata = { title: "Historic maps — On Old Ground" };

// Every count here is computed from data/historic-map-library.json at
// build time. No preface copy: the maps lead.
export default function MapsPage() {
  const lib = getMapLibrary();
  const c = mapLibraryCounts(lib);
  const stateNames = new Map(getSites().map((s) => [s.stateCode, s.state]));
  const rows: SheetRow[] = lib.sheets.map((s) => {
    const ties = lib.ties.filter((t) => t.sheetId === s.id);
    return {
      id: s.id,
      title: s.title,
      date: s.date,
      dateSort: s.dateSort,
      type: s.type,
      era: mapSheetEra(s),
      stateCode: s.place.state,
      stateName: stateNames.get(s.place.state) || s.place.state,
      town: s.place.town,
      county: s.place.county || "",
      sheetNumber: s.sheetNumber ?? null,
      setSize: s.setSize ?? null,
      thumb: mapSheetPending(s)
        ? null
        : s.image.iiifService
          ? `${s.image.iiifService}/full/!360,420/0/default.jpg`
          : s.image.src,
      pending: mapSheetPending(s),
      ties: ties.length,
      points: ties.filter(mapTieHasPoint).length,
    };
  });

  return (
    <>
      <h1>Historic maps</h1>
      <p className="count-strip" aria-label="Library counts">
        <span>
          <strong>{c.sheets}</strong> sheets
        </span>
        <span>
          <strong>{c.places}</strong> places in <strong>{c.states}</strong> states
        </span>
        <span>
          <strong>{c.ties}</strong> catalog ties
        </span>
        <span>
          <strong>{c.points}</strong> marked points
        </span>
        {c.pending > 0 && (
          <span>
            <strong>{c.pending}</strong> pending conversion
          </span>
        )}
      </p>
      <MapLibraryBrowser rows={rows} />
    </>
  );
}
