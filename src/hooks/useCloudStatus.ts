import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface CloudStatusState {
  isOnline: boolean;
  hasInternet: boolean;
  supabaseClientExists: boolean;
  envVarsLoaded: boolean;
  supabaseReachable: boolean;
  authSessionValid: boolean;
  lastSuccessfulRequest: Date | null;
  debugInfo: Record<string, any>;
}

interface CloudStatusResult {
  status: CloudStatusState;
  lastCheck: Date;
}

export function useCloudStatus() {
  const [cloudStatus, setCloudStatus] = useState<CloudStatusState>({
    isOnline: false,
    hasInternet: false,
    supabaseClientExists: false,
    envVarsLoaded: false,
    supabaseReachable: false,
    authSessionValid: false,
    lastSuccessfulRequest: null,
    debugInfo: {}
  });

  const [isChecking, setIsChecking] = useState(false);

  // Definition of "online" per checklist
  const determineOnlineStatus = useCallback((checks: Partial<CloudStatusState>) => {
    // Cloud Sync should be ONLINE only if ALL of these are true:
    const hasInternet = navigator.onLine && checks.hasInternet !== false;
    const supabaseClientExists = supabase !== null && supabase !== undefined;
    const envVarsLoaded = Boolean(
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    const supabaseReachable = checks.supabaseReachable !== false;
    const authSessionValid = checks.authSessionValid !== false; // Can be true for anonymous
    const recentRequest = checks.lastSuccessfulRequest && 
      new Date().getTime() - checks.lastSuccessfulRequest.getTime() < 30000; // < 30s ago

    const isOnline = hasInternet && 
                   supabaseClientExists && 
                   envVarsLoaded && 
                   supabaseReachable && 
                   authSessionValid &&
                   recentRequest;

    return {
      isOnline: Boolean(isOnline),
      hasInternet: Boolean(hasInternet),
      supabaseClientExists: Boolean(supabaseClientExists),
      envVarsLoaded: Boolean(envVarsLoaded),
      supabaseReachable: Boolean(supabaseReachable),
      authSessionValid: Boolean(authSessionValid),
      lastSuccessfulRequest: checks.lastSuccessfulRequest || null,
      debugInfo: {
        ...checks.debugInfo,
        lastChecked: new Date().toISOString(),
        rulesApplied: {
          hasInternet,
          supabaseClientExists,
          envVarsLoaded,
          supabaseReachable,
          authSessionValid,
          recentRequest,
          isOnline
        }
      }
    };
  }, []);

  const runDebugChecklist = useCallback(async (): Promise<CloudStatusResult> => {
    console.log('🔍 Starting Cloud Sync Debug Checklist');
    setIsChecking(true);
    
    const checks: Partial<CloudStatusState> = { debugInfo: {} };

    try {
      // Step 1: Verify internet access
      console.log('Step 1: Checking internet access');
      console.log("navigator.onLine:", navigator.onLine);
      checks.hasInternet = navigator.onLine;
      checks.debugInfo = { ...checks.debugInfo, step1_internet: navigator.onLine };

      // Step 2: Verify Supabase client is actually created
      console.log('Step 2: Checking Supabase client');
      console.log("Supabase client:", supabase);
      checks.supabaseClientExists = supabase !== null && supabase !== undefined;
      checks.debugInfo = { 
        ...checks.debugInfo, 
        step2_supabaseClient: checks.supabaseClientExists,
        supabaseClientType: typeof supabase
      };

      // Step 3: Check env vars are NOT undefined
      console.log('Step 3: Checking environment variables');
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      console.log("URL:", url);
      console.log("KEY:", key?.slice(0, 10));
      
      checks.envVarsLoaded = Boolean(url && key);
      checks.debugInfo = { 
        ...checks.debugInfo, 
        step3_envVars: {
          urlDefined: Boolean(url),
          keyDefined: Boolean(key),
          urlPrefix: url?.slice(0, 20)
        }
      };

      // Step 4: Ping Supabase manually
      console.log('Step 4: Pinging Supabase');
      try {
        const client = supabase;
        if (!client) {
          throw new Error('Supabase client is null');
        }
        
        const { data: pingData, error } = await client
          .from("_dummy_ping")
          .select("*")
          .limit(1);
        
        console.log("Ping error:", error);
        
        // If we get a table not existing error, Supabase is reachable
        if (error && typeof error === 'object' && 'message' in error && 
            (error as any).message.includes('relation "_dummy_ping" does not exist')) {
          checks.supabaseReachable = true;
          checks.lastSuccessfulRequest = new Date();
          checks.debugInfo = { 
            ...checks.debugInfo, 
            step4_ping: "SUCCESS - Got table error (expected)",
            pingError: error,
            pingData
          };
        } else if (error) {
          checks.supabaseReachable = false;
          checks.debugInfo = { 
            ...checks.debugInfo, 
            step4_ping: "FAILED - Network/Timeout error",
            pingError: error
          };
        }
      } catch (pingError) {
        checks.supabaseReachable = false;
        checks.debugInfo = { 
          ...checks.debugInfo, 
          step4_ping: "FAILED - Exception thrown",
          pingException: pingError
        };
      }

      // Step 5: Check auth state
      console.log('Step 5: Checking auth state');
      try {
        const client = supabase;
        if (!client) {
          throw new Error('Supabase client is null');
        }
        
        const { data: authData } = await client.auth.getSession();
        console.log("Session:", authData.session);
        checks.authSessionValid = authData.session !== null;
        checks.debugInfo = { 
          ...checks.debugInfo, 
          step5_auth: {
            hasSession: authData.session !== null,
            userId: authData.session?.user?.id || 'none'
          }
        };
      } catch (authError) {
        checks.authSessionValid = false;
        checks.debugInfo = { 
          ...checks.debugInfo, 
          step5_auth: "FAILED - Auth check error",
          authError
        };
      }

      console.log('🔍 Debug checklist complete:', checks);

    } catch (error) {
      console.error('Debug checklist failed:', error);
      checks.debugInfo = { 
        ...checks.debugInfo, 
        checklistError: error
      };
    }

    const finalStatus = determineOnlineStatus(checks);
    setCloudStatus(finalStatus);
    setIsChecking(false);

    console.log('🎯 Final Cloud Status:', finalStatus);

    return {
      status: finalStatus,
      lastCheck: new Date()
    };
  }, [determineOnlineStatus]);

  // Auto-check every 30 seconds
  useEffect(() => {
    runDebugChecklist();
    const interval = setInterval(runDebugChecklist, 30000);
    return () => clearInterval(interval);
  }, [runDebugChecklist]);

  return {
    ...cloudStatus,
    isChecking,
    runDebugChecklist,
    determineOnlineStatus
  };
}

// Expose debugging functions to window (will be set up by a component)
declare global {
  interface Window {
    debugCloudStatus?: () => Promise<any>;
    cloudStatusDebug?: any;
  }
}