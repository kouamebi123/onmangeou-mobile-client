import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import type { RestaurantSummary } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import type { DiscoveryMapProps } from './discovery-map.types';
import { formatDistance, openingStatusParts } from '@/features/explore/format';
import { restaurantCoverUrl } from '@/features/restaurant/cover';
import { ABIDJAN, radiusMetersFromBounds } from '@/features/explore/geo';
import { tokens } from '@/theme';
import { t } from '@/i18n';

export type { DiscoveryMapProps, MapRegion } from './discovery-map.types';

function placeLabel(restaurant: RestaurantSummary): string {
  return [restaurant.landmarkText, restaurant.district, restaurant.city].filter(Boolean).join(' · ');
}

/** Contenu de l'infobulle : même information que la tooltip web (photo, statut, repère). */
function RestaurantCallout({ restaurant }: { restaurant: RestaurantSummary }) {
  const status = openingStatusParts(restaurant);
  const place = [formatDistance(restaurant.distanceMeters), placeLabel(restaurant) || restaurant.city]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.tip}>
      <Image
        source={{ uri: restaurantCoverUrl(restaurant.coverImageUrl, restaurant.id) }}
        style={styles.tipPhoto}
        resizeMode="cover"
      />
      <View style={styles.tipBody}>
        <AppText variant="caption" style={styles.tipName} numberOfLines={1}>
          {restaurant.name}
        </AppText>
        <View style={[styles.tipBadge, !status.open ? styles.tipBadgeOff : null]}>
          <AppText
            variant="caption"
            color={status.open ? tokens.color.brand.primary : tokens.color.brand.deep}
            style={styles.tipBadgeText}
            numberOfLines={1}
          >
            {status.detail ? `${status.label} · ${status.detail}` : status.label}
          </AppText>
        </View>
        <AppText variant="caption" color={tokens.color.text.muted} numberOfLines={2}>
          {place}
        </AppText>
      </View>
    </View>
  );
}

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
            pinColor={selectedId === item.id ? tokens.color.brand.accent : tokens.color.brand.primary}
            tracksViewChanges={false}
            onPress={() => interactive && onSelect?.(item.id)}
            onCalloutPress={() => interactive && onOpenRestaurant?.(item.slug)}>
            {interactive ? (
              <Callout tooltip onPress={() => onOpenRestaurant?.(item.slug)}>
                <RestaurantCallout restaurant={item} />
              </Callout>
            ) : null}
          </Marker>
        ))}
        {userLocation ? (
          <Marker identifier="user-location" coordinate={userLocation}
            title={t('map.you')} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.meHalo}>
              <View style={styles.meDot} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, minHeight: 180, width: '100%', backgroundColor: tokens.color.surface.mint,
  },
  tip: {
    flexDirection: 'row',
    width: 260,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    padding: tokens.spacing.xs,
    gap: tokens.spacing.sm,
    alignItems: 'center',
  },
  tipPhoto: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.card - 4,
    backgroundColor: tokens.color.surface.mint,
  },
  tipBody: { flex: 1, gap: 2 },
  tipName: { fontFamily: tokens.typography.family.semibold, color: tokens.color.brand.deep },
  tipBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
    backgroundColor: tokens.color.surface.mint,
  },
  tipBadgeOff: { backgroundColor: tokens.color.brand.cream },
  tipBadgeText: { fontFamily: tokens.typography.family.semibold },
  meHalo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(31, 111, 95, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: tokens.color.brand.deep,
    borderWidth: 3,
    borderColor: tokens.color.surface.white,
  },
});
