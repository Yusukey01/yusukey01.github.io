const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGES_CACHE = `pages-${CACHE_VERSION}`;
const EXTERNAL_CACHE = `external-${CACHE_VERSION}`;
const MATH_CACHE = `math-${CACHE_VERSION}`;

// Core application shell assets - 
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/dark-theme-enhancement.css',
  '/css/compass-map-styles.css',
  '/js/main.js',
  '/js/search.js',
  '/js/updateLog.js',
  '/offline.html',
  '/manifest.json',
  // Updated icon paths
  '/favicon.ico',
  '/images/icon.svg',
  '/images/apple-touch-icon.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/icon-maskable-192.png',
  '/images/icon-maskable-512.png'
];

// Essential navigation pages
const CORE_PAGES = [
  '/Mathematics/Linear_algebra/linear_algebra.html',
  '/Mathematics/Calculus/calculus.html',
  '/Mathematics/Probability/probability.html',
  '/Mathematics/Discrete/discrete_math.html'
];

// External resources - Updated Font Awesome version
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2'
];

// Math resources - MathJax (loaded conditionally, so we cache but don't require)
const MATH_RESOURCES = [
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
];

// Install event handler - cache important resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching App Shell');
        // Use addAll but catch individual failures
        return Promise.allSettled(
          APP_SHELL.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache: ${url}`, err);
            })
          )
        );
      }),
      
      // Cache core pages
      caches.open(PAGES_CACHE).then(cache => {
        console.log('Service Worker: Caching Core Pages');
        return Promise.allSettled(
          CORE_PAGES.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache: ${url}`, err);
            })
          )
        );
      }),
      
      // Cache external resources
      caches.open(EXTERNAL_CACHE).then(cache => {
        console.log('Service Worker: Caching External Resources');
        return Promise.allSettled(
          EXTERNAL_RESOURCES.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache: ${url}`, err);
            })
          )
        );
      }),
      
      // Cache math resources 
      caches.open(MATH_CACHE).then(cache => {
        console.log('Service Worker: Caching Math Resources');
        return Promise.allSettled(
          MATH_RESOURCES.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache: ${url}`, err);
            })
          )
        );
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event handler - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  const currentCaches = [STATIC_CACHE, PAGES_CACHE, EXTERNAL_CACHE, MATH_CACHE];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Service Worker: Clearing Old Cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Ready to handle fetches');
      return self.clients.claim();
    })
  );
});

// Helper function to determine the cache strategy based on request URL
function getCacheStrategy(url) {
  const requestURL = new URL(url);
  
  // External resources - Cache First strategy
  if (requestURL.hostname.includes('cdnjs.cloudflare.com') || 
      requestURL.hostname.includes('cdn.jsdelivr.net')) {
    return 'cache-first';
  }
  
  // Math assets - Cache First strategy
  if (url.includes('mathjax') || url.includes('pyodide')) {
    return 'cache-first';
  }
  
  // HTML pages - Network First strategy
  if (requestURL.pathname.endsWith('.html') || 
      requestURL.pathname === '/' || 
      requestURL.pathname.endsWith('/')) {
    return 'network-first';
  }
  
  // Images - Cache First (they don't change often)
  if (requestURL.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
    return 'cache-first';
  }
  
  // CSS and JS - Stale While Revalidate
  return 'stale-while-revalidate';
}

// Fetch event handler
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  const strategy = getCacheStrategy(event.request.url);
  
  if (strategy === 'cache-first') {
    // Cache First Strategy (for external libraries, fonts, images, etc.)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          
          // Determine which cache to use
          const url = event.request.url;
          let cacheName = STATIC_CACHE;
          if (url.includes('cdnjs.cloudflare.com') || url.includes('cdn.jsdelivr.net')) {
            cacheName = EXTERNAL_CACHE;
          } else if (url.includes('mathjax') || url.includes('pyodide')) {
            cacheName = MATH_CACHE;
          }
          
          return caches.open(cacheName).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(error => {
          console.error('Fetch failed for:', event.request.url, error);
          // Return a fallback for images
          if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
            return new Response('', { status: 404 });
          }
          return new Response('Resource unavailable', { status: 503 });
        });
      })
    );
  } 
  else if (strategy === 'network-first') {
    // Network First Strategy (for HTML pages)
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        // Clone the response to cache it
        const responseToCache = networkResponse.clone();
        
        caches.open(PAGES_CACHE).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // If network fails, try the cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If it's a navigation request, show the offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          
          return new Response('Resource not available offline', { status: 503 });
        });
      })
    );
  } 
  else {
    // Stale While Revalidate (for CSS, JS, and other assets)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Update the cache with the new response
          if (networkResponse && networkResponse.status === 200) {
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(error => {
          console.error('Fetch failed:', error);
          // Return cached version if available, otherwise throw
          if (cachedResponse) {
            return cachedResponse;
          }
          throw error;
        });
        
        // Return cached response immediately, or wait for network response
        return cachedResponse || fetchPromise;
      })
    );
  }
});