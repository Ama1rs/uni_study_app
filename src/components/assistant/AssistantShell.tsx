import React from 'react';

interface AssistantShellProps {
  children: React.ReactNode;
  isThinking?: boolean;
}

export function AssistantShell({ children, isThinking = false }: AssistantShellProps) {
  return (
    <div 
      className="w-full h-full flex flex-col bg-bg-primary overflow-hidden font-sans subtle-gradient-accent"
      data-state={isThinking ? "thinking" : "idle"}
    >
      <div className="p-4 bg-bg-surface/40 subtle-gradient-accent border-b border-border">
        <h1 className="text-lg font-bold text-text-primary">AI Assistant</h1>
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}