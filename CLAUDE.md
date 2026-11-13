# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository context

`aws-cert-study` is one of the independent git repos in the `kopi/` workspace (see
`../CLAUDE.md`). Its only (optional) runtime dependency on the shared Kopi AWS backend is saving
study progress in the user's Kopi account (`assets/cuenta.js`, below); otherwise it is a
static study site for AWS certifications, published with **GitHub Pages** from `main` / root
at `https://arquitechthor.github.io/aws-cert-study/`. Every push to `main` redeploys it (no
workflow file; Pages builds the branch directly, and `.nojekyll` makes it serve files as-is).

**Read `PLAN.md` first.** It is the source of truth for phases, decisions and the next step
("Estado actual"). Update it (tick tasks, "Estado actual", "Registro de sesiones") at the end
of every work session so work can be resumed at any time.

## Stack and layout

Plain HTML/CSS/JS, **no framework, no build, no package.json** (same approach as
`kopi-web`, whose palette and base components were copied into `styles.css`).

- Every page shares the same `<nav>` and closing footer line (`.footer-sitios`: Kopi Tools ·
  Apuntes AWS · Tech Spider · Kopi Chess · Prompt Quest · Arquitechthor) as `kopi-web` and the personal site ("Inicio" first, "Arquitechthor" last, no
  call-to-action button, active link via `aria-current` set by `assets/nav.js`): policy "Mismo
  menú y pie en las tres webs" in `../kopi-docs/politicas.md`. The catalog search also matches
  each service's `frase` (name matches are listed first).
- `index.html` + `assets/catalogo.js`: certification cards and the service catalog with
  filters (text, category, status, certifications and the "Destacados" chips (key services, used
  in Kopi, with audio); the union/intersection mode applies within each of those two groups, and the groups
  combine with AND). Filter state
  lives in the URL (`?q=&cat=&estado=&cert=A,B&modo=union&clave=1&kopi=1&audio=1`). The retired SAP-C02 and DVA-C02 were removed on 2026-10-28 (only current guides are listed); a
  certification with `examenDesde` in the future shows "Examen disponible a partir del…". `kopi=1` shows only
  services with `"kopi": true` in `servicios.json` (the ones Kopi uses); `clave=1` only the key
  services (see "Key services" below); `audio=1` only services with `"audio": true`, whose guide
  plays a NotebookLM summary right before "Qué es" and whose card shows a 🎧 chip. **New audios never go
  in the repo** (GitHub size limits with 177 services): they are public resources of a Kopi Conocimiento
  topic, loaded on "▶ Escuchar" by `assets/audio-kopi.js` from `GET https://api.kopitools.link/public/
  knowledge/resources/{id}` (CORS allows this origin; `fileUrl` is a presigned S3 URL that expires in 1 h,
  renewed on error). Markup: `<figure class="audio-recurso" data-kopi="<resource id>">` + `<button
  data-kopi-cargar>` + `<p class="audio-aviso">` (see `servicios/codeartifact.html`). Only S3 keeps its
  old local file `assets/audios/s3.m4a`. CodeArtifact and Bedrock have one from Kopi; the other audios in that Kopi
  topic are about the retired SAP-C02, so they are not used (S3 so far; it also has a "Números interesantes" section of `.numero-ficha` cards). Certifications with
  `estado: "guia-pendiente"` are shown as cards only, never as filter chips.
- Study progress lives in the browser (and optionally in the Kopi account, see below): `AwsDatos.leerProgreso()/guardarProgreso()` store, per service
  in `localStorage` (`apuntes-aws.progreso`), the correct answers and the `fallos` (questions whose
  last attempt was wrong, i.e. the review queue). `assets/preguntas.js` writes it from both the
  guides and the simulacro; a published service whose questions are all answered correctly shows
  as "Finalizado" in the catalog. It is derived in the browser, never stored in `servicios.json`.
