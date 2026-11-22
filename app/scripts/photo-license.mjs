// Exact record advisories approved for the Pennsylvania initial photo wave.
// An archive's advisory is evidence for these files, not a blanket license.
const noKnown = "No known restrictions on publication";
const federal = "No known restrictions on images made by the U.S. Government; images copied from other sources may be restricted.";
const reviewedLoc = new Map([
  ["PA-gettysburg-national-military-park", [
    "https://www.loc.gov/pictures/item/2018670709/",
    noKnown + '. For information, see "Civil war photographs, 1861-1865,"',
  ]],
  ["PA-johnstown-flood-national-memorial", [
    "https://www.loc.gov/pictures/item/2002707085/", noKnown,
  ]],
  ["PA-independence-hall", [
    "https://www.loc.gov/pictures/item/pa0939.photos.139488p/",
    federal + " https://www.loc.gov/rr/print/res/114_habs.html",
  ]],
  ["PA-valley-forge", [
    "https://www.loc.gov/pictures/item/pa0636.photos.136207p/",
    federal + " https://www.loc.gov/rr/print/res/114_habs.html",
  ]],
  ["PA-horseshoe-curve", [
    "https://www.loc.gov/item/2007661523/",
    noKnown + ". No renewal found in Copyright Office.",
  ]],
  ["PA-allegheny-portage-railroad", [
    "https://www.loc.gov/pictures/item/pa0207/",
    federal + " http://www.loc.gov/rr/print/res/114_habs.html",
  ]],
  ["PA-drake-well-titusville", [
    "https://www.loc.gov/item/2010649522/", noKnown + ".",
  ]],
]);
const centraliaSource = "https://commons.wikimedia.org/wiki/File:A421,_Centralia,_Pennsylvania,_USA,_Route_61,_abandoned_section_above_coal_mine_fire,_2016.jpg";

export function hasApprovedPhotoLicense(slug, photo) {
  if (slug === "PA-centralia") {
    return photo.license === "Free Art License 1.3" &&
      photo.licenseUrl === "https://artlibre.org/licence/lal/en/" &&
      photo.sourceUrl === centraliaSource &&
      photo.credit === "Brian W. Schaller" &&
      photo.modificationNote === "Losslessly converted to WebP by On Old Ground; no crop or resize.";
  }
  if (/^(Public domain\b|CC0\b|CC BY(?:-SA)? [1-4]\.0\b|CC BY(?:-SA)? 2\.5\b)/i.test(photo.license)) return true;
  const reviewed = reviewedLoc.get(slug);
  return !!reviewed && photo.sourceUrl === reviewed[0] && photo.license === reviewed[1];
}
