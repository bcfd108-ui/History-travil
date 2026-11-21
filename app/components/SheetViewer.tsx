"use client";
// Zoom-in-place viewer for one map sheet. The image is the record's own
// display image (src); past 1.6× the viewer swaps to the institution's
// larger rendition (image.large) when the record names one. Checked points
// are drawn at their stored x/y % on the image and stay put while zooming;
// no-point ties draw nothing. Wheel or pinch-free buttons to zoom, drag to
// pan, double-click to zoom in, Reset to fit.
import { useCallback, useEffect, useRef, useState } from "react";

export interface ViewerPoint {
  n: number;
  x: number;
  y: number;
  label: string;
}

const MAX = 8;

export default function SheetViewer({
  src,
  large,
  width,
  height,
  alt,
  points,
}: {
  src: string;
  large?: string | null;
  width: number;
  height: number;
  alt: string;
  points: ViewerPoint[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState(1);
  const [t, setT] = useState({ x: 0, y: 0 });
  const [useLarge, setUseLarge] = useState(false);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const clamp = useCallback((nz: number, nx: number, ny: number) => {
    const el = box.current;
    if (!el) return { x: nx, y: ny };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const minX = w - w * nz;
    const minY = h - h * nz;
    return { x: Math.min(0, Math.max(minX, nx)), y: Math.min(0, Math.max(minY, ny)) };
  }, []);

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const el = box.current;
      if (!el) return;
      const nz = Math.min(MAX, Math.max(1, z * factor));
      const px = cx ?? el.clientWidth / 2;
      const py = cy ?? el.clientHeight / 2;
      const nx = px - ((px - t.x) * nz) / z;
      const ny = py - ((py - t.y) * nz) / z;
      setZ(nz);
      setT(clamp(nz, nx, ny));
      if (nz > 1.6 && large) setUseLarge(true);
    },
    [z, t, clamp, large],
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  return (
    <div className="sheet-viewer">
      <div className="sv-controls" role="toolbar" aria-label="Zoom">
        <button type="button" className="btn small-btn" onClick={() => zoomAt(1.5)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="btn small-btn" onClick={() => zoomAt(1 / 1.5)} aria-label="Zoom out">
          −
        </button>
        <button
          type="button"
          className="btn small-btn"
          onClick={() => {
            setZ(1);
            setT({ x: 0, y: 0 });
          }}
        >
          Reset
        </button>
        <span className="small">{Math.round(z * 100)}%</span>
      </div>
      <div
        ref={box}
        className={`sv-box${z > 1 ? " zoomed" : ""}`}
        style={{ aspectRatio: `${width} / ${height}` }}
        onDoubleClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          zoomAt(2, e.clientX - r.left, e.clientY - r.top);
        }}
        onPointerDown={(e) => {
          if (z <= 1) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setT(clamp(z, d.tx + e.clientX - d.x, d.ty + e.clientY - d.y));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div
          className="sv-stage"
          style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${z})` }}
        >
          <img src={useLarge && large ? large : src} alt={alt} draggable={false} />
          {points.map((p) => (
            <span
              key={p.n}
              className="map-pin numbered"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%, -50%) scale(${1 / z})` }}
              title={p.label}
              aria-label={`Point ${p.n}: ${p.label}`}
            >
              {p.n}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
