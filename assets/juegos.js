/**
 * Piezas comunes de los juegos (memoria.html, empareja.html) y de su clasificación
 * (clasificacion.html), en window.AwsJuegos.
 *
 * Clasificación: un top 10 de tiempos por juego, tamaño de tablero y modo difícil. Los dos juegos
 * comparten siete niveles de tamaño, así que la página de clasificación muestra solo dos tablas
 * (Memoria y Empareja) para el nivel y el modo elegidos. Solo entran los tamaños de un nivel; los
 * tableros reducidos que se montan cuando un filtro deja pocos servicios no cuentan.
 * Se guarda en localStorage (apuntes-aws.clasificacion, ver aviso legal, privacidad):
 *   { nombre: "<último nombre usado>", tablas: { "<juego>|<tablero>|<0|1>": [{ nombre, fecha, ms, acierto? }] } }
 */
(function () {
  const CLAVE = 'apuntes-aws.clasificacion';
  const PUESTOS = 10;
  const MAX_NOMBRE = 24;

  // Memoria: filas×columnas; Empareja: número de parejas.
  const NIVELES = [
    { memoria: '6x6', empareja: '6' },
    { memoria: '6x8', empareja: '8' },
    { memoria: '8x8', empareja: '10' },
    { memoria: '8x10', empareja: '12' },
    { memoria: '10x10', empareja: '16' },
    { memoria: '10x12', empareja: '20' },
    { memoria: '12x12', empareja: '24' },
  ];
  const JUEGOS = {
    memoria: { nombre: 'Memoria', url: 'memoria.html' },
    empareja: { nombre: 'Empareja', url: 'empareja.html' },
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Número de nivel (1–7) de un tablero, o 0 si ese tamaño no entra en la clasificación. */
  function nivelDe(juego, tablero) {
    return NIVELES.findIndex((n) => n[juego] === String(tablero)) + 1;
  }

  function textoTablero(juego, tablero) {
    if (juego === 'empareja') return `${tablero} parejas`;
    const [f, c] = String(tablero).split('x').map(Number);
    return `${f}×${c} (${f * c} cartas)`;
  }

  /** 83 456 ms → "1:23.4": la décima desempata tiempos que en segundos serían iguales. */
  function formatoTiempo(ms, decimas = true) {
    const seg = Math.floor(ms / 1000);
    const base = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
    return decimas ? `${base}.${Math.floor((ms % 1000) / 100)}` : base;
  }

  function formatoFecha(iso) {
    const [a, m, d] = String(iso).split('-');
    return d ? `${d}/${m}/${a}` : iso;
  }

  function barajar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Almacenamiento ──────────────────────────────────────────
  function leer() {
    try {
      const a = JSON.parse(localStorage.getItem(CLAVE) || '{}');
      return a && typeof a === 'object' ? { nombre: '', tablas: {}, ...a } : { nombre: '', tablas: {} };
    } catch {
      return { nombre: '', tablas: {} };
    }
  }

  function escribir(a) {
    try { localStorage.setItem(CLAVE, JSON.stringify(a)); } catch { /* sin almacenamiento: no se guarda */ }
  }

  const claveTabla = (juego, tablero, dificil) => `${juego}|${tablero}|${dificil ? 1 : 0}`;

  function tabla(juego, tablero, dificil) {
    const filas = leer().tablas[claveTabla(juego, tablero, dificil)];
    return Array.isArray(filas) ? filas : [];
  }

  /** Puesto (0-based) que ocuparía un tiempo, o -1 si no entra. A igual tiempo, manda el más antiguo. */
  function puestoPara(filas, ms) {
    const i = filas.findIndex((f) => ms < f.ms);
    const puesto = i === -1 ? filas.length : i;
    return puesto < PUESTOS ? puesto : -1;
  }

  function guardar(juego, tablero, dificil, marca) {
    const a = leer();
    const clave = claveTabla(juego, tablero, dificil);
    const filas = Array.isArray(a.tablas[clave]) ? a.tablas[clave] : [];
    const puesto = puestoPara(filas, marca.ms);
    if (puesto === -1) return -1;
    filas.splice(puesto, 0, marca);
    a.tablas[clave] = filas.slice(0, PUESTOS);
    a.nombre = marca.nombre;
    escribir(a);
    return puesto;
  }

  // ── Vistas ──────────────────────────────────────────────────
  function htmlTabla(juego, filas, resaltar = -1) {
    if (!filas.length) return '<p class="text-faint">Todavía no hay tiempos en esta tabla.</p>';
    const conAcierto = juego === 'empareja';
    return `<div class="sim-tabla-scroll"><table class="sim-tabla clas-tabla">
      <thead><tr><th scope="col">#</th><th scope="col">Nombre</th><th scope="col">Tiempo</th>${conAcierto ? '<th scope="col">Acierto</th>' : ''}<th scope="col">Fecha</th></tr></thead>
      <tbody>${filas.map((f, i) => `
        <tr${i === resaltar ? ' class="is-nueva"' : ''}><td>${i + 1}</td><th scope="row">${esc(f.nombre)}</th>
          <td class="clas-tiempo">${formatoTiempo(f.ms)}</td>${conAcierto ? `<td>${Math.round(f.acierto)} %</td>` : ''}
          <td>${esc(formatoFecha(f.fecha))}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  function enlaceClasificacion(juego, tablero, dificil) {
    const p = new URLSearchParams({ nivel: nivelDe(juego, tablero) });
    if (dificil) p.set('dificil', '1');
    return `clasificacion.html?${p}`;
  }

  /**
   * Bloque de la pantalla final: si el tiempo entra en el top 10, pide el nombre y lo guarda;
   * si no, dice cuánto falta. `partida` = { juego, tablero, dificil, ms, acierto? }.
   */
  function ofrecer(nodo, partida) {
    const { juego, tablero, dificil, ms } = partida;
    const ver = () => `<a href="${esc(enlaceClasificacion(juego, tablero, dificil))}">Ver la clasificación</a>`;
    nodo.className = 'clas-bloque';
    if (!nivelDe(juego, tablero)) {
      nodo.innerHTML = '<p class="text-faint">Este tablero no entra en la clasificación: solo cuentan los tamaños de la lista, y los filtros elegidos dejan menos servicios.</p>';
      return;
    }
    const filas = tabla(juego, tablero, dificil);
    const puesto = puestoPara(filas, ms);
    const modo = `${textoTablero(juego, tablero)}${dificil ? ', modo difícil' : ''}`;
    if (puesto === -1) {
      nodo.innerHTML = `<p>No entras en el top ${PUESTOS} de ${esc(modo)}: el décimo puesto tiene
        ${formatoTiempo(filas[PUESTOS - 1].ms)}. ${ver()}.</p>`;
      return;
    }
    nodo.innerHTML = `
      <form class="clas-form" novalidate>
        <label class="field">
          <span class="clas-form-titulo">¡Puesto ${puesto + 1} en la clasificación de ${esc(modo)}! Escribe tu nombre</span>
          <span class="clas-form-fila">
            <input class="input" name="nombre" maxlength="${MAX_NOMBRE}" autocomplete="nickname" required value="${esc(leer().nombre)}">
            <button class="btn btn-primary btn-sm" type="submit">Guardar</button>
          </span>
        </label>
        <p class="field-hint clas-error" aria-live="polite"></p>
      </form>`;
    const form = nodo.querySelector('form');
    const input = form.elements.nombre;
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const nombre = input.value.trim().replace(/\s+/g, ' ');
      if (!nombre) {
        form.querySelector('.clas-error').textContent = 'Escribe un nombre para guardar el tiempo.';
        input.focus();
        return;
      }
      const marca = { nombre, fecha: new Date().toISOString().slice(0, 10), ms };
      if (juego === 'empareja') marca.acierto = partida.acierto;
      const final = guardar(juego, tablero, dificil, marca);
      nodo.innerHTML = `<h3 tabindex="-1">Clasificación de ${esc(modo)}</h3>
        ${htmlTabla(juego, tabla(juego, tablero, dificil), final)}<p>${ver()}</p>`;
      nodo.querySelector('h3').focus();
    });
  }

  window.AwsJuegos = {
    NIVELES, JUEGOS, PUESTOS, nivelDe, textoTablero, formatoTiempo, barajar, tabla, htmlTabla, ofrecer,
  };
})();
