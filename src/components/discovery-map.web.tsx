import { createElement, useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RestaurantSummary } from '@/api/discovery';
import { AppText } from '@/components/app-text';
import type { DiscoveryMapProps } from '@/components/discovery-map.types';
import { LOCATION_PIN_SVG } from '@/components/map-pin-svg';
import { formatDistance, openingStatusParts } from '@/features/explore/format';
import { restaurantCoverUrl } from '@/features/restaurant/cover';
import { ABIDJAN, DEFAULT_MAP_STYLE, haversineMeters, radiusMetersFromBounds } from '@/features/explore/geo';
import { t } from '@/i18n';
import { tokens } from '@/theme';

import { clusterRestaurants } from './map-clusters';

const STYLE_ID = 'maplibre-gl-css';
const SCRIPT_ID = 'maplibre-gl-js';
const THEME_ID = 'omo-map-theme-v4';
const MAPLIBRE_VERSION = '4.7.1';

type MapLibreModule = typeof import('maplibre-gl');
type MapInstance = InstanceType<MapLibreModule['Map']>;
type MarkerInstance = InstanceType<MapLibreModule['Marker']>;
type PopupInstance = InstanceType<MapLibreModule['Popup']>;

function ensureMapAssets() {
  if (typeof document === 'undefined') {
    return;
  }
  if (!document.getElementById(STYLE_ID)) {
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
    document.head.appendChild(link);
  }
  if (!document.getElementById(THEME_ID)) {
    const style = document.createElement('style');
    style.id = THEME_ID;
    style.textContent = `
      .omo-pin { width: 32px; height: 32px; display: block; color: ${tokens.color.brand.primary}; cursor: pointer; line-height: 0; filter: drop-shadow(0 2px 4px rgba(23,59,54,.28)); }
      .omo-pin svg { display: block; width: 32px; height: 32px; }
      .omo-pin--on { color: ${tokens.color.brand.accent}; }
      .omo-pin--on svg { transform: scale(1.15); transform-origin: bottom center; }
      .omo-cluster { display: flex; align-items: center; justify-content: center; border-radius: 99px; background: ${tokens.color.brand.primary}; color: ${tokens.color.text.onBrand}; font-weight: 700; font-family: inherit; border: 3px solid ${tokens.color.surface.white}; box-shadow: 0 2px 8px rgba(23,59,54,.28); cursor: pointer; line-height: 1; user-select: none; }
      .omo-cluster--sm { width: 40px; height: 40px; font-size: 14px; }
      .omo-cluster--md { width: 46px; height: 46px; font-size: 15px; }
      .omo-cluster--lg { width: 54px; height: 54px; font-size: 16px; }
      .omo-me { width: 18px; height: 18px; border-radius: 99px; background: ${tokens.color.brand.deep}; border: 3px solid ${tokens.color.surface.white}; box-shadow: 0 0 0 6px rgba(31,111,95,.28); }
      .maplibregl-popup.omo-popup .maplibregl-popup-content { padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(23,59,54,.18); }
      .maplibregl-popup.omo-popup .maplibregl-popup-tip { border-top-color: ${tokens.color.surface.white}; }
      .omo-tip { display: block; width: 220px; border: 0; background: ${tokens.color.surface.white}; text-align: left; cursor: pointer; padding: 0; font-family: inherit; }
      .omo-tip__photo { height: 96px; background: ${tokens.color.brand.deep}; display: flex; align-items: center; justify-content: center; color: ${tokens.color.text.onBrand}; font-weight: 700; font-size: 28px; overflow: hidden; }
      .omo-tip__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .omo-tip__body { padding: 10px 12px 12px; }
      .omo-tip__name { display: block; color: ${tokens.color.brand.deep}; font-weight: 700; font-size: 14px; line-height: 1.3; }
      .omo-tip__meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
      .omo-tip__badge { font-size: 11px; font-weight: 400; padding: 2px 8px; border-radius: 999px; background: ${tokens.color.surface.mint}; color: ${tokens.color.brand.deep}; }
      .omo-tip__badge--off { background: ${tokens.color.brand.cream}; color: ${tokens.color.text.muted}; }
      .omo-tip__open { font-weight: 600; color: ${tokens.color.feedback.success}; }
      .omo-tip__until { font-weight: 400; color: ${tokens.color.text.muted}; }
      .omo-tip__place { display: block; margin-top: 6px; color: ${tokens.color.text.muted}; font-size: 12px; line-height: 1.35; }
    `;
    document.head.appendChild(style);
  }
}

