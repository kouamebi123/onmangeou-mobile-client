import { describe, expect, it } from 'vitest';
import { orderProgress, reservationStatusTone } from '../../src/features/orders/order-progress';

describe('Order progress', () => {
  it('fills one segment per step the restaurant has reached', () => {
    expect(orderProgress('PENDING_PAYMENT').reached).toBe(0);
    expect(orderProgress('PENDING_RESTAURANT').reached).toBe(1);
    expect(orderProgress('ACCEPTED').reached).toBe(2);
    expect(orderProgress('PREPARING').reached).toBe(3);
    expect(orderProgress('READY')).toEqual({ reached: 4, total: 4, tone: 'success', active: true });
  });

  it('marks finished orders as no longer active', () => {
    expect(orderProgress('COMPLETED')).toEqual({ reached: 4, total: 4, tone: 'success', active: false });
    expect(orderProgress('REJECTED')).toEqual({ reached: 0, total: 4, tone: 'danger', active: false });
    expect(orderProgress('CANCELLED')).toEqual({ reached: 0, total: 4, tone: 'neutral', active: false });
  });

  it('never claims progress for a status it does not know', () => {
    expect(orderProgress('SOMETHING_NEW')).toEqual({ reached: 0, total: 4, tone: 'progress', active: true });
  });
});

describe('Reservation status tone', () => {
  it('separates waiting, accepted and refused requests', () => {
    expect(reservationStatusTone('REQUESTED')).toBe('progress');
    expect(reservationStatusTone('CONFIRMED')).toBe('success');
    expect(reservationStatusTone('REJECTED')).toBe('danger');
    expect(reservationStatusTone('CANCELLED')).toBe('neutral');
  });
});
