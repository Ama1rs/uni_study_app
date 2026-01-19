import { invoke } from '@tauri-apps/api/core';
import logger from '@/lib/logger';
import { CacheManager } from './cacheManager';

interface InvokeOptions {
  cache?: boolean;
  cacheTTL?: number;
  invalidateCache?: string[];
  backgroundRefresh?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  promise?: Promise<T>;
}

// Global cache for in-flight requests to prevent deduplication
const pendingRequests = new Map<string, Promise<any>>();

// Cache TTL configuration for different command types
const CACHE_TTL_CONFIG: Record<string, number> = {
  // Data fetching - longer TTL
  'get_resources': 10 * 60 * 1000, // 10 minutes
  'get_repositories': 15 * 60 * 1000, // 15 minutes
  'get_book_progress': 30 * 60 * 1000, // 30 minutes
  'get_user_profile': 5 * 60 * 1000, // 5 minutes
  'get_current_user': 2 * 60 * 1000, // 2 minutes
  'get_onboarding_state': 10 * 60 * 1000, // 10 minutes
  
  // AI operations - shorter TTL
  'chat_direct': 0, // No caching
  'generate_document': 0, // No caching
  'generate_presentation': 0, // No caching
  
  // CRUD operations - no caching for mutations
  'create_': 0,
  'update_': 0,
  'delete_': 0,
  'set_': 0,
  'add_': 0,
  
  // Default TTL
  'default': 5 * 60 * 1000, // 5 minutes
};

// Cache invalidation patterns
const CACHE_INVALIDATION_PATTERNS: Record<string, string[]> = {
  'create_resource': ['get_resources', 'get_repositories'],
  'update_resource': ['get_resources', 'get_book_progress'],
  'delete_resource': ['get_resources', 'get_repositories'],
  'create_repository': ['get_repositories'],
  'update_repository': ['get_repositories'],
  'delete_repository': ['get_repositories'],
  'save_book_progress': ['get_book_progress'],
  'set_user_profile': ['get_user_profile', 'get_current_user'],
  'set_app_settings': ['get_app_settings'],
};

export class CachedInvoke {
  static getCacheKey(command: string, args?: any): string {
    const argsStr = args ? JSON.stringify(args) : '';
    return `${command}:${argsStr}`;
  }

  private static getTTLForCommand(command: string): number {
    // Check for exact match first
    if (CACHE_TTL_CONFIG[command] !== undefined) {
      return CACHE_TTL_CONFIG[command];
    }

    // Check for prefix matches
    for (const [prefix, ttl] of Object.entries(CACHE_TTL_CONFIG)) {
      if (command.startsWith(prefix) && ttl === 0) {
        return 0; // No caching for mutations
      }
    }

    return CACHE_TTL_CONFIG.default;
  }

  private static async invalidateRelatedCaches(command: string): Promise<void> {
    const patternsToInvalidate = CACHE_INVALIDATION_PATTERNS[command];
    if (!patternsToInvalidate) return;

    for (const pattern of patternsToInvalidate) {
      await CacheManager.clearCache(pattern);
    }
  }

  private static performBackgroundRefresh<T>(
    command: string, 
    args?: any, 
    options: InvokeOptions = {}
  ): void {
    setTimeout(async () => {
      try {
        // Only refresh if cache exists
        const cacheKey = this.getCacheKey(command, args);
        const cached = await CacheManager.getCache(cacheKey);
        
        if (cached) {
          logger.debug(`[Cache] Background refreshing ${command}`);
          await this.invoke<T>(command, args, { ...options, backgroundRefresh: false });
        }
      } catch (error) {
        logger.warn(`[Cache] Background refresh failed for ${command}:`, error);
      }
    }, 1000); // Start background refresh after 1 second
  }

  static async invoke<T = any>(
    command: string, 
    args?: any, 
    options: InvokeOptions = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheTTL: customTTL,
      invalidateCache,
      backgroundRefresh = true
    } = options;

    const ttl = customTTL ?? this.getTTLForCommand(command);
    const shouldCache = cache && ttl > 0;

