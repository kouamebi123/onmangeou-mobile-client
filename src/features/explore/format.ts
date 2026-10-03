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

/**
 * Heure de fermeture ou d'ouverture, à l'heure du restaurant.
 *
 * L'instant exact vient de l'API. L'ancien calcul « maintenant + minutes
 * restantes » dérivait avec le délai d'affichage (« Ferme à 02:01 ») et
 * utilisait le fuseau du téléphone ; il ne sert plus que de repli face à un
 * serveur qui n'envoie pas encore l'instant.
 */
export function openingClock(
  instant: string | null | undefined,
  minutesAhead: number | null,
  timeZone: string | undefined,
): string | null {
  if (instant) {
    const date = new Date(instant);
    if (!Number.isNaN(date.getTime())) {
      try {
        return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
      } catch {
        return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
      }
    }
  }
  return minutesAhead != null ? clockFromNow(minutesAhead) : null;
}

export function openingStatusParts(restaurant: RestaurantSummary): {
  label: string;
  detail: string | null;
  open: boolean;
} {
  if (restaurant.open) {
    const time = openingClock(restaurant.closesAt, restaurant.closesInMinutes, restaurant.timezone);
    return { label: t('common.open'), detail: time ? t('map.closesAt', { time }) : null, open: true };
  }
  const time = openingClock(restaurant.opensAt, restaurant.opensInMinutes, restaurant.timezone);
  return { label: t('common.closed'), detail: time ? t('map.opensAt', { time }) : null, open: false };
}

export function formatOpeningLine(restaurant: RestaurantSummary): string {
  const parts = openingStatusParts(restaurant);
  return parts.detail ? `${parts.label} · ${parts.detail}` : parts.label;
}
