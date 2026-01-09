import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'flat' | 'interactive' | 'ghost';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ variant = 'default', padding = 'md', className, ...props }: CardProps) {
    const variants = {
        // Standard card on top of a surface
        default: 'bg-bg-card border border-border',

        // Flat container, usually for sections
        flat: 'bg-bg-surface border border-border/60',

        // Interactive items (like list rows that act as cards)
        interactive: 'bg-bg-card border border-border/50 hover:border-accent/40 cursor-pointer transition-all duration-200 group',

        // Minimal, mostly for hover states
        ghost: 'bg-transparent border border-transparent hover:bg-bg-hover transition-colors',
    };

    const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-4', // Standardized to 16px (rem-based usually, but keeping simple)
        lg: 'p-6',
    };

    return (
        <div
            className={cn(
                "rounded-xl overflow-hidden",
                variants[variant],
                paddings[padding],
                className
            )}
            {...props}
        />
    );
}
