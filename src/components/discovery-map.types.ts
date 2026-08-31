import type { RestaurantSummary } from '@/api/discovery';

export interface MapRegion {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface DiscoveryMapProps {
  restaurants: RestaurantSummary[];
  selectedId?: string | null;
  userLocation?: UserLocation | null;
  onSelect?: (id: string) => void;
  onOpenRestaurant?: (slug: string) => void;
  onRegionSettled?: (region: MapRegion) => void;
  interactive?: boolean;
  /** Incrémenter pour recentrer de force sur la position et les restos proches. */
  recenterKey?: number;
}
