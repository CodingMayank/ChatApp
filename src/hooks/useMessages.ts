import { useState, useEffect, useCallback, useRef } from 'react';
import { api, type Message } from '@/lib/api';

export function useMessages(groupId: string | null, currentSessionId: string | null) {
  const [messages, setMessages] = useState<Array<Message & { isOwn: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sessionIdRef = useRef(currentSessionId);

  // Keep ref in sync
  useEffect(() => {
    sessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    if (!groupId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const fetchMessages = async () => {
      try {
        const data = await api.fetchMessages(groupId);
        const currentSession = sessionIdRef.current;
        const messagesWithOwnership = data.map(msg => ({
          ...msg,
          isOwn: msg.session_id === currentSession,
        }));

        setMessages(messagesWithOwnership);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchMessages();
    const interval = window.setInterval(() => void fetchMessages(), 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [groupId]);

  const sendMessage = useCallback(async (content: string, senderName: string, sessionId: string) => {
    if (!groupId) return;

    await api.sendMessage(groupId, senderName, content, sessionId);
  }, [groupId]);

  const sendSystemMessage = useCallback(async (content: string) => {
    if (!groupId) return;

    try {
      await api.sendMessage(groupId, 'SYSTEM', content, 'system');
    } catch (error) {
      console.error('Error sending system message:', error);
    }
  }, [groupId]);

  const deleteUserMessages = useCallback(async (sessionId: string) => {
    if (!groupId) return;

    await api.deleteMessages(groupId, sessionId);
  }, [groupId]);

  const deleteAllMessages = useCallback(async () => {
    if (!groupId) return;

    await api.deleteMessages(groupId);
  }, [groupId]);

  return { messages, isLoading, sendMessage, sendSystemMessage, deleteUserMessages, deleteAllMessages };
}
