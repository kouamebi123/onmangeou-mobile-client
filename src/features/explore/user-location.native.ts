import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export interface UserCoords {
  latitude: number;
  longitude: number;
}

export type LocationStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('pending');
  const generation = useRef(0);
  const refresh = useCallback(async (_options?: { fresh?: boolean }) => {
    const request = ++generation.current;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setStatus('pending');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (request !== generation.current) return null;
      if (permission.status !== 'granted') {
        setStatus('denied');
        return null;
      }
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Location timeout')), 12_000);
        }),
      ]);
      if (request !== generation.current) return null;
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoords(next);
      setStatus('granted');
      return next;
    } catch {
      if (request === generation.current) setStatus('unavailable');
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }, []);
  useEffect(() => {
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]);
  return { coords, status, refresh };
}
