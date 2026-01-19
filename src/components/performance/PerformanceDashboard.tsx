import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  RefreshCw, 
  Download, 
  Trash2, 
  AlertCircle,
  TrendingUp,
  Activity,
  Clock,
  Settings
} from 'lucide-react';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { PerformanceVitals } from './PerformanceVitals';
import { MetricsHistory } from './MetricsHistory';

export function PerformanceDashboard() {
  const {
    metrics,
    alerts,
    currentVitals,
    report,
    generateNewReport,
    clearData,
    recordCustomMetric,
  } = usePerformanceMetrics();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'alerts'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    generateNewReport();
    setIsRefreshing(false);
  };

  const handleExportData = () => {
    const data = {
      currentVitals,
      metrics,
      alerts,
      report,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all performance data? This cannot be undone.')) {
      clearData();
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'history', label: 'History', icon: TrendingUp },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle },
  ];

  const criticalAlerts = alerts.filter(alert => alert.severity === 'error');

  return (
    <div className="space-y-6" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity size={24} />
            Performance Monitor
          </h2>
          <p className="text-sm opacity-75 mt-1">
            Real-time performance metrics and Core Web Vitals monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-80 disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--bg-surface)', 
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-80"
            style={{ 
              backgroundColor: 'var(--bg-surface)', 
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <Download size={16} />
            Export
          </button>

          <button
            onClick={handleClearData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50"
            style={{ 
              backgroundColor: 'var(--bg-surface)', 
              borderColor: 'var(--border-error)',
              color: 'var(--text-error)'
            }}
          >
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </motion.div>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-lg border flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${criticalAlerts.length > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className="text-sm font-medium">
              {criticalAlerts.length > 0 ? 'Critical Issues Detected' : 'System Healthy'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm opacity-75">
            <Clock size={14} />
            Last updated: {new Date().toLocaleTimeString()}
          </div>

          <div className="flex items-center gap-2 text-sm opacity-75">
            <Activity size={14} />
            {metrics.length} metrics recorded
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm opacity-75">
          <Settings size={14} />
          Auto-monitoring active
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:text-gray-600'
            }`}
            style={{
              borderBottomColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.id === 'alerts' && alerts.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <PerformanceVitals vitals={currentVitals} alerts={alerts} />
          )}

          {activeTab === 'history' && (
            <MetricsHistory 
              metrics={metrics}
              onRecordCustomMetric={recordCustomMetric}
            />
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <h4 className="font-semibold text-red-600 mb-3">Critical Alerts</h4>
                  <div className="space-y-2">
                    {criticalAlerts.length === 0 ? (
                      <p className="text-sm opacity-75">No critical alerts</p>
                    ) : (
                      criticalAlerts.map((alert) => (
                        <div key={alert.id} className="p-3 rounded border border-red-200 bg-red-50">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-red-800">{alert.metric}</div>
                              <div className="text-sm text-red-600">{alert.message}</div>
                              <div className="text-xs text-red-500 mt-1">
                                {new Date(alert.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <h4 className="font-semibold text-yellow-600 mb-3">Warnings</h4>
                  <div className="space-y-2">
                    {alerts.filter(a => a.severity === 'warning').length === 0 ? (
                      <p className="text-sm opacity-75">No warnings</p>
                    ) : (
                      alerts.filter(a => a.severity === 'warning').map((alert) => (
                        <div key={alert.id} className="p-3 rounded border border-yellow-200 bg-yellow-50">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-yellow-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-yellow-800">{alert.metric}</div>
                              <div className="text-sm text-yellow-600">{alert.message}</div>
                              <div className="text-xs text-yellow-500 mt-1">
                                {new Date(alert.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}