(() => {
  'use strict';

  const BASE_APP = 'https://cdn.jsdelivr.net/gh/thinkfashz/constructora-gajardo@bfa47c3d31b3af83d2beef9becd7df2c13d32098/app.js';

  const REFERENCE_IMAGES = {
    Quinchos: {
      src: 'https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=1600&q=82',
      srcset: 'https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=720&q=78 720w, https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=1200&q=80 1200w, https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=1800&q=82 1800w',
      alt: 'Quincho exterior moderno con cocina, terraza y piscina, imagen referencial',
      caption: 'Quincho exterior · Imagen referencial',
      objectPosition: 'center 52%'
    },
    'Terrazas mediterráneas': {
      base64Url: './assets/generated/terraza-mediterranea.jpg?v=20260804-2',
      alt: 'Terraza mediterránea exterior con quincho, comedor y conexión al jardín, imagen referencial',
      caption: 'Terraza mediterránea · Imagen referencial',
      objectPosition: 'center 48%'
    },
    Piscinas: {
      base64Url: './assets/generated/piscina-moderna.b64?v=20260804-2',
      alt: 'Piscina residencial moderna integrada con terraza y paisajismo, imagen referencial',
      caption: 'Piscina integrada · Imagen referencial',
      objectPosition: 'center 46%'
    },
    Paisajismo: {
      base64Url: './assets/generated/paisajismo-mediterraneo.b64?v=20260804-2',
      alt: 'Paisajismo residencial mediterráneo con senderos, vegetación y terminaciones premium, imagen referencial',
      caption: 'Paisajismo residencial · Imagen referencial',
      objectPosition: 'center 50%'
    }
  };

  const dataUriCache = new Map();

  async function resolveImage(config) {
    if (config.src) return config.src;
    if (dataUriCache.has(config.base64Url)) return dataUriCache.get(config.base64Url);

    const response = await fetch(config.base64Url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const base64 = (await response.text()).trim();
    const dataUri = `data:image/jpeg;base64,${base64}`;
    dataUriCache.set(config.base64Url, dataUri);
    return dataUri;
  }

  async function applyReferenceImages() {
    const blocks = Array.from(document.querySelectorAll('#servicios .svc'));

    await Promise.all(blocks.map(async block => {
      const serviceName = block.querySelector('h3')?.textContent.trim();
      const config = REFERENCE_IMAGES[serviceName];
      if (!config) return;

      const image = block.querySelector('.card img');
      if (!image) return;

      try {
        const src = await resolveImage(config);
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.src = src;
        if (config.srcset) {
          image.srcset = config.srcset;
          image.sizes = '(max-width: 760px) 94vw, 48vw';
        }
        image.alt = config.alt;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.style.objectPosition = config.objectPosition || 'center';
      } catch (error) {
        console.warn(`No se pudo cargar la imagen de ${serviceName}:`, error);
      }

      const caption = block.querySelector('.card .cap');
      if (caption) caption.textContent = config.caption;
    }));
  }

  function scheduleImageReplacement() {
    applyReferenceImages();
    requestAnimationFrame(applyReferenceImages);
    setTimeout(applyReferenceImages, 400);
    setTimeout(applyReferenceImages, 1300);
  }

  const baseScript = document.createElement('script');
  baseScript.src = BASE_APP;
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