- **Optional Kopi account** (same as Tech Spider, whose `docs/PLAN.md` 4.5.1 is the reference):
  `assets/cuenta.js` (copied from `../arquitechthor-spider/assets/cuenta.js`; only the `SITIO` block
  differs, keep the rest identical), `cuenta.html` (OAuth redirect URI and account page) and
  `assets/pagina-cuenta.js`. Login with Cognito's managed login page (Authorization Code + PKCE, no
  library); backend `/study/aws-cert-study/progress` in `../../kopi/kopi-media-admin`, whose App Client
  and authorizer are **only** for these routes. Synced keys: `apuntes-aws.progreso` and
  `apuntes-aws.simulacros` (intentos are merged on the first sync); whoever writes them must call
  `AwsDatos.avisarGuardado('progreso'|'simulacros')` afterwards; `aws:sincronizado` repaints the catalog
  and Mi progreso. Session in `kopi.estudio.sesion`, shared with Tech Spider (same origin). Every page
  that loads `datos.js` loads `cuenta.js` right after it (all pages do, including `aviso-legal.html` and
  `clasificacion.html`): `cuenta.js` adds the nav link to `cuenta.html` before "Arquitechthor" ("Guardar
  progreso" / "Mi cuenta"). With 8 entries the nav gets compact (13px, smaller gaps, `nowrap`) between
  761 and 1040px in `styles.css`. Disabled while `CONFIG.dominio`/`clientId`
  are empty.
- `assets/preguntas.js` (`window.AwsPreguntas`): the shared question component (render, read,
  grade, mark, solution, Noria text, progress) for the four types `unica`, `multiple`, `ordenar`
  and `emparejar`, plus the ⚠ "Pregunta difícil" tag (`"dificil": true`) and per-certification
  domains (`"dominios"`). Question format in `PLAN.md` ("Modelo de datos"). Every page with a quiz
  loads it before `quiz.js`.
- `simulacro.html` + `assets/simulacro.js`: practice exam per certification (questions spread by
  domain weight, full/half/quick length with the real exam's time, flag for review, grading by
  domain, history in `localStorage` `apuntes-aws.simulacros`) and the review of failed questions
  (`?repaso=1[&cert=]`). `progreso.html` + `assets/progreso.js`: "Mi progreso" summary (noindex),
  including **Mi telaraña de AWS** (`#mi-telarana`, `?cat=<categoria>`): every published service by
  category drawn with `assets/telarana.js` (`AwsTelarana`, a **copy** of Tech Spider's drawer: fix the
  drawing in both repos) and colored by progress. Tech Spider (same origin) has the 177 services as
  `externo` nodes and reads `apuntes-aws.progreso` read-only: after publishing a service or changing a
  category, run `python scripts/importar_aws.py` in `../arquitechthor-spider`.
  Exam length and duration come from `examen` in `certificaciones.json`.
- Games, grouped in the nav under a "Juegos" dropdown (`.nav-menu`, opened by `assets/nav.js`):
  - `memoria.html` + `assets/memoria.js`: memory game; two service cards match when they share the
    main `categoria`. Config in the URL (`?tablero=8x8&cert=DVA-C03&cat=a,b&dificil=1`), last one in
    `localStorage` (`apuntes-aws.memoria`). Rules in `PLAN.md` (Fase 4).
  - `empareja.html` + `assets/empareja.js` (the old memory "funciones" mode, now its own game):
    services (icon + name; icon only in hard mode) on the left, their `frase` on the right, all
    visible once "Empezar" is pressed (the timer starts there). Tracks time and accuracy
    (pairs / attempts). Config in the URL (`?tablero=8&...`), last one in `apuntes-aws.empareja`.
  - `clasificacion.html` + `assets/clasificacion.js` (noindex): top 10 times per game, board size
    and hard mode, shown as two tables (Memoria, Empareja) for the chosen level and mode
    (`?nivel=1..7&dificil=1`). `assets/juegos.js` (`window.AwsJuegos`) holds the 7 shared size
    levels (`NIVELES`: Memoria 6×6…12×12 ↔ Empareja 6…24 pairs), the storage
    (`apuntes-aws.clasificacion`: name, date, time in ms, and accuracy for Empareja) and the
    end-of-game name prompt. Reduced boards (when filters leave too few services) don't rank.
  Only services with `"icono": true` (and a `frase`) play in Memoria and Empareja.
  - `arquitecto.html` + `assets/arquitecto.js` (no score, no ranking): scenarios from
    `data/escenarios.json` (format in `PLAN.md`, decision "Juego Arquitecto") with a diagram whose
    slots (`hueco`) take service tokens (drag, or tap slot and token in any order); a **?** per slot
    shows the category of its valid services; "Comprobar" explains each slot with `noVale` reasons and
    hides the answer until "Ver la solución". Desktop: CSS grid (`col`/`fila`) with SVG arrows; ≤760px:
    list of steps. Config in the URL (`?escenario=&cert=&dificil=1`), last config and solved scenarios
    in `apuntes-aws.arquitecto`. A solved scenario (only solved, never via "Ver la solución") offers
    "Descargar la solución (PDF A4)": `assets/arquitecto-pdf.js` draws one landscape A4 page with
    jsPDF (local copy in `assets/vendor/`, no CDN, so no third-party requests). After editing scenarios
    run `python scripts/revisar_escenarios.py` (ids, cells, distractors that would be valid, acronyms
    missing from `siglas.json`, and the size limits `TOPES` that guarantee the PDF fits one page; if you
    change the PDF layout, re-test a scenario at every limit); write texts with
    bare acronyms (tooltips at render time) and check new layouts in a browser so no arrow crosses a node.
- `assets/lectura.js` (copied from Tech Spider, adapted): "🔊 Escuchar la guía" button appended to
  `.service-head` of every guide; reads the guide aloud with the browser's Web Speech API (no library,
  no requests of our own), skipping `<pre>`, the NotebookLM audio, "Preguntas de práctica", "Fuentes"
  and `[data-sin-lectura]`. Acronyms are spelled out unless listed in `LEER` in
  `scripts/revisar_texto.py` (exported as `leer` in `data/siglas.json`). Speed and voice in
  `apuntes-aws.lectura`. Every guide loads it after `siglas.js` (see the template).
