# Plan de trabajo: aws-cert-study

Web pública y estática con apuntes de estudio de servicios de AWS para certificaciones,
servida con GitHub Pages en `https://arquitechthor.github.io/aws-cert-study/`.

Este fichero sirve para **retomar el trabajo en cualquier momento**: antes de empezar una
sesión, lee "Estado actual"; al terminar, marca las tareas hechas y actualiza "Próximo paso".

---

## Estado actual

- **Fase en curso:** Fase 0 (definir alcance). No ha empezado.
- **Próximo paso:** tarea 0.1, renombrar el repo en GitHub.
- **Última actualización:** 2026-09-25

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Stack | HTML/CSS/JS puro, sin framework ni build ni `package.json`, igual que `kopi-web`. |
| Estilo | Paleta y componentes de `kopi-web/styles.css` (`--cyan`, `--violet`, `--magenta`, `--gradient-brand`), **copiados** porque los repos son independientes. |
| Hosting | Solo GitHub Pages (`arquitechthor.github.io/aws-cert-study/`). Sin dominio propio ni Route 53. |
| Nombre del repo | `aws-cert-study` (antes `knowledgement-aws`). |
| Certificaciones iniciales | Solutions Architect – Associate (SAA-C03), Solutions Architect – Professional (SAP-C02) y AI Practitioner (AIF-C01). Los códigos de versión se verifican en la Fase 0. |
| Idioma | Español. Los nombres de servicio van en inglés, como los usa AWS. Las categorías van en español **con su nombre en inglés** como referencia, por ejemplo "Cómputo (*Compute*)". |
| Licencia | **CC BY-SA 4.0** para todo el repo (sustituye a la GPL-3.0 inicial). |
| Derechos de autor | Nada de copiar documentación de AWS: se resume con palabras propias y se enlaza la fuente. Si algo debe ser literal (una definición, un límite), va entre comillas o en `<blockquote>` con cita y enlace a la fuente. No se usan logos ni iconos de servicios de AWS. |
| Preguntas | Solo preguntas **originales** tipo examen. Nunca preguntas reales de examen, que están bajo NDA. |
| Enlaces a Kopi | En la navegación y el pie: "Kopi" → `https://kopitools.link` y "Sobre mí" → `https://kopitools.link/#sobre-mi`. Más adelante "Sobre mí" pasará a una web aparte, y `kopi-web` enlazará a este sitio. |
| Flujo git | Directo a `main`, sin pull requests (igual que el resto de proyectos kopi). |
| Servicios pendientes | Sin archivos vacíos: un servicio con `estado: "pendiente"` enlaza a la página genérica `servicio.html?id=<id>` ("Próximamente disponible"). Al publicarlo se crea `servicios/<id>.html`. |

---

## Arquitectura prevista

```
aws-cert-study/
├── index.html                # portada: buscador + filtros + tarjetas de servicios
├── servicio.html             # "Próximamente disponible" genérica (?id=<id>)
├── servicios/<id>.html       # una página por servicio publicado
├── data/
│   ├── servicios.json        # catálogo: única fuente de verdad
│   ├── categorias.json       # id, nombre en español y nombre en inglés
│   ├── certificaciones.json  # código, nombre, nivel, enlace a la guía oficial
│   └── preguntas/<id>.json   # preguntas de práctica por servicio
├── assets/
│   ├── catalogo.js           # filtros, tarjetas y estado de filtros en la URL
│   ├── servicio.js           # página genérica "Próximamente"
│   ├── quiz.js               # renderiza y corrige preguntas
│   └── nav.js                # menú móvil
├── plantillas/servicio.html  # plantilla base para cada servicio
├── styles.css
├── .mcp.json                 # MCP de AWS (aws-knowledge) para la Fase 2
├── CLAUDE.md                 # reglas del proyecto y flujo "rellenar un servicio"
├── PLAN.md                   # este fichero
├── LICENSE                   # CC BY-SA 4.0
└── README.md
```

### Modelo de datos

`data/servicios.json` tiene una entrada por servicio:

