// Exact record advisories approved for the Pennsylvania initial photo wave.
// An archive's advisory is evidence for these files, not a blanket license.
const noKnown = "No known restrictions on publication";
const federal = "No known restrictions on images made by the U.S. Government; images copied from other sources may be restricted.";
const reviewedLoc = new Map([
  ["CT-woodstock-roseland-cottage", [
    "https://www.loc.gov/item/2011631587/", noKnown,
  ]],
  ["MA-boston-old-state-house", [
    "https://www.loc.gov/item/2016795031/", noKnown,
  ]],
  ["MI-mackinac-island-fort-mackinac", [
    "https://www.loc.gov/item/2016810163/", noKnown,
  ]],
  ["MD-annapolis-maryland-state-house", [
    "https://www.loc.gov/item/md0068/", federal,
  ]],
  ["MD-baltimore-fort-mchenry", [
    "https://www.loc.gov/item/md0905/", federal,
  ]],
  ["MD-annapolis-chase-lloyd-house", [
    "https://www.loc.gov/item/md0022/", federal,
  ]],
  ["ME-south-portland-breakwater-lighthouse", [
    "https://www.loc.gov/item/me0035/", federal,
  ]],
  ["NH-portsmouth-wentworth-coolidge-mansion", [
    "https://www.loc.gov/item/2016808927/", noKnown,
  ]],
  ["NH-portsmouth-wheelwright-house-strawbery-banke", [
    "https://www.loc.gov/pictures/item/nh0091/", federal,
  ]],
  ["ID-soda-springs-hudspeth-cutoff", [
    "https://www.loc.gov/item/95514248/", noKnown,
  ]],
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
  ["AR-little-rock-central-high-students", [
    "https://www.loc.gov/item/2011631075/", noKnown,
  ]],
  ["LA-natchitoches-texas-pacific-depot", [
    "https://www.loc.gov/item/la0418/", federal,
  ]],
  ["LA-melrose-plantation", [
    "https://www.loc.gov/resource/hhh.la0376.photos.204875p", federal,
  ]],
  ["LA-st-augustine-isle-brevelle", [
    "https://www.loc.gov/resource/hhh.la0451.photos.210393p", federal,
  ]],
  ["LA-beauregard-keyes-house", [
    "https://www.loc.gov/item/2017886941/", noKnown,
  ]],
  ["LA-french-quarter-vieux-carre", [
    "https://www.loc.gov/item/2018705840/", noKnown,
  ]],
  ["LA-gallier-house", [
    "https://www.loc.gov/item/2017887045/", noKnown,
  ]],
  ["LA-cabildo", [
    "https://www.loc.gov/item/2018705292/", noKnown,
  ]],
  ["LA-presbytere", [
    "https://www.loc.gov/pictures/resource/hhh.la0008.photos.072913p", federal,
  ]],
  ["LA-old-ursuline-convent", [
    "https://www.loc.gov/resource/hhh.la0106.photos.072778p", federal,
  ]],
  ["LA-jackson-square-st-louis-cathedral", [
    "https://www.loc.gov/item/2011635158/", noKnown,
  ]],
  ["LA-madame-johns-legacy", [
    "https://www.loc.gov/resource/hhh.la0023.photos.072756p", federal,
  ]],
  ["LA-hermann-grima-house", [
    "https://www.loc.gov/item/2018705463/", noKnown,
  ]],
  ["LA-whitney-plantation", [
    "https://www.loc.gov/item/2017887333/", noKnown,
  ]],
  ["SC-fort-sumter-fort-moultrie", [
    "https://www.loc.gov/pictures/item/2018671038/", noKnown,
  ]],
  ["TN-great-smoky-mountains-cades-cove", [
    "https://www.loc.gov/resource/hhh.tn0001.photos.153634p", federal,
  ]],
  ["FL-castillo-de-san-marcos", [
    "https://www.loc.gov/item/2015649013/", noKnown,
  ]],
  ["FL-fort-jefferson-dry-tortugas", [
    "https://www.loc.gov/resource/hhh.fl0132.photos.053126p", federal,
  ]],
  ["FL-fort-matanzas", [
    "https://www.loc.gov/resource/hhh.fl0166.photos.053863p", federal,
  ]],
  ["KY-mammoth-cave-stephen-bishop", [
    "https://www.loc.gov/item/ky0272/", federal,
  ]],
  ["KY-roebling-suspension-bridge", [
    "https://www.loc.gov/item/oh0104/", federal,
  ]],
  ["NE-homestead-claim-households", [
    "https://www.loc.gov/item/2012646764/", noKnown,
  ]],
  ["NE-niobrara-town-relocations", [
    "https://www.loc.gov/item/ne0010/", federal,
  ]],
  ["MT-rankin-suffrage", [
    "https://www.loc.gov/item/2016867570/", noKnown,
  ]],
  ["MS-st-mary-basilica-natchez", [
    "https://commons.wikimedia.org/wiki/File:St._Mary%27s_Cathedral,_Natchez,_Miss._%288080223546%29.jpg",
    "No known copyright restrictions",
  ]],
  ["AK-independence-mine", [
    "https://www.loc.gov/item/ak0011/", federal,
  ]],
  ["AK-skagway-1915", [
    "https://www.loc.gov/item/2007661322/", noKnown,
  ]],
  ["CT-farmington-first-church", [
    "https://www.loc.gov/item/ct0272/", federal,
  ]],
  ["CT-hartford-mark-twain-house", [
    "https://www.loc.gov/item/ct0332/", federal,
  ]],
  ["DE-newcastle-old-arsenal", [
    "https://www.loc.gov/item/de0078/", federal,
  ]],
  ["IN-madison-shrewsbury-house", [
    "https://www.loc.gov/item/in0131/", federal,
  ]],
  ["ME-portland-head-light", [
    "https://www.loc.gov/item/me0026/", federal,
  ]],
  ["VA-yorktown-battlefield", [
    "https://www.loc.gov/pictures/item/2002713090/", noKnown + ".",
  ]],
  ["VA-manassas-national-battlefield", [
    "https://www.loc.gov/pictures/item/2012647809/", noKnown + ".",
  ]],
  ["VA-natural-bridge", [
    "https://www.loc.gov/pictures/item/2016806805/", noKnown + ".",
  ]],
  ["VA-monticello", [
    "https://www.loc.gov/item/va0059/",
    federal + " https://www.loc.gov/rr/print/res/114_habs.html",
  ]],
  ["VA-mount-vernon", [
    "https://www.loc.gov/item/va0436/",
    federal + " https://www.loc.gov/rr/print/res/114_habs.html",
  ]],
  ["OH-serpent-mound", [
    "https://www.loc.gov/pictures/item/oh2016/",
    federal + " http://www.loc.gov/rr/print/res/114_habs.html",
  ]],
  ["OH-dayton-aviation-heritage", [
    "https://www.loc.gov/item/2001696497/", "No known restrictions.",
  ]],
  ["OH-john-rankin-house", [
    "https://www.loc.gov/item/oh0042/",
    federal + " http://www.loc.gov/rr/print/res/114_habs.html",
  ]],
  ["OH-zoar-village", [
    "https://www.loc.gov/item/oh0221/",
    federal + " https://www.loc.gov/rr/print/res/114_habs.html",
  ]],
  ["OH-edison-birthplace", [
    "https://www.loc.gov/item/oh0271/",
    federal + " https://www.loc.gov/rr/print/res/114_habs.html",
  ]],
  ["OH-oberlin-abolition-ground", [
    "https://www.loc.gov/item/oh0099/",
    federal + " https://www.loc.gov/rr/print/res/114_habs.html",
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
