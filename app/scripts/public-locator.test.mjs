import { test } from "node:test";
import assert from "node:assert/strict";
import { publicLocator } from "./public-locator.mjs";

const project = (fields, raw = "") =>
  publicLocator(Object.entries(fields).map(([key, value]) => ({ key, value })), raw);
const empty = { operator: "", access: "", listing: "", registerUrl: "", point: null };

test("empty, internal and arbitrary extra fields produce no public rows", () => {
  for (const value of ["", "  ", "—", "**", "— blank in the record", "**[blank — not verified]**.", "N/A", "[2]"]) {
    assert.deepEqual(project({
      Operator: value, "Public physical entrance": value, NRHP: value,
      HMdb: "1234", ARK: "ark:/1234", "Archive ID": "A-42",
      "Governing CFR/spec": "record only", "Coordinate source": "archival notes",
      "Other note": "desk only", "Historic address": "10 River Road",
    }), empty);
  }
});

test("a populated locator keeps access qualifications and the verified National Register link", () => {
  assert.deepEqual(project({
    "Official manager / operator": "State Parks", "Permanent public entrance": "River gate; signed paths only",
    "National Register reference": "01001234, district only [3]",
    "Official register listing URL": "https://example.org/listing/01001234",
    Latitude: "43°30′00″N", Longitude: "116°15′00″W", "Coordinate source": "Operator map [2]",
  }), { operator: "State Parks", access: "River gate; signed paths only", listing: "01001234, district only [3]",
    registerUrl: "https://example.org/listing/01001234", point: { lat: 43.5, lon: -116.25 } });
});

test("collocated cross-references, eligible sites and unverified listing claims stay out", () => {
  assert.equal(project({ NRHP: ". HMdb: . ARK: ." }).listing, "");
  assert.equal(project({ NRHP: "73000767 (index); HMdb 48631; ARK and Archive ID blank" }).listing, "73000767 (index)");
  assert.equal(project({ NRHP: "Eligible / HAER-documented" }).listing, "");
  assert.equal(project({ NRHP: "listing asserted by operator; exact register number not verified" }).listing, "");
  assert.match(project({ NRHP: "The downtown is listed on the National Register; number unknown." }).listing, /downtown/);
  assert.equal(project({ Operator: "Friends of the Ark" }).operator, "Friends of the Ark");
});

test("a publisher, a held anchor or a historic address cannot establish a visitor entrance", () => {
  assert.deepEqual(project({
    Operator: "Tribe (official web publications); physical public visitor operator/gate not verified",
    "Public physical entrance": "", "Historic address": "22 River Road",
  }), empty);
  assert.equal(project({ "Public anchor": "None — NO-ANCHOR", "Public address": "22 River Road" }).access, "");
  assert.equal(project({ "Public anchor": "River trailhead", "Permanent public entrance": "HOLD: access not established" }).access, "");
});

test("notes, unresolved pairs and a no-anchor ruling cannot supply map links", () => {
  assert.equal(project({ "Coordinate source": "Rejected image point 43.1, -116.2" }).point, null);
  const pair = { Latitude: "43.1", Longitude: "-116.2" };
  assert.equal(project(pair).point, null);
  assert.equal(project({ ...pair, "Coordinate source": "Archive", "Coordinate scope": "archival locality metadata ONLY" }).point, null);
  assert.equal(project({ ...pair, "Coordinate source": "Operator map", "Coordinate scope": "Coordinates disputed" }).point, null);
  assert.equal(project({ ...pair, "Coordinate source": "Operator map" }, "**Anchor ruling: NO-ANCHOR**").point, null);
});
