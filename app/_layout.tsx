import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProviders } from '@/components/app-providers';
import { tokens } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.color.brand.cream }}>
      <AppProviders>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.color.brand.cream } }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: 280 }} />
          {/* La connexion monte depuis le bas et redescend une fois connecté. */}
          <Stack.Screen name="auth/index" options={{ animation: 'slide_from_bottom', animationDuration: 320 }} />
          <Stack.Screen name="restaurant/[slug]" />
          <Stack.Screen name="cart" />
          <Stack.Screen name="order/[id]" />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
