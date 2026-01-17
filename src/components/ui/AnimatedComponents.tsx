import { ReactNode } from 'react';
import { motion, MotionProps } from 'framer-motion';

interface AnimatedCardProps extends MotionProps {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}

/**
 * Animated Card Component
 * Provides consistent hover and tap animations for cards
 */
export function AnimatedCard({ 
  children, 
  className = '', 
  ...props 
}: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated Button Component
 * Provides consistent button animations
 */
export function AnimatedButton({ 
  children, 
  className = '', 
  ...props 
}: AnimatedCardProps) {
  return (
    <motion.button
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Animated Modal Backdrop
 */
export function AnimatedBackdrop({ 
  children, 
  onClose,
  className = '',
}: {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * Animated Container for Lists
 * Stagger children animations
 */
export function AnimatedContainer({ 
  children, 
  className = '',
  stagger = 0.05,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: stagger,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated Item for Lists
 */
export function AnimatedItem({ 
  children, 
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
