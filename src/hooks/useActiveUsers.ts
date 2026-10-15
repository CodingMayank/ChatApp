import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export function useActiveUsers(groupId?: string | null) {
  const [totalActiveUsers, setTotalActiveUsers] = useState(0);
  const [groupActiveUsers, setGroupActiveUsers] = useState(0);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const counts = await api.fetchActiveUsers(groupId);
        setTotalActiveUsers(counts.totalCount);
        setGroupActiveUsers(counts.groupCount);
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    void fetchActiveUsers();
    const interval = window.setInterval(() => void fetchActiveUsers(), 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [groupId]);

  return { totalActiveUsers, groupActiveUsers };
}
