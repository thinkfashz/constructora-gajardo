(() => {
  'use strict';

  const BASE_APP = 'https://cdn.jsdelivr.net/gh/thinkfashz/constructora-gajardo@bfa47c3d31b3af83d2beef9becd7df2c13d32098/app.js';

  const REFERENCE_IMAGES = {
    Quinchos: {
      src: 'https://images.pexels.com/photos/5563466/pexels-photo-5563466.jpeg?auto=compress&cs=tinysrgb&w=2000&dpr=1',
      srcset: 'https://images.pexels.com/photos/5563466/pexels-photo-5563466.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1 900w, https://images.pexels.com/photos/5563466/pexels-photo-5563466.jpeg?auto=compress&cs=tinysrgb&w=1400&dpr=1 1400w, https://images.pexels.com/photos/5563466/pexels-photo-5563466.jpeg?auto=compress&cs=tinysrgb&w=2000&dpr=1 2000w',
      alt: 'Quincho y terraza exterior moderna, imagen referencial de Pexels',
      caption: 'Quincho exterior · Imagen referencial Pexels',
      objectPosition: 'center 52%'
    },
    'Terrazas mediterráneas': {
      src: 'https://images.pexels.com/photos/32578112/pexels-photo-32578112.jpeg?auto=compress&cs=tinysrgb&w=2000&dpr=1',
      srcset: 'https://images.pexels.com/photos/32578112/pexels-photo-32578112.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1 900w, https://images.pexels.com/photos/32578112/pexels-photo-32578112.jpeg?auto=compress&cs=tinysrgb&w=1400&dpr=1 1400w, https://images.pexels.com/photos/32578112/pexels-photo-32578112.jpeg?auto=compress&cs=tinysrgb&w=2000&dpr=1 2000w',
      alt: 'Terraza mediterránea exterior con arcos y zona de descanso, imagen referencial de Pexels',
      caption: 'Terraza mediterránea · Imagen referencial Pexels',
      objectPosition: 'center 48%'
    },
    Piscinas: {
      src: 'https://images.pexels.com/photos/17568056/pexels-photo-17568056.jpeg?auto=compress&cs=tinysrgb&w=2000&dpr=1',
      srcset: 'https://images.pexels.com/photos/17568056/pexels-photo-17568056.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1 900w, https://images.pexels.com/photos/17568056/pexels-photo-17568056.jpeg?auto=compress&cs=tinysrgb&w=1400&dpr=1 1400w, https://images.pexels.com/photos/17568056/pexels-photo-17568056.jpeg?auto=compress&cs=tinysrgb&w=2000&dpr=1 2000w',
      alt: 'Piscina residencial rodeada de jardín, imagen referencial de Pexels',
      caption: 'Piscina integrada · Imagen referencial Pexels',
      objectPosition: 'center 48%'
    },
    Paisajismo: {
      src: 'https://images.pexels.com/photos/36742224/pexels-photo-36742224.jpeg?auto=compress&cs=tinysrgb&w=2000&dpr=1',
      srcset: 'https://images.pexels.com/photos/36742224/pexels-photo-36742224.jpeg?auto=compress&cs=tinysrgb&w=900&dpr=1 900w, https://images.pexels.com/photos/36742224/pexels-photo-36742224.jpeg?auto=compress&cs=tinysrgb&w=1400&dpr=1 1400w, https://images.pexels.com/photos/36742224/pexels-photo-36742224.jpeg?auto=compress&cs=tinysrgb&w=2000&dpr=1 2000w',
      alt: 'Paisajismo residencial con sendero, vegetación y acceso a vivienda, imagen referencial de Pexels',
      caption: 'Paisajismo residencial · Imagen referencial Pexels',
      objectPosition: 'center 50%'
    }
  };

  function setImage(image, config) {
    const originalSrc = image.currentSrc || image.src;
    const originalSrcset = image.getAttribute('srcset') || '';

    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = config.alt;
    image.style.objectPosition = config.objectPosition || 'center';
    image.style.imageRendering = 'auto';
    image.style.filter = 'none';

    let restored = false;
    image.onerror = () => {
      if (restored) return;
      restored = true;
      image.onerror = null;
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      image.src = originalSrc;
      if (originalSrcset) image.srcset = originalSrcset;
    };

    image.src = config.src;
    image.srcset = config.srcset;
    image.sizes = '(max-width: 760px) 94vw, (max-width: 1200px) 70vw, 48vw';
  }

  function applyReferenceImages() {
    document.querySelectorAll('#servicios .svc').forEach(block => {
      const serviceName = block.querySelector('h3')?.textContent.trim();
      const config = REFERENCE_IMAGES[serviceName];
      if (!config) return;

      const image = block.querySelector('.card img');
      if (image && image.dataset.referenceVersion !== 'pexels-v12') {
        image.dataset.referenceVersion = 'pexels-v12';
        setImage(image, config);
      }

      const caption = block.querySelector('.card .cap');
      if (caption) caption.textContent = config.caption;
    });
  }

  function scheduleImageReplacement() {
    applyReferenceImages();
    requestAnimationFrame(applyReferenceImages);
    setTimeout(applyReferenceImages, 350);
    setTimeout(applyReferenceImages, 1100);
    setTimeout(applyReferenceImages, 2500);
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