- `servicio.html` + `assets/servicio.js`: generic "Próximamente disponible" page
  (`?id=<id>`), used for every service with `estado: "pendiente"`. It redirects to
  `servicios/<id>.html` once the service is `publicado`.
- `servicios/<id>.html`: one page per published service, copied from
  `plantillas/servicio.html` (same folder depth, so the `../` paths keep working).
- `assets/datos.js`: shared loader (`window.AwsDatos`). It resolves every path against the
  site root derived from its own `<script src>`, so pages work at any depth and under the
  `/aws-cert-study/` subpath. **Always use relative paths**, never `/data/...`.
- `assets/quiz.js`: renders `<div class="quiz" data-quiz="<id>">` from
  `data/preguntas/<id>.json` with `preguntas.js`, and its "Exportar a Noria" button downloads the questions as one
  Noria topic (`{version: 1, temas: [{nombre, descripcion, preguntas}]}`, format in
  `../kopi-docs/importar_temas.md`; statement + options, no answers).
- `scripts/revisar_texto.py`: applies the acronym and service-link content rules (below) to
  published pages and questions, and writes the header's "En una frase:" row from each service's
  `frase` in `servicios.json` (acronyms marked too); idempotent, dry run unless `--escribir`.
  The catalog cards and the "Próximamente" page show `frase` as well (not `resumen`).
- `aviso-legal.html`: legal notice, terms, trademarks, license and privacy.
- `data/servicios.json`, `data/categorias.json`, `data/certificaciones.json`: the catalog
  (schemas in `PLAN.md`). `data/fuentes/*.txt`: the original in-scope service lists from each
  exam guide, kept for diffing when AWS updates a guide.
- `data/asset-package/`: official AWS Architecture Icons, **gitignored** (29 MB). Only the
  64 px SVGs in use are copied to `assets/iconos/servicios/<id>.svg` (services with
  `"icono": true` in `servicios.json`) and `assets/iconos/categorias/<id>.svg` (all 20
  categories). `AwsDatos.iconoServicio()` falls back to the category icon when a service has
  none.

## Commands

```bash
python -m http.server 8765   # or: npx serve .   (fetch() of the JSON files fails on file://)
```

No build, lint or test tooling (only the helpers `scripts/revisar_texto.py`,
`scripts/generar_sitemap.py` (rewrites `sitemap.xml` from the published services; run it after
publishing or changing pages; `robots.txt` lives in the domain root, repo
`arquitechthor.github.io`), `scripts/revisar_escenarios.py` (Arquitecto scenarios) and `scripts/revisar_frases.py`, which checks every service's `frase` in `servicios.json`: 60–90
characters, no word of the service's name, acronym or id; run it after adding or editing one). Verify changes in a browser, including at ~375px width (no
horizontal scroll).

## Workflow: filling in a service (Phase 2)

