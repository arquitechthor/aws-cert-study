/**
 * Simulacro de examen (simulacro.html), tarea 3.1 de PLAN.md, y repaso de preguntas falladas
 * (?repaso=1), tarea 3.2.
 *
 * Simulacro: preguntas de todos los servicios publicados de una certificación que llevan esa
 * certificación en "certificaciones", repartidas por dominio según su peso en la guía oficial
 * (cuota por mayor resto; si un dominio no tiene bastantes, se completa con los demás y se avisa).
 * Una pregunta cada vez, tiempo límite proporcional al examen real, "marcar para revisar" y
 * corrección al final, con resultado por dominio. Configuración en la URL
 * (?cert=SAP-C02&longitud=completo&dificiles=1).
 *
 * Repaso: las preguntas cuyo último intento fue incorrecto (progreso local, "fallos"), de una
 * certificación o de todas, sin tiempo límite.
 *
 * Todos los intentos respondidos se apuntan en el progreso local igual que en las guías; los
 * resultados de los simulacros (no los repasos) se guardan en localStorage
 * (apuntes-aws.simulacros, los 20 últimos).
 */
(function () {
  const { cargar, json, esc, url, urlServicio, leerProgreso, formatoFecha } = window.AwsDatos;
  const P = window.AwsPreguntas;
  const CLAVE = 'apuntes-aws.simulacros';
  const MAX_HISTORIAL = 20;
  const MAX_REPASO = 75;

  const $ = (id) => document.getElementById(id);
  const el = {
    titulo: $('sim-titulo'), intro: $('sim-intro'), config: $('sim-config'), cert: $('s-cert'),
    longitud: $('s-longitud'), difZona: $('s-dificiles-zona'), dificiles: $('s-dificiles'), ayuda: $('s-ayuda'),
    disponibles: $('s-disponibles'), empezar: $('s-empezar'), examen: $('sim-examen'), posicion: $('sim-posicion'),
    reloj: $('sim-reloj'), terminar: $('sim-terminar'), pregunta: $('sim-pregunta'), anterior: $('sim-anterior'),
    siguiente: $('sim-siguiente'), marcar: $('sim-marcar'), navegador: $('sim-navegador'),
    resultado: $('sim-resultado'), historial: $('sim-historial'),
  };

  let datos = null;
  let glosario = null;
  const cache = new Map(); // servicio -> preguntas
  const params = new URLSearchParams(location.search);
  const repaso = params.get('repaso') === '1';
  const config = { cert: params.get('cert') || '', longitud: params.get('longitud') || 'completo', dificiles: params.get('dificiles') === '1' };
  let pool = [];
  let examen = null;

  // ── Almacenamiento ────────────────────────────────────────────────────────────────────
  function leerGuardado() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE) || '{}');
      return d && typeof d === 'object' ? { ultima: d.ultima || null, intentos: Array.isArray(d.intentos) ? d.intentos : [] } : { ultima: null, intentos: [] };
    } catch {
      return { ultima: null, intentos: [] };
    }
  }

  function escribirGuardado(d) {
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* sin almacenamiento */ }
  }

  // ── Utilidades ────────────────────────────────────────────────────────────────────────
  function textoPara(p) {
    const sid = P.servicioDe(p.id);
    return (t) => {
      const e = esc(t);
      return glosario && window.AwsSiglas ? window.AwsSiglas.marcar(e, sid, glosario) : e;
    };
  }

  function duracion(seg) {
    const s = Math.max(0, Math.round(seg));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
  }

  const certActual = () => datos.certPorCodigo.get(config.cert) || null;

  function longitudes(c) {
    const n = c.examen.preguntasPuntuadas + c.examen.preguntasSinPuntuar;
    const min = c.examen.minutos;
    return {
      completo: { n, minutos: min, nombre: `Examen completo: ${n} preguntas, ${min} min` },
      medio: { n: Math.ceil(n / 2), minutos: Math.round(min / 2), nombre: `Medio examen: ${Math.ceil(n / 2)} preguntas, ${Math.round(min / 2)} min` },
      rapido: { n: 10, minutos: Math.max(1, Math.round((min * 10) / n)), nombre: `Rápido: 10 preguntas, ${Math.max(1, Math.round((min * 10) / n))} min` },
    };
  }

  async function preguntasDe(sids) {
    const faltan = sids.filter((s) => !cache.has(s));
    await Promise.all(faltan.map((s) => json(`data/preguntas/${encodeURIComponent(s)}.json`)
      .then((l) => cache.set(s, l)).catch(() => cache.set(s, []))));
    return sids.flatMap((s) => cache.get(s) || []);
  }

  function fallosPendientes() {
    const prog = leerProgreso();
    return Object.entries(prog).filter(([, v]) => v && Array.isArray(v.fallos) && v.fallos.length);
  }

  // ── Configuración ─────────────────────────────────────────────────────────────────────
  function sincronizarUrl() {
    const p = new URLSearchParams();
    if (repaso) p.set('repaso', '1');
    if (config.cert) p.set('cert', config.cert);
    if (!repaso && config.longitud !== 'completo') p.set('longitud', config.longitud);
    if (!repaso && config.dificiles) p.set('dificiles', '1');
    const q = p.toString();
    history.replaceState(null, '', `${location.pathname}${q ? `?${q}` : ''}`);
  }

  function renderConfig() {
    const certs = datos.certificaciones.filter((c) => c.examen);
    el.cert.innerHTML = (repaso ? '<option value="">Todas las certificaciones</option>' : '')
      + certs.map((c) => `<option value="${esc(c.codigo)}">${esc(c.codigo)} · ${esc(c.nombreCorto)}</option>`).join('');
    if (!repaso && !certs.some((c) => c.codigo === config.cert)) {
      const ultima = leerGuardado().ultima;
      config.cert = ultima && certs.some((c) => c.codigo === ultima.cert) ? ultima.cert : certs[0].codigo;
      if (ultima && !params.has('longitud')) config.longitud = ultima.longitud || 'completo';
    }
    if (repaso && config.cert && !certs.some((c) => c.codigo === config.cert)) config.cert = '';
    el.cert.value = config.cert;

    if (repaso) {
      document.title = 'Repaso de falladas — Apuntes AWS';
      el.titulo.innerHTML = 'Repaso de <span class="gradient-text">falladas</span>';
      el.intro.textContent = 'Las preguntas que fallaste la última vez que las respondiste, en una guía o en un simulacro. '
        + 'Sin tiempo límite; cuando aciertes una, sale del repaso. '
        + 'Las preguntas son originales, escritas para este sitio: no son preguntas del examen real.';
      el.longitud.closest('.field').hidden = true;
      el.difZona.hidden = true;
      el.empezar.textContent = 'Empezar repaso';
    }
  }

  function renderLongitudes() {
    const c = certActual();
    if (!c) return;
    const ls = longitudes(c);
    if (!ls[config.longitud]) config.longitud = 'completo';
    el.longitud.innerHTML = Object.entries(ls).map(([k, v]) => `<option value="${k}">${esc(v.nombre)}</option>`).join('');
    el.longitud.value = config.longitud;
  }

  async function prepararPool() {
    el.empezar.disabled = true;
    el.disponibles.textContent = 'Cargando preguntas…';
    if (repaso) {
      const pendientes = fallosPendientes();
      const ids = new Set(pendientes.flatMap(([, v]) => v.fallos));
      const todas = await preguntasDe(pendientes.map(([s]) => s));
      pool = todas.filter((p) => ids.has(p.id) && (!config.cert || p.certificaciones.includes(config.cert)));
      el.disponibles.textContent = pool.length
        ? `${pool.length} pregunta${pool.length > 1 ? 's' : ''} pendiente${pool.length > 1 ? 's' : ''} de repaso${pool.length > MAX_REPASO ? ` (se repasan ${MAX_REPASO} al azar)` : ''}.`
        : 'No tienes preguntas falladas pendientes de repaso con este filtro. ¡Bien!';
      el.ayuda.innerHTML = pool.length ? '' : `Responde preguntas en las <a href="${esc(url('index.html#catalogo'))}">guías</a> o haz un <a href="${esc(url('simulacro.html'))}">simulacro</a>; las que falles aparecerán aquí.`;
      el.empezar.disabled = !pool.length;
      return;
    }
    const c = certActual();
    const sids = datos.servicios.filter((s) => s.estado === 'publicado' && s.certificaciones.includes(c.codigo)).map((s) => s.id);
    const todas = (await preguntasDe(sids)).filter((p) => p.certificaciones.includes(c.codigo));
    if (config.cert !== c.codigo) return; // cambió mientras cargaba
    const nDificiles = todas.filter((p) => p.dificil).length;
    el.dificiles.disabled = !nDificiles;
    if (!nDificiles) config.dificiles = false;
    el.dificiles.setAttribute('aria-pressed', String(config.dificiles));
    el.dificiles.textContent = nDificiles ? `⚠ Solo preguntas difíciles (${nDificiles})` : '⚠ Solo preguntas difíciles (aún no hay)';
    pool = config.dificiles ? todas.filter((p) => p.dificil) : todas;
    const l = longitudes(c)[config.longitud];
    el.disponibles.textContent = `${pool.length} preguntas disponibles para ${c.codigo}.`;
    const extra = config.longitud === 'completo'
      ? ` Como el examen real, que tiene ${c.examen.preguntasPuntuadas} preguntas puntuables y ${c.examen.preguntasSinPuntuar} sin puntuar (aquí cuentan todas).`
      : '';
    el.ayuda.textContent = pool.length < l.n
      ? `Solo hay ${pool.length} preguntas con este filtro: el simulacro tendrá ${pool.length} y el tiempo se ajusta en proporción.`
      : `${l.n} preguntas en ${l.minutos} minutos.${extra}`;
    el.empezar.disabled = !pool.length;
  }

  function enlazarConfig() {
    el.cert.addEventListener('change', () => {
      config.cert = el.cert.value;
      if (!repaso) renderLongitudes();
      sincronizarUrl();
      prepararPool();
    });
    el.longitud.addEventListener('change', () => { config.longitud = el.longitud.value; sincronizarUrl(); prepararPool(); });
    el.dificiles.addEventListener('click', () => {
      config.dificiles = !config.dificiles;
      sincronizarUrl();
      prepararPool();
    });
    el.empezar.addEventListener('click', empezar);
  }

  // ── Selección de preguntas ────────────────────────────────────────────────────────────
  /** Cuotas por dominio con el método del mayor resto, para que sumen exactamente n. */
  function cuotas(dominios, n) {
    const base = dominios.map((d) => ({ nombre: d.nombre, exacto: (n * d.peso) / 100 }));
    base.forEach((b) => { b.cuota = Math.floor(b.exacto); });
    let resto = n - base.reduce((s, b) => s + b.cuota, 0);
    [...base].sort((a, b) => (b.exacto - b.cuota) - (a.exacto - a.cuota)).forEach((b) => {
      if (resto > 0) { b.cuota += 1; resto -= 1; }
    });
    return base;
  }

  function seleccionar(c, n) {
    const porDominio = new Map(c.dominios.map((d) => [d.nombre, []]));
    const otros = [];
    P.mezclar(pool).forEach((p) => {
      const lista = porDominio.get(P.dominioPara(p, c.codigo));
      (lista || otros).push(p);
    });
    const elegidas = [];
    const cortos = [];
    cuotas(c.dominios, n).forEach((q) => {
      const tomadas = porDominio.get(q.nombre).splice(0, q.cuota);
      elegidas.push(...tomadas);
      if (tomadas.length < q.cuota) cortos.push(q.nombre);
    });
    const sobrantes = P.mezclar([...[...porDominio.values()].flat(), ...otros]);
    while (elegidas.length < n && sobrantes.length) elegidas.push(sobrantes.pop());
    return { preguntas: P.mezclar(elegidas), cortos };
  }

  // ── Examen ────────────────────────────────────────────────────────────────────────────
  function empezar() {
    if (!pool.length) return;
    let preguntas;
    let cortos = [];
    let limite = null;
    const c = certActual();
    if (repaso) {
      preguntas = P.mezclar(pool).slice(0, MAX_REPASO);
    } else {
      const l = longitudes(c)[config.longitud];
      const n = Math.min(l.n, pool.length);
      ({ preguntas, cortos } = seleccionar(c, n));
      limite = Math.round((l.minutos * 60 * n) / l.n);
      const g = leerGuardado();
      g.ultima = { cert: c.codigo, longitud: config.longitud };
      escribirGuardado(g);
    }
    examen = {
      cert: c, preguntas, cortos, respuestas: preguntas.map(() => null), marcadas: new Set(),
      idx: 0, inicio: Date.now(), limite, temporizador: null, avisos: new Set(),
    };
    el.config.hidden = true;
    el.historial.hidden = true;
    el.resultado.hidden = true;
    el.examen.hidden = false;
    el.intro.hidden = true;
    renderNavegador();
    mostrar(0);
    if (limite) {
      examen.temporizador = setInterval(tic, 1000);
      tic();
    } else {
      el.reloj.textContent = 'Sin tiempo límite';
    }
    window.addEventListener('beforeunload', avisarSalida);
  }

  function avisarSalida(ev) {
    if (!examen || examen.terminado) return;
    ev.preventDefault();
    ev.returnValue = '';
  }

  function tic() {
    const restante = examen.limite - (Date.now() - examen.inicio) / 1000;
    el.reloj.textContent = `Tiempo: ${duracion(restante)}`;
    el.reloj.classList.toggle('is-poco', restante <= 300);
    [600, 300, 60].forEach((s) => {
      if (restante <= s && !examen.avisos.has(s)) {
        examen.avisos.add(s);
        aviso(`Quedan ${s / 60} minuto${s > 60 ? 's' : ''}.`);
      }
    });
    if (restante <= 0) terminar(true);
  }

  function aviso(texto) {
    let a = document.getElementById('sim-aviso');
    if (!a) {
      a = document.createElement('p');
      a.id = 'sim-aviso';
      a.className = 'visually-hidden';
      a.setAttribute('aria-live', 'assertive');
      document.body.appendChild(a);
    }
    a.textContent = texto;
  }

  function mostrar(i) {
    examen.idx = i;
    const p = examen.preguntas[i];
    const t = textoPara(p);
    el.pregunta.classList.toggle('is-dificil', Boolean(p.dificil));
    el.pregunta.innerHTML = `
      <h2 class="quiz-num sim-num" tabindex="-1">Pregunta ${i + 1}</h2>
      ${P.enunciado(p, t)}
      ${p.dificil ? `<div class="quiz-tags">${P.ETIQUETA_DIFICIL}</div>` : ''}
      ${P.respuestas(p, `sim-${i}`, t)}`;
    P.escribir(el.pregunta, p, examen.respuestas[i]);
    el.posicion.textContent = `Pregunta ${i + 1} de ${examen.preguntas.length}`;
    el.anterior.disabled = i === 0;
    el.siguiente.disabled = i === examen.preguntas.length - 1;
    el.marcar.setAttribute('aria-pressed', String(examen.marcadas.has(i)));
    actualizarNavegador();
  }

  function renderNavegador() {
    el.navegador.innerHTML = examen.preguntas.map((_, i) =>
      `<button type="button" class="sim-nav-btn" data-ir="${i}">${i + 1}</button>`).join('');
  }

  function actualizarNavegador() {
    [...el.navegador.children].forEach((b, i) => {
      const resp = examen.respuestas[i] !== null;
      const marc = examen.marcadas.has(i);
      b.classList.toggle('is-respondida', resp);
      b.classList.toggle('is-marcada', marc);
      if (i === examen.idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.setAttribute('aria-label', `Pregunta ${i + 1}${resp ? ', respondida' : ', sin responder'}${marc ? ', marcada para revisar' : ''}`);
    });
    reiniciarTerminar();
  }

  let confirmando = null;
  function reiniciarTerminar() {
    clearTimeout(confirmando);
    confirmando = null;
    el.terminar.textContent = 'Terminar y corregir';
  }

  function enlazarExamen() {
    P.activar(el.pregunta, () => {
      examen.respuestas[examen.idx] = P.leer(el.pregunta, examen.preguntas[examen.idx]);
      actualizarNavegador();
    });
    const ir = (i) => { mostrar(i); el.pregunta.querySelector('.sim-num').focus(); };
    el.anterior.addEventListener('click', () => ir(examen.idx - 1));
    el.siguiente.addEventListener('click', () => ir(examen.idx + 1));
    el.navegador.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-ir]');
      if (b) ir(Number(b.dataset.ir));
    });
    el.marcar.addEventListener('click', () => {
      if (examen.marcadas.has(examen.idx)) examen.marcadas.delete(examen.idx); else examen.marcadas.add(examen.idx);
      el.marcar.setAttribute('aria-pressed', String(examen.marcadas.has(examen.idx)));
      actualizarNavegador();
    });
    el.terminar.addEventListener('click', () => {
      const sin = examen.respuestas.filter((r) => r === null).length;
      const marc = examen.marcadas.size;
      if ((sin || marc) && !confirmando) {
        const partes = [sin ? `${sin} sin responder` : '', marc ? `${marc} marcada${marc > 1 ? 's' : ''}` : ''].filter(Boolean).join(' y ');
        el.terminar.textContent = `Tienes ${partes}. Pulsa otra vez para terminar`;
        confirmando = setTimeout(reiniciarTerminar, 5000);
        return;
      }
      terminar(false);
    });
  }

  // ── Corrección ────────────────────────────────────────────────────────────────────────
  function terminar(porTiempo) {
    clearInterval(examen.temporizador);
    examen.terminado = true;
    window.removeEventListener('beforeunload', avisarSalida);
    const segundos = (Date.now() - examen.inicio) / 1000;
    const { preguntas, respuestas } = examen;
    const aciertos = preguntas.map((p, i) => P.evaluar(p, respuestas[i]));

    // Progreso local: solo las respondidas.
    preguntas.forEach((p, i) => {
      if (respuestas[i] === null) return;
      const sid = P.servicioDe(p.id);
      P.registrar(sid, (cache.get(sid) || [p]).map((q) => q.id), p.id, aciertos[i]);
    });

    // Agrupación: por dominio en un simulacro, por servicio en el repaso.
    const grupos = new Map();
    const clave = (p) => (repaso ? (datos.servicioPorId.get(P.servicioDe(p.id)) || { nombre: P.servicioDe(p.id) }).nombre
      : P.dominioPara(p, examen.cert.codigo) || 'Sin dominio');
    if (!repaso) examen.cert.dominios.forEach((d) => grupos.set(d.nombre, { ok: 0, total: 0, peso: d.peso }));
    preguntas.forEach((p, i) => {
      const k = clave(p);
      if (!grupos.has(k)) grupos.set(k, { ok: 0, total: 0 });
      const g = grupos.get(k);
      g.total += 1;
      if (aciertos[i]) g.ok += 1;
    });

    const ok = aciertos.filter(Boolean).length;
    if (!repaso) {
      const g = leerGuardado();
      g.intentos.unshift({
        fecha: new Date().toISOString(), cert: examen.cert.codigo, longitud: config.longitud,
        dificiles: config.dificiles, n: preguntas.length, aciertos: ok, segundos: Math.round(segundos),
        dominios: [...grupos].filter(([, v]) => v.total).map(([nombre, v]) => ({ nombre, ok: v.ok, total: v.total })),
      });
      g.intentos = g.intentos.slice(0, MAX_HISTORIAL);
      escribirGuardado(g);
    }

    el.examen.hidden = true;
    el.resultado.hidden = false;
    renderResultado({ porTiempo, segundos, ok, aciertos, grupos });
    el.resultado.querySelector('h2').focus();
  }

  function barra(ok, total) {
    const pct = total ? Math.round((ok / total) * 100) : 0;
    return `<div class="quiz-barra" role="img" aria-label="${pct} % de aciertos"><span style="width:${pct}%"></span></div>`;
  }

  function renderResultado({ porTiempo, segundos, ok, aciertos, grupos }) {
    const { preguntas, respuestas, cert } = examen;
    const n = preguntas.length;
    const pct = Math.round((ok / n) * 100);
    const ref = repaso ? null : cert.examen.puntuacionMinima / 10;
    const sin = respuestas.filter((r) => r === null).length;
    const falladas = aciertos.filter((a) => !a).length;
    const filas = [...grupos].filter(([, v]) => v.total).map(([nombre, v]) => `
      <tr>
        <th scope="row">${esc(nombre)}${v.peso ? ` <span class="text-faint">(${v.peso} %)</span>` : ''}</th>
        <td>${v.ok}/${v.total}</td>
        <td class="sim-celda-barra">${barra(v.ok, v.total)}</td>
      </tr>`).join('');
    const enlaceRepaso = url(`simulacro.html?repaso=1${repaso ? (config.cert ? `&cert=${encodeURIComponent(config.cert)}` : '') : `&cert=${encodeURIComponent(cert.codigo)}`}`);

    el.resultado.innerHTML = `
      <div class="card sim-resumen">
        <h2 tabindex="-1">${repaso ? 'Resultado del repaso' : `Resultado del simulacro de ${esc(cert.codigo)}`}</h2>
        ${porTiempo ? '<p class="callout callout-warn"><strong>Se acabó el tiempo.</strong> Las preguntas sin responder cuentan como falladas, igual que en el examen real.</p>' : ''}
        <p class="sim-nota${ref !== null && pct >= ref ? ' ok' : ''}"><strong>${ok} de ${n}</strong> (${pct} %)</p>
        <p>Tiempo: ${duracion(segundos)}${sin ? ` · ${sin} sin responder` : ''}.</p>
        ${ref !== null ? `<p class="field-hint">Referencia orientativa: apunta a un ${ref} % o más. AWS no puntúa por porcentaje sino con una escala de 100 a 1000 en la que se aprueba con ${cert.examen.puntuacionMinima}, y no publica la equivalencia exacta.</p>` : ''}
        ${examen.cortos.length ? `<p class="field-hint">Aún hay pocas preguntas de ${examen.cortos.map((d) => `«${esc(d)}»`).join(', ')}: se completó con preguntas de otros dominios.</p>` : ''}
        <table class="sim-tabla">
          <caption class="visually-hidden">Aciertos por ${repaso ? 'servicio' : 'dominio'}</caption>
          <thead><tr><th scope="col">${repaso ? 'Servicio' : 'Dominio'}</th><th scope="col">Aciertos</th><th scope="col"><span class="visually-hidden">Gráfico</span></th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="quiz-acciones">
          ${falladas ? `<a class="btn btn-primary btn-sm" href="${esc(enlaceRepaso)}">Repasar las falladas</a>` : ''}
          <a class="btn btn-secondary btn-sm" href="${esc(url(`simulacro.html${repaso ? '?repaso=1' : `?cert=${encodeURIComponent(cert.codigo)}`}`))}">${repaso ? 'Otro repaso' : 'Nuevo simulacro'}</a>
          <a class="btn btn-secondary btn-sm" href="${esc(url('progreso.html'))}">Ver mi progreso</a>
        </div>
      </div>
      <div class="sim-revision-head">
        <h2>Corrección</h2>
        <div class="segmented" id="sim-filtro" role="radiogroup" aria-label="Qué preguntas mostrar">
          <button type="button" role="radio" aria-checked="true" data-filtro="todas">Todas</button>
          <button type="button" role="radio" aria-checked="false" data-filtro="falladas">Falladas (${falladas})</button>
          <button type="button" role="radio" aria-checked="false" data-filtro="marcadas">Marcadas (${examen.marcadas.size})</button>
        </div>
      </div>
      <div class="quiz" id="sim-revision">${preguntas.map((p, i) => revision(p, i, aciertos[i])).join('')}</div>`;

    const lista = el.resultado.querySelector('#sim-revision');
    preguntas.forEach((p, i) => {
      const fs = lista.children[i];
      if (respuestas[i] !== null) {
        P.escribir(fs, p, respuestas[i]);
        P.marcar(fs, p);
      } else {
        fs.querySelectorAll('input, select, [data-mover]').forEach((x) => { x.disabled = true; });
      }
    });
    el.resultado.querySelector('#sim-filtro').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-filtro]');
      if (!b) return;
      ev.currentTarget.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      [...lista.children].forEach((fs, i) => {
        fs.hidden = (b.dataset.filtro === 'falladas' && aciertos[i]) || (b.dataset.filtro === 'marcadas' && !examen.marcadas.has(i));
      });
    });
  }

  function revision(p, i, acierto) {
    const t = textoPara(p);
    const s = datos.servicioPorId.get(P.servicioDe(p.id));
    const sinResponder = examen.respuestas[i] === null;
    return `
      <fieldset class="quiz-question${p.dificil ? ' is-dificil' : ''}">
        <legend>
          <span class="quiz-num">Pregunta ${i + 1}${examen.marcadas.has(i) ? ' · ⚑ marcada' : ''}</span>
          ${P.enunciado(p, t)}
        </legend>
        <div class="quiz-tags">${P.etiquetas(p, { cert: repaso ? '' : examen.cert.codigo })}</div>
        ${P.respuestas(p, `rev-${i}`, t)}
        <div class="quiz-feedback">
          ${sinResponder ? `<p class="ko">✘ Sin responder.</p><div class="quiz-solucion-zona">${P.solucion(p, t)}</div><p>${t(p.explicacion)}</p>` : P.correccion(p, acierto, t)}
          ${s ? `<p><a href="${esc(urlServicio(s))}#preguntas">Repasar en la guía de ${esc(s.nombre)} →</a></p>` : ''}
        </div>
      </fieldset>`;
  }

  // ── Historial ─────────────────────────────────────────────────────────────────────────
  function renderHistorial() {
    if (repaso) { el.historial.hidden = true; return; }
    const { intentos } = leerGuardado();
    if (!intentos.length) { el.historial.innerHTML = ''; return; }
    const nombreL = { completo: 'Completo', medio: 'Medio', rapido: 'Rápido' };
    el.historial.innerHTML = `
      <h2>Tus últimos simulacros</h2>
      <div class="sim-tabla-scroll"><table class="sim-tabla">
        <thead><tr><th scope="col">Fecha</th><th scope="col">Certificación</th><th scope="col">Duración</th><th scope="col">Resultado</th><th scope="col">Tiempo</th></tr></thead>
        <tbody>${intentos.slice(0, 10).map((x) => `
          <tr>
            <td>${esc(formatoFecha(x.fecha.slice(0, 10)))}</td>
            <td>${esc(x.cert)}</td>
            <td>${esc(nombreL[x.longitud] || x.longitud)}${x.dificiles ? ' · ⚠ difíciles' : ''}</td>
            <td>${x.aciertos}/${x.n} (${Math.round((x.aciertos / x.n) * 100)} %)</td>
            <td>${esc(duracion(x.segundos))}</td>
          </tr>`).join('')}</tbody>
      </table></div>`;
  }

  // ── Inicio ────────────────────────────────────────────────────────────────────────────
  async function iniciar() {
    try {
      datos = await cargar();
      if (window.AwsSiglas) glosario = await window.AwsSiglas.cargarGlosario().catch(() => null);
      renderConfig();
      if (!repaso) renderLongitudes();
      sincronizarUrl();
      enlazarConfig();
      enlazarExamen();
      renderHistorial();
      await prepararPool();
    } catch (err) {
      console.error(err);
      el.disponibles.textContent = 'No se han podido cargar las preguntas. Prueba a recargar la página.';
    }
  }

  iniciar();
})();
