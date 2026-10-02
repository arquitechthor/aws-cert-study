/**
 * Juego de memoria (memoria.html) con dos modos:
 *  - "categorias": cada carta es un servicio y dos cartas son pareja si comparten categoría
 *    principal. No hay una pareja única: cualquier servicio de la misma categoría vale.
 *  - "funciones": cada servicio aporta una carta de servicio y otra con su `frase`; la única
 *    pareja válida es un servicio con su frase.
 * La configuración vive en la URL (?modo=funciones&tablero=16&cert=DVA-C02&cat=a,b&dificil=1)
 * y la última usada, junto con las mejores marcas, en localStorage (ver aviso legal, privacidad).
 */
(function () {
  const { cargar, esc, urlServicio, iconoServicio, categoriaHtml } = window.AwsDatos;

  const $ = (id) => document.getElementById(id);
  const el = {
    modo: $('m-modo'),
    ayuda: $('m-ayuda'),
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
    juego: $('memo-tablero'),
    final: $('memo-final'),
  };

  const CLAVE = 'apuntes-aws.memoria';
  // Modo categorías: filas × columnas. Solo se ofrecen los tamaños que caben en el filtro.
  const TABLEROS_CATEGORIAS = [[6, 6], [6, 8], [8, 8], [8, 10], [10, 10], [10, 12], [12, 12]];
  // Modo funciones: número de cartas (dos por servicio) y columnas en escritorio.
  const TABLEROS_FUNCIONES = { 12: 4, 16: 4, 20: 5, 24: 6 };
  // Las frases necesitan más tiempo de lectura antes de taparse.
  const PAUSA_FALLO = { categorias: 1800, funciones: 3500 };
  const AYUDA = {
    categorias: 'Categorías: dos servicios son pareja si pertenecen a la misma categoría. Cualquier servicio de esa categoría vale.',
    funciones: 'Funciones: empareja cada servicio con la frase que describe lo que hace.',
  };

  const config = { modo: 'categorias', tablero: '', cert: '', cats: new Set(), dificil: false };
  let datos = null;
  let partida = null;

  // ── Almacenamiento local: { config: {…}, marcas: { "<modo>|<cartas>|<difícil>": {…} } } ──
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
      localStorage.setItem(CLAVE, JSON.stringify({ ...leerAlmacen(), ...cambios }));
    } catch { /* sin almacenamiento: no se guarda */ }
  }

  // ── Configuración <-> URL ───────────────────────────────────
  function esFiltrable(cert) {
    return Boolean(cert) && cert.estado !== 'guia-pendiente';
  }

  function aplicarConfig(c) {
    config.modo = c.modo === 'funciones' ? 'funciones' : 'categorias';
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
        modo: p.get('modo'),
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
    if (config.modo !== 'categorias') p.set('modo', config.modo);
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
   * Tamaños que caben en el filtro. En el modo categorías el máximo es la suma, por categoría,
   * de su número de servicios redondeado hacia abajo a par (así el tablero siempre se vacía).
   * Si el filtro no llega al tamaño mínimo, se ofrece un único tablero con lo que haya.
   */
  function tamanos() {
    const lista = candidatos();
    if (config.modo === 'funciones') {
      const max = lista.length * 2;
      const ok = Object.entries(TABLEROS_FUNCIONES).filter(([n]) => n <= max).map(([n, columnas]) => (
        { valor: n, cartas: Number(n), columnas, texto: `${n} cartas (${n / 2} servicios)` }));
      if (ok.length || max < 4) return ok;
      return [{ valor: String(max), cartas: max, columnas: 4, texto: `${max} cartas (${max / 2} servicios)` }];
    }
    let max = 0;
    for (const grupo of porCategoria(lista).values()) max += grupo.length - (grupo.length % 2);
    const ok = TABLEROS_CATEGORIAS.filter(([f, c]) => f * c <= max).map(([f, c]) => (
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

    el.modo.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-modo]');
      if (!btn || btn.dataset.modo === config.modo) return;
      config.modo = btn.dataset.modo;
      config.tablero = ''; // los tamaños de un modo no valen para el otro
      nuevaPartida();
    });
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
    for (const btn of el.modo.querySelectorAll('button[data-modo]')) {
      btn.setAttribute('aria-checked', String(btn.dataset.modo === config.modo));
    }
    el.ayuda.textContent = AYUDA[config.modo];
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
  function barajar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generar(n) {
    const lista = barajar(candidatos());
    if (config.modo === 'funciones') {
      return barajar(lista.slice(0, n / 2).flatMap((s) => [
        { tipo: 'servicio', servicio: s },
        { tipo: 'funcion', servicio: s },
      ]));
    }
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
    const tipo = config.modo === 'funciones'
      ? `<span class="memo-tipo">${carta.tipo === 'funcion' ? 'Función' : 'Servicio'}</span>` : '';
    const cara = carta.tipo === 'funcion'
      ? `<span class="memo-frase">${esc(s.frase)}</span>`
      : `${iconoServicio(s, categoriaDe(carta), 'memo-icono').replace(' loading="lazy"', '')}<span class="memo-nombre">${esc(s.nombre)}</span>`;
    return `<button type="button" class="memo-carta memo-${carta.tipo}" data-i="${i}" aria-label="Carta ${i + 1}, boca abajo">
      <span class="memo-inner"><span class="memo-dorso" aria-hidden="true"></span><span class="memo-cara">${tipo}${cara}</span></span>
    </button>`;
  }

  /** Lo que anuncia una carta boca arriba (en modo difícil el nombre no se ve, pero sí se lee). */
  function etiqueta(carta) {
    if (carta.tipo === 'funcion') return `Función: ${carta.servicio.frase}`;
    return config.modo === 'funciones' ? `Servicio: ${carta.servicio.nombre}` : carta.servicio.nombre;
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
    el.juego.className = `memo-tablero memo-${config.modo}${config.dificil ? ' memo-dificil' : ''}`;

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
    decir(config.modo === 'funciones'
      ? 'Voltea dos cartas: un servicio y la frase que lo describe.'
      : 'Voltea dos cartas: son pareja si los dos servicios son de la misma categoría.');
    pintarMarcador();
  }

  function decir(texto, clase = '') {
    el.mensaje.className = `memo-mensaje ${clase}`;
    el.mensaje.textContent = texto;
  }

  function formatoTiempo(seg) {
    return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  }

  function pintarMarcador() {
    el.movimientos.textContent = partida.movimientos;
    el.parejas.textContent = `${partida.emparejadas.length}/${partida.cartas.length / 2}`;
    el.tiempo.textContent = formatoTiempo(partida.segundos);
  }

  /** El tiempo empieza a contar con la primera carta volteada. */
  function iniciarCrono() {
    if (partida.inicio) return;
    partida.inicio = Date.now();
    partida.crono = setInterval(() => {
      partida.segundos = Math.floor((Date.now() - partida.inicio) / 1000);
      el.tiempo.textContent = formatoTiempo(partida.segundos);
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
    if (config.modo === 'funciones') return a.tipo !== b.tipo && a.servicio === b.servicio;
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
    if (partida.abiertas.length < 2) return;

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
      c.nodo.setAttribute('aria-label', `${etiqueta(c)}, emparejada${config.modo === 'categorias' ? `: ${nombreCategoria(c)}` : ''}`);
    }
    if (config.modo === 'funciones') {
      enlazar(a.tipo === 'servicio' ? a : b);
      decir(`¡Pareja! ${a.servicio.nombre}: ${a.servicio.frase}.`, 'ok');
    } else {
      decir(`¡Pareja! ${a.servicio.nombre} y ${b.servicio.nombre} son de ${nombreCategoria(a)}.`, 'ok');
    }
    if (partida.emparejadas.length === partida.cartas.length / 2) terminar();
  }

  function fallo(a, b) {
    a.fallada = true;
    b.fallada = true;
    a.nodo.classList.add('is-fallo');
    b.nodo.classList.add('is-fallo');
    if (config.modo === 'categorias') {
      decir(`No son pareja: ${a.servicio.nombre} es de ${nombreCategoria(a)} y ${b.servicio.nombre}, de ${nombreCategoria(b)}.`, 'ko');
    } else {
      // Se dice de qué servicio era cada frase volteada, para aprender del error.
      const frases = [a, b].filter((c) => c.tipo === 'funcion').map((c) => `«${c.servicio.frase}» es ${c.servicio.nombre}`);
      const motivo = a.tipo === b.tipo
        ? (a.tipo === 'servicio' ? 'Dos servicios nunca son pareja: busca la frase de uno de ellos.' : 'Dos frases nunca son pareja.')
        : 'No son pareja.';
      decir(`${motivo}${frases.length ? ` ${frases.join('; ')}.` : ''}`, 'ko');
    }
    partida.pendiente = setTimeout(taparFallo, PAUSA_FALLO[config.modo]);
  }

  function taparFallo() {
    clearTimeout(partida.pendiente);
    partida.pendiente = null;
    partida.abiertas.forEach(ocultar);
    partida.abiertas = [];
  }

  /** En el modo funciones, la carta de servicio acertada pasa a ser un enlace a su guía. */
  function enlazar(carta) {
    const a = document.createElement('a');
    a.className = carta.nodo.className;
    a.href = urlServicio(carta.servicio);
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', `${etiqueta(carta)}, emparejada. Abrir su guía en otra pestaña`);
    a.innerHTML = carta.nodo.innerHTML;
    const conFoco = document.activeElement === carta.nodo;
    carta.nodo.replaceWith(a);
    carta.nodo = a;
    if (conFoco) a.focus();
  }

  // ── Pantalla final ──────────────────────────────────────────
  function enlaceServicio(s) {
    return `<a href="${esc(urlServicio(s))}">${esc(s.nombre)}</a>`;
  }

  function repaso() {
    if (config.modo === 'funciones') {
      return `<ul class="memo-repaso">${partida.emparejadas.map(([a]) =>
        `<li><strong>${enlaceServicio(a.servicio)}</strong>: ${esc(a.servicio.frase)}</li>`).join('')}</ul>`;
    }
    const grupos = porCategoria(partida.emparejadas.flat().map((c) => c.servicio));
    return [...grupos].sort(([a], [b]) => datos.categoriaPorId.get(a).nombre.localeCompare(datos.categoriaPorId.get(b).nombre, 'es'))
      .map(([id, servicios]) => `
        <h4 class="memo-repaso-cat">${categoriaHtml(datos.categoriaPorId.get(id))}</h4>
        <p class="memo-repaso-servicios">${servicios.map(enlaceServicio).join(' · ')}</p>`).join('');
  }

  function terminar() {
    partida.terminada = true;
    clearInterval(partida.crono);
    partida.segundos = Math.floor((Date.now() - partida.inicio) / 1000);

    // Mejor marca por modo, número de cartas y modo difícil: menos movimientos y, a igualdad, menos tiempo.
    const clave = `${config.modo}|${partida.cartas.length}|${config.dificil ? 1 : 0}`;
    const marcas = leerAlmacen().marcas || {};
    const previa = marcas[clave];
    const mejora = !previa || partida.movimientos < previa.movimientos
      || (partida.movimientos === previa.movimientos && partida.segundos < previa.segundos);
    if (mejora) {
      marcas[clave] = { movimientos: partida.movimientos, segundos: partida.segundos, fecha: new Date().toISOString().slice(0, 10) };
      guardarAlmacen({ marcas });
    }
    const marca = mejora
      ? (previa ? `¡Nueva mejor marca! La anterior era de ${previa.movimientos} movimientos en ${formatoTiempo(previa.segundos)}.` : 'Primera marca guardada para este tablero.')
      : `Tu mejor marca en este tablero: ${previa.movimientos} movimientos en ${formatoTiempo(previa.segundos)}.`;

    const total = partida.cartas.length / 2;
    el.final.innerHTML = `
      <h2 tabindex="-1">¡Tablero completado!</h2>
      <div class="memo-resumen">
        <div><strong>${partida.movimientos}</strong><span>movimientos</span></div>
        <div><strong>${partida.primeras}/${total}</strong><span>aciertos a la primera</span></div>
        <div><strong>${formatoTiempo(partida.segundos)}</strong><span>tiempo</span></div>
      </div>
      <p class="memo-marca">${esc(marca)}</p>
      <p><button class="btn btn-primary" type="button" id="memo-revancha">Revancha</button></p>
      <h3>${config.modo === 'funciones' ? 'Parejas para repasar' : 'Servicios del tablero por categoría'}</h3>
      ${repaso()}`;
    el.final.hidden = false;
    decir(`¡Tablero completado en ${partida.movimientos} movimientos!`, 'ok');
    $('memo-revancha').addEventListener('click', () => {
      nuevaPartida();
      el.hud.scrollIntoView({ block: 'nearest' });
      const primera = el.juego.querySelector('.memo-carta');
      if (primera) primera.focus();
    });
    el.final.scrollIntoView({ block: 'nearest' });
    el.final.querySelector('h2').focus({ preventScroll: true });
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
