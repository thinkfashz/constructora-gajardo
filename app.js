(() => {
'use strict';

/* ================= CONSTANTES ================= */
const FRAME_COUNT = 226;
const FRAME_DIR = 'frame movil/';
const FRAME_URL = i => FRAME_DIR + 'frame_' + String(i).padStart(4, '0') + '.jpg';
const VH_PER_FRAME = 7;
const PRELOADER_MIN = 5500;
const PRELOADER_SAFE = 12000;
const PRELOADER_THRESHOLD = 60;
const BATCH = 7;
const RETRIES = 3;
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

/* ================= ESTADO ================= */
const state = {
  frames: new Array(FRAME_COUNT).fill(null),
  loaded: 0,
  failed: new Set(),
  frameIdx: 0,
  ready: false,
  scrollTotal: 0
};

const canvas = $('#frames');
const ctx = canvas.getContext('2d', { alpha: false });

/* ================= CANVAS ================= */
function sizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}
function nearestLoaded(idx) {
  for (let d = 0; d < FRAME_COUNT; d++) {
    if (idx - d >= 0 && state.frames[idx - d]) return idx - d;
    if (idx + d < FRAME_COUNT && state.frames[idx + d]) return idx + d;
  }
  return -1;
}
function drawFrame(idx) {
  let img = state.frames[idx];
  if (!img && idx >= 0 && idx < FRAME_COUNT) {
    const near = nearestLoaded(idx);
    if (near >= 0) img = state.frames[near];
  }
  const w = canvas.width, h = canvas.height;
  if (!img) { ctx.fillStyle = '#14100A'; ctx.fillRect(0, 0, w, h); return; }
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/* ================= PRECARGA DE FRAMES ================= */
function loadImageRetry(url, triesLeft) {
  return new Promise(res => {
    const img = new Image();
    const next = () => {
      if (triesLeft > 0) res(loadImageRetry(url, triesLeft - 1));
      else res(null);
    };
    img.onload = () => res(img);
    img.onerror = next;
    img.src = url;
  });
}
async function preloadAll() {
  const pctEl = $('#ppct'), hintEl = $('#phint'), fillEl = $('#pfill');
  const pool = Array.from({ length: FRAME_COUNT }, (_, i) => i);
  while (pool.length) {
    const chunk = pool.splice(0, BATCH);
    const results = await Promise.all(chunk.map(i => loadImageRetry(FRAME_URL(i + 1), RETRIES)));
    chunk.forEach((i, k) => {
      if (results[k]) { state.frames[i] = results[k]; state.loaded++; }
      else state.failed.add(i + 1);
    });
    pctEl.textContent = String(Math.floor(state.loaded / FRAME_COUNT * 100)).padStart(3, '0') + '%';
    hintEl.textContent = pad4(state.loaded) + ' / ' + pad4(FRAME_COUNT) + ' frames';
    fillEl.style.transform = 'scaleX(' + (state.loaded / FRAME_COUNT) + ')';
    if (state.loaded === 1) drawFrame(0);
    if (!state.frames[state.frameIdx]) drawFrame(state.frameIdx);
  }
}

/* ================= PRELOADER ================= */
function initPreloader() {
  const el = $('#preloader');
  const start = performance.now();
  const fast = window.__fast;
  const threshold = fast ? fast.threshold : PRELOADER_THRESHOLD;
  const min = fast ? fast.min : PRELOADER_MIN;
  const tick = now => {
    const elapsed = now - start;
    const loadedOk = state.loaded >= threshold;
    if ((elapsed >= min && loadedOk) || elapsed >= PRELOADER_SAFE) {
      el.classList.add('done');
      setTimeout(() => { state.ready = true; if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); }, 900);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ================= REPRODUCTOR CON SCRUB ================= */
function initReel() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    drawFrame(0);
    state.ready = true;
    return;
  }
  const reel = $('#reel');
  const stage = $('#stage');
  const hero = $('#hero');
  const counter = $('#fcount b');

  const setup = () => {
    state.scrollTotal = FRAME_COUNT * VH_PER_FRAME * window.innerHeight / 100;
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
      snap: 1 / (FRAME_COUNT - 1),
      onUpdate: self => {
        const idx = clamp(Math.round(self.progress * (FRAME_COUNT - 1)), 0, FRAME_COUNT - 1);
        if (idx !== state.frameIdx) {
          state.frameIdx = idx;
          if (state.frames[idx]) drawFrame(idx);
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
    opacity: 1, y: 0, duration: 1.4, stagger: 0.16, ease: 'power3.out', delay: 0.4,
    scrollTrigger: { trigger: reel, start: 'top top', end: '+=40%', toggleActions: 'play none none none' }
  });

  window.addEventListener('resize', () => {
    setup();
    ScrollTrigger.refresh();
  });
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
      opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true }
    });
  });
}

