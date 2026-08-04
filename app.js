(() => {
  'use strict';

  const BASE_APP = 'https://cdn.jsdelivr.net/gh/thinkfashz/constructora-gajardo@bfa47c3d31b3af83d2beef9becd7df2c13d32098/app.js';

  const REFERENCE_IMAGES = {
    Quinchos: {
      src: 'https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=2200&q=92',
      srcset: 'https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=900&q=88 900w, https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=1500&q=90 1500w, https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=2200&q=92 2200w',
      fallback: './assets/generated/terraza-mediterranea.jpg?v=20260804-hq',
      alt: 'Quincho exterior moderno con cocina, terraza y piscina, imagen referencial',
      caption: 'Quincho exterior · Imagen referencial',
      objectPosition: 'center 52%'
    },
    'Terrazas mediterráneas': {
      src: 'https://images.pexels.com/photos/5563466/pexels-photo-5563466.jpeg?auto=compress&cs=tinysrgb&w=2200&dpr=1',
      srcset: 'https://images.pexels.com/photos/5563466/pexels-photo-5563466.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1 900w, https://images.pexels.com/photos/5563466/pexels-photo-5563466.jpeg?auto=compress&cs=tinysrgb&w=1500&dpr=1 1500w, https://images.pexels.com/photos/5563466/pexels-photo-5563466.jpeg?auto=compress&cs=tinysrgb&w=2200&dpr=1 2200w',
      fallback: './assets/generated/terraza-mediterranea.jpg?v=20260804-hq',
      alt: 'Terraza exterior moderna con mobiliario, piscina y conexión al jardín, imagen referencial',
      caption: 'Terraza mediterránea · Imagen referencial',
      objectPosition: 'center 50%'
    },
    Piscinas: {
      src: 'https://images.pexels.com/photos/28681443/pexels-photo-28681443/free-photo-of-modern-luxury-home-with-pool-and-patio.jpeg?auto=compress&cs=tinysrgb&w=2200&dpr=1',
      srcset: 'https://images.pexels.com/photos/28681443/pexels-photo-28681443/free-photo-of-modern-luxury-home-with-pool-and-patio.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1 900w, https://images.pexels.com/photos/28681443/pexels-photo-28681443/free-photo-of-modern-luxury-home-with-pool-and-patio.jpeg?auto=compress&cs=tinysrgb&w=1500&dpr=1 1500w, https://images.pexels.com/photos/28681443/pexels-photo-28681443/free-photo-of-modern-luxury-home-with-pool-and-patio.jpeg?auto=compress&cs=tinysrgb&w=2200&dpr=1 2200w',
      fallback: './assets/generated/piscina-moderna.jpg?v=20260804-hq',
      alt: 'Piscina residencial moderna integrada con terraza y paisajismo, imagen referencial',
      caption: 'Piscina integrada · Imagen referencial',
      objectPosition: 'center 48%'
    },
    Paisajismo: {
      src: 'https://images.unsplash.com/photo-1761637822930-fb1c1a3df94d?auto=format&fit=crop&w=2200&q=92',
      srcset: 'https://images.unsplash.com/photo-1761637822930-fb1c1a3df94d?auto=format&fit=crop&w=900&q=88 900w, https://images.unsplash.com/photo-1761637822930-fb1c1a3df94d?auto=format&fit=crop&w=1500&q=90 1500w, https://images.unsplash.com/photo-1761637822930-fb1c1a3df94d?auto=format&fit=crop&w=2200&q=92 2200w',
      fallback: './assets/generated/paisajismo-mediterraneo.jpg?v=20260804-hq',
      alt: 'Paisajismo residencial mediterráneo con senderos, vegetación y terminaciones premium, imagen referencial',
      caption: 'Paisajismo residencial · Imagen referencial',
      objectPosition: 'center 48%'
    }
  };

  function setImage(image, config) {
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.referrerPolicy = 'no-referrer';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = config.alt;
    image.style.objectPosition = config.objectPosition || 'center';
    image.style.imageRendering = 'auto';
    image.style.filter = 'none';

    let fallbackUsed = false;
    image.onerror = () => {
      if (fallbackUsed || !config.fallback) return;
      fallbackUsed = true;
      image.removeAttribute('srcset');
      image.src = config.fallback;
    };

    image.src = config.src;
    if (config.srcset) {
      image.srcset = config.srcset;
      image.sizes = '(max-width: 760px) 94vw, (max-width: 1200px) 70vw, 48vw';
    }
  }

  function applyReferenceImages() {
    document.querySelectorAll('#servicios .svc').forEach(block => {
      const serviceName = block.querySelector('h3')?.textContent.trim();
      const config = REFERENCE_IMAGES[serviceName];
      if (!config) return;

      const image = block.querySelector('.card img');
      if (image) setImage(image, config);

      const caption = block.querySelector('.card .cap');
      if (caption) caption.textContent = config.caption;
    });
  }

  function scheduleImageReplacement() {
    applyReferenceImages();
    requestAnimationFrame(applyReferenceImages);
    setTimeout(applyReferenceImages, 350);
    setTimeout(applyReferenceImages, 1100);
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