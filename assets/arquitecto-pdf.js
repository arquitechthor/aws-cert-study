/**
 * PDF de la solución de un escenario del juego Arquitecto, en una sola hoja A4 apaisada:
 * cabecera con el logo y el título, el caso y los requisitos, el diagrama resuelto (iconos
 * oficiales de AWS sin modificar) y la explicación de cada hueco. Lo genera el propio navegador
 * con jsPDF (copia local en assets/vendor/, sin peticiones a terceros), así que sale igual en
 * cualquier navegador. Si un texto no cabe, la letra se reduce hasta MIN_ESCALA; los topes de
 * longitud de scripts/revisar_escenarios.py garantizan que con esa escala siempre quepa.
 * Uso: AwsArquitectoPdf.descargar(escenario, datos) desde arquitecto.js.
 */
(function () {
  const { url } = window.AwsDatos;

  // Medidas en mm (A4 apaisada: 297 × 210).
  const ANCHO = 297;
  const M = 10;
  const PIE_Y = 199;
  const CUERPO_Y = 30;
  // Columna del caso más estrecha con 5 columnas de diagrama, para que los nodos no se apelotonen.
  const IZQ_ANCHO = { normal: 86, estrecha: 64 };
  const FILA_ALTO = 23;
  const NODO_ALTO = 16;
  const NODO_ANCHO_MAX = 40;
  const EXP_COLS = 3;
  const EXP_HUECO = 6;
  const MIN_ESCALA = 0.8;
  const PT = 0.3528; // mm por punto tipográfico

  const COLOR = {
    texto: [17, 24, 39],
    gris: [75, 85, 99],
    tenue: [120, 128, 145],
    borde: [190, 196, 208],
    violeta: [124, 58, 237],
    violetaFondo: [245, 240, 255],
    cian: [8, 145, 178],
    magenta: [225, 29, 72],
  };

  // ── Carga de jsPDF e imágenes ───────────────────────────────
  let jspdfPromesa = null;
  function cargarJsPdf() {
    if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
    if (!jspdfPromesa) {
      jspdfPromesa = new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = url('assets/vendor/jspdf.umd.min.js');
        s.onload = () => ok(window.jspdf.jsPDF);
        s.onerror = () => { jspdfPromesa = null; ko(new Error('No se pudo cargar jsPDF')); };
        document.head.appendChild(s);
      });
    }
    return jspdfPromesa;
  }

  const imagenes = new Map();
  /** SVG o PNG del sitio rasterizado a PNG (los SVG de AWS no se pueden incrustar tal cual). */
  function imagen(ruta, px) {
    if (!imagenes.has(ruta)) {
      imagenes.set(ruta, new Promise((ok, ko) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = px;
          c.height = px;
          c.getContext('2d').drawImage(img, 0, 0, px, px);
          ok(c.toDataURL('image/png'));
        };
        img.onerror = () => ko(new Error(`No se pudo cargar ${ruta}`));
        img.src = url(ruta);
      }));
    }
    return imagenes.get(ruta);
  }

  const rutaIcono = (s) => (s.icono ? `assets/iconos/servicios/${s.id}.svg` : `assets/iconos/categorias/${s.categoria}.svg`);

  /** Las fuentes estándar de PDF solo cubren Latin-1: se sustituye lo que no imprimirían. */
  const plano = (t) => String(t ?? '')
    .replace(/…/g, '...').replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-').replace(/→/g, '->').replace(/[^\x00-\xff]/g, '');

  // ── Utilidades de dibujo ────────────────────────────────────
  function fuente(doc, tam, estilo = 'normal', color = COLOR.texto) {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tam);
    doc.setTextColor(...color);
  }

  const lineas = (doc, t, ancho) => doc.splitTextToSize(plano(t), ancho);
  const altoLinea = (tam) => tam * PT * 1.25;

  function borde(r, dx, dy, margen) {
    const hw = r.w / 2 + margen;
    const hh = r.h / 2 + margen;
    const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return [r.cx + dx * t, r.cy + dy * t];
  }

  /** Parte un texto en líneas de como mucho `max` mm, solo por los espacios (nunca dentro de una palabra). */
  function partir(doc, t, max) {
    const ls = [];
    for (const p of t.split(' ')) {
      const ult = ls.length ? `${ls[ls.length - 1]} ${p}` : null;
      if (ult && doc.getTextWidth(ult) <= max) ls[ls.length - 1] = ult;
      else ls.push(p);
    }
    return ls;
  }

  function numero(doc, n, x, y, r = 2.2) {
    doc.setFillColor(...COLOR.violeta);
    doc.circle(x, y, r, 'F');
    fuente(doc, 7, 'bold', [255, 255, 255]);
    doc.text(String(n), x, y + 0.05, { align: 'center', baseline: 'middle' });
  }

  // ── Maquetación (sin dibujar: mide para elegir la escala) ───
  function geometria(e) {
    const cols = Math.max(...e.nodos.map((n) => n.col));
    const filas = Math.max(...e.nodos.map((n) => n.fila));
    const izq = cols >= 5 ? IZQ_ANCHO.estrecha : IZQ_ANCHO.normal;
    const diagX = M + izq + 8;
    return { cols, filas, izq, diagX, diagAncho: ANCHO - M - diagX };
  }

  function medirIzquierda(doc, e, g, k) {
    let alto = 0;
    fuente(doc, 9 * k);
    alto += 4 + lineas(doc, e.enunciado, g.izq).length * altoLinea(9 * k);
    if (e.requisitos && e.requisitos.length) {
      alto += 3 + 4;
      fuente(doc, 8.5 * k);
      for (const r of e.requisitos) alto += lineas(doc, r, g.izq - 4).length * altoLinea(8.5 * k) + 1.2;
    }
    return alto;
  }

  function itemsExplicacion(doc, e, servicio, k, ancho) {
    return e.nodos.filter((n) => n.hueco).map((n, i) => {
      const h = n.hueco;
      const s = servicio(h.validos[0]);
      fuente(doc, 8 * k);
      const exp = lineas(doc, h.explicacion, ancho);
      const otros = h.validos.slice(1).map((id) => servicio(id).nombre);
      fuente(doc, 7.5 * k, 'italic');
      const tambien = otros.length ? lineas(doc, `También vale: ${otros.join(', ')}.`, ancho) : [];
      const alto = 5 + exp.length * altoLinea(8 * k) + tambien.length * altoLinea(7.5 * k);
      return { num: i + 1, s, exp, tambien, alto };
    });
  }

  /** Reparte los items en columnas (en orden) sin pasar de altoCol; null si no caben. */
  function repartir(items, altoCol) {
    const cols = [[]];
    let usado = 0;
    for (const it of items) {
      if (it.alto > altoCol) return null;
      if (usado + it.alto > altoCol) {
        if (cols.length === EXP_COLS) return null;
        cols.push([]);
        usado = 0;
      }
      cols[cols.length - 1].push(it);
      usado += it.alto + EXP_HUECO;
    }
    return cols;
  }

  /** La menor altura de columna con la que caben (columnas equilibradas). */
  function equilibrar(items, disponible) {
    if (!repartir(items, disponible)) return null;
    let lo = 0;
    let hi = disponible;
    while (hi - lo > 0.5) {
      const mid = (lo + hi) / 2;
      if (repartir(items, mid)) hi = mid; else lo = mid;
    }
    return repartir(items, hi);
  }

  function maquetar(doc, e, g, servicio) {
    const altoDiag = g.filas * FILA_ALTO;
    const anchoCol = (ANCHO - 2 * M - (EXP_COLS - 1) * 8) / EXP_COLS;
    for (let k = 1; k >= MIN_ESCALA - 1e-9; k -= 0.05) {
      const arriba = Math.max(medirIzquierda(doc, e, g, k), altoDiag);
      const expY = CUERPO_Y + arriba + 8;
      const items = itemsExplicacion(doc, e, servicio, k, anchoCol - 6);
      const cols = equilibrar(items, PIE_Y - 4 - (expY + 5));
      if (cols) return { k, altoDiag, expY, cols, anchoCol, cabe: true };
    }
    return { cabe: false };
  }

  // ── Dibujo ──────────────────────────────────────────────────
  function cabecera(doc, e, logo) {
    doc.addImage(logo, 'PNG', M, M, 14, 14);
    fuente(doc, 7.5, 'bold', COLOR.violeta);
    doc.text('APUNTES AWS  ·  JUEGO ARQUITECTO  ·  SOLUCIÓN', M + 18, M + 4);
    fuente(doc, 15, 'bold');
    doc.text(plano(e.titulo), M + 18, M + 11.5);
    fuente(doc, 8, 'normal', COLOR.gris);
    doc.text(plano([`Nivel ${e.nivel}`, ...e.certificaciones, ...(e.kopi ? ['Usado en Kopi'] : [])].join('  ·  ')),
      ANCHO - M, M + 4, { align: 'right' });
    // Línea con los tres colores de la marca.
    const tramo = (ANCHO - 2 * M) / 3;
    doc.setLineWidth(0.8);
    [COLOR.cian, COLOR.violeta, COLOR.magenta].forEach((c, i) => {
      doc.setDrawColor(...c);
      doc.line(M + i * tramo, M + 16, M + (i + 1) * tramo, M + 16);
    });
  }

  function titulo(doc, t, x, y) {
    fuente(doc, 7.5, 'bold', COLOR.violeta);
    doc.text(t, x, y);
  }

  function izquierda(doc, e, g, k) {
    let y = CUERPO_Y;
    titulo(doc, 'EL CASO', M, y);
    y += 4;
    fuente(doc, 9 * k);
    const enun = lineas(doc, e.enunciado, g.izq);
    doc.text(enun, M, y, { baseline: 'top', lineHeightFactor: 1.25 });
    y += enun.length * altoLinea(9 * k) + 3;
    if (!e.requisitos || !e.requisitos.length) return;
    titulo(doc, 'REQUISITOS', M, y + 2.5);
    y += 4;
    fuente(doc, 8.5 * k, 'normal', COLOR.gris);
    for (const r of e.requisitos) {
      const ls = lineas(doc, r, g.izq - 4);
      doc.setFillColor(...COLOR.violeta);
      doc.circle(M + 1, y + altoLinea(8.5 * k) / 2, 0.6, 'F');
      doc.text(ls, M + 4, y, { baseline: 'top', lineHeightFactor: 1.25 });
      y += ls.length * altoLinea(8.5 * k) + 1.2;
    }
  }

  function diagrama(doc, e, g, servicio, iconos) {
    const anchoCelda = g.diagAncho / g.cols;
    // Separación entre columnas: la que pida la etiqueta más ancha de una flecha horizontal entre
    // vecinos, con tope; una etiqueta que aun así no quepa se parte en dos líneas.
    const pos = new Map(e.nodos.map((n) => [n.id, n]));
    fuente(doc, 6);
    const etiquetaMax = Math.max(0, ...e.flechas
      .filter((f) => f.texto && pos.get(f.de).fila === pos.get(f.a).fila && Math.abs(pos.get(f.de).col - pos.get(f.a).col) === 1)
      .map((f) => doc.getTextWidth(plano(f.texto)) + 6));
    const ancho = Math.min(anchoCelda - Math.min(Math.max(9, etiquetaMax), 12), NODO_ANCHO_MAX);
    const estrecho = ancho < 32;
    const tn = estrecho ? 6.5 : 7; // nombre del servicio
    const ts = estrecho ? 5.5 : 6; // texto bajo el nombre
    const caja = new Map(e.nodos.map((n) => {
      const cx = g.diagX + (n.col - 0.5) * anchoCelda;
      const cy = CUERPO_Y - 3 + (n.fila - 0.5) * FILA_ALTO;
      return [n.id, { cx, cy, w: ancho, h: NODO_ALTO, x: cx - ancho / 2, y: cy - NODO_ALTO / 2 }];
    }));

    // Flechas debajo de los nodos.
    const etiquetas = [];
    for (const f of e.flechas) {
      const a = caja.get(f.de);
      const b = caja.get(f.a);
      const dx = b.cx - a.cx;
      const dy = b.cy - a.cy;
      const [x1, y1] = borde(a, dx, dy, 0.8);
      const [x2, y2] = borde(b, -dx, -dy, 1);
      doc.setDrawColor(...COLOR.tenue);
      doc.setLineWidth(0.3);
      doc.line(x1, y1, x2, y2);
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const p = 2;
      doc.setFillColor(...COLOR.tenue);
      doc.triangle(x2, y2,
        x2 - p * Math.cos(ang - 0.4), y2 - p * Math.sin(ang - 0.4),
        x2 - p * Math.cos(ang + 0.4), y2 - p * Math.sin(ang + 0.4), 'F');
      if (f.texto) {
        const horizontal = Math.abs(dx) >= Math.abs(dy);
        etiquetas.push({ t: plano(f.texto), x: (x1 + x2) / 2, y: (y1 + y2) / 2, horizontal, max: horizontal ? Math.abs(x2 - x1) : Infinity });
      }
    }
    // Etiquetas como en la web: encima de las flechas horizontales y a la derecha de las verticales,
    // sobre fondo blanco por si cruzan otra línea. Si no caben a lo ancho, se parten por los espacios.
    fuente(doc, 6, 'normal', COLOR.gris);
    const lh = altoLinea(6);
    for (const { t, x, y, horizontal, max } of etiquetas) {
      const ls = partir(doc, t, max);
      const w = Math.max(...ls.map((l) => doc.getTextWidth(l)));
      const h = ls.length * lh;
      const x0 = horizontal ? x - w / 2 : x + 1.2;
      const y0 = horizontal ? y - 0.8 - h : y - h / 2;
      doc.setFillColor(255, 255, 255); // jsPDF reutiliza el color de relleno para el texto
      doc.rect(x0 - 0.5, y0, w + 1, h, 'F');
      doc.text(ls, horizontal ? x : x0, y0, { align: horizontal ? 'center' : 'left', baseline: 'top', lineHeightFactor: 1.25 });
    }

    let num = 0;
    for (const n of e.nodos) {
      const r = caja.get(n.id);
      const id = n.hueco ? n.hueco.validos[0] : n.servicio;
      const s = id && servicio(id);
      if (n.hueco) {
        doc.setFillColor(...COLOR.violetaFondo);
        doc.setDrawColor(...COLOR.violeta);
        doc.setLineWidth(0.5);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...COLOR.borde);
        doc.setLineWidth(0.3);
        if (!s) doc.setLineDashPattern([1, 0.8], 0);
      }
      doc.roundedRect(r.x, r.y, r.w, r.h, 1.5, 1.5, 'FD');
      doc.setLineDashPattern([], 0);

      if (s) {
        const ic = estrecho ? 6 : 8;
        const pad = estrecho ? 1.5 : 2;
        doc.addImage(iconos.get(s.id), 'PNG', r.x + pad, r.cy - ic / 2, ic, ic);
        const tx = r.x + pad + ic + pad;
        const tw = r.x + r.w - 1.2 - tx;
        fuente(doc, tn, 'bold');
        const nom = lineas(doc, s.nombre, tw).slice(0, 3);
        fuente(doc, ts, 'normal');
        const extra = n.texto && !n.hueco ? lineas(doc, n.texto, tw).slice(0, 4 - Math.min(nom.length, 2)) : [];
        const total = nom.length * altoLinea(tn) + extra.length * altoLinea(ts);
        let y = r.cy - total / 2;
        fuente(doc, tn, 'bold');
        doc.text(nom, tx, y, { baseline: 'top', lineHeightFactor: 1.25 });
        y += nom.length * altoLinea(tn);
        if (extra.length) {
          fuente(doc, ts, 'normal', COLOR.gris);
          doc.text(extra, tx, y, { baseline: 'top', lineHeightFactor: 1.25 });
        }
      } else {
        fuente(doc, tn, 'normal', COLOR.gris);
        const ls = lineas(doc, n.texto, r.w - 4).slice(0, 4);
        doc.text(ls, r.cx, r.cy - (ls.length * altoLinea(tn)) / 2, { align: 'center', baseline: 'top', lineHeightFactor: 1.25 });
      }
      if (n.hueco) numero(doc, ++num, r.x, r.y);
    }
  }

  function explicaciones(doc, m) {
    titulo(doc, 'LA SOLUCIÓN, HUECO A HUECO', M, m.expY);
    m.cols.forEach((col, c) => {
      const x = M + c * (m.anchoCol + 8);
      let y = m.expY + 5;
      for (const it of col) {
        numero(doc, it.num, x + 2.2, y + 1.6);
        fuente(doc, 8.5 * m.k, 'bold');
        doc.text(plano(it.s.nombre), x + 6, y + 1.6, { baseline: 'middle' });
        let yy = y + 4.6;
        fuente(doc, 8 * m.k, 'normal', COLOR.texto);
        doc.text(it.exp, x + 6, yy, { baseline: 'top', lineHeightFactor: 1.25 });
        yy += it.exp.length * altoLinea(8 * m.k);
        if (it.tambien.length) {
          fuente(doc, 7.5 * m.k, 'italic', COLOR.gris);
          doc.text(it.tambien, x + 6, yy, { baseline: 'top', lineHeightFactor: 1.25 });
        }
        y += it.alto + EXP_HUECO;
      }
    });
  }

  function pie(doc, e) {
    doc.setDrawColor(...COLOR.borde);
    doc.setLineWidth(0.2);
    doc.line(M, PIE_Y, ANCHO - M, PIE_Y);
    const enlace = `https://arquitechthor.github.io/aws-cert-study/arquitecto.html?escenario=${encodeURIComponent(e.id)}`;
    fuente(doc, 6.5, 'normal', COLOR.cian);
    doc.textWithLink(enlace.replace('https://', ''), M, PIE_Y + 3.5, { url: enlace });
    fuente(doc, 6, 'normal', COLOR.tenue);
    doc.text('© 2026 Héctor Guzmán · Contenido original bajo CC BY-SA 4.0 (los iconos de AWS quedan fuera de esta licencia)',
      ANCHO - M, PIE_Y + 3.5, { align: 'right' });
    doc.text(plano('Proyecto personal y educativo, sin afiliación, patrocinio ni respaldo de Amazon Web Services, Inc. ni de Amazon.com, Inc. '
      + 'Amazon Web Services, AWS, los nombres de sus servicios y sus iconos son marcas de Amazon.com, Inc. o sus filiales.'),
    M, PIE_Y + 7);
  }

  // ── API ─────────────────────────────────────────────────────
  async function crear(e, datos) {
    const servicio = (id) => datos.servicioPorId.get(id);
    const usados = [...new Set(e.nodos.map((n) => (n.hueco ? n.hueco.validos[0] : n.servicio)).filter(Boolean))].map(servicio);
    const [JsPDF, logo, ...pngs] = await Promise.all([
      cargarJsPdf(),
      imagen('assets/logo.png', 256),
      ...usados.map((s) => imagen(rutaIcono(s), 128)),
    ]);
    const iconos = new Map(usados.map((s, i) => [s.id, pngs[i]]));

    const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    const g = geometria(e);
    const m = maquetar(doc, e, g, servicio);
    if (!m.cabe) throw new Error(`El escenario ${e.id} no cabe en una hoja A4`);
    doc.setProperties({
      title: `${plano(e.titulo)} - Arquitecto - Apuntes AWS`,
      subject: 'Solución de un escenario del juego Arquitecto',
      author: 'Héctor Guzmán',
      creator: 'Apuntes AWS (arquitechthor.github.io/aws-cert-study)',
    });
    cabecera(doc, e, logo);
    izquierda(doc, e, g, m.k);
    diagrama(doc, e, g, servicio, iconos);
    explicaciones(doc, m);
    pie(doc, e);
    return { doc, escala: m.k };
  }

  async function descargar(e, datos) {
    const { doc } = await crear(e, datos);
    doc.save(`arquitecto-${e.id}.pdf`);
  }

  window.AwsArquitectoPdf = { crear, descargar };
})();
