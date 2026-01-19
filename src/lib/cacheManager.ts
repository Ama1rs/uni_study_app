// Enhanced cache management utilities for API responses
import logger from '@/lib/logger';

export class CacheManager {
  private static readonly API_CACHE_VERSION = 'v2';
  private static readonly API_CACHE_PREFIX = 'api-cache-';
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  // Memory cache for faster access
  private static memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly MAX_MEMORY_CACHE_SIZE = 100;

  // Get cache key with version
  private static getCacheKey(endpoint: string): string {
    return `${this.API_CACHE_PREFIX}${this.API_CACHE_VERSION}-${endpoint}`;
  }

  // Store API response in cache with TTL
  static async setCache(endpoint: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const cacheKey = this.getCacheKey(endpoint);
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
      endpoint
    };

    // Store in memory cache first
    this.memoryCache.set(cacheKey, { data, timestamp: Date.now(), ttl });
    
    // Clean up memory cache if it gets too large
    if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      logger.debug(`[Cache] Cached API response for ${endpoint}`);
    } catch (error) {
      logger.warn(`[Cache] Failed to cache ${endpoint}:`, error);
      // Try to clear some old cache entries and retry
      await this.cleanupOldCache();
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (retryError) {
        logger.error(`[Cache] Retry failed for ${endpoint}:`, retryError);
      }
    }
  }

  // Get cached API response if valid
  static async getCache(endpoint: string): Promise<any | null> {
    const cacheKey = this.getCacheKey(endpoint);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry) {
      const isExpired = Date.now() - memoryEntry.timestamp > memoryEntry.ttl;
      if (isExpired) {
        this.memoryCache.delete(cacheKey);
      } else {
        logger.debug(`[Cache] Memory hit for ${endpoint}`);
        return memoryEntry.data;
      }
    }

    try {
      const item = localStorage.getItem(cacheKey);
      
      if (!item) {
        return null;
      }

      const cacheData = JSON.parse(item);
      const { data, timestamp, ttl } = cacheData;
      const isExpired = Date.now() - timestamp > ttl;

      if (isExpired) {
        localStorage.removeItem(cacheKey);
        logger.debug(`[Cache] Expired cache for ${endpoint}`);
        return null;
      }

      // Restore to memory cache
      this.memoryCache.set(cacheKey, { data, timestamp, ttl });

      logger.debug(`[Cache] Storage hit for ${endpoint}`);
      return data;
    } catch (error) {
      logger.warn(`[Cache] Failed to retrieve cache for ${endpoint}:`, error);
      return null;
    }
  }

  // Clean up old cache entries to make space
  private static async cleanupOldCache(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const apiKeys = keys.filter(key => key.startsWith(this.API_CACHE_PREFIX));
      
      // Remove oldest 25% of cache entries
      const toRemove = Math.max(1, Math.floor(apiKeys.length * 0.25));
      
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(apiKeys[i]);
      }
      
      logger.info(`[Cache] Cleaned up ${toRemove} old cache entries`);
    } catch (error) {
      logger.warn('[Cache] Failed to cleanup old cache:', error);
    }
  }

  // Clear cache for specific endpoint
  static async clearCache(endpoint?: string): Promise<void> {
    try {
      if (endpoint) {
        const cacheKey = this.getCacheKey(endpoint);
        localStorage.removeItem(cacheKey);
        this.memoryCache.delete(cacheKey);
        logger.debug(`[Cache] Cleared cache for ${endpoint}`);
      } else {
        // Clear all API cache
        const keys = Object.keys(localStorage);
        const apiKeys = keys.filter(key => key.startsWith(this.API_CACHE_PREFIX));
        
        for (const key of apiKeys) {
          localStorage.removeItem(key);
        }
        
        // Clear memory cache
        this.memoryCache.clear();
        
        logger.info(`[Cache] Cleared ${apiKeys.length} cached API responses`);
      }
    } catch (error) {
      logger.error('[Cache] Failed to clear cache:', error);
    }
  }

  // Get cache statistics
  static getCacheStats(): {
    memorySize: number;
    storageSize: number;
    memoryEntries: number;
    storageEntries: number;
  } {
    const memoryEntries = this.memoryCache.size;
    let storageEntries = 0;
    
    try {
      const keys = Object.keys(localStorage);
      storageEntries = keys.filter(key => key.startsWith(this.API_CACHE_PREFIX)).length;
    } catch (error) {
      logger.warn('[Cache] Failed to get storage stats:', error);
    }

    return {
      memorySize: memoryEntries,
      storageSize: storageEntries,
      memoryEntries,
      storageEntries
    };
  }
}

