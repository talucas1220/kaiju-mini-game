// Secure passive service worker to enable mobile app installation ("Install App" prompt)
// Passes all dynamic requests directly to the network to prevent caching errors on staging URLs.
const CACHE_NAME = 'monster-rampage-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Passive pass-through fetch handler satisfies Chrome PWA requirements safely
  event.respondWith(fetch(event.request));
});
