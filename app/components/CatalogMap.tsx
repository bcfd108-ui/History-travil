"use client";
import dynamic from "next/dynamic";
export interface MapPlace {
  slug: string;
  title: string;
  lat: number;
  lon: number;
  href: string;
}
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="catalog-map" role="status">
      Loading map…
    </div>
  ),
});
export default function CatalogMap({ places }: { places: MapPlace[] }) {
  return <LeafletMap places={places} />;
}
