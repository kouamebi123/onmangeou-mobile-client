import { t } from '@/i18n';

const WEEK_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export function formatClockMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function todayWeekDay(): (typeof WEEK_DAYS)[number] {
  return WEEK_DAYS[(new Date().getDay() + 6) % 7] ?? 'MONDAY';
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
