(() => {
'use strict';

/* ================= CONSTANTES ================= */
const FRAME_COUNT = 226;
const INITIAL_FRAME_COUNT = 20;
const FRAME_DIR = 'frame movil/';
const FRAME_URL = i => FRAME_DIR + 'frame_' + String(i).padStart(4, '0') + '.jpg';
const VH_PER_FRAME = 7;
const PRELOADER_SAFE = 15000;
const RETRIES = 3;
const MAX_DECODE_CONCURRENCY = 3;
const MEMORY_FRAME_LIMIT = 52;
const UF_VALUE = 38000;
const LEVELS = [
  { name: 'Esencial', price: 350000 },
  { name: 'Mediterráneo', price: 460000 },
  { name: 'Premium', price: 620000 }
];
const QUOTES = [
  { a: 0 / 226, b: 78 / 226 },
  { a: 78 / 226, b: 146 / 226 },
  { a: 146 / 226, b: 207 / 226 },
  { a: 207 / 226, b: 226 / 226 }
];

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad4 = n => String(n).padStart(4, '0');
const fmtV = v => Math.round(v / 10000) * 10000;
const fmtCLP = v => '$' + v.toLocaleString('es-CL').replace(/,/g, '.');
const uf = v => Math.round(v / UF_VALUE);
const isCoarsePointer = matchMedia('(pointer:coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ================= ESTADO ================= */
const state = {
  frames: new Array(FRAME_COUNT).fill(null),
  loading: new Map(),
  queued: new Map(),
  queue: [],
  activeLoads: 0,
  failed: new Set(),
  initialLoaded: 0,
  frameIdx: 0,
  lastFrameIdx: 0,
  lastImage: null,
  lastUsed: new Array(FRAME_COUNT).fill(0),
  decodedCount: 0,
  ready: false,
  preloaderClosed: false,
  scrollTotal: 0,
  resizeTimer: 0,
  drawRaf: 0,
  targetDrawIdx: 0,
  cacheStarted: false,
  cacheDone: 0,
  cacheFailed: 0
};

const canvas = $('#frames');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

/* ================= AVISO DE RECURSOS ================= */
function initResourceNotice() {
  const preloader = $('#preloader');
  const hint = $('#phint');
  if (hint) hint.textContent = `0000 / ${pad4(INITIAL_FRAME_COUNT)} imágenes iniciales`;

  if (preloader && !$('#resource-note')) {
    const note = document.createElement('p');
    note.id = 'resource-note';
    note.textContent = 'La primera visita descargará recursos visuales. Entrarás cuando estén listas las primeras 20 imágenes; el resto se guardará en la caché del navegador para una reproducción más fluida.';
    Object.assign(note.style, {
      width: 'min(520px, 84vw)',
      margin: '0',
      color: 'rgba(217,196,163,.72)',
      fontSize: '11px',
      lineHeight: '1.65',
      letterSpacing: '.05em',
      textAlign: 'center'
    });
    const mark = preloader.querySelector('.mark');
    preloader.insertBefore(note, mark || null);
  }

  const consentText = $('#consent p');
  if (consentText) {
    consentText.textContent = 'Para reproducir la experiencia visual, el navegador descargará imágenes y las guardará temporalmente en caché. Esto no recopila información personal. Al aceptar, además autorizas la reproducción de la música ambiental; puedes pausarla cuando quieras.';
  }
}

function createCacheStatus() {
  if ($('#cache-status')) return $('#cache-status');
  const el = document.createElement('div');
  el.id = 'cache-status';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  Object.assign(el.style, {
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
  document.body.appendChild(el);
  return el;
}

function showCacheStatus(text, autoHide = 0) {
  const el = createCacheStatus();
  el.textContent = text;
  requestAnimationFrame(() => {
    el.style.transform = 'translate(-50%, 0)';
    el.style.opacity = '1';
  });
  clearTimeout(el.__hideTimer);
  if (autoHide) {
    el.__hideTimer = setTimeout(() => {
      el.style.transform = 'translate(-50%, 130%)';
      el.style.opacity = '0';
    }, autoHide);
  }
}

/* ================= CANVAS SIN DESTELLOS NEGROS ================= */
function sizeCanvas(force = false) {
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(rect.width || window.innerWidth));
  const cssH = Math.max(1, Math.round(rect.height || window.innerHeight));
  const dprCap = isCoarsePointer ? 1.35 : 1.8;
  const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
  const nextW = Math.max(1, Math.round(cssW * dpr));
  const nextH = Math.max(1, Math.round(cssH * dpr));

  if (!force && canvas.width === nextW && canvas.height === nextH) return false;
  canvas.width = nextW;
  canvas.height = nextH;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawFrame(state.frameIdx);
  return true;
}

function scheduleResize() {
  clearTimeout(state.resizeTimer);
  state.resizeTimer = setTimeout(() => {
    sizeCanvas();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }, 140);
}

function nearestLoaded(idx) {
  for (let d = 0; d < FRAME_COUNT; d++) {
    if (idx - d >= 0 && state.frames[idx - d]) return idx - d;
    if (idx + d < FRAME_COUNT && state.frames[idx + d]) return idx + d;
  }
  return -1;
}

function drawFrame(idx) {
  const safeIdx = clamp(idx, 0, FRAME_COUNT - 1);
  let img = state.frames[safeIdx];
  let usedIdx = safeIdx;

  if (!img) {
    const near = nearestLoaded(safeIdx);
    if (near >= 0) {
      img = state.frames[near];
      usedIdx = near;
    }
  }
  if (!img) img = state.lastImage;

  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return;

  if (!img) {
    ctx.fillStyle = '#14100A';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  try {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    state.lastImage = img;
    state.lastUsed[usedIdx] = performance.now();
  } catch (error) {
    if (state.lastImage && state.lastImage !== img) {
      try {
        const iw = state.lastImage.naturalWidth || state.lastImage.width;
        const ih = state.lastImage.naturalHeight || state.lastImage.height;
        const scale = Math.max(w / iw, h / ih);
        ctx.drawImage(state.lastImage, (w - iw * scale) / 2, (h - ih * scale) / 2, iw * scale, ih * scale);
      } catch (_) { }
    }
  }
}

function scheduleDraw(idx) {
  state.targetDrawIdx = clamp(idx, 0, FRAME_COUNT - 1);
  if (state.drawRaf) return;
  state.drawRaf = requestAnimationFrame(() => {
    state.drawRaf = 0;
    drawFrame(state.targetDrawIdx);
  });
}

/* ================= MEMORIA Y CARGA DE FRAMES ================= */
function evictDistantFrames() {
  if (state.decodedCount <= MEMORY_FRAME_LIMIT) return;
  const keepRadius = isCoarsePointer ? 14 : 20;
  const candidates = [];

  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = state.frames[i];
    if (!img || img === state.lastImage) continue;
    const distance = Math.abs(i - state.frameIdx);
    if (distance <= keepRadius) continue;
    candidates.push({ i, distance, used: state.lastUsed[i] || 0 });
  }

  candidates.sort((a, b) => b.distance - a.distance || a.used - b.used);
  while (state.decodedCount > MEMORY_FRAME_LIMIT && candidates.length) {
    const { i } = candidates.shift();
    const img = state.frames[i];
    if (!img) continue;
    state.frames[i] = null;
    state.decodedCount--;
    img.onload = null;
    img.onerror = null;
    try { img.src = ''; } catch (_) { }
  }
}

function updateInitialProgress() {
  const pctEl = $('#ppct');
  const hintEl = $('#phint');
  const fillEl = $('#pfill');
  const progress = clamp(state.initialLoaded / INITIAL_FRAME_COUNT, 0, 1);
  if (pctEl) pctEl.textContent = String(Math.floor(progress * 100)).padStart(3, '0') + '%';
  if (hintEl) hintEl.textContent = `${pad4(state.initialLoaded)} / ${pad4(INITIAL_FRAME_COUNT)} imágenes iniciales`;
  if (fillEl) fillEl.style.transform = `scaleX(${progress})`;
}

function loadFrame(index, triesLeft = RETRIES, highPriority = false) {
  if (index < 0 || index >= FRAME_COUNT) return Promise.resolve(null);
  if (state.frames[index]) {
    state.lastUsed[index] = performance.now();
    return Promise.resolve(state.frames[index]);
  }
  if (state.loading.has(index)) return state.loading.get(index);

  const promise = new Promise(resolve => {
    const attempt = remaining => {
      const img = new Image();
      img.decoding = 'async';
      try { img.fetchPriority = highPriority ? 'high' : 'auto'; } catch (_) { }

      img.onload = async () => {
        try { if (img.decode) await img.decode(); } catch (_) { }
        const wasEmpty = !state.frames[index];
        state.frames[index] = img;
        state.lastUsed[index] = performance.now();
        if (wasEmpty) state.decodedCount++;
        state.failed.delete(index);

        if (index < INITIAL_FRAME_COUNT && !img.__countedInitial) {
          img.__countedInitial = true;
          state.initialLoaded++;
          updateInitialProgress();
        }
        if (index === 0 || Math.abs(index - state.frameIdx) <= 3) scheduleDraw(state.frameIdx);
        evictDistantFrames();
        resolve(img);
      };

      img.onerror = () => {
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), 180 * (RETRIES - remaining + 1));
        } else {
          state.failed.add(index);
          resolve(null);
        }
      };
      img.src = FRAME_URL(index + 1);
    };
    attempt(triesLeft);
  }).finally(() => state.loading.delete(index));

  state.loading.set(index, promise);
  return promise;
}

function queueFrame(index, priority = 0) {
  if (index < 0 || index >= FRAME_COUNT || state.frames[index] || state.loading.has(index)) return;
  const oldPriority = state.queued.get(index);
  if (oldPriority !== undefined) {
    if (priority > oldPriority) state.queued.set(index, priority);
    return;
  }
  state.queued.set(index, priority);
  state.queue.push(index);
  pumpFrameQueue();
}

function pumpFrameQueue() {
  while (state.activeLoads < MAX_DECODE_CONCURRENCY && state.queue.length) {
    state.queue.sort((a, b) => (state.queued.get(b) || 0) - (state.queued.get(a) || 0));
    const index = state.queue.shift();
    const priority = state.queued.get(index) || 0;
    state.queued.delete(index);
    if (state.frames[index] || state.loading.has(index)) continue;
    state.activeLoads++;
    loadFrame(index, 2, priority >= 900)
      .finally(() => {
        state.activeLoads--;
        pumpFrameQueue();
      });
  }
}

function requestFrameWindow(center, direction = 1) {
  queueFrame(center, 1000);
  const forward = direction >= 0 ? 1 : -1;
  for (let d = 1; d <= 12; d++) queueFrame(center + d * forward, 700 - d * 12);
  for (let d = 1; d <= 5; d++) queueFrame(center - d * forward, 420 - d * 12);

  if (state.queue.length > 60) {
    state.queue = state.queue.filter(i => Math.abs(i - center) <= 30 || i < INITIAL_FRAME_COUNT);
    state.queued = new Map(state.queue.map(i => [i, state.queued.get(i) || 0]));
  }
}

async function preloadInitialFrames() {
  updateInitialProgress();
  await loadFrame(0, RETRIES, true);
  scheduleDraw(0);

  const queue = Array.from({ length: INITIAL_FRAME_COUNT - 1 }, (_, i) => i + 1);
  const worker = async () => {
    while (queue.length) {
      const index = queue.shift();
      await loadFrame(index, RETRIES, true);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
}

/* ================= SERVICE WORKER Y CACHÉ PERSISTENTE ================= */
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
        const text = data.failed
          ? `Caché completada con ${data.failed} recurso(s) pendiente(s); se cargarán bajo demanda.`
          : 'Recursos visuales listos en caché para una reproducción más fluida.';
        showCacheStatus(text, 4200);
      } else if (data.type === 'CACHE_ERROR') {
        showCacheStatus('No se pudo completar toda la caché. El sitio continuará cargando imágenes bajo demanda.', 5000);
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
    showCacheStatus('Ahorro de datos activo: las imágenes se cargarán solo cuando sean necesarias.', 5000);
    return;
  }

  const registration = await registrationPromise;
  if (!registration) return;
  try {
    const ready = await navigator.serviceWorker.ready;
    const worker = ready.active || registration.active || registration.waiting;
    if (!worker) return;
    const urls = Array.from({ length: FRAME_COUNT }, (_, i) => new URL(FRAME_URL(i + 1), location.href).href);
    showCacheStatus(`Optimizando recursos visuales · ${INITIAL_FRAME_COUNT}/${FRAME_COUNT}`);
    worker.postMessage({ type: 'CACHE_FRAMES', urls });
  } catch (error) {
    console.warn('No se pudo iniciar la caché de frames:', error);
  }
}

/* ================= PRELOADER: ENTRADA CON 20 IMÁGENES ================= */
function initPreloader(registrationPromise) {
  const el = $('#preloader');
  const start = performance.now();

  const close = () => {
    if (state.preloaderClosed) return;
    state.preloaderClosed = true;
    el.classList.add('done');
    setTimeout(() => {
      state.ready = true;
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      startPersistentFrameCache(registrationPromise);
    }, 850);
  };

  const tick = now => {
    const elapsed = now - start;
    const allInitialReady = state.initialLoaded >= INITIAL_FRAME_COUNT;
    const safeFallback = elapsed >= PRELOADER_SAFE && !!state.frames[0];
    if (allInitialReady || safeFallback) {
      close();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ================= REPRODUCTOR CON SCRUB ================= */
function initReel() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    scheduleDraw(0);
    state.ready = true;
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  const reel = $('#reel');
  const stage = $('#stage');
  const hero = $('#hero');
  const counter = $('#fcount b');

  const setup = () => {
    const vhPerFrame = isCoarsePointer ? 5.2 : VH_PER_FRAME;
    state.scrollTotal = FRAME_COUNT * vhPerFrame * window.innerHeight / 100;
    reel.style.height = window.innerHeight + state.scrollTotal + 'px';
  };
  setup();

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: reel,
      start: 'top top',
      end: 'bottom bottom',
      pin: stage,
      scrub: true,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onUpdate: self => {
        const idx = clamp(Math.round(self.progress * (FRAME_COUNT - 1)), 0, FRAME_COUNT - 1);
        if (idx !== state.frameIdx) {
          const direction = idx >= state.frameIdx ? 1 : -1;
          state.lastFrameIdx = state.frameIdx;
          state.frameIdx = idx;
          scheduleDraw(idx);
          requestFrameWindow(idx, direction);
        } else if (!state.frames[idx]) {
          queueFrame(idx, 1000);
          scheduleDraw(idx);
        }
        counter.textContent = pad4(idx + 1);
      }
    }
  });

  tl.to('#hero', { opacity: 0, y: -60, duration: 0.16, ease: 'power2.out' }, 0.02)
    .to('#scrollhint', { opacity: 0, duration: 0.1 }, 0.02);

  QUOTES.forEach((q, i) => {
    const el = document.querySelector('.quote[data-window="' + i + '"]');
    if (!el) return;
    const len = q.b - q.a;
    tl.fromTo(el, { opacity: 0, visibility: 'hidden' }, { opacity: 1, visibility: 'visible', duration: len * 0.34, ease: 'power1.out' }, q.a)
      .to(el, { opacity: 0, duration: len * 0.26, ease: 'power1.in' }, q.b - len * 0.26);
  });

  gsap.fromTo(hero.querySelectorAll('.reveal'), { opacity: 0, y: 36 }, {
    opacity: 1,
    y: 0,
    duration: 1.4,
    stagger: 0.16,
    ease: 'power3.out',
    delay: 0.4,
    scrollTrigger: { trigger: reel, start: 'top top', end: '+=40%', toggleActions: 'play none none none' }
  });

  window.addEventListener('resize', () => {
    setup();
    scheduleResize();
  }, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize, { passive: true });
}

