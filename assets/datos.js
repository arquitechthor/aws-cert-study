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

  /** "Computación (Compute)" en HTML, con el nombre en inglés atenuado. */
  function categoriaHtml(categoria) {
    if (!categoria) return '';
    return `${esc(categoria.nombre)} <span class="cat-en">(${esc(categoria.nombreEn)})</span>`;
  }

  function urlCatalogo(params) {
    const q = new URLSearchParams(params).toString();
    return url(`index.html${q ? `?${q}` : ''}#catalogo`);
  }

  function formatoFecha(iso) {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }

  window.AwsDatos = { url, json, cargar, esc, urlServicio, categoriaHtml, urlCatalogo, formatoFecha };
})();
