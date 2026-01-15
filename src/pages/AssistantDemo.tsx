import { useState, useEffect } from 'react';
import { AssistantShell, AssistantAvatar, ChatBubble, VoiceRipple, FeaturePulse } from '@/components/assistant';

export function AssistantDemo() {
  const [state, setState] = useState<'listening' | 'thinking' | 'responding' | 'idle'>('idle');
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    const sequence = async () => {
      setState('listening');
      setAmplitude(0.5);
      await new Promise(r => setTimeout(r, 2000));
      setState('thinking');
      setAmplitude(0);
      await new Promise(r => setTimeout(r, 3000));
      setState('responding');
      await new Promise(r => setTimeout(r, 2000));
      setState('idle');
    };
    sequence();
  }, []);

  return (
    <AssistantShell isThinking={state === 'thinking'}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <AssistantAvatar state={state} />
          <VoiceRipple isActive={state === 'listening'} amplitude={amplitude} />
        </div>
        
        <ChatBubble isAI={false}>
          Hello, how can I help with your finances?
        </ChatBubble>
        
        {state === 'thinking' && (
          <ChatBubble isAI isThinking>
            Analyzing your spending patterns...
          </ChatBubble>
        )}
        
        {state === 'responding' && (
          <ChatBubble isAI>
            Based on your data, you could save $200/month by reducing dining out.
          </ChatBubble>
        )}
        
        <FeaturePulse isNew>
          <button className="p-2 bg-accent text-white rounded" style={{ borderRadius: 'var(--ui-radius-md)' }}>
            New Feature
          </button>
        </FeaturePulse>
      </div>
    </AssistantShell>
  );
}