/* ================= REVELADOS ================= */
function initReveals() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    $$('.reveal').forEach(el => el.classList.remove('reveal'));
    return;
  }
  $$('.reveal').forEach(el => {
    if (el.closest('#stage')) return;
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true }
    });
  });
}

/* ================= LENIS: SOLO DONDE APORTA ================= */
function initLenis() {
  if (typeof Lenis === 'undefined' || isCoarsePointer || reduceMotion) return;
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', () => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update();
  });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;
}

function scrollTo(target) {
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scrollTo === 'function') {
    try { lenis.scrollTo(target, { duration: 1.6 }); return; } catch (_) { }
  }
  const el = typeof target === 'string' ? $(target) : target;
  if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}

/* ================= PARTÍCULAS THREE.JS OPTIMIZADAS ================= */
function initParticles() {
  if (typeof THREE === 'undefined' || reduceMotion) return;
  const canvasEl = $('#particles');
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: !isCoarsePointer, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(isCoarsePointer ? 1.15 : 1.6, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 9;

  const count = isCoarsePointer ? 38 : 90;
  const pos = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    speeds[i] = 0.1 + Math.random() * 0.35;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xD8A763, size: 0.05, transparent: true, opacity: 0.5, sizeAttenuation: true, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let last = 0;
  const loop = now => {
    requestAnimationFrame(loop);
    if (document.hidden || now - last < (isCoarsePointer ? 34 : 17)) return;
    last = now;
    const attr = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = attr.array[i * 3 + 1] - speeds[i] * 0.012;
      if (y < -4.5) y = 4.5;
      attr.array[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
    points.rotation.y += 0.0006;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);
}

/* ================= GRANO / VÍNETA OPTIMIZADOS ================= */
function initFx() {
  const c = $('#fx-canvas');
  const cx = c.getContext('2d');
  let w = 0;
  let h = 0;
  let gradient;

  const resize = () => {
    w = c.width = Math.max(1, Math.round(window.innerWidth * (isCoarsePointer ? 0.75 : 1)));
    h = c.height = Math.max(1, Math.round(window.innerHeight * (isCoarsePointer ? 0.75 : 1)));
    gradient = cx.createRadialGradient(w / 2, h * 0.44, Math.min(w, h) * 0.42, w / 2, h * 0.44, Math.max(w, h) * 0.78);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(10,7,4,.5)');
    cx.clearRect(0, 0, w, h);
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, w, h);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (isCoarsePointer || reduceMotion) return;

  const noise = document.createElement('canvas');
  noise.width = 128;
  noise.height = 72;
  const nc = noise.getContext('2d');
  const imgData = nc.createImageData(128, 72);
  let tick = 0;

  const loop = () => {
    requestAnimationFrame(loop);
    if (document.hidden || ++tick % 5 !== 0) return;
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = 14 + Math.random() * 20;
      imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = v;
      imgData.data[i + 3] = 12;
    }
    nc.putImageData(imgData, 0, 0);
    cx.clearRect(0, 0, w, h);
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, w, h);
    cx.globalCompositeOperation = 'overlay';
    cx.drawImage(noise, 0, 0, w, h);
    cx.globalCompositeOperation = 'source-over';
  };
  requestAnimationFrame(loop);
}

