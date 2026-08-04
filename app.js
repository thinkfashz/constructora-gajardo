(() => {
  'use strict';

  const WHATSAPP = '56935740315';

  const SERVICES = {
    quincho: {
      name: 'Quincho',
      short: 'Quincho',
      description: 'Espacios para cocinar, reunirse y disfrutar durante todo el año.',
      min: 15,
      max: 120,
      step: 5,
      value: 35,
      presets: [20, 35, 50, 80],
      levels: [
        {
          name: 'Esencial',
          price: 320000,
          summary: 'Funcional y sólido',
          details: ['Estructura funcional', 'Cubierta y piso base', 'Instalación eléctrica esencial']
        },
        {
          name: 'Mediterráneo',
          price: 450000,
          summary: 'El más solicitado',
          details: ['Diseño mediterráneo', 'Mesón y zona de parrilla', 'Iluminación y terminaciones destacadas']
        },
        {
          name: 'Premium',
          price: 590000,
          summary: 'Diseño integral',
          details: ['Proyecto personalizado', 'Revestimientos de mayor estándar', 'Integración con terraza y piscina']
        }
      ]
    },
    terraza: {
      name: 'Terraza',
      short: 'Terraza',
      description: 'Terrazas abiertas o techadas que amplían la casa hacia el exterior.',
      min: 12,
      max: 150,
      step: 4,
      value: 40,
      presets: [20, 40, 60, 100],
      levels: [
        {
          name: 'Abierta',
          price: 180000,
          summary: 'Exterior funcional',
          details: ['Preparación y nivelación', 'Pavimento exterior', 'Terminación funcional']
        },
        {
          name: 'Techada',
          price: 290000,
          summary: 'Uso todo el año',
          details: ['Estructura y cubierta', 'Iluminación básica', 'Terminaciones coordinadas con la vivienda']
        },
        {
          name: 'Mediterránea',
          price: 420000,
          summary: 'Terminación premium',
          details: ['Diseño mediterráneo', 'Metalcon y revestimientos según proyecto', 'Iluminación y detalles personalizados']
        }
      ]
    },
    piscina: {
      name: 'Piscina',
      short: 'Piscina',
      description: 'Piscinas integradas al quincho, la terraza y el paisajismo del proyecto.',
      min: 12,
      max: 60,
      step: 2,
      value: 24,
      presets: [16, 24, 32, 48],
      levels: [
        {
          name: 'Esencial',
          base: 8500000,
          price: 390000,
          summary: 'Piscina funcional',
          details: ['Excavación sujeta a terreno', 'Sistema de filtrado', 'Borde funcional']
        },
        {
          name: 'Integrada',
          base: 11900000,
          price: 520000,
          summary: 'Con terraza y entorno',
          details: ['Diseño integrado al exterior', 'Iluminación', 'Terminaciones de mayor estándar']
        },
        {
          name: 'Premium',
          base: 16900000,
          price: 720000,
          summary: 'Proyecto completo',
          details: ['Diseño personalizado', 'Terminaciones premium', 'Integración con quincho y paisajismo']
        }
      ]
    },
    construccion: {
      name: 'Construcción',
      short: 'Construcción',
      description: 'Casas y ampliaciones diseñadas según el terreno y las necesidades de cada familia.',
      min: 40,
      max: 300,
      step: 5,
      value: 90,
      presets: [60, 90, 120, 180],
      levels: [
        {
          name: 'Esencial',
          price: 350000,
          summary: 'Solución funcional',
          details: ['Estructura sólida', 'Terminaciones funcionales', 'Distribución optimizada']
        },
        {
          name: 'Mediterráneo',
          price: 460000,
          summary: 'Diseño destacado',
          details: ['Terminaciones mediterráneas', 'Espacios exteriores integrados', 'Iluminación y detalles superiores']
        },
        {
          name: 'Premium',
          price: 620000,
          summary: 'Totalmente a medida',
          details: ['Diseño personalizado', 'Acabados de mayor estándar', 'Integración completa del proyecto']
        }
      ]
    }
  };

  const specialtySection = `
    <div class="wrap">
      <div class="sec-head">
        <span class="num reveal">02 — Nuestra especialidad</span>
        <h2 class="reveal">Quinchos y terrazas creados para <span class="serif-i">vivir el exterior</span></h2>
        <p class="lead reveal">Diseñamos y construimos espacios exteriores completos, desde la estructura hasta las terminaciones, con soluciones pensadas para cada terreno y estilo de vida.</p>
      </div>
      <div class="phrase reveal">
        <span class="ph-num">I</span>
        <p>Quinchos pensados para cocinar, compartir y convertirse en <em>el centro de cada reunión</em>.</p>
        <span class="ph-f">QUINCHOS A MEDIDA</span>
      </div>
      <div class="phrase reveal">
        <span class="ph-num">II</span>
        <p>Terrazas abiertas o techadas que permiten <em>disfrutar el exterior todo el año</em>.</p>
        <span class="ph-f">TERRAZAS INTEGRADAS</span>
      </div>
      <div class="phrase reveal">
        <span class="ph-num">III</span>
        <p>Estructuras en Metalcon y soluciones seleccionadas según el proyecto para lograr <em>precisión y durabilidad</em>.</p>
        <span class="ph-f">ESTRUCTURA Y DURABILIDAD</span>
      </div>
      <div class="phrase reveal">
        <span class="ph-num">IV</span>
        <p>Integramos quincho, terraza, piscina e iluminación en <em>un solo proyecto exterior</em>.</p>
        <span class="ph-f">PROYECTO INTEGRAL</span>
      </div>
    </div>`;

  const formatCLP = value => '$' + Math.round(value).toLocaleString('es-CL').replace(/,/g, '.');

  function injectStyles() {
    if (document.querySelector('#service-calculator-styles')) return;

    const style = document.createElement('style');
    style.id = 'service-calculator-styles';
    style.textContent = `
      .service-switch {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 28px;
      }
      .service-option {
        min-height: 76px;
        padding: 14px 12px;
        border: 1px solid rgba(244,237,225,.14);
        border-radius: 15px;
        background: rgba(36,28,19,.74);
        color: var(--sand);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: .16em;
        text-transform: uppercase;
        transition: border-color .25s ease, background .25s ease, transform .25s ease, color .25s ease;
      }
      .service-option:hover { transform: translateY(-2px); border-color: rgba(216,167,99,.48); }
      .service-option.active {
        color: var(--espresso);
        border-color: var(--gold);
        background: linear-gradient(135deg, var(--gold), #E8C18B);
        box-shadow: 0 12px 30px rgba(216,167,99,.18);
      }
      .service-description {
        color: var(--sand);
        font-size: 14px;
        line-height: 1.7;
        margin: 4px 0 26px;
      }
      .service-level-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 26px;
      }
      .service-level {
        text-align: left;
        padding: 18px;
        border-radius: 16px;
        border: 1px solid rgba(244,237,225,.13);
        background: rgba(20,16,10,.5);
        transition: border-color .25s ease, transform .25s ease, background .25s ease;
      }
      .service-level:hover { transform: translateY(-2px); border-color: rgba(216,167,99,.46); }
      .service-level.active {
        border-color: var(--gold);
        background: linear-gradient(180deg, rgba(216,167,99,.13), rgba(20,16,10,.58));
      }
      .service-level .level-name {
        display: block;
        color: var(--cream);
        font-family: var(--serif);
        font-size: 19px;
        margin-bottom: 5px;
      }
      .service-level .level-summary {
        display: block;
        color: var(--gold);
        font-size: 9px;
        letter-spacing: .16em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      .service-level .level-price {
        display: block;
        color: var(--sand);
        font-size: 12px;
        line-height: 1.5;
      }
      .service-level-details {
        margin: 22px 0 0;
        padding: 18px 20px;
        border-radius: 14px;
        background: rgba(20,16,10,.46);
        border: 1px solid rgba(244,237,225,.09);
      }
      .service-level-details strong {
        display: block;
        color: var(--gold);
        font-size: 10px;
        letter-spacing: .2em;
        text-transform: uppercase;
        margin-bottom: 10px;
      }
      .service-level-details ul { list-style: none; display: grid; gap: 8px; }
      .service-level-details li { color: var(--sand); font-size: 13px; line-height: 1.45; }
      .service-level-details li::before { content: '—'; color: var(--terracotta); margin-right: 8px; }
      .estimate-card {
        border-radius: 20px;
        border: 1px solid rgba(216,167,99,.28);
        background: linear-gradient(160deg, rgba(216,167,99,.12), rgba(36,28,19,.86) 48%);
        padding: 24px;
        margin-bottom: 22px;
      }
      .estimate-card .estimate-label {
        color: var(--sand);
        font-size: 10px;
        letter-spacing: .24em;
        text-transform: uppercase;
      }
      .estimate-card .estimate-total {
        display: block;
        color: var(--cream);
        font-family: var(--serif);
        font-size: clamp(34px, 5vw, 54px);
        margin: 8px 0 6px;
        line-height: 1;
      }
      .estimate-card .estimate-meta {
        color: var(--gold);
        font-size: 12px;
        line-height: 1.6;
      }
      .estimate-note {
        color: rgba(217,196,163,.64);
        font-size: 11px;
        line-height: 1.65;
        margin-top: 16px;
      }
      .service-chips { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 14px; }
      .service-chip {
        padding: 8px 13px;
        border-radius: 999px;
        border: 1px solid rgba(244,237,225,.16);
        color: var(--sand);
        font-size: 11px;
      }
      .service-chip.active { border-color: var(--gold); color: var(--gold); background: rgba(216,167,99,.08); }
      @media (max-width: 820px) {
        .service-switch { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .service-level-grid { grid-template-columns: 1fr; }
        .service-level { padding: 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  function applyBrandFocus() {
    injectStyles();

    const section = document.querySelector('#filosofia');
    if (section) section.innerHTML = specialtySection;

    document.querySelectorAll('a[href="#filosofia"]').forEach(link => {
      link.textContent = 'Quinchos';
    });

    const heroEyebrow = document.querySelector('#hero .eyebrow');
    if (heroEyebrow) heroEyebrow.textContent = 'Especialistas en quinchos & terrazas · Since 2007';

    const heroTag = document.querySelector('#hero .tag');
    if (heroTag) {
      heroTag.innerHTML = 'Quinchos y terrazas mediterráneas diseñados para disfrutar todo el año.<br>Piscinas y exteriores integrados en un solo proyecto.';
    }

    const frameCounter = document.querySelector('#fcount');
    if (frameCounter) frameCounter.style.display = 'none';

    document.querySelectorAll('.card .cap').forEach(caption => {
      caption.textContent = caption.textContent.replace(/\s*·\s*frame\s*\d+/gi, '').trim();
    });

    const services = document.querySelector('#servicios');
    if (services) {
      const heading = services.querySelector('.sec-head h2');
      const lead = services.querySelector('.sec-head .lead');
      if (heading) heading.innerHTML = 'Especialistas en <span class="serif-i">quinchos y terrazas</span>';
      if (lead) lead.textContent = 'Nuestro fuerte son los espacios exteriores completos: quinchos, terrazas mediterráneas y piscinas integradas. También desarrollamos casas, ampliaciones y paisajismo como parte del proyecto.';

      const wrap = services.querySelector('.wrap');
      const blocks = Array.from(services.querySelectorAll('.svc'));
      const order = ['Quinchos', 'Terrazas mediterráneas', 'Piscinas', 'Casas', 'Paisajismo'];
      order.forEach((name, index) => {
        const block = blocks.find(item => item.querySelector('h3')?.textContent.trim() === name);
        if (!block || !wrap) return;
        const idx = block.querySelector('.idx');
        if (idx) idx.textContent = String(index + 1).padStart(2, '0');
        wrap.appendChild(block);
      });
    }
  }

  function calculatorMarkup() {
    return `
      <div class="sec-head">
        <span class="num">01 — Cotizador de proyecto</span>
        <h2>Cotiza tu <span class="serif-i">espacio exterior</span></h2>
        <p class="lead">Selecciona el servicio, define los metros cuadrados y compara tres niveles de terminación. El resultado es referencial y se envía directamente por WhatsApp.</p>
      </div>
      <div class="service-switch" id="service-switch" role="tablist" aria-label="Seleccionar servicio"></div>
      <div class="calc-grid">
        <div class="panel">
          <h3 id="service-title">Quincho</h3>
          <p class="service-description" id="service-description"></p>
          <div class="range-row">
            <span class="lbl">Superficie estimada</span>
            <span class="m2" id="service-area">35<small> m²</small></span>
          </div>
          <input id="service-range" type="range" min="15" max="120" step="5" value="35" aria-label="Superficie estimada">
          <div class="service-chips" id="service-chips"></div>
          <div class="service-level-grid" id="service-levels"></div>
          <div class="service-level-details" id="service-level-details"></div>
        </div>
        <div class="form-card">
          <div class="estimate-card">
            <span class="estimate-label">Estimación referencial</span>
            <strong class="estimate-total" id="service-total">$0</strong>
            <div class="estimate-meta" id="service-meta"></div>
            <p class="estimate-note">Valor orientativo. La cotización definitiva depende del terreno, dimensiones finales, estructura, terminaciones, instalaciones y condiciones de ejecución.</p>
          </div>
          <h3>Solicita una <span class="serif-i">evaluación</span></h3>
          <p>Envíanos la estimación y coordinamos la revisión del terreno y los detalles del proyecto.</p>
          <div class="field">
            <label for="q-name">Tu nombre</label>
            <input id="q-name" type="text" placeholder="Ej: María González" autocomplete="name">
          </div>
          <div class="field">
            <label for="q-phone">Tu WhatsApp</label>
            <input id="q-phone" type="tel" placeholder="+56 9 1234 5678" autocomplete="tel">
          </div>
          <div class="field">
            <label for="q-msg">Cuéntanos tu idea</label>
            <textarea id="q-msg" placeholder="Quincho mediterráneo con terraza y conexión a piscina…"></textarea>
          </div>
          <button class="btn btn-terra" id="q-send" type="button">Enviar estimación por WhatsApp</button>
        </div>
      </div>`;
  }

  function installServiceCalculator() {
    const section = document.querySelector('#calculadora');
    if (!section || section.dataset.serviceCalculator === 'ready') return;

    section.dataset.serviceCalculator = 'ready';
    const wrap = section.querySelector('.wrap');
    if (!wrap) return;
    wrap.innerHTML = calculatorMarkup();

    const switcher = section.querySelector('#service-switch');
    const range = section.querySelector('#service-range');
    const area = section.querySelector('#service-area');
    const title = section.querySelector('#service-title');
    const description = section.querySelector('#service-description');
    const chips = section.querySelector('#service-chips');
    const levels = section.querySelector('#service-levels');
    const details = section.querySelector('#service-level-details');
    const total = section.querySelector('#service-total');
    const meta = section.querySelector('#service-meta');
    const send = section.querySelector('#q-send');

    let serviceKey = 'quincho';
    let levelIndex = 1;
    const quantities = Object.fromEntries(Object.entries(SERVICES).map(([key, value]) => [key, value.value]));

    Object.entries(SERVICES).forEach(([key, service]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'service-option';
      button.dataset.service = key;
      button.textContent = service.short;
      button.addEventListener('click', () => {
        serviceKey = key;
        levelIndex = 1;
        render();
      });
      switcher.appendChild(button);
    });

    function calculate(service, selectedLevel, quantity) {
      return (selectedLevel.base || 0) + selectedLevel.price * quantity;
    }

    function priceLabel(selectedLevel) {
      if (selectedLevel.base) {
        return `${formatCLP(selectedLevel.base)} base + ${formatCLP(selectedLevel.price)} por m²`;
      }
      return `${formatCLP(selectedLevel.price)} por m²`;
    }

    function currentMessage() {
      const service = SERVICES[serviceKey];
      const selectedLevel = service.levels[levelIndex];
      const quantity = quantities[serviceKey];
      const estimate = calculate(service, selectedLevel, quantity);
      const name = section.querySelector('#q-name')?.value.trim() || '';
      const phone = section.querySelector('#q-phone')?.value.trim() || '';
      const note = section.querySelector('#q-msg')?.value.trim() || '';

      let message = 'Hola Constructora Gajardo 👋\n';
      if (name) message += `Soy ${name}.\n`;
      if (phone) message += `Mi WhatsApp es ${phone}.\n`;
      message += `Quiero evaluar un proyecto de ${service.name}.\n`;
      message += `• Superficie estimada: ${quantity} m²\n`;
      message += `• Nivel: ${selectedLevel.name}\n`;
      message += `• Estimación referencial: ${formatCLP(estimate)}\n`;
      message += `• Referencia de precio: ${priceLabel(selectedLevel)}\n`;
      if (note) message += `• Detalles: ${note}\n`;
      message += 'Me gustaría coordinar una evaluación del proyecto.';
      return message;
    }

    function renderChips(service) {
      chips.innerHTML = '';
      service.presets.forEach(value => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'service-chip';
        button.textContent = `${value} m²`;
        button.classList.toggle('active', quantities[serviceKey] === value);
        button.addEventListener('click', () => {
          quantities[serviceKey] = value;
          render();
        });
        chips.appendChild(button);
      });
    }

    function renderLevels(service) {
      levels.innerHTML = '';
      service.levels.forEach((selectedLevel, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'service-level';
        button.classList.toggle('active', index === levelIndex);
        button.innerHTML = `
          <span class="level-name">${selectedLevel.name}</span>
          <span class="level-summary">${selectedLevel.summary}</span>
          <span class="level-price">${priceLabel(selectedLevel)}</span>`;
        button.addEventListener('click', () => {
          levelIndex = index;
          render();
        });
        levels.appendChild(button);
      });
    }

    function render() {
      const service = SERVICES[serviceKey];
      const selectedLevel = service.levels[levelIndex];
      const quantity = quantities[serviceKey];
      const estimate = calculate(service, selectedLevel, quantity);

      section.querySelectorAll('.service-option').forEach(button => {
        button.classList.toggle('active', button.dataset.service === serviceKey);
      });

      title.textContent = service.name;
      description.textContent = service.description;
      range.min = String(service.min);
      range.max = String(service.max);
      range.step = String(service.step);
      range.value = String(quantity);
      area.innerHTML = `${quantity}<small> m²</small>`;
      total.textContent = formatCLP(estimate);
      meta.textContent = `${service.name} · Nivel ${selectedLevel.name} · ${quantity} m²`;

      renderChips(service);
      renderLevels(service);
      details.innerHTML = `
        <strong>Alcance referencial del nivel ${selectedLevel.name}</strong>
        <ul>${selectedLevel.details.map(item => `<li>${item}</li>`).join('')}</ul>`;
    }

    range.addEventListener('input', () => {
      quantities[serviceKey] = Number(range.value);
      render();
    });

    send.addEventListener('click', () => {
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(currentMessage())}`, '_blank', 'noopener');
    });

    render();

    if (typeof ScrollTrigger !== 'undefined') {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }

  function startBrandFocus() {
    applyBrandFocus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startBrandFocus, { once: true });
  } else {
    startBrandFocus();
  }

  const core = document.createElement('script');
  core.src = './app-core.js?v=20260804-services-v1';
  core.async = false;
  core.onload = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(installServiceCalculator, 0), { once: true });
    } else {
      setTimeout(installServiceCalculator, 0);
    }
  };
  core.onerror = () => console.error('No se pudo cargar el motor principal del sitio.');
  document.head.appendChild(core);
})();