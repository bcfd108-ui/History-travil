import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dossierFamilies,
  recordedCounty,
  verifiedMapPoint,
} from "./navigation-fields.mjs";

test("lore requires an explicit label on the recorded family", () => {
  assert.deepEqual(dossierFamilies("Theme Sweep (Family 4 — Weird spots)"), [
    "The Weird & Curious",
  ]);
  assert.deepEqual(
    dossierFamilies(
      "Theme Sweep (Family 4 — Weird spots, with separate lore layer)",
    ),
    ["The Weird & Curious", "Haunted Tellings"],
  );
  assert.deepEqual(dossierFamilies("Ghosts appear in this story"), []);
});
test("county is drawn from a geographic field", () => {
  assert.equal(
    recordedCounty(
      [{ key: "State / county / city", value: "Washington / King / Seattle" }],
      "",
    ),
    "King County",
  );
  assert.equal(
    recordedCounty(
      [
        {
          key: "Historic location",
          value: "St. Francisville, West Feliciana Parish, LA",
        },
      ],
      "",
    ),
    "West Feliciana Parish",
  );
  assert.equal(
    recordedCounty([{ key: "Source", value: "King County Archives" }], ""),
    "",
  );
});
test("hemispheres and blank coordinates survive projection", () => {
  const point = (latitude, longitude, fields = []) =>
    verifiedMapPoint(fields, { latitude, longitude }, "");
  assert.deepEqual(point("43°30′00″N", "116°15′00″W"), {
    lat: 43.5,
    lon: -116.25,
  });
  assert.equal(point("43°30′00″", "116°15′00″"), null);
  assert.equal(
    point("", "", [
      { key: "Coordinate source", value: "historic image: 48.123, -116.456" },
    ]),
    null,
  );
  assert.equal(point("91", "-117"), null);
  assert.equal(
    point("47.47", "-115.93", [
      { key: "Coordinate scope", value: "archival locality metadata ONLY" },
    ]),
    null,
  );
});