/* ================= CALCULADORA ================= */
function initCalculator() {
  const range = $('#m2range');
  const m2val = $('#m2val');
  const totalEl = $('#total');
  const totaluf = $('#totaluf');
  const minirows = $('#minirows');
  const chips = $$('#m2chips .chip');
  const levels = $$('#levels .level');
  const waLink = $('#calc-wa');
  let m2 = 120;
  let level = 1;

  function update() {
    const price = LEVELS[level].price;
    const total = fmtV(m2 * price);
    m2val.innerHTML = m2 + '<small> m²</small>';
    totalEl.textContent = fmtCLP(total);
    totaluf.textContent = '≈ UF ' + uf(total).toLocaleString('es-CL');
    levels.forEach((l, i) => l.classList.toggle('on', i === level));
    chips.forEach(c => c.classList.toggle('on', Number(c.dataset.m2) === m2));
    minirows.innerHTML = LEVELS.map((L, i) =>
      '<div class="minirow' + (i === level ? ' on' : '') + '">' +
      '<span>' + L.name + ' · ' + m2 + ' m²</span>' +
      '<b>' + fmtCLP(fmtV(m2 * L.price)) + '</b></div>'
    ).join('');
    waLink.href = waHref();
  }

  function waHref() {
    const price = LEVELS[level].price;
    const total = fmtV(m2 * price);
    const msg = 'Hola Constructora Gajardo 👋\nQuiero cotizar mi proyecto:\n• Superficie: ' + m2 + ' m²\n• Nivel: ' + LEVELS[level].name + '\n• Valor estimado: ' + fmtCLP(total) + ' (≈ UF ' + uf(total) + ')\nMe gustaría conversar los detalles.';
    return 'https://wa.me/56935740315?text=' + encodeURIComponent(msg);
  }

  range.addEventListener('input', () => { m2 = Number(range.value); update(); });
  chips.forEach(c => c.addEventListener('click', () => { m2 = Number(c.dataset.m2); range.value = m2; update(); }));
  levels.forEach((l, i) => l.addEventListener('click', () => { level = i; update(); }));
  update();
}

