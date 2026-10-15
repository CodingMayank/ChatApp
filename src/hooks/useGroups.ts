import { useState, useEffect, useCallback, useRef } from 'react';
import { api, type Group } from '@/lib/api';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGroups(userLat: number | null, userLon: number | null) {
  const [groups, setGroups] = useState<Array<Group & { distance: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const locationRef = useRef({ latitude: userLat, longitude: userLon });

  useEffect(() => {
    locationRef.current = { latitude: userLat, longitude: userLon };
  }, [userLat, userLon]);

  const fetchGroups = useCallback(async () => {
    const { latitude, longitude } = locationRef.current;
    if (latitude === null || longitude === null) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.fetchGroups();
      setGroups(
        data
          .map((group) => ({
            ...group,
            distance: calculateDistance(latitude, longitude, group.latitude, group.longitude),
          }))
          .filter((group) => group.distance <= 5)
          .sort((a, b) => a.distance - b.distance),
      );
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGroups();
    const interval = window.setInterval(() => void fetchGroups(), 5000);
    return () => window.clearInterval(interval);
  }, [fetchGroups]);

  useEffect(() => {
    if (userLat !== null && userLon !== null) void fetchGroups();
  }, [userLat, userLon, fetchGroups]);

  const createGroup = useCallback(
    (name: string, sessionId: string, latitude: number, longitude: number) =>
      api.createGroup(name, sessionId, latitude, longitude),
    [],
  );

  return { groups, isLoading, createGroup, refetch: fetchGroups };
}
