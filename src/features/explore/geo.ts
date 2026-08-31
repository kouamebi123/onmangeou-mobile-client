export const ABIDJAN = { latitude: 5.35995, longitude: -4.00826 };

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthMeters = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthMeters * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function radiusMetersFromBounds(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): number {
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;
  const corner = haversineMeters(centerLat, centerLng, bounds.north, bounds.east);
  return Math.min(50_000, Math.max(100, Math.round(corner)));
}

export const DEFAULT_MAP_STYLE =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

export const NEARBY_RADIUS_METERS = 20_000;
export const OUT_OF_ZONE_METERS = 40_000;
