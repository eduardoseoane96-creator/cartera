/* Service worker: cachea la app para que abra al instante y funcione sin señal.
   Los datos de la planilla NO se cachean acá (van a localStorage). */

const CACHE = 'cartera-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Nunca cachear las llamadas a Apps Script: siempre datos frescos.
  if (req.url.indexOf('script.google.com') !== -1 ||
      req.url.indexOf('script.googleusercontent.com') !== -1) return;

  // Logos: cache-first, y si falla no rompe nada.
  if (req.url.indexOf('clearbit.com') !== -1 || req.url.indexOf('s2/favicons') !== -1) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => new Response('', { status: 404 })))
    );
    return;
  }

  // App shell: red primero, cache como respaldo.
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
