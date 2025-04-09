const CACHE_NAME = 'math-cs-compass-v1';
const STATIC_CACHE = 'static-v1';
const PAGES_CACHE = 'pages-v1';
const EXTERNAL_CACHE = 'external-v1';
const MATH_CACHE = 'math-v1';

// Core application shell assets
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/search.js',
  '/js/updateLog.js',
  '/offline.html',
  '/logo/logo_ver3.webp',
  '/images/maskable_icon_x512.png',
  '/images/maskable_icon_x1280.png',
  '/images/icon_x512.png',
  '/manifest.json'
];

// Essential navigation pages
const CORE_PAGES = [
  '/Mathematics/Linear_algebra/linear_algebra.html',
  '/Mathematics/Calculus/calculus.html',
  '/Mathematics/Probability/probability.html',
  '/Mathematics/Discrete/discrete_math.html'
];

// External resources 
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2'
];

// Math resources (conditionally loaded in head.html)
const MATH_RESOURCES = [
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2/MathJax_Main-Regular.woff',
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2/MathJax_Math-Italic.woff',
  'https://cdn.jsdelivr.net/pyodide/v0.23.3/full/pyodide.js'
];

// Install event handler - cache important resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(APP_SHELL);
      }),
      
      // Cache core pages
      caches.open(PAGES_CACHE).then(cache => {
        console.log('Service Worker: Caching Core Pages');
        return cache.addAll(CORE_PAGES);
      }),
      
      // Cache external resources
      caches.open(EXTERNAL_CACHE).then(cache => {
        console.log('Service Worker: Caching External Resources');
        return cache.addAll(EXTERNAL_RESOURCES);
      }),
      
      // Cache math resources
      caches.open(MATH_CACHE).then(cache => {
        console.log('Service Worker: Caching Math Resources');
        return cache.addAll(MATH_RESOURCES);
      })
    ]).then(() => {
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
  
  // Other assets - Stale While Revalidate
  return 'stale-while-revalidate';
}

// Fetch event handler
self.addEventListener('fetch', event => {
  const strategy = getCacheStrategy(event.request.url);
  
  if (strategy === 'cache-first') {
    // Cache First Strategy (for external libraries, fonts, etc.)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          
          return caches.open(EXTERNAL_CACHE).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          // If fetch fails, return nothing (or a fallback)
          return new Response('Failed to fetch external resource');
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
          
          return new Response('Resource not available offline');
        });
      })
    );
  } 
  else {
    // Stale While Revalidate (for most assets)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Update the cache with the new response
          caches.open(STATIC_CACHE).then(cache => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
          });
          
          return networkResponse;
        }).catch(error => {
          console.error('Fetch failed:', error);
          throw error;
        });
        
        // Return cached response immediately, or wait for network response
        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Runtime caching for dynamically visited pages
self.addEventListener('fetch', event => {
  // Only cache GET requests from the same origin
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Only cache specific page patterns in this listener
  if (url.pathname.includes('/Mathematics/') && 
      url.pathname.endsWith('.html') && 
      !CORE_PAGES.includes(url.pathname)) {
    
    // Don't let this event listener interfere with the strategies above
    // This is a separate listener only for dynamic page caching
    event.waitUntil(
      fetch(event.request).then(response => {
        if (!response || response.status !== 200) return;
        
        const responseClone = response.clone();
        caches.open(PAGES_CACHE).then(cache => {
          cache.put(event.request, responseClone);
          console.log('Dynamic page cached:', url.pathname);
        });
      }).catch(err => {
        console.error('Failed to cache dynamic page:', err);
      })
    );
  }
});