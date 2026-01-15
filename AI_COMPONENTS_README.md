# AI Assistant Component Library

This library provides React components for building intuitive and trustworthy AI assistant interfaces, following Google-inspired design principles with fluid gradients and motion.

## Design Principles

- **Intuitive Interactions**: Rounded geometries, subtle gradients, and approachable aesthetics.
- **AI Process Visualization**: Gradients and motion to indicate listening, thinking, and responding states.
- **Google Aesthetics**: Continuity with rounded corners, 4-color references, and soft illustrations.
- **Accessibility**: Respects `prefers-reduced-motion`, WCAG contrast, and keyboard navigation.

## Components

### `<AssistantShell />`
Main container with header and gradient accent.

```tsx
<AssistantShell isThinking={true}>
  {/* content */}
</AssistantShell>
```

### `<AssistantAvatar />`
Circular avatar with state-based animations.

```tsx
<AssistantAvatar state="thinking" />
```

States: `'listening' | 'thinking' | 'responding' | 'idle'`

### `<ChatBubble />`
Rounded chat bubble with elevation.

```tsx
<ChatBubble isAI={true} isThinking={false}>
  Hello!
</ChatBubble>
```

### `<VoiceRipple />`
Concentric ripples for voice input.

```tsx
<VoiceRipple isActive={true} amplitude={0.8} />
```

### `<FeaturePulse />`
Pulse animation for new features.

```tsx
<FeaturePulse isNew={true}>
  <button>New Feature</button>
</FeaturePulse>
```

## Design Tokens

Located in `src/styles/design-tokens.css`:

- `--brand-gradient-start`: Concentrated leading edge
- `--brand-gradient-end`: Diffused tail
- `--ui-radius-sm/md/lg`: Border radii
- `--elevation-1`: Shadow
- `--motion-duration-*`: Animation timings

## Example Usage

See `src/pages/AssistantDemo.tsx` for a complete example showcasing the listening → thinking → response sequence.

## Animation Rules

- Clear start/end states, cancellable on interaction.
- Directional flow toward focus points.
- Anticipation then release timing.
- Intensity restricted for accessibility.