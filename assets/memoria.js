/**
 * Juego de memoria (memoria.html): cada carta es un servicio y dos cartas son pareja si comparten
 * categoría principal. No hay una pareja única: cualquier servicio de la misma categoría vale.
 * (El antiguo modo "funciones", servicio con su frase, es ahora el juego Empareja.)
 * La configuración vive en la URL (?tablero=8x8&cert=DVA-C02&cat=a,b&dificil=1) y la última
 * usada en localStorage (ver aviso legal, privacidad). Los tiempos van a la clasificación común
 * de los juegos (assets/juegos.js).
 */
(function () {
  const { cargar, esc, urlServicio, iconoServicio, categoriaHtml } = window.AwsDatos;
  const { barajar, formatoTiempo, ofrecer } = window.AwsJuegos;

  const $ = (id) => document.getElementById(id);
  const el = {
    cert: $('m-cert'),
    tablero: $('m-tablero'),
    cats: $('m-cats'),
    dificil: $('m-dificil'),
    nueva: $('m-nueva'),
    hud: $('memo-hud'),
    movimientos: $('memo-movimientos'),
    parejas: $('memo-parejas'),
    tiempo: $('memo-tiempo'),
    mensaje: $('memo-mensaje'),
    comparacion: $('memo-comparacion'),
    juego: $('memo-tablero'),
    final: $('memo-final'),
  };

  const CLAVE = 'apuntes-aws.memoria';
  // Filas × columnas: los niveles de la clasificación. Solo se ofrecen los que caben en el filtro.
  const TABLEROS = window.AwsJuegos.NIVELES.map((n) => n.memoria.split('x').map(Number));
  const PAUSA_FALLO = 1800;

  const config = { tablero: '', cert: '', cats: new Set(), dificil: false };
  let datos = null;
  let partida = null;

  // ── Almacenamiento local: { config: {…} } (los tiempos van a la clasificación) ──
  function leerAlmacen() {
    try {
      const a = JSON.parse(localStorage.getItem(CLAVE) || '{}');
      return a && typeof a === 'object' ? a : {};
    } catch {
      return {};
    }
  }

  function guardarAlmacen(cambios) {
    try {
      // Las antiguas "marcas" (por movimientos) se descartan: las sustituye la clasificación.
      const { marcas, ...resto } = leerAlmacen();
      localStorage.setItem(CLAVE, JSON.stringify({ ...resto, ...cambios }));
    } catch { /* sin almacenamiento: no se guarda */ }
  }

  // ── Configuración <-> URL ───────────────────────────────────
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
    guardarAlmacen({ config: { ...config, cats: [...config.cats] } });
  }

  // ── Servicios y tamaños disponibles ─────────────────────────
  /** Solo entran en el juego los servicios con icono oficial propio. */
  function deLaCertificacion() {
    return datos.servicios.filter((s) => s.icono && s.frase
      && (!config.cert || s.certificaciones.includes(config.cert)));
  }

  function candidatos() {
    return deLaCertificacion().filter((s) => !config.cats.size || config.cats.has(s.categoria));
  }

  function porCategoria(servicios) {
    const grupos = new Map();
    for (const s of servicios) {
      if (!grupos.has(s.categoria)) grupos.set(s.categoria, []);
      grupos.get(s.categoria).push(s);
    }
    return grupos;
  }

  /**
   * Tamaños que caben en el filtro. El máximo es la suma, por categoría, de su número de
   * servicios redondeado hacia abajo a par (así el tablero siempre se vacía). Si el filtro no
   * llega al tamaño mínimo, se ofrece un único tablero con lo que haya (fuera de la clasificación).
   */
  function tamanos() {
    let max = 0;
    for (const grupo of porCategoria(candidatos()).values()) max += grupo.length - (grupo.length % 2);
    const ok = TABLEROS.filter(([f, c]) => f * c <= max).map(([f, c]) => (
      { valor: `${f}x${c}`, cartas: f * c, columnas: c, texto: `${f}×${c} (${f * c} cartas)` }));
    if (ok.length || max < 4) return ok;
    return [{ valor: String(max), cartas: max, columnas: max <= 16 ? 4 : 6, texto: `${max} cartas` }];
  }

  function cartasDe(valor) {
    const [a, b] = String(valor).split('x').map(Number);
    return (a || 0) * (b || 1);
  }

  /** El tamaño pedido si cabe; si no, el mayor que quepa por debajo, o el más pequeño. */
  function elegirTamano(lista) {
    if (!lista.length) return null;
    const pedido = cartasDe(config.tablero);
    return lista.find((t) => t.valor === config.tablero)
      || [...lista].reverse().find((t) => t.cartas <= pedido)
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

    // Solo las categorías con servicios en la certificación elegida.
    const grupos = porCategoria(deLaCertificacion());
    const cats = datos.categorias.filter((c) => grupos.has(c.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    el.cats.innerHTML = `<button class="chip" type="button" data-cat="" aria-pressed="${!config.cats.size}">Todas</button>`
      + cats.map((c) => `<button class="chip" type="button" data-cat="${esc(c.id)}" aria-pressed="${config.cats.has(c.id)}"
          title="${esc(c.nombreEn)}">${esc(c.nombre)} <span class="cat-en">${grupos.get(c.id).length}</span></button>`).join('');

    el.tablero.innerHTML = lista.map((t) => `<option value="${esc(t.valor)}">${esc(t.texto)}</option>`).join('')
      || '<option value="">Sin tamaños disponibles</option>';
    el.tablero.disabled = !lista.length;
    if (tamano) el.tablero.value = tamano.valor;
    el.dificil.setAttribute('aria-pressed', String(config.dificil));
  }

  // ── Generación del tablero ──────────────────────────────────
  function generar(n) {
    const lista = barajar(candidatos());
    // Se eligen parejas de servicios de la misma categoría: cada categoría sale un número par
    // de veces y no quedan cartas huérfanas.
    const parejas = [];
    for (const grupo of porCategoria(lista).values()) {
      for (let i = 0; i + 1 < grupo.length; i += 2) parejas.push([grupo[i], grupo[i + 1]]);
    }
    return barajar(barajar(parejas).slice(0, n / 2).flat().map((s) => ({ tipo: 'servicio', servicio: s })));
  }

  function categoriaDe(carta) {
    return datos.categoriaPorId.get(carta.servicio.categoria);
  }

  function nombreCategoria(carta) {
    const cat = categoriaDe(carta);
    return `${cat.nombre} (${cat.nombreEn})`;
  }

  function htmlCarta(carta, i) {
    const s = carta.servicio;
    const cara = `${iconoServicio(s, categoriaDe(carta), 'memo-icono').replace(' loading="lazy"', '')}<span class="memo-nombre">${esc(s.nombre)}</span>`;
    return `<button type="button" class="memo-carta" data-i="${i}" aria-label="Carta ${i + 1}, boca abajo">
      <span class="memo-inner"><span class="memo-dorso" aria-hidden="true"></span><span class="memo-cara">${cara}</span></span>
    </button>`;
  }

  /** Lo que anuncia una carta boca arriba (en modo difícil el nombre no se ve, pero sí se lee). */
  function etiqueta(carta) {
    return carta.servicio.nombre;
  }

  // ── Partida ─────────────────────────────────────────────────
  function nuevaPartida() {
    if (partida) {
      clearInterval(partida.crono);
      clearTimeout(partida.pendiente);
    }
    // Al cambiar de certificación pueden desaparecer categorías marcadas.
    const disponibles = porCategoria(deLaCertificacion());
    for (const id of [...config.cats]) if (!disponibles.has(id)) config.cats.delete(id);

    const lista = tamanos();
    const tamano = elegirTamano(lista);
    config.tablero = tamano ? tamano.valor : '';
    sincronizarControles(lista, tamano);
    escribirConfig();

    el.final.hidden = true;
    el.final.innerHTML = '';
    el.juego.className = `memo-tablero memo-categorias${config.dificil ? ' memo-dificil' : ''}`;

    if (!tamano) {
      partida = null;
      el.hud.hidden = true;
      el.juego.innerHTML = '<p class="empty-state">No hay suficientes servicios con estos filtros para montar un tablero. Quita alguna categoría o elige otra certificación.</p>';
      return;
    }

    const cartas = generar(tamano.cartas);
    partida = {
      cartas, abiertas: [], emparejadas: [], movimientos: 0, primeras: 0,
      inicio: 0, segundos: 0, crono: null, pendiente: null, terminada: false,
    };
    el.juego.style.setProperty('--cols', tamano.columnas);
    el.juego.innerHTML = cartas.map(htmlCarta).join('');
    cartas.forEach((c, i) => { c.nodo = el.juego.children[i]; });
    el.hud.hidden = false;
    decir('Voltea dos cartas: son pareja si los dos servicios son de la misma categoría.');
    comparar([]);
    pintarMarcador();
  }

  function decir(texto, clase = '') {
    el.mensaje.className = `memo-mensaje ${clase}`;
    el.mensaje.textContent = texto;
  }

  /**
   * Tabla 2×2 sobre el tablero: fila 1, servicio y categoría de la primera carta; fila 2, los de
   * la segunda, para comparar las categorías de un vistazo. Se queda a la vista hasta que se
   * voltea la siguiente primera carta. En modo difícil los nombres no salen hasta voltear la
   * segunda carta (antes se adivinarían sin mirar el icono).
   */
  function comparar(cartas) {
    const filas = el.comparacion.tBodies[0].rows;
    const completa = cartas.length === 2;
    for (let i = 0; i < 2; i++) {
      const [servicio, categoria] = filas[i].cells;
      const carta = cartas[i];
      servicio.textContent = carta && (completa || !config.dificil) ? carta.servicio.nombre : '';
      categoria.innerHTML = carta ? categoriaHtml(categoriaDe(carta)) : '';
    }
    el.comparacion.className = `memo-comparacion${completa ? (esPareja(...cartas) ? ' ok' : ' ko') : ''}`;
  }

  function pintarMarcador() {
    el.movimientos.textContent = partida.movimientos;
    el.parejas.textContent = `${partida.emparejadas.length}/${partida.cartas.length / 2}`;
    el.tiempo.textContent = formatoTiempo(partida.segundos * 1000, false);
  }

  /** El tiempo empieza a contar con la primera carta volteada. */
  function iniciarCrono() {
    if (partida.inicio) return;
    partida.inicio = Date.now();
    partida.crono = setInterval(() => {
      partida.segundos = Math.floor((Date.now() - partida.inicio) / 1000);
      el.tiempo.textContent = formatoTiempo(partida.segundos * 1000, false);
    }, 1000);
  }

  function mostrar(carta) {
    carta.nodo.classList.add('is-vuelta');
    carta.nodo.setAttribute('aria-label', etiqueta(carta));
  }

  function ocultar(carta) {
    carta.nodo.classList.remove('is-vuelta', 'is-fallo');
    carta.nodo.setAttribute('aria-label', `Carta ${partida.cartas.indexOf(carta) + 1}, boca abajo`);
  }

  function esPareja(a, b) {
    return a.servicio.categoria === b.servicio.categoria;
  }

  function voltear(carta) {
    if (!partida || partida.terminada || carta.hecha) return;
    // Voltear otra carta durante la pausa de un fallo tapa ya las dos anteriores.
    if (partida.pendiente) taparFallo();
    if (partida.abiertas.includes(carta)) return;
    iniciarCrono();
    mostrar(carta);
    partida.abiertas.push(carta);
    comparar(partida.abiertas);
    // El resultado de la jugada anterior se borra al empezar una nueva.
    if (partida.abiertas.length < 2) { decir(''); return; }

    const [a, b] = partida.abiertas;
    partida.movimientos++;
    if (esPareja(a, b)) acierto(a, b); else fallo(a, b);
    pintarMarcador();
  }

  function acierto(a, b) {
    if (!a.fallada && !b.fallada) partida.primeras++;
    partida.emparejadas.push([a, b]);
    partida.abiertas = [];
    for (const c of [a, b]) {
      c.hecha = true;
      c.nodo.classList.add('is-hecha');
      c.nodo.setAttribute('aria-label', `${etiqueta(c)}, emparejada: ${nombreCategoria(c)}`);
    }
    decir(`¡Pareja! ${a.servicio.nombre} y ${b.servicio.nombre} son de ${nombreCategoria(a)}.`, 'ok');
    if (partida.emparejadas.length === partida.cartas.length / 2) terminar();
  }

  function fallo(a, b) {
    a.fallada = true;
    b.fallada = true;
    a.nodo.classList.add('is-fallo');
    b.nodo.classList.add('is-fallo');
    decir(`No son pareja: ${a.servicio.nombre} es de ${nombreCategoria(a)} y ${b.servicio.nombre}, de ${nombreCategoria(b)}.`, 'ko');
    partida.pendiente = setTimeout(taparFallo, PAUSA_FALLO);
  }

  function taparFallo() {
    clearTimeout(partida.pendiente);
    partida.pendiente = null;
    partida.abiertas.forEach(ocultar);
    partida.abiertas = [];
  }

  // ── Pantalla final ──────────────────────────────────────────
  function enlaceServicio(s) {
    return `<a href="${esc(urlServicio(s))}">${esc(s.nombre)}</a>`;
  }

  function repaso() {
    const grupos = porCategoria(partida.emparejadas.flat().map((c) => c.servicio));
    return [...grupos].sort(([a], [b]) => datos.categoriaPorId.get(a).nombre.localeCompare(datos.categoriaPorId.get(b).nombre, 'es'))
      .map(([id, servicios]) => `
        <h4 class="memo-repaso-cat">${categoriaHtml(datos.categoriaPorId.get(id))}</h4>
        <p class="memo-repaso-servicios">${servicios.map(enlaceServicio).join(' · ')}</p>`).join('');
  }

  function terminar() {
    partida.terminada = true;
    clearInterval(partida.crono);
    const ms = Date.now() - partida.inicio;
    partida.segundos = Math.floor(ms / 1000);
    pintarMarcador();

    const total = partida.cartas.length / 2;
    el.final.innerHTML = `
      <h2 tabindex="-1">¡Tablero completado!</h2>
      <div class="memo-resumen">
        <div><strong>${formatoTiempo(ms)}</strong><span>tiempo</span></div>
        <div><strong>${partida.movimientos}</strong><span>movimientos</span></div>
        <div><strong>${partida.primeras}/${total}</strong><span>aciertos a la primera</span></div>
      </div>
      <div id="memo-clasificacion"></div>
      <p><button class="btn btn-primary" type="button" id="memo-revancha">Revancha</button></p>
      <h3>Servicios del tablero por categoría</h3>
      ${repaso()}`;
    // Cuenta el tamaño jugado: un tablero reducido por los filtros no entra en la clasificación.
    ofrecer($('memo-clasificacion'), { juego: 'memoria', tablero: config.tablero, dificil: config.dificil, ms });
    el.final.hidden = false;
    decir(`¡Tablero completado en ${formatoTiempo(ms)} y ${partida.movimientos} movimientos!`, 'ok');
    $('memo-revancha').addEventListener('click', () => {
      nuevaPartida();
      el.hud.scrollIntoView({ block: 'nearest' });
      const primera = el.juego.querySelector('.memo-carta');
      if (primera) primera.focus();
    });
    el.final.scrollIntoView({ block: 'nearest' });
    const campo = el.final.querySelector('.clas-form input');
    (campo || el.final.querySelector('h2')).focus({ preventScroll: true });
  }

  // ── Eventos del tablero ─────────────────────────────────────
  el.juego.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button.memo-carta');
    if (btn && partida) voltear(partida.cartas[Number(btn.dataset.i)]);
  });

  // Flechas para moverse por el tablero (Tab e Intro/Espacio ya funcionan por ser botones).
  el.juego.addEventListener('keydown', (ev) => {
    const columnas = getComputedStyle(el.juego).gridTemplateColumns.split(' ').length;
    const paso = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columnas, ArrowDown: columnas }[ev.key];
    if (!paso) return;
    const cartas = [...el.juego.querySelectorAll('.memo-carta')];
    const destino = cartas[cartas.indexOf(document.activeElement) + paso];
    if (!destino || !cartas.includes(document.activeElement)) return;
    ev.preventDefault();
    destino.focus();
  });

  // ── Arranque ────────────────────────────────────────────────
  // El marcador se queda pegado bajo el menú para ver el resultado de cada jugada en tableros altos.
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
