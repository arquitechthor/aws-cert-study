# Plan: Apuntes AWS en inglés e italiano

Petición del usuario (2026-11-16): que Apuntes AWS esté también en **inglés** y en **italiano**, con
las guías de los servicios traducidas y con voces en esos idiomas. El **español sigue siendo el
idioma por defecto**: las URL actuales no cambian y son la versión de referencia.

Este documento es el plan de esa línea de trabajo. `PLAN.md` sigue siendo la fuente de verdad del
proyecto y enlaza aquí. Al terminar cada sesión de esta línea, marca aquí las tareas y anota la
sesión en el "Registro de sesiones" de `PLAN.md`.

El plan es paralelo al de Tech Spider (`../arquitechthor-spider/docs/PLAN-IDIOMAS.md`): las piezas
compartidas (`lectura.js`, `audio-kopi.js`, `cuenta.js`, `telarana.js`, menú y pie) se cambian igual
en los dos repos.

---

## Estado actual

- **Plan redactado (2026-11-16), sin empezar.** Primer paso: que el usuario resuelva las decisiones
  I1–I8 (sección 2). Después, Fase 1.

---

## 1. Qué hay que traducir (inventario a 2026-11-16)

| Pieza | Volumen | Dónde |
|---|---|---|
| Textos de la interfaz | Todos los mensajes escritos en el JS (catálogo, filtros, quiz, simulacro, progreso, juegos, lectura, cuenta…) | `assets/*.js` |
| Páginas fijas | Portada, servicio genérico, simulacro, Mi progreso, Memoria, Empareja, Clasificación, Arquitecto, cuenta, aviso legal | `*.html` de la raíz |
| Catálogo | 177 servicios (`frase`, `resumen`), 19 categorías, certificaciones (descripción y dominios) | `data/servicios.json`, `categorias.json`, `certificaciones.json` |
| Siglas | Glosa y `leer` de cada sigla (el glosario `G` de `revisar_texto.py`) | `data/siglas.json` |
| Guías | **177 guías publicadas** (unas 265 000 palabras con marcado): es, con diferencia, lo más grande | `servicios/` |
| Preguntas | 178 cuestionarios | `data/preguntas/` |
| Escenarios | Textos de los escenarios de Arquitecto (enunciado, huecos, `noVale`) y su PDF | `data/escenarios.json`, `assets/arquitecto-pdf.js` |
| Voces | Lectura con Web Speech API y 3 resúmenes en audio (S3 local; CodeArtifact y Bedrock desde Kopi) | `assets/lectura.js`, `assets/audio-kopi.js` |

`PLAN.md` y `data/fuentes/` son internos y no se traducen.

---

## 2. Decisiones pendientes (las resuelve el usuario)

