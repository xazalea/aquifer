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
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  const url = new URL(event.request.url)
  
  // Skip cross-origin requests (including localhost)
  // Service workers can't modify cross-origin responses anyway
  if (!url.origin || url.origin !== self.location.origin) {
    // Don't intercept - let browser handle it
    return
  }
  
  // Only handle same-origin requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Add COI headers to cached response
        const newHeaders = new Headers(cachedResponse.headers)
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
        newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin')
        
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: newHeaders,
        })
      }

      // Not in cache, fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          // Still add COI headers
          const newHeaders = new Headers(response.headers)
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
          newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin')
          
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          })
        }

        // Clone the response for caching
        const responseToCache = response.clone()

        // Cache runtime assets
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        // Add COI headers to response
        const newHeaders = new Headers(response.headers)
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
        newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin')
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        })
      }).catch(() => {
        // Return offline page if available
        if (event.request.destination === 'document') {
          return caches.match('/').then((offlinePage) => {
            if (offlinePage) {
              const newHeaders = new Headers(offlinePage.headers)
              newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
              newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
              newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin')
              
              return new Response(offlinePage.body, {
                status: offlinePage.status,
                statusText: offlinePage.statusText,
                headers: newHeaders,
              })
            }
            return new Response('Offline', { status: 503 })
          })
        }
        return new Response('Network error', { status: 503 })
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

