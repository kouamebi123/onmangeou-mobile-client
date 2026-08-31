import type { RestaurantSummary } from '@/api/discovery';
import { t } from '@/i18n';

export function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters)) {
    return null;
  }
  if (meters < 1000) {
    return t('map.distanceMeters', { meters: String(Math.max(1, Math.round(meters))) });
  }
  const km = meters < 10_000 ? (meters / 1000).toFixed(1).replace('.', ',') : String(Math.round(meters / 1000));
  return t('map.distanceKm', { km });
}

function clockFromNow(minutesAhead: number): string {
  const date = new Date(Date.now() + minutesAhead * 60_000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function openingStatusParts(restaurant: RestaurantSummary): {
  label: string;
  detail: string | null;
  open: boolean;
} {
  if (restaurant.open) {
    return {
      label: t('common.open'),
      detail: restaurant.closesInMinutes != null ? t('map.closesAt', { time: clockFromNow(restaurant.closesInMinutes) }) : null,
      open: true,
    };
  }
  return {
    label: t('common.closed'),
    detail: restaurant.opensInMinutes != null ? t('map.opensAt', { time: clockFromNow(restaurant.opensInMinutes) }) : null,
    open: false,
  };
}

export function formatOpeningLine(restaurant: RestaurantSummary): string {
  const parts = openingStatusParts(restaurant);
  return parts.detail ? `${parts.label} · ${parts.detail}` : parts.label;
}
