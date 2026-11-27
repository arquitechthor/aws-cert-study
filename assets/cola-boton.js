/**
 * Botón "Añadir a la cola" de cada guía (servicios/<id>.html). Guarda el servicio al final de la cola
 * de estudio (apuntes-aws.cola, ver AwsDatos.ponerEnCola) o lo quita; cuando ya está, dice su posición.
 * La cola se ve en cola.html (menú Mi estudio › Cola). Va en la misma fila que "Escuchar la guía"
 * (assets/lectura.js, que se carga antes); si no la hay (navegador sin voz), crea su propia fila.
 */
(function () {
  const D = window.AwsDatos;
  const cab = document.querySelector('.service-head');
  const m = location.pathname.match(/\/servicios\/([^/]+)\.html$/);
  if (!D || !cab || !m) return;
  const id = decodeURIComponent(m[1]);

  let fila = cab.querySelector('.lectura-accion');
  if (!fila) {
    fila = document.createElement('div');
    fila.className = 'meta-row lectura-accion';
    cab.appendChild(fila);
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-secondary btn-sm btn-cola';
  fila.appendChild(btn);

  function pintar() {
    const pos = D.posicionEnCola(id);
    btn.classList.toggle('en-cola', pos > 0);
    btn.setAttribute('aria-pressed', String(pos > 0));
    if (pos) {
      btn.innerHTML = `<span aria-hidden="true">✓</span> En la cola (n.º ${pos})`;
      btn.title = 'Pulsa para quitarlo de tu cola de estudio';
    } else {
      btn.innerHTML = '<span aria-hidden="true">＋</span> Añadir a la cola';
      btn.title = 'Lo guarda al final de tu cola de estudio (Mi estudio › Cola)';
    }
  }

  btn.addEventListener('click', () => {
    D.ponerEnCola(id, !D.posicionEnCola(id));
    pintar();
  });
  // Lo que llega de la cuenta Kopi o de otra pestaña puede mover la posición.
  document.addEventListener('aws:sincronizado', pintar);
  window.addEventListener('storage', (ev) => { if (ev.key === D.claveCola) pintar(); });
  pintar();
})();