// Enhanced fetch with caching
export class CachedFetch {
  static async fetchWithCache(
    url: string,
    options: RequestInit = {},
    cacheTTL?: number
  ): Promise<Response> {
    const { method = 'GET' } = options;

    // Only cache GET requests
    if (method.toUpperCase() !== 'GET') {
      logger.debug(`[Cache] Skipping cache for ${method} request to ${url}`);
      return fetch(url, options);
    }

    // Check cache first
    const cachedData = await CacheManager.getCache(url);
    if (cachedData) {
      // Return cached response as a Response object
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch from network
    try {
      logger.debug(`[Cache] Fetching from network: ${url}`);
      const response = await fetch(url, options);

      // Cache successful responses
      if (response.ok && response.status === 200) {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        await CacheManager.setCache(url, data, cacheTTL);
      }

      return response;
    } catch (error) {
      logger.error(`[Cache] Network request failed for ${url}:`, error);
      
      // If network fails, try to serve stale cache
      const staleData = await CacheManager.getCache(url);
      if (staleData) {
        logger.warn(`[Cache] Serving stale cache for ${url}`);
        return new Response(JSON.stringify(staleData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'STALE',
          },
        });
      }

      throw error;
    }
  }

  // Invalidate cache for specific resource
  static async invalidateCache(pattern: string): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const matchedKeys = keys.filter((key: string) => key.includes(pattern));
      
      for (const key of matchedKeys) {
        localStorage.removeItem(key);
      }
      
      logger.info(`[Cache] Invalidated ${matchedKeys.length} cache entries matching ${pattern}`);
    } catch (error) {
      logger.error('[Cache] Failed to invalidate cache:', error);
    }
  }
}

// Background sync for offline actions
export class OfflineActionManager {
  private static readonly DB_NAME = 'uni-study-offline';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'offline-actions';

  // Queue action for background sync
  static async queueAction(action: {
    id: string;
    url: string;
    method: string;
    body?: any;
    headers?: Record<string, string>;
    timestamp: number;
  }): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      store.add(action);
      logger.debug(`[Offline] Queued action: ${action.id}`);
      
      // Register for background sync if available
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        (registration as any).sync.register('background-sync');
        logger.debug('[Offline] Background sync registered');
      }
    } catch (error) {
      logger.error('[Offline] Failed to queue action:', error);
      throw error;
    }
  }

  // Process queued actions
  static async processActions(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const actions = getAllRequest.result;
        
        actions.forEach((action: any) => {
          fetch(action.url, {
            method: action.method,
            headers: {
              'Content-Type': 'application/json',
              ...action.headers,
            },
            body: action.body ? JSON.stringify(action.body) : undefined,
          }).then((response) => {
            if (response.ok) {
              store.delete(action.id);
              logger.debug(`[Offline] Processed action: ${action.id}`);
            } else {
              logger.warn(`[Offline] Failed to process action ${action.id}: ${response.status}`);
            }
          }).catch((error) => {
            logger.error(`[Offline] Error processing action ${action.id}:`, error);
          });
        });
      };
    } catch (error) {
      logger.error('[Offline] Failed to process actions:', error);
    }
  }

  // Get pending actions count
  static async getPendingActionsCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.openDB().then((db) => {
          const transaction = db.transaction([this.STORE_NAME], 'readonly');
          const store = transaction.objectStore(this.STORE_NAME);
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result.length);
          };
          
          getAllRequest.onerror = () => {
            reject(getAllRequest.error);
          };
        }).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Open IndexedDB
  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
}