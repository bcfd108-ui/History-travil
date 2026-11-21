// Project labeled §10 values before the desk parser folds endnotes into the
// last field or combines a coordinate source with its (sometimes contrary) scope.
import { verifiedMapPoint } from "./navigation-fields.mjs";

const operatorKeys = /^(?:(?:official |public (?:venue )?)?operators?|(?:official )?manager(?:\s*(?:\/|or)\s*operator)?|owner\/operator|operators\/custodians)$/i;
const entranceKeys = /^(?:(?:(?:exact|permanent|printed|separate|public|visitor|physical|operator|museum) )*entrance(?: reference| distinction|\/accessibility)?|public access|access\s*\/\s*approach)$/i;
const anchorKeys = /^(?:(?:(?:principal|permanent|stable|printed|public|visitor|interpretation|museum) )+(?:anchor(?: name)?|stop|destination|site|locator|locality)|public anchor\s*\/\s*printed street address|existing visitor destinations)$/i;
const visitorAddressKeys = /^(?:(?:operator-listed|printed|published) )?(?:physical )?(?:public (?:arrival |visitor |street |museum )?|visitor(?:-center)? )address(?:es)?$/i;
const listingKeys = /^(?:nrhp|national register)(?: (?:reference(?: number)?|number|id|identifier|weekly list identifier|record name|components|listing))?$/i;
const missing = /^(?:blank|none|n\/a|tbd|unknown|unverified|unconfirmed|unresolved|pending|withheld|hold|not (?:recorded|provided|supplied|verified|established|confirmed|applicable|available|listed)|no (?:verified|confirmed|public|single current)|archive.only|no.anchor)\b/i;

function usable(value) {
  const bare = value.replace(/\[\d+(?:\s*[,–-]\s*\d+)*\]/g, "").replace(/^[^\p{L}\p{N}]+/u, "");
  return Boolean(bare) && !missing.test(bare);
}

function fieldValue(value) {
  const clean = value.replace(/\*\*|`/g, "").trim();
  // Some old dossiers put multiple fields on one line (even when empty).
  const first = clean.split(/(?:^|[.;|]\s*|\s+)(?:HMdb(?=\s*(?:[:#]|\d))|ARK(?=\s*(?::|ark:|and Archive))|Archive (?:image )?ID\s*:|Governing CFR(?:\/spec)?\s*:|Coordinate source(?:\/scope)?\s*:|Register URL\s*:)/i)[0].trim();
  return usable(first) ? first : "";
}

export function publicLocator(pairs, raw) {
  function firstValue(keys) {
    for (const { key, value } of pairs) {
      if (!keys.test(key)) continue;
      const text = fieldValue(value);
      if (text) return text;
    }
    return "";
  }

  const operator = firstValue(operatorKeys);
  const publisherOnly = /\b(?:visitor )?operator(?:\/gate)? (?:not verified|unverified)|for (?:digital anchor|conditional physical research)|^https?:\/\//i.test(operator);

  const anchor = pairs.find(p => /^public anchor$/i.test(p.key))?.value || "";
  const entrance = pairs.find(p => entranceKeys.test(p.key) && p.value.trim())?.value || "";
  const held = /anchor ruling:\s*\**\s*no.anchor/i.test(raw) ||
    /\bno.anchor\b|^\W*(?:archive.only|remote\b|hold\b|none\b)|physical stop not released/i.test(anchor) ||
    /^(?:\W*hold\b|exact .*\bunverified\b)|\bno (?:winter |island )?entrance (?:cleared|released)/i.test(entrance);

  const access = firstValue(entranceKeys) || firstValue(anchorKeys) ||
    firstValue(/^(?:entrance scope|access status|access scope)$/i) || firstValue(visitorAddressKeys);
  const noAccess = /^no (?:island |physical )?(?:entrance|gate|stop|visitor)|published .* transcript now/i.test(access);

  const listing = firstValue(listingKeys);
  // Eligibility and unverified claims do not establish a listing. A named
  // listing can nevertheless be verified even when it has no reference number.
  const listed = Boolean(listing) && !/\b(?:eligible|candidate|not (?:verified|listed)|unverified)\b/i.test(listing) &&
    (/\b(?:[A-Z]{2})?\d{8,9}\b/i.test(listing) || /\b(?:is listed|listed (?:on|in)|NPGallery asset)\b/i.test(listing) ||
      pairs.some(p => /^nrhp record name$/i.test(p.key) && fieldValue(p.value) === listing));
  const registerUrl = firstValue(/^(?:official )?register (?:listing )?url$/i);

  // Quoted numbers in a source/scope note are never coordinates. Even a
  // structured pair needs provenance and must survive the dossier's scope.
  const coordinateNotes = pairs.filter(({ key }) => /coordinate (?:source|scope|note)\b/i.test(key));
  const sourcedPoint = coordinateNotes.some(({ value }) => usable(value.replace(/\*\*/g, "").trim())) ||
    Boolean(firstValue(/^verified coordinates$/i));
  const disputedPoint = coordinateNotes.some(({ value }) =>
    /^(?:\W)*(?:unverified|unconfirmed|disputed|conflicting|provisional|not verified)\b|\b(?:pair|coordinates?|point) (?:is |are )?(?:unverified|disputed|provisional)\b/i.test(value));
  const latitude = firstValue(/^latitude$/i);
  const longitude = firstValue(/^longitude$/i);
  const point = sourcedPoint && !held && !disputedPoint
    ? verifiedMapPoint(pairs, { latitude, longitude }, raw)
    : null;
  return {
    operator: publisherOnly ? "" : operator,
    access: held || noAccess ? "" : access,
    listing: listed ? listing : "",
    registerUrl: listed && /^https?:\/\/[^\s<>]+$/i.test(registerUrl) ? registerUrl : "",
    point,
  };
}
