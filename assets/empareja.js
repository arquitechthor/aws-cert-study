/**
 * Empareja (empareja.html): a la izquierda, servicios (icono y nombre; en modo difícil solo el
 * icono) y a la derecha, la `frase` de cada uno, todo a la vista desde el principio. Se elige un
 * elemento de cada columna; si el servicio y la frase son del mismo servicio, quedan unidos.
 * El tiempo corre desde que se pulsa "Empezar" (antes las cartas no se ven, para que nadie las
 * lea con el reloj parado) y el acierto es parejas / intentos. Los tiempos van a la clasificación
 * común de los juegos (assets/juegos.js).
 * La configuración vive en la URL (?tablero=8&cert=DVA-C02&cat=a,b&dificil=1) y la última usada
 * en localStorage (apuntes-aws.empareja, ver aviso legal, privacidad).
 */
(function () {
  const { cargar, esc, urlServicio, iconoServicio } = window.AwsDatos;
  const { NIVELES, barajar, formatoTiempo, ofrecer } = window.AwsJuegos;

  const $ = (id) => document.getElementById(id);
  const el = {
    cert: $('e-cert'),
    tablero: $('e-tablero'),
    cats: $('e-cats'),
    dificil: $('e-dificil'),
    nueva: $('e-nueva'),
    hud: $('emp-hud'),
    parejas: $('emp-parejas'),
    acierto: $('emp-acierto'),
    fallos: $('emp-fallos'),
    tiempo: $('emp-tiempo'),
    mensaje: $('emp-mensaje'),
    juego: $('emp-tablero'),
    final: $('emp-final'),
  };

  const CLAVE = 'apuntes-aws.empareja';
  const PAUSA_FALLO = 700;
  const config = { tablero: '', cert: '', cats: new Set(), dificil: false };
  let datos = null;
  let partida = null;

  // ── Configuración <-> URL y localStorage ────────────────────
  function leerAlmacen() {
    try {
      const a = JSON.parse(localStorage.getItem(CLAVE) || '{}');
      return a && typeof a === 'object' ? a : {};
    } catch {
      return {};
    }
  }

  function esFiltrable(cert) {
    return Boolean(cert) && cert.estado !== 'guia-pendiente';
  }

  function aplicarConfig(c) {
    config.tablero = String(c.tablero || '');
    config.cert = esFiltrable(datos.certPorCodigo.get(c.cert)) ? c.cert : '';
    config.cats = new Set((c.cats || []).filter((id) => datos.categoriaPorId.has(id)));
    config.dificil = Boolean(c.dificil);
  }

  /** La URL manda; sin parámetros, se recupera la última configuración usada. */
  function leerConfig() {
    const p = new URLSearchParams(location.search);
    if ([...p.keys()].length) {
      aplicarConfig({
        tablero: p.get('tablero'),
        cert: p.get('cert'),
        cats: (p.get('cat') || '').split(','),
        dificil: p.get('dificil') === '1',
      });
    } else {
      aplicarConfig(leerAlmacen().config || {});
    }
  }

  function escribirConfig() {
    const p = new URLSearchParams();
    if (config.tablero) p.set('tablero', config.tablero);
    if (config.cert) p.set('cert', config.cert);
    if (config.cats.size) p.set('cat', [...config.cats].join(','));
    if (config.dificil) p.set('dificil', '1');
    const q = p.toString();
    history.replaceState(null, '', `${location.pathname}${q ? `?${q}` : ''}`);
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ config: { ...config, cats: [...config.cats] } }));
    } catch { /* sin almacenamiento: no se guarda */ }
  }

  // ── Servicios y tamaños disponibles ─────────────────────────
  /** Solo entran los servicios con icono oficial propio (y frase). */
  function deLaCertificacion() {
    return datos.servicios.filter((s) => s.icono && s.frase
      && (!config.cert || s.certificaciones.includes(config.cert)));
  }

  function candidatos() {
    return deLaCertificacion().filter((s) => !config.cats.size || config.cats.has(s.categoria));
  }

  function contarPorCategoria(servicios) {
    const n = new Map();
    for (const s of servicios) n.set(s.categoria, (n.get(s.categoria) || 0) + 1);
    return n;
  }

  /** Los tamaños de los niveles que caben; si no cabe ninguno, un tablero reducido (fuera de la clasificación). */
  function tamanos() {
    const max = candidatos().length;
    const ok = NIVELES.map((n) => Number(n.empareja)).filter((p) => p <= max)
      .map((p) => ({ valor: String(p), parejas: p, texto: `${p} parejas` }));
    if (ok.length || max < 2) return ok;
    return [{ valor: String(max), parejas: max, texto: `${max} parejas` }];
  }

  function elegirTamano(lista) {
    if (!lista.length) return null;
    const pedido = Number(config.tablero) || 0;
    return lista.find((t) => t.valor === config.tablero)
      || [...lista].reverse().find((t) => t.parejas <= pedido)
      || lista[0];
  }

  // ── Panel de configuración ──────────────────────────────────
  function renderControles() {
    el.cert.insertAdjacentHTML('beforeend', datos.certificaciones.filter(esFiltrable).map((c) =>
      `<option value="${esc(c.codigo)}">${esc(c.codigo)} · ${esc(c.nombreCorto)}</option>`).join(''));
    el.cert.addEventListener('change', () => { config.cert = el.cert.value; nuevaPartida(); });
    el.tablero.addEventListener('change', () => { config.tablero = el.tablero.value; nuevaPartida(); });
    el.cats.addEventListener('click', (ev) => {
      const chip = ev.target.closest('button[data-cat]');
      if (!chip) return;
      const id = chip.dataset.cat;
      if (!id) config.cats.clear();
      else if (config.cats.has(id)) config.cats.delete(id);
      else config.cats.add(id);
      nuevaPartida();
    });
    el.dificil.addEventListener('click', () => { config.dificil = !config.dificil; nuevaPartida(); });
    el.nueva.addEventListener('click', () => { nuevaPartida(); el.hud.scrollIntoView({ block: 'nearest' }); });
  }

  function sincronizarControles(lista, tamano) {
    el.cert.value = config.cert;
    const cuenta = contarPorCategoria(deLaCertificacion());
    const cats = datos.categorias.filter((c) => cuenta.has(c.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    el.cats.innerHTML = `<button class="chip" type="button" data-cat="" aria-pressed="${!config.cats.size}">Todas</button>`
      + cats.map((c) => `<button class="chip" type="button" data-cat="${esc(c.id)}" aria-pressed="${config.cats.has(c.id)}"
          title="${esc(c.nombreEn)}">${esc(c.nombre)} <span class="cat-en">${cuenta.get(c.id)}</span></button>`).join('');
    el.tablero.innerHTML = lista.map((t) => `<option value="${esc(t.valor)}">${esc(t.texto)}</option>`).join('')
      || '<option value="">Sin tamaños disponibles</option>';
    el.tablero.disabled = !lista.length;
    if (tamano) el.tablero.value = tamano.valor;
    el.dificil.setAttribute('aria-pressed', String(config.dificil));
  }

  // ── Partida ─────────────────────────────────────────────────
  function parar() {
    if (!partida) return;
    clearInterval(partida.crono);
    clearTimeout(partida.pendiente);
  }

  /** Prepara la partida y muestra el botón "Empezar"; las columnas salen al pulsarlo. */
  function nuevaPartida() {
    parar();
    const disponibles = contarPorCategoria(deLaCertificacion());
    for (const id of [...config.cats]) if (!disponibles.has(id)) config.cats.delete(id);

    const lista = tamanos();
    const tamano = elegirTamano(lista);
    config.tablero = tamano ? tamano.valor : '';
    sincronizarControles(lista, tamano);
    escribirConfig();

    el.final.hidden = true;
    el.final.innerHTML = '';
    el.juego.className = '';

    if (!tamano) {
      partida = null;
      el.hud.hidden = true;
      el.juego.innerHTML = '<p class="empty-state">No hay suficientes servicios con estos filtros para montar un tablero. Quita alguna categoría o elige otra certificación.</p>';
      return;
    }

    const servicios = barajar(candidatos()).slice(0, tamano.parejas);
    partida = {
      servicios, izquierda: barajar(servicios), derecha: barajar(servicios),
      elegido: null, hechos: new Set(), fallos: [], inicio: 0, crono: null, pendiente: null, terminada: false,
    };
    el.hud.hidden = false;
    pintarMarcador(0);
    decir('');
    el.juego.innerHTML = `<div class="emp-inicio">
        <p><strong>${tamano.parejas} servicios</strong>${config.dificil ? ' en modo difícil (solo iconos)' : ''}.
          El tiempo empieza a contar al pulsar el botón.</p>
        <button class="btn btn-primary" type="button" id="emp-empezar">Empezar</button>
      </div>`;
    $('emp-empezar').addEventListener('click', empezar);
  }

  function htmlServicio(s) {
    const icono = iconoServicio(s, datos.categoriaPorId.get(s.categoria), 'emp-icono').replace(' loading="lazy"', '');
    return `<button type="button" class="emp-item emp-servicio" data-lado="izquierda" data-id="${esc(s.id)}"
        aria-pressed="false" aria-label="Servicio: ${esc(s.nombre)}">${icono}<span class="emp-nombre">${esc(s.nombre)}</span></button>`;
  }

  function htmlFuncion(s) {
    return `<button type="button" class="emp-item emp-funcion" data-lado="derecha" data-id="${esc(s.id)}"
        aria-pressed="false">${esc(s.frase)}</button>`;
  }

  function empezar() {
    el.juego.className = `emp-tablero${config.dificil ? ' emp-dificil' : ''}`;
    el.juego.innerHTML = `
      <div class="emp-col" role="group" aria-labelledby="emp-col-s"><h2 class="emp-col-titulo" id="emp-col-s">Servicios</h2>
        ${partida.izquierda.map(htmlServicio).join('')}</div>
      <div class="emp-col" role="group" aria-labelledby="emp-col-f"><h2 class="emp-col-titulo" id="emp-col-f">Funciones</h2>
        ${partida.derecha.map(htmlFuncion).join('')}</div>`;
    decir('Elige un servicio y la frase que describe lo que hace (o al revés).');
    partida.inicio = Date.now();
    partida.crono = setInterval(() => {
      el.tiempo.textContent = formatoTiempo(Date.now() - partida.inicio, false);
    }, 250);
    const primero = el.juego.querySelector('.emp-item');
    if (primero) primero.focus();
  }

  function decir(texto, clase = '') {
    el.mensaje.className = `memo-mensaje ${clase}`;
    el.mensaje.textContent = texto;
  }

  function porcentaje() {
    const intentos = partida.hechos.size + partida.fallos.length;
    return intentos ? (partida.hechos.size / intentos) * 100 : null;
  }

  function pintarMarcador(ms) {
    const pct = porcentaje();
    el.parejas.textContent = `${partida.hechos.size}/${partida.servicios.length}`;
    el.acierto.textContent = pct === null ? '–' : `${Math.round(pct)} %`;
    el.fallos.textContent = partida.fallos.length;
    if (ms !== undefined) el.tiempo.textContent = formatoTiempo(ms, false);
  }

  const nodo = (lado, id) => el.juego.querySelector(`.emp-item[data-lado="${lado}"][data-id="${CSS.escape(id)}"]`);
  const servicioPorId = (id) => partida.servicios.find((s) => s.id === id);

  function marcar(boton, si) {
    boton.classList.toggle('is-elegido', si);
    boton.setAttribute('aria-pressed', String(si));
  }

  function elegir(boton) {
    if (!partida || partida.terminada || boton.disabled) return;
    if (partida.pendiente) limpiarFallo();
    const actual = partida.elegido;
    if (actual === boton) { // volver a pulsarlo lo suelta
      marcar(boton, false);
      partida.elegido = null;
      return;
    }
    if (!actual || actual.dataset.lado === boton.dataset.lado) {
      if (actual) marcar(actual, false);
      marcar(boton, true);
      partida.elegido = boton;
      return;
    }
    partida.elegido = null;
    marcar(actual, false);
    const izq = actual.dataset.lado === 'izquierda' ? actual : boton;
    const der = izq === actual ? boton : actual;
    if (izq.dataset.id === der.dataset.id) acierto(izq, der); else fallo(izq, der);
  }

  function acierto(izq, der) {
    const s = servicioPorId(izq.dataset.id);
    const conFoco = [izq, der].find((b) => b === document.activeElement);
    partida.hechos.add(s.id);
    for (const b of [izq, der]) {
      b.classList.add('is-hecha');
      b.disabled = true;
    }
    izq.setAttribute('aria-label', `Servicio: ${s.nombre}, unido`);
    der.setAttribute('aria-label', `${s.frase}: ${s.nombre}, unida`);
    decir(`¡Bien! ${s.nombre}: ${s.frase}`, 'ok');
    pintarMarcador();
    if (partida.hechos.size === partida.servicios.length) terminar();
    else if (conFoco) siguienteFoco(conFoco);
  }

  /** Un botón desactivado pierde el foco: pasa al siguiente libre de su columna, para seguir con el teclado. */
  function siguienteFoco(desde) {
    const libres = [...desde.parentNode.querySelectorAll('.emp-item:not(:disabled)')];
    const siguiente = libres.find((b) => desde.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) || libres[0];
    if (siguiente) siguiente.focus({ preventScroll: true });
  }

  function fallo(izq, der) {
    const s = servicioPorId(izq.dataset.id);
    const deLaFrase = servicioPorId(der.dataset.id);
    partida.fallos.push({ servicio: s, frase: deLaFrase });
    izq.classList.add('is-fallo');
    der.classList.add('is-fallo');
    // No se dice de quién es la frase: eso lo resolvería. Se revela en el repaso final.
    decir(`No: «${deLaFrase.frase}» no describe a ${s.nombre}.`, 'ko');
    pintarMarcador();
    partida.pendiente = setTimeout(limpiarFallo, PAUSA_FALLO);
  }

  function limpiarFallo() {
    clearTimeout(partida.pendiente);
    partida.pendiente = null;
    for (const b of el.juego.querySelectorAll('.is-fallo')) b.classList.remove('is-fallo');
  }

  // ── Pantalla final ──────────────────────────────────────────
  function enlace(s) {
    return `<a href="${esc(urlServicio(s))}">${esc(s.nombre)}</a>`;
  }

  function terminar() {
    partida.terminada = true;
    const ms = Date.now() - partida.inicio;
    parar();
    pintarMarcador(ms);
    const pct = porcentaje();
    const n = partida.servicios.length;
    const fallos = partida.fallos;

    el.final.innerHTML = `
      <h2 tabindex="-1">¡Todo emparejado!</h2>
      <div class="memo-resumen">
        <div><strong>${formatoTiempo(ms)}</strong><span>tiempo</span></div>
        <div><strong>${Math.round(pct)} %</strong><span>acierto (${n} de ${n + fallos.length} intentos)</span></div>
        <div><strong>${fallos.length}</strong><span>fallos</span></div>
      </div>
      <div id="emp-clasificacion"></div>
      <p><button class="btn btn-primary" type="button" id="emp-revancha">Revancha</button></p>
      ${fallos.length ? `<h3>Tus fallos</h3>
      <ul class="memo-repaso">${fallos.map((f) => `<li>Uniste ${enlace(f.servicio)} con «${esc(f.frase.frase)}», que es de ${enlace(f.frase)}.</li>`).join('')}</ul>` : ''}
      <h3>Parejas para repasar</h3>
      <ul class="memo-repaso">${partida.izquierda.map((s) => `<li><strong>${enlace(s)}</strong>: ${esc(s.frase)}</li>`).join('')}</ul>`;
    ofrecer($('emp-clasificacion'), { juego: 'empareja', tablero: config.tablero, dificil: config.dificil, ms, acierto: pct });
    el.final.hidden = false;
    decir(`¡Completado en ${formatoTiempo(ms)} con un ${Math.round(pct)} % de acierto!`, 'ok');
    $('emp-revancha').addEventListener('click', () => {
      nuevaPartida();
      el.hud.scrollIntoView({ block: 'nearest' });
      $('emp-empezar').focus();
    });
    el.final.scrollIntoView({ block: 'nearest' });
    const campo = el.final.querySelector('.clas-form input');
    (campo || el.final.querySelector('h2')).focus({ preventScroll: true });
  }

  // ── Eventos ─────────────────────────────────────────────────
  el.juego.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button.emp-item');
    if (btn) elegir(btn);
  });

  // El marcador se queda pegado bajo el menú (mismo estilo que el juego de memoria).
  const nav = document.querySelector('.nav');
  const medirNav = () => document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`);
  if (nav) {
    medirNav();
    window.addEventListener('resize', medirNav);
  }

  cargar().then((d) => {
    datos = d;
    leerConfig();
    renderControles();
    nuevaPartida();
  }).catch((err) => {
    console.error(err);
    el.juego.innerHTML = '<p class="empty-state">No se pudo cargar el catálogo. Si abriste el archivo directamente, sírvelo con <code>npx serve .</code> o <code>python -m http.server</code>.</p>';
  });
})();
