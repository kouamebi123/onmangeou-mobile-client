import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { RestaurantSummary } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { RestaurantRow } from '@/components/restaurant-row';
import { t } from '@/i18n';
import { tokens } from '@/theme';

export function MapBottomSheet({
  restaurants,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  restaurants: RestaurantSummary[];
  selectedId?: string | null;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={[styles.sheet, expanded ? styles.sheetExpanded : styles.sheetPeek]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? t('map.collapseList') : t('map.expandList')}
        style={styles.handleHit}
      >
        <View style={styles.handle} />
        <AppText variant="caption" color={tokens.color.brand.deep} style={styles.count}>
          {expanded
            ? t('map.nearby', { count: String(restaurants.length) })
            : t('map.nearbyPeek', { count: String(restaurants.length) })}
        </AppText>
      </Pressable>
      {restaurants.length === 0 ? (
        <AppText variant="muted">{t('empty.restaurants')}</AppText>
      ) : (
        <ScrollView
          horizontal={!expanded}
          showsHorizontalScrollIndicator={false}
          style={expanded ? styles.listExpanded : undefined}
          contentContainerStyle={[styles.list, !expanded ? styles.listHorizontal : null]}
          keyboardShouldPersistTaps="handled"
        >
          {restaurants.map((restaurant) => (
            <View key={restaurant.id} style={expanded ? undefined : styles.peekCard}>
              <RestaurantRow
                restaurant={restaurant}
                selected={restaurant.id === selectedId}
                onPress={() => onSelect(restaurant.id)}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: tokens.color.surface.white,
    borderTopLeftRadius: tokens.radius.card,
    borderTopRightRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    borderBottomWidth: 0,
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  sheetPeek: { maxHeight: 196 },
  sheetExpanded: { maxHeight: 320 },
  handleHit: { alignItems: 'center', paddingTop: tokens.spacing.sm, gap: tokens.spacing.xs },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.color.border.default,
  },
  count: { fontFamily: tokens.typography.family.semibold },
  listExpanded: { flex: 1 },
  list: { gap: tokens.spacing.sm, paddingBottom: tokens.spacing.sm },
  listHorizontal: { paddingRight: tokens.spacing.md },
  peekCard: { width: 300 },
});
