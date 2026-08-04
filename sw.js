'use strict';

const VERSION = 'v5';
const SHELL_CACHE = `cg-shell-${VERSION}`;
const FRAME_CACHE = `cg-frames-${VERSION}`;
const CACHE_PREFIX = 'cg-';
const SHELL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './assets/logo.svg',
  './assets/favicon.svg',
  './assets/site.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(SHELL_ASSETS.map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, FRAME_CACHE].includes(name))
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

function isFrameRequest(requestUrl) {
  const url = new URL(requestUrl);
  return url.origin === self.location.origin &&
    (url.pathname.includes('/frame%20movil/') || url.pathname.includes('/frame movil/')) &&
    /frame_\d{4}\.jpg$/i.test(url.pathname);
}

function isShellRequest(requestUrl) {
  const url = new URL(requestUrl);
  if (url.origin !== self.location.origin) return false;
  return /\.(?:js|css|svg|png|webmanifest|mp3)$/i.test(url.pathname) ||
    url.pathname.endsWith('/constructora-gajardo/');
}

async function cacheFirst(request) {
  const cache = await caches.open(FRAME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

function staleWhileRevalidate(request, event) {
  const cachePromise = caches.open(SHELL_CACHE);
  const networkUpdate = cachePromise.then(async cache => {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  });

  event.waitUntil(networkUpdate.then(() => undefined).catch(() => undefined));

  return cachePromise.then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const network = await networkUpdate.catch(() => null);
    return network || Response.error();
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (isFrameRequest(request.url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isShellRequest(request.url)) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});

async function postToClients(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}

let cacheJob = null;

async function cacheFrameList(urls) {
  const uniqueUrls = Array.from(new Set(urls)).filter(url => {
    try {
      return new URL(url).origin === self.location.origin;
    } catch (_) {
      return false;
    }
  });

  const total = uniqueUrls.length;
  let done = 0;
  let failed = 0;
  const queue = uniqueUrls.slice();
  const cache = await caches.open(FRAME_CACHE);

  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      const request = new Request(url, { credentials: 'same-origin' });

      try {
        const exists = await cache.match(request);
        if (!exists) {
          const response = await fetch(request);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await cache.put(request, response.clone());
        }
      } catch (_) {
        failed++;
      } finally {
        done++;
        if (done === total || done % 4 === 0) {
          await postToClients({ type: 'CACHE_PROGRESS', done, failed, total });
        }
      }
    }
  };

  await Promise.all(Array.from({ length: 3 }, worker));
  await postToClients({ type: 'CACHE_COMPLETE', done, failed, total });
}

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type !== 'CACHE_FRAMES' || !Array.isArray(data.urls)) return;

  if (!cacheJob) {
    cacheJob = cacheFrameList(data.urls)
      .catch(async error => {
        await postToClients({
          type: 'CACHE_ERROR',
          message: String(error && error.message || error)
        });
      })
      .finally(() => {
        cacheJob = null;
      });
  }

  event.waitUntil(cacheJob);
});
