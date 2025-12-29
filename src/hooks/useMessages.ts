import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  group_id: string;
  sender_name: string;
  content: string;
  session_id: string;
  created_at: string;
  isOwn?: boolean;
  isSystemMessage?: boolean;
}

export function useMessages(groupId: string | null, currentSessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
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

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;

        const currentSession = sessionIdRef.current;
        const messagesWithOwnership = (data || []).map(msg => ({
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

    fetchMessages();

    // Create unique channel name
    const channelName = `messages-${groupId}-${Date.now()}`;
    
    // Subscribe to real-time messages
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          const currentSession = sessionIdRef.current;
          setMessages(prev => [...prev, {
            ...newMessage,
            isOwn: newMessage.session_id === currentSession,
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const sendMessage = useCallback(async (content: string, senderName: string, sessionId: string) => {
    if (!groupId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        group_id: groupId,
        sender_name: senderName,
        content,
        session_id: sessionId,
      });

    if (error) throw error;
  }, [groupId]);

  const sendSystemMessage = useCallback(async (content: string) => {
    if (!groupId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        group_id: groupId,
        sender_name: 'SYSTEM',
        content,
        session_id: 'system',
      });

    if (error) console.error('Error sending system message:', error);
  }, [groupId]);

  const deleteUserMessages = useCallback(async (sessionId: string) => {
    if (!groupId) return;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('group_id', groupId)
      .eq('session_id', sessionId);

    if (error) console.error('Error deleting user messages:', error);
  }, [groupId]);

  const deleteAllMessages = useCallback(async () => {
    if (!groupId) return;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('group_id', groupId);

    if (error) console.error('Error deleting all messages:', error);
  }, [groupId]);

  return { messages, isLoading, sendMessage, sendSystemMessage, deleteUserMessages, deleteAllMessages };
}
