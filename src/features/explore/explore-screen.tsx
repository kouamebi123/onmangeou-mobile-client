import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { discoverRestaurants, type SearchSuggestion } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { DiscoveryMap } from '@/components/discovery-map';
import type { MapRegion } from '@/components/discovery-map.types';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ExploreSearch, type ExploreFilters } from '@/components/explore-search';
import { MapBottomSheet } from '@/components/map-bottom-sheet';
import { OfflineBanner } from '@/components/offline-banner';
import { RestaurantCard } from '@/components/restaurant-card';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { OUT_OF_ZONE_METERS } from '@/features/explore/geo';
import { parseSearchIntent } from '@/features/explore/search-intent';
import { useUserLocation } from '@/features/explore/user-location';
import { t } from '@/i18n';
import { tokens } from '@/theme';

const EMPTY_FILTERS: ExploreFilters = {
  openNow: false,
  halal: false,
  vegetarian: false,
  takeaway: false,
  delivery: false,
  reservation: false,
  dineIn: false,
  terrace: false,
  airConditioning: false,
  accessible: false,
  budget: false,
};

export function ExploreScreen() {
  const router = useRouter();
  const { coords, status, refresh } = useUserLocation();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filters, setFilters] = useState<ExploreFilters>(EMPTY_FILTERS);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [appliedRegion, setAppliedRegion] = useState<MapRegion | null>(null);
  const [pendingRegion, setPendingRegion] = useState<MapRegion | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSubmitted(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const origin = appliedRegion ?? (coords ? { latitude: coords.latitude, longitude: coords.longitude } : null);
  const intent = parseSearchIntent(submitted);

  const restaurants = useQuery({
    queryKey: ['discovery', 'explore', submitted, filters, appliedRegion, coords],
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const first = await discoverRestaurants({
        q: intent.q,
        latitude: origin?.latitude,
        longitude: origin?.longitude,
        radiusMeters: appliedRegion?.radiusMeters,
        sort: origin ? 'distance' : 'recent',
        openNow: filters.openNow || intent.openNow || undefined,
        halal: filters.halal || undefined,
        vegetarian: filters.vegetarian || undefined,
        terrace: filters.terrace || undefined,
        airConditioning: filters.airConditioning || undefined,
        accessible: filters.accessible || undefined,
        maxPrice: filters.budget ? 3000 : undefined,
        service: filters.delivery
          ? 'DELIVERY'
          : filters.reservation
            ? 'RESERVATION'
            : filters.dineIn
              ? 'DINE_IN'
              : filters.takeaway
                ? 'TAKEAWAY'
                : undefined,
        limit: 50,
      });
      const anyFilter =
        filters.openNow ||
        filters.halal ||
        filters.vegetarian ||
        filters.takeaway ||
        filters.delivery ||
        filters.reservation ||
        filters.dineIn ||
        filters.terrace ||
        filters.airConditioning ||
        filters.accessible ||
        filters.budget;
      if (first.items.length > 0 || Boolean(intent.q) || intent.openNow || anyFilter || appliedRegion) {
        return first;
      }
      return discoverRestaurants({
        latitude: origin?.latitude,
        longitude: origin?.longitude,
        sort: origin ? 'distance' : 'recent',
        limit: 50,
      });
    },
  });

  const fetched = restaurants.data?.items ?? [];
  // Do not silently discard API results using a second, moving distance cutoff.
  const requiredServices = [
    filters.delivery && 'DELIVERY',
    filters.reservation && 'RESERVATION',
    filters.dineIn && 'DINE_IN',
    filters.takeaway && 'TAKEAWAY',
  ].filter((service): service is string => Boolean(service));
  const items = fetched.filter((restaurant) =>
    requiredServices.every((service) => restaurant.services.includes(service)),
  );
  const outOfZone =
    Boolean(coords) &&
    !appliedRegion &&
    items.length > 0 &&
    (items[0]?.distanceMeters ?? 0) > OUT_OF_ZONE_METERS;

  function applySuggestion(suggestion: SearchSuggestion) {
    if (suggestion.type === 'restaurant' && suggestion.slug) {
      setQuery(suggestion.label);
      setSubmitted(suggestion.label);
      router.push(`/restaurant/${suggestion.slug}`);
      return;
    }
    setQuery(suggestion.label);
    setSubmitted(suggestion.label);
  }

  const search = (
    <ExploreSearch
      value={query}
      onChangeText={setQuery}
      onSubmit={() => {
        setAppliedRegion(null);
        setPendingRegion(null);
        setSelectedId(null);
        setSubmitted(query.trim());
      }}
      onPickSuggestion={applySuggestion}
      filters={filters}
      onToggleFilter={(key) => {
        setSelectedId(null);
        setFilters((current) => ({ ...current, [key]: !current[key] }));
      }}
    />
  );

  const toolbar = (
    <>
      {search}
      <View style={styles.modeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'map' }}
          onPress={() => setMode('map')}
          style={[styles.modeChip, mode === 'map' ? styles.modeChipOn : null]}
        >
          <AppText
            variant="caption"
            color={mode === 'map' ? tokens.color.text.onBrand : tokens.color.brand.deep}
            style={styles.modeLabel}
          >
            {t('map.modeMap')}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'list' }}
          onPress={() => setMode('list')}
          style={[styles.modeChip, mode === 'list' ? styles.modeChipOn : null]}
        >
          <AppText
            variant="caption"
            color={mode === 'list' ? tokens.color.text.onBrand : tokens.color.brand.deep}
            style={styles.modeLabel}
          >
            {t('map.modeList')}
          </AppText>
        </Pressable>
      </View>
    </>
  );

  if (mode === 'list') {
    return (
      <Screen>
        {toolbar}
        {restaurants.isLoading ? (
          <>
            <Skeleton height={180} />
            <Skeleton height={180} />
          </>
        ) : null}
        {restaurants.isError ? <ErrorState onRetry={() => void restaurants.refetch()} /> : null}
        {restaurants.data && items.length === 0 ? (
          <EmptyState title={t('empty.restaurants')} detail={t('empty.restaurantsDetail')} />
        ) : null}
        {items.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <View style={styles.mapStage}>
        <DiscoveryMap
          restaurants={items}
          selectedId={selectedId}
          userLocation={coords}
          recenterKey={recenterKey}
          onSelect={setSelectedId}
          onOpenRestaurant={(slug) => router.push(`/restaurant/${slug}`)}
          onRegionSettled={setPendingRegion}
        />
        <View style={styles.overlay}>
          {search}
          <View style={styles.modeRow}>
            {pendingRegion ? (
              <Pressable
                accessibilityRole="button"
                disabled={restaurants.isFetching}
                onPress={() => {
                  setAppliedRegion(pendingRegion);
                  setPendingRegion(null);
                  setSelectedId(null);
                }}
                style={styles.modeChip}
              >
                <AppText variant="caption">{t('map.searchArea')}</AppText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: true }}
              onPress={() => setMode('map')}
              style={[styles.modeChip, styles.modeChipOn]}
            >
              <AppText variant="caption" color={tokens.color.text.onBrand} style={styles.modeLabel}>
                {t('map.modeMap')}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: false }}
              onPress={() => setMode('list')}
              style={styles.modeChip}
            >
              <AppText variant="caption" color={tokens.color.brand.deep} style={styles.modeLabel}>
                {t('map.modeList')}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('map.locate')}
              disabled={locating}
              onPress={() => {
                void (async () => {
                  setLocating(true);
                  try {
                    const next = await refresh({ fresh: true });
                    if (next) {
                      setAppliedRegion(null);
                      setPendingRegion(null);
                      setRecenterKey((value) => value + 1);
                    }
                  } finally {
                    setLocating(false);
                  }
                })();
              }}
              style={styles.locate}
            >
              {locating ? (
                <ActivityIndicator size="small" color={tokens.color.brand.primary} />
              ) : (
                <>
                  <Ionicons name="locate" size={16} color={tokens.color.brand.primary} />
                  <AppText variant="caption" color={tokens.color.brand.deep} style={styles.modeLabel}>
                    {t('map.locate')}
                  </AppText>
                </>
              )}
            </Pressable>
          </View>
          {status === 'denied' ? (
            <AppText variant="caption" color={tokens.color.brand.deep} style={styles.notice}>
              {t('map.locateDenied')}
            </AppText>
          ) : null}
          {outOfZone ? (
            <AppText variant="caption" color={tokens.color.brand.deep} style={styles.notice}>
              {t('map.outOfZone')}
            </AppText>
          ) : null}
        </View>
        {restaurants.isError ? (
          <View style={styles.searchArea}>
            <ErrorState onRetry={() => void restaurants.refetch()} />
          </View>
        ) : null}
        <View style={styles.dock}>
          <MapBottomSheet
            restaurants={items}
            selectedId={selectedId}
            expanded={sheetOpen}
            onToggle={() => setSheetOpen((value) => !value)}
            onSelect={setSelectedId}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, height: '100%', backgroundColor: tokens.color.brand.cream },
  mapStage: { flex: 1, position: 'relative', width: '100%' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    pointerEvents: 'box-none',
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    backgroundColor: 'transparent',
  },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  modeChip: {
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    paddingHorizontal: tokens.spacing.md,
    minHeight: tokens.layout.minTouchTarget,
    justifyContent: 'center',
  },
  modeChipOn: {
    backgroundColor: tokens.color.brand.primary,
    borderColor: tokens.color.brand.primary,
  },
  locate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    minHeight: tokens.layout.minTouchTarget,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface.white,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  notice: {
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  modeLabel: { fontFamily: tokens.typography.family.semibold },
  searchArea: {
    position: 'absolute',
    left: tokens.spacing.md,
    right: tokens.spacing.md,
    bottom: 188,
  },
});
