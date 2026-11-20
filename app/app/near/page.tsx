import { getSites, getVisitableAnchor } from "@/lib/data";
import NearHere, { type NearRow } from "@/components/NearHere";

export const metadata = { title: "Near Here — On Old Ground" };

export default function NearPage() {
  // Only entries with recorded coordinates AND a derivable visitable anchor
  // are offered as ground to stand on. Blank coordinates stay blank — the
  // list is short because the record is honest, not because the app is thin.
  const rows: NearRow[] = [];
  for (const s of getSites()) {
    if (!s.coordinates) continue;
    const anchor = getVisitableAnchor(s);
    if (!anchor) continue;
    rows.push({
      slug: s.slug,
      title: s.title,
      town: s.town,
      state: s.state,
      stopType: s.stopType,
      approach: anchor.approach,
      lat: s.coordinates.lat,
      lon: s.coordinates.lon,
    });
  }

  return (
    <>
      <h1>Near Here</h1>
      <NearHere rows={rows} />
    </>
  );
}
