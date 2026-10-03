import { describe, expect, it } from 'vitest';
import { groupSlotsByDay, reservationInstant, wallDate } from '../src/features/restaurant/reservation-time';

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

describe('Server reservation slots', () => {
  it('groups the slots by restaurant day and labels them at the restaurant time', () => {
    const days = groupSlotsByDay(
      ['2026-10-05T19:30:00.000Z', '2026-10-05T11:00:00.000Z', '2026-10-06T01:30:00.000Z', 'not-a-date'],
      'Africa/Abidjan',
    );
    expect(days).toEqual([
      {
        day: '2026-10-05',
        times: [
          { label: '11:00', iso: '2026-10-05T11:00:00.000Z' },
          { label: '19:30', iso: '2026-10-05T19:30:00.000Z' },
        ],
      },
      { day: '2026-10-06', times: [{ label: '01:30', iso: '2026-10-06T01:30:00.000Z' }] },
    ]);
  });
  it('does not use the phone timezone', () => {
    // 22:30 UTC : déjà le lendemain 00:30 à Paris en été.
    expect(groupSlotsByDay(['2026-09-05T22:30:00.000Z'], 'Europe/Paris')).toEqual([
      { day: '2026-09-06', times: [{ label: '00:30', iso: '2026-09-05T22:30:00.000Z' }] },
    ]);
  });
});
