import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import type { MenuProduct } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Price } from '@/components/price';
import { t } from '@/i18n';
import { tokens } from '@/theme';

interface DishCardProps {
  dish: MenuProduct;
  onAdd?: () => void;
}

export function DishCard({ dish, onAdd }: DishCardProps) {
  return (
    <View style={[styles.card, !dish.available ? styles.unavailable : null]}>
      {dish.imageUrl ? (
        <Image source={{ uri: dish.imageUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={styles.imageFallback}>
          <Ionicons name="fast-food-outline" size={28} color={tokens.color.text.onBrand} />
        </View>
      )}
      <View style={styles.body}>
        <AppText variant="subtitle">{dish.name}</AppText>
        {dish.description ? (
          <AppText variant="muted" numberOfLines={2}>
            {dish.description}
          </AppText>
        ) : null}
        {dish.allergens.length > 0 ? (
          <AppText variant="caption" color={tokens.color.feedback.warning}>
            {t('dish.allergens', { list: dish.allergens.join(', ') })}
          </AppText>
        ) : null}
        <View style={styles.row}>
          <Price value={dish.price} />
          {dish.vegetarian ? (
            <View style={styles.tag}>
              <AppText variant="caption" color={tokens.color.brand.deep} style={styles.tagLabel}>
                {t('dish.vegetarian')}
              </AppText>
            </View>
          ) : null}
          {dish.halal ? (
            <View style={styles.tag}>
              <AppText variant="caption" color={tokens.color.brand.deep} style={styles.tagLabel}>
                {t('dish.halal')}
              </AppText>
            </View>
          ) : null}
        </View>
        {!dish.available ? (
          <AppText variant="caption" color={tokens.color.feedback.warning}>
            {t('restaurant.unavailable')}
          </AppText>
        ) : onAdd ? (
          <Button label={t('orders.add')} variant="secondary" onPress={onAdd} style={styles.add} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    padding: tokens.spacing.sm,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  unavailable: { opacity: 0.7 },
  image: { width: 96, height: 96, borderRadius: tokens.radius.md },
  imageFallback: {
    width: 96,
    height: 96,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.brand.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: tokens.spacing.xxs, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: tokens.spacing.xs, alignItems: 'center', flexWrap: 'wrap' },
  tag: {
    backgroundColor: tokens.color.surface.mint,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.xs,
    minHeight: 22,
    justifyContent: 'center',
  },
  tagLabel: { fontFamily: tokens.typography.family.semibold },
  add: { alignSelf: 'flex-start', marginTop: tokens.spacing.xxs, minHeight: tokens.layout.minTouchTarget, paddingHorizontal: tokens.spacing.md },
});
