/**
 * Preguntas de práctica de una guía. Cada contenedor <div class="quiz" data-quiz="<id>"> carga
 * data/preguntas/<id>.json y pinta cada pregunta como un <fieldset> con su botón "Comprobar".
 * Los tipos (unica, multiple, ordenar, emparejar), la corrección y el progreso local están en
 * assets/preguntas.js (window.AwsPreguntas), compartido con el simulacro.
 *
 * Cada intento se guarda en el progreso local (aciertos y preguntas falladas, en localStorage).
 * Cuando todas las preguntas se han acertado al menos una vez, el servicio queda "finalizado"
 * y así aparece en su tarjeta del catálogo.
 */
(function () {
  const { json, esc, cargar, formatoFecha } = window.AwsDatos;
  const P = window.AwsPreguntas;

  // Siglas con tooltip (assets/siglas.js y data/siglas.json). Sin glosario, texto escapado sin más.
  let glosario = null;
  function textoPara(id) {
    return (t) => {
      const e = esc(t);
      return glosario && window.AwsSiglas ? window.AwsSiglas.marcar(e, id, glosario) : e;
    };
  }

  function cabecera(prog) {
    const pct = Math.round((prog.aciertos.length / prog.total) * 100);
    const texto = prog.finalizado
      ? `✔ Tema finalizado el ${esc(formatoFecha(prog.finalizado))}: has acertado las ${prog.total} preguntas.`
      : `Acertadas ${prog.aciertos.length} de ${prog.total}. Acierta todas para marcar el tema como finalizado.`;
    const fallos = prog.fallos.length
      ? ` <a href="${esc(window.AwsDatos.url('progreso.html'))}">${prog.fallos.length} pendiente${prog.fallos.length > 1 ? 's' : ''} de repaso</a>.`
      : '';
    return `
      <p class="quiz-progreso-texto${prog.finalizado ? ' ok' : ''}">${texto}${fallos}</p>
      <div class="quiz-barra" role="progressbar" aria-label="Preguntas acertadas" aria-valuemin="0"
        aria-valuemax="${prog.total}" aria-valuenow="${prog.aciertos.length}"><span style="width:${pct}%"></span></div>
      <div class="quiz-acciones">
        <button class="btn btn-secondary btn-sm" type="button" data-accion="exportar-noria"
          title="Descarga un .json para importar estas preguntas como un tema en un bloque de Noria">Exportar a Noria</button>
        ${prog.aciertos.length || prog.fallos.length ? '<button class="btn btn-secondary btn-sm" type="button" data-accion="reiniciar-progreso">Reiniciar progreso</button>' : ''}
      </div>`;
  }

  // ── Exportar a Noria ──────────────────────────────────────────────────────────────────
  // Formato de importación de Noria (kopi-docs/importar_temas.md, el mismo que usa kopi-web):
  // { version: 1, temas: [{ nombre, descripcion?, preguntas?: [texto] }] }. Un servicio = un
  // tema. Noria solo guarda el texto de cada pregunta de repaso, así que se exportan el
  // enunciado y las opciones, sin la respuesta: se comprueba aquí, en la página del servicio.
  function nombreFichero(texto) {
    return texto.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async function exportarNoria(idQuiz, preguntas) {
    const servicio = (await cargar()).servicioPorId.get(idQuiz);
    const nombre = servicio ? servicio.nombre : idQuiz;
    const tema = { nombre, preguntas: preguntas.map(P.textoNoria) };
    if (servicio && servicio.resumen) tema.descripcion = servicio.resumen;
    const blob = new Blob([JSON.stringify({ version: 1, temas: [tema] }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Noria - Apuntes AWS - ${nombreFichero(nombre)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function pregunta(p, i, idQuiz, acertada, t) {
    return `
      <fieldset class="quiz-question${acertada ? ' is-acertada' : ''}${p.dificil ? ' is-dificil' : ''}" data-id="${esc(p.id)}">
        <legend>
          <span class="quiz-num">Pregunta ${i + 1}</span>
          ${P.enunciado(p, t)}
        </legend>
        <div class="quiz-tags">${P.etiquetas(p)}<span class="chip chip-ok">✔ Ya acertada</span></div>
        ${P.respuestas(p, `${idQuiz}-${p.id}`, t)}
        <button class="btn btn-secondary btn-sm" type="button" data-accion="comprobar">Comprobar</button>
        <div class="quiz-feedback" hidden></div>
      </fieldset>`;
  }

  async function iniciar(cont) {
    const id = cont.dataset.quiz;
    try {
      const preguntas = await json(`data/preguntas/${encodeURIComponent(id)}.json`);
      if (window.AwsSiglas) glosario = await window.AwsSiglas.cargarGlosario().catch(() => null);
      if (!preguntas.length) throw new Error('sin preguntas');
      const t = textoPara(id);
      const ids = preguntas.map((p) => p.id);
      const porId = new Map(preguntas.map((p) => [p.id, p]));
      let prog = P.progresoDe(id, ids);
      P.guardar(id, prog);
      const acertadas = new Set(prog.aciertos);
      cont.innerHTML = `<div class="quiz-progreso" aria-live="polite">${cabecera(prog)}</div>`
        + preguntas.map((p, i) => pregunta(p, i, id, acertadas.has(p.id), t)).join('');
      const zonaProgreso = cont.querySelector('.quiz-progreso');
      P.activar(cont);

      cont.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-accion]');
        if (!btn) return;
        if (btn.dataset.accion === 'exportar-noria') {
          exportarNoria(id, preguntas).catch((err) => console.error(err));
          return;
        }
        if (btn.dataset.accion === 'reiniciar-progreso') {
          prog = { aciertos: [], fallos: [], total: preguntas.length, finalizado: null };
          P.guardar(id, prog);
          cont.querySelectorAll('.quiz-question.is-acertada').forEach((fs) => fs.classList.remove('is-acertada'));
          zonaProgreso.innerHTML = cabecera(prog);
          return;
        }
        const fs = btn.closest('.quiz-question');
        const p = porId.get(fs.dataset.id);
        const fb = fs.querySelector('.quiz-feedback');
        if (btn.dataset.accion === 'reintentar') {
          P.limpiar(fs, p, t);
          fb.hidden = true;
          fb.innerHTML = '';
          btn.dataset.accion = 'comprobar';
          btn.textContent = 'Comprobar';
          return;
        }
        const resp = P.leer(fs, p);
        if (!resp) {
          fb.innerHTML = `<p class="text-faint">${p.tipo === 'ordenar' ? 'Mueve al menos un paso antes de comprobar.' : 'Completa la respuesta antes de comprobar.'}</p>`;
          fb.hidden = false;
          return;
        }
        const acierto = P.evaluar(p, resp);
        P.marcar(fs, p);
        fb.innerHTML = P.correccion(p, acierto, t);
        fb.hidden = false;
        btn.dataset.accion = 'reintentar';
        btn.textContent = 'Reintentar';
        prog = P.registrar(id, ids, p.id, acierto);
        fs.classList.toggle('is-acertada', prog.aciertos.includes(p.id));
        zonaProgreso.innerHTML = cabecera(prog);
      });
    } catch (err) {
      console.error(err);
      cont.innerHTML = '<p class="text-faint">Las preguntas de práctica de este servicio todavía no están disponibles.</p>';
    }
  }

  document.querySelectorAll('.quiz[data-quiz]').forEach(iniciar);
})();
