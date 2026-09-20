/**
 * Service Worker for Vietnam Accounting Learning Web (Học Kế Toán Việt Nam 30 Ngày)
 * Standard W3C Offline-First PWA Implementation
 * - App Shell caching (HTML, CSS, JS, SVG assets)
 * - External Google Fonts caching (fonts.googleapis.com & fonts.gstatic.com)
 * - Versioned cache management with automatic cleanup of stale caches
 * - Seamless offline fallback for navigation and static assets
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE_NAME = `vnacc-app-shell-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `vnacc-dynamic-${CACHE_VERSION}`;
const FONT_CACHE_NAME = `vnacc-fonts-${CACHE_VERSION}`;

const CURRENT_CACHES = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, FONT_CACHE_NAME];

// Core App Shell Assets for Pre-caching
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
];

// Google Fonts Domains
const GOOGLE_FONT_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// 1. Install Event: Precache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.warn('[ServiceWorker] Precache failed during install:', error);
      })
  );
});

// 2. Activate Event: Clean up stale caches from older versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.startsWith('vnacc-') &&
              !CURRENT_CACHES.includes(cacheName)
            ) {
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Helper: Check if URL belongs to Google Fonts
function isGoogleFontRequest(url) {
  return GOOGLE_FONT_DOMAINS.some((domain) => url.hostname.includes(domain));
}

// Helper: Check if request is a navigation request
function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept') &&
      request.headers.get('accept').includes('text/html'))
  );
}

// 3. Fetch Event: Multi-tier offline caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests and http/https schemes
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Strategy A: External Google Fonts (Stale-While-Revalidate)
  if (isGoogleFontRequest(url)) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Network offline - cachedResponse will be returned
              return cachedResponse;
            });

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategy B: Navigation Requests (Network-First with App Shell Cache Fallback)
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: serve cached index.html or root
          const cachedIndex =
            (await caches.match('/index.html')) ||
            (await caches.match('/'));
          if (cachedIndex) return cachedIndex;

          return new Response(
            '<!DOCTYPE html><html><body><h1>Ngoại Tuyến</h1><p>Ứng dụng đang hoạt động ở chế độ ngoại tuyến.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Strategy C: Static Assets - JS, CSS, SVG, Images (Cache-First with Stale-While-Revalidate fallback)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Revalidate in background if online
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Network failure ignored, served from cache
          });
        return cachedResponse;
      }

      // Not in cache: fetch from network and store in dynamic cache
      return fetch(request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === 'opaque'
          ) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached
          return new Response('Tài nguyên ngoại tuyến không khả dụng', {
            status: 503,
            statusText: 'Service Unavailable (Offline)',
          });
        });
    })
  );
});
