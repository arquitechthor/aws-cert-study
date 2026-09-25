/**
 * Preguntas de práctica. Cada contenedor <div class="quiz" data-quiz="<id>"> carga
 * data/preguntas/<id>.json y pinta cada pregunta como un <fieldset>:
 *   - tipo "unica": radios, una respuesta correcta.
 *   - tipo "multiple": checkboxes, hay que marcar exactamente todas las correctas.
 * "correctas" son índices (desde 0) de "opciones". Formato completo en PLAN.md.
 */
(function () {
  const { json, esc } = window.AwsDatos;
  const LETRAS = 'ABCDEFGH';

  function pregunta(p, i, idQuiz) {
    const multiple = p.tipo === 'multiple';
    const nombre = `${idQuiz}-${p.id}`;
    const tags = [...(p.certificaciones || []).map((c) => `<span class="chip chip-cert">${esc(c)}</span>`),
      p.dominio ? `<span class="chip">${esc(p.dominio)}</span>` : ''].join('');
    return `
      <fieldset class="quiz-question" data-id="${esc(p.id)}">
        <legend>
          <span class="quiz-num">Pregunta ${i + 1}</span>
          <p class="quiz-stem">${esc(p.enunciado)}</p>
          ${multiple ? `<p class="quiz-hint">Elige ${p.correctas.length} respuestas.</p>` : ''}
        </legend>
        ${tags ? `<div class="quiz-tags">${tags}</div>` : ''}
        <div class="quiz-options">
          ${p.opciones.map((o, j) => `
            <label class="quiz-option">
              <input type="${multiple ? 'checkbox' : 'radio'}" name="${esc(nombre)}" value="${j}">
              <span><strong>${LETRAS[j]}.</strong> ${esc(o)}</span>
            </label>`).join('')}
        </div>
        <button class="btn btn-secondary btn-sm" type="button" data-accion="comprobar">Comprobar</button>
        <div class="quiz-feedback" hidden></div>
      </fieldset>`;
  }

  function comprobar(fs, p) {
    const inputs = [...fs.querySelectorAll('input')];
    const marcadas = inputs.filter((x) => x.checked).map((x) => Number(x.value));
    if (!marcadas.length) return;

    const correctas = new Set(p.correctas);
    const acierto = marcadas.length === correctas.size && marcadas.every((m) => correctas.has(m));

    inputs.forEach((x) => {
      x.disabled = true;
      const opt = x.closest('.quiz-option');
      const j = Number(x.value);
      if (correctas.has(j)) opt.classList.add('is-correct');
      else if (x.checked) opt.classList.add('is-wrong');
    });

    const letras = p.correctas.map((j) => LETRAS[j]).join(', ');
    const fuentes = (p.fuentes || []).map((u) =>
      `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, ''))}</a></li>`).join('');
    const fb = fs.querySelector('.quiz-feedback');
    fb.innerHTML = `
      <p class="${acierto ? 'ok' : 'ko'}">${acierto ? '✔ Correcto' : `✘ Incorrecto. Respuesta correcta: ${letras}`}</p>
      <p>${esc(p.explicacion)}</p>
      ${fuentes ? `<p class="text-faint">Fuentes:</p><ul>${fuentes}</ul>` : ''}`;
    fb.hidden = false;

    const btn = fs.querySelector('[data-accion]');
    btn.dataset.accion = 'reintentar';
    btn.textContent = 'Reintentar';
  }

  function reintentar(fs) {
    fs.querySelectorAll('input').forEach((x) => { x.disabled = false; x.checked = false; });
    fs.querySelectorAll('.quiz-option').forEach((o) => o.classList.remove('is-correct', 'is-wrong'));
    const fb = fs.querySelector('.quiz-feedback');
    fb.hidden = true;
    fb.innerHTML = '';
    const btn = fs.querySelector('[data-accion]');
    btn.dataset.accion = 'comprobar';
    btn.textContent = 'Comprobar';
  }

  async function iniciar(cont) {
    const id = cont.dataset.quiz;
    try {
      const preguntas = await json(`data/preguntas/${encodeURIComponent(id)}.json`);
      if (!preguntas.length) throw new Error('sin preguntas');
      const porId = new Map(preguntas.map((p) => [p.id, p]));
      cont.innerHTML = preguntas.map((p, i) => pregunta(p, i, id)).join('');
      cont.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-accion]');
        if (!btn) return;
        const fs = btn.closest('.quiz-question');
        const p = porId.get(fs.dataset.id);
        if (btn.dataset.accion === 'comprobar') comprobar(fs, p); else reintentar(fs);
      });
    } catch (err) {
      console.error(err);
      cont.innerHTML = '<p class="text-faint">Las preguntas de práctica de este servicio todavía no están disponibles.</p>';
    }
  }

  document.querySelectorAll('.quiz[data-quiz]').forEach(iniciar);
})();
