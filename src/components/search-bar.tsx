import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { tokens } from '@/theme';
import { t } from '@/i18n';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, onSubmit, placeholder }: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <TextInput
        accessibilityRole="search"
        accessibilityLabel={t('common.search')}
        placeholder={placeholder ?? t('explore.placeholder')}
        placeholderTextColor={tokens.color.text.muted}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.search')}
        onPress={onSubmit}
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.layout.minTouchTarget,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface.white,
    paddingHorizontal: tokens.spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: tokens.typography.family.regular,
    fontSize: tokens.typography.size.md,
    color: tokens.color.text.primary,
  },
  action: {
    width: tokens.spacing.md,
    height: tokens.spacing.md,
  },
});
