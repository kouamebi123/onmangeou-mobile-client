import type { RestaurantSummary } from '@/api/discovery';
import type { DiscoveryMapProps } from '@/components/discovery-map.types';
import { MapMarker } from '@/components/map-marker';
import { ABIDJAN } from '@/features/explore/geo';
import { tokens } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';

export type { DiscoveryMapProps, MapRegion } from '@/components/discovery-map.types';

function project(restaurants: RestaurantSummary[]) {
  const points = restaurants.filter(
    (item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
  );
  if (points.length === 0) {
    return { points, minLat: ABIDJAN.latitude - 0.04, maxLat: ABIDJAN.latitude + 0.04, minLng: ABIDJAN.longitude - 0.04, maxLng: ABIDJAN.longitude + 0.04 };
  }
  const lats = points.map((item) => item.latitude);
  const lngs = points.map((item) => item.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max(0.01, (maxLat - minLat) * 0.2);
  const lngPad = Math.max(0.01, (maxLng - minLng) * 0.2);
  return {
    points,
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

/** Repli natif : nuage de points géographiques en attendant MapLibre RN. */
export function DiscoveryMap({ restaurants, selectedId, onSelect, interactive = true }: DiscoveryMapProps) {
  const { points, minLat, maxLat, minLng, maxLng } = project(restaurants);

  return (
    <View style={styles.canvas} accessibilityLabel="Carte des restaurants">
      <View style={[styles.grid, styles.gridH]} />
      <View style={[styles.grid, styles.gridV]} />
      {points.map((restaurant) => {
        const x = ((restaurant.longitude - minLng) / (maxLng - minLng)) * 100;
        const y = (1 - (restaurant.latitude - minLat) / (maxLat - minLat)) * 100;
        return (
          <Pressable
            key={restaurant.id}
            disabled={!interactive}
            onPress={() => onSelect?.(restaurant.id)}
            style={[styles.pin, { left: `${x}%`, top: `${y}%` }]}
            accessibilityRole="button"
            accessibilityLabel={restaurant.name}
          >
            <MapMarker selected={restaurant.id === selectedId} label={restaurant.name.slice(0, 1)} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    minHeight: 180,
    backgroundColor: tokens.color.surface.mint,
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    backgroundColor: tokens.color.brand.cream,
    opacity: 0.45,
  },
  gridH: { left: 0, right: 0, top: '50%', height: 1 },
  gridV: { top: 0, bottom: 0, left: '50%', width: 1 },
  pin: {
    position: 'absolute',
    transform: [{ translateX: -14 }, { translateY: -28 }],
  },
});
