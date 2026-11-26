// Offline, fail-closed GNIS town matching. Does not mutate source catalog.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const norm = x => String(x ?? "").normalize("NFC").trim().replace(/\s+/g," ").toLowerCase();
const key = (town,state,county) => [town,state,county].map(norm).join("|");
export function matchTowns(sites, features, sourceVersion) {
  if (!sourceVersion) throw Error("GNIS source version required");
  const index = new Map(), stateIndex = new Map();
  for (const f of features) {
    if (norm(f.featureClass) !== "populated place") continue;
    if (!f.id || !f.name || !f.state || !f.county || !Number.isFinite(f.lat) || !Number.isFinite(f.lon) || Math.abs(f.lat)>90 || Math.abs(f.lon)>180) continue;
    const k = key(f.name,f.state,f.county);
    const a = index.get(k) ?? new Map();
    if (a.has(String(f.id)) && JSON.stringify(a.get(String(f.id))) !== JSON.stringify(f)) throw Error("Conflicting GNIS feature "+f.id);
    a.set(String(f.id),f); index.set(k,a);
    const sk = key(f.name,f.state,"");
    const sa = stateIndex.get(sk) ?? new Map();
    sa.set(String(f.id),f); stateIndex.set(sk,sa);
  }
  const references = {}, decisions = [], towns = new Map();
  for (const s of sites) {
    const k = key(s.town,s.stateCode,s.county);
    let status, f;
    if (!norm(s.town) || !norm(s.stateCode) ) status="missing-key";
    else {
      const a = [...((norm(s.county) ? index : stateIndex).get(k)?.values() ?? [])];
      status = a.length===1?"matched":a.length>1?"ambiguous":"unmatched";
      f=a.length===1?a[0]:null;
    }
    if (norm(s.town)) towns.set(k,status);
    const protectedPoint = s.coordinates != null || s.mapPoint != null;
    decisions.push({slug:s.slug,key:k,status,protectedPoint,gnisId:f?.id??null});
    if (status==="matched" && !protectedPoint) references[s.slug]={precision:"G4",town:s.town,stateCode:s.stateCode,county:f.county,gnisId:String(f.id),lat:f.lat,lon:f.lon,source:"USGS GNIS",sourceVersion};
  }
  const tally = values => Object.fromEntries(["matched","ambiguous","unmatched","missing-key"].map(k=>[k,values.filter(v=>v===k).length]));
  return {references,decisions,counts:{townKeys:tally([...towns.values()]),entries:tally(decisions.map(d=>d.status)),protected:decisions.filter(d=>d.protectedPoint).length,assigned:Object.keys(references).length}};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [sitesPath,featuresPath,version,out] = process.argv.slice(2);
  if (!sitesPath||!featuresPath||!version||!out) throw Error("Usage: node match-gnis-towns.mjs sites.json normalized-gnis.json version report.json");
  const result=matchTowns(JSON.parse(readFileSync(sitesPath,"utf8")),JSON.parse(readFileSync(featuresPath,"utf8")),version);
  writeFileSync(out,JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(result.counts));
}
