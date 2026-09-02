import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tap feedback for quick actions (add to cart, toggle favorite). */
export function hapticLight(): void {
  if (Platform.OS === 'web') {
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Success feedback for completed operations (order placed). */
export function hapticSuccess(): void {
  if (Platform.OS === 'web') {
    return;
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
