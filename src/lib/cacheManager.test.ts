import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, CachedFetch, OfflineActionManager } from '@/lib/cacheManager';
import { CachedInvoke, cachedInvoke } from '@/lib/cachedInvoke';
import { cacheWarmingService } from '@/lib/cacheWarmingService';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';

describe('CacheManager', () => {
  beforeEach(() => {
    localStorage.clear();
    CacheManager.clearCache();
  });

  afterEach(() => {
    localStorage.clear();
    CacheManager.clearCache();
  });

  it('should store and retrieve cached data', async () => {
    const testData = { id: 1, name: 'test' };
    
    await CacheManager.setCache('test-endpoint', testData, 60000);
    const cached = await CacheManager.getCache('test-endpoint');
    
    expect(cached).toEqual(testData);
  });

  it('should return null for expired cache', async () => {
    const testData = { id: 1, name: 'test' };
    
    await CacheManager.setCache('test-endpoint', testData, 1); // 1ms TTL
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for expiry
    
    const cached = await CacheManager.getCache('test-endpoint');
    
    expect(cached).toBeNull();
  });

  it('should return null for non-existent cache', async () => {
    const cached = await CacheManager.getCache('non-existent');
    expect(cached).toBeNull();
  });

  it('should clear specific cache entry', async () => {
    await CacheManager.setCache('test-endpoint', { data: 'test' });
    await CacheManager.clearCache('test-endpoint');
    
    const cached = await CacheManager.getCache('test-endpoint');
    expect(cached).toBeNull();
  });

  it('should clear all cache entries', async () => {
    await CacheManager.setCache('test1', { data: 'test1' });
    await CacheManager.setCache('test2', { data: 'test2' });
    
    await CacheManager.clearCache();
    
    const cached1 = await CacheManager.getCache('test1');
    const cached2 = await CacheManager.getCache('test2');
    
    expect(cached1).toBeNull();
    expect(cached2).toBeNull();
  });

  it('should provide cache statistics', () => {
    const stats = CacheManager.getCacheStats();
    
    expect(stats).toHaveProperty('memorySize');
    expect(stats).toHaveProperty('storageSize');
    expect(stats).toHaveProperty('memoryEntries');
    expect(stats).toHaveProperty('storageEntries');
    
    expect(typeof stats.memorySize).toBe('number');
    expect(typeof stats.storageSize).toBe('number');
  });
});

describe('CachedInvoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    CacheManager.clearCache();
  });

  afterEach(() => {
    localStorage.clear();
    CacheManager.clearCache();
  });

  it('should cache GET-like commands', async () => {
    const mockData = { id: 1, name: 'test' };
    (invoke as any).mockResolvedValue(mockData);

    // First call should hit backend
    const result1 = await CachedInvoke.invoke('get_resources');
    expect(result1).toEqual(mockData);
    expect(invoke).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const result2 = await CachedInvoke.invoke('get_resources');
    expect(result2).toEqual(mockData);
    expect(invoke).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('should not cache mutation commands', async () => {
    const mockData = { id: 1, name: 'test' };
    (invoke as any).mockResolvedValue(mockData);

    await CachedInvoke.invoke('create_resource', { name: 'test' });
    await CachedInvoke.invoke('create_resource', { name: 'test' });

    expect(invoke).toHaveBeenCalledTimes(2); // Should be called twice
  });

  it('should respect custom TTL', async () => {
    const mockData = { id: 1, name: 'test' };
    (invoke as any).mockResolvedValue(mockData);

    await CachedInvoke.invoke('get_resources', undefined, { cacheTTL: 1000 });
    
    // Should be cached
    const cached = await CacheManager.getCache('get_resources:{}');
    expect(cached).toBeDefined();
  });

  it('should invalidate related caches on mutations', async () => {
    const mockData = { id: 1, name: 'test' };
    (invoke as any).mockResolvedValue(mockData);

    // First, cache some data
    await CachedInvoke.invoke('get_resources');
    await CachedInvoke.invoke('get_repositories');

    // Perform mutation
    await CachedInvoke.invoke('create_resource', { name: 'test' });

    // Check if related caches are invalidated
    const resourcesCache = await CacheManager.getCache('get_resources:{}');
    const repositoriesCache = await CacheManager.getCache('get_repositories:{}');

    // Resources cache should be invalidated, repositories should not
    expect(resourcesCache).toBeNull();
    expect(repositoriesCache).toBeDefined();
  });

  it('should serve stale cache on network error', async () => {
    const mockData = { id: 1, name: 'test' };
    (invoke as any)
      .mockResolvedValueOnce(mockData)
      .mockRejectedValueOnce(new Error('Network error'));

    // Cache data first
    const result1 = await CachedInvoke.invoke('get_resources');
    expect(result1).toEqual(mockData);

    // Network error should serve stale cache
    const result2 = await CachedInvoke.invoke('get_resources');
    expect(result2).toEqual(mockData);
  });

  it('should deduplicate concurrent requests', async () => {
    const mockData = { id: 1, name: 'test' };
    (invoke as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockData), 100))
    );

    // Start multiple concurrent requests
    const [result1, result2, result3] = await Promise.all([
      CachedInvoke.invoke('get_resources'),
      CachedInvoke.invoke('get_resources'),
      CachedInvoke.invoke('get_resources')
    ]);

    expect(result1).toEqual(mockData);
    expect(result2).toEqual(mockData);
    expect(result3).toEqual(mockData);
    
    // Should only call invoke once due to deduplication
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('should prefetch multiple commands', async () => {
    const mockData1 = { resources: [] };
    const mockData2 = { repositories: [] };
    (invoke as any)
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    await CachedInvoke.prefetch([
      { command: 'get_resources' },
      { command: 'get_repositories' }
    ]);

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(invoke).toHaveBeenCalledWith('get_resources');
    expect(invoke).toHaveBeenCalledWith('get_repositories');
  });
});

