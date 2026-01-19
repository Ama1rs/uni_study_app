import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import performanceMonitor from '@/lib/performanceMonitor';

describe('Performance Monitor', () => {
  beforeEach(() => {
    performanceMonitor.clearAllData();
  });

  afterEach(() => {
    performanceMonitor.clearAllData();
  });

  it('should initialize without errors', () => {
    expect(performanceMonitor).toBeDefined();
  });

  it('should record custom metrics', () => {
    performanceMonitor.recordCustomMetric('test-metric', 100, 'ms');
    
    const metrics = performanceMonitor.getMetrics();
    const customMetric = metrics.find(m => m.name === 'test-metric (ms)');
    
    expect(customMetric).toBeDefined();
    expect(customMetric?.value).toBe(100);
    expect(customMetric?.type).toBe('custom-metric');
  });

  it('should generate performance report', () => {
    performanceMonitor.recordCustomMetric('test-metric', 100, 'ms');
    
    const report = performanceMonitor.generateReport();
    
    expect(report).toBeDefined();
    expect(report.timestamp).toBeDefined();
    expect(report.vitals).toBeDefined();
    expect(report.customMetrics).toBeDefined();
    expect(report.alerts).toBeDefined();
    expect(report.deviceInfo).toBeDefined();
  });

  it('should clear all data', () => {
    performanceMonitor.recordCustomMetric('test-metric', 100, 'ms');
    
    performanceMonitor.clearAllData();
    
    const metrics = performanceMonitor.getMetrics();
    const alerts = performanceMonitor.getAlerts();
    
    expect(metrics).toHaveLength(0);
    expect(alerts).toHaveLength(0);
  });

  it('should get current vitals', () => {
    const vitals = performanceMonitor.getCurrentVitals();
    
    expect(vitals).toBeDefined();
    expect(typeof vitals.lcp).toBe('number');
    expect(typeof vitals.fid).toBe('number');
    expect(typeof vitals.cls).toBe('number');
    expect(typeof vitals.inp).toBe('number');
    expect(typeof vitals.fcp).toBe('number');
    expect(typeof vitals.ttfb).toBe('number');
  });

  it('should filter metrics by time range', () => {
    performanceMonitor.recordCustomMetric('old-metric', 50, 'ms');
    
    // Simulate time passing using vi instead of jest
    vi.useFakeTimers();
    vi.advanceTimersByTime(60000); // 1 minute
    
    performanceMonitor.recordCustomMetric('new-metric', 100, 'ms');
    
    const recentMetrics = performanceMonitor.getMetrics(30000); // Last 30 seconds
    const recentMetric = recentMetrics.find(m => m.name === 'new-metric (ms)');
    const oldMetric = recentMetrics.find(m => m.name === 'old-metric (ms)');
    
    expect(recentMetric).toBeDefined();
    expect(oldMetric).toBeUndefined();
    
    vi.useRealTimers();
  });
});