| # | Pregunta | Propuesta |
|---|---|---|
| I1 | ¿Cómo son las URL de cada idioma? | Carpetas **`/en/`** e **`/it/`** con la misma estructura que la raíz (`/en/servicios/s3.html`). El español se queda en la raíz, sin prefijo. Es lo estándar para `hreflang` y para que Google indexe cada idioma por separado. |
| I2 | ¿Se cambia el idioma automáticamente según el navegador? | **No se redirige nunca.** Si el navegador está en inglés o italiano y se entra en una página en español, sale una vez un aviso discreto ("This page is also in English") que se puede cerrar; se recuerda en `localStorage`. |
| I3 | ¿Qué se ve en inglés o italiano de una guía aún no traducida? | El catálogo, los filtros y los juegos salen siempre en los tres idiomas (los datos del catálogo se traducen enteros al principio). Una guía sin traducir abre una página "Coming soon in English" con enlace a la versión en español, como la "Próximamente disponible" actual. Un filtro "Traducidas" en el catálogo de cada idioma. |
| I4 | ¿En qué orden se traducen las 177 guías? | **Inglés e italiano a la vez**, guía a guía. Primero los **servicios clave** (VPC, Organizations, S3, Lambda, IAM, Bedrock), luego la Prioridad 0 (núcleo) y después el orden de la cola de `PLAN.md`. El simulacro de una certificación en otro idioma usa solo las preguntas traducidas y avisa de cuántas hay. |
| I5 | ¿Quién revisa las traducciones? | Las hace Claude desde el español. El usuario revisa el inglés por muestreo. Para el italiano, si el usuario no lo lee con soltura, Claude hace una segunda pasada de revisión (retrotraducción al español y comparación) antes de publicar. |
| I6 | ¿Qué voz se prefiere en cada idioma para "Escuchar la guía"? | Como en español: las de **Google primero** (aunque sean en línea), luego las locales. En inglés, `en-GB` antes que `en-US`; en italiano, `it-IT`. El usuario puede cambiarla en la barra y se recuerda por idioma. |
| I7 | ¿Hay resumen en audio en cada idioma? | Sí, uno por idioma, generado por el usuario con NotebookLM a partir de la guía traducida y subido a Kopi Conocimiento. Si un idioma aún no tiene el suyo, **no se muestra ningún audio** en esa versión (no se ofrece el español). El de S3, que es un fichero local, se queda solo en español hasta que haya uno en Kopi. |
| I8 | ¿Cómo se llama la web en cada idioma? | **"AWS Study Notes"** en inglés y **"Appunti AWS"** en italiano (traducción directa de "Apuntes AWS"). La URL (`/aws-cert-study/`) no cambia. El pie de las otras webs sigue diciendo "Apuntes AWS". |

---

## 3. Diseño

### 3.1 Páginas y URL

- Cada página tiene su copia en `en/` y en `it/` con la misma ruta relativa: `en/index.html`,
  `en/servicios/<id>.html`, `en/simulacro.html`… Las rutas relativas llevan un `../` más. `datos.js`
  ya calcula la raíz del sitio desde su propio `<script src>`, así que sigue funcionando a cualquier
  profundidad.
- `<html lang="en">` / `lang="it"` en cada copia. **El idioma de la página sale siempre de ese
  atributo**: el JS no adivina nada más.
- `<link rel="alternate" hreflang="es|en|it|x-default">` en cada página (con `x-default` apuntando al
  español). `scripts/generar_sitemap.py` escribe las tres versiones con sus alternativas.
- Selector de idioma en el menú: **ES · EN · IT**, que lleva a la misma página en el otro idioma
  conservando la consulta (`?q=&cat=…`, `?escenario=…`). Si la guía no existe en ese idioma, lleva a
  la página de I3. Con el selector el menú pasa de 8 a 9 elementos: revisar el tramo compacto
  (761–1040 px) de `styles.css` y, si no cabe, meter el selector dentro del menú en móvil.

### 3.2 Textos de la interfaz

- Nuevo `assets/textos.js` (`AwsTextos`): un diccionario `{ es: {…}, en: {…}, it: {…} }` y una función
  `t('clave', {variables})` que usa el idioma de `<html lang>`. Se carga antes que el resto de scripts.
- Todos los textos escritos hoy en el JS pasan a ese diccionario: catálogo y filtros, quiz y
  `preguntas.js` ("Elige 2", "Pregunta difícil", solución…), simulacro, Mi progreso, los cuatro juegos
  y la clasificación, lectura, cuenta, "Exportar a Noria". El español se queda como está.
- Fechas, números y tiempos (simulacro, clasificación) con `Intl` y el idioma de la página.

### 3.3 Datos

- Los ficheros actuales siguen siendo la única fuente de la estructura (ids, estado, categorías,
  certificaciones, iconos, `clave`, `kopi`…). Los textos traducidos van aparte por idioma, indexados
  por id: `data/en/servicios.json` (`{ "<id>": { "frase", "resumen" } }`), `data/en/categorias.json`,
  `data/en/certificaciones.json`, `data/en/escenarios.json`, y lo mismo en `data/it/`. `datos.js` los
  mezcla al cargar según el idioma.
