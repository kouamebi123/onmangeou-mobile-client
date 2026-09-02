import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchEvents, fetchPromotions, fetchReviews, followRestaurant } from '@/api/commerce';
import { fetchRestaurant, PUBLIC_MODULES, restaurantHasModule } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { DishCard } from '@/components/dish-card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OfflineBanner } from '@/components/offline-banner';
import { OpeningStatusText } from '@/components/opening-status-text';
import { Skeleton } from '@/components/skeleton';
import { ReservationForm } from './reservation-form';
import { formatDistance } from '@/features/explore/format';
import { restaurantCoverUrl } from '@/features/restaurant/cover';
import { hoursRangeLabel, hoursSummary, orderedHours, todayWeekDay } from '@/features/restaurant/hours';
import { useFavoriteToggle } from '@/features/favorites/use-favorite-toggle';
import { t } from '@/i18n';
import { useCartStore } from '@/store/cart-store';
import { tokens } from '@/theme';

const SERVICE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  DINE_IN: { label: 'restaurant.dineIn', icon: 'restaurant-outline' },
  TAKEAWAY: { label: 'restaurant.takeaway', icon: 'bag-handle-outline' },
  DELIVERY: { label: 'restaurant.delivery', icon: 'bicycle-outline' },
  RESERVATION: { label: 'restaurant.reservation', icon: 'calendar-outline' },
};

