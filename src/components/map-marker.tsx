import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { tokens } from '@/theme';

export function MapMarker({ selected, label }: { selected?: boolean; label: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={label}>
      <Ionicons
        name="location"
        size={32}
        color={selected ? tokens.color.brand.accent : tokens.color.brand.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: 32 },
});
