import { useState, useEffect } from 'react';
import performanceMonitor from '@/lib/performanceMonitor';
import { PerformanceMetric, PerformanceAlert, PerformanceReport } from '@/types/performance';

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [currentVitals, setCurrentVitals] = useState(performanceMonitor.getCurrentVitals());
  const [report, setReport] = useState<PerformanceReport | null>(null);

  useEffect(() => {
    // Initial load
    setMetrics(performanceMonitor.getMetrics());
    setAlerts(performanceMonitor.getAlerts());
    setReport(performanceMonitor.generateReport());

    // Update periodically
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
      setAlerts(performanceMonitor.getAlerts());
      setCurrentVitals(performanceMonitor.getCurrentVitals());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const recordCustomMetric = (name: string, value: number, unit?: string) => {
    performanceMonitor.recordCustomMetric(name, value, unit);
    setMetrics(performanceMonitor.getMetrics());
  };

  const generateNewReport = () => {
    const newReport = performanceMonitor.generateReport();
    setReport(newReport);
    return newReport;
  };

  const clearData = () => {
    performanceMonitor.clearAllData();
    setMetrics([]);
    setAlerts([]);
    setReport(null);
  };

  return {
    metrics,
    alerts,
    currentVitals,
    report,
    recordCustomMetric,
    generateNewReport,
    clearData,
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getAlerts: performanceMonitor.getAlerts.bind(performanceMonitor),
  };
}