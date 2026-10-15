import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudBackground } from '@/components/CloudBackground';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Sparkles, MapPin } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { useGroups } from '@/hooks/useGroups';

const CreateGroupScreen: React.FC = () => {
  const navigate = useNavigate();
  const { session, isLoading: sessionLoading } = useSession();
  const { createGroup } = useGroups(session?.latitude ?? null, session?.longitude ?? null);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no session after loading
  React.useEffect(() => {
    if (!sessionLoading && !session) {
      navigate('/onboarding');
    }
  }, [session, sessionLoading, navigate]);

  const handleCreate = async () => {
    if (!groupName.trim() || !session) return;
    if (session.latitude === null || session.longitude === null) {
      setError('Your location is unavailable. Please start a new session and allow location access.');
      return;
    }

    setIsCreating(true);
    setError(null);
    
    try {
      const newGroup = await createGroup(
        groupName.trim(),
        session.sessionId,
        session.latitude,
        session.longitude
      );
      
      sessionStorage.setItem('nearbyChat_currentGroup', newGroup.id);
      sessionStorage.setItem('nearbyChat_currentGroupName', newGroup.name);
      
      navigate(`/chat/${newGroup.id}`);
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err instanceof Error ? err.message : 'Failed to create group. Please try again.');
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    navigate('/groups');
  };

  const suggestions = [
    'Morning Chit-Chat ☁️',
    'Local Hangout 🌳',
    'Coffee Break ☕',
    'Night Owls 🌙',
  ];

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
    <div className="min-h-screen relative overflow-hidden">
      <CloudBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 glass-card-strong rounded-none border-t-0 border-x-0 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-foreground">Create New Chat</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 flex items-center justify-center">
          <div className="w-full max-w-md">
            <GlassCard variant="strong">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl button-gradient flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-foreground text-center mb-2">
                Start a New Chat
              </h2>
              <p className="text-muted-foreground text-center mb-6">
                Others within 5 km will be able to join
              </p>

              {/* Location indicator */}
              <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Your current location will be used</span>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
                  {error}
                </div>
              )}

              {/* Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Chat Name
                  </label>
                  <Input
                    placeholder="Give your chat a name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="h-12 text-base glass-card border-white/30 focus:border-primary/50"
                    maxLength={50}
                  />
                </div>

                {/* Suggestions */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Quick ideas:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setGroupName(suggestion)}
                        className="px-3 py-1.5 text-sm rounded-full bg-white/50 hover:bg-white/80 text-foreground transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <Button
                variant="sky"
                size="xl"
                className="w-full mt-8"
                onClick={handleCreate}
                disabled={!groupName.trim() || isCreating}
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  'Create & Enter Chat'
                )}
              </Button>
            </GlassCard>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateGroupScreen;
