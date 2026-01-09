import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    startContent?: React.ReactNode;
    endContent?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className, id, startContent, endContent, ...props }, ref) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-text-primary mb-2"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {startContent && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary z-10 pointer-events-none">
                            {startContent}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            'w-full h-12 rounded-lg',
                            'bg-bg-hover border border-border',
                            'text-text-primary placeholder:text-text-tertiary',
                            'transition-all duration-200',
                            'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            startContent ? 'pl-10 pr-4' : 'px-4',
                            endContent ? 'pr-10' : '',
                            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                            className
                        )}
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
                        {...props}
                    />
                    {endContent && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary z-10">
                            {endContent}
                        </div>
                    )}
                </div>
                {error && (
                    <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-400" role="alert">
                        {error}
                    </p>
                )}
                {helperText && !error && (
                    <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-text-tertiary">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
