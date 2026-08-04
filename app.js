(() => {
  'use strict';

  const metalconSection = `
    <div class="wrap">
      <div class="sec-head">
        <span class="num reveal">02 — Sistema constructivo</span>
        <h2 class="reveal">Metalcon: resistencia construida con <span class="serif-i">precisión</span></h2>
        <p class="lead reveal">Perfilería de acero galvanizado para viviendas livianas, eficientes y durables, diseñada según las exigencias de cada proyecto.</p>
      </div>
      <div class="phrase reveal">
        <span class="ph-num">I</span>
        <p>Su bajo peso reduce las cargas sísmicas y favorece una <em>respuesta estructural eficiente</em>.</p>
        <span class="ph-f">BAJO PESO · ALTA PRECISIÓN</span>
      </div>
      <div class="phrase reveal">
        <span class="ph-num">II</span>
        <p>Montaje en seco, piezas precisas y una obra <em>más rápida, ordenada y limpia</em>.</p>
        <span class="ph-f">CONSTRUCCIÓN EN SECO</span>
      </div>
      <div class="phrase reveal">
        <span class="ph-num">III</span>
        <p>Muros configurables para integrar <em>aislación térmica y acústica</em> según cada proyecto.</p>
        <span class="ph-f">CONFORT TÉRMICO Y ACÚSTICO</span>
      </div>
      <div class="phrase reveal">
        <span class="ph-num">IV</span>
        <p>El acero galvanizado protege la estructura y aporta una <em>durabilidad proyectada por décadas</em>.</p>
        <span class="ph-f">DURABILIDAD · ACERO GALVANIZADO</span>
      </div>
    </div>`;

  function applyMetalconCopy() {
    const section = document.querySelector('#filosofia');
    if (section) section.innerHTML = metalconSection;

    document.querySelectorAll('a[href="#filosofia"]').forEach(link => {
      link.textContent = 'Metalcon';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyMetalconCopy, { once: true });
  } else {
    applyMetalconCopy();
  }

  const core = document.createElement('script');
  core.src = './app-core.js?v=20260804-metalcon';
  core.async = false;
  core.onerror = () => console.error('No se pudo cargar el motor principal del sitio.');
  document.head.appendChild(core);
})();
