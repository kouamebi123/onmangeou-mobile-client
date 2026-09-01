import { describe, expect, it } from 'vitest';
import { clusterRestaurants } from '../../src/components/map-clusters';
import type { RestaurantSummary } from '../../src/api/discovery';

const restaurant = (id: string, longitude: number): RestaurantSummary => ({
  id, longitude, latitude: 5, name: id, slug: id, city: 'Abidjan', district: null,
  landmarkText: null, distanceMeters: null, coverImageUrl: null, averagePreparationMinutes: null,
  services: [], open: true, closesInMinutes: null, opensInMinutes: null, priceFrom: null,
  isFavorite: false, enabledModules: [],
});
const map = (offset: number, zoom = 12) => ({
  getZoom: () => zoom,
  project: ([lng, lat]: [number, number]) => ({ x: lng * 100 + offset, y: lat * 100 + offset }),
});
describe('stable geographic markers', () => {
  const points = [restaurant('a', 1), restaurant('b', 1.1), restaurant('c', 5)];
  it('preserves cluster membership and coordinates while panning', () => {
    expect(clusterRestaurants(map(0), points)).toEqual(clusterRestaurants(map(1200), points));
  });
  it('does not change clusters when API results are reordered', () => {
    expect(clusterRestaurants(map(0), points)).toEqual(clusterRestaurants(map(0), [...points].reverse()));
  });
  it('restores exact individual coordinates at close zoom', () => {
    expect(clusterRestaurants(map(0, 16), points).map((item) => item.type)).toEqual(['pin', 'pin', 'pin']);
    const item = clusterRestaurants(map(0, 16), points)[0];
    expect(item?.type === 'pin' && item.restaurant.longitude).toBe(1);
  });
  it('excludes invalid coordinates', () => {
    expect(clusterRestaurants(map(0), [restaurant('bad', NaN)])).toEqual([]);
  });
});
