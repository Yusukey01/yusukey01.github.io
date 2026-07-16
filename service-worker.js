/* v4:
 *  - FIX (stale-while-revalidate): networkResponse.clone() ran inside
 *    caches.open().then(...), i.e. AFTER the response body had been handed
 *    to the page and consumption had begun -> "Response body is already
 *    used" on every revalidation, so SWR cache entries could NEVER update:
 *    once a JS/CSS file was cached, later deploys were invisible. The clone
 *    is now taken synchronously before any async step.
 *  - Cache version bumped so activate() purges the stale v3 entries.
 *
 * NOTE (v4): the site does NOT version asset URLs (no ?v= query — a
 * v3-era comment here wrongly claimed otherwise). With the SWR clone
 * fix, cached JS/CSS is at most ONE page-load stale: the stale copy is
 * served while the network copy replaces it for the next load.
 *
 * v3 (first version actually controlling the site — the worker previously
 * lived under /js/ and its scope never covered any page):
 *  - JS/CSS removed from the precache list; runtime stale-while-revalidate
 *    handles them instead.
 *  - Ad/analytics hosts fully bypass the worker (never cache ads).
 *  - Same-origin JSON (/data/*.json etc.) is network-first so a freshly
 *    published curriculum/previews update is never masked by cache.
 *  - ml.html added to core pages; offline fallback hardened; opaque
 *    cross-origin responses cacheable; HTML network-first gets a timeout.
 */
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGES_CACHE = `pages-${CACHE_VERSION}`;
const EXTERNAL_CACHE = `external-${CACHE_VERSION}`;
const MATH_CACHE = `math-${CACHE_VERSION}`;

// Core application shell assets - 
const APP_SHELL = [
  '/',
  '/index.html',
  /* JS/CSS intentionally NOT precached — see v3 note above. */
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
  '/Mathematics/Discrete/discrete_math.html',
  '/Mathematics/Machine_learning/ml.html'
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

  // Ads & analytics: never intercept, never cache.
  if (requestURL.hostname.includes('googlesyndication') ||
      requestURL.hostname.includes('doubleclick') ||
      requestURL.hostname.includes('google-analytics') ||
      requestURL.hostname.includes('googletagmanager')) {
    return 'bypass';
  }

  // Same-origin JSON data (curriculum.json, previews.json, updates.json,
  // references.json ...): the site publishes frequently — always prefer
  // the network so a fresh deploy is visible on the first load.
  if (requestURL.origin === self.location.origin &&
      requestURL.pathname.endsWith('.json')) {
    return 'network-first';
  }

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

  if (strategy === 'bypass') {
    return;  // let the browser handle it natively
  }

  if (strategy === 'cache-first') {
    // Cache First Strategy (for external libraries, fonts, images, etc.)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then(networkResponse => {
          // Accept opaque (cross-origin no-cors) responses too — they
          // report status 0 but are perfectly cacheable.
          const cacheable = networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === 'opaque');
          if (!cacheable) {
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
    // Network First Strategy (for HTML pages and same-origin JSON),
    // with a timeout so a cached copy is served on very slow networks.
    const NETWORK_TIMEOUT_MS = 3500;
    event.respondWith(
      Promise.race([
        fetch(event.request),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('network timeout')), NETWORK_TIMEOUT_MS))
      ]).then(networkResponse => {
        // Clone the response to cache it
        const responseToCache = networkResponse.clone();
        
        caches.open(PAGES_CACHE).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // If network fails (or times out), try the cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If it's a navigation request, show the offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html').then(offline =>
              offline || new Response(
                '<h1>Offline</h1><p>This page is not available offline.</p>',
                { status: 503, headers: { 'Content-Type': 'text/html' } }
              ));
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
          // Update the cache with the new response. The clone MUST be taken
          // synchronously, BEFORE returning the response to the page: once
          // the page starts consuming the body, clone() throws ("Response
          // body is already used") and the cache silently never updates.
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(event.request, responseToCache);
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