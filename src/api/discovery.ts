import { apiRequest } from '@/api/client';
import type { MoneyView } from '@/api/types';

export interface RestaurantSummary {
  id: string;
  slug: string;
  name: string;
  city: string;
  district: string | null;
  landmarkText: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  coverImageUrl: string | null;
  averagePreparationMinutes: number | null;
  services: string[];
  open: boolean;
  closesInMinutes: number | null;
  opensInMinutes: number | null;
  priceFrom: MoneyView | null;
  isFavorite: boolean;
  enabledModules: string[];
  hasTerrace?: boolean;
  hasAirConditioning?: boolean;
  accessible?: boolean;
}

export const PUBLIC_MODULES = {
  STOREFRONT: 'storefront.basic',
  CATALOG: 'catalog.advanced',
  ORDERS: 'orders.marketplace',
  RESERVATIONS: 'reservations.tables',
  PAYMENTS: 'payments.online',
  DELIVERY: 'delivery.internal',
  MARKETING: 'marketing.promotions',
} as const;

export function restaurantHasModule(
  restaurant: { enabledModules?: string[] },
  code: string,
): boolean {
  return Boolean(restaurant.enabledModules?.includes(code));
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  price: MoneyView;
  available: boolean;
  vegetarian: boolean;
  halal: boolean;
  spicyLevel: number | null;
  preparationMinutes: number | null;
  imageUrl: string | null;
  allergens: string[];
}

export interface RestaurantDetail extends RestaurantSummary {
  timezone?: string;
  description: string | null;
  phoneE164: string | null;
  addressLine: string | null;
  verified: boolean;
  hours: Array<{ weekDay: string; opensAtMinutes: number; closesAtMinutes: number }>;
  menus: Array<{
    id: string;
    name: string;
    categories: Array<{
      id: string;
      name: string;
      description: string | null;
      products: MenuProduct[];
    }>;
  }>;
}

export interface DiscoverQuery {
  q?: string;
  city?: string;
  openNow?: boolean;
  vegetarian?: boolean;
  halal?: boolean;
  terrace?: boolean;
  airConditioning?: boolean;
  accessible?: boolean;
  minPrice?: number;
  maxPrice?: number;
  service?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'RESERVATION';
  cursor?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  sort?: 'distance' | 'name' | 'recent';
  limit?: number;
}

export interface SearchSuggestion {
  type: 'restaurant' | 'dish';
  label: string;
  slug?: string;
}

export async function discoverRestaurants(query: DiscoverQuery = {}): Promise<{
  items: RestaurantSummary[];
  nextCursor: string | null;
}> {
  const envelope = await apiRequest<RestaurantSummary[]>('/discovery/restaurants', {
    query: {
      q: query.q,
      city: query.city,
      openNow: query.openNow,
      vegetarian: query.vegetarian,
      halal: query.halal,
      terrace: query.terrace,
      airConditioning: query.airConditioning,
      accessible: query.accessible,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      service: query.service,
      cursor: query.cursor,
      latitude: query.latitude,
      longitude: query.longitude,
      radiusMeters: query.radiusMeters,
      sort: query.sort ?? 'recent',
      limit: query.limit,
    },
  });
  return { items: envelope.data, nextCursor: envelope.meta.nextCursor };
}

export async function fetchSearchSuggestions(term: string): Promise<SearchSuggestion[]> {
  if (term.trim().length < 2) {
    return [];
  }
  const envelope = await apiRequest<SearchSuggestion[]>('/search/suggestions', {
    auth: false,
    query: { q: term.trim() },
  });
  return envelope.data;
}

export async function fetchRestaurant(slug: string): Promise<RestaurantDetail> {
  const envelope = await apiRequest<RestaurantDetail>(`/restaurants/${encodeURIComponent(slug)}`);
  return envelope.data;
}

export async function fetchFavorites(): Promise<RestaurantSummary[]> {
  const envelope = await apiRequest<RestaurantSummary[]>('/favorites');
  return envelope.data;
}

export async function addFavorite(restaurantId: string): Promise<void> {
  await apiRequest<null>(`/favorites/${restaurantId}`, { method: 'POST' });
}

export async function removeFavorite(restaurantId: string): Promise<void> {
  await apiRequest<null>(`/favorites/${restaurantId}`, { method: 'DELETE' });
}
