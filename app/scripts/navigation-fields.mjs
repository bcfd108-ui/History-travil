// Read declared dossier metadata before the public prose cleaner removes its headers.
export function dossierFamilies(preamble) {
  const label = preamble.match(/theme sweep\s*\(([^)\n]*)/i)?.[1] || "";
  const numbers = [
    ...label.matchAll(/\bfamily\s+(\d+(?:\s*\/\s*\d+)*)/gi),
  ].flatMap((match) => match[1].split(/\s*\/\s*/));
  const tags = [];
  if (numbers.includes("1") || numbers.includes("2"))
    tags.push("Prisons & Asylums");
  if (numbers.includes("3")) tags.push("Hospitals");
  if (numbers.includes("4")) tags.push("The Weird & Curious");
  if (numbers.includes("5")) tags.push("Military Ground");
  if (numbers.includes("4") && /\blore\b/i.test(label))
    tags.push("Haunted Tellings");
  return tags;
}

export function recordedCounty(pairs, preamble) {
  const field = pairs.find((p) =>
    /^(county|parish|state\s*\/\s*county(?:\s*\/\s*city)?)$/i.test(p.key),
  );
  if (field) {
    const value = field.key.includes("/")
      ? field.value.split("/")[1]
      : field.value;
    const name = value?.split(/[[(;]/)[0].trim().replace(/\.$/, "");
    if (name && !/^(blank|none|unknown|not recorded)$/i.test(name))
      return /\b(county|parish|borough)$/i.test(name)
        ? name
        : name + (/parish/i.test(field.key) ? " Parish" : " County");
  }
  // Only a complete, delimited geographic field (never a mention in the story).
  const location =
    pairs.find((p) => /^historic location$/i.test(p.key))?.value || "";
  const sweepLocation = preamble.match(/theme sweep[^\n]*/i)?.[0] || "";
  for (const source of [location, sweepLocation]) {
    const match = source.match(
      /(?:^|[,·/]\s*)\s*((?:[A-Z][\p{L}.’'-]*\s+){1,5}(?:County|Parish|Borough))(?=\s*[,·[(]|\.?$)/u,
    );
    if (match) return match[1];
  }
  return "";
}

function degrees(field, axis) {
  const clean = field
    .trim()
    .replace(/(?:\s*\[\d+\])+\s*$/, "")
    .replace(/\.$/, "")
    .trim();
  const decimal = clean.match(/^([+-]?\d+(?:\.\d+)?)°?$/);
  if (decimal) return Number(decimal[1]);
  const dms = clean.match(
    /^(\d+)°\s*(\d+(?:\.\d+)?)['′]\s*(?:(\d+(?:\.\d+)?)["″]\s*)?([NSEW])$/i,
  );
  if (!dms || !(axis === "lat" ? /[NS]/i : /[EW]/i).test(dms[4])) return NaN;
  const minutes = Number(dms[2]),
    seconds = Number(dms[3] || 0);
  if (minutes >= 60 || seconds >= 60) return NaN;
  return (
    (Number(dms[1]) + minutes / 60 + seconds / 3600) *
    (/[SW]/i.test(dms[4]) ? -1 : 1)
  );
}

export function verifiedMapPoint(pairs, locator, raw) {
  // Coordinate notes often quote *rejected* archive or comparison points.
  // Never mine commentary for a pair when the structured fields were left blank.
  const scope = pairs
    .filter((p) => /coordinate (?:scope|source|note)/i.test(p.key))
    .map((p) => p.value)
    .join(" ");
  if (
    /anchor ruling:\s*\**\s*no.anchor/i.test(raw) ||
    /withheld from routing|archival (?:\w+[ -]){0,4}metadata|catalog point for pictured|image record; site-scale|documentary only|no visitor pin/i.test(
      scope,
    )
  )
    return null;
  let lat = degrees(locator.latitude, "lat"),
    lon = degrees(locator.longitude, "lon");
  if (!locator.latitude && !locator.longitude) {
    const field = pairs.find((p) =>
      /^(?:(?:public (?:anchor|visitor|stop)|marker|verified|site) )?coordinates$/i.test(
        p.key,
      ),
    );
    const pair = field?.value.match(
      /^\s*([+-]?\d+\.\d+)\s*,\s*([+-]?\d+\.\d+)(?=\s|$)/,
    );
    if (!pair) return null;
    lat = Number(pair[1]);
    lon = Number(pair[2]);
  }
  return Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
    ? { lat, lon }
    : null;
}

export function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
