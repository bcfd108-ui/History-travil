// Geography helpers for the Near Here view and claim corroboration.
//
// Location discipline (owner's ruling, Nov 19, 2026): the app learns where
// the player is ONLY when the player taps for it — Near Here sorting, or the
// claim-point on a photo tag. Location is never requested on page load,
// never stored as a trail, and never gates reading.

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  const miles = km * 0.621371;
  if (miles < 0.1) return "under a tenth of a mile";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/**
 * One-shot position read, called only from a tap handler. Resolves null when
 * the player declines, the browser has no geolocation, or the read fails —
 * callers treat null as "no location", never as an error worth blocking on.
 */
export function getPositionOnce(): Promise<LatLon | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  });
}
