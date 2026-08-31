import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

type ClientTab = 'home' | 'explore' | 'orders' | 'favorites' | 'profile';

const ICONS: Record<ClientTab, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  home: { on: 'home', off: 'home-outline' },
  explore: { on: 'map', off: 'map-outline' },
  orders: { on: 'receipt', off: 'receipt-outline' },
  favorites: { on: 'heart', off: 'heart-outline' },
  profile: { on: 'person-circle', off: 'person-circle-outline' },
};

export function TabIcon({
  name,
  color,
  focused,
  size = 22,
}: {
  name: ClientTab;
  color: ColorValue;
  focused: boolean;
  size?: number;
}) {
  return <Ionicons name={focused ? ICONS[name].on : ICONS[name].off} size={size} color={color} />;
}
