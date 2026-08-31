import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fetchFavorites } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PageHero } from '@/components/page-hero';
import { RestaurantCard } from '@/components/restaurant-card';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ErrorState } from '@/components/error-state';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { tokens } from '@/theme';

export function FavoritesScreen() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);

  const favorites = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
    enabled: Boolean(accessToken),
  });

  const count = favorites.data?.length ?? 0;
  const subtitle = accessToken
    ? count > 0
      ? t('favorites.count', { count: String(count) })
      : t('favorites.subtitle')
    : t('favorites.guestLead');

  return (
    <Screen>
      <PageHero icon="heart" kicker={t('app.name')} title={t('favorites.title')} subtitle={subtitle} />

      {!accessToken ? (
        <View style={styles.panel}>
          <View style={styles.mark}>
            <Ionicons name="heart-outline" size={32} color={tokens.color.text.onBrand} />
          </View>
          <AppText variant="subtitle" style={styles.center}>
            {t('favorites.guestTitle')}
          </AppText>
          <AppText variant="muted" style={styles.center}>
            {t('profile.anonymous')}
          </AppText>
          <Button label={t('common.signIn')} onPress={() => router.push('/auth')} />
        </View>
      ) : null}

      {accessToken && favorites.isLoading ? (
        <>
          <Skeleton height={220} />
          <Skeleton height={180} />
        </>
      ) : null}
      {accessToken && favorites.isError ? <ErrorState onRetry={() => void favorites.refetch()} /> : null}
      {accessToken && favorites.data && favorites.data.length === 0 ? (
        <View style={styles.panel}>
          <View style={styles.mark}>
            <Ionicons name="heart-dislike-outline" size={32} color={tokens.color.text.onBrand} />
          </View>
          <AppText variant="subtitle" style={styles.center}>
            {t('empty.favorites')}
          </AppText>
          <AppText variant="muted" style={styles.center}>
            {t('empty.favoritesDetail')}
          </AppText>
          <Button label={t('orders.exploreCta')} onPress={() => router.push('/explorer')} />
        </View>
      ) : null}
      {favorites.data?.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.xl,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.color.brand.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
