import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CloudBackground } from '@/components/CloudBackground';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, DoorOpen, Send, Users } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { useMessages } from '@/hooks/useMessages';
import { useActiveUsers } from '@/hooks/useActiveUsers';

const ChatRoomScreen: React.FC = () => {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { session, isLoading: sessionLoading, updateSessionGroup, heartbeat } = useSession();
  const { messages, sendMessage, sendSystemMessage, deleteUserMessages, deleteAllMessages, isLoading: messagesLoading } = useMessages(groupId || null, session?.sessionId || null);
  const { groupActiveUsers } = useActiveUsers(groupId);
  const hasJoinedRef = useRef(false);
  const [newMessage, setNewMessage] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Wait for session to load
    if (sessionLoading) return;
    
    // If no session or no location data, redirect to onboarding to get location again
    if (!session || !session.latitude || !session.longitude) {
      // Clear any stale session data
      sessionStorage.removeItem('nearbyChat_sessionId');
      sessionStorage.removeItem('nearbyChat_username');
      sessionStorage.removeItem('nearbyChat_latitude');
      sessionStorage.removeItem('nearbyChat_longitude');
      sessionStorage.removeItem('nearbyChat_currentGroup');
      sessionStorage.removeItem('nearbyChat_currentGroupName');
      navigate('/onboarding');
      return;
    }

    const storedGroupName = sessionStorage.getItem('nearbyChat_currentGroupName');
    setGroupName(storedGroupName || 'Chat Room');

    // Join the group and handle rejoining
    const joinGroup = async () => {
      if (hasJoinedRef.current) return;
      hasJoinedRef.current = true;
      
      // Delete previous messages from this user when rejoining
      await deleteUserMessages(session.sessionId);
      
      // Join the group
      await updateSessionGroup(groupId || null);
    };
    
    joinGroup();

    // Heartbeat every 20 seconds for accurate online count
    const interval = setInterval(heartbeat, 20000);
    
    // Initial heartbeat
    heartbeat();
    
    return () => clearInterval(interval);
  }, [session, sessionLoading, navigate, groupId, updateSessionGroup, heartbeat, deleteUserMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !session || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage.trim(), session.username, session.sessionId);
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleLeave = async () => {
    // Delete ALL messages in the group when user leaves
    await deleteAllMessages();
    
    // Send system message that user left (this will be the only message)
    if (session) {
      await sendSystemMessage(`🌥️ ${session.username} left the group`);
    }
    
    // This will automatically delete the group if this was the last user
    await updateSessionGroup(null);
    sessionStorage.removeItem('nearbyChat_currentGroup');
    sessionStorage.removeItem('nearbyChat_currentGroupName');
    setShowLeaveDialog(false);
    navigate('/groups');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show loading while session is being checked
  if (sessionLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <CloudBackground />
        <div className="relative z-10">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      <CloudBackground />
      
      {/* Header */}
      <header className="relative z-20 glass-card-strong rounded-none border-t-0 border-x-0 px-4 py-3 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-bold text-foreground truncate">
                {groupName}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="relative">
                  <Users className="w-3 h-3 text-primary" />
                  {groupActiveUsers > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span className="font-medium">{groupActiveUsers}</span> in chat
              </p>
            </div>
          </div>
          
          <Button 
            variant="glass" 
            size="sm" 
            onClick={() => setShowLeaveDialog(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <DoorOpen className="w-4 h-4" />
            Leave
          </Button>
        </div>
      </header>

      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="glass-card-strong border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages in this chat. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave & Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 relative z-10">
        <div className="max-w-2xl mx-auto space-y-4">
          {messagesLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isSystem = message.session_id === 'system';
              
              if (isSystem) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-xs italic">
                      {message.content}
                    </div>
                  </div>
                );
              }
              
              return (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] ${
                      message.isOwn 
                        ? 'message-bubble-own' 
                        : 'message-bubble'
                    }`}
                  >
                    {!message.isOwn && (
                      <p className="text-xs font-medium text-primary mb-1">
                        {message.sender_name}
                      </p>
                    )}
                    <p className={`text-sm leading-relaxed ${
                      message.isOwn ? 'text-primary-foreground' : 'text-foreground'
                    }`}>
                      {message.content}
                    </p>
                    <p className={`text-xs mt-1 ${
                      message.isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="relative z-20 glass-card-strong rounded-none border-b-0 border-x-0 px-4 py-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-3">
          <Input
            ref={inputRef}
            placeholder="Say something..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 h-12 text-base glass-card border-white/30 focus:border-primary/50"
            maxLength={500}
            disabled={isSending}
          />
          <Button 
            type="submit" 
            variant="sky" 
            size="icon" 
            className="h-12 w-12"
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </footer>
    </div>
  );
};

export default ChatRoomScreen;
