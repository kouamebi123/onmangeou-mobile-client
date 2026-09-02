import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchSearchSuggestions, type SearchSuggestion } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { SearchBar } from '@/components/search-bar';
import { t } from '@/i18n';
import { tokens } from '@/theme';

export interface ExploreFilters {
  openNow: boolean;
  halal: boolean;
  vegetarian: boolean;
  takeaway: boolean;
  delivery: boolean;
  reservation: boolean;
  dineIn: boolean;
  terrace: boolean;
  airConditioning: boolean;
  accessible: boolean;
  budget: boolean;
}

export function ExploreSearch({
  value,
  onChangeText,
  onSubmit,
  onPickSuggestion,
  filters,
  onToggleFilter,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onPickSuggestion: (suggestion: SearchSuggestion) => void;
  filters: ExploreFilters;
  onToggleFilter: (key: keyof ExploreFilters) => void;
}) {
  const suggestions = useQuery({
    queryKey: ['discovery', 'suggestions', value.trim()],
    enabled: value.trim().length >= 2,
    queryFn: () => fetchSearchSuggestions(value),
    staleTime: 15_000,
  });

  const items = suggestions.data ?? [];

  return (
    <View style={styles.wrap}>
      <SearchBar value={value} onChangeText={onChangeText} onSubmit={onSubmit} />
      {items.length > 0 ? (
        <View style={styles.suggest}>
          {items.map((item) => (
            <Pressable
              key={`${item.type}-${item.slug ?? item.label}`}
              accessibilityRole="button"
              onPress={() => onPickSuggestion(item)}
              style={styles.suggestRow}
            >
              <AppText variant="caption" color={tokens.color.text.muted}>
                {item.type === 'restaurant' ? t('explore.suggestionRestaurant') : t('explore.suggestionDish')}
              </AppText>
              <AppText variant="subtitle">{item.label}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip
          label={t('map.filterOpen')}
          selected={filters.openNow}
          onPress={() => onToggleFilter('openNow')}
        />
        <FilterChip
          label={t('map.filterHalal')}
          selected={filters.halal}
          onPress={() => onToggleFilter('halal')}
        />
        <FilterChip
          label={t('map.filterVegetarian')}
          selected={filters.vegetarian}
          onPress={() => onToggleFilter('vegetarian')}
        />
        <FilterChip
          label={t('map.filterTakeaway')}
          selected={filters.takeaway}
          onPress={() => onToggleFilter('takeaway')}
        />
        <FilterChip
          label={t('map.filterDelivery')}
          selected={filters.delivery}
          onPress={() => onToggleFilter('delivery')}
        />
        <FilterChip
          label={t('map.filterReservation')}
          selected={filters.reservation}
          onPress={() => onToggleFilter('reservation')}
        />
        <FilterChip
          label={t('map.filterDineIn')}
          selected={filters.dineIn}
          onPress={() => onToggleFilter('dineIn')}
        />
        <FilterChip
          label={t('map.filterBudget')}
          selected={filters.budget}
          onPress={() => onToggleFilter('budget')}
        />
        <FilterChip
          label={t('map.filterTerrace')}
          selected={filters.terrace}
          onPress={() => onToggleFilter('terrace')}
        />
        <FilterChip
          label={t('map.filterAc')}
          selected={filters.airConditioning}
          onPress={() => onToggleFilter('airConditioning')}
        />
        <FilterChip
          label={t('map.filterAccessible')}
          selected={filters.accessible}
          onPress={() => onToggleFilter('accessible')}
        />
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipOn : null]}
    >
      <AppText
        variant="caption"
        color={selected ? tokens.color.text.onBrand : tokens.color.brand.deep}
        style={styles.chipLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.sm },
  suggest: {
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    overflow: 'hidden',
  },
  suggestRow: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    gap: 2,
    minHeight: tokens.layout.minTouchTarget,
    justifyContent: 'center',
  },
  chips: { gap: tokens.spacing.sm, paddingRight: tokens.spacing.md },
  chip: {
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    paddingHorizontal: tokens.spacing.md,
    minHeight: tokens.layout.minTouchTarget,
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: tokens.color.brand.primary,
    borderColor: tokens.color.brand.primary,
  },
  chipLabel: { fontFamily: tokens.typography.family.semibold },
});
