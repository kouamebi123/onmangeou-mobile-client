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
  const selected = restaurants.find((item) => item.id === selectedId) ?? restaurants[0];

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
          {t('map.nearby', { count: String(restaurants.length) })}
        </AppText>
      </Pressable>
      {expanded ? (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {restaurants.map((restaurant) => (
            <RestaurantRow
              key={restaurant.id}
              restaurant={restaurant}
              selected={restaurant.id === selectedId}
              onPress={() => onSelect(restaurant.id)}
            />
          ))}
        </ScrollView>
      ) : selected ? (
        <RestaurantRow
          restaurant={selected}
          selected
          onPress={() => onSelect(selected.id)}
        />
      ) : (
        <AppText variant="muted">{t('empty.restaurants')}</AppText>
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
  sheetPeek: { maxHeight: 168 },
  sheetExpanded: { maxHeight: 320 },
  handleHit: { alignItems: 'center', paddingTop: tokens.spacing.sm, gap: tokens.spacing.xs },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.color.border.default,
  },
  count: { fontFamily: tokens.typography.family.semibold },
  list: { gap: tokens.spacing.sm, paddingBottom: tokens.spacing.sm },
});
