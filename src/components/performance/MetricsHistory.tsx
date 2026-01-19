import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  BarChart3, 
  Filter,
  Plus,
  Calendar
} from 'lucide-react';
import { PerformanceMetric } from '@/types/performance';

interface MetricsHistoryProps {
  metrics: PerformanceMetric[];
  onRecordCustomMetric: (name: string, value: number, unit?: string) => void;
}

export function MetricsHistory({ metrics, onRecordCustomMetric }: MetricsHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'web-vital' | 'custom-metric'>('all');
  const [showCustomMetricForm, setShowCustomMetricForm] = useState(false);
  const [customMetric, setCustomMetric] = useState({ name: '', value: '', unit: 'ms' });

  const filteredMetrics = metrics.filter(metric => 
    filter === 'all' || metric.type === filter
  ).slice(-20).reverse();

  const handleAddCustomMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (customMetric.name && customMetric.value) {
      onRecordCustomMetric(
        customMetric.name,
        parseFloat(customMetric.value),
        customMetric.unit
      );
      setCustomMetric({ name: '', value: '', unit: 'ms' });
      setShowCustomMetricForm(false);
    }
  };

  const formatMetricName = (name: string) => {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getMetricIcon = (name: string) => {
    const icons: Record<string, string> = {
      lcp: '⚡',
      fid: '👆',
      cls: '📊',
      inp: '⚡',
      fcp: '🎨',
      ttfb: '🌐',
    };
    return icons[name.toLowerCase()] || '📈';
  };

  const getTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            <Filter size={16} />
            Filter:
          </div>
          <div className="flex gap-2">
            {(['all', 'web-vital', 'custom-metric'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filter === filterType
                    ? 'text-white'
                    : 'border hover:bg-opacity-80'
                }`}
                style={{
                  backgroundColor: filter === filterType ? 'var(--accent)' : 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  color: filter === filterType ? 'white' : 'var(--text-primary)'
                }}
              >
                {filterType === 'web-vital' ? 'Web Vitals' : 
                 filterType === 'custom-metric' ? 'Custom' : 'All'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowCustomMetricForm(!showCustomMetricForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-80"
          style={{ 
            backgroundColor: 'var(--bg-surface)', 
            borderColor: 'var(--border)',
            color: 'var(--text-primary)'
          }}
        >
          <Plus size={16} />
          Custom Metric
        </button>
      </motion.div>

      {/* Custom Metric Form */}
      <AnimatePresence>
        {showCustomMetricForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <form onSubmit={handleAddCustomMetric} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Metric name"
                  value={customMetric.name}
                  onChange={(e) => setCustomMetric(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
                <input
                  type="number"
                  placeholder="Value"
                  value={customMetric.value}
                  onChange={(e) => setCustomMetric(prev => ({ ...prev, value: e.target.value }))}
                  className="px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
                <select
                  value={customMetric.unit}
                  onChange={(e) => setCustomMetric(prev => ({ ...prev, unit: e.target.value }))}
                  className="px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="ms">ms</option>
                  <option value="s">s</option>
                  <option value="bytes">bytes</option>
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                  <option value="%">%</option>
                  <option value="count">count</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Add Metric
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
          <Clock size={18} />
          Recent Metrics ({filteredMetrics.length})
        </div>

        {filteredMetrics.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <p>No metrics recorded yet</p>
            <p className="text-sm">Performance data will appear here as you use the app</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {filteredMetrics.map((metric, index) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  borderColor: 'var(--border)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getMetricIcon(metric.name)}</div>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {formatMetricName(metric.name)}
                      </div>
                      <div className="text-sm opacity-75">
                        {metric.type === 'web-vital' ? 'Web Vital' : 'Custom Metric'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {metric.value}{metric.unit || ''}
                    </div>
                    <div className="text-sm opacity-75 flex items-center gap-1 justify-end">
                      <Calendar size={12} />
                      {getTimeAgo(metric.timestamp)}
                    </div>
                  </div>
                </div>

                {metric.rating && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      metric.rating === 'good' ? 'bg-green-100 text-green-700' :
                      metric.rating === 'needs-improvement' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {metric.rating}
                    </div>
                    <div className="text-xs opacity-60">
                      {new URL(metric.url).pathname}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}