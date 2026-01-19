import { motion } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Gauge, 
  AlertCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { CoreWebVitals, PerformanceAlert } from '@/types/performance';

interface VitalCardProps {
  name: string;
  value: number | string;
  unit: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold?: { good: number; poor: number };
  description: string;
}

function VitalCard({ name, value, unit, rating, threshold, description }: VitalCardProps) {
  const getIcon = () => {
    switch (rating) {
      case 'good': return <CheckCircle size={16} className="text-green-500" />;
      case 'needs-improvement': return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'poor': return <XCircle size={16} className="text-red-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border"
      style={{ 
        backgroundColor: 'var(--bg-surface)', 
        borderColor: 'var(--border)',
        borderLeftColor: rating === 'good' ? '#10b981' : rating === 'needs-improvement' ? '#f59e0b' : '#ef4444',
        borderLeftWidth: '3px'
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{name}</span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {value}{unit}
          </div>
        </div>
      </div>
      
      <p className="text-xs opacity-75 mb-2" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      
      {threshold && (
        <div className="text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>
          Good: &le;{threshold.good}{unit} | Poor: &gt;{threshold.poor}{unit}
        </div>
      )}
    </motion.div>
  );
}

interface PerformanceVitalsProps {
  vitals: CoreWebVitals;
  alerts: PerformanceAlert[];
}

export function PerformanceVitals({ vitals, alerts }: PerformanceVitalsProps) {
  const getLCPRating = (): 'good' | 'needs-improvement' | 'poor' => {
    return vitals.lcp <= 2500 ? 'good' : vitals.lcp <= 4000 ? 'needs-improvement' : 'poor';
  };

  const getFIDRating = (): 'good' | 'needs-improvement' | 'poor' => {
    return vitals.fid <= 100 ? 'good' : vitals.fid <= 300 ? 'needs-improvement' : 'poor';
  };

  const getCLSRating = (): 'good' | 'needs-improvement' | 'poor' => {
    return vitals.cls <= 0.1 ? 'good' : vitals.cls <= 0.25 ? 'needs-improvement' : 'poor';
  };

  const getINPRating = (): 'good' | 'needs-improvement' | 'poor' => {
    return vitals.inp <= 200 ? 'good' : vitals.inp <= 500 ? 'needs-improvement' : 'poor';
  };

  const getFCPRating = (): 'good' | 'needs-improvement' | 'poor' => {
    return vitals.fcp <= 1800 ? 'good' : vitals.fcp <= 3000 ? 'needs-improvement' : 'poor';
  };

  const getTTFBRating = (): 'good' | 'needs-improvement' | 'poor' => {
    return vitals.ttfb <= 800 ? 'good' : vitals.ttfb <= 1800 ? 'needs-improvement' : 'poor';
  };

  const vitalMetrics: VitalCardProps[] = [
    {
      name: 'LCP',
      value: Math.round(vitals.lcp),
      unit: 'ms',
      rating: getLCPRating(),
      threshold: { good: 2500, poor: 4000 },
      description: 'Time to load the largest visible element'
    },
    {
      name: 'FID',
      value: Math.round(vitals.fid),
      unit: 'ms',
      rating: getFIDRating(),
      threshold: { good: 100, poor: 300 },
      description: 'Time from first user interaction to browser response'
    },
    {
      name: 'CLS',
      value: vitals.cls.toFixed(3),
      unit: '',
      rating: getCLSRating(),
      threshold: { good: 0.1, poor: 0.25 },
      description: 'Visual stability of the page'
    },
    {
      name: 'INP',
      value: Math.round(vitals.inp),
      unit: 'ms',
      rating: getINPRating(),
      threshold: { good: 200, poor: 500 },
      description: 'Typical responsiveness to user interactions'
    },
    {
      name: 'FCP',
      value: Math.round(vitals.fcp),
      unit: 'ms',
      rating: getFCPRating(),
      threshold: { good: 1800, poor: 3000 },
      description: 'Time to render first piece of DOM content'
    },
    {
      name: 'TTFB',
      value: Math.round(vitals.ttfb),
      unit: 'ms',
      rating: getTTFBRating(),
      threshold: { good: 800, poor: 1800 },
      description: 'Time between request and receiving first byte'
    }
  ];

  const criticalAlerts = alerts.filter(alert => alert.severity === 'error');
  const warnings = alerts.filter(alert => alert.severity === 'warning');

  const getOverallScore = () => {
    const goodCount = vitalMetrics.filter(m => m.rating === 'good').length;
    const totalCount = vitalMetrics.length;
    return Math.round((goodCount / totalCount) * 100);
  };

  const getScoreColor = () => {
    const score = getOverallScore();
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-xl border text-center"
        style={{ 
          backgroundColor: 'var(--bg-surface)', 
          borderColor: 'var(--border)',
          background: `linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-primary) 100%)`
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Gauge size={32} className={getScoreColor()} />
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Performance Score
          </h3>
        </div>
        <div className={`text-4xl font-bold mb-2 ${getScoreColor()}`}>
          {getOverallScore()}%
        </div>
        <div className="text-sm opacity-75">
          {vitalMetrics.filter(m => m.rating === 'good').length} of {vitalMetrics.length} metrics in good range
        </div>
      </motion.div>

      {/* Critical Alerts */}
      {(criticalAlerts.length > 0 || warnings.length > 0) && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <AlertCircle size={18} />
            Performance Alerts
          </h4>
          
          {criticalAlerts.length > 0 && (
            <div className="space-y-2">
              {criticalAlerts.slice(0, 3).map(alert => (
                <div
                  key={alert.id}
                  className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50"
                  style={{ backgroundColor: 'var(--bg-error)', borderColor: 'var(--border)' }}
                >
                  <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-800">
                      {alert.metric.toUpperCase()} Critical
                    </div>
                    <div className="text-xs text-red-600">
                      {alert.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.slice(0, 2).map(alert => (
                <div
                  key={alert.id}
                  className="flex items-start gap-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50"
                  style={{ backgroundColor: 'var(--bg-warning)', borderColor: 'var(--border)' }}
                >
                  <AlertTriangle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-yellow-800">
                      {alert.metric.toUpperCase()} Warning
                    </div>
                    <div className="text-xs text-yellow-600">
                      {alert.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Core Web Vitals Grid */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Activity size={18} />
          Core Web Vitals
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vitalMetrics.map((metric) => (
            <VitalCard key={metric.name} {...metric} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} />
          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Performance Summary
          </h4>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {vitalMetrics.filter(m => m.rating === 'good').length}
            </div>
            <div className="text-xs opacity-75">Good</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {vitalMetrics.filter(m => m.rating === 'needs-improvement').length}
            </div>
            <div className="text-xs opacity-75">Needs Improvement</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {vitalMetrics.filter(m => m.rating === 'poor').length}
            </div>
            <div className="text-xs opacity-75">Poor</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--text-secondary)' }}>
              {alerts.length}
            </div>
            <div className="text-xs opacity-75">Active Alerts</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}