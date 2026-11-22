const federalAdvisory = "No known restrictions on images made by the U.S. Government; images copied from other sources may be restricted.";
const habsHttp = federalAdvisory + " http://www.loc.gov/rr/print/res/114_habs.html";
const habsHttps = federalAdvisory + " https://www.loc.gov/rr/print/res/114_habs.html";
const reviewedLoc = new Map([
  ["NY-ellis-island", ["https://www.loc.gov/pictures/item/ny1604.photos.118038p", habsHttp]],
  ["NY-erie-canal-lockport", ["https://www.loc.gov/pictures/item/ny1209.photos.222526p/", habsHttp]],
  ["NY-fort-ticonderoga", ["https://www.loc.gov/pictures/item/ny0211.photos.116499p/", habsHttps]],
  ["NY-west-point", ["https://www.loc.gov/pictures/item/ny1393.photos.121425p/", habsHttp]],
  ["NY-sleepy-hollow-sunnyside", ["https://www.loc.gov/pictures/item/ny0876.photos.124862p", habsHttp]],
  ["NY-niagara-reservation", ["https://www.loc.gov/pictures/item/2016794140/", "No known restrictions on publication."]],
]);

/** Exact reviewed New York advisories; undefined delegates to existing rules. */
export function checkNyPhotoAdvisory(slug, photo) {
  if (slug === "NY-camp-santanoni") return photo.sourceUrl === "https://commons.wikimedia.org/wiki/File:Santanoni_Preserve_-_Main_Lodge.jpg"
    && photo.license === "CC BY-SA 3.0"
    && photo.licenseUrl === "https://creativecommons.org/licenses/by-sa/3.0"
    && photo.credit === "Mwanner at English Wikipedia · Lossless WebP conversion by On Old Ground; no crop or resize"
    && photo.year === null && !photo.dateNote;
  const found = reviewedLoc.get(slug);
  if (found) return photo.sourceUrl === found[0] && photo.license === found[1];
}
