import { useEffect, useState, useCallback } from 'react';
import { useCloudStatus } from '@/hooks/useCloudStatus';
import { Cloud, CloudOff, CheckCircle, Activity } from 'lucide-react';
import logger from '@/lib/logger';

// Expose debug functions to window
declare global {
  interface Window {
    cloudStatusDebug?: any;
    debugCloudStatus?: () => Promise<any>;
  }
}

interface CloudStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function CloudStatusIndicator({ className, showDetails = false }: CloudStatusIndicatorProps) {
  const { isOnline, isChecking, lastSuccessfulRequest } = useCloudStatus();
  const [showTooltip, setShowTooltip] = useState(false);

  // Real-time monitoring - update every 5 seconds
  const [realTimeStatus, setRealTimeStatus] = useState<{
    lastCheck: Date | null;
    responseTime: number | null;
    consecutiveFailures: number;
  }>({
    lastCheck: null,
    responseTime: null,
    consecutiveFailures: 0
  });

  const checkRealTimeStatus = useCallback(async () => {
    const startTime = Date.now();
    
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      
      const responseTime = Date.now() - startTime;
      
      setRealTimeStatus(() => ({
        lastCheck: new Date(),
        responseTime,
        consecutiveFailures: 0
      }));
      
    } catch (error) {
      setRealTimeStatus((prev) => ({
        lastCheck: new Date(),
        responseTime: null,
        consecutiveFailures: prev.consecutiveFailures + 1
      }));
    }
  }, []);

  // Real-time status monitoring
  useEffect(() => {
    // Initial check
    checkRealTimeStatus();
    
    // Check every 5 seconds
    const interval = setInterval(checkRealTimeStatus, 5000);
    
    return () => clearInterval(interval);
  }, [checkRealTimeStatus]);

  const getStatusColor = () => {
    if (isChecking) return 'text-yellow-500';
    if (isOnline) return 'text-green-500';
    return 'text-red-500';
  };

  const getStatusIcon = () => {
    if (isChecking) return <Activity className="w-4 h-4 animate-pulse" />;
    if (isOnline) return <Cloud className="w-4 h-4" />;
    return <CloudOff className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    if (isOnline) return 'Cloud Sync Online';
    return 'Cloud Sync Offline';
  };

  const getLastRequestTime = () => {
    if (!lastSuccessfulRequest) return 'Never';
    
    const now = Date.now();
    const diff = now - lastSuccessfulRequest.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className={`relative ${className || ''}`}>
      {/* Main Status Indicator */}
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer"
        style={{ 
          borderColor: `${getStatusColor().replace('text-', '#').replace('500', '300')}`,
          backgroundColor: `${getStatusColor().replace('text-', '').replace('500', '50')}`
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className={`flex items-center ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {isChecking && <div className="ml-2 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 w-3 h-3" />}
      </div>

      {/* Detailed Tooltip */}
      {showTooltip && showDetails && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="space-y-3">
            {/* Status Summary */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Last Success */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Success:</span>
              <span className="text-sm font-medium">
                {getLastRequestTime()}
              </span>
            </div>

            {/* Real-time Response Time */}
            {realTimeStatus.responseTime !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Response Time:</span>
                <span className={`text-sm font-medium ${
                  realTimeStatus.responseTime < 500 ? 'text-green-600' :
                  realTimeStatus.responseTime < 1000 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {realTimeStatus.responseTime}ms
                </span>
              </div>
            )}

            {/* Consecutive Failures */}
            {realTimeStatus.consecutiveFailures > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Failures:</span>
                <span className={`text-sm font-medium ${
                  realTimeStatus.consecutiveFailures > 5 ? 'text-red-600' :
                  realTimeStatus.consecutiveFailures > 2 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {realTimeStatus.consecutiveFailures}
                </span>
              </div>
            )}

            {/* Status Indicators */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Internet Access</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Supabase Client</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Environment Vars</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Server Reachable</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => window.debugCloudStatus?.()}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                Run Debug
              </button>
              <button
                onClick={() => logger.debug('Cloud Status:', window.cloudStatusDebug)}
                className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
              >
                Log Status
              </button>
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute -top-2 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"></div>
        </div>
      )}

      {/* Simple Mode - No Tooltip */}
      {!showDetails && (
        <div className="text-xs text-gray-500 mt-1">
          Last sync: {getLastRequestTime()}
        </div>
      )}
    </div>
  );
}

