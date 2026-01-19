export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms) 
  cls: number; // Cumulative Layout Shift
  inp: number; // Interaction to Next Paint (ms)
  fcp: number; // First Contentful Paint (ms)
  ttfb: number; // Time to First Byte (ms)
}

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'web-vital' | 'custom-metric';
  name: string;
  value: number;
  unit?: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  url: string;
  userAgent: string;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  metric: string;
  threshold: number;
  actualValue: number;
  severity: 'warning' | 'error';
  message: string;
}

export interface PerformanceReport {
  timestamp: number;
  vitals: CoreWebVitals;
  customMetrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
  deviceInfo: {
    memory?: number;
    cores?: number;
    connection?: string;
  };
}

export interface PerformanceThresholds {
  lcp: { good: number; poor: number };
  fid: { good: number; poor: number };
  cls: { good: number; poor: number };
  inp: { good: number; poor: number };
  fcp: { good: number; poor: number };
  ttfb: { good: number; poor: number };
}