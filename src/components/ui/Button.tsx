import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon';
  size?: 'default' | 'compact' | 'large';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', loading = false, className, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible-ring disabled:opacity-50 disabled:cursor-not-allowed touch-target active:scale-95';

    const variantStyles = {
      primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-hover/90 shadow-button hover:shadow-md border border-transparent',
      secondary: 'border border-border bg-transparent text-text-primary hover:bg-bg-hover active:bg-bg-active hover:border-text-tertiary',
      ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover/50 active:bg-bg-active',
      destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm border border-transparent',
      icon: 'bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary active:bg-bg-active'
    };

    const sizeStyles = {
      compact: 'h-9 px-4 text-sm gap-2',
      default: 'h-10 px-6 text-sm gap-2',
      large: 'h-12 px-8 text-base gap-3'
    };



    const iconSizeStyles = {
      compact: 'h-9 w-9',
      default: 'h-10 w-10',
      large: 'h-12 w-12'
    };

    const finalClassName = cn(
      baseStyles,
      variantStyles[variant],
      variant === 'icon' ? iconSizeStyles[size] : sizeStyles[size],
      variant === 'primary' && size === 'default' && 'px-8', // Extra padding for primary default
      variant === 'primary' && size === 'large' && 'px-10', // Extra padding for primary large
      'rounded-lg',
      className
    );

    return (
      <button
        ref={ref}
        className={finalClassName}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" size={18} />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