1. Research with the `aws-knowledge` MCP server (`.mcp.json`): `search_documentation`, then
   `read_documentation` only when chunks are insufficient. If the session did not load the MCP
   (started outside this folder), the endpoint also answers plain JSON-RPC `tools/call` POSTs
   without auth. Verify quotas and limits against current docs, since they change (e.g. Lambda
   async payload is now 1 MB, S3 max object ~50 TB, ACM certs 198 days). Check whether the
   service is discontinued or closed to new customers; if so, add the warning callout.
2. Copy `plantillas/servicio.html` to `servicios/<id>.html` and fill in every `[[…]]`; remove
   the template comment and the `noindex` meta. The "Documentación oficial" link uses the
   service's `documentacion` URL from `servicios.json`. If the service has no `"icono": true`, point the
   header icon at its category icon instead. Include the "Así lo uso en Kopi" section only
   if Kopi uses the service (see `kopi-media-admin/documentation/servicios-aws/`), with no
   sensitive identifiers (account ID, bucket names, distribution IDs, ARNs); in that case also
   set `"kopi": true` in `servicios.json` so it appears under the "Usados en Kopi" filter. Two more optional
   sections, about the owner's **public** projects, go right after it (or right before "Trampas de examen" if
   there is no Kopi section): `<h2 id="prompt-quest">Así lo uso en Prompt Quest</h2>` and `<h2 id="kopi-chess">Así
   lo uso en Kopi Chess</h2>`, with links to the files on GitHub and a closing `<p class="text-faint">` link to the
   matching case study in `https://arquitechthor.github.io/aprendizajes/` (whose pages link back to these anchors).
   They don't set `"kopi": true`.
   Optional section `<h2 id="comandos">Comandos de ejemplo</h2>` right after "Conceptos clave"
   (first used in `servicios/codeartifact.html`): AWS CLI commands or config snippets checked against
   current docs, written in our own words, each in `<pre><code>` (styled by `.doc pre`, which scrolls
   inside the block so the page never scrolls sideways at 375px), with made-up names and the fake
   account `111122223333`. `revisar_texto.py` and `lectura.js` skip `<pre>`/`<code>`. The owner also
   uses this site to learn the AWS services of their job, so practical content is welcome.
