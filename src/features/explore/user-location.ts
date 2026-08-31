import { useCallback, useEffect, useState } from 'react';

export interface UserCoords {
  latitude: number;
  longitude: number;
}

export type LocationStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

function readBrowserLocation(fresh = false): Promise<UserCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: fresh ? 0 : 60_000 },
    );
  });
}

export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('pending');

  const refresh = useCallback(async (options?: { fresh?: boolean }) => {
    setStatus('pending');
    const next = await readBrowserLocation(options?.fresh);
    if (next) {
      setCoords(next);
      setStatus('granted');
      return next;
    }
    setStatus(typeof navigator !== 'undefined' && navigator.geolocation ? 'denied' : 'unavailable');
    return null;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { coords, status, refresh };
}
