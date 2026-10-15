import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
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
    const storedSessionId = sessionStorage.getItem('nearbyChat_sessionId');
    const storedUsername = sessionStorage.getItem('nearbyChat_username');
    const storedLatitude = sessionStorage.getItem('nearbyChat_latitude');
    const storedLongitude = sessionStorage.getItem('nearbyChat_longitude');

    let isMounted = true;
    const restoreSession = async () => {
      try {
        if (storedSessionId && storedUsername) {
          await api.createSession(storedSessionId, storedUsername);
          const latitude = storedLatitude === null ? null : Number(storedLatitude);
          const longitude = storedLongitude === null ? null : Number(storedLongitude);
          if (isMounted) {
            setSession({
              sessionId: storedSessionId,
              username: storedUsername,
              latitude: Number.isFinite(latitude) ? latitude : null,
              longitude: Number.isFinite(longitude) ? longitude : null,
            });
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const createSession = useCallback(async (latitude: number, longitude: number) => {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error('A valid location is required to start a session.');
    }

    const sessionId = crypto.randomUUID();
    const username = generateUsername();

    await api.createSession(sessionId, username);

    sessionStorage.setItem('nearbyChat_sessionId', sessionId);
    sessionStorage.setItem('nearbyChat_username', username);
    sessionStorage.setItem('nearbyChat_latitude', latitude.toString());
    sessionStorage.setItem('nearbyChat_longitude', longitude.toString());

    const newSession = { sessionId, username, latitude, longitude };
    setSession(newSession);
    return newSession;
  }, []);

  const updateSessionGroup = useCallback(async (groupId: string | null) => {
    if (!session) throw new Error('Your session expired. Please start a new session.');
    await api.updateSessionGroup(session.sessionId, groupId);
  }, [session]);

  const heartbeat = useCallback(async () => {
    if (!session) return;

    try {
      await api.heartbeat(session.sessionId);
    } catch (error) {
      console.error('Error updating session heartbeat:', error);
    }
  }, [session]);

  const endSession = useCallback(async () => {
    if (!session) return;

    await api.endSession(session.sessionId);

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
