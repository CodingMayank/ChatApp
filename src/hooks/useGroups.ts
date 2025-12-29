import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Group {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
  creator_session_id: string;
  activeUsers?: number;
  distance?: number;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function useGroups(userLat: number | null, userLon: number | null) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const latRef = useRef(userLat);
  const lonRef = useRef(userLon);

  // Keep refs in sync
  useEffect(() => {
    latRef.current = userLat;
    lonRef.current = userLon;
  }, [userLat, userLon]);

  const fetchGroups = useCallback(async () => {
    const lat = latRef.current;
    const lon = lonRef.current;
    
    if (lat === null || lon === null) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Fetch active user counts per group
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('active_sessions')
        .select('group_id');

      if (sessionsError) throw sessionsError;

      // Count users per group
      const userCounts: Record<string, number> = {};
      sessionsData?.forEach(session => {
        if (session.group_id) {
          userCounts[session.group_id] = (userCounts[session.group_id] || 0) + 1;
        }
      });

      // Calculate distances and filter to 5km radius
      const groupsWithDistance = (groupsData || [])
        .map(group => ({
          ...group,
          distance: calculateDistance(lat, lon, group.latitude, group.longitude),
          activeUsers: userCounts[group.id] || 0,
        }))
        .filter(group => group.distance <= 5)
        .sort((a, b) => a.distance - b.distance);

      setGroups(groupsWithDistance);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchGroups();

    // Create unique channel name
    const channelName = `groups-${Date.now()}`;
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => fetchGroups()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_sessions' },
        () => fetchGroups()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGroups]);

  // Re-fetch when location changes
  useEffect(() => {
    if (userLat !== null && userLon !== null) {
      fetchGroups();
    }
  }, [userLat, userLon, fetchGroups]);

  const createGroup = useCallback(async (name: string, sessionId: string, latitude: number, longitude: number) => {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name,
        latitude,
        longitude,
        creator_session_id: sessionId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  return { groups, isLoading, createGroup, refetch: fetchGroups };
}
