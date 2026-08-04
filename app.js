(() => {
  'use strict';

  const BASE_APP = 'https://cdn.jsdelivr.net/gh/thinkfashz/constructora-gajardo@bfa47c3d31b3af83d2beef9becd7df2c13d32098/app.js';
  const RELEASE = '20260804-v11';

  const REFERENCE_IMAGES = {
    Quinchos: {
      src: `https://images.pexels.com/photos/33552579/pexels-photo-33552579.jpeg?auto=compress&cs=tinysrgb&w=1800&dpr=2&v=${RELEASE}`,
      alt: 'Quincho exterior moderno con cocina, terraza y piscina, imagen referencial',
      caption: 'Quincho exterior · Imagen referencial',
      objectPosition: 'center 52%'
    },
    'Terrazas mediterráneas': {
      src: `https://images.pexels.com/photos/7587884/pexels-photo-7587884.jpeg?auto=compress&cs=tinysrgb&w=1800&dpr=2&v=${RELEASE}`,
      alt: 'Terraza exterior contemporánea con pérgola, comedor y conexión al jardín, imagen referencial',
      caption: 'Terraza mediterránea · Imagen referencial',
      objectPosition: 'center 50%'
    },
    Piscinas: {
      src: `https://images.pexels.com/photos/8143681/pexels-photo-8143681.jpeg?auto=compress&cs=tinysrgb&w=1800&dpr=2&v=${RELEASE}`,
      alt: 'Piscina residencial moderna integrada con terraza, vegetación y zona de descanso, imagen referencial',
      caption: 'Piscina integrada · Imagen referencial',
      objectPosition: 'center 48%'
    },
    Paisajismo: {
      src: `https://images.pexels.com/photos/12954018/pexels-photo-12954018.jpeg?auto=compress&cs=tinysrgb&w=1800&dpr=2&v=${RELEASE}`,
      alt: 'Jardín residencial con sendero, vegetación abundante y diseño paisajístico, imagen referencial',
      caption: 'Paisajismo residencial · Imagen referencial',
      objectPosition: 'center 48%'
    }
  };

  function clearOldAssetCacheOnce() {
    const key = `cg-assets-${RELEASE}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    if ('caches' in window) {
      caches.keys().then(names => Promise.all(
        names.filter(name => name.startsWith('cg-shell-')).map(name => caches.delete(name))
      )).catch(() => {});
    }
  }

  function setImage(image, config) {
    image.onerror = null;
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.removeAttribute('referrerpolicy');
    image.loading = 'eager';
    image.decoding = 'async';
    image.fetchPriority = 'high';
    image.alt = config.alt;
    image.style.objectPosition = config.objectPosition || 'center';
    image.style.imageRendering = 'auto';
    image.style.filter = 'none';
    image.style.opacity = '1';
    image.src = config.src;
  }

  function applyReferenceImages() {
    document.querySelectorAll('#servicios .svc').forEach(block => {
      const serviceName = block.querySelector('h3')?.textContent.trim();
      const config = REFERENCE_IMAGES[serviceName];
      if (!config) return;

      const image = block.querySelector('.card img');
      if (image && image.dataset.release !== RELEASE) {
        image.dataset.release = RELEASE;
        setImage(image, config);
      }

      const caption = block.querySelector('.card .cap');
      if (caption) caption.textContent = config.caption;
    });
  }

  function scheduleImageReplacement() {
    applyReferenceImages();
    requestAnimationFrame(applyReferenceImages);
    setTimeout(applyReferenceImages, 250);
    setTimeout(applyReferenceImages, 900);
    setTimeout(applyReferenceImages, 2200);
  }

  clearOldAssetCacheOnce();

  const baseScript = document.createElement('script');
  baseScript.src = `${BASE_APP}?v=${RELEASE}`;
  baseScript.async = false;
  baseScript.onload = scheduleImageReplacement;
  baseScript.onerror = () => console.error('No se pudo cargar el motor principal del sitio.');
  document.head.appendChild(baseScript);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleImageReplacement, { once: true });
  } else {
    scheduleImageReplacement();
  }
})();