import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { DiscoveryMapProps } from './discovery-map.types';
import { ABIDJAN, radiusMetersFromBounds } from '@/features/explore/geo';
import { tokens } from '@/theme';
import { t } from '@/i18n';

export type { DiscoveryMapProps, MapRegion } from './discovery-map.types';

/** Native geographic anchors: never project coordinates from result bounds. */
export function DiscoveryMap({ restaurants, selectedId, userLocation, onSelect,
  onOpenRestaurant, onRegionSettled, interactive = true, recenterKey = 0 }: DiscoveryMapProps) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const lastRecenter = useRef(-1);
  const start = useRef(userLocation ?? restaurants[0] ?? ABIDJAN);
  useEffect(() => {
    if (!ready || lastRecenter.current === recenterKey) return;
    const target = userLocation ?? restaurants[0];
    if (!target) return;
    lastRecenter.current = recenterKey;
    map.current?.animateToRegion({ latitude: target.latitude, longitude: target.longitude,
      latitudeDelta: 0.04, longitudeDelta: 0.04 }, 400);
  }, [ready, recenterKey, userLocation, restaurants]);

  return (
    <View style={styles.container}>
      <MapView ref={map} style={StyleSheet.absoluteFill} onMapReady={() => setReady(true)}
        initialRegion={{ latitude: start.current.latitude, longitude: start.current.longitude,
          latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        scrollEnabled={interactive} zoomEnabled={interactive} rotateEnabled={false} pitchEnabled={false}
        onPanDrag={() => { lastRecenter.current = recenterKey; }}
        onRegionChangeComplete={(region) => onRegionSettled?.({
          latitude: region.latitude, longitude: region.longitude,
          radiusMeters: radiusMetersFromBounds({
            north: region.latitude + region.latitudeDelta / 2,
            south: region.latitude - region.latitudeDelta / 2,
            east: region.longitude + region.longitudeDelta / 2,
            west: region.longitude - region.longitudeDelta / 2,
          }),
        })}>
        {restaurants.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)).map((item) => (
          <Marker key={item.id} identifier={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            title={item.name} description={item.city}
            pinColor={selectedId === item.id ? tokens.color.brand.accent : tokens.color.brand.primary}
            onPress={() => interactive && onSelect?.(item.id)}
            onCalloutPress={() => interactive && onOpenRestaurant?.(item.slug)} />
        ))}
        {userLocation ? <Marker identifier="user-location" coordinate={userLocation}
          title={t('map.you')} pinColor={tokens.color.brand.deep} /> : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ container: {
  flex: 1, minHeight: 180, width: '100%', backgroundColor: tokens.color.surface.mint,
} });