3. Write `data/preguntas/<id>.json` with 5–15 **original** questions tagged with certification
   and domain (domain names from `certificaciones.json`; if a question has several certifications,
   add `"dominios": {"<cert>": "<domain>"}` for the ones where `dominio` doesn't exist). Spread the
   correct answer across positions. A question whose service is in no current guide keeps
   `"certificaciones": []` and `"dominio": ""`. Mark SAP-level questions with `"dificil": true` (criteria in
   "Hard questions" below).
4. In `data/servicios.json`, set `estado` to `"publicado"` and write `resumen`. Then run
   `python scripts/revisar_texto.py --escribir <id>` (acronyms and links; add any new acronym
   to its glossary first) and `python scripts/revisar_texto.py --publicado <id>` so other pages'
   "Próximamente" links to it point to the new page.
5. Run `python scripts/generar_sitemap.py`, serve locally, check the page and quiz, then commit
   and push to `main` (no PRs) and tick the service in the `PLAN.md` queue.

## Workflow: embedding a Kopi resource

The user gives a Kopi Conocimiento resource ID and the service guide to embed it in. It is not always an
audio: resources can be `AUDIO`, `VIDEO`, `IMAGE`, `RICH_TEXT` (html + preguntas) or a URL. Audios are the
ones with `tipo: "AUDIO"`.

1. Always check the resource first: `curl https://api.kopitools.link/public/knowledge/resources/<id>`
   (public, no auth). Read `tipo`, `title` and `originalName`, and confirm they match the requested
   service. If they don't match, or the call fails, stop and tell the user before changing anything.
2. If `tipo` is `AUDIO`:
   - In `servicios/<id>.html`, add the `<figure class="audio-recurso" data-kopi="<resource id>">` block
     (copy it from `servicios/codeartifact.html` or `bedrock.html`) right before `<h2 id="que-es">`, and
     add `<script src="../assets/audio-kopi.js" defer></script>` after `lectura.js`.
   - Add `"audio": true` to the service in `data/servicios.json`. Add the service to the list of Kopi
     audios in "Stack and layout" above and in `PLAN.md` ("Audios desde Kopi"). Run
     `python scripts/generar_sitemap.py`.
   - Run `python scripts/importar_aws.py` in `../arquitechthor-spider` (Tech Spider shows the 🎧 badge) and
     commit it there too.
3. For any other `tipo`, there is no pattern yet (`audio-kopi.js` only handles audio). Propose how to embed
   it, or ask where and how. Once agreed, document the new pattern in this section.

## Key services ("Servicios clave")

The owner names them while using the site (so far `vpc`, `organizations`, `s3`, `lambda`, `iam` and `bedrock`); never mark one on
your own. A key service has `"clave": true` in `servicios.json` and must have:
- **Highlight:** gradient border and "★ Servicio clave" chip on its catalog card (`catalogo.js`),
  plus the "★ Servicio clave" banner in its page header, which `scripts/revisar_texto.py --escribir
  <id>` inserts (and removes if `clave` is dropped).
- **A longer, deeper guide:** section `<h2 id="a-fondo">A fondo: temas avanzados</h2>` right
  before "Modelo de precios", with `<h3>` subsections (multi-account/multi-region patterns, quotas
  that drive a design, trade-offs, decision tables). Same as the Fase 5 deep-dive section.
- **At least 2 hard questions** (`"dificil": true`, criteria in "Hard questions" below).
`revisar_texto.py` prints `AVISO servicio clave` when the section or the hard questions are missing.

## Hard questions and the SAP-C03 deep dive (Phase 5)

A question gets `"dificil": true` (shown as ⚠ "Pregunta difícil") only if it reads like the real
SAP-C03 exam, not just because it is about an advanced service:
- A long scenario with **several constraints at once** (e.g. multi-account + compliance + least
  operational effort + cost).
- **Every option is technically possible**; only one (or the 2–3 of a multiple answer) meets all
  the constraints. Close distractors, none ruled out at a glance ("hacerlo a mano", "borrarlo todo"
  disqualify a question).
- It needs **two or more services combined**, or a specific limit, quota or behavior (e.g. AWS
  managed KMS keys can't be shared across accounts; MACsec isn't available on 1 Gbps Direct Connect).
- Multiple answer ("Elige 2/3") is common.
When unsure, leave it unmarked: the owner, who passed SAA and SAP-C02, says real questions are much
harder than this site's, so the tag must stay meaningful.

Phase 5 services (queues in `PLAN.md`) get the same `<h2 id="a-fondo">A fondo: temas avanzados</h2>`
section as key services (optional in the template, right before "Modelo de precios") and 5–10 new
hard questions spread across the SAP-C03 domains, with the correct answer in varied positions.

## Content rules (non-negotiable)

- **Spanish** for all user-facing text. Service names stay in English as AWS uses them.
  Categories are shown with the official AWS Spanish name plus the English name, e.g.
  "Computación (*Compute*)".
- **Easy to understand first.** Every acronym gets a **tooltip** with its English expansion
  and a short Spanish gloss (e.g. RPO → *Recovery Point Objective*: cuántos datos puedes
  permitirte perder), on every occurrence, instead of an inline parenthesis. Write acronyms bare
  in pages and questions; don't expand them in the text. Pages: `scripts/revisar_texto.py` wraps
  them in `<abbr class="sigla" data-s data-en data-es tabindex="0">` (the first occurrence also
  carries a screen-reader-only `.sigla-exp`). Questions stay plain text: `quiz.js` marks them at
  render time from `data/siglas.json`, which the script exports from its glossary `G`. A new
  acronym only needs a new entry in `G`. `assets/siglas.js` shows the tooltip on hover, focus or
  tap (on touch devices tapping is required, accepted by the owner).
- **Link every other AWS service mentioned** in a service page to its page on this site, even
  if it is not published yet: from `servicios/<id>.html` use `<id>.html` when that service is
  `publicado` and `../servicio.html?id=<id>` ("Próximamente") when it is `pendiente`. Link the
  first mention per section, not every occurrence. When a service gets published, update the
  links that point to its "Próximamente" page. Question JSON is plain text (no links).
- **No copying AWS documentation.** Summarize in your own words and link the source. Anything
  literal must be short, in `<blockquote>` with `<cite>` and a link.
- **Never real exam questions** (they are under NDA); only original ones.
- Keep the legal footer on every page, and keep `aviso-legal.html` consistent with any new
  feature (e.g. anything stored in `localStorage` must be covered by its privacy section).
- AWS icons are shown only next to the service/category name they identify (catalog cards,
  category filter, service page header) and in the games (Memoria, Empareja, Arquitecto); always **unmodified** (no
  recoloring or cropping) and excluded from the CC BY-SA 4.0 license (see `PLAN.md` decisions
  and `README.md`).