function loadMapLibre(): Promise<MapLibreModule> {
  ensureMapAssets();
  const existing = (window as Window & { maplibregl?: MapLibreModule }).maplibregl;
  if (existing?.Map) {
    return Promise.resolve(existing);
  }
  return new Promise((resolve, reject) => {
    const ready = () => {
      const lib = (window as Window & { maplibregl?: MapLibreModule }).maplibregl;
      if (lib?.Map) {
        resolve(lib);
        return;
      }
      reject(new Error('MapLibre indisponible'));
    };
    const current = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (current) {
      current.addEventListener('load', ready, { once: true });
      current.addEventListener('error', () => reject(new Error('MapLibre indisponible')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    script.onload = ready;
    script.onerror = () => reject(new Error('MapLibre indisponible'));
    document.head.appendChild(script);
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    if (char === '"') return '&quot;';
    return '&#39;';
  });
}

function placeLabel(restaurant: RestaurantSummary): string {
  return [restaurant.landmarkText, restaurant.district, restaurant.city].filter(Boolean).join(' · ');
}

function popupHtml(restaurant: RestaurantSummary): string {
  const photo = `<img src="${escapeHtml(restaurantCoverUrl(restaurant.coverImageUrl, restaurant.id))}" alt="" />`;
  const status = openingStatusParts(restaurant);
  const openClass = status.open ? '' : ' omo-tip__badge--off';
  const place = [formatDistance(restaurant.distanceMeters), placeLabel(restaurant) || restaurant.city]
    .filter(Boolean)
    .join(' · ');
  const hours = status.detail
    ? `<span class="${status.open ? 'omo-tip__open' : ''}">${escapeHtml(status.label)}</span><span class="omo-tip__until"> · ${escapeHtml(status.detail)}</span>`
    : `<span class="${status.open ? 'omo-tip__open' : ''}">${escapeHtml(status.label)}</span>`;
  return `
    <button type="button" class="omo-tip" data-slug="${escapeHtml(restaurant.slug)}">
      <div class="omo-tip__photo">${photo}</div>
      <div class="omo-tip__body">
        <span class="omo-tip__name">${escapeHtml(restaurant.name)}</span>
        <span class="omo-tip__meta"><span class="omo-tip__badge${openClass}">${hours}</span></span>
        <span class="omo-tip__place">${escapeHtml(place)}</span>
      </div>
    </button>
  `;
}

export function DiscoveryMap({
  restaurants,
  selectedId,
  userLocation,
  onSelect,
  onOpenRestaurant,
  onRegionSettled,
  interactive = true,
  recenterKey = 0,
}: DiscoveryMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const libRef = useRef<MapLibreModule | null>(null);
  const markersRef = useRef<Map<string, { marker: MarkerInstance; el: HTMLElement }>>(new Map());
  const userMarkerRef = useRef<MarkerInstance | null>(null);
  const popupRef = useRef<PopupInstance | null>(null);
  const userMovedRef = useRef(false);
  const revealGenRef = useRef(0);
  const restaurantsRef = useRef(restaurants);
  const selectedRef = useRef(selectedId);
  const userRef = useRef(userLocation);
  const onSelectRef = useRef(onSelect);
  const onOpenRef = useRef(onOpenRestaurant);
  const onRegionRef = useRef(onRegionSettled);
  const [failed, setFailed] = useState(false);

  restaurantsRef.current = restaurants;
  selectedRef.current = selectedId;
  userRef.current = userLocation;
  onSelectRef.current = onSelect;
  onOpenRef.current = onOpenRestaurant;
  onRegionRef.current = onRegionSettled;

  const syncMarkersInEffect = useEffectEvent((maplibregl: MapLibreModule, map: MapInstance) => {
    syncMarkers(maplibregl, map);
  });
  const revealClosestInEffect = useEffectEvent((maplibregl: MapLibreModule, map: MapInstance, force = false) => {
    revealClosestIfNeeded(maplibregl, map, force);
  });
  const focusRestaurantInEffect = useEffectEvent(
    (maplibregl: MapLibreModule, map: MapInstance, restaurant: RestaurantSummary) => {
      focusRestaurant(maplibregl, map, restaurant);
    },
  );

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let regionTimer: ReturnType<typeof setTimeout> | undefined;
    const host = hostRef.current;
    const markers = markersRef.current;
    if (!host) {
      return;
    }

    void loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || mapRef.current) {
          return;
        }
        libRef.current = maplibregl;
        const start = userRef.current ?? ABIDJAN;
        const map = new maplibregl.Map({
          container: host,
          style: DEFAULT_MAP_STYLE,
          center: [start.longitude, start.latitude],
          zoom: userRef.current ? 14.5 : 12,
          attributionControl: { compact: true },
          interactive,
        });
        mapRef.current = map;
        observer = new ResizeObserver(() => {
          map.resize();
        });
        observer.observe(host);

        map.on('load', () => {
          map.resize();
          syncMarkersInEffect(maplibregl, map);
          revealClosestInEffect(maplibregl, map);
        });
        map.on('idle', () => {
          if (markersRef.current.size === 0 && restaurantsRef.current.length > 0) {
            syncMarkersInEffect(maplibregl, map);
            revealClosestInEffect(maplibregl, map);
          }
        });

        map.on('movestart', (event) => {
          if (event.originalEvent) {
            userMovedRef.current = true;
            revealGenRef.current += 1;
          }
        });
        map.on('zoomend', () => {
          syncMarkersInEffect(maplibregl, map);
        });
        map.on('moveend', () => {
          syncMarkersInEffect(maplibregl, map);
          if (!userMovedRef.current || !interactive) {
            return;
          }
          if (regionTimer) {
            clearTimeout(regionTimer);
          }
          regionTimer = setTimeout(() => {
            const bounds = map.getBounds();
            const center = map.getCenter();
            if (!bounds || !center) {
              return;
            }
            try {
              onRegionRef.current?.({
                latitude: center.lat,
                longitude: center.lng,
                radiusMeters: radiusMetersFromBounds({
                  north: bounds.getNorth(),
                  south: bounds.getSouth(),
                  east: bounds.getEast(),
                  west: bounds.getWest(),
                }),
              });
            } catch {
              // Carte pas encore prête (bounds vides).
            }
          }, 350);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      revealGenRef.current += 1;
      if (regionTimer) {
        clearTimeout(regionTimer);
      }
      observer?.disconnect();
      popupRef.current?.remove();
      for (const entry of markers.values()) {
        entry.marker.remove();
      }
      markers.clear();
      userMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) {
      return;
    }
    if (!map.isStyleLoaded()) {
      map.once('idle', () => {
        syncMarkersInEffect(lib, map);
        revealClosestInEffect(lib, map, Boolean(userRef.current) && !userMovedRef.current);
      });
      return;
    }
    syncMarkersInEffect(lib, map);
    revealClosestInEffect(lib, map, Boolean(userRef.current) && !userMovedRef.current);
  }, [restaurants, userLocation]);

  useEffect(() => {
    if (!recenterKey) {
      return;
    }
    userMovedRef.current = false;
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) {
      return;
    }
    syncMarkersInEffect(lib, map);
    revealClosestInEffect(lib, map, true);
  }, [recenterKey]);

  useEffect(() => {
    for (const [id, entry] of markersRef.current) {
      if (!id.startsWith('pin:')) {
        continue;
      }
      entry.el.classList.toggle('omo-pin--on', id === `pin:${selectedId}`);
    }
    const selected = restaurantsRef.current.find((item) => item.id === selectedId);
    const map = mapRef.current;
    const lib = libRef.current;
    if (selected && map && lib && interactive) {
      focusRestaurantInEffect(lib, map, selected);
    }
  }, [interactive, selectedId]);

  function restaurantPoints(): RestaurantSummary[] {
    const user = userRef.current;
    const distance = (item: RestaurantSummary) => {
      if (item.distanceMeters != null) {
        return item.distanceMeters;
      }
      if (user && Number.isFinite(user.latitude) && Number.isFinite(user.longitude)) {
        return haversineMeters(user.latitude, user.longitude, item.latitude, item.longitude);
      }
      return Number.POSITIVE_INFINITY;
    };
    return restaurantsRef.current
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .slice()
      .sort((left, right) => distance(left) - distance(right));
  }

  function isOnMap(map: MapInstance, longitude: number, latitude: number): boolean {
    try {
      const bounds = map.getBounds();
      const canvas = map.getContainer();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 16 || height < 16) {
        return false;
      }
      const west = bounds.getWest();
      const east = bounds.getEast();
      const south = bounds.getSouth();
      const north = bounds.getNorth();
      const lngSpan = east - west;
      const latSpan = north - south;
      const pad = fitPadding(map);
      const padX = (pad.left / width) * lngSpan;
      const padTop = (pad.top / height) * latSpan;
      const padBottom = (pad.bottom / height) * latSpan;
      return (
        longitude >= west + padX &&
        longitude <= east - padX &&
        latitude >= south + padBottom &&
        latitude <= north - padTop
      );
    } catch {
      return false;
    }
  }

  function fitPadding(map: MapInstance) {
    const width = map.getContainer().clientWidth;
    const height = map.getContainer().clientHeight;
    return {
      top: Math.min(120, Math.max(36, Math.round(height * 0.22))),
      bottom: Math.min(160, Math.max(48, Math.round(height * 0.28))),
      left: Math.min(40, Math.max(24, Math.round(width * 0.08))),
      right: Math.min(40, Math.max(24, Math.round(width * 0.08))),
    };
  }

  function fitCoordinates(maplibregl: MapLibreModule, map: MapInstance, coords: Array<[number, number]>, maxZoom: number) {
    const first = coords[0];
    if (!first) {
      return;
    }
    if (coords.length === 1) {
      map.easeTo({ center: first, zoom: Math.min(14.5, maxZoom), duration: 700 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds(first, first);
    for (const pair of coords.slice(1)) {
      bounds.extend(pair);
    }
    try {
      map.fitBounds(bounds, {
        padding: fitPadding(map),
        maxZoom,
        duration: 700,
      });
    } catch {
      map.easeTo({ zoom: Math.max(4, map.getZoom() - 2), duration: 400 });
    }
  }

  function zoomOutUntilPointsVisible(map: MapInstance, points: Array<[number, number]>) {
    const generation = ++revealGenRef.current;
    const step = () => {
      if (generation !== revealGenRef.current) {
        return;
      }
      if (points.every(([longitude, latitude]) => isOnMap(map, longitude, latitude))) {
        return;
      }
      const zoom = map.getZoom();
      if (zoom <= 4) {
        return;
      }
      map.once('moveend', step);
      map.easeTo({ zoom: Math.max(4, zoom - 1.2), duration: 280 });
    };
    step();
  }

  function revealClosestIfNeeded(maplibregl: MapLibreModule, map: MapInstance, force = false) {
    // Never fight a user's pan/zoom when new results arrive.
    if (!force && userMovedRef.current) return;
    if (!force && selectedRef.current) {
      return;
    }

    const container = map.getContainer();
    if (container.clientWidth < 16 || container.clientHeight < 16) {
      map.once('idle', () => {
        revealClosestIfNeeded(maplibregl, map, force);
      });
      return;
    }

    const points = restaurantPoints();
    const user = userRef.current;
    const hasUser = Boolean(user && Number.isFinite(user.latitude) && Number.isFinite(user.longitude));

    if (points.length === 0) {
      revealGenRef.current += 1;
      if (hasUser && user && !userMovedRef.current && markersRef.current.size === 0) {
        map.easeTo({ center: [user.longitude, user.latitude], zoom: 14.5, duration: 700 });
      }
      return;
    }

    const closest = points[0];
    if (!closest) {
      return;
    }

    const restaurantVisible = points.some((item) => isOnMap(map, item.longitude, item.latitude));
    if (!force && restaurantVisible) {
      return;
    }

    if (hasUser && user) {
      revealGenRef.current += 1;
      const generation = revealGenRef.current;
      const pair: Array<[number, number]> = [
        [user.longitude, user.latitude],
        [closest.longitude, closest.latitude],
      ];
      try {
        fitCoordinates(maplibregl, map, pair, 14.5);
        map.once('moveend', () => {
          if (generation !== revealGenRef.current) {
            return;
          }
          zoomOutUntilPointsVisible(map, pair);
        });
      } catch {
        zoomOutUntilPointsVisible(map, pair);
      }
      return;
    }

    zoomOutUntilPointsVisible(map, [[closest.longitude, closest.latitude]]);
  }

  function focusRestaurant(maplibregl: MapLibreModule, map: MapInstance, restaurant: RestaurantSummary) {
    if (!Number.isFinite(restaurant.latitude) || !Number.isFinite(restaurant.longitude)) {
      return;
    }
    const pad = 0.0035;
    const bounds = new maplibregl.LngLatBounds(
      [restaurant.longitude - pad, restaurant.latitude - pad],
      [restaurant.longitude + pad, restaurant.latitude + pad],
    );
    map.fitBounds(bounds, {
      padding: { top: 100, bottom: 200, left: 48, right: 48 },
      maxZoom: 16.2,
      duration: 550,
    });
    openPopup(maplibregl, map, restaurant);
  }

  function openPopup(maplibregl: MapLibreModule, map: MapInstance, restaurant: RestaurantSummary) {
    popupRef.current?.remove();
    const popup = new maplibregl.Popup({
      offset: 36,
      closeButton: true,
      className: 'omo-popup',
      maxWidth: '240px',
    })
      .setLngLat([restaurant.longitude, restaurant.latitude])
      .setHTML(popupHtml(restaurant))
      .addTo(map);
    popup.getElement()?.querySelector('.omo-tip')?.addEventListener('click', () => {
      onOpenRef.current?.(restaurant.slug);
    });
    popupRef.current = popup;
  }

  function openCluster(maplibregl: MapLibreModule, map: MapInstance, restaurants: RestaurantSummary[]) {
    const coords = restaurants
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .map((item): [number, number] => [item.longitude, item.latitude]);
    if (coords.length === 0) {
      return;
    }
    fitCoordinates(maplibregl, map, coords, 16.2);
  }

  function syncMarkers(maplibregl: MapLibreModule, map: MapInstance) {
    const clustered = clusterRestaurants(map, restaurantsRef.current);
    const seen = new Set<string>();
    for (const item of clustered) {
      seen.add(item.key);
      const existing = markersRef.current.get(item.key);
      if (item.type === 'pin') {
        const restaurant = item.restaurant;
        if (existing) {
          existing.marker.setLngLat([restaurant.longitude, restaurant.latitude]);
          // Preserve MapLibre's positioning classes added by Marker.addTo().
          existing.el.classList.toggle('omo-pin--on', restaurant.id === selectedRef.current);
          continue;
        }
        const el = document.createElement('div');
        el.className = restaurant.id === selectedRef.current ? 'omo-pin omo-pin--on' : 'omo-pin';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.display = 'block';
        el.innerHTML = LOCATION_PIN_SVG;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', restaurant.name);
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          const current = restaurantsRef.current.find((entry) => entry.id === restaurant.id) ?? restaurant;
          onSelectRef.current?.(current.id);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([restaurant.longitude, restaurant.latitude])
          .addTo(map);
        markersRef.current.set(item.key, { marker, el });
        continue;
      }

      const sizeClass = item.restaurants.length >= 100 ? 'omo-cluster--lg' : item.restaurants.length >= 10 ? 'omo-cluster--md' : 'omo-cluster--sm';
      if (existing) {
        existing.marker.setLngLat([item.longitude, item.latitude]);
        existing.el.classList.remove('omo-cluster--sm', 'omo-cluster--md', 'omo-cluster--lg');
        existing.el.classList.add(sizeClass);
        existing.el.textContent = String(item.restaurants.length);
        continue;
      }
      const el = document.createElement('div');
      el.className = `omo-cluster ${sizeClass}`;
      el.textContent = String(item.restaurants.length);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${item.restaurants.length} restaurants`);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        openCluster(maplibregl, map, item.restaurants);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([item.longitude, item.latitude])
        .addTo(map);
      markersRef.current.set(item.key, { marker, el });
    }
    for (const [id, entry] of markersRef.current) {
      if (!seen.has(id)) {
        entry.marker.remove();
        markersRef.current.delete(id);
      }
    }

    const user = userRef.current;
    if (user) {
      if (!userMarkerRef.current) {
        const me = document.createElement('div');
        me.className = 'omo-me';
        me.setAttribute('aria-label', t('map.you'));
        userMarkerRef.current = new maplibregl.Marker({ element: me, anchor: 'center' })
          .setLngLat([user.longitude, user.latitude])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([user.longitude, user.latitude]);
      }
    } else {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    }
  }

  if (failed) {
    return (
      <View style={styles.fallback}>
        <AppText variant="muted">La carte n’a pas pu se charger. Passez en liste.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLabel="Carte des restaurants">
      {createElement('div', {
        ref: hostRef,
        style: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: tokens.color.surface.mint,
  },
  fallback: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.mint,
  },
});
