import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateUsername } from '@/lib/usernameGenerator';

interface Session {
  sessionId: string;
  username: string;
  latitude: number | null;
  longitude: number | null;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to restore session from sessionStorage
    const storedSessionId = sessionStorage.getItem('nearbyChat_sessionId');
    const storedUsername = sessionStorage.getItem('nearbyChat_username');
    const storedLatitude = sessionStorage.getItem('nearbyChat_latitude');
    const storedLongitude = sessionStorage.getItem('nearbyChat_longitude');

    if (storedSessionId && storedUsername) {
      setSession({
        sessionId: storedSessionId,
        username: storedUsername,
        latitude: storedLatitude ? parseFloat(storedLatitude) : null,
        longitude: storedLongitude ? parseFloat(storedLongitude) : null,
      });
    }
    setIsLoading(false);
  }, []);

  const createSession = useCallback(async (latitude: number, longitude: number) => {
    const sessionId = crypto.randomUUID();
    const username = generateUsername();

    sessionStorage.setItem('nearbyChat_sessionId', sessionId);
    sessionStorage.setItem('nearbyChat_username', username);
    sessionStorage.setItem('nearbyChat_latitude', latitude.toString());
    sessionStorage.setItem('nearbyChat_longitude', longitude.toString());

    // Register session in database
    const { error } = await supabase.from('active_sessions').insert({
      session_id: sessionId,
      username: username,
      group_id: null,
    });

    if (error) {
      console.error('Error creating session:', error);
    }

    const newSession = { sessionId, username, latitude, longitude };
    setSession(newSession);
    return newSession;
  }, []);

  const updateSessionGroup = useCallback(async (groupId: string | null) => {
    if (!session) return;

    // Get current group before updating
    const currentGroupId = sessionStorage.getItem('nearbyChat_currentGroup');

    // Update session with new group
    await supabase
      .from('active_sessions')
      .update({ group_id: groupId, last_seen: new Date().toISOString() })
      .eq('session_id', session.sessionId);

    // If leaving a group (groupId is null and we had a previous group), check if group is now empty
    if (groupId === null && currentGroupId) {
      await checkAndDeleteEmptyGroup(currentGroupId);
    }
  }, [session]);

  const checkAndDeleteEmptyGroup = async (groupId: string) => {
    try {
      // Count remaining users in the group
      const { count, error: countError } = await supabase
        .from('active_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if (countError) {
        console.error('Error counting group members:', countError);
        return;
      }

      // If no users left, delete the group (this will cascade delete messages)
      if (count === 0) {
        console.log('Deleting empty group:', groupId);
        const { error: deleteError } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupId);

        if (deleteError) {
          console.error('Error deleting empty group:', deleteError);
        }
      }
    } catch (err) {
      console.error('Error in checkAndDeleteEmptyGroup:', err);
    }
  };

  const heartbeat = useCallback(async () => {
    if (!session) return;

    await supabase
      .from('active_sessions')
      .update({ last_seen: new Date().toISOString() })
      .eq('session_id', session.sessionId);
  }, [session]);

  const endSession = useCallback(async () => {
    if (!session) return;

    // Get current group before ending session
    const currentGroupId = sessionStorage.getItem('nearbyChat_currentGroup');

    await supabase
      .from('active_sessions')
      .delete()
      .eq('session_id', session.sessionId);

    // Check if the group should be deleted
    if (currentGroupId) {
      await checkAndDeleteEmptyGroup(currentGroupId);
    }

    sessionStorage.removeItem('nearbyChat_sessionId');
    sessionStorage.removeItem('nearbyChat_username');
    sessionStorage.removeItem('nearbyChat_latitude');
    sessionStorage.removeItem('nearbyChat_longitude');
    sessionStorage.removeItem('nearbyChat_currentGroup');
    sessionStorage.removeItem('nearbyChat_currentGroupName');

    setSession(null);
  }, [session]);

  return {
    session,
    isLoading,
    createSession,
    updateSessionGroup,
    heartbeat,
    endSession,
  };
}