```json
{
  "id": "ec2",
  "nombre": "Amazon EC2",
  "categoria": "computo",
  "certificaciones": ["SAA-C03", "SAP-C02"],
  "estado": "pendiente",
  "resumen": "Servidores virtuales redimensionables en la nube."
}
```

`data/categorias.json`:

```json
{ "id": "computo", "nombre": "Cómputo", "nombreEn": "Compute" }
```

`data/preguntas/<id>.json` contiene una lista de preguntas:

```json
{
  "id": "ec2-001",
  "tipo": "unica",
  "certificaciones": ["SAA-C03"],
  "dominio": "Diseñar arquitecturas resilientes",
  "enunciado": "…",
  "opciones": ["…", "…", "…", "…"],
  "correctas": [2],
  "explicacion": "Por qué la opción correcta lo es y por qué las demás no.",
  "fuentes": ["https://docs.aws.amazon.com/…"]
}
```

`tipo` puede ser `"unica"` o `"multiple"` (elegir 2 o más, como en el examen).

### Estructura fija de cada página de servicio

1. **Cabecera:** nombre del servicio, **categoría (en español + inglés)** y chips con las
   certificaciones en las que entra, cada uno enlazado a la portada ya filtrada.
2. **Qué es:** 2–3 frases.
3. **Conceptos clave:** componentes, tipos, límites relevantes.
4. **Casos de uso típicos** y **cuándo NO usarlo**.
5. **Comparativa con servicios parecidos**, por ejemplo EC2 vs Lambda vs Fargate.
6. **Modelo de precios:** cómo se cobra, sin cifras.
7. **Seguridad y alta disponibilidad.**
8. **Trampas de examen:** palabras clave del enunciado que apuntan a este servicio.
9. **Preguntas de práctica**, cargadas desde `data/preguntas/<id>.json`.
10. **Fuentes:** enlaces a la documentación oficial y citas de lo que sea literal.
11. **Pie de página** con navegación: Kopi, Sobre mí, licencia CC BY-SA 4.0.

### Filtros de la portada

- Texto libre (nombre del servicio).
- Categoría (chips o desplegable, con el nombre en español y el inglés como referencia).
- Certificación (chips de selección múltiple).
- Estado: todos o solo publicados.
- El estado de los filtros se refleja en la URL (`?cert=SAA-C03&cat=computo&q=ec2`), para
  poder compartir y enlazar vistas filtradas.

### Consideraciones técnicas

- GitHub Pages sirve el sitio bajo `/aws-cert-study/`, así que **todas las rutas deben ser
  relativas** (`data/servicios.json`, nunca `/data/...`).
- Los `fetch` de JSON no funcionan con `file://`. Para verlo en local:
  `npx serve .` o `python -m http.server`.
- Se añade un fichero `.nojekyll` para que GitHub Pages sirva los archivos tal cual.

---

## Fase 0: definir el alcance

Objetivo: tener el catálogo completo de servicios y categorías de las 3 certificaciones.

- [ ] **0.1** Renombrar el repo en GitHub: `knowledgement-aws` → `aws-cert-study`
      (Settings → General → Repository name). Después, actualizar el remoto local y renombrar la carpeta.
- [ ] **0.2** Configurar el MCP de AWS en el proyecto (`.mcp.json`):
      `claude mcp add --transport http --scope project aws-knowledge https://knowledge-mcp.global.api.aws`
- [ ] **0.3** Verificar los códigos vigentes de las 3 certificaciones (SAA-C03, SAP-C02,
      AIF-C01) y localizar la guía de examen oficial de cada una.
- [ ] **0.4** Extraer de cada guía los dominios y sus pesos (%), que se usarán para etiquetar las preguntas.
- [ ] **0.5** Extraer de cada guía el apéndice de servicios en alcance (*in-scope services*)
      por categoría.
- [ ] **0.6** Unificar las categorías de las 3 guías en `categorias.json`, con nombre en
      español + inglés. Decidir qué hacer con los servicios que aparecen en categorías distintas
      según la guía (propuesta: una categoría principal por servicio).
