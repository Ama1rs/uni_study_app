/**
 * Repository Component Animation Reference
 * 
 * All components in RepositoryView use Framer Motion for smooth, tasteful animations
 */

/**
 * HEADER ANIMATIONS
 * - Title dot: Pulsing glow effect (scales and fades)
 * - Back button: Scale + slide left on hover
 * - View toggle buttons: Scale on hover/tap
 * - Settings icon: 90° rotation on hover
 */

/**
 * TOOLBAR ANIMATIONS  
 * - Search input: Fade in + scale
 * - Filter button: Badge count pulses with scale animation
 * - Template button: Fade in with stagger delay
 * - Import button: Glow effect on hover with cyan shadow
 */

/**
 * LIST VIEW ANIMATIONS
 * - Container: Staggered item animation (50ms delays)
 * - Each card: 
 *   - Fade in + slide up on mount
 *   - Scale + elevation on hover (-8px translate)
 *   - Icon scales and rotates on hover (1.2x, 5°)
 *   - Type badge scales on hover
 * - Action buttons (Edit/Delete): Fade in on card hover
 * - Empty state: Centered glass card with button stagger
 */

/**
 * MODAL ANIMATIONS
 * All modals use consistent animation pattern:
 * - Backdrop: Fade in (200ms)
 * - Content: Scale + fade + slide up (300ms)
 *   - Initial: opacity 0, scale 0.95, y: 20
 *   - Animate: opacity 1, scale 1, y: 0
 * - Exit: Reverse animation
 * 
 * TEMPLATES MODAL:
 * - Title: Fade in + slide down (delay 100ms)
 * - Template cards: Staggered fade in + scale (50ms between each)
 * - Each card scales + border animates on hover
 * - Cancel button: Fade in with delay
 * 
 * ADD NOTE MODAL:
 * - Title & dropdown: Fade in + slide down (delay 100ms)
 * - Description text: Fade in (delay 150ms)
 * - Textarea: Fade in + slide up (delay 200ms)
 * - Buttons: Fade in + slide up (delay 250ms)
 * - Process button: Glow effect on hover with cyan shadow
 * 
 * PREVIEW MODAL:
 * - Larger scale animation (0.9 to 1)
 * - Header: Fade in + slide down (delay 100ms)
 * - Close button: Rotate 90° on hover
 * - Preview content: Fade in (delay 200ms)
 * - Image preview: Additional scale animation (0.9 to 1)
 * - Buttons: Fade in (delay 250-300ms)
 * - Open buttons: Scale on hover
 */

/**
 * ANIMATION TIMING
 * - Standard fade: 300ms
 * - View transitions: 200ms
 * - Modal entrance: 300ms
 * - Modal exit: 200ms
 * - Stagger delay: 50ms between children
 * - Hover interactions: 200-300ms
 * - Tap interactions: 100-150ms
 */

/**
 * EASING FUNCTIONS
 * - Entrances: easeOut (cubic-bezier(0.2, 0.9, 0.2, 1))
 * - Exits: easeInOut
 * - Hovers: linear
 * - Tap feedback: default (cubic)
 */

/**
 * HOVER EFFECTS
 * - Cards: y -8px, scale 1.02
 * - Buttons: scale 1.05
 * - Icons: scale 1.2, rotate 5°
 * - Badges: scale 1.1
 * - Settings: rotate 90°
 */

/**
 * COLOR ANIMATIONS
 * - Accent button glow: cyan shadow on hover
 * - Pulsing dot: opacity [0.8, 1, 0.8]
 * - Border transitions: smooth color interpolation
 */

export const ANIMATION_DURATIONS = {
  FAST: 0.15,
  QUICK: 0.2,
  STANDARD: 0.3,
  SLOW: 0.5,
  STAGGER: 0.05,
};

export const ANIMATION_DELAYS = {
  IMMEDIATE: 0,
  SHORT: 0.05,
  MEDIUM: 0.1,
  LONG: 0.15,
  EXTRA_LONG: 0.25,
};