/* ================= LENIS ================= */
function initLenis() {
  if (typeof Lenis === 'undefined') return;
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', () => ScrollTrigger.update());
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;
}
function scrollTo(target) {
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scrollTo === 'function') {
    try { lenis.scrollTo(target, { duration: 1.6 }); return; } catch (e) { }
  }
  const el = typeof target === 'string' ? $(target) : target;
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

/* ================= PARTÍCULAS THREE.JS ================= */
function initParticles() {
  if (typeof THREE === 'undefined') return;
  const canvasEl = $('#particles');
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 9;

  const count = 110;
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
  const mat = new THREE.PointsMaterial({
    color: 0xD8A763, size: 0.05, transparent: true, opacity: 0.5,
    sizeAttenuation: true, depthWrite: false
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  gsap.ticker.add(t => {
    const attr = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = attr.array[i * 3 + 1] - speeds[i] * 0.012;
      if (y < -4.5) y = 4.5;
      attr.array[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
    points.rotation.y += 0.0006;
    renderer.render(scene, camera);
  });
}

/* ================= GRANO / VÍNETA ================= */
function initFx() {
  const c = $('#fx-canvas');
  const cx = c.getContext('2d');
  let w = 0, h = 0;
  const resize = () => {
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
    const g = cx.createRadialGradient(w / 2, h * 0.44, Math.min(w, h) * 0.42, w / 2, h * 0.44, Math.max(w, h) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10,7,4,.5)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, w, h);
  };
  resize();
  window.addEventListener('resize', resize);
  const noise = document.createElement('canvas');
  noise.width = 128; noise.height = 72;
  const nc = noise.getContext('2d');
  const imgData = nc.createImageData(128, 72);
  let tick = 0;
  const loop = () => {
    tick++;
    if (tick % 3 === 0) {
      for (let i = 0; i < imgData.data.length; i += 4) {
        const v = 14 + Math.random() * 20;
        imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = v;
        imgData.data[i + 3] = 12;
      }
      nc.putImageData(imgData, 0, 0);
      cx.globalCompositeOperation = 'overlay';
      cx.drawImage(noise, 0, 0, w, h);
      cx.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(loop);
  };
  loop();
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
  let m2 = 120, level = 1;

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
      v: target, duration: 2, ease: 'power2.out',
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
    if (started) { audio.play(); return; }
    started = true;
    audio.play().catch(() => { });
    fade(0.3, 2.5);
  };
  btn.addEventListener('click', () => {
    if (audio.paused) { play(); btn.classList.add('playing'); }
    else { fade(0, 1.2); setTimeout(() => audio.pause(), 1300); btn.classList.remove('playing'); }
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
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);
  drawFrame(0);

  preloadAll();
  initPreloader();
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
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

/* ================= HOOK DE VERIFICACIÓN (?test=1) ================= */
const FAST = location.search.includes('fast=1');
window.__loaded = () => state.loaded;
if (FAST) {
  window.__fast = { threshold: 5, min: 1200 };
}
if (location.search.includes('test=1')) {
  setTimeout(() => { window.scrollTo(0, 1200); }, 2500);
  setTimeout(() => { document.title = 'TEST1 f' + (state.frameIdx + 1) + ' loaded' + state.loaded; }, 4500);
  setTimeout(() => { window.scrollTo(0, 6000); }, 5500);
  setTimeout(() => { document.title = 'TEST2 f' + (state.frameIdx + 1) + ' loaded' + state.loaded; }, 7500);
  setTimeout(() => { window.scrollTo(0, 20000); }, 8500);
  setTimeout(() => { document.title = 'TEST3 f' + (state.frameIdx + 1) + ' loaded' + state.loaded; }, 10500);
}

})();
