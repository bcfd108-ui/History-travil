import { readFileSync, writeFileSync } from "node:fs";
import { normalize } from "./navigation-fields.mjs";

const data = new URL("../data/", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, data), "utf8"));
const tops = read("plain-tops.json");
const rows = read("sites.json").map((site) => {
  const { slug, stateCode, state, town, county, stopType, mapPoint } = site;
  // Some older headings begin with the desk's machine-readable dossier ID.
  // Keep it searchable, but use readable place words in the public index.
  const title = site.title.replace(
    /^HT-RES-[A-Z]{2}(?:-([\w-]+))?\s*[—–:]\s*/i,
    (_, id) =>
      id
        ? id
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ") + " — "
        : "",
  );
  const themes = [
    ...new Set([
      ...site.themeFamilies,
      ...site.themes.map((t) => (t === "Military" ? "Military Ground" : t)),
    ]),
  ];
  const top = tops[slug]?.sections[0];
  const opening = [
    ...(top?.paragraphs || []),
    ...(top?.bullets || []),
    site.standfirst,
    site.lead,
    site.story.split(/\n\s*\n/)[0],
  ]
    .filter(Boolean)
    .join(" ");
  const recordedName = site.locator.stableName;
  return {
    slug,
    title,
    recordedName,
    town,
    county,
    state,
    stateCode,
    themes,
    stopType,
    mapPoint,
    nameKey: normalize(title),
    recordedNameKey: normalize(recordedName),
    townKey: normalize(town),
    areaKey: normalize(county),
    text: normalize(
      [
        title,
        site.title,
        recordedName,
        town,
        county,
        state,
        stateCode,
        ...themes,
        opening,
      ].join(" "),
    ),
  };
});
writeFileSync(new URL("navigation.json", data), JSON.stringify(rows));
