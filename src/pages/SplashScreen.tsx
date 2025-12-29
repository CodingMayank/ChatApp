import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudBackground } from '@/components/CloudBackground';
import { GlassCard } from '@/components/GlassCard';
import { MessageCircle, Cloud } from 'lucide-react';

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/onboarding');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <CloudBackground />
      
      <div className="relative z-10 flex flex-col items-center px-4">
        <GlassCard className="text-center max-w-sm" variant="strong">
          {/* Logo */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 button-gradient rounded-2xl rotate-3 opacity-80" />
            <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center shadow-lg">
              <div className="relative">
                <Cloud className="w-10 h-10 text-primary absolute -top-1 -left-1 opacity-60" />
                <MessageCircle className="w-8 h-8 text-primary relative z-10" />
              </div>
            </div>
          </div>

          {/* App Name */}
          <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
            NearbyChat
          </h1>

          {/* Tagline */}
          <p className="text-muted-foreground text-lg leading-relaxed">
            Talk freely. Stay anonymous.
            <br />
            <span className="text-primary font-medium">Nearby only.</span>
          </p>

          {/* Loading indicator */}
          <div className="mt-8 flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft animation-delay-100" />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft animation-delay-200" />
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default SplashScreen;
