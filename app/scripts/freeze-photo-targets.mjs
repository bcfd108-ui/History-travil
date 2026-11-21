import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Run on the catalog revision being reviewed, after npm run convert.
const data = new URL("../data/", import.meta.url);
const sites = JSON.parse(readFileSync(new URL("sites.json", data), "utf8"));
const commit = execFileSync("git", ["rev-parse", "HEAD"], {cwd:fileURLToPath(data),encoding:"utf8"}).trim();
const entries = sites.map(({id,slug,title,town,state,stateCode,county,coordinates,coordinateKind,stopType,locator}) => ({
  id,slug,title,town,state,stateCode,county,coordinates,coordinateKind,stopType,
  subject:title,stableName:locator.stableName,address:locator.address,locator
}));
const manifest = {commit,catalogCount:entries.length,entries};
writeFileSync(new URL("photo-desk/targets.json", data), JSON.stringify(manifest,null,1)+"\n");
console.log("Frozen", entries.length, "photo targets at", commit);
