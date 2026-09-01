import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { orderKeys, rememberOrder, upsertOrder } from '../../src/features/orders/order-cache';
import type { OrderView } from '../../src/api/orders';

const order = (id: string, placedAt = '2026-09-01T12:00:00Z'): OrderView => ({
  id, placedAt, publicRef: id, establishmentId: 'demo', establishmentName: 'Demo', establishmentSlug: 'demo',
  status: 'PENDING_RESTAURANT', service: 'TAKEAWAY', customerName: 'Test', customerPhone: '+2250000000000',
  notes: null, items: [], total: { amount: '5000', formatted: '5 000 FCFA', currency: 'XOF' },
});

describe('order cache after checkout', () => {
  it('shows a newly placed order without refreshing the page', async () => {
    const client = new QueryClient();
    client.setQueryData(orderKeys.list('session'), []);
    await rememberOrder(client, 'session', order('new'));
    expect(client.getQueryData(orderKeys.list('session'))).toEqual([order('new')]);
    expect(client.getQueryData(orderKeys.detail('session', 'new'))).toEqual(order('new'));
    client.clear();
  });
  it('deduplicates replays and keeps newest first', () => {
    expect(upsertOrder([order('old', '2026-08-01T00:00:00Z'), order('new')], order('new'))
      .map((item) => item.id)).toEqual(['new', 'old']);
  });
  it('never mixes different sessions', async () => {
    const client = new QueryClient();
    client.setQueryData(orderKeys.list('other'), [order('other-order')]);
    await rememberOrder(client, 'new-session', order('new'));
    expect(client.getQueryData(orderKeys.list('other'))).toEqual([order('other-order')]);
    client.clear();
  });
});
