import { useState, useEffect, useCallback } from 'react';
import { CachedInvoke, cachedInvoke } from '@/lib/cachedInvoke';
import logger from '@/lib/logger';

interface UseCachedInvokeOptions {
  cache?: boolean;
  cacheTTL?: number;
  invalidateCache?: string[];
  backgroundRefresh?: boolean;
  immediate?: boolean;
}

interface UseCachedInvokeResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: (options?: Partial<UseCachedInvokeOptions>) => Promise<T | null>;
  invalidate: () => Promise<void>;
  isFromCache: boolean;
}

export function useCachedInvoke<T = any>(
  command: string,
  args?: any,
  options: UseCachedInvokeOptions = {}
): UseCachedInvokeResult<T> {
  const {
    cache = true,
    cacheTTL,
    invalidateCache,
    backgroundRefresh = true,
    immediate = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const execute = useCallback(async (execOptions?: Partial<UseCachedInvokeOptions>) => {
    try {
      setLoading(true);
      setError(null);
      setIsFromCache(false);

      const startTime = performance.now();
      
      // Check if this will be from cache first
      const cacheKey = CachedInvoke.getCacheKey(command, args);
      const hasCache = await CachedInvoke.getCacheEntry(cacheKey);
      
      let result: T;
      
      if (hasCache) {
        setIsFromCache(true);
        result = await cachedInvoke<T>(command, args, {
          cache: execOptions?.cache ?? cache,
          cacheTTL: execOptions?.cacheTTL ?? cacheTTL,
          invalidateCache: execOptions?.invalidateCache ?? invalidateCache,
          backgroundRefresh: execOptions?.backgroundRefresh ?? backgroundRefresh
        });
      } else {
        result = await cachedInvoke<T>(command, args, {
          cache: execOptions?.cache ?? cache,
          cacheTTL: execOptions?.cacheTTL ?? cacheTTL,
          invalidateCache: execOptions?.invalidateCache ?? invalidateCache,
          backgroundRefresh: execOptions?.backgroundRefresh ?? backgroundRefresh
        });
      }

      const duration = performance.now() - startTime;
      
      setData(result);
      
      if (hasCache) {
        logger.debug(`[Hook] ${command} returned from cache in ${duration.toFixed(2)}ms`);
      } else {
        logger.debug(`[Hook] ${command} fetched in ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error(`[Hook] Failed to invoke ${command}:`, err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [command, args, cache, cacheTTL, invalidateCache, backgroundRefresh]);

  const refetch = useCallback((newOptions?: Partial<UseCachedInvokeOptions>) => {
    return execute({ ...newOptions, backgroundRefresh: false });
  }, [execute]);

  const invalidate = useCallback(async () => {
    const cacheKey = CachedInvoke.getCacheKey(command, args);
    await CachedInvoke.invalidatePattern(cacheKey);
  }, [command, args]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    isFromCache
  };
}

// Hook for batch operations
export function useBatchInvoke<T = any>(
  commands: Array<{ command: string; args?: any; options?: UseCachedInvokeOptions }>
): {
  data: (T | null)[];
  loading: boolean;
  errors: (string | null)[];
  refetch: () => Promise<void>;
  loadingStates: boolean[];
  cacheStates: boolean[];
} {
  const [data, setData] = useState<(T | null)[]>(new Array(commands.length).fill(null));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<(string | null)[]>(new Array(commands.length).fill(null));
  const [loadingStates, setLoadingStates] = useState<boolean[]>(new Array(commands.length).fill(false));
  const [cacheStates, setCacheStates] = useState<boolean[]>(new Array(commands.length).fill(false));

  const executeBatch = useCallback(async () => {
    setLoading(true);
    
    try {
      const startTime = performance.now();
      
      await Promise.allSettled(
        commands.map(async ({ command, args, options }, index) => {
          try {
            setLoadingStates(prev => {
              const newStates = [...prev];
              newStates[index] = true;
              return newStates;
            });

            const cacheKey = CachedInvoke.getCacheKey(command, args);
            const hasCache = await CachedInvoke.getCacheEntry(cacheKey);
            
            if (hasCache) {
              setCacheStates(prev => {
                const newStates = [...prev];
                newStates[index] = true;
                return newStates;
              });
            }

            const result = await cachedInvoke<T>(command, args, options);
            
            setData(prev => {
              const newData = [...prev];
              newData[index] = result;
              return newData;
            });
            
            setErrors(prev => {
              const newErrors = [...prev];
              newErrors[index] = null;
              return newErrors;
            });
            
            return result;
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            
            setErrors(prev => {
              const newErrors = [...prev];
              newErrors[index] = errorMessage;
              return newErrors;
            });
            
            return null;
          } finally {
            setLoadingStates(prev => {
              const newStates = [...prev];
              newStates[index] = false;
              return newStates;
            });
          }
        })
      );

      const duration = performance.now() - startTime;
      logger.debug(`[Hook] Batch invoke completed in ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      logger.error('[Hook] Batch invoke failed:', error);
    } finally {
      setLoading(false);
    }
  }, [commands]);

  const refetch = useCallback(async () => {
    // Reset cache states for refetch
    setCacheStates(new Array(commands.length).fill(false));
    await executeBatch();
  }, [executeBatch]);

  useEffect(() => {
    executeBatch();
  }, [executeBatch]);

  return {
    data,
    loading,
    errors,
    refetch,
    loadingStates,
    cacheStates
  };
}

// Hook for caching statistics
export function useCacheStats() {
  const [stats, setStats] = useState(() => CachedInvoke.getCacheStats());
  const [pendingRequests, setPendingRequests] = useState(CachedInvoke.getPendingRequestsCount());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(CachedInvoke.getCacheStats());
      setPendingRequests(CachedInvoke.getPendingRequestsCount());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const clearCache = useCallback(async () => {
    await CachedInvoke.clearAllCache();
  }, []);

  const warmCache = useCallback(async () => {
    await CachedInvoke.warmCache();
  }, []);

  return {
    ...stats,
    pendingRequests,
    clearCache,
    warmCache
  };
}