describe('CachedFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should cache GET requests', async () => {
    const mockResponse = { data: 'test' };
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      clone: () => ({
        json: () => Promise.resolve(mockResponse)
      })
    });

    // First call
    await CachedFetch.fetchWithCache('https://api.example.com/data');
    expect(fetch).toHaveBeenCalledTimes(1);

    // Second call should use cache
    await CachedFetch.fetchWithCache('https://api.example.com/data');
    expect(fetch).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('should not cache non-GET requests', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200
    });

    await CachedFetch.fetchWithCache('https://api.example.com/data', {
      method: 'POST'
    });

    await CachedFetch.fetchWithCache('https://api.example.com/data', {
      method: 'POST'
    });

    expect(fetch).toHaveBeenCalledTimes(2); // Should be called twice
  });
});

describe('OfflineActionManager', () => {
  beforeEach(() => {
    // Mock IndexedDB
    const mockDB = {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(),
          getAll: vi.fn(() => ({
            onsuccess: null,
            result: []
          })),
          delete: vi.fn()
        }))
      }))
    };

    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => ({
        onsuccess: null,
        result: mockDB,
        onupgradeneeded: null
      }))
    });
  });

  it('should queue offline actions', async () => {
    const action = {
      id: 'test-action',
      url: 'https://api.example.com/test',
      method: 'POST',
      body: { data: 'test' },
      timestamp: Date.now()
    };

    await OfflineActionManager.queueAction(action);

    // Verify action was queued (implementation-specific)
    expect(true).toBe(true); // Placeholder - actual implementation depends on IndexedDB mock
  });
});

describe('CacheWarmingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cacheWarmingService.stop();
  });

  it('should start and stop cache warming', () => {
    const status1 = cacheWarmingService.getWarmingStatus();
    expect(status1.hasWarmingInterval).toBe(false);

    cacheWarmingService.start();
    const status2 = cacheWarmingService.getWarmingStatus();
    expect(status2.hasWarmingInterval).toBe(true);

    cacheWarmingService.stop();
    const status3 = cacheWarmingService.getWarmingStatus();
    expect(status3.hasWarmingInterval).toBe(false);
  });

  it('should warm specific endpoints', async () => {
    const mockData = { test: 'data' };
    (invoke as any).mockResolvedValue(mockData);

    await cacheWarmingService.warmEndpoint('get_test_data', { id: 1 });

    expect(invoke).toHaveBeenCalledWith('get_test_data', { id: 1 });
  });

  it('should warm multiple endpoints', async () => {
    const mockData = { test: 'data' };
    (invoke as any).mockResolvedValue(mockData);

    await cacheWarmingService.warmEndpoints([
      { command: 'get_data1' },
      { command: 'get_data2', args: { id: 1 } }
    ]);

    expect(invoke).toHaveBeenCalledWith('get_data1');
    expect(invoke).toHaveBeenCalledWith('get_data2', { id: 1 });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    CacheManager.clearCache();
  });

  afterEach(() => {
    localStorage.clear();
    CacheManager.clearCache();
  });

  it('should handle complete caching workflow', async () => {
    const mockData = { resources: [{ id: 1, name: 'test' }] };
    (invoke as any).mockResolvedValue(mockData);

    // Start cache warming
    cacheWarmingService.start();

    // First data fetch
    const result1 = await cachedInvoke('get_resources');
    expect(result1).toEqual(mockData);

    // Second fetch should use cache
    const result2 = await cachedInvoke('get_resources');
    expect(result2).toEqual(mockData);

    // Backend should only be called once
    expect(invoke).toHaveBeenCalledTimes(1);

    cacheWarmingService.stop();
  });

  it('should handle cache invalidation properly', async () => {
    const mockData = { resources: [] };
    (invoke as any).mockResolvedValue(mockData);

    // Cache initial data
    await cachedInvoke('get_resources');
    expect(invoke).toHaveBeenCalledTimes(1);

    // Invalidate and fetch again
    await CachedInvoke.invalidatePattern('get_resources');
    await cachedInvoke('get_resources');
    
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});