/**
 * "Escuchar" una guía en voz alta con la Web Speech API del navegador (speechSynthesis): gratis,
 * sin librerías y sin peticiones propias. Las voces son las del sistema o del navegador; las que no
 * son locales ("en línea", p. ej. las de Google en Chrome o las "Natural" de Edge) envían el texto
 * al servicio de quien las ofrece (ver aviso legal, privacidad). Adaptado de Tech Spider.
 *
 * Se monta solo en las guías (servicios/<id>.html): añade el botón al final de .service-head.
 * Qué se lee: el nombre del servicio, "En una frase" y, del texto (.doc), títulos, párrafos,
 * elementos de lista, citas y filas de tabla, en orden. Se salta el código (<pre>), el audio de
 * NotebookLM, "Preguntas de práctica", "Fuentes" y lo marcado con [data-sin-lectura].
 * Siglas (<abbr class="sigla" data-s>): se pronuncia lo indicado en "leer" de data/siglas.json
 * (diccionario LEER de scripts/revisar_texto.py); si no hay, las de mayúsculas y cifras se
 * deletrean ("VPC" → "V P C", "EC2" → "E C 2") y el resto se lee tal cual.
 *
 * Se lee frase a frase (Chrome corta las locuciones largas) resaltando el bloque actual. Pausar
 * equivale a parar y recordar el bloque (pause/resume falla en varios navegadores): "Seguir" vuelve
 * a empezar ese bloque. Velocidad y voz se recuerdan en localStorage (apuntes-aws.lectura).
 */
