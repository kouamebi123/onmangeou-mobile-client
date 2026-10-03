import { describe, expect, it } from 'vitest';
import { openingClock, openingStatusParts } from '../../src/features/explore/format';
import { todayWeekDay, weekSchedule } from '../../src/features/restaurant/hours';
import type { RestaurantSummary } from '../../src/api/discovery';

const base: RestaurantSummary = {
  id: 'r1',
  slug: 'chez-tante-marie',
  name: 'Chez Tante Marie',
  city: 'Abidjan',
  district: 'Cocody',
  landmarkText: null,
  latitude: 5.36,
  longitude: -4,
  distanceMeters: null,
  coverImageUrl: null,
  averagePreparationMinutes: null,
  services: [],
  open: true,
  closesInMinutes: 170,
  opensInMinutes: null,
  priceFrom: null,
  isFavorite: false,
  enabledModules: [],
};

describe('Opening status at the restaurant local time', () => {
  it('shows the exact closing time whatever the phone timezone and display delay', () => {
    // Service du samedi jusqu'à 02:00 à Abidjan (UTC+0).
    const parts = openingStatusParts({ ...base, closesAt: '2026-10-04T02:00:00.000Z', timezone: 'Africa/Abidjan' });
    expect(parts).toEqual({ label: 'Ouvert', detail: 'Ferme à 02:00', open: true });
  });

  it('uses the restaurant timezone for a restaurant elsewhere', () => {
    expect(openingClock('2026-10-04T21:30:00.000Z', null, 'Europe/Paris')).toBe('23:30');
  });

  it('shows the next opening of a closed restaurant', () => {
    const parts = openingStatusParts({
      ...base,
      open: false,
      closesInMinutes: null,
      opensInMinutes: 105,
      opensAt: '2026-10-05T11:00:00.000Z',
      timezone: 'Africa/Abidjan',
    });
    expect(parts).toEqual({ label: 'Fermé', detail: 'Ouvre à 11:00', open: false });
  });

  it('keeps working with a server that does not send the instants yet', () => {
    expect(openingClock(undefined, null, 'Africa/Abidjan')).toBeNull();
    expect(openingClock(null, 30, undefined)).toMatch(/^\d{2}:\d{2}$/);
    expect(openingStatusParts({ ...base, open: false, closesInMinutes: null }).detail).toBeNull();
  });
});

describe('Week schedule', () => {
  const hours = [
    { weekDay: 'MONDAY', opensAtMinutes: 1140, closesAtMinutes: 1380 },
    { weekDay: 'MONDAY', opensAtMinutes: 690, closesAtMinutes: 870 },
    { weekDay: 'SATURDAY', opensAtMinutes: 720, closesAtMinutes: 1560 },
  ];

  it('lists the seven days, keeps closed days and orders the services', () => {
    const week = weekSchedule(hours);
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ weekDay: 'MONDAY', ranges: ['11:30 – 14:30', '19:00 – 23:00'] });
    expect(week[5]).toEqual({ weekDay: 'SATURDAY', ranges: ['12:00 – 02:00'] });
    expect(week[6]).toEqual({ weekDay: 'SUNDAY', ranges: [] });
  });

  it('reads today in the restaurant timezone, not the phone one', () => {
    // Samedi 23:10 UTC : encore samedi à Abidjan, déjà dimanche à Paris.
    const now = new Date('2026-10-03T23:10:00Z');
    expect(todayWeekDay('Africa/Abidjan', now)).toBe('SATURDAY');
    expect(todayWeekDay('Europe/Paris', now)).toBe('SUNDAY');
  });
});
