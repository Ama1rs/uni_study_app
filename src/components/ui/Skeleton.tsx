import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ 
  className, 
  variant = 'text', 
  width, 
  height, 
  lines = 1 
}: SkeletonProps) {
  if (variant === 'circular') {
    return (
      <div
        className={cn(
          'animate-pulse rounded-full bg-gray-200 dark:bg-gray-700',
          className
        )}
        style={{ width, height }}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn(
          'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
          className
        )}
        style={{ width, height }}
      />
    );
  }

  // Text variant (default)
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse rounded bg-gray-200 dark:bg-gray-700',
            i === lines - 1 && width ? 'w-3/4' : 'w-full'
          )}
          style={{ height: height || '1rem' }}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700',
      className
    )}>
      <Skeleton variant="circular" width={40} height={40} className="mb-4" />
      <Skeleton lines={2} className="mb-2" />
      <Skeleton width="60%" className="mb-4" />
      <div className="flex space-x-2">
        <Skeleton width={80} height={32} />
        <Skeleton width={80} height={32} />
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex space-x-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={100} height={20} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 p-4 border-t border-gray-200 dark:border-gray-700">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} width={80} height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}