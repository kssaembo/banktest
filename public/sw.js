const CACHE_NAME = 'class-bank-static-v3-20260908';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/icon-maskable-512.png',
  '/pwa/apple-touch-icon.png',
  '/pwa/splash.webp'
];

async function precacheCurrentBuild() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(APP_SHELL.map(path => cache.add(path)));

  // Vite creates new hashed JS/CSS filenames on each build. Discover those files
  // from the current HTML so a freshly installed app can reopen offline.
  const response = await fetch('/', { cache: 'no-store' });
  if (!response.ok) return;
  await cache.put('/', response.clone());
  const html = await response.text();
  const assetPaths = Array.from(html.matchAll(/(?:src|href)=["']([^"']+)["']/g), match => match[1])
    .filter(path => path.startsWith('/') && !/^\/(?:api|auth|rest|functions|realtime|storage)\//.test(path));
  await Promise.allSettled([...new Set(assetPaths)].map(path => cache.add(path)));
}

self.addEventListener('install', event => {
  event.waitUntil(precacheCurrentBuild().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('class-bank-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authentication, transactions and server functions must always use live data.
  if (/^\/(api|auth|rest|functions|realtime|storage)\//.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('/', response.clone()));
          return response;
        })
        .catch(async () => (await caches.match('/')) || new Response('오프라인 상태입니다.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }))
    );
    return;
  }

  const staticAsset = ['script', 'style', 'image', 'font', 'audio'].includes(request.destination)
    || /\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|mp3|wav)$/i.test(url.pathname);
  if (!staticAsset) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(url.pathname, { ignoreSearch: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(url.pathname, response.clone()));
      return response;
    })()
  );
});
