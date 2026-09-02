import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Switch, View } from 'react-native';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { discoverRestaurants } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { DiscoveryMap } from '@/components/discovery-map';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeroBlobs } from '@/components/page-hero';
import { Logo } from '@/components/logo';
import { RestaurantCard } from '@/components/restaurant-card';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { SectionHeading } from '@/components/section-heading';
import { Skeleton } from '@/components/skeleton';
import { useUserLocation } from '@/features/explore/user-location';
import { buildHomeSections } from './restaurant-sections';
import { t } from '@/i18n';
import { tokens } from '@/theme';

export function HomeScreen() {
  const router = useRouter();
  const { coords } = useUserLocation();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [openNow, setOpenNow] = useState(false);

  const restaurants = useQuery({
    queryKey: ['discovery', 'home', submitted, openNow, coords],
    queryFn: () =>
      discoverRestaurants({
        q: submitted || undefined,
        openNow: openNow || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        sort: coords ? 'distance' : 'recent',
      }),
    placeholderData: keepPreviousData,
  });

  const { items, featured, remaining } = buildHomeSections(restaurants.data?.items ?? [], openNow);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await restaurants.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [restaurants.refetch]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}>
      <View style={styles.hero}>
        <HeroBlobs />
        <View style={styles.logoWrap}>
          <Logo variant="dark" height={144} />
        </View>
        <AppText variant="title" color={tokens.color.text.onBrand}>
          {t('home.title')}
        </AppText>
        <AppText variant="muted" color={tokens.color.surface.mint}>
          {t('home.subtitle')}
        </AppText>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmit={() => setSubmitted(query.trim())}
        />
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: openNow }}
          onPress={() => setOpenNow((value) => !value)}
          style={styles.filter}
        >
          <AppText color={tokens.color.text.onBrand}>{t('common.openNow')}</AppText>
          <Switch
            value={openNow}
            onValueChange={setOpenNow}
            trackColor={{ true: tokens.color.brand.accent, false: tokens.color.border.default }}
            accessibilityLabel={t('common.openNow')}
          />
        </Pressable>
      </View>

      <View style={styles.mapHead}>
        <SectionHeading title={t('map.title')} />
        <Pressable onPress={() => router.push('/explorer')} accessibilityRole="button">
          <AppText variant="caption" color={tokens.color.brand.primary} style={styles.mapLink}>
            {t('map.openExplore')}
          </AppText>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('map.openExplore')}
        onPress={() => router.push('/explorer')}
        style={styles.mapPreview}
      >
        <DiscoveryMap
          key={`preview-${openNow ? 'open' : 'all'}-${submitted}`}
          restaurants={items}
          userLocation={coords}
          interactive={false}
        />
      </Pressable>

      {restaurants.isLoading ? (
        <>
          <Skeleton height={220} />
          <Skeleton height={180} />
        </>
      ) : null}
      {restaurants.isError ? <ErrorState onRetry={() => void restaurants.refetch()} /> : null}
      {restaurants.data && items.length === 0 ? (
        <EmptyState title={t('empty.restaurants')} detail={t('empty.restaurantsDetail')} />
      ) : null}

      {featured.length > 0 ? (
        <>
          <SectionHeading title={t('home.openNowTitle')} />
          {featured.map((restaurant) => (
            <RestaurantCard key={`open-${restaurant.id}`} restaurant={restaurant} featured />
          ))}
        </>
      ) : null}

      {remaining.length > 0 ? (
        <>
          <SectionHeading
            title={t(openNow ? 'home.openNowTitle' : featured.length > 0 ? 'home.otherTitle' : 'home.allTitle')}
          />
          {remaining.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    marginHorizontal: -tokens.layout.screenPadding,
    marginTop: -tokens.layout.screenPadding,
    backgroundColor: tokens.color.brand.deep,
    overflow: 'hidden',
    position: 'relative',
  },
  logoWrap: {
    zIndex: 1,
    alignSelf: 'flex-start',
    marginBottom: tokens.spacing.xs,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  mapLink: { fontFamily: tokens.typography.family.semibold },
  mapPreview: {
    height: 260,
    borderRadius: tokens.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
});
