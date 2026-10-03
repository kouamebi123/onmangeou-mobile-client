import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { tokens } from '@/theme';

interface ScreenProps extends ScrollViewProps {
  children: ReactNode;
  scroll?: boolean;
  /** Barre d'action fixe sous le contenu : le bouton principal reste à portée de pouce. */
  footer?: ReactNode;
}

export function Screen({ children, scroll = true, footer, ...rest }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            {...rest}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.color.brand.cream,
  },
  flex: { flex: 1 },
  content: {
    padding: tokens.layout.screenPadding,
    gap: tokens.spacing.md,
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: tokens.layout.screenPadding,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.color.surface.white,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border.default,
  },
});