function calcSubmit() {
  const name = $('#q-name').value.trim();
  const phone = $('#q-phone').value.trim();
  const msg = $('#q-msg').value.trim();
  const m2 = Number($('#m2range').value);
  const lvl = Number(document.querySelector('#levels .level.on')?.dataset.level ?? 1);
  const level = LEVELS[lvl];
  const total = fmtV(m2 * level.price);
  let text = 'Hola Constructora Gajardo 👋\n';
  if (name) text += 'Soy ' + name + '.\n';
  if (phone) text += 'Mi WhatsApp: ' + phone + '\n';
  text += 'Quiero cotizar mi proyecto:\n';
  text += '• Superficie: ' + m2 + ' m²\n';
  text += '• Nivel: ' + level.name + '\n';
  text += '• Valor estimado: ' + fmtCLP(total) + ' (≈ UF ' + uf(total) + ')\n';
  if (msg) text += 'Detalles: ' + msg + '\n';
  text += '¿Podemos agendar una visita?';
  window.open('https://wa.me/56935740315?text=' + encodeURIComponent(text), '_blank');
}

function contactSubmit(e) {
  e.preventDefault();
  const name = $('#c-name').value.trim();
  const phone = $('#c-phone2').value.trim();
  const svc = $('#c-svc').value;
  const msg = $('#c-msg').value.trim();
  let text = 'Hola Constructora Gajardo 👋\n';
  if (name) text += 'Soy ' + name + '.\n';
  if (phone) text += 'Mi WhatsApp: ' + phone + '\n';
  text += 'Me interesa: ' + svc + '.\n';
  if (msg) text += msg + '\n';
  window.open('https://wa.me/56935740315?text=' + encodeURIComponent(text), '_blank');
}

