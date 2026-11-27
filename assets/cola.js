/**
 * Mi cola de estudio (cola.html, menú Mi estudio › Cola): los servicios apuntados con "Añadir a la
 * cola" (assets/cola-boton.js), guardados en apuntes-aws.cola (ver AwsDatos.leerCola), del primero
 * que se añadió al último. Cada uno dice cuándo se añadió y cómo va su cuestionario
 * (apuntes-aws.progreso); "Quitar" lo saca de la cola. Se repinta si la cuenta Kopi trae cambios de
 * otro dispositivo (aws:sincronizado) o si otra pestaña cambia la cola.
 */
(async function () {
  const D = window.AwsDatos;
  const cont = document.getElementById('cola-contenido');
  if (!cont) return;

  let datos;
  try {
    datos = await D.cargar();
  } catch (e) {
    console.error(e);
    cont.innerHTML = '<p class="callout">No se ha podido cargar el catálogo. Prueba a recargar la página.</p>';
    return;
  }

  /** "dd/mm/aaaa" en hora local (el ISO guardado va en UTC). */
  function fechaAnadida(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function estadoCuestionario(id, progreso) {
    const p = progreso[id];
    if (p && p.finalizado) return `<span class="badge badge-finalizado">Finalizado el ${D.esc(D.formatoFecha(p.finalizado))}</span>`;
    const aciertos = p && p.total ? Math.min(p.total, new Set(p.aciertos || []).size) : 0;
    if (aciertos) return `Cuestionario: ${aciertos} de ${p.total} acertadas`;
    return 'Cuestionario sin empezar';
  }

  function pintar() {
    const cola = D.leerCola();
    const ids = D.ordenCola(cola);
    if (!ids.length) {
      cont.innerHTML = `<div class="callout cola-vacia">
        <p><strong>Tu cola está vacía.</strong> En la cabecera de cada guía tienes el botón
          «<span aria-hidden="true">＋</span> Añadir a la cola»: lo que añadas aparece aquí, en el orden en que lo añadiste.</p>
        <p><a class="btn btn-primary btn-sm" href="${D.esc(D.urlCatalogo({}))}">Ir al catálogo</a></p>
      </div>`;
      return;
    }
    const progreso = D.leerProgreso();
    const items = ids.map((id, i) => {
      const s = datos.servicioPorId.get(id);
      const quitar = `<button type="button" class="btn btn-secondary btn-sm" data-quitar="${D.esc(id)}">Quitar<span class="visually-hidden"> ${D.esc(s ? s.nombre : id)} de la cola</span></button>`;
      if (!s) {
        return `<li class="cola-item cola-item-perdida">
          <div class="cola-cuerpo"><p class="cola-nombre">${D.esc(id)}</p>
            <p class="cola-meta">Este servicio ya no está en el catálogo.</p></div>
          <div class="cola-acciones">${quitar}</div>
        </li>`;
      }
      const cat = datos.categoriaPorId.get(s.categoria);
      return `<li class="cola-item${i === 0 ? ' cola-siguiente' : ''}">
        <div class="cola-cuerpo">
          ${i === 0 ? '<p class="cola-etiqueta">Siguiente</p>' : ''}
          <p class="cola-nombre">${D.iconoServicio(s, cat)}<a href="${D.esc(D.urlServicio(s))}">${D.esc(s.nombre)}</a></p>
          ${s.frase ? `<p class="cola-frase">${D.esc(s.frase)}</p>` : ''}
          <p class="cola-meta">${cat ? `${D.esc(cat.nombre)} · ` : ''}Añadido el ${D.esc(fechaAnadida(cola[id]))} · ${estadoCuestionario(id, progreso)}</p>
        </div>
        <div class="cola-acciones">${quitar}</div>
      </li>`;
    });
    cont.innerHTML = `<p class="cola-resumen">${ids.length === 1 ? '1 servicio' : `${ids.length} servicios`} en la cola.</p>
      <ol class="cola-lista">${items.join('')}</ol>`;
  }

  cont.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-quitar]');
    if (!btn) return;
    const i = [...cont.querySelectorAll('[data-quitar]')].indexOf(btn);
    D.ponerEnCola(btn.dataset.quitar, false);
    pintar();
    // El foco pasa al siguiente "Quitar" (o al anterior si era el último), para no perderlo.
    const resto = [...cont.querySelectorAll('[data-quitar]')];
    (resto[Math.min(i, resto.length - 1)] || cont.querySelector('a, button'))?.focus();
  });

  document.addEventListener('aws:sincronizado', pintar);
  window.addEventListener('storage', (ev) => { if (ev.key === D.claveCola || ev.key === 'apuntes-aws.progreso') pintar(); });
  pintar();
})();
