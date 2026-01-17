interface AssistantAvatarProps {
  state: 'listening' | 'thinking' | 'responding' | 'idle';
}

export function AssistantAvatar({ state }: AssistantAvatarProps) {
  const getAnimationClass = () => {
    switch (state) {
      case 'listening':
        return 'animate-radial-ripple';
      case 'thinking':
        return 'animate-kinetic-motion';
      case 'responding':
        return 'animate-gradient-sweep';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`w-12 h-12 rounded-full border-2 border-accent/20 flex items-center justify-center bg-accent/10 ${getAnimationClass()}`}
      style={{ borderRadius: 'var(--ui-radius-lg)' }}
    >
      <div className="w-3 h-3 bg-accent rounded-full"></div>
    </div>
  );
}