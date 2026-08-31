import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { RestaurantSummary } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { OpeningStatusText } from '@/components/opening-status-text';
import { formatDistance } from '@/features/explore/format';
import { restaurantCoverUrl } from '@/features/restaurant/cover';
import { tokens } from '@/theme';

export function RestaurantRow({
  restaurant,
  selected,
  onPress,
}: {
  restaurant: RestaurantSummary;
  selected?: boolean;
  onPress?: () => void;
}) {
  const router = useRouter();
  const distance = formatDistance(restaurant.distanceMeters);
  const place = [restaurant.district, restaurant.city].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={restaurant.name}
      onPress={() => {
        onPress?.();
        router.push(`/restaurant/${restaurant.slug}`);
      }}
      style={[styles.row, selected ? styles.selected : null]}
    >
      <Image
        source={{ uri: restaurantCoverUrl(restaurant.coverImageUrl, restaurant.id) }}
        style={styles.mark}
        contentFit="cover"
      />
      <View style={styles.body}>
        <AppText variant="subtitle">{restaurant.name}</AppText>
        <OpeningStatusText restaurant={restaurant} />
        <AppText variant="muted">{[distance, place].filter(Boolean).join(' · ')}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.brand.cream,
    minHeight: tokens.layout.minTouchTarget,
  },
  selected: { borderWidth: 1, borderColor: tokens.color.brand.primary },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: tokens.color.brand.deep,
  },
  body: { flex: 1, gap: 2 },
});
