import type { HistoricPhoto, PhotoFrame } from "@/lib/data";

function PhotoFigure({ photo, label }: { photo: PhotoFrame; label?: string }) {
  return (
    <figure className="historic-photo entry-photo">
      <img src={photo.src} alt={photo.alt} loading="eager" />
      <figcaption>
        <span className="hp-caption">{label && <strong>{label} · </strong>}{photo.caption}</span>
        {photo.representative && (
          <span className="badge amber">Representative view — not the site itself</span>
        )}
        <span className="hp-credit">
          {photo.credit} ·{" "}
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
            {photo.sourceName}
          </a>
        </span>
        {photo.dateNote && <details className="hp-note"><summary>About this photograph</summary>{photo.dateNote}</details>}
      </figcaption>
    </figure>
  );
}

export default function EntryPhotos({ lead }: { lead?: HistoricPhoto }) {
  if (!lead) return null;
  const pair = lead.pair;
  if (!pair?.then?.src || !pair.now?.src) return <PhotoFigure photo={lead} />;
  return <>
    {lead.src !== pair.then.src && lead.src !== pair.now.src && <PhotoFigure photo={lead} />}
    <div className="photo-pair" aria-label="Then and now photographs">
      <PhotoFigure label="Then" photo={pair.then} /><PhotoFigure label="Now" photo={pair.now} />
    </div>
  </>;
}