(function () {
  const voz = window.speechSynthesis;
  if (!voz || !window.SpeechSynthesisUtterance) return;
  const cab = document.querySelector('.service-head');
  const docs = [...document.querySelectorAll('article.doc')];
  if (!cab || !docs.length) return;

  const BLOQUES = 'h2, h3, h4, p, li, blockquote, dt, dd, tr, .callout';
  const SALTAR = 'pre, .quiz, .audio-recurso, [data-sin-lectura], [hidden], .lectura-barra';
  const SECCIONES_SIN_LECTURA = new Set(['preguntas', 'fuentes']);
  const VELOCIDADES = [0.8, 1, 1.25, 1.5, 1.75];
  const CLAVE = 'apuntes-aws.lectura';

  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function leerPref() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch { return {}; }
  }
  function guardarPref(cambios) {
    try { localStorage.setItem(CLAVE, JSON.stringify({ ...leerPref(), ...cambios })); } catch { /* sin almacenamiento */ }
  }

  // ── Voces ─────────────────────────────────────────────────────────────────────────────
  /**
   * Voces en español, la predeterminada primero: las de Google (en Chrome suenan mejor, aunque son en
   * línea; decisión del usuario, 04/11/2026), después las de España y después las locales. La voz que
   * el usuario elija en el selector se recuerda y manda sobre este orden.
   */
  function vocesEs() {
    const puntos = (v) => (/google/i.test(v.name) ? 4 : 0) + (/es[-_]ES/i.test(v.lang) ? 2 : 0) + (v.localService ? 1 : 0);
    return voz.getVoices().filter((v) => /^es([-_]|$)/i.test(v.lang)).sort((a, b) => puntos(b) - puntos(a));
  }

  /** Espera a que el navegador cargue la lista de voces (en Chrome llega después, asíncrona). */
  function esperarVoces() {
    if (voz.getVoices().length) return Promise.resolve();
    return new Promise((ok) => {
      const fin = () => { voz.removeEventListener?.('voiceschanged', fin); ok(); };
      voz.addEventListener?.('voiceschanged', fin);
      setTimeout(fin, 1500);
    });
  }

  // ── Texto ─────────────────────────────────────────────────────────────────────────────
  let leer = {};
  // Se pide al cargar (no tras el clic) para que la voz arranque dentro del gesto del usuario.
  const cargaLeer = window.AwsDatos.json('data/siglas.json').then((d) => d.leer || {}).catch(() => ({}));

  function pronunciar(sigla) {
    if (leer[sigla]) return leer[sigla];
    if (!/^[A-ZÑ0-9/-]+$/.test(sigla) || !/[A-Z]/.test(sigla)) return sigla;
    // Letras separadas, cifras juntas: "EC2" → "E C 2", "AES-256" → "A E S 256", "CI/CD" → "C I C D".
    return sigla.replace(/[/-]/g, ' ').replace(/[A-ZÑ]/g, ' $& ').replace(/\s+/g, ' ').trim();
  }

  /** Texto hablado de un bloque, sin sus bloques anidados (se leen aparte). */
  function textoDe(el) {
    if (el.tagName === 'TR') {
      return [...el.children].map((c) => textoDe(c)).filter(Boolean).join('. ');
    }
    const copia = el.cloneNode(true);
    copia.querySelectorAll(`${BLOQUES}, pre, .sigla-exp, [data-sin-lectura]`).forEach((x) => x.remove());
    copia.querySelectorAll('abbr.sigla').forEach((a) => {
      const visible = a.textContent;
      const s = a.dataset.s || visible;
      a.textContent = pronunciar(s) + (visible.length > s.length && visible.startsWith(s) ? visible.slice(s.length) : '');
    });
    return copia.textContent.replace(/\s+/g, ' ').trim();
  }

  /** Divide un texto en frases de longitud manejable (Chrome corta a los ~15 s). */
  function trozos(texto) {
    const frases = texto.match(/[^.!?;]+(?:[.!?;]+|$)/g) || [texto];
    const out = [];
    for (let f of frases.map((x) => x.trim()).filter(Boolean)) {
      while (f.length > 220) {
        let corte = f.lastIndexOf(', ', 220);
        if (corte < 80) corte = f.lastIndexOf(' ', 220);
        if (corte < 1) corte = 220;
        out.push(f.slice(0, corte + 1).trim());
        f = f.slice(corte + 1).trim();
      }
      if (f) out.push(f);
    }
    return out;
  }

  function recoger() {
    const bloques = [];
    const anadir = (el) => {
      const t = textoDe(el);
      if (t) bloques.push({ el, trozos: trozos(t) });
    };
    const titulo = cab.querySelector('.service-title');
    if (titulo) anadir(titulo);
    const frase = cab.querySelector('.meta-frase');
    if (frase) anadir(frase);
    for (const doc of docs) {
      let saltando = false;
      for (const el of doc.querySelectorAll(BLOQUES)) {
        if (el.tagName === 'H2') saltando = SECCIONES_SIN_LECTURA.has(el.id);
        if (saltando || el.closest(SALTAR)) continue;
        if (el.tagName === 'TR' && el.closest('thead')) continue; // la cabecera de tabla, sin más contexto, confunde
        anadir(el);
      }
    }
    return bloques;
  }

  // ── Interfaz ──────────────────────────────────────────────────────────────────────────
  const pref = leerPref();
  let velocidad = VELOCIDADES.includes(pref.velocidad) ? pref.velocidad : 1;
  let bloques = null;
  let indice = 0;
  let trozo = 0;
  let estado = 'parado'; // parado | leyendo | pausado
  let turno = 0; // invalida los eventos de locuciones canceladas
  let barra = null;

  const fila = document.createElement('div');
  fila.className = 'meta-row lectura-accion';
  fila.innerHTML = '<button type="button" class="btn btn-secondary btn-sm"><span aria-hidden="true">🔊</span> Escuchar la guía</button>';
  cab.appendChild(fila);
  const boton = fila.querySelector('button');

  function vozElegida() {
    const lista = vocesEs();
    const nombre = barra?.querySelector('[data-voz]')?.value || leerPref().voz;
    return lista.find((v) => v.voiceURI === nombre) || lista[0] || null;
  }

  function resaltar() {
    document.querySelectorAll('.leyendo').forEach((x) => x.classList.remove('leyendo'));
    const b = bloques?.[indice];
    if (!b || estado === 'parado') return;
    b.el.classList.add('leyendo');
    const r = b.el.getBoundingClientRect();
    const alto = window.innerHeight - (barra?.offsetHeight || 0);
    if (r.top < 70 || r.bottom > alto) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      b.el.scrollIntoView({ block: 'center', behavior: suave ? 'smooth' : 'auto' });
    }
  }

  function hablar() {
    const mio = ++turno;
    const b = bloques[indice];
    if (!b) return parar();
    const u = new SpeechSynthesisUtterance(b.trozos[trozo]);
    const v = vozElegida();
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'es-ES';
    u.rate = velocidad;
    u.onend = () => {
      if (mio !== turno || estado !== 'leyendo') return;
      if (++trozo >= b.trozos.length) { trozo = 0; indice++; resaltar(); pintar(); }
      if (indice >= bloques.length) parar(); else hablar();
    };
    u.onerror = (e) => {
      if (mio !== turno || e.error === 'interrupted' || e.error === 'canceled') return;
      console.error('Lectura:', e.error);
      parar();
    };
    voz.speak(u);
  }

  function pintar() {
    if (!barra) return;
    barra.querySelector('[data-pausa]').innerHTML = estado === 'leyendo'
      ? '<span aria-hidden="true">⏸</span> Pausar'
      : '<span aria-hidden="true">▶</span> Seguir';
    barra.querySelector('[data-pos]').textContent = `${Math.min(indice + 1, bloques.length)} / ${bloques.length}`;
    barra.querySelector('[data-ant]').disabled = indice <= 0;
    barra.querySelector('[data-sig]').disabled = indice >= bloques.length - 1;
  }

  function ir(nuevo) {
    indice = Math.max(0, Math.min(nuevo, bloques.length - 1));
    trozo = 0;
    voz.cancel();
    if (estado === 'pausado') estado = 'leyendo';
    // No se oyen dos cosas a la vez: el audio de NotebookLM se pausa.
    document.querySelectorAll('audio').forEach((a) => a.pause());
    resaltar();
    pintar();
    hablar();
  }

  function pausar() {
    turno++;
    voz.cancel();
    estado = 'pausado';
    trozo = 0;
    pintar();
  }

  function parar() {
    turno++;
    voz.cancel();
    estado = 'parado';
    resaltar();
    if (barra) { barra.remove(); barra = null; }
    document.body.classList.remove('con-lectura');
    boton.hidden = false;
    boton.focus({ preventScroll: true });
  }

  function crearBarra() {
    const voces = vocesEs();
    const elegida = vozElegida();
    barra = document.createElement('div');
    barra.className = 'lectura-barra';
    barra.setAttribute('role', 'region');
    barra.setAttribute('aria-label', 'Lectura en voz alta');
    barra.innerHTML = `
      <div class="lectura-botones">
        <button type="button" class="btn btn-secondary btn-sm" data-ant aria-label="Bloque anterior">⏮</button>
        <button type="button" class="btn btn-primary btn-sm" data-pausa></button>
        <button type="button" class="btn btn-secondary btn-sm" data-sig aria-label="Bloque siguiente">⏭</button>
        <button type="button" class="btn btn-secondary btn-sm" data-parar><span aria-hidden="true">■</span> Parar</button>
        <span class="lectura-pos text-faint" data-pos></span>
      </div>
      <div class="lectura-ajustes">
        <label>Velocidad <select data-vel>${VELOCIDADES.map((x) =>
          `<option value="${x}"${x === velocidad ? ' selected' : ''}>${String(x).replace('.', ',')}×</option>`).join('')}</select></label>
        ${voces.length > 1 ? `<label>Voz <select data-voz>${voces.map((v) =>
          `<option value="${esc(v.voiceURI)}"${v === elegida ? ' selected' : ''}>${esc(v.name)}${v.localService ? '' : ' (en línea)'}</option>`).join('')}</select></label>` : ''}
      </div>`;
    document.body.appendChild(barra);
    document.body.classList.add('con-lectura');
    barra.querySelector('[data-pausa]').addEventListener('click', () => (estado === 'leyendo' ? pausar() : ir(indice)));
    barra.querySelector('[data-ant]').addEventListener('click', () => ir(indice - 1));
    barra.querySelector('[data-sig]').addEventListener('click', () => ir(indice + 1));
    barra.querySelector('[data-parar]').addEventListener('click', parar);
    barra.querySelector('[data-vel]').addEventListener('change', (e) => {
      velocidad = Number(e.target.value);
      guardarPref({ velocidad });
      if (estado === 'leyendo') ir(indice);
    });
    barra.querySelector('[data-voz]')?.addEventListener('change', (e) => {
      guardarPref({ voz: e.target.value });
      if (estado === 'leyendo') ir(indice);
    });
  }

  boton.addEventListener('click', async () => {
    await esperarVoces();
    if (!vocesEs().length) {
      boton.disabled = true;
      boton.textContent = 'Sin voz en español en este navegador';
      return;
    }
    leer = await cargaLeer;
    bloques = recoger();
    if (!bloques.length) return;
    boton.hidden = true;
    estado = 'leyendo';
    crearBarra();
    ir(0);
    barra?.querySelector('[data-pausa]').focus({ preventScroll: true });
  });

  // Si arranca el audio de NotebookLM, la lectura se pausa.
  document.addEventListener('play', () => { if (estado === 'leyendo') pausar(); }, true);
  // Chrome sigue hablando tras salir de la página si no se cancela.
  window.addEventListener('pagehide', () => voz.cancel());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && barra && !e.target.closest('select')) parar();
  });
})();
