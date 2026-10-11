/**
 * Clasificación de los juegos (clasificacion.html): dos tablas, Memoria y Empareja, con el top 10
 * de tiempos del nivel de tablero y el modo elegidos. Por dentro hay una tabla por juego, tamaño
 * y modo difícil (assets/juegos.js); aquí solo se ven las dos de la combinación elegida.
 * La elección vive en la URL (?nivel=3&dificil=1).
 */
(function () {
  const { NIVELES, JUEGOS, PUESTOS, textoTablero, tabla, htmlTabla } = window.AwsJuegos;

  const $ = (id) => document.getElementById(id);
  const selNivel = $('c-nivel');
  const chkDificil = $('c-dificil');
  const contenido = $('c-tablas');

  selNivel.innerHTML = NIVELES.map((n, i) => `<option value="${i + 1}">Nivel ${i + 1} · Memoria ${
    textoTablero('memoria', n.memoria).replace(/ \(.*\)/, '')} · Empareja ${textoTablero('empareja', n.empareja)}</option>`).join('');

  const p = new URLSearchParams(location.search);
  const nivel = Number(p.get('nivel'));
  selNivel.value = String(nivel >= 1 && nivel <= NIVELES.length ? nivel : 1);
  chkDificil.checked = p.get('dificil') === '1';

  function pintar() {
    const n = NIVELES[Number(selNivel.value) - 1];
    const dificil = chkDificil.checked;
    const q = new URLSearchParams({ nivel: selNivel.value });
    if (dificil) q.set('dificil', '1');
    history.replaceState(null, '', `${location.pathname}?${q}`);

    contenido.innerHTML = Object.entries(JUEGOS).map(([juego, info]) => {
      const jugar = new URLSearchParams({ tablero: n[juego] });
      if (dificil) jugar.set('dificil', '1');
      return `<section class="clas-juego" aria-labelledby="c-${juego}">
          <div class="clas-juego-head">
            <h2 id="c-${juego}">${info.nombre}</h2>
            <a class="btn btn-secondary btn-sm" href="${info.url}?${jugar}">Jugar</a>
          </div>
          <p class="field-hint">${textoTablero(juego, n[juego])}${dificil ? ' · modo difícil' : ''} · top ${PUESTOS} por tiempo</p>
          ${htmlTabla(juego, tabla(juego, n[juego], dificil))}
        </section>`;
    }).join('');
  }

  selNivel.addEventListener('change', pintar);
  chkDificil.addEventListener('change', pintar);
  pintar();
})();
