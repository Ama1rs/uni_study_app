import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: "solid" | "outline";
    className?: string;
}

export function Badge({ children, variant = "solid", className = "" }: BadgeProps) {
    return (
        <span className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap",
            variant === "solid"
                ? "bg-accent/10 text-accent border border-accent/20 shadow-[0_0_10px_rgba(22,163,74,0.1)]"
                : "bg-white/5 border border-border text-text-tertiary",
            className
        )}>
            {children}
        </span>
    );
}
