/**
 * Arquitecto (arquitecto.html): cada escenario de data/escenarios.json es un caso con requisitos
 * y un diagrama con huecos. El jugador coloca en cada hueco una ficha de servicio: arrastrándola
 * (ratón) o tocando el hueco y la ficha, en cualquier orden (táctil y teclado). El botón "?" de
 * cada hueco dice la categoría del servicio que falta. "Comprobar" marca cada hueco y explica por
 * qué encaja o no, sin revelar la respuesta de los fallados hasta "Ver la solución". Sin puntos ni
 * clasificación.
 * Fichas: el primer servicio válido de cada hueco más las fichas de distracción del escenario (y
 * las de modo difícil). Un hueco puede admitir varios servicios ("validos").
 * En escritorio el diagrama es una rejilla (col/fila de cada nodo) con flechas en un SVG encima;
 * en móvil pasa a una lista de pasos con sus conexiones escritas.
 * La configuración vive en la URL (?escenario=kopi&cert=SAA-C03&dificil=1) y la última usada, con
 * los escenarios resueltos, en localStorage (apuntes-aws.arquitecto, ver aviso legal, privacidad).
 */
(function () {
  const { cargar, json, esc, urlServicio, iconoServicio, iconoCategoria } = window.AwsDatos;

  const $ = (id) => document.getElementById(id);
  const el = {
    escenario: $('a-escenario'),
    cert: $('a-cert'),
    dificil: $('a-dificil'),
    azar: $('a-azar'),
    juego: $('arq-juego'),
  };

  const CLAVE = 'apuntes-aws.arquitecto';
  const NIVELES = [['básico', 'Básico'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']];
  const config = { escenario: '', cert: '', dificil: false };
  let datos = null;
  let escenarios = [];
  let glosario = null;
  let resueltos = new Set();
  let partida = null;

  // ── Utilidades ──────────────────────────────────────────────
  function barajar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Texto plano escapado y con tooltips en las siglas (data/siglas.json). */
  function texto(t) {
    const e = esc(t);
    return glosario && window.AwsSiglas ? window.AwsSiglas.marcar(e, '*', glosario) : e;
  }

  const servicio = (id) => datos.servicioPorId.get(id);
  const enlace = (s) => `<a href="${esc(urlServicio(s))}">${esc(s.nombre)}</a>`;
  const icono = (s, clase) => iconoServicio(s, datos.categoriaPorId.get(s.categoria), clase).replace(' loading="lazy"', '');

  // ── Configuración <-> URL y localStorage ────────────────────
  function leerAlmacen() {
    try {
      const a = JSON.parse(localStorage.getItem(CLAVE) || '{}');
      return a && typeof a === 'object' ? a : {};
    } catch {
      return {};
    }
  }

  function guardarAlmacen() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ config, resueltos: [...resueltos] }));
    } catch { /* sin almacenamiento: no se guarda */ }
  }

  function certsUsadas() {
    const usadas = new Set(escenarios.flatMap((e) => e.certificaciones));
    return datos.certificaciones.filter((c) => c.estado !== 'guia-pendiente' && usadas.has(c.codigo));
  }

  function aplicarConfig(c) {
    config.cert = certsUsadas().some((x) => x.codigo === c.cert) ? c.cert : '';
    config.escenario = String(c.escenario || '');
    config.dificil = Boolean(c.dificil);
  }

  /** La URL manda; sin parámetros, se recupera la última configuración usada. */
  function leerConfig() {
    const almacen = leerAlmacen();
    resueltos = new Set(Array.isArray(almacen.resueltos) ? almacen.resueltos : []);
    const p = new URLSearchParams(location.search);
    if ([...p.keys()].length) {
      aplicarConfig({ escenario: p.get('escenario'), cert: p.get('cert'), dificil: p.get('dificil') === '1' });
    } else {
      aplicarConfig(almacen.config || {});
    }
  }

  function escribirConfig() {
    const p = new URLSearchParams();
    if (config.escenario) p.set('escenario', config.escenario);
    if (config.cert) p.set('cert', config.cert);
    if (config.dificil) p.set('dificil', '1');
    const q = p.toString();
    history.replaceState(null, '', `${location.pathname}${q ? `?${q}` : ''}`);
    guardarAlmacen();
  }

  // ── Panel de configuración ──────────────────────────────────
  const disponibles = () => escenarios.filter((e) => !config.cert || e.certificaciones.includes(config.cert));

  function renderControles() {
    el.cert.insertAdjacentHTML('beforeend', certsUsadas().map((c) =>
      `<option value="${esc(c.codigo)}">${esc(c.codigo)} · ${esc(c.nombreCorto)}</option>`).join(''));
    el.cert.addEventListener('change', () => { config.cert = el.cert.value; nuevaPartida(); });
    el.escenario.addEventListener('change', () => { config.escenario = el.escenario.value; nuevaPartida(); });
    el.dificil.addEventListener('click', () => { config.dificil = !config.dificil; nuevaPartida(); });
    el.azar.addEventListener('click', () => {
      const otros = disponibles().filter((e) => e.id !== config.escenario);
      if (otros.length) config.escenario = barajar(otros)[0].id;
      nuevaPartida();
    });
  }

  function sincronizarControles() {
    el.cert.value = config.cert;
    const lista = disponibles();
    el.escenario.innerHTML = NIVELES.map(([nivel, nombre]) => {
      const grupo = lista.filter((e) => e.nivel === nivel);
      if (!grupo.length) return '';
      return `<optgroup label="${nombre}">${grupo.map((e) =>
        `<option value="${esc(e.id)}">${resueltos.has(e.id) ? '✓ ' : ''}${esc(e.titulo)}</option>`).join('')}</optgroup>`;
    }).join('');
    el.escenario.value = config.escenario;
    el.dificil.setAttribute('aria-pressed', String(config.dificil));
  }

  // ── Partida ─────────────────────────────────────────────────
  function nuevaPartida() {
    const lista = disponibles();
    if (!lista.some((e) => e.id === config.escenario)) config.escenario = lista.length ? lista[0].id : '';
    sincronizarControles();
    escribirConfig();

    const esc0 = escenarios.find((e) => e.id === config.escenario);
    if (!esc0) {
      partida = null;
      el.juego.innerHTML = '<p class="empty-state">No hay escenarios para esta certificación todavía.</p>';
      return;
    }

    const huecos = esc0.nodos.filter((n) => n.hueco).map((nodo, i) => ({ nodo, num: i + 1, ficha: null, estado: null }));
    let uid = 0;
    const fichas = [];
    huecos.forEach((h, i) => fichas.push({ uid: `f${uid++}`, id: h.nodo.hueco.validos[0], paraHueco: i }));
    const extra = [...(esc0.distractores || []), ...(config.dificil ? esc0.distractoresDificil || [] : [])];
    for (const id of extra) fichas.push({ uid: `f${uid++}`, id, paraHueco: null });

    partida = {
      esc: esc0,
      huecos,
      fichas: barajar(fichas).filter((f) => servicio(f.id)),
      sel: null,
      comprobada: false,
      solucion: false,
    };
    renderPartida();
  }

  const fichaPorUid = (uid) => partida.fichas.find((f) => f.uid === uid);
  const huecoDeFicha = (uid) => partida.huecos.findIndex((h) => h.ficha === uid);
  const bloqueado = (h) => h.estado === 'ok' || partida.solucion;

  function nombreNodo(n) {
    const h = partida.huecos.find((x) => x.nodo === n);
    if (h) return `Hueco ${h.num}`;
    if (n.servicio) return n.texto ? `${servicio(n.servicio).nombre} (${n.texto})` : servicio(n.servicio).nombre;
    return n.texto;
  }

  function htmlNodo(n) {
    const pos = `grid-column:${n.col};grid-row:${n.fila}`;
    const salen = partida.esc.flechas.filter((f) => f.de === n.id);
    const nodos = new Map(partida.esc.nodos.map((x) => [x.id, x]));
    const conex = salen.length
      ? `<ul class="arq-conex">${salen.map((f) => `<li>→ ${esc(nombreNodo(nodos.get(f.a)))}${f.texto ? ` <span>(${esc(f.texto)})</span>` : ''}</li>`).join('')}</ul>`
      : '';
    const i = partida.huecos.findIndex((h) => h.nodo === n);
    if (i >= 0) {
      return `<div class="arq-nodo arq-nodo-hueco" data-nodo="${esc(n.id)}" data-i="${i}" style="${pos}">
          <div class="arq-hueco-slot"></div>${conex}</div>`;
    }
    if (n.servicio) {
      const s = servicio(n.servicio);
      return `<div class="arq-nodo arq-nodo-servicio" data-nodo="${esc(n.id)}" style="${pos}">
          <div class="arq-nodo-cab">${icono(s, 'arq-icono')}<span class="arq-nodo-nombre">${esc(s.nombre)}</span></div>
          ${n.texto ? `<span class="arq-nodo-texto">${esc(n.texto)}</span>` : ''}${conex}</div>`;
    }
    return `<div class="arq-nodo arq-nodo-fijo" data-nodo="${esc(n.id)}" style="${pos}">
        <span class="arq-nodo-texto">${esc(n.texto)}</span>${conex}</div>`;
  }

  function renderPartida() {
    const e = partida.esc;
    const cols = Math.max(...e.nodos.map((n) => n.col));
    const filas = Math.max(...e.nodos.map((n) => n.fila));
    const nivel = NIVELES.find(([id]) => id === e.nivel);
    el.juego.innerHTML = `
      <article class="arq-caso">
        <div class="arq-caso-cab">
          <h2>${esc(e.titulo)}${resueltos.has(e.id) ? ' <span class="chip chip-ok-fijo" title="Ya lo resolviste en este navegador">✓ Resuelto</span>' : ''}</h2>
          <div class="chips">
            <span class="chip">${esc(nivel ? nivel[1] : e.nivel)}</span>
            ${e.certificaciones.map((c) => `<span class="chip chip-cert">${esc(c)}</span>`).join('')}
            ${e.kopi ? '<span class="chip chip-kopi">Usado en Kopi</span>' : ''}
          </div>
        </div>
        <p>${texto(e.enunciado)}</p>
        ${e.requisitos && e.requisitos.length ? `<h3 class="arq-sub">Requisitos</h3>
        <ul class="arq-requisitos">${e.requisitos.map((r) => `<li>${texto(r)}</li>`).join('')}</ul>` : ''}
      </article>

      <div class="arq-diagrama" id="arq-diagrama" style="--cols:${cols};--filas:${filas}">
        <svg class="arq-flechas" id="arq-flechas" aria-hidden="true"></svg>
        ${e.nodos.map(htmlNodo).join('')}
      </div>

      <div class="arq-panel" id="arq-panel">
        <div class="arq-panel-cab">
          <h3 class="arq-sub" id="arq-fichas-titulo">Fichas</h3>
          <div class="arq-acciones">
            <button class="btn btn-secondary btn-sm" type="button" id="arq-vaciar">Vaciar</button>
            <button class="btn btn-primary btn-sm" type="button" id="arq-comprobar">Comprobar</button>
          </div>
        </div>
        <div class="arq-fichas" id="arq-fichas" role="group" aria-labelledby="arq-fichas-titulo"></div>
        <p class="memo-mensaje" id="arq-mensaje" aria-live="polite"></p>
      </div>

      <div class="memo-final arq-resultado" id="arq-resultado" hidden></div>`;
    $('arq-vaciar').addEventListener('click', vaciar);
    $('arq-comprobar').addEventListener('click', comprobar);
    for (const img of el.juego.querySelectorAll('.arq-diagrama img')) img.addEventListener('load', programarFlechas);
    decir('Elige una ficha y luego el hueco donde va (o arrástrala). El botón ? da la categoría.');
    pintar();
  }

  // ── Pintado del estado (huecos y fichas) ────────────────────
  function htmlHueco(h, i) {
    const f = h.ficha && fichaPorUid(h.ficha);
    const s = f && servicio(f.id);
    const elegido = partida.sel && partida.sel.tipo === 'hueco' && partida.sel.i === i;
    const estado = h.estado === 'ok' ? ', correcto' : h.estado === 'ko' ? ', incorrecto' : '';
    const cats = [...new Set(h.nodo.hueco.validos.map((id) => servicio(id).categoria))].map((c) => datos.categoriaPorId.get(c));
    const pistaId = `arq-pista-${i}`;
    return `
      <button type="button" class="arq-hueco${elegido ? ' is-elegido' : ''}" data-hueco="${i}" aria-pressed="${elegido}"
          ${s && !bloqueado(h) ? 'draggable="true"' : ''} ${bloqueado(h) ? 'aria-disabled="true"' : ''}
          aria-label="Hueco ${h.num}: ${s ? esc(s.nombre) : 'vacío'}${estado}">
        <span class="arq-hueco-num">Hueco ${h.num}${h.estado === 'ok' ? ' ✓' : h.estado === 'ko' ? ' ✗' : ''}</span>
        ${s ? `<span class="arq-nodo-cab">${icono(s, 'arq-icono')}<span class="arq-nodo-nombre">${esc(s.nombre)}</span></span>`
          : '<span class="arq-hueco-vacio">Suelta aquí una ficha</span>'}
      </button>
      <div class="arq-hueco-herr">
        ${s && !bloqueado(h) ? `<button type="button" class="arq-mini" data-quitar="${i}" aria-label="Quitar la ficha del hueco ${h.num}" title="Quitar">×</button>` : ''}
        <button type="button" class="arq-mini arq-pista-btn" data-pista="${i}" aria-expanded="${Boolean(h.pista)}"
          aria-controls="${pistaId}" aria-label="Pista: categoría del hueco ${h.num}" title="¿Qué categoría va aquí?">?</button>
      </div>
      <p class="arq-pista" id="${pistaId}"${h.pista ? '' : ' hidden'}>Categoría: ${cats.map((c) => `<span class="arq-pista-cat">${iconoCategoria(c, 'arq-cat-icono')}${esc(c.nombre)}</span>`).join(' o ')}</p>`;
  }

  function htmlFicha(f) {
    const s = servicio(f.id);
    const elegida = partida.sel && partida.sel.tipo === 'ficha' && partida.sel.uid === f.uid;
    return `<button type="button" class="arq-ficha${elegida ? ' is-elegido' : ''}" data-uid="${esc(f.uid)}" draggable="true"
        aria-pressed="${elegida}">${icono(s, 'arq-icono')}<span>${esc(s.nombre)}</span></button>`;
  }

  /** Repinta huecos y fichas conservando el foco (los botones se recrean). */
  function pintar() {
    const activo = document.activeElement;
    const clave = activo && el.juego.contains(activo)
      ? ['data-hueco', 'data-uid', 'data-pista', 'data-quitar'].map((a) => [a, activo.getAttribute(a)]).find(([, v]) => v !== null)
      : null;

    partida.huecos.forEach((h, i) => {
      const nodo = el.juego.querySelector(`.arq-nodo-hueco[data-i="${i}"]`);
      nodo.classList.toggle('is-ok', h.estado === 'ok');
      nodo.classList.toggle('is-ko', h.estado === 'ko');
      nodo.querySelector('.arq-hueco-slot').innerHTML = htmlHueco(h, i);
    });
    const libres = partida.fichas.filter((f) => huecoDeFicha(f.uid) < 0);
    $('arq-fichas').innerHTML = libres.map(htmlFicha).join('')
      || '<p class="text-faint arq-fichas-vacio">Todas las fichas están colocadas.</p>';

    const llenos = partida.huecos.filter((h) => h.ficha).length;
    const comprobar = $('arq-comprobar');
    comprobar.disabled = partida.solucion || llenos < partida.huecos.length || partida.huecos.every((h) => h.estado === 'ok');
    comprobar.title = llenos < partida.huecos.length ? `Faltan ${partida.huecos.length - llenos} huecos por rellenar` : '';
    $('arq-vaciar').disabled = partida.solucion || !partida.huecos.some((h) => h.ficha && !bloqueado(h));

    if (clave) {
      let destino = el.juego.querySelector(`[${clave[0]}="${CSS.escape(clave[1])}"]`);
      // La ficha que se acaba de colocar ya no está en la bandeja: el foco pasa a su hueco.
      if (!destino && clave[0] === 'data-uid') {
        const i = huecoDeFicha(clave[1]);
        if (i >= 0) destino = el.juego.querySelector(`[data-hueco="${i}"]`);
      }
      if (!destino && clave[0] === 'data-quitar') destino = el.juego.querySelector(`[data-hueco="${clave[1]}"]`);
      if (destino) destino.focus({ preventScroll: true });
    }
    for (const img of el.juego.querySelectorAll('.arq-hueco img')) img.addEventListener('load', programarFlechas);
    programarFlechas();
  }

  function decir(t, clase = '') {
    const m = $('arq-mensaje');
    if (!m) return;
    m.className = `memo-mensaje ${clase}`;
    m.textContent = t;
  }

  // ── Acciones ────────────────────────────────────────────────
  /** Coloca la ficha en el hueco i. Si venía de otro hueco, se intercambian; si no, la anterior vuelve a la bandeja. */
  function colocar(uid, i) {
    const h = partida.huecos[i];
    if (bloqueado(h)) return;
    const origen = huecoDeFicha(uid);
    if (origen === i) return;
    if (origen >= 0) {
      if (bloqueado(partida.huecos[origen])) return;
      partida.huecos[origen].ficha = h.ficha;
      partida.huecos[origen].estado = null;
    }
    h.ficha = uid;
    h.estado = null;
    partida.sel = null;
    decir(`${servicio(fichaPorUid(uid).id).nombre} en el hueco ${h.num}.`);
    pintar();
  }

  function quitar(i) {
    const h = partida.huecos[i];
    if (!h.ficha || bloqueado(h)) return;
    const s = servicio(fichaPorUid(h.ficha).id);
    h.ficha = null;
    h.estado = null;
    partida.sel = null;
    decir(`${s.nombre} vuelve a las fichas.`);
    pintar();
  }

  function vaciar() {
    for (const h of partida.huecos) {
      if (!bloqueado(h)) { h.ficha = null; h.estado = null; }
    }
    partida.sel = null;
    decir('Huecos vaciados.');
    pintar();
  }

  function pulsarFicha(uid) {
    const sel = partida.sel;
    if (sel && sel.tipo === 'hueco') { colocar(uid, sel.i); return; }
    if (sel && sel.tipo === 'ficha' && sel.uid === uid) {
      partida.sel = null;
      decir('');
    } else {
      partida.sel = { tipo: 'ficha', uid };
      decir(`${servicio(fichaPorUid(uid).id).nombre} elegida: ahora toca un hueco.`);
    }
    pintar();
  }

  function pulsarHueco(i) {
    const h = partida.huecos[i];
    if (bloqueado(h)) {
      decir(`El hueco ${h.num} ya está bien resuelto.`, 'ok');
      return;
    }
    const sel = partida.sel;
    if (sel && sel.tipo === 'ficha') { colocar(sel.uid, i); return; }
    if (sel && sel.tipo === 'hueco' && sel.i !== i) {
      // Dos huecos seguidos: se intercambian sus fichas.
      const otro = partida.huecos[sel.i];
      [h.ficha, otro.ficha] = [otro.ficha, h.ficha];
      h.estado = null;
      otro.estado = null;
      partida.sel = null;
      decir(`Intercambiados los huecos ${otro.num} y ${h.num}.`);
      pintar();
      return;
    }
    if (sel && sel.tipo === 'hueco') {
      partida.sel = null;
      decir('');
    } else {
      partida.sel = { tipo: 'hueco', i };
      decir(`Hueco ${h.num} elegido: ahora toca una ficha${h.ficha ? ' (u otro hueco para intercambiarlas)' : ''}.`);
    }
    pintar();
  }

  function pista(i) {
    const h = partida.huecos[i];
    h.pista = !h.pista;
    pintar();
  }

  // ── Comprobación y solución ─────────────────────────────────
  function comprobar() {
    for (const h of partida.huecos) {
      if (!h.ficha) return;
      h.estado = h.nodo.hueco.validos.includes(fichaPorUid(h.ficha).id) ? 'ok' : 'ko';
    }
    partida.comprobada = true;
    partida.sel = null;
    const bien = partida.huecos.filter((h) => h.estado === 'ok').length;
    const total = partida.huecos.length;
    if (bien === total) {
      resueltos.add(partida.esc.id);
      guardarAlmacen();
      sincronizarControles();
      decir('¡Diagrama completo! Todos los huecos son correctos.', 'ok');
    } else {
      decir(`${bien} de ${total} huecos correctos. Cambia las fichas marcadas en rojo y vuelve a comprobar.`, 'ko');
    }
    pintar();
    renderResultado();
  }

  function verSolucion() {
    // Cada hueco recibe su propia ficha. También los ya acertados: una ficha válida en dos huecos
    // (dos colas SQS, S3 como documentos o como vectores) podría estar ocupando la de otro.
    partida.huecos.forEach((h, i) => {
      h.ficha = partida.fichas.find((f) => f.paraHueco === i).uid;
      h.estado = 'ok';
    });
    partida.solucion = true;
    partida.sel = null;
    decir('Esta es la solución. Debajo tienes la explicación de cada hueco.');
    pintar();
    renderResultado();
  }

  function renderResultado() {
    const e = partida.esc;
    const caja = $('arq-resultado');
    const total = partida.huecos.length;
    const bien = partida.huecos.filter((h) => h.estado === 'ok').length;
    const completo = bien === total;
    const items = partida.huecos.map((h) => {
      const puesto = servicio(fichaPorUid(h.ficha).id);
      const hueco = h.nodo.hueco;
      if (h.estado === 'ok') {
        const otros = hueco.validos.filter((id) => id !== puesto.id).map(servicio);
        return `<li class="arq-exp is-ok"><strong>Hueco ${h.num} · ${enlace(puesto)} ✓</strong>
          <p>${texto(hueco.explicacion)}</p>
          ${otros.length ? `<p class="arq-tambien">También vale: ${otros.map(enlace).join(', ')}.</p>` : ''}</li>`;
      }
      const porque = (hueco.noVale || {})[puesto.id]
        || `${puesto.nombre} no es lo que pide este hueco. En una frase: ${puesto.frase}`;
      return `<li class="arq-exp is-ko"><strong>Hueco ${h.num} · ${enlace(puesto)} ✗</strong>
        <p>${texto(porque)}</p>
        <p class="arq-tambien">Prueba otra ficha o pulsa <strong>?</strong> en el hueco para ver su categoría.</p></li>`;
    }).join('');
    const siguiente = disponibles();
    caja.innerHTML = `
      <h2 tabindex="-1">${completo ? (partida.solucion ? 'Solución' : '¡Diagrama completo!') : `${bien} de ${total} huecos correctos`}</h2>
      <ol class="arq-explicaciones">${items}</ol>
      ${e.kopi && completo ? '<p>Las guías de estos servicios tienen una sección «Así lo uso en Kopi» con los detalles reales.</p>' : ''}
      <p class="arq-final-acciones">
        ${!completo ? '<button class="btn btn-secondary" type="button" id="arq-solucion">Ver la solución</button>' : ''}
        <button class="btn btn-secondary" type="button" id="arq-repetir">Repetir</button>
        ${siguiente.length > 1 ? '<button class="btn btn-primary" type="button" id="arq-siguiente">Siguiente escenario</button>' : ''}
      </p>`;
    caja.hidden = false;
    const sol = $('arq-solucion');
    if (sol) sol.addEventListener('click', verSolucion);
    $('arq-repetir').addEventListener('click', () => { nuevaPartida(); el.juego.scrollIntoView({ block: 'start' }); });
    const sig = $('arq-siguiente');
    if (sig) {
      sig.addEventListener('click', () => {
        const i = siguiente.findIndex((x) => x.id === e.id);
        config.escenario = siguiente[(i + 1) % siguiente.length].id;
        nuevaPartida();
        el.juego.scrollIntoView({ block: 'start' });
      });
    }
    if (completo) {
      caja.scrollIntoView({ block: 'nearest' });
      caja.querySelector('h2').focus({ preventScroll: true });
    }
  }

  // ── Flechas del diagrama (SVG) ──────────────────────────────
  let flechasPendientes = false;
  function programarFlechas() {
    if (flechasPendientes) return;
    flechasPendientes = true;
    requestAnimationFrame(() => { flechasPendientes = false; dibujarFlechas(); });
  }

  /** Punto del borde del rectángulo (con margen) en la dirección (dx, dy) desde su centro. */
  function borde(r, dx, dy, margen) {
    const hw = r.width / 2 + margen;
    const hh = r.height / 2 + margen;
    const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return [r.cx + dx * t, r.cy + dy * t];
  }

  function dibujarFlechas() {
    const svg = $('arq-flechas');
    const diagrama = $('arq-diagrama');
    if (!svg || !partida || getComputedStyle(svg).display === 'none') return;
    const base = diagrama.getBoundingClientRect();
    svg.setAttribute('width', base.width);
    svg.setAttribute('height', base.height);
    svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
    const caja = (id) => {
      const n = diagrama.querySelector(`.arq-nodo[data-nodo="${CSS.escape(id)}"]`);
      const r = n.getBoundingClientRect();
      return { width: r.width, height: r.height, cx: r.left - base.left + r.width / 2, cy: r.top - base.top + r.height / 2 };
    };
    const lineas = partida.esc.flechas.map((f) => {
      const a = caja(f.de);
      const b = caja(f.a);
      const dx = b.cx - a.cx;
      const dy = b.cy - a.cy;
      const [x1, y1] = borde(a, dx, dy, 3);
      const [x2, y2] = borde(b, -dx, -dy, 5);
      let etiqueta = '';
      if (f.texto) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        etiqueta = Math.abs(dx) >= Math.abs(dy)
          ? `<text x="${mx}" y="${my - 6}" text-anchor="middle">${esc(f.texto)}</text>`
          : `<text x="${mx + 6}" y="${my}" dominant-baseline="middle">${esc(f.texto)}</text>`;
      }
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arq-punta)"></line>${etiqueta}`;
    });
    svg.innerHTML = `<defs><marker id="arq-punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" class="arq-punta"></path></marker></defs>${lineas.join('')}`;
  }

  // ── Eventos ─────────────────────────────────────────────────
  el.juego.addEventListener('click', (ev) => {
    if (!partida) return;
    const b = ev.target.closest('button');
    if (!b || !el.juego.contains(b)) return;
    if (b.dataset.uid) pulsarFicha(b.dataset.uid);
    else if (b.dataset.hueco !== undefined) pulsarHueco(Number(b.dataset.hueco));
    else if (b.dataset.pista !== undefined) pista(Number(b.dataset.pista));
    else if (b.dataset.quitar !== undefined) quitar(Number(b.dataset.quitar));
  });

  // Arrastrar y soltar (ratón): fichas de la bandeja o de un hueco a un hueco, o de un hueco a la bandeja.
  el.juego.addEventListener('dragstart', (ev) => {
    const b = ev.target.closest && ev.target.closest('[draggable="true"]');
    if (!b || !partida) return;
    const uid = b.dataset.uid || partida.huecos[Number(b.dataset.hueco)].ficha;
    ev.dataTransfer.setData('text/plain', uid);
    ev.dataTransfer.effectAllowed = 'move';
    b.classList.add('is-arrastrando');
  });
  el.juego.addEventListener('dragend', (ev) => {
    const b = ev.target.closest && ev.target.closest('.is-arrastrando');
    if (b) b.classList.remove('is-arrastrando');
    for (const x of el.juego.querySelectorAll('.is-sobre')) x.classList.remove('is-sobre');
  });
  const destinoDe = (ev) => {
    const hueco = ev.target.closest && ev.target.closest('.arq-nodo-hueco');
    if (hueco && !bloqueado(partida.huecos[Number(hueco.dataset.i)])) return hueco;
    return ev.target.closest && ev.target.closest('.arq-fichas');
  };
  el.juego.addEventListener('dragover', (ev) => {
    if (!partida) return;
    const d = destinoDe(ev);
    if (!d) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    for (const x of el.juego.querySelectorAll('.is-sobre')) if (x !== d) x.classList.remove('is-sobre');
    d.classList.add('is-sobre');
  });
  el.juego.addEventListener('dragleave', (ev) => {
    const d = destinoDe(ev);
    if (d && !d.contains(ev.relatedTarget)) d.classList.remove('is-sobre');
  });
  el.juego.addEventListener('drop', (ev) => {
    if (!partida) return;
    const d = destinoDe(ev);
    if (!d) return;
    ev.preventDefault();
    d.classList.remove('is-sobre');
    const uid = ev.dataTransfer.getData('text/plain');
    if (!fichaPorUid(uid)) return;
    if (d.classList.contains('arq-fichas')) {
      const i = huecoDeFicha(uid);
      if (i >= 0) quitar(i);
    } else {
      colocar(uid, Number(d.dataset.i));
    }
  });

  window.addEventListener('resize', programarFlechas);

  Promise.all([
    cargar(),
    json('data/escenarios.json'),
    window.AwsSiglas ? window.AwsSiglas.cargarGlosario().catch(() => null) : null,
  ]).then(([d, e, g]) => {
    datos = d;
    escenarios = e.escenarios;
    glosario = g;
    leerConfig();
    renderControles();
    nuevaPartida();
  }).catch((err) => {
    console.error(err);
    el.juego.innerHTML = '<p class="empty-state">No se pudieron cargar los escenarios. Si abriste el archivo directamente, sírvelo con <code>npx serve .</code> o <code>python -m http.server</code>.</p>';
  });
})();
