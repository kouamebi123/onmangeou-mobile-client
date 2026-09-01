import type { RestaurantSummary } from '../api/discovery';
const CLUSTER_RADIUS_PX = 52;
const CLUSTER_MAX_ZOOM = 15;
interface MapProjection { getZoom(): number; project(point: [number, number]): { x: number; y: number }; }

type ClusteredPin = { type: 'pin'; key: string; restaurant: RestaurantSummary };
type ClusteredGroup = {
  type: 'cluster';
  key: string;
  restaurants: RestaurantSummary[];
  longitude: number;
  latitude: number;
};
type ClusteredItem = ClusteredPin | ClusteredGroup;

function clusterKey(restaurants: RestaurantSummary[]): string {
  return `cluster:${restaurants
    .map((item) => item.id)
    .sort()
    .join(',')}`;
}

export function clusterRestaurants(map: MapProjection, restaurants: RestaurantSummary[]): ClusteredItem[] {
  const valid = restaurants.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  if (valid.length === 0) {
    return [];
  }
  try {
    if (map.getZoom() >= CLUSTER_MAX_ZOOM) {
      return valid.map((restaurant) => ({ type: 'pin', key: `pin:${restaurant.id}`, restaurant }));
    }
  } catch {
    return valid.map((restaurant) => ({ type: 'pin', key: `pin:${restaurant.id}`, restaurant }));
  }

  // Stable grouping regardless of the API's distance ordering.
  const remaining = [...valid].sort((a, b) => a.id.localeCompare(b.id));
  const items: ClusteredItem[] = [];
  while (remaining.length > 0) {
    const first = remaining.shift();
    if (!first) {
      break;
    }
    let origin;
    try {
      origin = map.project([first.longitude, first.latitude]);
    } catch {
      items.push({ type: 'pin', key: `pin:${first.id}`, restaurant: first });
      continue;
    }
    const group = [first];
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const other = remaining[index];
      if (!other) {
        continue;
      }
      try {
        const point = map.project([other.longitude, other.latitude]);
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        if (dx * dx + dy * dy <= CLUSTER_RADIUS_PX * CLUSTER_RADIUS_PX) {
          group.push(other);
          remaining.splice(index, 1);
        }
      } catch {
        // Point hors projection.
      }
    }
    if (group.length === 1) {
      items.push({ type: 'pin', key: `pin:${first.id}`, restaurant: first });
      continue;
    }
    items.push({
      type: 'cluster',
      key: clusterKey(group),
      restaurants: group,
      longitude: group.reduce((sum, item) => sum + item.longitude, 0) / group.length,
      latitude: group.reduce((sum, item) => sum + item.latitude, 0) / group.length,
    });
  }
  return items;
}
