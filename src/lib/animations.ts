/**
 * Animation presets for subtle, performant animations
 * Using Framer Motion
 */

export const animations = {
  // Fade in
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" },
  },

  // Fade in with slight scale
  fadeInScale: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Slide in from left
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Slide in from right
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Slide in from top
  slideInTop: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Slide in from bottom
  slideInBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Container stagger for list items
  containerStagger: {
    initial: "hidden",
    animate: "visible",
    exit: "hidden",
    variants: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05,
          delayChildren: 0.1,
        },
      },
    },
  },

  // Item animation for lists
  itemStagger: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 },
  },

  // Hover elevation for cards
  cardHover: {
    initial: { y: 0 },
    whileHover: { y: -4 },
    transition: { duration: 0.2, ease: "easeOut" },
  },

  // Subtle rotation for interactive elements
  rotationHover: {
    initial: { rotate: 0 },
    whileHover: { rotate: 2 },
    transition: { duration: 0.2 },
  },

  // Button press animation
  buttonPress: {
    initial: { scale: 1 },
    whileTap: { scale: 0.95 },
    transition: { duration: 0.1 },
  },

  // Loading pulse
  pulse: {
    initial: { opacity: 0.6 },
    animate: { opacity: 1 },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      repeatType: "reverse" as const,
    },
  },

  // Gentle float animation
  float: {
    animate: { y: [0, -8, 0] },
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: "loop" as const,
    },
  },

  // Backdrop fade
  backdropFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },

  // Modal scale and fade
  modalScale: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Sidebar slide
  sidebarSlide: {
    initial: { x: -300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 },
    transition: { duration: 0.3, ease: "easeOut" },
  },

  // Smooth page transition
  pageTransition: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25, ease: "easeInOut" },
  },

  // Bounce animation
  bounce: {
    animate: { y: [0, -10, 0] },
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: "loop" as const,
    },
  },
};

// Stagger container and item pattern
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};
