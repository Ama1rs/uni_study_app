import React from 'react';

interface FeaturePulseProps {
  children: React.ReactNode;
  isNew?: boolean;
}

export function FeaturePulse({ children, isNew = false }: FeaturePulseProps) {
  return (
    <div className={`relative ${isNew ? 'animate-feature-pulse' : ''}`}>
      {children}
      {isNew && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse"></div>
      )}
    </div>
  );
}