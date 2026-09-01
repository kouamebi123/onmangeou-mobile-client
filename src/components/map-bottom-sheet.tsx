import { useRef } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { RestaurantSummary } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { RestaurantRow } from '@/components/restaurant-row';
import { t } from '@/i18n';
import { tokens } from '@/theme';

const SWIPE_THRESHOLD = 24;

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
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy < -SWIPE_THRESHOLD && !expandedRef.current) {
          onToggleRef.current();
        } else if (gesture.dy > SWIPE_THRESHOLD && expandedRef.current) {
          onToggleRef.current();
        }
      },
    }),
  ).current;

  const peekSwipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        !expandedRef.current && gesture.dy < -8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy < -SWIPE_THRESHOLD && !expandedRef.current) {
          onToggleRef.current();
        }
      },
    }),
  ).current;

  return (
    <View
      style={[styles.sheet, expanded ? styles.sheetExpanded : styles.sheetPeek]}
      {...peekSwipeResponder.panHandlers}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? t('map.collapseList') : t('map.expandList')}
        style={styles.handleHit}
        {...panResponder.panHandlers}
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
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={expanded}
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
  sheetExpanded: { maxHeight: 440 },
  handleHit: { alignItems: 'center', paddingTop: tokens.spacing.sm, gap: tokens.spacing.xs },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.color.border.default,
  },
  count: { fontFamily: tokens.typography.family.semibold },
  listExpanded: { maxHeight: 360 },
  list: { gap: tokens.spacing.sm, paddingBottom: tokens.spacing.sm },
  listHorizontal: { paddingRight: tokens.spacing.md },
  peekCard: { width: 300 },
});