    // Invalidate related caches if requested
    if (invalidateCache) {
      for (const pattern of invalidateCache) {
        await CacheManager.clearCache(pattern);
      }
    }

    // Auto-invalidate related caches for mutations
    await this.invalidateRelatedCaches(command);

    // Skip caching for mutations
    if (!shouldCache) {
      logger.debug(`[Cache] Skipping cache for mutation: ${command}`);
      return invoke<T>(command, args);
    }

    const cacheKey = this.getCacheKey(command, args);

    // Check in-flight requests first (deduplication)
    if (pendingRequests.has(cacheKey)) {
      logger.debug(`[Cache] Deduplicating request for ${command}`);
      return pendingRequests.get(cacheKey) as Promise<T>;
    }

    // Check cache first
    const cachedData = await CacheManager.getCache(cacheKey);
    if (cachedData) {
      logger.debug(`[Cache] Hit for ${command}`);

      // Trigger background refresh if enabled and cache is getting stale
      if (backgroundRefresh) {
        const cacheEntry = cachedData as CacheEntry<T>;
        const age = Date.now() - cacheEntry.timestamp;
        const isStale = age > ttl * 0.8; // Refresh when 80% of TTL has passed

        if (isStale) {
          this.performBackgroundRefresh(command, args, options);
        }
      }

      return cachedData.data;
    }

    // Create and store the request promise
    const requestPromise = (async () => {
      try {
        logger.debug(`[Cache] Fetching from backend: ${command}`);
        const result = await invoke<T>(command, args);

        // Cache the result
        await CacheManager.setCache(cacheKey, { data: result }, ttl);
        logger.debug(`[Cache] Cached response for ${command}`);

        return result;
      } catch (error) {
        // Try to serve stale cache on error
        const staleData = await CacheManager.getCache(cacheKey);
        if (staleData) {
          logger.warn(`[Cache] Serving stale cache for ${command} due to error`);
          return staleData.data;
        }
        throw error;
      } finally {
        // Clean up pending request
        pendingRequests.delete(cacheKey);
      }
    })();

    // Store the in-flight request
    pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  // Convenience methods for common operations
  static async invalidatePattern(pattern: string): Promise<void> {
    await CacheManager.clearCache(pattern);
  }

  static async clearAllCache(): Promise<void> {
    await CacheManager.clearCache();
  }

  static getPendingRequestsCount(): number {
    return pendingRequests.size;
  }

  // Prefetching utility
  static async prefetch<T = any>(
    commands: Array<{ command: string; args?: any; options?: InvokeOptions }>
  ): Promise<void> {
    const prefetchPromises = commands.map(({ command, args, options }) =>
      this.invoke<T>(command, args, { ...options, backgroundRefresh: false })
        .catch(error => logger.warn(`[Cache] Prefetch failed for ${command}:`, error))
    );

    await Promise.allSettled(prefetchPromises);
  }

  // Cache warming for critical data
  static async warmCache(): Promise<void> {
    logger.info('[Cache] Warming cache with critical data');
    
    try {
      // Prefetch commonly used data
      await this.prefetch([
        { command: 'get_current_user' },
        { command: 'get_repositories' },
        { command: 'get_resources', args: { repositoryId: null } },
        { command: 'get_user_profile' },
        { command: 'get_onboarding_state' },
      ]);
    } catch (error) {
      logger.warn('[Cache] Cache warming failed:', error);
    }
  }

  // Get cache entry (for hooks)
  static async getCacheEntry(key: string): Promise<boolean> {
    return await CacheManager.getCache(key) !== null;
  }

  // Get cache statistics
  static getCacheStats() {
    return CacheManager.getCacheStats();
  }
}

// Export a cached version of invoke
export const cachedInvoke = CachedInvoke.invoke.bind(CachedInvoke);

// Export utilities
export const {
  invalidatePattern,
  clearAllCache,
  getPendingRequestsCount,
  prefetch,
  warmCache
} = CachedInvoke;