import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudBackground } from '@/components/CloudBackground';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { MapPin, X, Navigation } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

const LocationPermissionScreen: React.FC = () => {
  const navigate = useNavigate();
  const { createSession } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateSessionWithLocation = async (latitude: number, longitude: number) => {
    try {
      await createSession(latitude, longitude);
      navigate('/groups');
    } catch (err) {
      console.error('Session creation error:', err);
      setError('Failed to create session. Please try again.');
      setLoading(false);
    }
  };

  const handleAllowLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        setError('Location is not supported by your browser. Use demo mode instead.');
        setLoading(false);
        return;
      }

      // Request location permission
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await handleCreateSessionWithLocation(
            position.coords.latitude, 
            position.coords.longitude
          );
        },
        (err) => {
          console.error('Location error code:', err.code, 'message:', err.message);
          
          let errorMessage = 'Location access denied.';
          if (err.code === 1) {
            errorMessage = 'Location permission denied. Please enable location access or use demo mode.';
          } else if (err.code === 2) {
            errorMessage = 'Location unavailable. Please use demo mode to continue.';
          } else if (err.code === 3) {
            errorMessage = 'Location request timed out. Please try again or use demo mode.';
          }
          
          setError(errorMessage);
          setLoading(false);
        },
        {
          enableHighAccuracy: false, // Less strict for better compatibility
          timeout: 15000, // Longer timeout
          maximumAge: 600000, // 10 minutes cache
        }
      );
    } catch (err) {
      console.error('Geolocation exception:', err);
      setError('Something went wrong. Please use demo mode.');
      setLoading(false);
    }
  };

  // Demo mode with a simulated location (e.g., San Francisco)
  const handleDemoMode = async () => {
    setLoading(true);
    setError(null);
    
    // Use a default location for demo purposes
    const demoLatitude = 37.7749;
    const demoLongitude = -122.4194;
    
    await handleCreateSessionWithLocation(demoLatitude, demoLongitude);
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <CloudBackground />
      
      <div className="relative z-10 w-full max-w-sm">
        <GlassCard variant="strong" className="text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl button-gradient flex items-center justify-center shadow-lg">
            <MapPin className="w-8 h-8 text-primary-foreground" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-3">
            Enable Location
          </h2>

          {/* Description */}
          <p className="text-muted-foreground mb-6 leading-relaxed">
            We only use your location to show chats near you.
            <br />
            <span className="font-medium text-foreground">Nothing is stored.</span>
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            <Button 
              variant="sky" 
              size="lg" 
              className="w-full"
              onClick={handleAllowLocation}
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
                  Allow Location
                </>
              )}
            </Button>

            <Button 
              variant="glassPrimary" 
              size="lg" 
              className="w-full"
              onClick={handleDemoMode}
              disabled={loading}
            >
              <Navigation className="w-5 h-5" />
              Use Demo Mode
            </Button>
            
            <Button 
              variant="glass" 
              size="lg" 
              className="w-full"
              onClick={handleExit}
            >
              <X className="w-5 h-5" />
              Back
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Demo mode uses a sample location for testing
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default LocationPermissionScreen;
