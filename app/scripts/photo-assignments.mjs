const subjectKeys = new Set(["repositoryId", "sourceDescription", "visibleFeature"]);
const locationKeys = new Set(["townState", "address", "county", "coordinates"]);
const requiredText = (v) => typeof v === "string" && Boolean(v.trim());

export function validateAssignments(manifest, sites, ledger, records) {
  const fail = reason => { throw new Error("Photo assignment: " + reason); };
  if (!/^[0-9a-f]{40}$/.test(manifest.commit) || manifest.catalogCount !== manifest.entries.length) fail("invalid frozen manifest");
  const targets = new Map(manifest.entries.map(t => [t.slug,t]));
  if (targets.size !== manifest.entries.length || new Set(manifest.entries.map(t => t.id)).size !== targets.size) fail("duplicate manifest identity");
  const current = new Map(sites.map(s => [s.slug,s]));
  const approved = new Map(), seen = new Set(), used = new Map();
  for (const row of ledger) {
    const {rowId, targetSlug:slug, targetId:id} = row;
    const target = targets.get(slug), live = current.get(slug);
    if (!target || !live || !id || id !== target.id || id !== live.id) fail(slug + " slug/ID mismatch");
    for (const [field,key] of [["targetTitle","title"],["targetTown","town"],["targetState","state"]]) {
      if (row[field] !== target[key] || row[field] !== live[key]) fail(slug + " changed " + key);
    }
    if (!requiredText(rowId) || seen.has(rowId)) fail(slug + " duplicate or missing row ID");
    seen.add(rowId);
    if (!["APPROVED","REJECTED","HOLD"].includes(row.decision) || !["then","now"].includes(row.eraRole) || !requiredText(row.reason)) fail(rowId + " incomplete adjudication");
    if (row.decision !== "APPROVED") continue;
    for (const key of ["subjectName","sourcePageUrl","imageUrl","license","credit","collisionCheck","imageTitleOrDescription","imageSourceName"]) {
      if (!requiredText(row[key])) fail(rowId + " missing " + key);
    }
    if (!Array.isArray(row.matchEvidence)) fail(rowId + " missing match evidence");
    const keys = new Set();
    for (const e of row.matchEvidence) {
      if (!(subjectKeys.has(e.type) || locationKeys.has(e.type)) || !requiredText(e.detail)) fail(rowId + " invalid matching key");
      keys.add(e.type);
    }
    if (keys.size < 2 || ![...keys].some(k=>subjectKeys.has(k))) fail(rowId + " needs independent subject evidence");
    if (!Array.isArray(row.sharedUseWith)) fail(rowId + " missing shared-use list");
    approved.set(rowId,row);
  }
  const attached = new Set();
  for (const [slug,photos] of Object.entries(records)) {
    if (!targets.has(slug) || !Array.isArray(photos)) fail(slug+" orphan or invalid list");
    for (const p of photos) {
      const row = approved.get(p.rowId);
      if (!row || attached.has(p.rowId) || p.targetSlug !== slug || row.targetSlug !== slug || p.targetId !== row.targetId) fail(slug+" has no matching approved assignment");
      if (p.representative === true || !/^[a-f0-9]{64}$/.test(p.sha256)) fail(slug+" invalid asset");
      for (const [field,key] of [["sourceUrl","sourcePageUrl"],["sourceName","imageSourceName"],["imageUrl","imageUrl"],["license","license"],["credit","credit"],["eraRole","eraRole"],["caption","caption"],["sha256","sha256"]]) {
        if (!requiredText(p[field]) || p[field] !== row[key]) fail(slug+" ledger mismatch: "+field);
      }
      for (const key of [p.imageUrl,p.sha256]) {
        const owners = used.get(key) ?? [];
        for (const other of owners) {
          if (other.targetSlug === slug) fail(slug+" repeats the same image");
          if (!row.sharedUseWith.includes(other.targetSlug) || !other.sharedUseWith.includes(slug) || !requiredText(row.sharedUseApproval) || !requiredText(other.sharedUseApproval)) fail(slug+" shared image requires both approvals");
        }
        owners.push(row);used.set(key,owners);
      }
      attached.add(row.rowId);
    }
  }
  if (attached.size !== approved.size) fail("approved row missing from photo records");
  return {targets:targets.size,ledger:ledger.length,photos:attached.size};
}
