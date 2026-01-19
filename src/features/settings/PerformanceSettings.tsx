import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  Zap, 
  Database,
  Info,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export function PerformanceSettings() {
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [alertThresholds, setAlertThresholds] = useState({
    lcpWarning: 2500,
    lcpCritical: 4000,
    fidWarning: 100,
    fidCritical: 300,
    clsWarning: 0.1,
    clsCritical: 0.25,
    inpWarning: 200,
    inpCritical: 500,
  });

  const [dataRetention, setDataRetention] = useState(7); // days

  const handleThresholdChange = (metric: string, type: 'warning' | 'critical', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setAlertThresholds(prev => ({
        ...prev,
        [`${metric}${type.charAt(0).toUpperCase() + type.slice(1)}`]: numValue
      }));
    }
  };

  const handleClearPerformanceData = () => {
    if (window.confirm('Are you sure you want to clear all performance monitoring data? This cannot be undone.')) {
      // Implementation would call the performance monitor clear function
      console.log('Clearing performance data...');
    }
  };

  return (
    <div className="space-y-6 p-6" style={{ color: 'var(--text-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity size={20} />
            Performance Monitoring
          </h3>
          <p className="text-sm opacity-75 mt-1">
            Configure performance tracking and alert thresholds
          </p>
        </div>

        {/* Monitoring Toggle */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium flex items-center gap-2">
                <Zap size={16} />
                Performance Monitoring
              </div>
              <p className="text-sm opacity-75 mt-1">
                Track Core Web Vitals and custom metrics in real-time
              </p>
            </div>
            <button
              onClick={() => setMonitoringEnabled(!monitoringEnabled)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: monitoringEnabled ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              {monitoringEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <AlertTriangle size={16} />
            Alert Thresholds
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LCP Thresholds */}
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="font-medium mb-3">Largest Contentful Paint (LCP)</div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm opacity-75">Warning (ms)</label>
                  <input
                    type="number"
                    value={alertThresholds.lcpWarning}
                    onChange={(e) => handleThresholdChange('lcp', 'warning', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm opacity-75">Critical (ms)</label>
                  <input
                    type="number"
                    value={alertThresholds.lcpCritical}
                    onChange={(e) => handleThresholdChange('lcp', 'critical', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* FID Thresholds */}
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="font-medium mb-3">First Input Delay (FID)</div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm opacity-75">Warning (ms)</label>
                  <input
                    type="number"
                    value={alertThresholds.fidWarning}
                    onChange={(e) => handleThresholdChange('fid', 'warning', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm opacity-75">Critical (ms)</label>
                  <input
                    type="number"
                    value={alertThresholds.fidCritical}
                    onChange={(e) => handleThresholdChange('fid', 'critical', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CLS Thresholds */}
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="font-medium mb-3">Cumulative Layout Shift (CLS)</div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm opacity-75">Warning</label>
                  <input
                    type="number"
                    step="0.01"
                    value={alertThresholds.clsWarning}
                    onChange={(e) => handleThresholdChange('cls', 'warning', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm opacity-75">Critical</label>
                  <input
                    type="number"
                    step="0.01"
                    value={alertThresholds.clsCritical}
                    onChange={(e) => handleThresholdChange('cls', 'critical', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* INP Thresholds */}
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="font-medium mb-3">Interaction to Next Paint (INP)</div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm opacity-75">Warning (ms)</label>
                  <input
                    type="number"
                    value={alertThresholds.inpWarning}
                    onChange={(e) => handleThresholdChange('inp', 'warning', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm opacity-75">Critical (ms)</label>
                  <input
                    type="number"
                    value={alertThresholds.inpCritical}
                    onChange={(e) => handleThresholdChange('inp', 'critical', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Database size={16} />
            Data Management
          </h4>

          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Data Retention (days)</label>
                <select
                  value={dataRetention}
                  onChange={(e) => setDataRetention(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border mt-1"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                </select>
                <p className="text-xs opacity-60 mt-1">
                  Performance data older than this will be automatically deleted
                </p>
              </div>

              <button
                onClick={handleClearPerformanceData}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Clear All Performance Data
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-start gap-3">
            <Info size={16} className="text-blue-500 mt-0.5" />
            <div>
              <div className="font-medium mb-1">About Performance Monitoring</div>
              <p className="text-sm opacity-75">
                Performance monitoring helps track your app's speed and responsiveness. 
                Core Web Vitals are standardized metrics that measure user experience: 
                Loading (LCP), Interactivity (FID/INP), and Visual Stability (CLS).
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}