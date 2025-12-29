import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudBackground } from '@/components/CloudBackground';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Plus, MessageCircle, Cloud, Globe } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { useGroups } from '@/hooks/useGroups';
import { useActiveUsers } from '@/hooks/useActiveUsers';

const GroupsDiscoveryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { session, isLoading: sessionLoading, updateSessionGroup, heartbeat } = useSession();
  const { groups, isLoading: groupsLoading } = useGroups(session?.latitude ?? null, session?.longitude ?? null);
  const { totalActiveUsers } = useActiveUsers();

  useEffect(() => {
    // Wait for session to load before checking
    if (sessionLoading) return;
    
    // Redirect to onboarding if no session
    if (!session) {
      navigate('/onboarding');
      return;
    }

    // Clear any previous group association
    updateSessionGroup(null);

    // Heartbeat every 20 seconds for more accurate online count
    const interval = setInterval(heartbeat, 20000);
    
    // Initial heartbeat
    heartbeat();
    
    return () => clearInterval(interval);
  }, [session, sessionLoading, navigate, updateSessionGroup, heartbeat]);

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    await updateSessionGroup(groupId);
    sessionStorage.setItem('nearbyChat_currentGroup', groupId);
    sessionStorage.setItem('nearbyChat_currentGroupName', groupName);
    navigate(`/chat/${groupId}`);
  };

  const handleCreateGroup = () => {
    navigate('/create-group');
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
    <div className="min-h-screen relative overflow-hidden">
      <CloudBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 glass-card-strong rounded-none border-t-0 border-x-0 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl button-gradient flex items-center justify-center shadow-md">
                <Cloud className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">NearbyChat</h1>
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {session.username}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Live user counter with pulsing indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/50 text-accent-foreground text-sm">
                <div className="relative">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <span className="font-semibold">{totalActiveUsers}</span>
                <span className="text-muted-foreground hidden sm:inline">online</span>
              </div>
              
              <Button variant="sky" size="sm" onClick={handleCreateGroup}>
                <Plus className="w-4 h-4" />
                New
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6">
          <div className="max-w-lg mx-auto">
            {/* Section Title */}
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">
                Chats Within 5 km
              </h2>
            </div>

            {groupsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <GlassCard key={i} className="p-4 animate-pulse" animate={false}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                      </div>
                      <div className="h-9 w-20 bg-muted rounded-full" />
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map((group, index) => (
                  <GlassCard 
                    key={group.id} 
                    className="p-4 animate-fade-in-up"
                    animate={false}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate mb-1">
                          {group.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {group.distance?.toFixed(1)} km
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="relative">
                              <Users className="w-3.5 h-3.5" />
                              {(group.activeUsers || 0) > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                              )}
                            </div>
                            {group.activeUsers || 0} active
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="glassPrimary" 
                        size="sm"
                        onClick={() => handleJoinGroup(group.id, group.name)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Join
                      </Button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              /* Empty State */
              <GlassCard variant="strong" className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  No chats nearby
                </h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to start a conversation!
                </p>
                <Button variant="sky" onClick={handleCreateGroup}>
                  <Plus className="w-5 h-5" />
                  Start a Chat
                </Button>
              </GlassCard>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default GroupsDiscoveryScreen;
