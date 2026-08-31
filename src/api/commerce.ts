import { apiRequest } from '@/api/client';
import type { MoneyView } from '@/api/types';

export async function quoteOrder(input: {
  establishmentId: string;
  items: Array<{ productId: string; quantity: number }>;
}) {
  const envelope = await apiRequest<{ total: MoneyView }>('/orders/quote', { method: 'POST', body: input, auth: false });
  return envelope.data;
}

export async function createPaymentIntent(orderId: string, provider: string) {
  const envelope = await apiRequest<{ id: string; status: string }>('/payments/intents', {
    method: 'POST',
    body: { orderId, provider },
  });
  return envelope.data;
}

export async function confirmPayment(intentId: string) {
  const envelope = await apiRequest<{ status: string }>(`/payments/intents/${intentId}/confirm`, { method: 'POST' });
  return envelope.data;
}

export async function fetchNotifications() {
  const envelope = await apiRequest<Array<{ id: string; title: string; body: string; kind: string; read_at: string | null }>>(
    '/notifications',
  );
  return envelope.data;
}

export async function markNotificationsRead() {
  await apiRequest('/notifications/read', { method: 'POST' });
}

export async function followRestaurant(id: string, on: boolean) {
  await apiRequest(on ? `/follows/${id}` : `/follows/${id}/unfollow`, { method: 'POST' });
}

export async function createReservation(input: {
  establishmentId: string;
  startsAt: string;
  partySize: number;
  notes?: string;
}) {
  const envelope = await apiRequest('/reservations', { method: 'POST', body: input });
  return envelope.data;
}

export async function fetchMyReservations() {
  const envelope = await apiRequest<Array<{ id: string; public_ref: string; status: string; starts_at: string; establishment_name: string }>>(
    '/reservations',
  );
  return envelope.data;
}

export async function cancelReservation(id: string) {
  await apiRequest(`/reservations/${id}/cancel`, { method: 'POST' });
}

export async function createReview(input: { orderId: string; score: number; body?: string }) {
  const envelope = await apiRequest('/reviews', { method: 'POST', body: input });
  return envelope.data;
}

export async function fetchReviews(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; score: number; body: string | null; author_name: string | null; response: string | null }>>(
    `/restaurants/${establishmentId}/reviews`,
    { auth: false },
  );
  return envelope.data;
}

export async function fetchPromotions(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; title: string; body: string | null; discount_bps: number }>>(
    `/restaurants/${establishmentId}/promotions`,
    { auth: false },
  );
  return envelope.data;
}

export async function fetchEvents(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; title: string; body: string | null; starts_at: string }>>(
    `/restaurants/${establishmentId}/events`,
    { auth: false },
  );
  return envelope.data;
}

export async function fetchAddresses() {
  const envelope = await apiRequest<Array<{ id: string; label: string; line: string }>>('/me/addresses');
  return envelope.data;
}

export async function createAddress(label: string, line: string) {
  await apiRequest('/me/addresses', { method: 'POST', body: { label, line } });
}

export async function deleteAddress(id: string) {
  await apiRequest(`/me/addresses/${id}/delete`, { method: 'POST' });
}

export async function createSupportTicket(subject: string, body: string) {
  await apiRequest('/support/tickets', { method: 'POST', body: { subject, body } });
}
