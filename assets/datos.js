/**
 * Carga compartida del catálogo (servicios, categorías y certificaciones) y utilidades comunes.
 * Las rutas se resuelven respecto a la raíz del sitio, calculada a partir de la URL de este
 * mismo script, así que funciona igual desde index.html que desde servicios/<id>.html y bajo
 * el subdirectorio de GitHub Pages (/aws-cert-study/).
 */
(function () {
  const RAIZ = new URL('../', document.currentScript.src);

  let cache = null;

  function url(ruta) {
    return new URL(ruta, RAIZ).href;
  }

  async function json(ruta) {
    const res = await fetch(url(ruta), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${ruta}: HTTP ${res.status}`);
    return res.json();
  }

  function cargar() {
    if (!cache) {
      cache = Promise.all([
        json('data/servicios.json'),
        json('data/categorias.json'),
        json('data/certificaciones.json'),
      ]).then(([servicios, categorias, certificaciones]) => ({
        servicios,
        categorias,
        certificaciones,
        servicioPorId: new Map(servicios.map((s) => [s.id, s])),
        categoriaPorId: new Map(categorias.map((c) => [c.id, c])),
        certPorCodigo: new Map(certificaciones.map((c) => [c.codigo, c])),
      }));
    }
    return cache;
  }

  function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /** Enlace a la página del servicio: la definitiva si está publicado, la genérica si no. */
  function urlServicio(servicio) {
    return servicio.estado === 'publicado'
      ? url(`servicios/${encodeURIComponent(servicio.id)}.html`)
      : url(`servicio.html?id=${encodeURIComponent(servicio.id)}`);
  }

  /**
   * Iconos oficiales de AWS (assets/iconos/), sin modificar. Son decorativos (alt vacío):
   * el nombre del servicio o de la categoría siempre va al lado.
   */
  function iconoCategoria(categoria, clase = 'cat-icon') {
    if (!categoria) return '';
    return `<img class="${clase}" src="${esc(url(`assets/iconos/categorias/${categoria.id}.svg`))}" alt="" loading="lazy">`;
  }

  /** Icono del servicio; si AWS no publica uno propio, el de su categoría. */
  function iconoServicio(servicio, categoria, clase = 'service-icon') {
    if (!servicio.icono) return iconoCategoria(categoria, clase);
    return `<img class="${clase}" src="${esc(url(`assets/iconos/servicios/${servicio.id}.svg`))}" alt="" loading="lazy">`;
  }

  /** "Computación (Compute)" en HTML, con su icono y el nombre en inglés atenuado. */
  function categoriaHtml(categoria) {
    if (!categoria) return '';
    return `${iconoCategoria(categoria)}${esc(categoria.nombre)} <span class="cat-en">(${esc(categoria.nombreEn)})</span>`;
  }

  /** Documentación oficial del servicio; si no hay (servicio retirado), búsqueda en la de AWS. */
  function urlDocumentacion(servicio) {
    return servicio.documentacion
      || `https://docs.aws.amazon.com/search/doc-search.html?searchQuery=${encodeURIComponent(servicio.nombre)}`;
  }

  /**
   * Progreso de estudio, solo en el localStorage del navegador (ver aviso legal, privacidad):
   * { "<idServicio>": { "aciertos": ["<idPregunta>", …], "total": 12, "finalizado": "2026-09-26" } }.
   * Un servicio está finalizado cuando se han acertado todas sus preguntas al menos una vez.
   */
  const CLAVE_PROGRESO = 'apuntes-aws.progreso';

  function leerProgreso() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE_PROGRESO) || '{}');
      return datos && typeof datos === 'object' ? datos : {};
    } catch {
      return {};
    }
  }

  function guardarProgreso(id, entrada) {
    const todo = leerProgreso();
    if (entrada) todo[id] = entrada; else delete todo[id];
    try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(todo)); } catch { /* sin almacenamiento: no se guarda */ }
  }

  function estaFinalizado(id, progreso = leerProgreso()) {
    return Boolean(progreso[id] && progreso[id].finalizado);
  }

  function urlCatalogo(params) {
    const q = new URLSearchParams(params).toString();
    return url(`index.html${q ? `?${q}` : ''}#catalogo`);
  }

  function formatoFecha(iso) {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }

  window.AwsDatos = { url, json, cargar, esc, urlServicio, iconoServicio, iconoCategoria, categoriaHtml, urlCatalogo, urlDocumentacion,
    leerProgreso, guardarProgreso, estaFinalizado, formatoFecha };
})();