- [ ] **0.7** Construir `servicios.json` completo, todo en `pendiente`, con la lista de
      certificaciones de cada servicio.
- [ ] **0.8** Definir el orden de prioridad para la Fase 2 (propuesta: primero los servicios
      que comparten SAA y SAP, luego los de AIF) y volcarlo en la cola de la Fase 2 de este fichero.

## Fase 1: esqueleto publicado

Objetivo: el sitio navegable en GitHub Pages, con todos los servicios en "Próximamente".

- [ ] **1.1** Sustituir `LICENSE` por el texto de CC BY-SA 4.0 y actualizar `README.md`.
- [ ] **1.2** `styles.css`: copiar variables y componentes base de `kopi-web` y añadir los
      estilos de filtros, chips, tarjetas de servicio y quiz.
- [ ] **1.3** Navegación y pie comunes: enlaces a Kopi (`https://kopitools.link`), Sobre mí
      (`https://kopitools.link/#sobre-mi`), licencia y repo. Incluir `nav.js` con el menú móvil.
- [ ] **1.4** `index.html` + `catalogo.js`: hero breve, filtros, contador de resultados y
      tarjetas (nombre, categoría es/en, certificaciones, badge de estado).
- [ ] **1.5** `servicio.html` + `servicio.js`: página genérica "Próximamente disponible" que
      lee `?id=`, muestra el nombre, la categoría y las certificaciones del servicio y enlaza de vuelta al catálogo.
- [ ] **1.6** `plantillas/servicio.html` con la estructura fija de 11 secciones y `quiz.js`
      (preguntas de opción única y múltiple, corrección, explicación, fuentes).
- [ ] **1.7** Favicon y metadatos (`<title>`, `description`, Open Graph) en español.
- [ ] **1.8** `CLAUDE.md` del repo: reglas del proyecto y el flujo paso a paso de "rellenar un servicio".
- [ ] **1.9** Añadir el proyecto a la tabla de `kopi/CLAUDE.md` (workspace).
- [ ] **1.10** Activar GitHub Pages (Settings → Pages → Deploy from branch `main` / root),
      añadir `.nojekyll` y comprobar que el sitio carga y que los filtros funcionan en producción.

## Fase 2: rellenar servicios (iterativa)

Objetivo: publicar servicios uno a uno. Flujo por servicio:

1. Consultar la documentación con el MCP `aws-knowledge` (`search_documentation`, `read_documentation`).
2. Copiar `plantillas/servicio.html` a `servicios/<id>.html` y redactar las secciones con
   palabras propias, citando lo literal.
3. Crear `data/preguntas/<id>.json` con 5–15 preguntas originales etiquetadas por certificación y dominio.
4. Cambiar `estado` a `"publicado"` en `servicios.json`.
5. Revisar en local (`npx serve .`), hacer commit y push a `main` y marcar el servicio aquí.

### Cola de servicios

Se rellenará en la tarea 0.8. El estado real de cada servicio vive en `servicios.json`;
esta lista es solo el orden de trabajo.

- [ ] (pendiente de la Fase 0)

## Fase 3: extras (opcional)

- [ ] **3.1** Simulacro por certificación: mezcla preguntas de todos los servicios, con
      temporizador y puntuación por dominio.
- [ ] **3.2** Progreso personal en `localStorage`: servicios estudiados, preguntas falladas y repaso.
- [ ] **3.3** `sitemap.xml` + `robots.txt`.
- [ ] **3.4** Enlace a este sitio desde `kopi-web` (en otro repo).
- [ ] **3.5** Cambiar "Sobre mí" a la futura web independiente cuando exista.
- [ ] **3.6** Ampliar a más certificaciones si hace falta (el modelo ya lo permite).

---

## Registro de sesiones

| Fecha | Qué se hizo |
|---|---|
| 2026-09-25 | Plan creado. Decisiones iniciales: 3 certificaciones, GitHub Pages, CC BY-SA 4.0, nombre `aws-cert-study`. |
