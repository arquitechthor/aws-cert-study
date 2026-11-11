/**
 * Mi progreso (progreso.html), tarea 3.2 de PLAN.md. Todo sale del localStorage de este
 * navegador: el progreso por servicio (apuntes-aws.progreso: aciertos, fallos, finalizado) y el
 * historial de simulacros (apuntes-aws.simulacros). Carga las preguntas de todos los servicios
 * publicados para calcular los totales por certificación y descartar ids que ya no existen.
 */
(function () {
  const { cargar, json, esc, url, urlServicio, leerProgreso, formatoFecha } = window.AwsDatos;
  const P = window.AwsPreguntas;
  const cont = document.getElementById('prog-contenido');
  const CLAVE_PROGRESO = 'apuntes-aws.progreso';
  const CLAVE_SIMULACROS = 'apuntes-aws.simulacros';

  function barra(ok, total, etiqueta) {
    const pct = total ? Math.round((ok / total) * 100) : 0;
    return `<div class="quiz-barra" role="progressbar" aria-label="${esc(etiqueta)}" aria-valuemin="0"
      aria-valuemax="${total}" aria-valuenow="${ok}"><span style="width:${pct}%"></span></div>`;
  }

  function duracion(seg) {
    const s = Math.max(0, Math.round(seg));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
  }

  function simulacros() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE_SIMULACROS) || '{}');
      return Array.isArray(d.intentos) ? d.intentos : [];
    } catch {
      return [];
    }
  }

  /* ── Mi telaraña: AWS en el centro, las categorías alrededor y sus servicios en el anillo exterior ── */

  const COLOR = { hecho: '#4ade80', curso: '#fbbf24', nada: '#64748b', centro: '#22d3ee' };
  const T = window.AwsTelarana;
  let tela = null; // { datos, prog, foco }

  /** "Amazon EC2" -> "EC2": en la telaraña sobra el prefijo (el nombre completo va en el tooltip). */
  function corto(nombre) {
    return nombre.replace(/^(Amazon|AWS) (?=\S)/, '');
  }

  function arbol(datos) {
    const raiz = { id: 'aws', nombre: 'AWS', tipo: 'raiz' };
    const nodos = [raiz];
    const hijos = new Map([['aws', []]]);
    for (const c of datos.categorias) {
      const servs = datos.servicios.filter((s) => s.categoria === c.id && s.estado === 'publicado');
      if (!servs.length) continue;
      const cat = { id: `cat-${c.id}`, nombre: c.nombre, tipo: 'bloque', padre: 'aws' };
      nodos.push(cat);
      hijos.get('aws').push({ nodo: cat, acceso: false });
      hijos.set(cat.id, servs.map((s) => {
        const n = { id: s.id, nombre: corto(s.nombre), nombreCompleto: s.nombre, tipo: 'tema', padre: cat.id, servicio: s };
        nodos.push(n);
        hijos.set(n.id, []);
        return { nodo: n, acceso: false };
      }));
    }
    return { porId: new Map(nodos.map((n) => [n.id, n])), hijos };
  }

  /** Servicios de un nodo: él mismo, los de su categoría o todos (AWS). */
  function serviciosDe(n) {
    if (n.tipo === 'tema') return [n];
    const cats = n.tipo === 'raiz' ? tela.datos.hijos.get('aws').map((h) => h.nodo) : [n];
    return cats.flatMap((c) => tela.datos.hijos.get(c.id).map((x) => x.nodo));
  }

  /** Cuántos servicios del nodo están finalizados o en curso, y su color. */
  function estadoDe(n) {
    const servicios = serviciosDe(n);
    let hechos = 0;
    let curso = 0;
    for (const sv of servicios) {
      const p = tela.prog.get(sv.id);
      if (!p) continue;
      if (p.finalizado) hechos++;
      else if (p.aciertos.length || p.fallos.length) curso++;
    }
    const color = hechos === servicios.length ? COLOR.hecho : (hechos || curso ? COLOR.curso : COLOR.nada);
    return { hechos, curso, total: servicios.length, color };
  }

  function destinoDe(n, { centro } = {}) {
    if (centro) return { n: n.padre || 'aws' };
    if (n.tipo === 'tema') return { servicio: n.id };
    return { n: n.id };
  }

  function urlDe(destino) {
    if (destino.servicio) return urlServicio(tela.datos.porId.get(destino.servicio).servicio);
    return destino.n === 'aws' ? '?#mi-telarana' : `?cat=${encodeURIComponent(destino.n.replace(/^cat-/, ''))}#mi-telarana`;
  }

  function navegar(destino) {
    if (destino.servicio) { location.href = urlDe(destino); return; }
    const antes = tela.foco;
    tela.foco = destino.n;
    history.replaceState(null, '', urlDe(destino).replace('?#', location.pathname + '#'));
    dibujarTela({ animar: true, enfocar: antes !== tela.foco ? tela.foco : null });
  }

  function dibujarTela({ animar = false, enfocar = null } = {}) {
    const svg = document.getElementById('telarana');
    if (!svg || !T) return;
    const movil = window.matchMedia('(max-width: 700px)').matches;
    T.dibujar(svg, tela.datos, { foco: tela.foco, movil, animar, enfocar, urlDe, destinoDe, navegar });
    for (const a of svg.querySelectorAll('a[data-id]')) {
      const n = tela.datos.porId.get(a.dataset.id);
      const e = estadoDe(n);
      a.style.setProperty('--c', a.classList.contains('nodo-centro') ? COLOR.centro : e.color);
      let extra;
      if (n.tipo === 'tema') {
        const p = tela.prog.get(n.id);
        extra = e.hechos ? 'finalizado' : (e.curso ? `en curso, ${p.aciertos.length} de ${p.total} acertadas` : 'sin empezar');
        const texto = [...a.querySelectorAll('text')].pop();
        if (e.hechos && texto) {
          const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          ts.setAttribute('class', 'marca-aws');
          ts.setAttribute('aria-hidden', 'true');
          ts.textContent = ' ✓';
          const tspans = texto.querySelectorAll('tspan');
          (tspans.length ? tspans[tspans.length - 1] : texto).appendChild(ts);
        }
        const titulo = a.querySelector('title');
        if (titulo) titulo.textContent = n.nombreCompleto;
      } else {
        extra = `${e.hechos} de ${e.total} servicios finalizados${e.curso ? `, ${e.curso} en curso` : ''}`;
      }
      a.setAttribute('aria-label', `${a.getAttribute('aria-label')}. ${extra}`);
    }
    const foco = tela.datos.porId.get(tela.foco);
    const e = estadoDe(foco);
    document.getElementById('tela-resumen').textContent = foco.tipo === 'raiz'
      ? `${e.hechos} de ${e.total} servicios finalizados${e.curso ? ` y ${e.curso} en curso` : ''}. Pulsa una categoría para verla de cerca.`
      : `${foco.nombre}: ${e.hechos} de ${e.total} finalizados${e.curso ? `, ${e.curso} en curso` : ''}. Pulsa el centro para volver.`;
  }

  function seccionTela() {
    return `
      <section id="mi-telarana" class="aws-telarana" aria-labelledby="tela-titulo">
        <h2 id="tela-titulo">Mi telaraña de AWS</h2>
        <p>Todos los servicios por categorías, coloreados según tu progreso. Pulsa una categoría para verla de cerca
          y un servicio para abrir su guía. <a href="https://arquitechthor.github.io/arquitechthor-spider/index.html?n=aws">Tech Spider</a>
          muestra este mismo progreso dentro del mapa completo de tecnologías.</p>
        <div class="aws-telarana-lienzo">
          <div class="aws-telarana-cab"><p id="tela-resumen" aria-live="polite"></p></div>
          <svg id="telarana" role="group" aria-label="Telaraña de AWS"></svg>
          <p class="leyenda"><span class="ley-titulo">Color:</span>
            <span><span class="ley" style="--c:${COLOR.hecho}" aria-hidden="true"></span>finalizado ✓</span>
            <span><span class="ley" style="--c:${COLOR.curso}" aria-hidden="true"></span>en curso</span>
            <span><span class="ley" style="--c:${COLOR.nada}" aria-hidden="true"></span>sin empezar</span>
            <span>Una categoría es verde cuando todos sus servicios están finalizados.</span></p>
        </div>
      </section>`;
  }

  function montarTela(datos, prog) {
    const d = arbol(datos);
    const cat = new URLSearchParams(location.search).get('cat');
    const foco = tela && d.porId.has(tela.foco) ? tela.foco : (cat && d.porId.has(`cat-${cat}`) ? `cat-${cat}` : 'aws');
    const primera = !tela;
    tela = { datos: d, prog, foco };
    dibujarTela();
    // La sección se pinta después de cargar: el salto a #mi-telarana (enlace del catálogo) se hace aquí.
    if (primera && location.hash === '#mi-telarana') document.getElementById('mi-telarana').scrollIntoView();
    const svg = document.getElementById('telarana');
    svg.addEventListener('keydown', (ev) => {
      if (T.moverPorAnillo(svg, ev)) { ev.preventDefault(); return; }
      if (ev.key === 'Escape' && tela.foco !== 'aws') {
        ev.preventDefault();
        navegar({ n: 'aws' });
        svg.querySelector('a.nodo-centro')?.focus();
      }
    });
  }

  let anchoPrevio = window.innerWidth;
  window.addEventListener('resize', () => {
    const cambia = (window.innerWidth > 700) !== (anchoPrevio > 700);
    anchoPrevio = window.innerWidth;
    if (tela && cambia) dibujarTela();
  });

  async function iniciar() {
    const datos = await cargar();
    const publicados = datos.servicios.filter((s) => s.estado === 'publicado');
    const bruto = leerProgreso();
    const intentos = simulacros();
    if (!Object.keys(bruto).length && !intentos.length) {
      cont.innerHTML = `
        <div class="card prog-vacio">
          <p>Todavía no hay progreso guardado en este navegador.</p>
          <p>Responde las preguntas de práctica de cualquier <a href="${esc(url('index.html#catalogo'))}">guía</a>
            o haz un <a href="${esc(url('simulacro.html'))}">simulacro</a>: lo que aciertes y lo que falles aparecerá aquí.</p>
        </div>
        ${seccionTela()}`;
      montarTela(datos, new Map());
      return;
    }

    cont.innerHTML = '<p class="text-faint">Calculando tu progreso…</p>';
    const preguntas = new Map();
    await Promise.all(publicados.map((s) => json(`data/preguntas/${encodeURIComponent(s.id)}.json`)
      .then((l) => preguntas.set(s.id, l)).catch(() => preguntas.set(s.id, []))));

    const prog = new Map();
    publicados.forEach((s) => {
      const ids = (preguntas.get(s.id) || []).map((p) => p.id);
      prog.set(s.id, P.progresoDe(s.id, ids, bruto));
    });
    const acertadas = new Set([...prog.values()].flatMap((p) => p.aciertos));
    const falladas = new Set([...prog.values()].flatMap((p) => p.fallos));
    const totalPreguntas = [...preguntas.values()].reduce((n, l) => n + l.length, 0);
    const finalizados = publicados.filter((s) => prog.get(s.id).finalizado);
    const empezados = publicados.filter((s) => prog.get(s.id).aciertos.length || prog.get(s.id).fallos.length);
    const enCurso = empezados.filter((s) => !prog.get(s.id).finalizado);

    const certs = datos.certificaciones.filter((c) => c.examen).map((c) => {
      const servs = publicados.filter((s) => s.certificaciones.includes(c.codigo));
      const qs = servs.flatMap((s) => preguntas.get(s.id) || []).filter((p) => p.certificaciones.includes(c.codigo));
      return {
        c,
        servicios: servs.length,
        finalizados: servs.filter((s) => prog.get(s.id).finalizado).length,
        total: qs.length,
        ok: qs.filter((p) => acertadas.has(p.id)).length,
        fallos: qs.filter((p) => falladas.has(p.id)).length,
      };
    });

    const nombreServicio = (s) => `<a href="${esc(urlServicio(s))}">${esc(s.nombre)}</a>`;
    const repasoTodas = url('simulacro.html?repaso=1');

    cont.innerHTML = `
      <div class="grid grid-4 prog-resumen">
        <div class="card"><p class="prog-cifra">${finalizados.length}<span>/${publicados.length}</span></p><p>temas finalizados</p></div>
        <div class="card"><p class="prog-cifra">${empezados.length}</p><p>temas empezados</p></div>
        <div class="card"><p class="prog-cifra">${acertadas.size}<span>/${totalPreguntas}</span></p><p>preguntas acertadas alguna vez</p></div>
        <div class="card"><p class="prog-cifra">${falladas.size}</p><p>falladas pendientes de repaso</p>
          ${falladas.size ? `<a class="btn btn-primary btn-sm" href="${esc(repasoTodas)}">Repasar</a>` : ''}</div>
      </div>

      ${seccionTela()}

      <h2>Por certificación</h2>
      <div class="sim-tabla-scroll"><table class="sim-tabla prog-certs">
        <thead><tr><th scope="col">Certificación</th><th scope="col">Temas finalizados</th><th scope="col">Preguntas acertadas</th><th scope="col"><span class="visually-hidden">Acciones</span></th></tr></thead>
        <tbody>${certs.map((x) => `
          <tr>
            <th scope="row">${esc(x.c.codigo)} <span class="text-faint">${esc(x.c.nombreCorto)}</span></th>
            <td>${x.finalizados}/${x.servicios}</td>
            <td>${x.ok}/${x.total} ${barra(x.ok, x.total, `Preguntas acertadas de ${x.c.codigo}`)}</td>
            <td class="prog-acciones">
              <a class="btn btn-secondary btn-sm" href="${esc(url(`simulacro.html?cert=${encodeURIComponent(x.c.codigo)}`))}">Simulacro</a>
              ${x.fallos ? `<a class="btn btn-secondary btn-sm" href="${esc(url(`simulacro.html?repaso=1&cert=${encodeURIComponent(x.c.codigo)}`))}">Repasar ${x.fallos} fallada${x.fallos > 1 ? 's' : ''}</a>` : ''}
            </td>
          </tr>`).join('')}</tbody>
      </table></div>

      ${falladas.size ? `
      <h2>Pendientes de repaso</h2>
      <p>Preguntas que fallaste la última vez que las respondiste. Salen de aquí en cuanto las aciertas.</p>
      <ul class="prog-lista">${publicados.filter((s) => prog.get(s.id).fallos.length).map((s) =>
        `<li>${nombreServicio(s)} <span class="text-faint">· ${prog.get(s.id).fallos.length} fallada${prog.get(s.id).fallos.length > 1 ? 's' : ''}</span></li>`).join('')}</ul>
      <a class="btn btn-primary btn-sm" href="${esc(repasoTodas)}">Repasar todas las falladas</a>` : ''}

      ${enCurso.length ? `
      <h2>En curso</h2>
      <ul class="prog-lista prog-curso">${enCurso.map((s) => {
        const p = prog.get(s.id);
        return `<li>${nombreServicio(s)} <span class="text-faint">· ${p.aciertos.length}/${p.total}</span>${barra(p.aciertos.length, p.total, `Preguntas acertadas de ${s.nombre}`)}</li>`;
      }).join('')}</ul>` : ''}

      ${finalizados.length ? `
      <h2>Finalizados</h2>
      <ul class="prog-lista prog-finalizados">${finalizados.map((s) =>
        `<li>✔ ${nombreServicio(s)} <span class="text-faint">· ${esc(formatoFecha(prog.get(s.id).finalizado))}</span></li>`).join('')}</ul>` : ''}

      ${intentos.length ? `
      <h2>Simulacros</h2>
      <div class="sim-tabla-scroll"><table class="sim-tabla">
        <thead><tr><th scope="col">Fecha</th><th scope="col">Certificación</th><th scope="col">Resultado</th><th scope="col">Tiempo</th></tr></thead>
        <tbody>${intentos.map((x) => `
          <tr><td>${esc(formatoFecha(x.fecha.slice(0, 10)))}</td><td>${esc(x.cert)}${x.dificiles ? ' · ⚠' : ''}</td>
            <td>${x.aciertos}/${x.n} (${Math.round((x.aciertos / x.n) * 100)} %)</td><td>${esc(duracion(x.segundos))}</td></tr>`).join('')}</tbody>
      </table></div>` : ''}

      <div class="prog-borrar">
        <h2>Borrar mi progreso</h2>
        <p>Borra de este navegador los aciertos, las falladas y el historial de simulacros (los juegos y su clasificación no se tocan). No se puede deshacer.</p>
        <button class="btn btn-secondary btn-sm" type="button" id="prog-borrar">Borrar mi progreso</button>
      </div>`;

    montarTela(datos, prog);

    const btn = document.getElementById('prog-borrar');
    let armado = null;
    btn.addEventListener('click', () => {
      if (!armado) {
        btn.textContent = '¿Seguro? Pulsa otra vez para borrarlo todo';
        armado = setTimeout(() => { armado = null; btn.textContent = 'Borrar mi progreso'; }, 5000);
        return;
      }
      clearTimeout(armado);
      try {
        localStorage.removeItem(CLAVE_PROGRESO);
        localStorage.removeItem(CLAVE_SIMULACROS);
      } catch { /* sin almacenamiento */ }
      // Con cuenta Kopi, el borrado también se sincroniza (gana el cambio más reciente).
      window.AwsDatos.avisarGuardado('progreso');
      window.AwsDatos.avisarGuardado('simulacros');
      iniciar();
    });
  }

  // Progreso traído de la cuenta Kopi (assets/cuenta.js).
  document.addEventListener('aws:sincronizado', () => { iniciar().catch(console.error); });

  iniciar().catch((err) => {
    console.error(err);
    cont.innerHTML = '<p class="text-faint">No se ha podido cargar tu progreso. Prueba a recargar la página.</p>';
  });
})();
