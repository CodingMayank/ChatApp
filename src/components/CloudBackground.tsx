import React from 'react';

interface CloudProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Cloud: React.FC<CloudProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-24 h-12',
    md: 'w-40 h-20',
    lg: 'w-56 h-28',
    xl: 'w-72 h-36',
  };

  return (
    <div className={`absolute ${sizeClasses[size]} ${className}`}>
      <div className="relative w-full h-full">
        {/* Main cloud body */}
        <div className="absolute bottom-0 left-1/4 w-1/2 h-1/2 bg-white/80 rounded-full blur-sm" />
        <div className="absolute bottom-1/4 left-1/6 w-1/3 h-2/3 bg-white/70 rounded-full blur-sm" />
        <div className="absolute bottom-1/4 right-1/6 w-2/5 h-3/5 bg-white/75 rounded-full blur-sm" />
        <div className="absolute bottom-1/3 left-1/3 w-1/3 h-1/2 bg-white/85 rounded-full blur-sm" />
      </div>
    </div>
  );
};

export const CloudBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 sky-gradient overflow-hidden pointer-events-none">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/20" />
      
      {/* Floating clouds */}
      <Cloud 
        size="xl" 
        className="top-10 -left-10 animate-float-slow opacity-60" 
      />
      <Cloud 
        size="lg" 
        className="top-20 right-10 animate-float opacity-50" 
      />
      <Cloud 
        size="md" 
        className="top-40 left-1/4 animate-float-delay-1 opacity-40" 
      />
      <Cloud 
        size="sm" 
        className="top-32 right-1/3 animate-float-delay-2 opacity-45" 
      />
      <Cloud 
        size="lg" 
        className="bottom-40 -left-5 animate-float opacity-35" 
      />
      <Cloud 
        size="md" 
        className="bottom-20 right-20 animate-float-slow opacity-50" 
      />
      <Cloud 
        size="xl" 
        className="bottom-10 left-1/3 animate-float-delay-1 opacity-30" 
      />
      
      {/* Subtle light rays */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-white/10 to-transparent blur-3xl" />
      <div className="absolute top-0 right-1/4 w-1/3 h-1/3 bg-gradient-to-b from-primary/5 to-transparent blur-3xl" />
    </div>
  );
};
