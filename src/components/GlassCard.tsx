import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'strong';
  animate?: boolean;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '',
  variant = 'default',
  animate = true,
  style
}) => {
  return (
    <div 
      className={cn(
        variant === 'strong' ? 'glass-card-strong' : 'glass-card',
        'rounded-3xl p-6',
        animate && 'animate-scale-in',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
};
