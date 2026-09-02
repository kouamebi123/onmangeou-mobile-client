import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { orderKeys } from './order-cache';
import { Ionicons } from '@expo/vector-icons';

import { fetchMyOrders, type OrderView } from '@/api/orders';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { PageHero } from '@/components/page-hero';
import { Price } from '@/components/price';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { tokens } from '@/theme';

export function OrdersScreen() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const sessionId = useAuthStore((state) => state.sessionId);
  const [focused, setFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  const orders = useQuery({
    queryKey: orderKeys.list(sessionId),
    queryFn: fetchMyOrders,
    enabled: Boolean(accessToken) && focused,
    staleTime: 0,
    refetchInterval: focused ? 8000 : false,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await orders.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [orders.refetch]);

  return (
    <Screen refreshControl={accessToken ? <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} /> : undefined}>
      <PageHero icon="receipt-outline" kicker={t('app.name')} title={t('tabs.orders')} subtitle={t('orders.hero')} />

      {!accessToken ? (
        <View style={styles.panel}>
          <View style={styles.mark}>
            <Ionicons name="bag-handle" size={32} color={tokens.color.text.onBrand} />
          </View>
          <AppText variant="subtitle" style={styles.center}>
            {t('orders.needAuth')}
          </AppText>
          <Button label={t('common.signIn')} onPress={() => router.push('/auth')} />
        </View>
      ) : null}

      {accessToken && orders.isLoading ? <Skeleton height={120} /> : null}
      {accessToken && orders.isError ? <ErrorState onRetry={() => void orders.refetch()} /> : null}
      {accessToken && orders.data && orders.data.length === 0 ? (
        <View style={styles.panel}>
          <View style={styles.mark}>
            <Ionicons name="bag-handle-outline" size={32} color={tokens.color.text.onBrand} />
          </View>
          <AppText variant="subtitle" style={styles.center}>
            {t('orders.empty')}
          </AppText>
          <AppText variant="muted" style={styles.center}>
            {t('orders.emptyDetail')}
          </AppText>
          <Button label={t('orders.exploreCta')} onPress={() => router.push('/explorer')} />
        </View>
      ) : null}

      {accessToken && orders.data?.map((order) => (
        <OrderRow key={order.id} order={order} onPress={() => router.push(`/order/${order.id}`)} />
      ))}
    </Screen>
  );
}

function OrderRow({ order, onPress }: { order: OrderView; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.cardBody}>
        <AppText variant="subtitle">{order.establishmentName}</AppText>
        <AppText variant="caption" color={tokens.color.brand.primary}>
          {t(`orders.status.${order.status}`)}
        </AppText>
        <AppText variant="muted">{t('orders.ref', { ref: order.publicRef })}</AppText>
      </View>
      <Price value={order.total} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.color.brand.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  cardBody: { flex: 1, gap: 2 },
});
