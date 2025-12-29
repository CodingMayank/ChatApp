import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useActiveUsers(groupId?: string | null) {
  const [totalActiveUsers, setTotalActiveUsers] = useState(0);
  const [groupActiveUsers, setGroupActiveUsers] = useState(0);
  const groupIdRef = useRef(groupId);

  // Keep ref in sync
  useEffect(() => {
    groupIdRef.current = groupId;
  }, [groupId]);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        // Fetch total active users (seen in last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { count: totalCount, error: totalError } = await supabase
          .from('active_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', fiveMinutesAgo);

        if (!totalError && totalCount !== null) {
          setTotalActiveUsers(totalCount);
        }

        // Fetch group-specific active users
        const currentGroupId = groupIdRef.current;
        if (currentGroupId) {
          const { count: groupCount, error: groupError } = await supabase
            .from('active_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', currentGroupId)
            .gte('last_seen', fiveMinutesAgo);

          if (!groupError && groupCount !== null) {
            setGroupActiveUsers(groupCount);
          }
        } else {
          setGroupActiveUsers(0);
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    // Initial fetch
    fetchActiveUsers();

    // Create a unique channel name
    const channelName = `active-users-${Date.now()}`;
    
    // Subscribe to real-time updates for active sessions
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_sessions' },
        () => fetchActiveUsers()
      )
      .subscribe();

    // Poll every 10 seconds for live count updates
    const interval = setInterval(fetchActiveUsers, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []); // Empty dependency - uses ref for groupId

  // Re-fetch when groupId changes
  useEffect(() => {
    if (groupId === undefined) return;
    
    const fetchGroupUsers = async () => {
      if (!groupId) {
        setGroupActiveUsers(0);
        return;
      }
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('active_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .gte('last_seen', fiveMinutesAgo);

      if (!error && count !== null) {
        setGroupActiveUsers(count);
      }
    };
    
    fetchGroupUsers();
  }, [groupId]);

  return { totalActiveUsers, groupActiveUsers };
}
