(() => {
'use strict';

/* ================= CONFIGURACIÓN ================= */
const FRAME_COUNT = 226;
const INITIAL_FRAME_COUNT = 12;
const FRAME_DIR = 'frame movil/';
const FRAME_URL = index => `${FRAME_DIR}frame_${String(index + 1).padStart(4, '0')}.jpg`;
const RETRIES = 3;
const MAX_DECODE_CONCURRENCY = 4;
const MEMORY_FRAME_LIMIT = 64;
const PRELOADER_SAFE_MS = 8000;
const PRELOADER_HARD_STOP_MS = 12000;
const DESKTOP_VH_PER_FRAME = 7;
const MOBILE_VH_PER_FRAME = 5.2;
const UF_VALUE = 38000;

const LEVELS = [
  { name: 'Esencial', price: 350000 },
  { name: 'Mediterráneo', price: 460000 },
  { name: 'Premium', price: 620000 }
];

const QUOTES = [
  { a: 0 / FRAME_COUNT, b: 78 / FRAME_COUNT },
  { a: 78 / FRAME_COUNT, b: 146 / FRAME_COUNT },
  { a: 146 / FRAME_COUNT, b: 207 / FRAME_COUNT },
  { a: 207 / FRAME_COUNT, b: FRAME_COUNT / FRAME_COUNT }
];

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const pad4 = value => String(value).padStart(4, '0');
const fmtValue = value => Math.round(value / 10000) * 10000;
const fmtCLP = value => '$' + value.toLocaleString('es-CL').replace(/,/g, '.');
const toUF = value => Math.round(value / UF_VALUE);
const coarsePointer = matchMedia('(pointer:coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ================= ESTADO ================= */
const state = {
  frames: new Array(FRAME_COUNT).fill(null),
  loading: new Map(),
  queuedPriorities: new Map(),
  queue: [],
  activeLoads: 0,
  failed: new Set(),
  retryTimers: new Map(),
  retryAttempts: new Map(),
  initialReady: new Set(),
  initialSettled: new Set(),
  decodedCount: 0,
  currentFrame: 0,
  previousFrame: 0,
  lastImage: null,
  lastImageIndex: -1,
  lastUsed: new Array(FRAME_COUNT).fill(0),
  drawRaf: 0,
  targetFrame: 0,
  resizeTimer: 0,
  ready: false,
  preloaderClosed: false,
  cacheStarted: false,
  cacheDone: 0,
  cacheFailed: 0,
  stableWidth: Math.round(window.innerWidth),
  stableHeight: Math.round(window.innerHeight)
};

const canvas = $('#frames');
const context = canvas ? canvas.getContext('2d', { alpha: false, desynchronized: true }) : null;

/* ================= CONTRASTE DE PORTADA ================= */
function injectHeroReadability() {
  if ($('#hero-readability-fix')) return;

  const style = document.createElement('style');
  style.id = 'hero-readability-fix';
  style.textContent = `
    #stage .vig {
      background:
        radial-gradient(95% 72% at 50% 47%, rgba(9,6,4,.08) 0%, rgba(9,6,4,.22) 36%, rgba(9,6,4,.58) 100%),
        linear-gradient(180deg, rgba(8,5,3,.72) 0%, rgba(8,5,3,.12) 26%, rgba(8,5,3,.16) 60%, rgba(8,5,3,.82) 100%) !important;
    }
    #hero::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: min(980px, 94vw);
      height: min(610px, 82vh);
      transform: translate(-50%, -50%);
      border-radius: 46px;
      background: radial-gradient(ellipse at center, rgba(12,8,5,.67) 0%, rgba(12,8,5,.45) 48%, rgba(12,8,5,.10) 78%, transparent 100%);
      pointer-events: none;
    }
    #hero > * { position: relative; z-index: 1; }
    #hero h1 {
      color: #F7F0E6;
      text-shadow: 0 2px 2px rgba(0,0,0,.96), 0 8px 28px rgba(0,0,0,.88), 0 18px 60px rgba(0,0,0,.72) !important;
    }
    #hero .serif-i {
      color: #F4EDE1 !important;
      text-shadow: 0 2px 2px rgba(0,0,0,.96), 0 8px 26px rgba(0,0,0,.86) !important;
    }
    #hero .tag {
      color: #EFE2CF !important;
      font-weight: 400;
      text-shadow: 0 2px 2px rgba(0,0,0,.95), 0 8px 24px rgba(0,0,0,.92) !important;
    }
    #hero .eyebrow {
      color: #FFD79D !important;
      text-shadow: 0 2px 2px rgba(0,0,0,.95), 0 6px 18px rgba(0,0,0,.9) !important;
    }
    @media (max-width: 760px) {
      #hero::before {
        width: 96vw;
        height: 78vh;
        border-radius: 30px;
        background: radial-gradient(ellipse at center, rgba(12,8,5,.76) 0%, rgba(12,8,5,.53) 52%, rgba(12,8,5,.14) 82%, transparent 100%);
      }
      #hero h1 {
        font-size: clamp(38px, 12.8vw, 62px) !important;
        line-height: 1.02;
      }
      #hero .tag {
        max-width: 92vw;
        font-size: 15px !important;
        line-height: 1.55;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ================= MENSAJES DE CARGA ================= */
function initResourceNotice() {
  const preloader = $('#preloader');
  const hint = $('#phint');

  if (hint) hint.textContent = `0000 / ${pad4(INITIAL_FRAME_COUNT)} imágenes iniciales`;

  if (preloader && !$('#resource-note')) {
    const note = document.createElement('p');
    note.id = 'resource-note';
    note.textContent = 'La primera visita descargará recursos visuales. Entrarás cuando estén listas las primeras 12 imágenes; el resto se guardará temporalmente en la caché del navegador para reproducirse con mayor fluidez.';
    Object.assign(note.style, {
      width: 'min(520px, 84vw)',
      margin: '0',
      color: 'rgba(217,196,163,.72)',
      fontSize: '11px',
      lineHeight: '1.65',
      letterSpacing: '.05em',
      textAlign: 'center'
    });
    preloader.insertBefore(note, preloader.querySelector('.mark') || null);
  }

  const consentText = $('#consent p');
  if (consentText) {
    consentText.textContent = 'Para reproducir la experiencia visual, el navegador descargará imágenes y las guardará temporalmente en caché. Esto no recopila información personal. Al aceptar, además autorizas la música ambiental; puedes pausarla cuando quieras.';
  }
}

function getCacheStatus() {
  let element = $('#cache-status');
  if (element) return element;

  element = document.createElement('div');
  element.id = 'cache-status';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  Object.assign(element.style, {
    position: 'fixed',
    left: '50%',
    bottom: '18px',
    zIndex: '145',
    transform: 'translate(-50%, 130%)',
    opacity: '0',
    maxWidth: '92vw',
    padding: '10px 16px',
    border: '1px solid rgba(216,167,99,.3)',
    borderRadius: '999px',
    background: 'rgba(28,22,16,.92)',
    backdropFilter: 'blur(12px)',
    color: '#D9C4A3',
    fontSize: '11px',
    letterSpacing: '.08em',
    textAlign: 'center',
    pointerEvents: 'none',
    transition: 'transform .45s ease, opacity .45s ease'
  });
  document.body.appendChild(element);
  return element;
}

function showCacheStatus(text, autoHide = 0) {
  const element = getCacheStatus();
  element.textContent = text;
  requestAnimationFrame(() => {
    element.style.transform = 'translate(-50%, 0)';
    element.style.opacity = '1';
  });

  clearTimeout(element.__hideTimer);
  if (autoHide > 0) {
    element.__hideTimer = setTimeout(() => {
      element.style.transform = 'translate(-50%, 130%)';
      element.style.opacity = '0';
    }, autoHide);
  }
}

/* ================= CANVAS SIN PANTALLAS NEGRAS ================= */
function getStableViewport() {
  return {
    width: Math.max(1, state.stableWidth || Math.round(window.innerWidth)),
    height: Math.max(1, state.stableHeight || Math.round(window.innerHeight))
  };
}

function sizeCanvas(force = false) {
  if (!canvas || !context) return false;

  const rect = canvas.getBoundingClientRect();
  const stable = getStableViewport();
  const cssWidth = Math.max(1, Math.round(rect.width || stable.width));
  const cssHeight = Math.max(1, Math.round(rect.height || stable.height));
  const dprLimit = coarsePointer ? 1.3 : 1.8;
  const dpr = Math.min(dprLimit, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));

  if (!force && canvas.width === width && canvas.height === height) return false;

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  drawFrame(state.currentFrame);
  return true;
}

function nearestLoaded(index) {
  for (let distance = 0; distance < FRAME_COUNT; distance++) {
    const before = index - distance;
    const after = index + distance;
    if (before >= 0 && state.frames[before]) return before;
    if (after < FRAME_COUNT && state.frames[after]) return after;
  }
  return -1;
}

function paintImage(image, imageIndex) {
  if (!canvas || !context || !image) return false;

  const width = canvas.width;
  const height = canvas.height;
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  if (!width || !height || !imageWidth || !imageHeight) return false;

  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);

  state.lastImage = image;
  state.lastImageIndex = imageIndex;
  if (imageIndex >= 0) state.lastUsed[imageIndex] = performance.now();
  return true;
}

function drawFrame(index) {
  if (!canvas || !context) return;

  const safeIndex = clamp(index, 0, FRAME_COUNT - 1);
  let image = state.frames[safeIndex];
  let imageIndex = safeIndex;

  if (!image) {
    const nearest = nearestLoaded(safeIndex);
    if (nearest >= 0) {
      image = state.frames[nearest];
      imageIndex = nearest;
    }
  }

  if (!image) {
    image = state.lastImage;
    imageIndex = state.lastImageIndex;
  }

  if (image) {
    try {
      paintImage(image, imageIndex);
      return;
    } catch (error) {
      if (state.lastImage && state.lastImage !== image) {
        try {
          paintImage(state.lastImage, state.lastImageIndex);
          return;
        } catch (_) { }
      }
    }
  }

  context.fillStyle = '#14100A';
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function scheduleDraw(index) {
  state.targetFrame = clamp(index, 0, FRAME_COUNT - 1);
  if (state.drawRaf) return;

  state.drawRaf = requestAnimationFrame(() => {
    state.drawRaf = 0;
    drawFrame(state.targetFrame);
  });
}

function scheduleCanvasResize(refreshScroll = false) {
  const shouldRefresh = refreshScroll === true;
  clearTimeout(state.resizeTimer);
  state.resizeTimer = setTimeout(() => {
    sizeCanvas();
    scheduleDraw(state.currentFrame);
    if (shouldRefresh && typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }, 150);
}

/* ================= CARGA PROGRESIVA ================= */
function updateInitialProgress() {
  const ready = state.initialReady.size;
  const progress = clamp(ready / INITIAL_FRAME_COUNT, 0, 1);
  const percent = $('#ppct');
  const hint = $('#phint');
  const fill = $('#pfill');

  if (percent) percent.textContent = String(Math.floor(progress * 100)).padStart(3, '0') + '%';
  if (hint) hint.textContent = `${pad4(ready)} / ${pad4(INITIAL_FRAME_COUNT)} imágenes iniciales`;
  if (fill) fill.style.transform = `scaleX(${progress})`;
}

function evictDistantFrames() {
  if (state.decodedCount <= MEMORY_FRAME_LIMIT) return;

  const keepRadius = coarsePointer ? 16 : 22;
  const candidates = [];

  for (let index = 0; index < FRAME_COUNT; index++) {
    const image = state.frames[index];
    if (!image || image === state.lastImage) continue;

    const distance = Math.abs(index - state.currentFrame);
    if (distance <= keepRadius) continue;
    candidates.push({ index, distance, lastUsed: state.lastUsed[index] || 0 });
  }

  candidates.sort((a, b) => b.distance - a.distance || a.lastUsed - b.lastUsed);

  while (state.decodedCount > MEMORY_FRAME_LIMIT && candidates.length) {
    const { index } = candidates.shift();
    const image = state.frames[index];
    if (!image || image === state.lastImage) continue;

    state.frames[index] = null;
    state.decodedCount--;
    image.onload = null;
    image.onerror = null;
    try { image.src = ''; } catch (_) { }
  }
}

function scheduleFailedRetry(index) {
  if (state.retryTimers.has(index)) return;

  const attempt = (state.retryAttempts.get(index) || 0) + 1;
  state.retryAttempts.set(index, attempt);
  if (attempt > 5) return;

  const delay = Math.min(30000, 2000 * (2 ** (attempt - 1)));
  const timer = setTimeout(() => {
    state.retryTimers.delete(index);
    const priority = Math.abs(index - state.currentFrame) <= 3 ? 1000 : 520;
    queueFrame(index, priority);
  }, delay);
  state.retryTimers.set(index, timer);
}

function clearFailedRetry(index) {
  const timer = state.retryTimers.get(index);
  if (timer) clearTimeout(timer);
  state.retryTimers.delete(index);
  state.retryAttempts.delete(index);
}

function loadFrame(index, retries = RETRIES, highPriority = false) {
  if (index < 0 || index >= FRAME_COUNT) return Promise.resolve(null);

  if (state.frames[index]) {
    state.lastUsed[index] = performance.now();
    return Promise.resolve(state.frames[index]);
  }

  if (state.loading.has(index)) return state.loading.get(index);

  const promise = new Promise(resolve => {
    const attempt = remaining => {
      const image = new Image();
      image.decoding = 'async';
      try { image.fetchPriority = highPriority ? 'high' : 'auto'; } catch (_) { }

      image.onload = async () => {
        try {
          if (typeof image.decode === 'function') await image.decode();
        } catch (_) {
        }

        const firstDecodedCopy = !state.frames[index];
        state.frames[index] = image;
        state.lastUsed[index] = performance.now();
        state.failed.delete(index);
        clearFailedRetry(index);
        if (firstDecodedCopy) state.decodedCount++;

        if (index < INITIAL_FRAME_COUNT) {
          state.initialReady.add(index);
          state.initialSettled.add(index);
          updateInitialProgress();
        }

        if (!state.lastImage || index === 0 || Math.abs(index - state.currentFrame) <= 3) {
          scheduleDraw(state.currentFrame);
        }

        evictDistantFrames();
        resolve(image);
      };

      image.onerror = () => {
        if (remaining > 0) {
          const delay = 180 * (RETRIES - remaining + 1);
          setTimeout(() => attempt(remaining - 1), delay);
          return;
        }

        state.failed.add(index);
        scheduleFailedRetry(index);
        if (index < INITIAL_FRAME_COUNT) {
          state.initialSettled.add(index);
          updateInitialProgress();
        }
        resolve(null);
      };

      image.src = FRAME_URL(index);
    };

    attempt(retries);
  }).finally(() => {
    state.loading.delete(index);
  });

  state.loading.set(index, promise);
  return promise;
}

function queueFrame(index, priority = 0) {
  if (index < 0 || index >= FRAME_COUNT || state.frames[index] || state.loading.has(index)) return;

  const previousPriority = state.queuedPriorities.get(index);
  if (previousPriority !== undefined) {
    if (priority > previousPriority) state.queuedPriorities.set(index, priority);
    return;
  }

  state.queuedPriorities.set(index, priority);
  state.queue.push(index);
  pumpFrameQueue();
}

function pumpFrameQueue() {
  while (state.activeLoads < MAX_DECODE_CONCURRENCY && state.queue.length) {
    state.queue.sort((a, b) => (state.queuedPriorities.get(b) || 0) - (state.queuedPriorities.get(a) || 0));
    const index = state.queue.shift();
    const priority = state.queuedPriorities.get(index) || 0;
    state.queuedPriorities.delete(index);

    if (state.frames[index] || state.loading.has(index)) continue;

    state.activeLoads++;
    loadFrame(index, 2, priority >= 900).finally(() => {
      state.activeLoads--;
      pumpFrameQueue();
    });
  }
}

function requestFrameWindow(center, direction = 1) {
  const forward = direction >= 0 ? 1 : -1;
  queueFrame(center, 1000);

  for (let distance = 1; distance <= 16; distance++) {
    queueFrame(center + distance * forward, 760 - distance * 14);
  }

  for (let distance = 1; distance <= 8; distance++) {
    queueFrame(center - distance * forward, 480 - distance * 16);
  }

  if (state.queue.length > 72) {
    state.queue = state.queue.filter(index =>
      Math.abs(index - center) <= 34 || (!state.preloaderClosed && index < INITIAL_FRAME_COUNT)
    );
    state.queuedPriorities = new Map(
      state.queue.map(index => [index, state.queuedPriorities.get(index) || 0])
    );
  }
}

async function preloadInitialFrames() {
  updateInitialProgress();

  await loadFrame(0, RETRIES, true);
  scheduleDraw(0);

  const pending = Array.from({ length: INITIAL_FRAME_COUNT - 1 }, (_, index) => index + 1);
  const worker = async () => {
    while (pending.length) {
      const index = pending.shift();
      await loadFrame(index, RETRIES, true);
    }
  };

  await Promise.all(Array.from({ length: MAX_DECODE_CONCURRENCY }, worker));
  scheduleDraw(0);
}

function retryMissingInitialFrames() {
  for (let index = 0; index < INITIAL_FRAME_COUNT; index++) {
    if (!state.initialReady.has(index)) queueFrame(index, 980 - index);
  }
}

/* ================= SERVICE WORKER Y CACHÉ ================= */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;

  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });

    navigator.serviceWorker.addEventListener('message', event => {
      const data = event.data || {};

      if (data.type === 'CACHE_PROGRESS') {
        state.cacheDone = data.done || 0;
        state.cacheFailed = data.failed || 0;
        showCacheStatus(`Optimizando recursos visuales · ${state.cacheDone}/${data.total}`);
      } else if (data.type === 'CACHE_COMPLETE') {
        state.cacheDone = data.done || FRAME_COUNT;
        state.cacheFailed = data.failed || 0;
        const message = data.failed
          ? `Caché completada con ${data.failed} recurso(s) pendiente(s); se cargarán cuando sean necesarios.`
          : 'Recursos visuales guardados en caché para una reproducción más fluida.';
        showCacheStatus(message, 4500);
      } else if (data.type === 'CACHE_ERROR') {
        showCacheStatus('No se pudo completar toda la caché. Las imágenes restantes se cargarán bajo demanda.', 5000);
      }
    });

    return registration;
  } catch (error) {
    console.warn('Service Worker no disponible:', error);
    return null;
  }
}

async function startPersistentFrameCache(registrationPromise) {
  if (state.cacheStarted) return;
  state.cacheStarted = true;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && connection.saveData) {
    showCacheStatus('Ahorro de datos activo: las imágenes se cargarán solamente cuando sean necesarias.', 5000);
    return;
  }

  const registration = await registrationPromise;
  if (!registration) return;

  try {
    const readyRegistration = await navigator.serviceWorker.ready;
    const worker = readyRegistration.active || registration.active || registration.waiting;
    if (!worker) return;

    const urls = Array.from({ length: FRAME_COUNT }, (_, index) =>
      new URL(FRAME_URL(index), location.href).href
    );

    showCacheStatus(`Optimizando recursos visuales · ${state.initialReady.size}/${FRAME_COUNT}`);
    worker.postMessage({ type: 'CACHE_FRAMES', urls });
  } catch (error) {
    console.warn('No se pudo iniciar la caché de frames:', error);
  }
}

/* ================= PRELOADER ================= */
function initPreloader(registrationPromise) {
  const preloader = $('#preloader');
  if (!preloader) {
    state.preloaderClosed = true;
    state.ready = true;
    return;
  }

  const startedAt = performance.now();

  const close = () => {
    if (state.preloaderClosed) return;
    state.preloaderClosed = true;
    preloader.classList.add('done');

    setTimeout(() => {
      state.ready = true;
      requestFrameWindow(state.currentFrame, 1);
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();

      const startCache = () => startPersistentFrameCache(registrationPromise);
      if ('requestIdleCallback' in window) {
        requestIdleCallback(startCache, { timeout: 1800 });
      } else {
        setTimeout(startCache, 700);
      }
    }, 650);
  };

  const tick = now => {
    const elapsed = now - startedAt;
    const readyCount = state.initialReady.size;
    const allInitialReady = readyCount >= INITIAL_FRAME_COUNT;
    const anyFrameReady = !!state.lastImage || state.frames.some(Boolean);
    const safeFallback = elapsed >= PRELOADER_SAFE_MS && anyFrameReady;
    const terminalFallback = elapsed >= PRELOADER_HARD_STOP_MS;

    if (allInitialReady || safeFallback || terminalFallback) {
      if (!allInitialReady) {
        retryMissingInitialFrames();
        if (anyFrameReady) scheduleDraw(state.currentFrame);

        const missing = Math.max(0, INITIAL_FRAME_COUNT - readyCount);
        const message = anyFrameReady
          ? `Entrando con ${readyCount}/${INITIAL_FRAME_COUNT} imágenes listas · ${missing} continúan cargando en segundo plano.`
          : 'La conexión está demorando más de lo esperado. El sitio abrirá y continuará cargando los recursos en segundo plano.';
        showCacheStatus(message, 5200);
      }

      close();
      return;
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

/* ================= SECUENCIA POR SCROLL ================= */
function initReel() {
  if (!canvas) return;

  const reel = $('#reel');
  const stage = $('#stage');
  const hero = $('#hero');
  const counter = $('#fcount b');
  if (!reel || !stage) return;

  let layoutWidth = Math.round(window.innerWidth);
  let layoutHeight = Math.round(window.innerHeight);

  const updateStableLayout = (force = false) => {
    const nextWidth = Math.round(window.innerWidth);
    const nextHeight = Math.round(window.innerHeight);
    const widthChanged = Math.abs(nextWidth - layoutWidth) > 2;
    const significant = force || !coarsePointer || widthChanged;

    if (!significant) return false;

    layoutWidth = nextWidth;
    layoutHeight = nextHeight;
    state.stableWidth = nextWidth;
    state.stableHeight = nextHeight;

    const vhPerFrame = coarsePointer ? MOBILE_VH_PER_FRAME : DESKTOP_VH_PER_FRAME;
    const scrollDistance = FRAME_COUNT * vhPerFrame * layoutHeight / 100;
    stage.style.height = `${layoutHeight}px`;
    reel.style.height = `${layoutHeight + scrollDistance}px`;
    return true;
  };

  updateStableLayout(true);
  sizeCanvas(true);

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    scheduleDraw(0);
    state.ready = true;
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: reel,
      start: 'top top',
      end: 'bottom bottom',
      pin: stage,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: self => {
        const index = clamp(Math.round(self.progress * (FRAME_COUNT - 1)), 0, FRAME_COUNT - 1);

        if (index !== state.currentFrame) {
          const direction = index >= state.currentFrame ? 1 : -1;
          state.previousFrame = state.currentFrame;
          state.currentFrame = index;
          scheduleDraw(index);
          requestFrameWindow(index, direction);
        } else if (!state.frames[index]) {
          queueFrame(index, 1000);
          scheduleDraw(index);
        }

        if (counter) counter.textContent = pad4(index + 1);
      }
    }
  });

  timeline
    .to('#hero', { opacity: 0, y: -60, duration: 0.16, ease: 'power2.out' }, 0.02)
    .to('#scrollhint', { opacity: 0, duration: 0.1 }, 0.02);

  QUOTES.forEach((quote, index) => {
    const element = document.querySelector(`.quote[data-window="${index}"]`);
    if (!element) return;

    const length = quote.b - quote.a;
    timeline
      .fromTo(
        element,
        { opacity: 0, visibility: 'hidden' },
        { opacity: 1, visibility: 'visible', duration: length * 0.34, ease: 'power1.out' },
        quote.a
      )
      .to(element, { opacity: 0, duration: length * 0.26, ease: 'power1.in' }, quote.b - length * 0.26);
  });

  if (hero) {
    gsap.fromTo(
      hero.querySelectorAll('.reveal'),
      { opacity: 0, y: 36 },
      {
        opacity: 1,
        y: 0,
        duration: 1.4,
        stagger: 0.16,
        ease: 'power3.out',
        delay: 0.25,
        scrollTrigger: { trigger: reel, start: 'top top', end: '+=40%', toggleActions: 'play none none none' }
      }
    );
  }

  const handleViewportResize = () => {
    const layoutChanged = updateStableLayout(false);
    scheduleCanvasResize(layoutChanged);
  };

  window.addEventListener('resize', handleViewportResize, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportResize, { passive: true });
  }

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateStableLayout(true);
      scheduleCanvasResize(true);
    }, 200);
  }, { passive: true });
}

/* ================= ANIMACIONES COMPLEMENTARIAS ================= */
function initReveals() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    $$('.reveal').forEach(element => element.classList.remove('reveal'));
    return;
  }

  $$('.reveal').forEach(element => {
    if (element.closest('#stage')) return;
    gsap.to(element, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 86%', once: true }
    });
  });
}

function initLenis() {
  if (typeof Lenis === 'undefined' || coarsePointer || reducedMotion || typeof gsap === 'undefined') return;

  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', () => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update();
  });
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;
}

function scrollToTarget(target) {
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scrollTo === 'function') {
    try {
      lenis.scrollTo(target, { duration: 1.6 });
      return;
    } catch (_) {
    }
  }

  const element = typeof target === 'string' ? $(target) : target;
  if (element) element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

function initParticles() {
  if (typeof THREE === 'undefined' || reducedMotion) return;

  const particleCanvas = $('#particles');
  if (!particleCanvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: particleCanvas,
      alpha: true,
      antialias: !coarsePointer,
      powerPreference: 'low-power'
    });
  } catch (_) {
    return;
  }

  renderer.setPixelRatio(Math.min(coarsePointer ? 1.1 : 1.6, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 9;

  const count = coarsePointer ? 30 : 90;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);

  for (let index = 0; index < count; index++) {
    positions[index * 3] = (Math.random() - 0.5) * 14;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 9;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 6;
    speeds[index] = 0.1 + Math.random() * 0.35;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xD8A763,
    size: 0.05,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();

  let previous = 0;
  const loop = now => {
    requestAnimationFrame(loop);
    if (document.hidden || now - previous < (coarsePointer ? 40 : 17)) return;
    previous = now;

    const attribute = geometry.attributes.position;
    for (let index = 0; index < count; index++) {
      let y = attribute.array[index * 3 + 1] - speeds[index] * 0.012;
      if (y < -4.5) y = 4.5;
      attribute.array[index * 3 + 1] = y;
    }
    attribute.needsUpdate = true;
    points.rotation.y += 0.0006;
    renderer.render(scene, camera);
  };

  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(loop);
}

function initFx() {
  const fxCanvas = $('#fx-canvas');
  if (!fxCanvas) return;

  const fxContext = fxCanvas.getContext('2d');
  if (!fxContext) return;

  let width = 0;
  let height = 0;
  let gradient = null;

  const resize = () => {
    const scale = coarsePointer ? 0.68 : 1;
    width = fxCanvas.width = Math.max(1, Math.round(window.innerWidth * scale));
    height = fxCanvas.height = Math.max(1, Math.round(window.innerHeight * scale));
    gradient = fxContext.createRadialGradient(
      width / 2,
      height * 0.44,
      Math.min(width, height) * 0.42,
      width / 2,
      height * 0.44,
      Math.max(width, height) * 0.78
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(10,7,4,.5)');
    fxContext.clearRect(0, 0, width, height);
    fxContext.fillStyle = gradient;
    fxContext.fillRect(0, 0, width, height);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (coarsePointer || reducedMotion) return;

  const noise = document.createElement('canvas');
  noise.width = 128;
  noise.height = 72;
  const noiseContext = noise.getContext('2d');
  const data = noiseContext.createImageData(128, 72);
  let tick = 0;

  const loop = () => {
    requestAnimationFrame(loop);
    if (document.hidden || ++tick % 5 !== 0) return;

    for (let index = 0; index < data.data.length; index += 4) {
      const value = 14 + Math.random() * 20;
      data.data[index] = value;
      data.data[index + 1] = value;
      data.data[index + 2] = value;
      data.data[index + 3] = 12;
    }

    noiseContext.putImageData(data, 0, 0);
    fxContext.clearRect(0, 0, width, height);
    fxContext.fillStyle = gradient;
    fxContext.fillRect(0, 0, width, height);
    fxContext.globalCompositeOperation = 'overlay';
    fxContext.drawImage(noise, 0, 0, width, height);
    fxContext.globalCompositeOperation = 'source-over';
  };

  requestAnimationFrame(loop);
}

/* ================= CALCULADORA Y FORMULARIOS ================= */
function initCalculator() {
  const range = $('#m2range');
  const m2Value = $('#m2val');
  const totalElement = $('#total');
  const totalUF = $('#totaluf');
  const rows = $('#minirows');
  const chips = $$('#m2chips .chip');
  const levelButtons = $$('#levels .level');
  const whatsapp = $('#calc-wa');
  if (!range || !m2Value || !totalElement || !totalUF || !rows || !whatsapp) return;

  let squareMeters = Number(range.value) || 120;
  let selectedLevel = 1;

  const whatsappHref = () => {
    const level = LEVELS[selectedLevel];
    const total = fmtValue(squareMeters * level.price);
    const message = `Hola Constructora Gajardo 👋\nQuiero cotizar mi proyecto:\n• Superficie: ${squareMeters} m²\n• Nivel: ${level.name}\n• Valor estimado: ${fmtCLP(total)} (≈ UF ${toUF(total)})\nMe gustaría conversar los detalles.`;
    return 'https://wa.me/56935740315?text=' + encodeURIComponent(message);
  };

  const update = () => {
    const level = LEVELS[selectedLevel];
    const total = fmtValue(squareMeters * level.price);
    m2Value.innerHTML = `${squareMeters}<small> m²</small>`;
    totalElement.textContent = fmtCLP(total);
    totalUF.textContent = `≈ UF ${toUF(total).toLocaleString('es-CL')}`;
    levelButtons.forEach((button, index) => button.classList.toggle('on', index === selectedLevel));
    chips.forEach(chip => chip.classList.toggle('on', Number(chip.dataset.m2) === squareMeters));
    rows.innerHTML = LEVELS.map((item, index) =>
      `<div class="minirow${index === selectedLevel ? ' on' : ''}"><span>${item.name} · ${squareMeters} m²</span><b>${fmtCLP(fmtValue(squareMeters * item.price))}</b></div>`
    ).join('');
    whatsapp.href = whatsappHref();
  };

  range.addEventListener('input', () => {
    squareMeters = Number(range.value);
    update();
  });

  chips.forEach(chip => chip.addEventListener('click', () => {
    squareMeters = Number(chip.dataset.m2);
    range.value = String(squareMeters);
    update();
  }));

  levelButtons.forEach((button, index) => button.addEventListener('click', () => {
    selectedLevel = index;
    update();
  }));

  update();
}

function submitCalculator() {
  const name = $('#q-name')?.value.trim() || '';
  const phone = $('#q-phone')?.value.trim() || '';
  const details = $('#q-msg')?.value.trim() || '';
  const squareMeters = Number($('#m2range')?.value || 120);
  const selectedLevel = Number(document.querySelector('#levels .level.on')?.dataset.level ?? 1);
  const level = LEVELS[selectedLevel] || LEVELS[1];
  const total = fmtValue(squareMeters * level.price);

  let message = 'Hola Constructora Gajardo 👋\n';
  if (name) message += `Soy ${name}.\n`;
  if (phone) message += `Mi WhatsApp: ${phone}\n`;
  message += `Quiero cotizar mi proyecto:\n• Superficie: ${squareMeters} m²\n• Nivel: ${level.name}\n• Valor estimado: ${fmtCLP(total)} (≈ UF ${toUF(total)})\n`;
  if (details) message += `Detalles: ${details}\n`;
  message += '¿Podemos agendar una visita?';

  window.open('https://wa.me/56935740315?text=' + encodeURIComponent(message), '_blank', 'noopener');
}

function submitContact(event) {
  event.preventDefault();
  const name = $('#c-name')?.value.trim() || '';
  const phone = $('#c-phone2')?.value.trim() || '';
  const service = $('#c-svc')?.value || 'Otro';
  const details = $('#c-msg')?.value.trim() || '';

  let message = 'Hola Constructora Gajardo 👋\n';
  if (name) message += `Soy ${name}.\n`;
  if (phone) message += `Mi WhatsApp: ${phone}\n`;
  message += `Me interesa: ${service}.\n`;
  if (details) message += details + '\n';

  window.open('https://wa.me/56935740315?text=' + encodeURIComponent(message), '_blank', 'noopener');
}

/* ================= INTERFAZ ================= */
function initCounters() {
  if (typeof gsap === 'undefined') return;

  $$('[data-count]').forEach(element => {
    const target = Number(element.dataset.count);
    if (!target) return;

    const value = { current: 0 };
    gsap.to(value, {
      current: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      onUpdate: () => { element.textContent = String(Math.round(value.current)); }
    });
  });
}

function initNav() {
  const nav = $('#nav');
  const burger = $('#burger');
  const menu = $('#mmenu');
  if (!nav || !burger || !menu) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  const close = () => {
    menu.classList.remove('open');
    burger.classList.remove('open');
  };

  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.classList.toggle('open', open);
  });

  menu.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    event.preventDefault();
    close();
    scrollToTarget(link.getAttribute('href'));
  });

  $$('#nav .links a').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    scrollToTarget(link.getAttribute('href'));
  }));

  $$('[data-goto]').forEach(button => button.addEventListener('click', () => {
    scrollToTarget(button.dataset.goto);
  }));
}

function initMusic() {
  const button = $('#fab-music');
  if (!button) return { play() {} };

  const audio = new Audio('audio/bg-music.mp3');
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0;
  let started = false;
  let pauseTimer = 0;

  const fade = (target, duration) => {
    const from = audio.volume;
    const startedAt = performance.now();

    const step = now => {
      const progress = clamp((now - startedAt) / (duration * 1000), 0, 1);
      audio.volume = from + (target - from) * progress;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const play = () => {
    clearTimeout(pauseTimer);
    started = true;
    audio.play().catch(() => {});
    fade(0.3, 2.2);
  };

  button.addEventListener('click', () => {
    if (audio.paused) {
      play();
      button.classList.add('playing');
      return;
    }

    fade(0, 1);
    pauseTimer = setTimeout(() => audio.pause(), 1100);
    button.classList.remove('playing');
  });

  return {
    play() {
      if (!started || audio.paused) play();
    }
  };
}

function initConsent(music) {
  const element = $('#consent');
  if (!element) return;

  const key = 'cg_consent_v1';
  const stored = localStorage.getItem(key);
  if (stored === 'accepted' || stored === 'declined') {
    element.remove();
    return;
  }

  setTimeout(() => element.classList.add('show'), 1400);

  $('#consent-accept')?.addEventListener('click', () => {
    localStorage.setItem(key, 'accepted');
    element.classList.remove('show');
    setTimeout(() => element.remove(), 700);
    music.play();
    $('#fab-music')?.classList.add('playing');
  });

  $('#consent-decline')?.addEventListener('click', () => {
    localStorage.setItem(key, 'declined');
    element.classList.remove('show');
    setTimeout(() => element.remove(), 700);
  });
}

/* ================= ARRANQUE ================= */
function boot() {
  injectHeroReadability();
  initResourceNotice();
  sizeCanvas(true);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    scheduleDraw(state.currentFrame);
    requestFrameWindow(state.currentFrame, state.currentFrame >= state.previousFrame ? 1 : -1);
  });

  const registrationPromise = registerServiceWorker();
  preloadInitialFrames().catch(error => {
    console.warn('No se pudo completar la precarga inicial:', error);
  });
  initPreloader(registrationPromise);
  initReel();
  initReveals();
  initLenis();
  initParticles();
  initFx();
  initCalculator();
  initCounters();
  initNav();

  const music = initMusic();
  initConsent(music);

  $('#q-send')?.addEventListener('click', submitCalculator);
  $('#contact-form')?.addEventListener('submit', submitContact);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

/* ================= DIAGNÓSTICO ================= */
window.__loaded = () => state.initialReady.size;
window.__frameState = () => ({
  current: state.currentFrame + 1,
  decoded: state.decodedCount,
  initialLoaded: state.initialReady.size,
  initialSettled: state.initialSettled.size,
  cacheDone: state.cacheDone,
  cacheFailed: state.cacheFailed,
  failed: Array.from(state.failed),
  scheduledRetries: state.retryTimers.size
});

if (location.search.includes('test=1')) {
  setTimeout(() => window.scrollTo(0, 1200), 2500);
  setTimeout(() => { document.title = `TEST1 f${state.currentFrame + 1} decoded${state.decodedCount}`; }, 4500);
  setTimeout(() => window.scrollTo(0, 6000), 5500);
  setTimeout(() => { document.title = `TEST2 f${state.currentFrame + 1} decoded${state.decodedCount}`; }, 7500);
  setTimeout(() => window.scrollTo(0, 20000), 8500);
  setTimeout(() => { document.title = `TEST3 f${state.currentFrame + 1} decoded${state.decodedCount}`; }, 10500);
}

})();
