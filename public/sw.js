// Service Worker for Aquifer - Android VM in Browser
// Provides offline support and caching for better performance

const CACHE_NAME = 'aquifer-v1'
const RUNTIME_CACHE = 'aquifer-runtime-v1'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets')
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Failed to cache some assets:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  return self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
// Also add Cross-Origin Isolation headers for CheerpX support
self.addEventListener('fetch', (event) => {
  // Add Cross-Origin Isolation headers for all responses (required for CheerpX SharedArrayBuffer)
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).then((response) => {
        // Clone response to modify headers
        const newHeaders = new Headers(response.headers)
        
        // Add Cross-Origin Isolation headers (required for CheerpX SharedArrayBuffer)
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
        newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin')
        
        // Return modified response
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        })
      }).catch(() => {
        // Fallback: try cache
        return caches.match(event.request)
      })
    )
    return
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request).then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        // Cache runtime assets
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      }).catch(() => {
        // Return offline page if available
        if (event.request.destination === 'document') {
          return caches.match('/')
        }
      })
    })
  )
})

// Message event - handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_APK') {
    const { apkData, fileName } = event.data
    // Store APK in IndexedDB for offline access
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        const blob = new Blob([apkData], { type: 'application/vnd.android.package-archive' })
        return cache.put(`/apks/${fileName}`, new Response(blob))
      })
    )
  }
})

