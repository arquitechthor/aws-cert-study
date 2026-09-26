/**
 * Portada: tarjetas de certificación y catálogo de servicios con filtros. El estado de los
 * filtros vive en la URL (?q=&cat=&estado=&cert=A,B) para poder compartir vistas filtradas.
 */
(function () {
  const { cargar, esc, url, urlServicio, iconoServicio, categoriaHtml, formatoFecha } = window.AwsDatos;

  const $ = (id) => document.getElementById(id);
  const el = {
    certGrid: $('cert-grid'),
    q: $('f-q'),
    cat: $('f-cat'),
    catIcono: $('f-cat-icono'),
    estado: $('f-estado'),
    cert: $('f-cert'),
    limpiar: $('f-limpiar'),
    resultados: $('resultados'),
    grid: $('service-grid'),
  };

  const ESTADO_CERT = {
    vigente: 'Vigente',
    retirandose: 'Se retira',
    'guia-pendiente': 'Guía pendiente',
  };

  const estado = { q: '', cat: '', estado: '', certs: new Set() };
  let datos = null;

  /** Minúsculas y sin tildes, para buscar "computacion" y encontrar "Computación". */
  function normalizar(texto) {
    return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /** Orden alfabético ignorando los prefijos "Amazon" / "AWS". */
  function claveOrden(nombre) {
    return normalizar(nombre.replace(/^(Amazon|AWS)\s+/, ''));
  }

  function textoBusqueda(s) {
    return normalizar([s.id, s.nombre, s.nombreCompleto, ...(s.alias || []), ...(s.incluye || [])].filter(Boolean).join(' '));
  }

  // ── Estado <-> URL ──────────────────────────────────────────
  function leerUrl() {
    const p = new URLSearchParams(location.search);
    estado.q = p.get('q') || '';
    estado.cat = p.get('cat') || '';
    estado.estado = p.get('estado') || '';
    estado.certs = new Set((p.get('cert') || '').split(',').filter(Boolean));
  }

  function escribirUrl() {
    const p = new URLSearchParams();
    if (estado.q) p.set('q', estado.q);
    if (estado.cat) p.set('cat', estado.cat);
    if (estado.estado) p.set('estado', estado.estado);
    if (estado.certs.size) p.set('cert', [...estado.certs].join(','));
    const q = p.toString();
    history.replaceState(null, '', `${location.pathname}${q ? `?${q}` : ''}${location.hash}`);
  }

  // ── Certificaciones ─────────────────────────────────────────
  function renderCertificaciones() {
    const cuenta = (codigo) => datos.servicios.filter((s) => s.certificaciones.includes(codigo)).length;
    el.certGrid.innerHTML = datos.certificaciones.map((c) => {
      let nota = '';
      if (c.estado === 'retirandose') nota = `Último día para presentarlo: ${formatoFecha(c.ultimoDia)}.`;
      if (c.estado === 'guia-pendiente') nota = `Guía oficial disponible a partir del ${formatoFecha(c.disponibleDesde)}.`;
      const n = cuenta(c.codigo);
      const meta = c.examen
        ? `${n} servicios · ${c.dominios.length} dominios · nota mínima ${c.examen.puntuacionMinima}/1000`
        : 'Servicios por definir cuando se publique la guía.';
      return `
        <article class="card cert-card">
          <div class="service-card-head">
            <span class="cert-code">${esc(c.codigo)}</span>
            <span class="badge badge-${esc(c.estado)}">${esc(ESTADO_CERT[c.estado] || c.estado)}</span>
          </div>
          <h3>${esc(c.nombreCorto)}</h3>
          <p class="cert-meta">${esc(c.nivel)} · ${esc(meta)}</p>
          ${nota ? `<p class="cert-meta">${esc(nota)}</p>` : ''}
          <div class="cert-actions">
            ${n ? `<button class="btn btn-secondary btn-sm" type="button" data-cert="${esc(c.codigo)}">Ver servicios</button>` : ''}
            <a class="btn btn-secondary btn-sm" href="${esc(c.guia)}" target="_blank" rel="noopener">Guía oficial ↗</a>
          </div>
        </article>`;
    }).join('');

    el.certGrid.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-cert]');
      if (!btn) return;
      estado.certs = new Set([btn.dataset.cert]);
      sincronizarControles();
      aplicar();
      document.getElementById('catalogo').scrollIntoView();
    });
  }

  // ── Controles de filtro ─────────────────────────────────────
  function renderControles() {
    const cats = [...datos.categorias].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    el.cat.insertAdjacentHTML('beforeend', cats.map((c) =>
      `<option value="${esc(c.id)}">${esc(c.nombre)} (${esc(c.nombreEn)})</option>`).join(''));

    el.cert.innerHTML = datos.certificaciones.map((c) =>
      `<button class="chip chip-cert" type="button" aria-pressed="false" data-cert="${esc(c.codigo)}" title="${esc(c.nombre)}">${esc(c.codigo)}</button>`).join('');

    el.q.addEventListener('input', () => { estado.q = el.q.value.trim(); aplicar(); });
    el.cat.addEventListener('change', () => { estado.cat = el.cat.value; sincronizarControles(); aplicar(); });
    el.estado.addEventListener('change', () => { estado.estado = el.estado.value; aplicar(); });
    el.cert.addEventListener('click', (ev) => {
      const chip = ev.target.closest('button[data-cert]');
      if (!chip) return;
      const c = chip.dataset.cert;
      if (estado.certs.has(c)) estado.certs.delete(c); else estado.certs.add(c);
      sincronizarControles();
      aplicar();
    });
    el.limpiar.addEventListener('click', () => {
      Object.assign(estado, { q: '', cat: '', estado: '', certs: new Set() });
      sincronizarControles();
      aplicar();
    });
  }

  function sincronizarControles() {
    el.q.value = estado.q;
    el.cat.value = datos.categoriaPorId.has(estado.cat) ? estado.cat : '';
    // Un <option> no admite imágenes: el icono de la categoría elegida se superpone al select.
    el.catIcono.hidden = !el.cat.value;
    if (el.cat.value) el.catIcono.src = url(`assets/iconos/categorias/${el.cat.value}.svg`);
    el.cat.classList.toggle('select-con-icono', Boolean(el.cat.value));
    el.estado.value = ['publicado', 'pendiente'].includes(estado.estado) ? estado.estado : '';
    for (const chip of el.cert.querySelectorAll('button[data-cert]')) {
      chip.setAttribute('aria-pressed', String(estado.certs.has(chip.dataset.cert)));
    }
  }

  // ── Filtrado y render ───────────────────────────────────────
  function filtrar() {
    const q = normalizar(estado.q);
    return datos.servicios.filter((s) => {
      if (q && !textoBusqueda(s).includes(q)) return false;
      if (estado.cat && s.categoria !== estado.cat && !(s.categoriasAdicionales || []).includes(estado.cat)) return false;
      if (estado.estado && s.estado !== estado.estado) return false;
      if (estado.certs.size && !s.certificaciones.some((c) => estado.certs.has(c))) return false;
      return true;
    }).sort((a, b) => claveOrden(a.nombre).localeCompare(claveOrden(b.nombre), 'es'));
  }

  function tarjeta(s) {
    const cat = datos.categoriaPorId.get(s.categoria);
    const publicado = s.estado === 'publicado';
    return `
      <a class="service-card" href="${esc(urlServicio(s))}">
        <div class="service-card-head">
          <div class="service-card-title">${iconoServicio(s, cat)}<h3>${esc(s.nombre)}</h3></div>
          <span class="badge badge-${publicado ? 'publicado' : 'pendiente'}">${publicado ? 'Disponible' : 'Próximamente'}</span>
        </div>
        <p class="service-cat cat-link">${categoriaHtml(cat)}</p>
        ${s.resumen ? `<p class="service-resumen">${esc(s.resumen)}</p>` : ''}
        <div class="chips">${s.certificaciones.map((c) => `<span class="chip chip-cert">${esc(c)}</span>`).join('')}</div>
      </a>`;
  }

  function aplicar() {
    escribirUrl();
    const lista = filtrar();
    const total = datos.servicios.length;
    const publicados = lista.filter((s) => s.estado === 'publicado').length;
    el.resultados.textContent = `${lista.length} de ${total} servicios · ${publicados} con contenido`;

    if (lista.length) {
      el.grid.innerHTML = lista.map(tarjeta).join('');
      return;
    }
    const pendiente = [...estado.certs].map((c) => datos.certPorCodigo.get(c)).find((c) => c && c.estado === 'guia-pendiente');
    el.grid.innerHTML = `<p class="empty-state">${pendiente
      ? `La lista de servicios de ${esc(pendiente.codigo)} se añadirá cuando AWS publique su guía (a partir del ${esc(formatoFecha(pendiente.disponibleDesde))}).`
      : 'No hay servicios que coincidan con estos filtros.'}</p>`;
  }

  // ── Arranque ────────────────────────────────────────────────
  cargar().then((d) => {
    datos = d;
    leerUrl();
    renderCertificaciones();
    renderControles();
    sincronizarControles();
    aplicar();
  }).catch((err) => {
    console.error(err);
    const msg = '<p class="empty-state">No se pudo cargar el catálogo. Si abriste el archivo directamente, sírvelo con <code>npx serve .</code> o <code>python -m http.server</code>.</p>';
    el.certGrid.innerHTML = '';
    el.grid.innerHTML = msg;
  });
})();
