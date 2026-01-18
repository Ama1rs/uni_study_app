import { useState, useEffect } from 'react';
import { useCloudStatus } from '@/hooks/useCloudStatus';
import { Wifi, WifiOff, CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Clock, Globe, Key, User, Activity } from 'lucide-react';

interface CloudDebugPanelProps {
  className?: string;
}

export function CloudDebugPanel({ className }: CloudDebugPanelProps) {
  const {
    isOnline,
    hasInternet,
    supabaseClientExists,
    envVarsLoaded,
    supabaseReachable,
    authSessionValid,
    lastSuccessfulRequest,
    debugInfo,
    isChecking,
    runDebugChecklist
  } = useCloudStatus();

  // Expose debug functions to window globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugCloudStatus = runDebugChecklist;
      window.cloudStatusDebug = {
        isOnline,
        hasInternet,
        supabaseClientExists,
        envVarsLoaded,
        supabaseReachable,
        authSessionValid,
        lastSuccessfulRequest,
        debugInfo
      };
    }
  }, [isOnline, hasInternet, supabaseClientExists, envVarsLoaded, 
      supabaseReachable, authSessionValid, lastSuccessfulRequest, 
      debugInfo, isChecking, runDebugChecklist]);

  const [expanded, setExpanded] = useState(false);

  const StatusIcon = ({ status }: { status: boolean | null }) => {
    if (status === null) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    if (status) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const StepStatus = ({ 
    step, 
    status, 
    details 
  }: { 
    step: string; 
    status: boolean | null; 
    details?: string; 
  }) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusIcon status={status} />
        <span className="text-sm font-medium">{step}</span>
      </div>
      {details && (
        <div className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
          {details}
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <h3 className="font-semibold">
            Cloud Sync Status: {isOnline ? 'ONLINE' : 'OFFLINE'}
          </h3>
        </div>
        <button
          onClick={() => runDebugChecklist()}
          disabled={isChecking}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Run Debug'}
        </button>
      </div>

      {/* Quick Status Summary */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <StatusIcon status={isOnline} />
            <div className="text-xs mt-1">Overall</div>
          </div>
          <div className="text-center">
            <Globe className={`w-4 h-4 mx-auto ${hasInternet ? 'text-green-500' : 'text-red-500'}`} />
            <div className="text-xs mt-1">Internet</div>
          </div>
          <div className="text-center">
            <Database className={`w-4 h-4 mx-auto ${supabaseClientExists ? 'text-green-500' : 'text-red-500'}`} />
            <div className="text-xs mt-1">Client</div>
          </div>
          <div className="text-center">
            <Key className={`w-4 h-4 mx-auto ${envVarsLoaded ? 'text-green-500' : 'text-red-500'}`} />
            <div className="text-xs mt-1">Env Vars</div>
          </div>
          <div className="text-center">
            <Activity className={`w-4 h-4 mx-auto ${supabaseReachable ? 'text-green-500' : 'text-red-500'}`} />
            <div className="text-xs mt-1">Reachable</div>
          </div>
          <div className="text-center">
            <User className={`w-4 h-4 mx-auto ${authSessionValid ? 'text-green-500' : 'text-red-500'}`} />
            <div className="text-xs mt-1">Auth</div>
          </div>
        </div>
      </div>

      {/* Detailed Debug Info */}
      <div className="border-t border-gray-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
        >
          <span className="font-medium text-sm">🔍 Debug Checklist Details</span>
          <span className="text-xs text-gray-500">
            {expanded ? '▼' : '▶'}
          </span>
        </button>
        
        {expanded && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <StepStatus
              step="Step 1: Internet Access"
              status={hasInternet}
              details={`navigator.onLine = ${navigator.onLine}`}
            />
            
            <StepStatus
              step="Step 2: Supabase Client"
              status={supabaseClientExists}
              details={`Client exists: ${supabaseClientExists}\nType: ${debugInfo?.rulesApplied?.supabaseClientExists ? 'OK' : 'NULL'}`}
            />
            
            <StepStatus
              step="Step 3: Environment Variables"
              status={envVarsLoaded}
              details={debugInfo?.step3_envVars ? 
                `URL defined: ${debugInfo.step3_envVars.urlDefined}\nKey defined: ${debugInfo.step3_envVars.keyDefined}\nPrefix: ${debugInfo.step3_envVars.urlPrefix}` :
                'Not checked'
              }
            />
            
            <StepStatus
              step="Step 4: Supabase Reachability"
              status={supabaseReachable}
              details={debugInfo?.step4_ping || 'Not checked'}
            />
            
            <StepStatus
              step="Step 5: Auth Session"
              status={authSessionValid}
              details={debugInfo?.step5_auth ? 
                `Has session: ${debugInfo.step5_auth.hasSession}\nUser ID: ${debugInfo.step5_auth.userId}` :
                'Not checked'
              }
            />
            
            {/* Last Request Info */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium">Last Successful Request</div>
                <div className="text-xs text-gray-600 font-mono">
                  {lastSuccessfulRequest ? 
                    new Date(lastSuccessfulRequest).toLocaleString() : 
                    'Never'
                  }
                </div>
              </div>
            </div>

            {/* Rules Applied */}
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="font-medium text-sm mb-2">🎯 Rules Applied</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(debugInfo?.rulesApplied || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between bg-white p-2 rounded border">
                    <span className="font-medium">{key}:</span>
                    <span className={value ? 'text-green-600' : 'text-red-600'}>
                      {value ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Test Buttons */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-sm font-medium mb-3">Quick Tests</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => console.log("Internet:", navigator.onLine)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Test Internet
          </button>
          <button
            onClick={() => {
              console.log("URL:", import.meta.env.VITE_SUPABASE_URL);
              console.log("KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10));
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Test Env Vars
          </button>
          <button
            onClick={() => {
              if (typeof window.debugCloudStatus === 'function') {
                window.debugCloudStatus().then(console.log);
              }
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Run Full Debug
          </button>
          <button
            onClick={() => {
              if (typeof window.cloudStatusDebug !== 'undefined') {
                console.log("Cloud Status Debug:", window.cloudStatusDebug);
              }
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Log State
          </button>
        </div>
      </div>
    </div>
  );
}