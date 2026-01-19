import { CoreWebVitals, PerformanceMetric, PerformanceAlert, PerformanceReport, PerformanceThresholds } from '@/types/performance';
import logger from '@/lib/logger';

class PerformanceMonitor {
  private observers: PerformanceObserver[] = [];
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    inp: { good: 200, poor: 500 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
  };

  constructor() {
    this.initializeObservers();
    this.loadStoredMetrics();
    this.startPeriodicCleanup();
  }

  private initializeObservers() {
    try {
      // Largest Contentful Paint (LCP)
      this.observeMetric('largest-contentful-paint', (entries) => {
        const entriesArray = Array.from(entries.getEntries());
        const lastEntry = entriesArray[entriesArray.length - 1];
        this.recordMetric('lcp', lastEntry.startTime, this.getRating('lcp', lastEntry.startTime));
      });

      // First Input Delay (FID)  
      this.observeMetric('first-input', (entries) => {
        const firstEntry = entries.getEntries()[0] as any;
        const processingStart = firstEntry.processingStart - firstEntry.startTime;
        this.recordMetric('fid', processingStart, this.getRating('fid', processingStart));
      });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      this.observeMetric('layout-shift', (entries) => {
        for (const entry of entries.getEntries()) {
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }
        this.recordMetric('cls', clsValue, this.getRating('cls', clsValue));
      });

      // Interaction to Next Paint (INP)
      let inpEntries: PerformanceEntry[] = [];
      this.observeMetric('event', (entries) => {
        inpEntries = inpEntries.concat(Array.from(entries.getEntries()));
        // Keep only the slowest interactions
        inpEntries.sort((a, b) => b.duration - a.duration);
        inpEntries = inpEntries.slice(0, 10);
        
        if (inpEntries.length > 0) {
          this.recordMetric('inp', inpEntries[0].duration, this.getRating('inp', inpEntries[0].duration));
        }
      });

      // First Contentful Paint (FCP)
      this.observeMetric('paint', (entries) => {
        const entriesArray = Array.from(entries.getEntries());
        const fcpEntry = entriesArray.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.recordMetric('fcp', fcpEntry.startTime, this.getRating('fcp', fcpEntry.startTime));
        }
      });

      logger.info('Performance observers initialized');
    } catch (error) {
      logger.error('Failed to initialize performance observers:', error);
    }
  }

  private observeMetric(type: string, callback: (entries: PerformanceObserverEntryList) => void) {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(callback);
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (error) {
      logger.warn(`Failed to observe ${type}:`, error);
    }
  }

  private recordMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') {
    const metric: PerformanceMetric = {
      id: `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'web-vital',
      name,
      value: Math.round(value * 100) / 100, // Round to 2 decimal places
      rating,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.metrics.push(metric);
    this.checkForAlerts(metric);
    this.saveMetrics();
    
    logger.debug(`Performance metric recorded: ${name}=${value} (${rating})`);
  }

  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = this.thresholds[metricName as keyof PerformanceThresholds];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private checkForAlerts(metric: PerformanceMetric) {
    const threshold = this.thresholds[metric.name as keyof PerformanceThresholds];
    if (!threshold || metric.rating === 'good') return;

    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      metric: metric.name,
      threshold: threshold.poor,
      actualValue: metric.value,
      severity: metric.rating === 'poor' ? 'error' : 'warning',
      message: `${metric.name.toUpperCase()} is ${metric.rating}: ${metric.value}ms (threshold: ${threshold.poor}ms)`,
    };

    this.alerts.push(alert);
    this.notifyAlert(alert);
  }

  private notifyAlert(alert: PerformanceAlert) {
    // Store alert for dashboard
    if (alert.severity === 'error') {
      logger.error('Performance alert:', alert.message);
    } else {
      logger.warn('Performance warning:', alert.message);
    }

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  public getCurrentVitals(): CoreWebVitals {
    const latestMetrics = this.getLatestMetrics();
    return {
      lcp: latestMetrics.lcp?.value || 0,
      fid: latestMetrics.fid?.value || 0,
      cls: latestMetrics.cls?.value || 0,
      inp: latestMetrics.inp?.value || 0,
      fcp: latestMetrics.fcp?.value || 0,
      ttfb: this.getTTFB(),
    };
  }

  private getTTFB(): number {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      return navigation.responseStart - navigation.requestStart;
    }
    return 0;
  }

  private getLatestMetrics() {
    const latest: Record<string, PerformanceMetric> = {};
    
    this.metrics.forEach(metric => {
      if (!latest[metric.name] || metric.timestamp > latest[metric.name].timestamp) {
        latest[metric.name] = metric;
      }
    });
    
    return latest;
  }

  public getMetrics(timeRange?: number): PerformanceMetric[] {
    if (!timeRange) return this.metrics;
    
    const cutoff = Date.now() - timeRange;
    return this.metrics.filter(metric => metric.timestamp >= cutoff);
  }

  public getAlerts(timeRange?: number): PerformanceAlert[] {
    if (!timeRange) return this.alerts;
    
    const cutoff = Date.now() - timeRange;
    return this.alerts.filter(alert => alert.timestamp >= cutoff);
  }

  public generateReport(): PerformanceReport {
    const vitals = this.getCurrentVitals();
    const customMetrics = this.metrics.filter(m => m.type === 'custom-metric');
    const recentAlerts = this.getAlerts(24 * 60 * 60 * 1000); // Last 24 hours

    return {
      timestamp: Date.now(),
      vitals,
      customMetrics,
      alerts: recentAlerts,
      deviceInfo: this.getDeviceInfo(),
    };
  }

  private getDeviceInfo() {
    return {
      memory: (navigator as any).deviceMemory,
      cores: navigator.hardwareConcurrency,
      connection: (navigator as any).connection?.effectiveType,
    };
  }

  public recordCustomMetric(name: string, value: number, unit = 'ms') {
    const metric: PerformanceMetric = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'custom-metric',
      name: `${name} (${unit})`,
      value,
      rating: 'good', // Custom metrics don't have ratings by default
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.metrics.push(metric);
    this.saveMetrics();
    logger.debug(`Custom metric recorded: ${name}=${value}${unit}`);
  }

  private saveMetrics() {
    try {
      const data = {
        metrics: this.metrics.slice(-1000), // Keep last 1000 metrics
        alerts: this.alerts.slice(-50), // Keep last 50 alerts
      };
      localStorage.setItem('performance-data', JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to save performance data:', error);
    }
  }

  private loadStoredMetrics() {
    try {
      const stored = localStorage.getItem('performance-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = data.metrics || [];
        this.alerts = data.alerts || [];
      }
    } catch (error) {
      logger.warn('Failed to load stored performance data:', error);
    }
  }

  private startPeriodicCleanup() {
    // Clean up old data every hour
    setInterval(() => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.metrics = this.metrics.filter(m => m.timestamp > weekAgo);
      this.alerts = this.alerts.filter(a => a.timestamp > weekAgo);
      this.saveMetrics();
    }, 60 * 60 * 1000);
  }

  public clearAllData() {
    this.metrics = [];
    this.alerts = [];
    localStorage.removeItem('performance-data');
    logger.info('Performance data cleared');
  }

  public destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.saveMetrics();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;