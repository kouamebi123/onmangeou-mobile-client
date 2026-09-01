import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { confirmPayment, createPaymentIntent, createReview } from '@/api/commerce';
import { cancelOrder, confirmPickup, fetchOrder } from '@/api/orders';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ErrorState } from '@/components/error-state';
import { PageHero } from '@/components/page-hero';
import { Price } from '@/components/price';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { t } from '@/i18n';
import { tokens } from '@/theme';
import { useAuthStore } from '@/store/auth-store';
import { orderKeys } from './order-cache';

export function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = useAuthStore((state) => state.sessionId);

  const detail = useQuery({
    queryKey: orderKeys.detail(sessionId, id ?? ''),
    queryFn: () => fetchOrder(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: 8000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const cancel = useMutation({
    mutationFn: () => cancelOrder(id ?? ''),
    onSuccess: invalidate,
  });

  const pickup = useMutation({
    mutationFn: () => confirmPickup(id ?? ''),
    onSuccess: invalidate,
  });

  const [reviewBody, setReviewBody] = useState('');
  const pay = useMutation({
    mutationFn: async () => {
      const method = detail.data?.paymentMethod;
      if (!method || method === 'CASH') throw new Error(t('payments.unavailable'));
      const intent = await createPaymentIntent(id ?? '', method);
      return confirmPayment(intent.id);
    },
    onSuccess: invalidate,
  });
  const review = useMutation({
    mutationFn: () => createReview({ orderId: id ?? '', score: 5, body: reviewBody.trim() || undefined }),
    onSuccess: invalidate,
  });

  if (detail.isLoading) {
    return (
      <Screen>
        <Skeleton height={160} />
        <Skeleton height={120} />
      </Screen>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <Screen>
        <ErrorState onRetry={() => void detail.refetch()} />
        <Button label={t('restaurant.back')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const order = detail.data;
  const actionError =
    cancel.error instanceof ApiError
      ? cancel.error.problem.detail
      : pickup.error instanceof ApiError
        ? pickup.error.problem.detail
        : cancel.error || pickup.error || pay.error || review.error
          ? t('errors.generic') : undefined;

  return (
    <Screen>
      <PageHero
        icon="receipt-outline"
        kicker={t('orders.ref', { ref: order.publicRef })}
        title={order.establishmentName}
        subtitle={t(`orders.status.${order.status}`)}
      />

      {order.items.map((item) => (
        <View key={item.id} style={styles.line}>
          <View style={styles.lineBody}>
            <AppText variant="subtitle">
              {item.quantity} × {item.name}
            </AppText>
          </View>
          <Price value={item.linePrice} />
        </View>
      ))}

      {order.notes ? (
        <View style={styles.card}>
          <AppText variant="muted">{t('orders.notes')}</AppText>
          <AppText>{order.notes}</AppText>
        </View>
      ) : null}

      <View style={styles.total}>
        <AppText variant="muted">{t('orders.cart')}</AppText>
        <Price value={order.total} />
      </View>

      {actionError ? <AppText color={tokens.color.feedback.error}>{actionError}</AppText> : null}

      {order.status === 'PENDING_PAYMENT' ? (
        <Button
          label={t('payments.simulate')}
          loading={pay.isPending}
          onPress={() => pay.mutate()}
        />
      ) : null}
      {order.status === 'PENDING_RESTAURANT' || order.status === 'PENDING_PAYMENT' ? (
        <Button
          label={t('orders.cancel')}
          variant="outline"
          loading={cancel.isPending}
          onPress={() => cancel.mutate()}
        />
      ) : null}
      {order.status === 'READY' ? (
        <Button label={t('orders.confirmPickup')} loading={pickup.isPending} onPress={() => pickup.mutate()} />
      ) : null}
      {order.status === 'COMPLETED' ? (
        <>
          <TextField label="Votre avis" value={reviewBody} onChangeText={setReviewBody} />
          <Button label="Publier un avis" loading={review.isPending} onPress={() => review.mutate()} />
        </>
      ) : null}
      <Button label={t('restaurant.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  lineBody: { flex: 1 },
  card: {
    gap: tokens.spacing.xs,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
