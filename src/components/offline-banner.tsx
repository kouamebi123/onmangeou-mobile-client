import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Expandable } from '@/components/motion';
import { t } from '@/i18n';
import { useOnlineStatus } from '@/offline/network';
import { tokens } from '@/theme';

export function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <Expandable open={!online}>
      <View style={styles.banner} accessibilityLiveRegion="polite">
        <AppText variant="caption" color={tokens.color.text.onBrand}>
          {t('offline.banner')}
        </AppText>
      </View>
    </Expandable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: tokens.color.brand.deep,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
});
