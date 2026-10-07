import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { orderKeys } from './order-cache';
import { orderStatusTone } from './order-progress';
import { Ionicons } from '@expo/vector-icons';

import { fetchMyOrders, type OrderView } from '@/api/orders';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Appear } from '@/components/motion';
import { ErrorState } from '@/components/error-state';
import { PageHero } from '@/components/page-hero';
import { Price } from '@/components/price';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { StatusChip } from '@/components/status-chip';
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

  const { refetch } = orders;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

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
        <Appear style={styles.panel}>
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
        </Appear>
      ) : null}

      {/* Clé stable (identifiant de commande) : le rafraîchissement périodique ne rejoue pas l'apparition. */}
      {accessToken && orders.data?.map((order, index) => (
        <Appear key={order.id} index={index}>
          <OrderRow order={order} onPress={() => router.push(`/order/${order.id}`)} />
        </Appear>
      ))}
    </Screen>
  );
}

function OrderRow({ order, onPress }: { order: OrderView; onPress: () => void }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const placedAt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: order.timezone ?? 'Africa/Abidjan',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(order.placedAt));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${order.establishmentName}, ${t(`orders.status.${order.status}`)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.cardBody}>
        <StatusChip label={t(`orders.status.${order.status}`)} tone={orderStatusTone(order.status)} />
        <AppText variant="subtitle">{order.establishmentName}</AppText>
        <AppText variant="muted">
          {[placedAt, t('orders.items', { count: String(itemCount) })].join(' · ')}
        </AppText>
      </View>
      <View style={styles.cardSide}>
        <Price value={order.total} />
        <Ionicons name="chevron-forward" size={18} color={tokens.color.text.muted} />
      </View>
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
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cardBody: { flex: 1, gap: tokens.spacing.xxs },
  cardSide: { alignItems: 'flex-end', gap: tokens.spacing.xs },
});
