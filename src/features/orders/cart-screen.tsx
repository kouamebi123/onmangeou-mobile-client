import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { quoteOrder } from '@/api/commerce';
import { fetchRestaurant, PUBLIC_MODULES, restaurantHasModule } from '@/api/discovery';
import { createOrder } from '@/api/orders';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { PageHero } from '@/components/page-hero';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { tokens } from '@/theme';
import { formatFcfa } from '@/theme/format-fcfa';

export function CartScreen() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const establishmentId = useCartStore((state) => state.establishmentId);
  const establishmentName = useCartStore((state) => state.establishmentName);
  const establishmentSlug = useCartStore((state) => state.establishmentSlug);
  const lines = useCartStore((state) => state.lines);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const clear = useCartStore((state) => state.clear);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WAVE' | 'ORANGE_MONEY' | 'CARD'>('CASH');
  const [service, setService] = useState<'TAKEAWAY' | 'DINE_IN' | 'DELIVERY'>('TAKEAWAY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');

  const totalAmount = lines.reduce((sum, line) => sum + Number(line.unitAmount) * line.quantity, 0);
  const restaurant = useQuery({
    queryKey: ['restaurant', establishmentSlug],
    queryFn: () => fetchRestaurant(establishmentSlug ?? ''),
    enabled: Boolean(establishmentSlug),
  });
  const canDeliver = restaurantHasModule(restaurant.data ?? {}, PUBLIC_MODULES.DELIVERY);
  const canPayOnline = restaurantHasModule(restaurant.data ?? {}, PUBLIC_MODULES.PAYMENTS);
  const canOrder = restaurantHasModule(restaurant.data ?? {}, PUBLIC_MODULES.ORDERS);
  const serviceOptions = (
    [
      { id: 'TAKEAWAY', label: 'À emporter' },
      { id: 'DINE_IN', label: 'Sur place' },
      ...(canDeliver ? ([{ id: 'DELIVERY', label: 'Livraison' }] as const) : []),
    ] as const
  );
  const paymentOptions = (
    [
      { id: 'CASH', label: 'Espèces' },
      ...(canPayOnline
        ? ([
            { id: 'WAVE', label: 'WAVE' },
            { id: 'ORANGE_MONEY', label: 'Orange' },
            { id: 'CARD', label: 'CARD' },
          ] as const)
        : []),
    ] as const
  );

  useEffect(() => {
    if (service === 'DELIVERY' && !canDeliver) {
      setService('TAKEAWAY');
    }
    if (paymentMethod !== 'CASH' && !canPayOnline) {
      setPaymentMethod('CASH');
    }
  }, [canDeliver, canPayOnline, paymentMethod, service]);

  const quote = useQuery({
    queryKey: ['orders', 'quote', establishmentId, lines.map((line) => `${line.productId}:${line.quantity}`).join(',')],
    queryFn: () =>
      quoteOrder({
        establishmentId: establishmentId ?? '',
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      }),
    enabled: Boolean(establishmentId) && lines.length > 0,
  });

  const place = useMutation({
    mutationFn: () =>
      createOrder({
        establishmentId: establishmentId ?? '',
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        notes: notes.trim() || undefined,
        paymentMethod,
        service,
        deliveryAddress: service === 'DELIVERY' ? deliveryAddress.trim() || undefined : undefined,
        scheduledFor: scheduledFor.trim() ? new Date(scheduledFor).toISOString() : undefined,
      }),
    onSuccess: (order) => {
      clear();
      router.replace(`/order/${order.id}`);
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.problem.detail : t('errors.generic'));
    },
  });

  return (
    <Screen>
      <PageHero icon="bag-handle-outline" kicker={t('app.name')} title={t('orders.cart')} subtitle={establishmentName ?? undefined} />

      {lines.length === 0 ? (
        <EmptyState
          title={t('orders.cartEmpty')}
          detail={t('orders.emptyDetail')}
          actionLabel={t('orders.exploreCta')}
          onAction={() => router.push('/explorer')}
        />
      ) : null}

      {lines.map((line) => (
        <View key={line.productId} style={styles.line}>
          <View style={styles.lineBody}>
            <AppText variant="subtitle">{line.name}</AppText>
            <AppText variant="muted">{line.formatted}</AppText>
          </View>
          <View style={styles.stepper}>
            <Pressable accessibilityRole="button" onPress={() => decrement(line.productId)} style={styles.step}>
              <AppText variant="subtitle">−</AppText>
            </Pressable>
            <AppText variant="subtitle">{String(line.quantity)}</AppText>
            <Pressable accessibilityRole="button" onPress={() => increment(line.productId)} style={styles.step}>
              <AppText variant="subtitle">+</AppText>
            </Pressable>
          </View>
        </View>
      ))}

      {lines.length > 0 ? (
        <>
          <View style={styles.row}>
            {serviceOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => setService(option.id)}
                style={[styles.chip, service === option.id ? styles.chipOn : null]}
              >
                <AppText color={service === option.id ? tokens.color.text.onBrand : tokens.color.text.primary}>
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </View>
          {service === 'DELIVERY' ? (
            <TextField label="Adresse de livraison" value={deliveryAddress} onChangeText={setDeliveryAddress} />
          ) : null}
          <TextField
            label="Plus tard (optionnel, AAAA-MM-JJTHH:MM)"
            value={scheduledFor}
            onChangeText={setScheduledFor}
            placeholder="2026-08-30T13:30"
          />
          <View style={styles.row}>
            {paymentOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => setPaymentMethod(option.id)}
                style={[styles.chip, paymentMethod === option.id ? styles.chipOn : null]}
              >
                <AppText color={paymentMethod === option.id ? tokens.color.text.onBrand : tokens.color.text.primary}>
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </View>
          <TextField label={t('orders.notes')} value={notes} onChangeText={setNotes} multiline />
          <View style={styles.total}>
            <AppText variant="muted">{t('orders.cart')}</AppText>
            <AppText variant="title">{quote.data?.total.formatted ?? formatFcfa(String(totalAmount))}</AppText>
          </View>
          {formError ? <AppText color={tokens.color.feedback.error}>{formError}</AppText> : null}
          {!canOrder && restaurant.isSuccess ? (
            <AppText variant="muted">Ce restaurant n’accepte pas les commandes en ligne.</AppText>
          ) : null}
          {!accessToken ? (
            <Button label={t('orders.needAuth')} onPress={() => router.push('/auth')} />
          ) : (
            <Button
              label={t('orders.place')}
              loading={place.isPending}
              disabled={!canOrder}
              onPress={() => {
                setFormError(undefined);
                place.mutate();
              }}
            />
          )}
        </>
      ) : null}
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
  lineBody: { flex: 1, gap: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  chip: {
    minHeight: 36,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    paddingHorizontal: tokens.spacing.sm,
    justifyContent: 'center',
    backgroundColor: tokens.color.surface.white,
  },
  chipOn: { backgroundColor: tokens.color.brand.primary, borderColor: tokens.color.brand.primary },
});
