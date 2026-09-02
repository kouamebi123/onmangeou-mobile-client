import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rememberOrder } from './order-cache';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { quoteOrder } from '@/api/commerce';
import { createIdempotencyKey } from '@/api/device';
import { fetchRestaurant, PUBLIC_MODULES, restaurantHasModule } from '@/api/discovery';
import { SchedulePicker } from './schedule-picker';
import { createOrder, fetchOrderSchedule } from '@/api/orders';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { PageHero } from '@/components/page-hero';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { hapticLight, hapticSuccess } from '@/feedback/haptics';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { tokens } from '@/theme';
import { formatFcfa } from '@/theme/format-fcfa';

export function CartScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = useAuthStore((state) => state.sessionId);
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
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WAVE' | 'WERO' | 'ORANGE_MONEY' | 'MTN' | 'MOOV' | 'CARD'>('CASH');
  const [service, setService] = useState<'TAKEAWAY' | 'DINE_IN' | 'DELIVERY'>('TAKEAWAY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [couponDraft, setCouponDraft] = useState('');
  const [coupon, setCoupon] = useState<{ establishmentId: string; code: string } | null>(null);
  const couponCode = coupon?.establishmentId === establishmentId ? coupon.code : undefined;
  const attempt = useRef<{ payload: string; key: string } | null>(null);

  const schedule = useQuery({
    queryKey: ['order-slots', establishmentId],
    queryFn: () => fetchOrderSchedule(establishmentId ?? ''),
    enabled: Boolean(establishmentId) && lines.length > 0,
    refetchInterval: 30_000,
    staleTime: 0,
  });
  const scheduleValid = Boolean(schedule.data && (scheduledFor
    ? schedule.data.slots.includes(scheduledFor)
    : schedule.data.asapAvailable));
  useEffect(() => { setScheduledFor(''); }, [establishmentId]);

  const totalAmount = lines.reduce((sum, line) => sum + Number(line.unitAmount) * line.quantity, 0);
  const restaurant = useQuery({
    queryKey: ['restaurant', establishmentSlug],
    queryFn: () => fetchRestaurant(establishmentSlug ?? ''),
    enabled: Boolean(establishmentSlug),
  });
  const canDeliver = restaurantHasModule(restaurant.data ?? {}, PUBLIC_MODULES.DELIVERY);
  const canPayOnline = restaurantHasModule(restaurant.data ?? {}, PUBLIC_MODULES.PAYMENTS);
  const canOrder = restaurantHasModule(restaurant.data ?? {}, PUBLIC_MODULES.ORDERS);
  const canUseCoupon = restaurantHasModule(restaurant.data ?? {}, PUBLIC_MODULES.MARKETING);
  const serviceOptions = (
    [
      { id: 'TAKEAWAY', label: t('restaurant.takeaway') },
      { id: 'DINE_IN', label: t('restaurant.dineIn') },
      ...(canDeliver ? ([{ id: 'DELIVERY', label: t('restaurant.delivery') }] as const) : []),
    ] as const
  );
  const paymentOptions = (
    [
      { id: 'CASH', label: t('payments.cash') },
      ...(canPayOnline
        ? ([
            { id: 'WAVE', label: t('payments.wave') },
            { id: 'WERO', label: t('payments.wero') },
            { id: 'ORANGE_MONEY', label: t('payments.orangeMoney') },
            { id: 'MTN', label: t('payments.mtn') },
            { id: 'MOOV', label: t('payments.moov') },
            { id: 'CARD', label: t('payments.card') },
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
    queryKey: ['orders', 'quote', establishmentId, lines.map((line) => `${line.productId}:${line.quantity}`).join(','), couponCode],
    queryFn: () =>
      quoteOrder({
        establishmentId: establishmentId ?? '',
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        couponCode,
      }),
    enabled: Boolean(establishmentId) && lines.length > 0,
    staleTime: 0,
    retry: false,
  });

  const place = useMutation({
    mutationFn: () => {
      const input = {
        establishmentId: establishmentId ?? '',
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        notes: notes.trim() || undefined,
        paymentMethod,
        service,
        deliveryAddress: service === 'DELIVERY' ? deliveryAddress.trim() || undefined : undefined,
        scheduledFor: scheduledFor || undefined,
        couponCode,
      };
      const payload = JSON.stringify(input);
      if (attempt.current?.payload !== payload) attempt.current = { payload, key: createIdempotencyKey() };
      return createOrder(input, attempt.current.key);
    },
    onSuccess: async (order) => {
      hapticSuccess();
      attempt.current = null;
      await rememberOrder(queryClient, sessionId, order);
      clear();
      router.replace(`/order/${order.id}`);
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.problem.detail : t('errors.generic'));
    },
  });

  return (
    <Screen pointerEvents={place.isPending ? 'none' : 'auto'}>
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
        <View key={line.productId} style={styles.line} pointerEvents={place.isPending ? 'none' : 'auto'}>
          <View style={styles.lineBody}>
            <AppText variant="subtitle">{line.name}</AppText>
            <AppText variant="muted">{line.formatted}</AppText>
          </View>
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('orders.decreaseQty', { name: line.name })}
              hitSlop={6}
              onPress={() => {
                hapticLight();
                decrement(line.productId);
              }}
              style={styles.step}
            >
              <AppText variant="subtitle">−</AppText>
            </Pressable>
            <AppText variant="subtitle">{String(line.quantity)}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('orders.increaseQty', { name: line.name })}
              hitSlop={6}
              onPress={() => {
                hapticLight();
                increment(line.productId);
              }}
              style={styles.step}
            >
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
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: service === option.id }}
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
            <TextField label={t('orders.deliveryAddress')} value={deliveryAddress} onChangeText={setDeliveryAddress} />
          ) : null}
          <SchedulePicker data={schedule.data} loading={schedule.isPending} error={schedule.isError}
            value={scheduledFor} onChange={setScheduledFor} service={service}
            retry={() => { void schedule.refetch(); }} />
          {!scheduleValid && scheduledFor ? <AppText color={tokens.color.feedback.error}>{t('schedule.expired')}</AppText> : null}
          <View style={styles.row}>
            {paymentOptions.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: paymentMethod === option.id }}
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
          {canUseCoupon || couponCode ? (
            <View style={styles.coupon}>
              <AppText variant="subtitle">{t('coupon.title')}</AppText>
              <AppText variant="muted">{t('coupon.hint')}</AppText>
              {couponCode ? (
                <>
                  <AppText>{couponCode}</AppText>
                  <Button label={t('coupon.remove')} variant="ghost" disabled={place.isPending}
                    onPress={() => { setCoupon(null); setCouponDraft(''); setFormError(undefined); }} />
                </>
              ) : (
                <>
                  <TextField label={t('coupon.code')} value={couponDraft} onChangeText={setCouponDraft}
                    autoCapitalize="characters" autoCorrect={false} maxLength={40} editable={!place.isPending} />
                  <Button label={t('coupon.apply')} variant="outline" disabled={place.isPending || !/^[A-Z0-9_-]{3,40}$/.test(couponDraft.trim().toUpperCase())}
                    onPress={() => { hapticLight(); setFormError(undefined); setCoupon({ establishmentId: establishmentId ?? '', code: couponDraft.trim().toUpperCase() }); }} />
                </>
              )}
            </View>
          ) : null}
          {paymentMethod !== 'CASH' ? <AppText>{t('payments.simulation')}</AppText> : null}
          {quote.data?.couponCode && !quote.isError && !quote.isFetching ? (
            <View style={styles.coupon}>
              <View style={styles.total}><AppText>{t('coupon.subtotal')}</AppText><AppText>{quote.data.subtotal.formatted}</AppText></View>
              <View style={styles.total}><AppText>{t('coupon.discount', { code: quote.data.couponCode })}</AppText>
                <AppText color={tokens.color.brand.primary}>−{quote.data.discount.formatted}</AppText></View>
            </View>
          ) : null}
          <View style={styles.total}>
            <AppText variant="muted">{t('coupon.total')}</AppText>
            <AppText variant="title">{quote.isFetching ? t('coupon.calculating') : quote.isError ? '—' : quote.data?.total.formatted ?? formatFcfa(String(totalAmount))}</AppText>
          </View>
          {quote.isError ? <><AppText color={tokens.color.feedback.error}>{quote.error instanceof ApiError ? quote.error.problem.detail : t('errors.generic')}</AppText>
            <Button label={t('coupon.retry')} variant="outline" onPress={() => { void quote.refetch(); }} /></> : null}
          {formError ? <AppText color={tokens.color.feedback.error}>{formError}</AppText> : null}
          {!canOrder && restaurant.isSuccess ? (
            <AppText variant="muted">{t('orders.notAvailable')}</AppText>
          ) : null}
          {!accessToken ? (
            <Button label={t('orders.needAuth')} onPress={() => router.push('/auth')} />
          ) : (
            <Button
              label={t('orders.place')}
              loading={place.isPending}
              disabled={!canOrder || !scheduleValid || schedule.isError || !quote.isSuccess || quote.isFetching}
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
  coupon: { gap: tokens.spacing.sm, padding: tokens.spacing.md, borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface.mint, borderWidth: 1, borderColor: tokens.color.border.default },
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
    minHeight: tokens.layout.minTouchTarget,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    paddingHorizontal: tokens.spacing.sm,
    justifyContent: 'center',
    backgroundColor: tokens.color.surface.white,
  },
  chipOn: { backgroundColor: tokens.color.brand.primary, borderColor: tokens.color.brand.primary },
});
