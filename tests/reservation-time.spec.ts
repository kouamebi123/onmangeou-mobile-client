import { describe, expect, it } from 'vitest';
import { reservationInstant, wallDate } from '../src/features/restaurant/reservation-time';

describe('Reservation time in the restaurant timezone', () => {
  it('converts Abidjan and Paris wall times independently of the phone', () => {
    expect(reservationInstant('2026-09-05', '19:30', 'Africa/Abidjan')?.toISOString()).toBe('2026-09-05T19:30:00.000Z');
    expect(reservationInstant('2026-09-05', '19:30', 'Europe/Paris')?.toISOString()).toBe('2026-09-05T17:30:00.000Z');
  });
  it('rejects invalid dates, hours and nonexistent daylight saving times', () => {
    expect(reservationInstant('2026-02-30', '19:30', 'Africa/Abidjan')).toBeNull();
    expect(reservationInstant('2026-09-05', '25:00', 'Africa/Abidjan')).toBeNull();
    expect(reservationInstant('2026-03-29', '02:30', 'Europe/Paris')).toBeNull();
  });
  it('uses the restaurant calendar day near midnight', () => {
    const instant = new Date('2026-09-05T23:30:00Z');
    expect(wallDate(instant, 'Africa/Abidjan')).toBe('2026-09-05');
    expect(wallDate(instant, 'Europe/Paris')).toBe('2026-09-06');
  });
});