export function RestaurantScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [hoursOpen, setHoursOpen] = useState(false);

  const detail = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: () => fetchRestaurant(slug ?? ''),
    enabled: Boolean(slug),
  });

  const { toggle: toggleFavorite, pending: favoritePending } = useFavoriteToggle({
    id: detail.data?.id ?? '',
    slug: slug ?? '',
    isFavorite: detail.data?.isFavorite ?? false,
  });
  const canReserve = restaurantHasModule(detail.data ?? {}, PUBLIC_MODULES.RESERVATIONS);
  const canOrder = restaurantHasModule(detail.data ?? {}, PUBLIC_MODULES.ORDERS);
  const canMarket = restaurantHasModule(detail.data ?? {}, PUBLIC_MODULES.MARKETING);

  const reviews = useQuery({
    queryKey: ['reviews', detail.data?.id],
    queryFn: () => fetchReviews(detail.data?.id ?? ''),
    enabled: Boolean(detail.data?.id),
  });
  const events = useQuery({
    queryKey: ['events', detail.data?.id],
    queryFn: () => fetchEvents(detail.data?.id ?? ''),
    enabled: Boolean(detail.data?.id) && canMarket,
  });
  const promotions = useQuery({
    queryKey: ['promotions', detail.data?.id],
    queryFn: () => fetchPromotions(detail.data?.id ?? ''),
    enabled: Boolean(detail.data?.id) && canMarket,
  });
  const follow = useMutation({
    mutationFn: () => followRestaurant(detail.data?.id ?? '', true),
  });
  const addToCart = useCartStore((state) => state.add);
  const cartLines = useCartStore((state) => state.lines);
  const cartEstablishmentId = useCartStore((state) => state.establishmentId);

  if (detail.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <Skeleton height={280} />
          <Skeleton height={88} />
          <Skeleton height={160} />
        </View>
      </SafeAreaView>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.padded}>
          <ErrorState onRetry={() => void detail.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const restaurant = detail.data;
  const cartCount = cartEstablishmentId === restaurant.id ? cartLines.reduce((sum, line) => sum + line.quantity, 0) : 0;
  const today = todayWeekDay();
  const summary = hoursSummary(restaurant.hours);
  const todaySlot = restaurant.hours.find((slot) => slot.weekDay === today);
  const canCall = Boolean(restaurant.phoneE164);
  const canDirect = Number.isFinite(restaurant.latitude) && Number.isFinite(restaurant.longitude);
  const distance = formatDistance(restaurant.distanceMeters);
  const placeLine = [restaurant.district, restaurant.city].filter(Boolean).join(' · ');
  const openDirections = () => {
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`,
    );
  };

  return (
    <View style={styles.safe}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={[styles.scroll, canOrder && cartCount > 0 ? styles.scrollWithCart : null]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Image
            source={{ uri: restaurantCoverUrl(restaurant.coverImageUrl, restaurant.id) }}
            style={styles.cover}
            contentFit="cover"
          />
          <View style={styles.heroShade} />
          <SafeAreaView edges={['top']} style={styles.heroBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('restaurant.back')}
              onPress={() => router.back()}
              style={styles.heroBtn}
            >
              <Ionicons name="chevron-back" size={22} color={tokens.color.brand.deep} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={restaurant.isFavorite ? t('restaurant.favoriteRemove') : t('restaurant.favoriteAdd')}
              disabled={favoritePending}
              onPress={toggleFavorite}
              style={[styles.heroBtn, favoritePending ? styles.heroBtnBusy : null]}
            >
              <Ionicons
                name={restaurant.isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={restaurant.isFavorite ? tokens.color.brand.accent : tokens.color.brand.deep}
              />
            </Pressable>
          </SafeAreaView>
          <View style={styles.heroMeta}>
            <View style={[styles.openPill, restaurant.open ? styles.openPillOn : styles.openPillOff]}>
              <View style={[styles.openDot, restaurant.open ? styles.openDotOn : styles.openDotOff]} />
              <OpeningStatusText restaurant={restaurant} />
            </View>
          </View>
          <View style={styles.avatar}>
            <Image
              source={{ uri: restaurantCoverUrl(restaurant.coverImageUrl, restaurant.id) }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <AppText variant="title" style={styles.title}>
                {restaurant.name}
              </AppText>
              {restaurant.verified ? (
                <Ionicons name="checkmark-circle" size={20} color={tokens.color.brand.primary} />
              ) : null}
            </View>
            <AppText variant="muted">{[distance, placeLine].filter(Boolean).join(' · ')}</AppText>
            {restaurant.verified ? (
              <AppText variant="caption" color={tokens.color.brand.primary} style={styles.verifiedLabel}>
                {t('restaurant.verified')}
              </AppText>
            ) : null}
          </View>

          {restaurant.description ? <AppText style={styles.lead}>{restaurant.description}</AppText> : null}

          <View style={styles.actions}>
            <ActionChip icon="navigate" label={t('restaurant.directions')} disabled={!canDirect} onPress={openDirections} />
            <ActionChip
              icon="call"
              label={t('restaurant.call')}
              disabled={!canCall}
              onPress={() => {
                if (restaurant.phoneE164) {
                  void Linking.openURL(`tel:${restaurant.phoneE164}`);
                }
              }}
            />
            <ActionChip
              icon={restaurant.isFavorite ? 'heart' : 'heart-outline'}
              label={restaurant.isFavorite ? t('restaurant.favoriteRemoveShort') : t('restaurant.favoriteShort')}
              accent={restaurant.isFavorite}
              disabled={favoritePending}
              onPress={toggleFavorite}
            />
          </View>
          <View style={styles.actions}>
            <ActionChip icon="notifications-outline" label="Suivre" onPress={() => follow.mutate()} />
          </View>
          {canReserve ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <ReservationForm key={restaurant.id} establishmentId={restaurant.id} timezone={restaurant.timezone} />
              </View>
            </View>
          ) : null}

          <View style={styles.facts}>
            {restaurant.services.map((service) => {
              const meta = SERVICE_META[service];
              return (
                <View key={service} style={styles.fact}>
                  <Ionicons name={meta?.icon ?? 'ellipse-outline'} size={14} color={tokens.color.brand.primary} />
                  <AppText variant="caption" color={tokens.color.brand.deep} style={styles.factLabel}>
                    {t(meta?.label ?? service)}
                  </AppText>
                </View>
              );
            })}
            {restaurant.averagePreparationMinutes ? (
              <View style={styles.fact}>
                <Ionicons name="hourglass-outline" size={14} color={tokens.color.brand.primary} />
                <AppText variant="caption" color={tokens.color.brand.deep} style={styles.factLabel}>
                  {t('restaurant.prep', { minutes: String(restaurant.averagePreparationMinutes) })}
                </AppText>
              </View>
            ) : null}
            {restaurant.hasTerrace ? (
              <View style={styles.fact}>
                <Ionicons name="sunny-outline" size={14} color={tokens.color.brand.primary} />
                <AppText variant="caption" color={tokens.color.brand.deep} style={styles.factLabel}>
                  Terrasse
                </AppText>
              </View>
            ) : null}
            {restaurant.hasAirConditioning ? (
              <View style={styles.fact}>
                <Ionicons name="snow-outline" size={14} color={tokens.color.brand.primary} />
                <AppText variant="caption" color={tokens.color.brand.deep} style={styles.factLabel}>
                  Clim
                </AppText>
              </View>
            ) : null}
            {restaurant.accessible ? (
              <View style={styles.fact}>
                <Ionicons name="accessibility-outline" size={14} color={tokens.color.brand.primary} />
                <AppText variant="caption" color={tokens.color.brand.deep} style={styles.factLabel}>
                  Accessible
                </AppText>
              </View>
            ) : null}
            {restaurant.priceFrom ? (
              <View style={styles.fact}>
                <Ionicons name="pricetag-outline" size={14} color={tokens.color.brand.primary} />
                <AppText variant="caption" color={tokens.color.brand.deep} style={styles.factLabel}>
                  {t('restaurant.priceFrom', { price: restaurant.priceFrom.formatted })}
                </AppText>
              </View>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('restaurant.directions')}
            disabled={!canDirect}
            onPress={openDirections}
            style={styles.card}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="location" size={18} color={tokens.color.brand.primary} />
            </View>
            <View style={styles.cardBody}>
              <AppText variant="subtitle">{t('restaurant.info')}</AppText>
              {restaurant.addressLine ? <AppText>{restaurant.addressLine}</AppText> : null}
              {placeLine ? <AppText variant="muted">{placeLine}</AppText> : null}
              {restaurant.landmarkText ? <AppText variant="muted">{restaurant.landmarkText}</AppText> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.color.text.muted} />
          </Pressable>

          {restaurant.hours.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name="time" size={18} color={tokens.color.brand.primary} />
              </View>
              <View style={styles.cardBody}>
                <AppText variant="subtitle">{t('restaurant.hours')}</AppText>
                <AppText>
                  {summary ??
                    (todaySlot
                      ? `${t('restaurant.todayHours')} · ${hoursRangeLabel(todaySlot.opensAtMinutes, todaySlot.closesAtMinutes)}`
                      : t(`weekdays.${today}`))}
                </AppText>
                {hoursOpen ? (
                  <View style={styles.hoursList}>
                    {orderedHours(restaurant.hours).map((slot) => {
                      const isToday = slot.weekDay === today;
                      return (
                        <View key={`${slot.weekDay}-${slot.opensAtMinutes}`} style={styles.hoursRow}>
                          <AppText
                            variant="caption"
                            color={isToday ? tokens.color.brand.deep : tokens.color.text.muted}
                            style={isToday ? styles.today : undefined}
                          >
                            {t(`weekdays.${slot.weekDay}`)}
                          </AppText>
                          <AppText
                            variant="caption"
                            color={isToday ? tokens.color.brand.deep : tokens.color.text.muted}
                            style={isToday ? styles.today : undefined}
                          >
                            {hoursRangeLabel(slot.opensAtMinutes, slot.closesAtMinutes)}
                          </AppText>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setHoursOpen((open) => !open)}
                  style={styles.hoursToggle}
                >
                  <AppText variant="caption" color={tokens.color.brand.primary} style={styles.hoursToggleLabel}>
                    {hoursOpen ? t('restaurant.hoursLess') : t('restaurant.hoursMore')}
                  </AppText>
                </Pressable>
              </View>
            </View>
          ) : null}

          {promotions.data && promotions.data.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <AppText variant="subtitle">Bons plans</AppText>
                {promotions.data.map((item) => (
                  <AppText key={item.id}>
                    {item.title}
                    {item.discount_bps ? ` · −${Math.round(item.discount_bps / 100)} %` : ''}
                  </AppText>
                ))}
              </View>
            </View>
          ) : null}
          {events.data && events.data.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <AppText variant="subtitle">Événements</AppText>
                {events.data.map((event) => (
                  <AppText key={event.id}>{event.title}</AppText>
                ))}
              </View>
            </View>
          ) : null}
          {reviews.data && reviews.data.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <AppText variant="subtitle">Avis</AppText>
                {reviews.data.slice(0, 3).map((item) => (
                  <AppText key={item.id}>
                    {item.score}/5 · {item.body ?? item.author_name}
                    {item.verified ? ` · ${t('review.verified')}` : ''}
                  </AppText>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.menuHead}>
            <AppText variant="subtitle">{t('restaurant.menu')}</AppText>
            {restaurant.priceFrom ? (
              <AppText variant="caption">{t('restaurant.priceFrom', { price: restaurant.priceFrom.formatted })}</AppText>
            ) : null}
          </View>
          {restaurant.menus.map((menu) => (
            <View key={menu.id} style={styles.menuBlock}>
              {restaurant.menus.length > 1 ? <AppText variant="muted">{menu.name}</AppText> : null}
              {menu.categories.map((category) => (
                <View key={category.id} style={styles.category}>
                  <AppText variant="muted" style={styles.categoryName}>
                    {category.name}
                  </AppText>
                  {category.description ? <AppText variant="muted">{category.description}</AppText> : null}
                  {category.products.map((dish) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      onAdd={
                        canOrder
                          ? () =>
                              addToCart({
                                establishmentId: restaurant.id,
                                establishmentName: restaurant.name,
                                establishmentSlug: restaurant.slug,
                                productId: dish.id,
                                name: dish.name,
                                unitAmount: dish.price.amount,
                                formatted: dish.price.formatted,
                              })
                          : undefined
                      }
                    />
                  ))}
                </View>
              ))}
            </View>
          ))}
          {restaurant.menus.every((menu) => menu.categories.every((category) => category.products.length === 0)) ? (
            <EmptyState title={t('empty.menu')} />
          ) : null}
        </View>
      </ScrollView>
      {canOrder && cartCount > 0 ? (
        <View style={styles.cartBar}>
          <Button
            label={t('orders.seeCart', { count: String(cartCount) })}
            onPress={() => router.push('/cart')}
          />
        </View>
      ) : null}
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  disabled,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, disabled ? styles.actionOff : null, accent ? styles.actionOn : null]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color={accent ? tokens.color.brand.accent : tokens.color.brand.primary} />
      </View>
      <AppText variant="caption" color={tokens.color.brand.deep} style={styles.actionLabel} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.brand.cream },
  padded: { padding: tokens.layout.screenPadding, gap: tokens.spacing.md },
  scroll: { paddingBottom: tokens.spacing.xxl },
  scrollWithCart: { paddingBottom: 120 },
  cartBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: tokens.layout.screenPadding,
    paddingBottom: tokens.spacing.xl,
    backgroundColor: tokens.color.brand.cream,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border.default,
  },
  hero: { height: 300, backgroundColor: tokens.color.brand.deep, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23, 59, 54, 0.22)',
  },
  heroBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.color.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  heroBtnBusy: { opacity: 0.7 },
  heroMeta: {
    position: 'absolute',
    left: tokens.layout.screenPadding,
    bottom: 56,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    minHeight: 32,
  },
  openPillOn: { backgroundColor: tokens.color.surface.white },
  openPillOff: { backgroundColor: tokens.color.surface.white },
  openDot: { width: 8, height: 8, borderRadius: 4 },
  openDotOn: { backgroundColor: tokens.color.feedback.success },
  openDotOff: { backgroundColor: tokens.color.text.muted },
  avatar: {
    position: 'absolute',
    left: tokens.layout.screenPadding,
    bottom: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.color.brand.deep,
    borderWidth: 4,
    borderColor: tokens.color.brand.cream,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  avatarImage: { width: '100%', height: '100%' },
  sheet: {
    marginTop: -20,
    backgroundColor: tokens.color.brand.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: 52,
    gap: tokens.spacing.md,
  },
  titleBlock: { gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs, paddingRight: tokens.spacing.xl },
  title: { flex: 1, fontSize: tokens.typography.size.xxl },
  verifiedLabel: { fontFamily: tokens.typography.family.semibold },
  lead: { color: tokens.color.text.primary },
  actions: { flexDirection: 'row', gap: tokens.spacing.sm },
  action: {
    flex: 1,
    minHeight: 76,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface.white,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  actionOn: { borderColor: tokens.color.brand.accent },
  actionOff: { opacity: 0.45 },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.color.surface.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontFamily: tokens.typography.family.semibold, textAlign: 'center' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.color.surface.mint,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    minHeight: 30,
  },
  factLabel: { fontFamily: tokens.typography.family.semibold },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    padding: tokens.spacing.md,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  hoursList: { gap: tokens.spacing.xs, paddingTop: tokens.spacing.xs },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  today: { fontFamily: tokens.typography.family.semibold },
  hoursToggle: { alignSelf: 'flex-start', minHeight: tokens.layout.minTouchTarget, justifyContent: 'center' },
  hoursToggleLabel: { fontFamily: tokens.typography.family.semibold },
  menuHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  menuBlock: { gap: tokens.spacing.md },
  category: { gap: tokens.spacing.sm },
  categoryName: { fontFamily: tokens.typography.family.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
});
