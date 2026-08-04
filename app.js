(() => {
  'use strict';

  const BASE_APP = 'https://cdn.jsdelivr.net/gh/thinkfashz/constructora-gajardo@bfa47c3d31b3af83d2beef9becd7df2c13d32098/app.js';

  const REFERENCE_IMAGES = {
    Quinchos: {
      src: 'https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=1600&q=82',
      srcset: 'https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=720&q=78 720w, https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=1200&q=80 1200w, https://images.unsplash.com/photo-1762117360871-f11fbad00ee1?auto=format&fit=crop&w=1800&q=82 1800w',
      alt: 'Quincho exterior moderno con cocina, terraza y piscina, imagen referencial',
      credit: 'Alef Morais',
      creditUrl: 'https://unsplash.com/photos/modern-outdoor-kitchen-and-pool-area-YTnLXCH0jWw'
    },
    Paisajismo: {
      src: 'https://images.unsplash.com/photo-1761637822930-fb1c1a3df94d?auto=format&fit=crop&w=1600&q=82',
      srcset: 'https://images.unsplash.com/photo-1761637822930-fb1c1a3df94d?auto=format&fit=crop&w=720&q=78 720w, https://images.unsplash.com/photo-1761637822930-fb1c1a3df94d?auto=format&fit=crop&w=1200&q=80 1200w, https://images.unsplash.com/photo-1761637822930-fb1c1a3df94d?auto=format&fit=crop&w=1800&q=82 1800w',
      alt: 'Paisajismo residencial moderno con sendero, piedra y vegetación, imagen referencial',
      credit: 'Sergej Karpow',
      creditUrl: 'https://unsplash.com/photos/modern-garden-pathway-with-stone-wall-and-hedges-taaMG-ioJU8'
    }
  };

  function applyReferenceImages() {
    document.querySelectorAll('#servicios .svc').forEach(block => {
      const serviceName = block.querySelector('h3')?.textContent.trim();
      const config = REFERENCE_IMAGES[serviceName];
      if (!config) return;

      const image = block.querySelector('.card img');
      if (image) {
        image.src = config.src;
        image.srcset = config.srcset;
        image.sizes = '(max-width: 760px) 94vw, 48vw';
        image.alt = config.alt;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.referrerPolicy = 'no-referrer';
        image.style.objectPosition = serviceName === 'Quinchos' ? 'center 52%' : 'center 48%';
      }

      const caption = block.querySelector('.card .cap');
      if (caption) {
        caption.innerHTML = `Imagen referencial · <a href="${config.creditUrl}" target="_blank" rel="noopener noreferrer">Foto: ${config.credit} / Unsplash</a>`;
      }
    });
  }

  function scheduleImageReplacement() {
    applyReferenceImages();
    requestAnimationFrame(applyReferenceImages);
    setTimeout(applyReferenceImages, 450);
    setTimeout(applyReferenceImages, 1400);
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