import React from 'react';

interface ChatBubbleProps {
  children: React.ReactNode;
  isAI?: boolean;
  isThinking?: boolean;
}

export function ChatBubble({ children, isAI = false, isThinking = false }: ChatBubbleProps) {
  return (
    <div 
      className={`p-4 max-w-md ${isAI ? 'bg-accent/10 ml-auto' : 'bg-bg-surface mr-auto'} border border-border`}
      style={{ 
        borderRadius: 'var(--ui-radius-lg)', 
        boxShadow: 'var(--elevation-1)',
        background: isAI && isThinking ? 'linear-gradient(90deg, var(--brand-gradient-start), var(--brand-gradient-end))' : undefined
      }}
    >
      {children}
    </div>
  );
}