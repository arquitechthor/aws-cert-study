/**
 * Tooltip de las siglas (<abbr class="sigla" data-s data-en data-es tabindex="0">), tanto las de
 * la guía (las marca scripts/revisar_texto.py) como las que marca quiz.js al pintar preguntas.
 * Aparece al pasar el ratón o al enfocar la sigla (en móvil, al tocarla). Es un único elemento
 * con posición fija que se ajusta a la ventana, así nunca provoca desplazamiento horizontal.
 * También expone window.AwsSiglas.marcar(textoEscapado, idServicio) para el quiz.
 */
(function () {
  let tip = null;
  let actual = null;

  function crearTip() {
    tip = document.createElement('div');
    tip.className = 'sigla-tip';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'sigla-tip';
    tip.hidden = true;
    document.body.appendChild(tip);
  }

  function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function mostrar(el) {
    if (!tip) crearTip();
    actual = el;
    const en = el.dataset.en;
    const es = el.dataset.es;
    tip.innerHTML = `<strong>${esc(el.dataset.s)}</strong>${en ? ` <em>${esc(en)}</em>` : ''}${es ? `<span>${esc(es)}</span>` : ''}`;
    tip.hidden = false;
    el.setAttribute('aria-describedby', 'sigla-tip');
    const r = el.getBoundingClientRect();
    const margen = 8;
    const ancho = Math.min(tip.offsetWidth, window.innerWidth - margen * 2);
    let x = r.left + r.width / 2 - ancho / 2;
    x = Math.max(margen, Math.min(x, window.innerWidth - ancho - margen));
    let y = r.bottom + 6;
    if (y + tip.offsetHeight > window.innerHeight - margen) y = r.top - tip.offsetHeight - 6;
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(margen, y)}px`;
  }

  function ocultar() {
    if (tip) tip.hidden = true;
    if (actual) actual.removeAttribute('aria-describedby');
    actual = null;
  }

  const sigla = (ev) => ev.target.closest && ev.target.closest('abbr.sigla');
  document.addEventListener('mouseover', (ev) => { const el = sigla(ev); if (el) mostrar(el); });
  document.addEventListener('mouseout', (ev) => { const el = sigla(ev); if (el && el === actual && !el.contains(ev.relatedTarget)) ocultar(); });
  document.addEventListener('focusin', (ev) => { const el = sigla(ev); if (el) mostrar(el); else ocultar(); });
  document.addEventListener('focusout', (ev) => { if (sigla(ev) === actual) ocultar(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') ocultar(); });
  window.addEventListener('scroll', ocultar, { passive: true });
  window.addEventListener('resize', ocultar);

  // ── Marcado de siglas en texto plano (preguntas del quiz) ────────────────────────────
  // Mismas reglas que scripts/revisar_texto.py: no dentro de otra palabra, y no cuando va
  // seguida de una palabra en mayúscula ("API Gateway", "RDS Proxy").
  let glosario = null;

  function cargarGlosario() {
    if (!glosario) {
      glosario = window.AwsDatos.json('data/siglas.json').then((d) => {
        const toks = Object.keys(d.siglas).sort((a, b) => b.length - a.length);
        const escRx = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const partes = toks.map((t) => `${escRx(t)}${d.sufijos[t] ? `(?:${d.sufijos[t]})?` : ''}`);
        const rx = new RegExp(`(?<![\\w/.-])(${partes.join('|')})(?![\\w/-])(?! [A-ZÁÉÍÓÚ])`, 'g');
        return { ...d, rx };
      });
    }
    return glosario;
  }

  function marcar(textoEscapado, idServicio, g) {
    return textoEscapado.replace(g.rx, (m) => {
      const tok = Object.keys(g.siglas).find((t) => m === t || m.startsWith(`${t} `));
      if (!tok) return m;
      const def = (g.porPagina[tok] && (g.porPagina[tok][idServicio] || g.porPagina[tok]['*'])) || g.siglas[tok];
      const datos = `data-s="${esc(tok)}"${def.en ? ` data-en="${esc(def.en)}"` : ''}${def.es ? ` data-es="${esc(def.es)}"` : ''}`;
      return `<abbr class="sigla" ${datos} tabindex="0">${m}</abbr>`;
    });
  }

  window.AwsSiglas = { cargarGlosario, marcar };
})();
