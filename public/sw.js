const CACHE_NAME = 'uni-study-app-v1';
const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/tauri.svg',
  '/assets/react.svg'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/books',
  '/api/grades',
  '/api/finance',
  '/api/tasks'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== API_CACHE && 
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different request types
  if (url.origin === self.location.origin) {
    // Same origin requests
    if (url.pathname.startsWith('/api/')) {
      // API requests - network first with cache fallback
      event.respondWith(networkFirst(request, API_CACHE));
    } else {
      // Static assets - cache first with network fallback
      event.respondWith(cacheFirst(request, STATIC_CACHE));
    }
  } else {
    // Cross-origin requests (e.g., Supabase) - network only with optional caching
    if (url.hostname.includes('supabase')) {
      event.respondWith(networkFirst(request, API_CACHE));
    }
  }
});

// Cache first strategy for static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }
  
  console.log('[SW] Fetching from network:', request.url);
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok && response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    
    // Return cached version if available
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Network first strategy for API requests
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    console.log('[SW] Fetching from network:', request.url);
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Network request failed, trying cache:', error);
    
    // Return cached version if available
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving cached API response:', request.url);
      return cached;
    }
    
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');
  
  try {
    // Get all pending sync actions from IndexedDB
    const pendingActions = await getPendingSyncActions();
    
    // Process each action
    for (const action of pendingActions) {
      try {
        await fetch(action.url, action.options);
        await removeSyncAction(action.id);
        console.log('[SW] Synced action:', action.id);
      } catch (error) {
        console.error('[SW] Failed to sync action:', action.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data?.text() || 'You have a new notification',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/vite.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/vite.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Uni Study App', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.data);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// IndexedDB helpers for sync actions
async function getPendingSyncActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('uni-study-sync-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['sync-actions'], 'readonly');
      const store = transaction.objectStore('sync-actions');
      const getAll = store.getAll();
      
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => reject(getAll.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sync-actions')) {
        db.createObjectStore('sync-actions', { keyPath: 'id' });
      }
    };
  });
}

async function removeSyncAction(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('uni-study-sync-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['sync-actions'], 'readwrite');
      const store = transaction.objectStore('sync-actions');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

console.log('[SW] Service worker loaded');