- **Categorías:** en inglés, el nombre oficial de AWS sin más ("Compute"); en italiano, el nombre
  oficial de AWS en italiano con el inglés de referencia, igual que en español ("Calcolo
  (*Compute*)"). Los nombres de servicios no se traducen en ningún idioma.
- **Certificaciones y dominios:** nombres de dominio tomados de la guía oficial del examen en cada
  idioma cuando AWS la publica; si no, traducción propia. En las preguntas, el campo `dominio` sigue
  guardando el nombre en español, que funciona como clave: el texto que se muestra sale de
  `data/<idioma>/certificaciones.json`.
- **Siglas:** el glosario `G` de `revisar_texto.py` gana la glosa y el `leer` en inglés e italiano, y
  el script exporta además `data/en/siglas.json` y `data/it/siglas.json`. `siglas.js` lee el del idioma
  de la página. Revisar si alguna sigla cambia de idioma a idioma (en AWS casi todas son inglesas).
- `data/en/preguntas/<id>.json` y `data/it/preguntas/<id>.json`: las preguntas traducidas con **los
  mismos ids, el mismo tipo, el mismo número de opciones y la misma respuesta correcta** (también en
  `ordenar` y `emparejar`). Así el progreso (`apuntes-aws.progreso`), la cola de falladas y el historial
  de simulacros son los mismos en los tres idiomas.
- Tech Spider (`scripts/importar_aws.py`) lee esas traducciones para su rama AWS en cada idioma.

### 3.4 Guías

- `en/servicios/<id>.html` e `it/servicios/<id>.html`, copiadas de la guía en español y traducidas.
  La plantilla gana una versión por idioma (`plantillas/en/servicio.html`, `plantillas/it/servicio.html`).
- Misma estructura fija que en español (`PLAN.md`, "Estructura fija de cada página de servicio"),
  con los títulos de sección traducidos y **los mismos `id`** de los `<h2>` (`que-es`, `a-fondo`,
  `kopi`…), para que los enlaces entre webs (`aprendizajes`) sigan funcionando.
- Cada traducción lleva en el `<main>` la fecha de la última revisión de la guía española de la que
  sale: `data-traducido-de="AAAA-MM-DD"`. Para que eso funcione, las guías españolas necesitan esa
  fecha: añadir `revisado` a `servicios.json` (de momento, la fecha del último commit de cada guía).
  `revisar_texto.py` avisa cuando una traducción está desactualizada.
- "Así lo uso en Kopi / Prompt Quest / Kopi Chess": se traducen; los enlaces al caso de estudio de
  `aprendizajes` (solo en español) llevan "(in Spanish)" / "(in spagnolo)".
- "Comandos de ejemplo": el código no se traduce; los comentarios dentro, sí.
- "Documentación oficial" y "Fuentes": AWS tiene su documentación en inglés y, en parte, en italiano;
  se enlaza la versión del idioma si existe.
- `revisar_texto.py` trabaja también sobre `en/` e `it/`: siglas, enlaces a otros servicios en el
  mismo idioma (a su guía o a su "coming soon"), la fila "In one sentence:" / "In una frase:" desde la
  `frase` traducida y el banner "★ Key service" / "★ Servizio chiave".
  `revisar_frases.py` revisa la `frase` de cada idioma (60–90 caracteres, sin el nombre del servicio).

### 3.5 Juegos

- Memoria y Empareja: solo cambian los textos de la interfaz y la `frase` (Empareja la muestra).
- Arquitecto: escenarios traducidos en `data/<idioma>/escenarios.json` (mismos ids, celdas y
  soluciones; solo cambian los textos). `revisar_escenarios.py` comprueba los `TOPES` en cada idioma,
  porque el italiano suele ocupar más que el español y el PDF debe seguir cabiendo en una hoja A4.
  El PDF se genera en el idioma de la página (jsPDF con la fuente actual cubre los acentos italianos).
- La clasificación es la misma para los tres idiomas (los nombres de los jugadores no se traducen).

### 3.6 Lo que no cambia con el idioma

- El progreso, la cola de falladas, los simulacros, las partidas resueltas de Arquitecto y la
  clasificación son **los mismos en los tres idiomas** (las claves `apuntes-aws.*` usan ids). La
  sincronización con la cuenta Kopi no cambia.
- "Exportar a Noria" exporta las preguntas en el idioma de la página.

### 3.7 Menú, pie, cuenta y aviso legal

- El menú (incluido el desplegable "Juegos") y el pie se traducen en `en/` e `it/`. El selector de
  idioma solo existe aquí y en Tech Spider: hay que anotarlo en la política "Mismo menú y pie" de
  `../kopi-docs/politicas.md`.
- `cuenta.html` en los tres idiomas. Comprobar si la página de inicio de sesión gestionada de Cognito
  acepta el parámetro de idioma (`lang=en|it|es`) y pasarlo. La URI de redirección sigue siendo la
  española (`cuenta.html`), que devuelve a la página de origen en su idioma.
- El aviso legal se traduce con una nota: "En caso de duda, prevalece la versión en español". Su
  sección de privacidad cubre las claves nuevas de `localStorage` (aviso de I2, voces por idioma) y la
  sección de marcas (iconos de AWS sin modificar) se mantiene igual.

---

## 4. Voces

### 4.1 "Escuchar la guía" con la Web Speech API (`assets/lectura.js`)

- El idioma de la lectura sale de `<html lang>`: la lista de voces se filtra por `^en` o `^it`
  además de `^es`, con el orden de I6.
- Preferencias en `apuntes-aws.lectura`: `{ velocidad, voces: { es, en, it } }`, una voz por idioma.
  Migración una sola vez: la `voz` actual pasa a `voces.es`.
- `leer` (cómo pronunciar una sigla) por idioma, desde `data/<idioma>/siglas.json`: lo que hoy está en
  `LEER` de `revisar_texto.py` está pensado para una voz española y en inglés casi nunca hace falta.
  La regla de deletrear las siglas en mayúsculas ("E C 2") sirve igual en los tres.
- Textos de la barra desde `textos.js`. Si no hay voz del idioma, el botón lo dice ("No English voice
  in this browser") con un enlace de ayuda para instalar voces (Windows: Configuración › Hora e idioma
  › Voz; Android: Speech Services de Google).
- `lectura.js` viene de Tech Spider: el cambio se hace igual en los dos repos.
- Fuera de alcance: cambiar de voz a mitad de frase para los nombres en inglés dentro del texto en
  español o en italiano.

### 4.2 Resúmenes en audio de Kopi (`assets/audio-kopi.js`)

- En `servicios.json`, `"audio": true` pasa a ser la lista de idiomas con audio: `"audio": ["es"]`,
  `["es", "en"]`… El filtro "Con audio" y el chip 🎧 del catálogo miran el idioma de la página (y Tech
  Spider también, al importar).
- Cada guía traducida lleva su propio `<figure class="audio-recurso" data-kopi="<id>">` con el id del
  recurso de Kopi **en su idioma**. `audio-kopi.js` no cambia salvo sus textos.
- El flujo "Embedding a Kopi resource" de `CLAUDE.md` se amplía con el idioma: el usuario genera el
  resumen en NotebookLM con la guía traducida como fuente y el idioma de salida puesto, lo sube a un
  tema de Kopi Conocimiento por idioma (p. ej. "Apuntes AWS (EN)") y da el id y el idioma. Antes de
  enlazarlo: `curl` al recurso público, `tipo` debe ser `AUDIO` y el título debe coincidir con el
  servicio y el idioma; si no, se para y se pregunta. Después, `importar_aws.py` en Tech Spider.

---

## 5. Reglas de contenido en inglés e italiano

Las de `CLAUDE.md` valen en los tres idiomas, con estos ajustes:

- Siglas sin desarrollar en el texto; la glosa sale del glosario del idioma.
- Enlazar la primera mención de cada servicio por sección, a su guía **en el mismo idioma**.
- **Traducir, no reescribir**: misma estructura, mismas secciones y mismo nivel de detalle que la guía
  española. Si al traducir se encuentra un error o un dato caducado (cuotas, límites), se corrige
  primero en español y se traduce después.
- Las preguntas traducidas siguen siendo originales y conservan `dificil`, `certificaciones` y
  `dominio`; la posición de la respuesta correcta no cambia.
- Nada de documentación de AWS copiada en ningún idioma: las citas literales, cortas y con `<cite>`.

---

## 6. Fases y tareas

### Fase 0: decisiones
- [ ] **0.1** El usuario resuelve I1–I8.
- [ ] **0.2** Anotar las decisiones en "Decisiones tomadas" de `PLAN.md` y la nueva regla del
  selector de idioma en `../kopi-docs/politicas.md`.

### Fase 1: infraestructura (sin contenido traducido todavía)
- [ ] **1.1** `assets/textos.js` y paso de todos los textos del JS al diccionario (solo español; la
  web no debe cambiar en nada).
- [ ] **1.2** `datos.js`: idioma desde `<html lang>`, mezcla de los `data/<idioma>/*.json`, preguntas
  y siglas por idioma, URL de guía con el prefijo del idioma.
- [ ] **1.3** Selector ES · EN · IT en el menú (con el ajuste del menú compacto), `hreflang`, aviso de
  I2.
- [ ] **1.4** `revisado` en `servicios.json`; `revisar_texto.py`, `revisar_frases.py`,
  `revisar_escenarios.py` y `generar_sitemap.py` con los tres idiomas; comprobación de paridad
  (mismos ids y respuestas correctas en las preguntas traducidas).
- [ ] **1.5** Página "coming soon" por idioma (I3) y filtro "Traducidas".

### Fase 2: interfaz y catálogo en inglés e italiano
- [ ] **2.1** Diccionario `en` e `it` de `textos.js`.
- [ ] **2.2** Páginas fijas en `en/` e `it/`: portada, servicio genérico, simulacro, Mi progreso,
  juegos, clasificación, cuenta, aviso legal.
- [ ] **2.3** Catálogo traducido: `frase` y `resumen` de los 177 servicios, categorías,
  certificaciones y dominios.
- [ ] **2.4** Siglas en inglés e italiano (glosa y `leer`).
- [ ] **2.5** Escenarios de Arquitecto traducidos y PDF comprobado en los límites de `TOPES`.
- [ ] **2.6** Probar a 375 px y en escritorio los tres idiomas; publicar.

### Fase 3: guías y preguntas (iterativa, la más larga)
- [ ] **3.1** Plantillas de guía en `plantillas/en/` y `plantillas/it/`.
- [ ] **3.2** Servicios clave (6), en inglés e italiano, con sus preguntas.
- [ ] **3.3** Prioridad 0: núcleo (20).
- [ ] **3.4** Resto, por el orden de la cola de `PLAN.md`, por lotes, publicando cada lote.
- [ ] **3.5** Desde que acabe la 3.4: cada guía nueva o revisada se publica en los tres idiomas a la
  vez (paso añadido al flujo "Filling in a service" de `CLAUDE.md`).

### Fase 4: voces
- [ ] **4.1** `lectura.js` multiidioma (4.1), en este repo y en Tech Spider.
- [ ] **4.2** `"audio"` como lista de idiomas, filtro y 🎧 por idioma (4.2); `importar_aws.py` de Tech
  Spider adaptado.
- [ ] **4.3** Audios en inglés e italiano de CodeArtifact y Bedrock (y S3 desde Kopi), cuando el
  usuario los genere.

### Fase 5: mantenimiento
- [ ] **5.1** Añadir a `CLAUDE.md` las reglas de idiomas (dónde va cada traducción, qué comprueban los
  scripts, que una revisión en español deja las traducciones marcadas como desactualizadas).
