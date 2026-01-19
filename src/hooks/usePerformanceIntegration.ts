import { useEffect } from 'react';
import performanceMonitor from '@/lib/performanceMonitor';
import logger from '@/lib/logger';

export function usePerformanceIntegration() {
  useEffect(() => {
    // Initialize performance monitoring
    try {
      logger.info('Initializing performance monitoring system');
      
      // Record app start timing
      if (performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        performanceMonitor.recordCustomMetric('app-load-time', loadTime, 'ms');
      }

      // Record custom performance metrics periodically
      const recordInterval = setInterval(() => {
        try {
          // Memory usage if available
          if ('memory' in performance) {
            const memory = (performance as any).memory;
            performanceMonitor.recordCustomMetric('memory-used', memory.usedJSHeapSize, 'bytes');
            performanceMonitor.recordCustomMetric('memory-total', memory.totalJSHeapSize, 'bytes');
            performanceMonitor.recordCustomMetric('memory-limit', memory.jsHeapSizeLimit, 'bytes');
          }

          // Network connection info if available
          if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            if (connection) {
              performanceMonitor.recordCustomMetric('connection-downlink', connection.downlink, 'Mbps');
              performanceMonitor.recordCustomMetric('connection-rtt', connection.rtt, 'ms');
            }
          }

          // Active page tracking
          performanceMonitor.recordCustomMetric('active-users', 1, 'count');
        } catch (error) {
          logger.warn('Failed to record custom performance metrics:', error);
        }
      }, 30000); // Every 30 seconds

      // Page visibility change tracking
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          performanceMonitor.recordCustomMetric('page-visible', Date.now(), 'timestamp');
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Cleanup
      return () => {
        clearInterval(recordInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } catch (error) {
      logger.error('Failed to initialize performance monitoring:', error);
    }
  }, []);

  // Record route changes
  useEffect(() => {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    const wrapHistoryMethod = (originalMethod: Function, methodName: string) => {
      return (...args: any[]) => {
        performanceMonitor.recordCustomMetric(`navigation-${methodName}`, Date.now(), 'timestamp');
        return originalMethod.apply(history, args);
      };
    };

    history.pushState = wrapHistoryMethod(originalPushState, 'push');
    history.replaceState = wrapHistoryMethod(originalReplaceState, 'replace');

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);
}