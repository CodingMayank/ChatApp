import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudBackground } from '@/components/CloudBackground';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { ShieldCheck, MapPin, Trash2, Navigation } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { createSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [showDemoOption, setShowDemoOption] = useState(false);

  const features = [
    {
      icon: ShieldCheck,
      title: '100% Anonymous',
      description: 'No login. No profile. No tracking.',
    },
    {
      icon: MapPin,
      title: 'Nearby Public Chats Only',
      description: 'Join groups within 5 km radius.',
    },
    {
      icon: Trash2,
      title: 'Nothing Is Saved',
      description: 'Leave the app → chats disappear.',
    },
  ];

  const handleCreateSessionWithLocation = async (latitude: number, longitude: number) => {
    try {
      await createSession(latitude, longitude);
      navigate('/groups');
    } catch (err) {
      console.error('Session creation error:', err);
      setLoading(false);
      setShowDemoOption(true);
    }
  };

  const handleEnterChats = async () => {
    setLoading(true);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setShowDemoOption(true);
      setLoading(false);
      return;
    }

    // Request location permission directly
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await handleCreateSessionWithLocation(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      (err) => {
        console.error('Location error:', err.code, err.message);
        setShowDemoOption(true);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 600000,
      }
    );
  };

  const handleDemoMode = async () => {
    setLoading(true);
    // Demo location (San Francisco)
    await handleCreateSessionWithLocation(37.7749, -122.4194);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <CloudBackground />
      
      <div className="relative z-10 w-full max-w-md">
        <GlassCard variant="strong" className="text-center">
          {/* Header */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to NearbyChat
          </h2>
          <p className="text-muted-foreground mb-8">
            Connect with people around you
          </p>

          {/* Features */}
          <div className="space-y-4 mb-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="flex items-start gap-4 text-left p-4 rounded-2xl bg-white/40 backdrop-blur-sm animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl button-gradient flex items-center justify-center shadow-md">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button 
              variant="sky" 
              size="xl" 
              className="w-full"
              onClick={handleEnterChats}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Getting location...
                </div>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  Enter Nearby Chats
                </>
              )}
            </Button>

            {showDemoOption && (
              <Button 
                variant="glassPrimary" 
                size="lg" 
                className="w-full animate-fade-in-up"
                onClick={handleDemoMode}
                disabled={loading}
              >
                <Navigation className="w-5 h-5" />
                Use Demo Mode Instead
              </Button>
            )}
          </div>

          {showDemoOption && (
            <p className="text-xs text-muted-foreground mt-4 animate-fade-in-up">
              Location unavailable? Demo mode uses a sample location for testing.
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default OnboardingScreen;
