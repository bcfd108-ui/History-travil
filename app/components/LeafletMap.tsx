"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import geography from "us-atlas/states-10m.json";
import type { MapPlace } from "./CatalogMap";

export default function LeafletMap({ places }: { places: MapPlace[] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, {
      maxZoom: 19,
      minZoom: 2,
      scrollWheelZoom: false,
    });
    const pane = map.createPane("stateBoundaries");
    pane.style.zIndex = "150";
    const topo = geography as unknown as Topology<{
      states: GeometryCollection;
    }>;
    L.geoJSON(feature(topo, topo.objects.states), {
      pane: "stateBoundaries",
      interactive: false,
      style: {
        color: "#79786c",
        weight: 1,
        fillColor: "#ece5d3",
        fillOpacity: 1,
      },
      attribution:
        'Boundaries: <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html">U.S. Census Bureau</a>',
    }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);
    const points = L.markerClusterGroup({
      maxClusterRadius: 34,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          className: "ground-cluster",
          html: String(cluster.getChildCount()),
          iconSize: [44, 44],
        }),
    });
    const pin = L.divIcon({
      className: "ground-pin",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    for (const place of places) {
      const marker = L.marker([place.lat, place.lon], {
        icon: pin,
        title: place.title,
        alt: place.title,
        keyboard: true,
      });
      const label = document.createElement("span");
      label.textContent = place.title;
      marker.bindTooltip(label, { direction: "top", offset: [0, -12] });
      marker.on("click", () => window.location.assign(place.href));
      points.addLayer(marker);
    }
    points.addTo(map);
    if (places.length)
      map.fitBounds(points.getBounds(), { padding: [25, 25], maxZoom: 12 });
    else map.setView([39, -98], 4);
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(el.current);
    return () => {
      resize.disconnect();
      map.remove();
    };
  }, [places]);
  return (
    <div
      ref={el}
      className="catalog-map"
      aria-label="Map of researched places"
    />
  );
}
