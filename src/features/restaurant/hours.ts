import { t } from '@/i18n';

const WEEK_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export function formatClockMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Jour courant à l'heure du restaurant.
 *
 * Avec l'horloge du téléphone, un client à Paris voyait « dimanche » à 01:00
 * alors qu'il était encore samedi 23:00 à Abidjan, service en cours.
 */
export function todayWeekDay(timeZone?: string, now: Date = new Date()): (typeof WEEK_DAYS)[number] {
  if (timeZone) {
    try {
      const name = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(now).toUpperCase();
      const match = WEEK_DAYS.find((day) => day === name);
      if (match) return match;
    } catch {
      // Fuseau inconnu de l'appareil : repli sur l'horloge locale.
    }
  }
  return WEEK_DAYS[(now.getDay() + 6) % 7] ?? 'MONDAY';
}

/** Semaine complète : un jour sans plage est un jour de fermeture, à afficher comme tel. */
export function weekSchedule(
  hours: Array<{ weekDay: string; opensAtMinutes: number; closesAtMinutes: number }>,
): Array<{ weekDay: (typeof WEEK_DAYS)[number]; ranges: string[] }> {
  return WEEK_DAYS.map((weekDay) => ({
    weekDay,
    ranges: hours
      .filter((slot) => slot.weekDay === weekDay)
      .sort((left, right) => left.opensAtMinutes - right.opensAtMinutes)
      .map((slot) => hoursRangeLabel(slot.opensAtMinutes, slot.closesAtMinutes)),
  }));
}

export function hoursRangeLabel(opensAtMinutes: number, closesAtMinutes: number): string {
  return `${formatClockMinutes(opensAtMinutes)} – ${formatClockMinutes(closesAtMinutes)}`;
}

export function hoursSummary(
  hours: Array<{ weekDay: string; opensAtMinutes: number; closesAtMinutes: number }>,
): string | null {
  if (hours.length === 0) {
    return null;
  }
  const first = hours[0];
  if (!first) {
    return null;
  }
  const everyday = WEEK_DAYS.every((day) =>
    hours.some(
      (slot) =>
        slot.weekDay === day &&
        slot.opensAtMinutes === first.opensAtMinutes &&
        slot.closesAtMinutes === first.closesAtMinutes,
    ),
  );
  if (everyday) {
    return `${t('restaurant.everyday')} · ${hoursRangeLabel(first.opensAtMinutes, first.closesAtMinutes)}`;
  }
  return null;
}

export function orderedHours(
  hours: Array<{ weekDay: string; opensAtMinutes: number; closesAtMinutes: number }>,
) {
  return [...hours].sort((left, right) => WEEK_DAYS.indexOf(left.weekDay as (typeof WEEK_DAYS)[number]) - WEEK_DAYS.indexOf(right.weekDay as (typeof WEEK_DAYS)[number]));
}
