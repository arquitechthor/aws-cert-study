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
        </div>`;
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
        <p>Borra de este navegador los aciertos, las falladas y el historial de simulacros (el juego de memoria no se toca). No se puede deshacer.</p>
        <button class="btn btn-secondary btn-sm" type="button" id="prog-borrar">Borrar mi progreso</button>
      </div>`;

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
      iniciar();
    });
  }

  iniciar().catch((err) => {
    console.error(err);
    cont.innerHTML = '<p class="text-faint">No se ha podido cargar tu progreso. Prueba a recargar la página.</p>';
  });
})();
