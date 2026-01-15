interface VoiceRippleProps {
  isActive?: boolean;
  amplitude?: number; // 0-1
}

export function VoiceRipple({ isActive = false, amplitude = 0 }: VoiceRippleProps) {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      {isActive && (
        <>
          <div 
            className="absolute w-full h-full rounded-full border-2 border-accent animate-radial-ripple"
            style={{ opacity: amplitude }}
          ></div>
          <div 
            className="absolute w-3/4 h-3/4 rounded-full border border-accent/50 animate-radial-ripple"
            style={{ animationDelay: '0.2s', opacity: amplitude * 0.7 }}
          ></div>
          <div 
            className="absolute w-1/2 h-1/2 rounded-full border border-accent/30 animate-radial-ripple"
            style={{ animationDelay: '0.4s', opacity: amplitude * 0.5 }}
          ></div>
        </>
      )}
      <div className="w-4 h-4 bg-accent rounded-full"></div>
    </div>
  );
}