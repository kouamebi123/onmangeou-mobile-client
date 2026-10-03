import type { OrderStatus } from '@/api/orders';

export type StatusTone = 'neutral' | 'progress' | 'success' | 'danger';

export interface OrderProgress {
  /** Étapes franchies sur quatre : envoyée, acceptée, en cuisine, prête. */
  reached: number;
  total: 4;
  tone: StatusTone;
  /** Vrai tant que la commande peut encore évoluer. */
  active: boolean;
}

const REACHED: Record<string, number> = {
  PENDING_PAYMENT: 0,
  PENDING_RESTAURANT: 1,
  ACCEPTED: 2,
  PREPARING: 3,
  READY: 4,
  COMPLETED: 4,
};

export function orderProgress(status: OrderStatus | string): OrderProgress {
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return { reached: 0, total: 4, tone: status === 'REJECTED' ? 'danger' : 'neutral', active: false };
  }
  if (status === 'COMPLETED') {
    return { reached: 4, total: 4, tone: 'success', active: false };
  }
  return { reached: REACHED[status] ?? 0, total: 4, tone: status === 'READY' ? 'success' : 'progress', active: true };
}

export function orderStatusTone(status: OrderStatus | string): StatusTone {
  return orderProgress(status).tone;
}

export function reservationStatusTone(status: string): StatusTone {
  switch (status) {
    case 'CONFIRMED':
    case 'SEATED':
    case 'COMPLETED':
      return 'success';
    case 'REJECTED':
    case 'NO_SHOW':
      return 'danger';
    case 'CANCELLED':
      return 'neutral';
    default:
      return 'progress';
  }
}
