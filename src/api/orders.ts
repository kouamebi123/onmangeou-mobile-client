import { apiRequest } from '@/api/client';
import { createIdempotencyKey } from '@/api/device';
import type { MoneyView } from '@/api/types';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_RESTAURANT'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface OrderItemView {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: MoneyView;
  linePrice: MoneyView;
}

export interface OrderView {
  id: string;
  publicRef: string;
  establishmentId: string;
  establishmentName: string;
  establishmentSlug: string;
  status: OrderStatus;
  service: string;
  paymentMethod?: 'CASH' | 'WAVE' | 'WERO' | 'ORANGE_MONEY' | 'MTN' | 'MOOV' | 'CARD';
  customerName: string;
  customerPhone: string;
  notes: string | null;
  items: OrderItemView[];
  total: MoneyView;
  placedAt: string;
}

export async function createOrder(input: {
  establishmentId: string;
  items: Array<{ productId: string; quantity: number }>;
  customerName?: string;
  notes?: string;
  paymentMethod?: 'CASH' | 'WAVE' | 'WERO' | 'ORANGE_MONEY' | 'MTN' | 'MOOV' | 'CARD';
  service?: 'TAKEAWAY' | 'DINE_IN' | 'DELIVERY';
  deliveryAddress?: string;
  scheduledFor?: string;
}): Promise<OrderView> {
  const envelope = await apiRequest<OrderView>('/orders', {
    method: 'POST',
    idempotent: true,
    idempotencyKey: createIdempotencyKey(),
    body: input,
  });
  return envelope.data;
}

export async function fetchMyOrders(): Promise<OrderView[]> {
  const envelope = await apiRequest<OrderView[]>('/orders');
  return envelope.data;
}

export async function fetchOrder(orderId: string): Promise<OrderView> {
  const envelope = await apiRequest<OrderView>(`/orders/${orderId}`);
  return envelope.data;
}

export async function cancelOrder(orderId: string): Promise<OrderView> {
  const envelope = await apiRequest<OrderView>(`/orders/${orderId}/cancel`, { method: 'POST' });
  return envelope.data;
}

export async function confirmPickup(orderId: string): Promise<OrderView> {
  const envelope = await apiRequest<OrderView>(`/orders/${orderId}/confirm-pickup`, { method: 'POST' });
  return envelope.data;
}
