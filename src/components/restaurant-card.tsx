import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import type { RestaurantSummary } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { Price } from '@/components/price';
import { OpeningStatusText } from '@/components/opening-status-text';
import { formatDistance } from '@/features/explore/format';
import { useFavoriteToggle } from '@/features/favorites/use-favorite-toggle';
import { restaurantCoverUrl } from '@/features/restaurant/cover';
import { t } from '@/i18n';
import { tokens } from '@/theme';

interface RestaurantCardProps {
  restaurant: RestaurantSummary;
  featured?: boolean;
}

export function RestaurantCard({ restaurant, featured = false }: RestaurantCardProps) {
  const router = useRouter();
  const { toggle, pending } = useFavoriteToggle(restaurant);

  return (
    <View style={[styles.card, featured ? styles.featured : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={restaurant.name}
        onPress={() => router.push(`/restaurant/${restaurant.slug}`)}
        style={({ pressed }) => [styles.hit, pressed ? styles.pressed : null]}
      >
        <Image
          source={{ uri: restaurantCoverUrl(restaurant.coverImageUrl, restaurant.id) }}
          style={styles.cover}
          contentFit="cover"
        />
        <View style={styles.status}>
          <AppText
            variant="caption"
            color={restaurant.open ? tokens.color.feedback.success : tokens.color.text.muted}
            style={styles.statusLabel}
          >
            {restaurant.open ? t('common.open') : t('common.closed')}
          </AppText>
        </View>
        <View style={styles.body}>
          <AppText variant="subtitle">{restaurant.name}</AppText>
          <OpeningStatusText restaurant={restaurant} />
          <AppText variant="muted">
            {[formatDistance(restaurant.distanceMeters), restaurant.district, restaurant.city]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
          <View style={styles.row}>
            <Price value={restaurant.priceFrom} />
            {restaurant.averagePreparationMinutes ? (
              <AppText variant="caption">{t('restaurant.prep', { minutes: String(restaurant.averagePreparationMinutes) })}</AppText>
            ) : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={restaurant.isFavorite ? t('restaurant.favoriteRemove') : t('restaurant.favoriteAdd')}
        disabled={pending}
        onPress={toggle}
        style={[styles.heart, pending ? styles.heartBusy : null]}
        hitSlop={8}
      >
        <Ionicons
          name={restaurant.isFavorite ? 'heart' : 'heart-outline'}
          size={18}
          color={restaurant.isFavorite ? tokens.color.brand.accent : tokens.color.brand.deep}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  featured: { borderColor: tokens.color.brand.primary },
  hit: {},
  pressed: { opacity: 0.92 },
  cover: { height: 168, width: '100%', backgroundColor: tokens.color.brand.deep },
  status: {
    position: 'absolute',
    top: tokens.spacing.sm,
    left: tokens.spacing.sm,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    minHeight: 28,
    justifyContent: 'center',
  },
  statusLabel: { fontFamily: tokens.typography.family.semibold },
  heart: {
    position: 'absolute',
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  heartBusy: { opacity: 0.7 },
  body: { padding: tokens.spacing.md, gap: tokens.spacing.xxs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
