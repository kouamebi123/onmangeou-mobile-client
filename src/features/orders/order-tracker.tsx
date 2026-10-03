import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { t } from '@/i18n';
import { tokens } from '@/theme';

import { orderProgress } from './order-progress';

const TONE_COLOR = {
  neutral: tokens.color.text.muted,
  progress: tokens.color.brand.accent,
  success: tokens.color.brand.primary,
  danger: tokens.color.feedback.error,
} as const;

/**
 * Avancement d'une commande : l'état en clair, une phrase sur la suite, et
 * quatre segments qui se remplissent quand le restaurant fait avancer le ticket.
 */
export function OrderTracker({ status, delivery }: { status: string; delivery: boolean }) {
  const progress = orderProgress(status);
  const fill = useRef(new Animated.Value(progress.reached)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: progress.reached,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fill, progress.reached]);

  const color = TONE_COLOR[progress.tone];
  const hintKey = delivery && status === 'READY' ? 'READY_DELIVERY' : delivery && status === 'COMPLETED' ? 'COMPLETED_DELIVERY' : status;

  return (
    <View style={styles.card} accessibilityRole="summary">
      <AppText variant="subtitle" color={progress.tone === 'danger' ? tokens.color.feedback.error : undefined}>
        {t(`orders.status.${status}`)}
      </AppText>
      <AppText variant="muted">{t(`orders.progress.${hintKey}`)}</AppText>
      {progress.active || progress.tone === 'success' ? (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: progress.total, now: progress.reached }}
        >
          {Array.from({ length: progress.total }, (_, index) => (
            <View key={index} style={styles.segment}>
              <Animated.View
                style={[
                  styles.segmentFill,
                  {
                    backgroundColor: color,
                    width: fill.interpolate({
                      inputRange: [index, index + 1],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </View>
          ))}
        </View>
      ) : null}
      {progress.active || progress.tone === 'success' ? (
        <View style={styles.labels}>
          {(['sent', 'accepted', 'cooking', 'ready'] as const).map((step, index) => (
            <AppText
              key={step}
              variant="caption"
              color={index < progress.reached ? tokens.color.brand.deep : tokens.color.text.muted}
              style={[styles.stepLabel, index < progress.reached ? styles.stepLabelOn : null]}
            >
              {t(`orders.steps.${step}`)}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.spacing.xs,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
  },
  track: { flexDirection: 'row', gap: 6, marginTop: tokens.spacing.xs },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: tokens.color.border.default,
  },
  segmentFill: { height: 6, borderRadius: 3 },
  labels: { flexDirection: 'row', gap: 6 },
  stepLabel: { flex: 1 },
  stepLabelOn: { fontFamily: tokens.typography.family.semibold },
});
