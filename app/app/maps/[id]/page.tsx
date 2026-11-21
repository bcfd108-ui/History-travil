import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMapLibrary,
  getMapSheet,
  getSite,
  getTiesForSheet,
  getTour,
  getSites,
  mapSheetPending,
  mapTieHasPoint,
  type MapSheet,
} from "@/lib/data";
import SheetViewer from "@/components/SheetViewer";

export const dynamicParams = false;

export function generateStaticParams() {
  return getMapLibrary().sheets.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getMapSheet(id);
  return { title: s ? `${s.title}, ${s.date} — On Old Ground` : "Historic map — On Old Ground" };
}

function cleanTitle(t: string): string {
  return t.replace(/^HT-RES-[A-Z]{2}(?:-[\w-]+)?\s*[—–:]\s*/i, "");
}

function bounds(b: MapSheet["coverage"]["bounds"]): string {
  if (!b) return "";
  if (typeof b === "string") return b;
  return Object.entries(b)
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ");
}

function Field({ k, v, href }: { k: string; v?: string | number | null; href?: string | null }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div>
      <dt>{k}</dt>
      <dd>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer">
            {v}
          </a>
        ) : (
          v
        )}
      </dd>
    </div>
  );
}

export default async function SheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getMapSheet(id);
  if (!s) notFound();
  const ties = getTiesForSheet(id);
  const stateName = getSites().find((x) => x.stateCode === s.place.state)?.state || s.place.state;
  let n = 0;
  const rows = ties.map((t) => {
    const point = mapTieHasPoint(t) ? t.position : null;
    const num = point ? ++n : null;
    const site = t.entryKind === "site" ? getSite(t.entrySlug) : undefined;
    const tour = t.entryKind === "tour" ? getTour(t.entrySlug) : undefined;
    const name = site ? cleanTitle(site.title) : tour ? tour.name : t.entrySlug;
    const href = site ? `/sites/${t.entrySlug}` : tour ? `/tours/${t.entrySlug}` : null;
    return { t, point, num, name, href, kind: tour ? "Route" : "Entry" };
  });
  const points = rows
    .filter((r) => r.point && r.num)
    .map((r) => ({ n: r.num!, x: r.point!.x, y: r.point!.y, label: r.name }));
  const pending = mapSheetPending(s);
  const alt = s.alt ?? `${s.title}, ${s.date}`;

  return (
    <article className="sheet-page">
      <p className="small">
        <Link href="/maps">← Historic maps</Link> · {stateName} · {s.place.town}
      </p>
      <h1>{s.title}</h1>
      <p>
        <span className="badge amber">{s.date}</span>
        <span className="badge">{s.type}</span>
        {s.sheetNumber && (
          <span className="badge">
            Sheet {s.sheetNumber}
            {s.setSize ? ` of ${s.setSize}` : ""}
          </span>
        )}
        {pending && <span className="badge prep">Pending conversion</span>}
      </p>

      {pending ? (
        <div className="map-pending big" role="note">
          <strong>Pending conversion.</strong> The holding institution serves this sheet only as
          GeoTIFF/GeoPDF. It will display here once a plain image conversion is hosted at a stable
          public address. Until then it is not shown.
          {s.source.pageUrl && (
            <>
              {" "}
              <a href={s.source.pageUrl} target="_blank" rel="noreferrer">
                The record at the holding institution
              </a>
              .
            </>
          )}
        </div>
      ) : (
        <SheetViewer
          src={s.image.src!}
          large={s.image.large ?? null}
          width={s.image.width || 1000}
          height={s.image.height || 1200}
          alt={alt}
          points={points}
        />
      )}

      <p className="sheet-credit">{s.credit}</p>
      <section className="panel" aria-label="What this sheet does not show">
        <h2>Limits</h2>
        <p>{s.limitsNote}</p>
      </section>

      <h2>Tied catalog locations</h2>
      <div className="rows tie-rows">
        {rows.map((r) => {
          const inner = (
            <>
              <span className="t">
                {r.num ? <span className="pin-num">{r.num}</span> : null}
                {r.name}
              </span>
              <span className="small">
                {r.kind} ·{" "}
                {r.point ? "Marked on the sheet — checked point" : "No point on this sheet — shown plain"}
              </span>
              {r.t.basisNote && <span className="small basis">{r.t.basisNote}</span>}
            </>
          );
          return r.href ? (
            <Link key={`${r.t.entrySlug}`} className="row" href={r.href}>
              {inner}
            </Link>
          ) : (
            <div key={r.t.entrySlug} className="row">
              {inner}
            </div>
          );
        })}
      </div>

      <h2>Coverage</h2>
      <dl className="locator-grid">
        <Field k="Bounds" v={bounds(s.coverage.bounds)} />
        <Field k="Basis" v={s.coverage.basis} />
        <Field k="What it covers" v={s.coverage.description} />
      </dl>

      <h2>The record</h2>
      <dl className="locator-grid">
        <Field k="Maker" v={s.maker} />
        <Field k="Publisher" v={s.publisher} />
        <Field k="Date as printed" v={s.date} />
        <Field k="Type" v={s.type} />
        <Field k="Place" v={[s.place.town, s.place.county, stateName].filter(Boolean).join(", ")} />
        <Field k="Sheet" v={s.sheetNumber ? `${s.sheetNumber}${s.setSize ? ` of ${s.setSize}` : ""}` : null} />
        <Field k="Set note" v={s.setNote} />
        <Field k="Printed scale" v={s.printedScale} />
        <Field k="Printed north" v={s.printedNorth} />
        <Field k="Collection" v={s.source.collection} />
        <Field k="Item" v={s.source.itemId} href={s.source.pageUrl} />
        <Field k="Sheet file" v={s.source.sheetFile} />
        <Field k="Rights" v={s.rights} />
        <Field k="Image host" v={s.image.host} />
        <Field k="Master file" v={s.image.master ? "Full-resolution master" : null} href={s.image.master} />
        <Field k="Commons page" v={s.image.commonsPage ? "Wikimedia Commons" : null} href={s.image.commonsPage} />
      </dl>
    </article>
  );
}
