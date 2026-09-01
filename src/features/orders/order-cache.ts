import type { QueryClient } from '@tanstack/react-query';
import type { OrderView } from '../../api/orders';

export const orderKeys = {
  list: (sessionId: string | null) => ['orders', sessionId, 'mine'] as const,
  detail: (sessionId: string | null, id: string) => ['orders', sessionId, 'detail', id] as const,
};

export function upsertOrder(orders: OrderView[] = [], order: OrderView): OrderView[] {
  return [order, ...orders.filter((item) => item.id !== order.id)]
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export async function rememberOrder(client: QueryClient, sessionId: string | null, order: OrderView) {
  // A list request started before checkout must not overwrite the new order.
  await client.cancelQueries({ queryKey: orderKeys.list(sessionId) });
  client.setQueryData(orderKeys.detail(sessionId, order.id), order);
  client.setQueryData<OrderView[]>(orderKeys.list(sessionId), (previous) => upsertOrder(previous, order));
  void client.invalidateQueries({ queryKey: orderKeys.list(sessionId) });
}
