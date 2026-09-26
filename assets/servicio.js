/**
 * Página genérica "Próximamente disponible" (servicio.html?id=<id>). Muestra los datos del
 * catálogo del servicio mientras no tiene página propia; si ya está publicado, redirige a ella.
 */
(function () {
  const { cargar, esc, urlServicio, iconoServicio, categoriaHtml, urlCatalogo, urlDocumentacion } = window.AwsDatos;
  const cont = document.getElementById('servicio');
  const id = new URLSearchParams(location.search).get('id') || '';

  function noEncontrado() {
    cont.innerHTML = `
      <div class="coming-soon">
        <div class="coming-icon" aria-hidden="true">🔎</div>
        <h1>Servicio no encontrado</h1>
        <p>No hay ningún servicio con el identificador <code>${esc(id || '(vacío)')}</code> en el catálogo.</p>
        <a class="btn btn-primary" href="index.html#catalogo">Ir al catálogo</a>
      </div>`;
  }

  cargar().then((d) => {
    const s = d.servicioPorId.get(id);
    if (!s) return noEncontrado();
    if (s.estado === 'publicado') {
      location.replace(urlServicio(s));
      return;
    }

    document.title = `${s.nombre} — Próximamente — Apuntes AWS`;
    const cat = d.categoriaPorId.get(s.categoria);
    const adicionales = (s.categoriasAdicionales || []).map((c) => d.categoriaPorId.get(c)).filter(Boolean);
    const certs = s.certificaciones.map((c) => d.certPorCodigo.get(c)).filter(Boolean);

    cont.innerHTML = `
      <div class="service-head">
        <h1 class="service-title">${iconoServicio(s, cat, 'service-icon-lg')}<span>${esc(s.nombre)}</span></h1>
        ${s.nombreCompleto ? `<p class="full-name">${esc(s.nombreCompleto)}</p>` : ''}
        <div class="meta-row">
          <span><strong>Categoría:</strong>
            <a class="cat-link" href="${esc(urlCatalogo({ cat: s.categoria }))}">${categoriaHtml(cat)}</a></span>
          ${adicionales.length ? `<span><strong>También en:</strong> ${adicionales.map((c) =>
            `<a class="cat-link" href="${esc(urlCatalogo({ cat: c.id }))}">${categoriaHtml(c)}</a>`).join(', ')}</span>` : ''}
        </div>
        <div class="meta-row">
          <strong>Certificaciones:</strong>
          <span class="chips">${certs.map((c) =>
            `<a class="chip chip-cert" href="${esc(urlCatalogo({ cert: c.codigo }))}" title="${esc(c.nombre)}">${esc(c.codigo)}</a>`).join('')}</span>
        </div>
        <div class="meta-row">
          <strong>Documentación oficial:</strong>
          <a href="${esc(urlDocumentacion(s))}" target="_blank" rel="noopener">${s.documentacion
            ? `Documentación de ${esc(s.nombre)} ↗` : 'Buscar en la documentación de AWS ↗'}</a>
        </div>
        ${s.incluye && s.incluye.length ? `<div class="meta-row"><strong>Incluye:</strong> ${s.incluye.map(esc).join(', ')}</div>` : ''}
      </div>

      <div class="coming-soon">
        <div class="coming-icon" aria-hidden="true">🚧</div>
        <h2>Próximamente disponible</h2>
        <p>Los apuntes y las preguntas de práctica de ${esc(s.nombre)} todavía se están preparando.
          Mientras tanto, puedes consultar la documentación oficial de AWS.</p>
        <a class="btn btn-secondary" href="${esc(urlDocumentacion(s))}" target="_blank" rel="noopener">${s.documentacion
          ? 'Ir a la documentación oficial ↗' : 'Buscar en la documentación de AWS ↗'}</a>
      </div>`;
  }).catch((err) => {
    console.error(err);
    cont.innerHTML = '<p class="empty-state">No se pudo cargar el catálogo.</p>';
  });
})();
