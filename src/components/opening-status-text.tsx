import { StyleSheet, Text } from 'react-native';

import type { RestaurantSummary } from '@/api/discovery';
import { openingStatusParts } from '@/features/explore/format';
import { tokens } from '@/theme';

export function OpeningStatusText({ restaurant }: { restaurant: RestaurantSummary }) {
  const parts = openingStatusParts(restaurant);

  return (
    <Text style={styles.line}>
      <Text
        style={[
          styles.label,
          parts.open ? styles.open : styles.closed,
        ]}
      >
        {parts.label}
      </Text>
      {parts.detail ? <Text style={styles.detail}>{` · ${parts.detail}`}</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    fontSize: tokens.typography.size.xs,
    lineHeight: Math.round(tokens.typography.size.xs * tokens.typography.lineHeight.normal),
  },
  label: {
    fontFamily: tokens.typography.family.regular,
  },
  open: {
    fontFamily: tokens.typography.family.semibold,
    color: tokens.color.feedback.success,
  },
  closed: {
    color: tokens.color.text.muted,
  },
  detail: {
    fontFamily: tokens.typography.family.regular,
    fontWeight: '400',
    color: tokens.color.text.muted,
  },
});