/* ================= CONTADORES ================= */
function initCounters() {
  if (typeof gsap === 'undefined') return;
  $$('[data-count]').forEach(el => {
    const target = Number(el.dataset.count);
    if (target === 0) return;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => { el.textContent = String(Math.round(obj.v)); }
    });
  });
}

/* ================= NAVEGACIÓN ================= */
function initNav() {
  const nav = $('#nav');
  const burger = $('#burger');
  const mmenu = $('#mmenu');
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40), { passive: true });
  const close = () => { mmenu.classList.remove('open'); burger.classList.remove('open'); };
  burger.addEventListener('click', () => {
    const open = mmenu.classList.toggle('open');
    burger.classList.toggle('open', open);
  });
  mmenu.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (link) { e.preventDefault(); close(); scrollTo(link.getAttribute('href')); }
  });
  $$('#nav .links a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollTo(a.getAttribute('href')); }));
  $$('[data-goto]').forEach(b => b.addEventListener('click', () => scrollTo(b.dataset.goto)));
}

/* ================= MÚSICA Y CONSENTIMIENTO ================= */
function initMusic() {
  const audio = new Audio('audio/bg-music.mp3');
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0;
  let started = false;
  const btn = $('#fab-music');

  const fade = (to, dur) => {
    const from = audio.volume;
    const t0 = performance.now();
    const step = now => {
      const p = clamp((now - t0) / (dur * 1000), 0, 1);
      audio.volume = from + (to - from) * p;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const play = () => {
    if (started) { audio.play().catch(() => { }); return; }
    started = true;
    audio.play().catch(() => { });
    fade(0.3, 2.5);
  };

  btn.addEventListener('click', () => {
    if (audio.paused) {
      play();
      btn.classList.add('playing');
    } else {
      fade(0, 1.2);
      setTimeout(() => audio.pause(), 1300);
      btn.classList.remove('playing');
    }
  });
  return { play };
}

function initConsent(music) {
  const el = $('#consent');
  const key = 'cg_consent_v1';
  if (localStorage.getItem(key) === 'accepted' || localStorage.getItem(key) === 'declined') { el.remove(); return; }
  setTimeout(() => el.classList.add('show'), 1400);
  $('#consent-accept').addEventListener('click', () => {
    localStorage.setItem(key, 'accepted');
    el.classList.remove('show');
    setTimeout(() => el.remove(), 700);
    music.play();
    $('#fab-music').classList.add('playing');
  });
  $('#consent-decline').addEventListener('click', () => {
    localStorage.setItem(key, 'declined');
    el.classList.remove('show');
    setTimeout(() => el.remove(), 700);
  });
}

/* ================= ARRANQUE ================= */
function boot() {
  initResourceNotice();
  sizeCanvas(true);
  window.addEventListener('resize', scheduleResize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      scheduleDraw(state.frameIdx);
      requestFrameWindow(state.frameIdx, state.frameIdx >= state.lastFrameIdx ? 1 : -1);
    }
  });

  const registrationPromise = registerServiceWorker();
  preloadInitialFrames();
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
  $('#q-send').addEventListener('click', calcSubmit);
  $('#contact-form').addEventListener('submit', contactSubmit);
  requestFrameWindow(0, 1);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

/* ================= HOOK DE VERIFICACIÓN (?test=1) ================= */
window.__loaded = () => state.initialLoaded;
window.__frameState = () => ({
  current: state.frameIdx + 1,
  decoded: state.decodedCount,
  initialLoaded: state.initialLoaded,
  cacheDone: state.cacheDone,
  failed: Array.from(state.failed)
});
if (location.search.includes('test=1')) {
  setTimeout(() => { window.scrollTo(0, 1200); }, 2500);
  setTimeout(() => { document.title = 'TEST1 f' + (state.frameIdx + 1) + ' decoded' + state.decodedCount; }, 4500);
  setTimeout(() => { window.scrollTo(0, 6000); }, 5500);
  setTimeout(() => { document.title = 'TEST2 f' + (state.frameIdx + 1) + ' decoded' + state.decodedCount; }, 7500);
  setTimeout(() => { window.scrollTo(0, 20000); }, 8500);
  setTimeout(() => { document.title = 'TEST3 f' + (state.frameIdx + 1) + ' decoded' + state.decodedCount; }, 10500);
}

})();
