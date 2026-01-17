// import React from 'react'; // Not needed for new JSX transform
import { motion } from 'framer-motion';
import { Button } from './Button';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <motion.div
            className={cn("flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px]", className)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            {Icon && (
                <div className="mb-6 p-4 rounded-2xl bg-bg-surface border border-border">
                    <Icon className="w-8 h-8 text-text-tertiary" />
                </div>
            )}
            <h3 className="text-lg font-semibold text-text-primary mb-2">
                {title}
            </h3>
            <p className="text-text-secondary max-w-sm mb-8 leading-relaxed text-sm">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="primary">
                    {actionLabel}
                </Button>
            )}
        </motion.div>
    );
}
