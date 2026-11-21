# Historic map library — how it works (Nov 21, 2026)

**Data:** `data/historic-map-library.json` is the library file exactly as the
map lane files it: `sheets[]`, `ties[]`, `schemaNotes`, `backCompat`. It is
v3 today. To move to a newer version, **replace this one file**. A sheet
whose `image.src` is null or whose `image.status` is
`pending-conversion-upload` is listed as pending conversion and is never
shown as an image. Ste. Genevieve (`mo-weingarten-usgs-1909`) is set to
`status: "hosted"` using its Wikimedia Commons upload (repo copy updated
from the Drive v3 file). `source.sourceFiles` (GeoTIFF/GeoPDF) are
source files only, never display URLs.

**Rules:** `lib/maps-core.mjs`. **Build check:** `scripts/check-maps.mjs`,
which runs inside `npm run build`. **Tests:** `npm run test:maps`.

## Pages
- `/maps`: every sheet, grouped by state and then place, with filters for
  map type and era (the decade of `dateSort`). Every count is computed from
  the file.
- `/maps/[id]`: the sheet large, with zoom in place (buttons, wheel,
  double-click, drag). Past 1.6× it loads the institution's `image.large`
  rendition. The page also shows the printed credit, the limits note,
  coverage, the full record, and the tied catalog locations, each linked to
  its entry or route.
- Entry and route pages show every tied sheet, oldest first, right after the
  historical photograph.

## Points
- A tie with `status: "checked"` shows a mark at its stored `position`.
  x and y are percentages of the full image.
- Every other tie shows the sheet plain: no mark and no implied position.
- The round-1 removals stay off. The build fails if
  `lewiston-main-street` (611 Main) or `MS-house-on-ellicott-hill` ever
  carries a point. To return one after a new held-out check passes, remove
  it from `HELD_OFF` in `lib/maps-core.mjs`.

## Images
- `image.src` must be https on `tile.loc.gov` or `upload.wikimedia.org`,
  which are stable holding-institution hosts. Any other host fails the build.
- If `image.src` is null, the sheet is **pending conversion**. It is listed
  in the library and on its sheet page as pending, and it is never shown as
  an image. Ste. Genevieve (USGS Weingarten 1909) uses `status: "hosted"` with its
  full-sheet Commons JPEG (`4513×5925`).
- Where a sheet record has no `caption` or `alt`, the figure prints the
  sheet's own title and date. Nothing is written to fill the gap.

## Boone migration proof
- `data/historic-maps.json` (v1) is kept only as a frozen fixture.
- The build rebuilds both v1 keys (`IA-boone-railroad-shop-workers` and the
  route `lincoln-highway-iowa`) from the library, using the file's
  backCompat mapping. It fails on any field drift, or if either key gains a
  point.
- The rendered figure HTML on both pages is byte-identical to the live site
  as of Nov 21, 2026.
- Not changed here: the live Boone entry's Archive ID cites
  sanborn02583_003, but the map is _006. That correction belongs to the
  desk's corpus and has been handed off.
