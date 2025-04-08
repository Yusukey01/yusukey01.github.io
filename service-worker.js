const CACHE_NAME = 'math-cs-compass-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/_includes/head.html',
  '/_includes/header.html',
  '/_includes/footer.html',
  '/_layouts/default.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/search.js',
  '/js/updateLog.js',
  '/offline.html',
  '/logo/logo_ver3.webp',
  '/images/maskable_icon_x512.png',
  '/images/maskable_icon_x1280.png',
  '/manifest.json',
  
  // External resources
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2'
];

// Install the service worker and cache initial assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim clients immediately so updates take effect right away
  event.waitUntil(clients.claim());
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
  // For Font Awesome and other CDN resources, use a cache-first strategy
  if (event.request.url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request)
            .then(fetchResponse => {
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return fetchResponse;
            });
        })
    );
    return;
  }
  
  // For other resources, use a network-first strategy to ensure fresh content
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response to cache it
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
          
        return response;
      })
      .catch(() => {
        // If network fails, try the cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If the request is for a page, show the offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            return new Response('Resource not available offline');
          });
      })
  );
});