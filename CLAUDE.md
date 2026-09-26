# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository context

`aws-cert-study` is one of the independent git repos in the `kopi/` workspace (see
`../CLAUDE.md`). It has **no runtime dependency** on the shared Kopi AWS backend: it is a
static study site for AWS certifications, published with **GitHub Pages** from `main` / root
at `https://arquitechthor.github.io/aws-cert-study/`. Every push to `main` redeploys it (no
workflow file; Pages builds the branch directly, and `.nojekyll` makes it serve files as-is).

**Read `PLAN.md` first.** It is the source of truth for phases, decisions and the next step
("Estado actual"). Update it (tick tasks, "Estado actual", "Registro de sesiones") at the end
of every work session so work can be resumed at any time.

## Stack and layout

Plain HTML/CSS/JS, **no framework, no build, no package.json** (same approach as
`kopi-web`, whose palette and base components were copied into `styles.css`).

- `index.html` + `assets/catalogo.js`: certification cards and the service catalog with
  filters (text, category, status, certifications with union/intersection mode). Filter state
  lives in the URL (`?q=&cat=&estado=&cert=A,B&modo=interseccion`). Certifications with
  `estado: "guia-pendiente"` are shown as cards only, never as filter chips.
- Study progress is client-only: `AwsDatos.leerProgreso()/guardarProgreso()` store correct
  answers per service in `localStorage` (`apuntes-aws.progreso`). `quiz.js` writes it; a
  published service whose questions are all answered correctly shows as "Finalizado" in the
  catalog. It is derived in the browser, never stored in `servicios.json`.
- `servicio.html` + `assets/servicio.js`: generic "Próximamente disponible" page
  (`?id=<id>`), used for every service with `estado: "pendiente"`. It redirects to
  `servicios/<id>.html` once the service is `publicado`.
- `servicios/<id>.html`: one page per published service, copied from
  `plantillas/servicio.html` (same folder depth, so the `../` paths keep working).
- `assets/datos.js`: shared loader (`window.AwsDatos`). It resolves every path against the
  site root derived from its own `<script src>`, so pages work at any depth and under the
  `/aws-cert-study/` subpath. **Always use relative paths**, never `/data/...`.
- `assets/quiz.js`: renders `<div class="quiz" data-quiz="<id>">` from
  `data/preguntas/<id>.json`.
- `aviso-legal.html`: legal notice, terms, trademarks, license and privacy.
- `data/servicios.json`, `data/categorias.json`, `data/certificaciones.json`: the catalog
  (schemas in `PLAN.md`). `data/fuentes/*.txt`: the original in-scope service lists from each
  exam guide, kept for diffing when AWS updates a guide.
- `data/asset-package/`: official AWS Architecture Icons, **gitignored** (29 MB). Only the
  64 px SVGs in use are copied to `assets/iconos/servicios/<id>.svg` (services with
  `"icono": true` in `servicios.json`) and `assets/iconos/categorias/<id>.svg` (all 21
  categories). `AwsDatos.iconoServicio()` falls back to the category icon when a service has
  none.

## Commands

```bash
python -m http.server 8765   # or: npx serve .   (fetch() of the JSON files fails on file://)
```

No build, lint or test tooling. Verify changes in a browser, including at ~375px width (no
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
   sensitive identifiers (account ID, bucket names, distribution IDs, ARNs).
3. Write `data/preguntas/<id>.json` with 5–15 **original** questions tagged with certification
   and domain (domain names from `certificaciones.json`).
4. In `data/servicios.json`, set `estado` to `"publicado"` and write `resumen`.
5. Serve locally, check the page and quiz, then commit and push to `main` (no PRs) and tick
   the service in the `PLAN.md` queue.

## Content rules (non-negotiable)

- **Spanish** for all user-facing text. Service names stay in English as AWS uses them.
  Categories are shown with the official AWS Spanish name plus the English name, e.g.
  "Computación (*Compute*)".
- **No copying AWS documentation.** Summarize in your own words and link the source. Anything
  literal must be short, in `<blockquote>` with `<cite>` and a link.
- **Never real exam questions** (they are under NDA); only original ones.
- Keep the legal footer on every page, and keep `aviso-legal.html` consistent with any new
  feature (e.g. anything stored in `localStorage` must be covered by its privacy section).
- AWS icons are shown only next to the service/category name they identify (catalog cards,
  category filter, service page header) and in the memory game; always **unmodified** (no
  recoloring or cropping) and excluded from the CC BY-SA 4.0 license (see `PLAN.md` decisions
  and `README.md`).
