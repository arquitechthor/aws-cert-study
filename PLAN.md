# Plan de trabajo: aws-cert-study

Web pública y estática con apuntes de estudio de servicios de AWS para certificaciones,
servida con GitHub Pages en `https://arquitechthor.github.io/aws-cert-study/`.

Este fichero sirve para **retomar el trabajo en cualquier momento**: antes de empezar una
sesión, lee "Estado actual"; al terminar, marca las tareas hechas y actualiza "Próximo paso".

---

## Estado actual

- **Fase en curso:** **Fase 2** (rellenar servicios). Publicados 23 de 164: los 12 que usa
  Kopi (IAM, Cognito, API Gateway, Lambda, DynamoDB, S3, CloudFront, Route 53, SES, Bedrock, ACM y
  CloudWatch) y, con ellos, los **17 comunes a las cinco certificaciones con guía** (se añadieron
  EC2, VPC, RDS, Aurora, ElastiCache, ECS, EKS, KMS, Secrets Manager, CloudTrail y OpenSearch
  Service, con 9 preguntas cada uno que cubren CLF, AIF, SAA, DVA y SAP). Las preguntas de los 6
  ya publicados antes de añadir CLF-C02 y DVA-C02 aún no cubren esas dos guías. La tarea 0.9 sigue
  programada para el 27/10/2026.
- **Próximo paso:** seguir la cola "Prioridad 0" por el primer servicio sin marcar
  (`organizations`, `ebs`, `elb`…), siguiendo el flujo de `CLAUDE.md`. Pendiente opcional: añadir
  preguntas de CLF-C02 y DVA-C02 a IAM, S3, Lambda, DynamoDB, CloudFront y CloudWatch.
- **Última actualización:** 2026-09-26

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Stack | HTML/CSS/JS puro, sin framework ni build ni `package.json`, igual que `kopi-web`. |
| Estilo | Paleta y componentes de `kopi-web/styles.css` (`--cyan`, `--violet`, `--magenta`, `--gradient-brand`), **copiados** porque los repos son independientes. |
| Hosting | Solo GitHub Pages (`arquitechthor.github.io/aws-cert-study/`). Sin dominio propio ni Route 53. |
| Nombre del repo | `aws-cert-study` (antes `knowledgement-aws`). |
| Certificaciones | **CLF-C02** (Cloud Practitioner), **AIF-C01** (AI Practitioner), **SAA-C03** (Solutions Architect – Associate), **DVA-C02** y **DVA-C03** (Developer – Associate) y **SAP-C02** y **SAP-C03** (Solutions Architect – Professional). Verificado el 2026-09-25 (SAA, SAP, AIF) y el 2026-09-26 (CLF, DVA) con las guías oficiales. En `certificaciones.json` van ordenadas por nivel. |
| DVA-C02 vs DVA-C03 | Igual que SAP: **certificaciones distintas**. DVA-C02 se retira (último día 01/12/2026) y DVA-C03 abre el registro el 27/10/2026, con `estado: "guia-pendiente"` y sin servicios hasta la tarea 0.9. CLF-C02 sigue vigente sin nueva versión anunciada (solo se retiran sus versiones en italiano y alemán tras el 31/12/2026). |
| SAP-C02 vs SAP-C03 | Son **certificaciones distintas** en el catálogo: una persona presenta SAP-C02 (último día 17/11/2026) y otra SAP-C03 (registro desde el 27/10/2026, sin guía publicada aún). SAP-C03 aparece en `certificaciones.json` con `estado: "guia-pendiente"` y sin servicios hasta la tarea 0.9. |
| Idioma | Español. Los nombres de servicio van en inglés, como los usa AWS. Las categorías usan la **traducción oficial de AWS** (guías en `es_es`) **con su nombre en inglés** como referencia, por ejemplo "Computación (*Compute*)". |
| Categorías | 21 categorías, la unión de las usadas en las guías ("Habilitación de clientes" (*Customer Enablement*) entró con CLF-C02, solo para AWS Support). "AWS Cost Management" (SAA) y "Cloud Financial Management" (SAP/AIF) se unifican como "Administración financiera en la nube". Cada servicio tiene una `categoria` principal (la más usada en las guías; si hay empate, la de SAP) y opcionalmente `categoriasAdicionales`. El filtro busca en ambas, así que "Sin servidor" (*Serverless*) muestra Lambda y Fargate aunque su categoría principal sea Computación. |
| Alias y fusiones | Las guías nombran el mismo servicio de formas distintas ("Amazon S3" / "Amazon Simple Storage Service (Amazon S3)"), así que se unifican en un id. Las funcionalidades que las guías listan aparte se fusionan en su servicio (`incluye`): Aurora Serverless → Aurora, CloudWatch Logs → CloudWatch, ECS Anywhere → ECS, EKS Anywhere/Distro → EKS, SageMaker JumpStart → SageMaker AI. "AWS VPN" (SAP) cubre Site-to-Site VPN y Client VPN. "Amazon Kinesis" (SAA) → Kinesis Data Streams. Amazon QuickSight aparece como Amazon Quick (nombre actual) con alias de búsqueda. |
| Licencia | **CC BY-SA 4.0** para todo el repo (sustituye a la GPL-3.0 inicial). |
| Derechos de autor | Nada de copiar documentación de AWS: se resume con palabras propias y se enlaza la fuente. Si algo debe ser literal (una definición, un límite), va entre comillas o en `<blockquote>` con cita y enlace a la fuente. |
| Iconos de AWS | Se usan los **AWS Architecture Icons oficiales** (paquete del 31/07/2025 en `data/asset-package/`) **junto al nombre de cada servicio y categoría** (tarjetas del catálogo, filtro de categoría y cabecera de las páginas de servicio; ampliado el 2026-09-26) y en el juego de memoria (Fase 4). Un servicio sin icono oficial muestra el de su categoría. AWS los permite para diagramas y materiales como presentaciones y pósteres, y sus *Trademark Guidelines* aceptan el uso limitado con fines educativos y sin ánimo de lucro; ni el catálogo ni un juego están citados de forma explícita: es una zona gris que se asume por ser un sitio personal, educativo y no comercial. Condiciones: iconos **sin modificar** (ni recolorear ni recortar), nada que sugiera patrocinio o afiliación con AWS, aviso de marcas en el pie y en el aviso legal, y quedan **fuera de la licencia CC BY-SA** (se indica en `README` y en el aviso legal). Si AWS lo pidiera, se retiran y se muestran solo los nombres. |
| Paquete de iconos en git | `data/asset-package/` (29 MB, con basura de macOS) está en `.gitignore`. Solo se versionan los SVG de 64 px de los servicios y categorías del catálogo, copiados a `assets/iconos/servicios/<id>.svg` y `assets/iconos/categorias/<id>.svg`. |
| Preguntas | Solo preguntas **originales** tipo examen. Nunca preguntas reales de examen, que están bajo NDA. |
| Enlaces a Kopi | En la navegación y el pie: "Kopi" → `https://kopitools.link` y "Sobre mí" → `https://arquitechthor.github.io/arquitechthor/` (web personal aparte, repo `arquitechthor`). `kopi-web` y la web personal enlazan a este sitio. |
| Flujo git | Directo a `main`, sin pull requests (igual que el resto de proyectos kopi). |
| Progreso del usuario | Sin cuentas ni backend: el progreso vive en `localStorage` (clave `apuntes-aws.progreso`, un objeto por servicio con las preguntas acertadas, el total y la fecha de finalización). Un servicio publicado pasa a **Finalizado** cuando se han acertado todas sus preguntas al menos una vez; si luego se añaden preguntas, vuelve a estar en curso. "Finalizado" no es un `estado` de `servicios.json`: se calcula en el navegador. |
| Filtro de certificaciones | Con varias marcadas, modo **Unión** (al menos una, por defecto) o **Intersección** (todas), en la URL como `modo=interseccion`. Las certificaciones con `estado: "guia-pendiente"` (SAP-C03, DVA-C03) **no salen como filtro** hasta tener guía y servicios; solo se ven en su tarjeta, y un `cert=` suyo en la URL se ignora. |
| Servicios pendientes | Sin archivos vacíos: un servicio con `estado: "pendiente"` enlaza a la página genérica `servicio.html?id=<id>` ("Próximamente disponible"). Al publicarlo se crea `servicios/<id>.html`. |

---

## Arquitectura prevista

```
aws-cert-study/
├── index.html                # portada: buscador + filtros + tarjetas de servicios
├── servicio.html             # "Próximamente disponible" genérica (?id=<id>)
├── memoria.html              # juego de memoria por categorías (Fase 4)
├── servicios/<id>.html       # una página por servicio publicado
├── data/
│   ├── servicios.json        # catálogo: única fuente de verdad
│   ├── categorias.json       # id, nombre en español y nombre en inglés
│   ├── certificaciones.json  # código, nombre, nivel, enlace a la guía oficial
│   ├── preguntas/<id>.json   # preguntas de práctica por servicio
│   └── fuentes/<código>.txt  # listas originales de servicios en alcance de cada guía
├── assets/
│   ├── catalogo.js           # filtros, tarjetas y estado de filtros en la URL
│   ├── servicio.js           # página genérica "Próximamente"
│   ├── quiz.js               # renderiza y corrige preguntas
│   ├── memoria.js            # juego de memoria (Fase 4)
│   ├── iconos/servicios/<id>.svg   # iconos oficiales de AWS (servicios)
│   ├── iconos/categorias/<id>.svg  # iconos oficiales de AWS (categorías)
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
  "id": "ecs",
  "nombre": "Amazon ECS",
  "nombreCompleto": "Amazon Elastic Container Service (Amazon ECS)",
  "categoria": "contenedores",
  "icono": true,
  "certificaciones": ["SAA-C03", "SAP-C02", "AIF-C01"],
  "incluye": ["Amazon ECS Anywhere"],
  "estado": "pendiente",
  "resumen": ""
}
```

`nombreCompleto`, `categoriasAdicionales`, `incluye` y `alias` son opcionales.
`documentacion` es la URL de la documentación oficial principal del servicio (comprobada con una
petición HTTP 200 el 2026-09-26); solo falta en servicios retirados sin documentación publicada
(`elastic-transcoder`, `iot-events`), que enlazan a la búsqueda de docs.aws.amazon.com. `kopi: true` marca los
servicios que usa Kopi (su guía incluye "Así lo uso en Kopi") y alimenta el filtro "Usados en
Kopi" (`kopi=1` en la URL). `icono: true`
indica que existe `assets/iconos/servicios/<id>.svg`; si falta, se usa el icono de la categoría.
Todas las categorías tienen icono en `assets/iconos/categorias/<id>.svg`. `resumen` se
redacta al publicar el servicio en la Fase 2. `data/fuentes/<código>.txt` guarda la lista
original de cada guía, con su URL y fecha de extracción, para poder comparar cuando cambie.

`data/categorias.json`:

```json
{ "id": "computacion", "nombre": "Computación", "nombreEn": "Compute" }
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

`tipo` puede ser `"unica"` o `"multiple"` (elegir 2 o más, como en el examen). AIF-C01
también usa preguntas de **ordenar** (*ordering*) y **emparejar** (*matching*); se añadirán a
`quiz.js` como `"ordenar"` y `"emparejar"` (tarea 3.7).

`data/certificaciones.json` incluye, por certificación: código, nombre, nivel, estado
(`vigente`, `retirandose`, `guia-pendiente`), fechas, enlace a la guía, formato del examen y
dominios con su nombre en español/inglés y su peso (%).

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
9. **Así lo uso en Kopi** (opcional, solo si Kopi usa el servicio): uso real y lección
   práctica, sin identificadores sensibles (cuenta, buckets, ARN).
10. **Preguntas de práctica**, cargadas desde `data/preguntas/<id>.json`.
11. **Fuentes:** enlaces a la documentación oficial y citas de lo que sea literal.
12. **Pie de página** con navegación: Kopi, Sobre mí, licencia CC BY-SA 4.0.

### Filtros de la portada

- Texto libre (nombre del servicio).
- Categoría (chips o desplegable, con el nombre en español y el inglés como referencia; busca en `categoria` y `categoriasAdicionales`).
- Certificación (chips de selección múltiple).
- Estado: todos o solo publicados.
- El estado de los filtros se refleja en la URL (`?cert=SAA-C03&cat=computacion&q=ec2`), para
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

- [x] **0.1** Renombrar el repo en GitHub: `knowledgement-aws` → `aws-cert-study`
      (Settings → General → Repository name). Después, actualizar el remoto local y renombrar la carpeta.
      *Hecho: remoto `https://github.com/arquitechthor/aws-cert-study.git`, carpeta `kopi/aws-cert-study/`.*
- [x] **0.2** Configurar el MCP de AWS en el proyecto (`.mcp.json`):
      `claude mcp add --transport http --scope project aws-knowledge https://knowledge-mcp.global.api.aws`
      *Hecho: `.mcp.json` creado y endpoint probado (responde a `tools/list`). Claude Code lo carga
      al arrancar una sesión en esta carpeta y pide aprobarlo la primera vez.*
- [x] **0.3** Verificar los códigos vigentes de las 3 certificaciones (SAA-C03, SAP-C02,
      AIF-C01) y localizar la guía de examen oficial de cada una.
      *Hecho: SAA-C03 y AIF-C01 vigentes, sin nueva versión anunciada. SAP-C02 se retira el
      17/11/2026 y SAP-C03 abre el 27/10/2026 (ver decisiones). Enlaces en `certificaciones.json`.*
- [x] **0.4** Extraer de cada guía los dominios y sus pesos (%), que se usarán para etiquetar las preguntas.
      *Hecho: en `certificaciones.json`, junto con el formato del examen.*
- [x] **0.5** Extraer de cada guía el apéndice de servicios en alcance (*in-scope services*)
      por categoría.
      *Hecho: `data/fuentes/SAA-C03.txt` (16 categorías), `SAP-C02.txt` (19) y `AIF-C01.txt` (11).*
- [x] **0.6** Unificar las categorías de las 3 guías en `categorias.json`, con nombre en
      español + inglés. Decidir qué hacer con los servicios que aparecen en categorías distintas
      según la guía (propuesta: una categoría principal por servicio).
      *Hecho: 20 categorías; principal + adicionales (ver decisiones).*
- [x] **0.7** Construir `servicios.json` completo, todo en `pendiente`, con la lista de
      certificaciones de cada servicio.
      *Hecho: 155 servicios únicos tras unificar alias.*
- [x] **0.8** Definir el orden de prioridad para la Fase 2 (propuesta: primero los servicios
      que comparten SAA y SAP, luego los de AIF) y volcarlo en la cola de la Fase 2 de este fichero.
      *Hecho: núcleo primero y después por número de guías. Lo exclusivo de SAP va antes que lo
      de AIF por la fecha límite de SAP-C02.*
- [ ] **0.9** **A partir del 27/10/2026:** descargar las guías SAP-C03 y DVA-C03, guardar sus listas en
      `data/fuentes/SAP-C03.txt` y `DVA-C03.txt`, añadir `SAP-C03`/`DVA-C03` a los servicios que
      corresponda (y crear los nuevos), completar sus dominios y examen en `certificaciones.json`,
      cambiar su `estado` a `"vigente"` y añadir a la cola los servicios nuevos.
- [x] **0.10** Añadir CLF-C02 y DVA-C02 (y DVA-C03 como pendiente de guía).
      *Hecho el 2026-09-26: `data/fuentes/CLF-C02.txt` (111 servicios, 19 categorías) y
      `DVA-C02.txt` (47, 10), dominios y examen en `certificaciones.json`, 9 servicios nuevos (164
      en total) y la categoría "Habilitación de clientes". Nombres genéricos de las guías: "Amazon
      Kinesis" → Kinesis Data Streams + Data Firehose (como en SAA), "AWS VPN" → Site-to-Site VPN +
      Client VPN, "Amazon Q Developer" → Amazon Q. Los chips de certificación y la meta
      description de las páginas ya publicadas se regeneraron desde `servicios.json`.*

## Fase 1: esqueleto publicado

Objetivo: el sitio navegable en GitHub Pages, con todos los servicios en "Próximamente".

- [x] **1.1** Sustituir `LICENSE` por el texto de CC BY-SA 4.0 y actualizar `README.md`.
- [x] **1.2** `styles.css`: copiar variables y componentes base de `kopi-web` y añadir los
      estilos de filtros, chips, tarjetas de servicio y quiz.
- [x] **1.3** Navegación y pie comunes: enlaces a Kopi (`https://kopitools.link`), Sobre mí
      (`https://kopitools.link/#sobre-mi`, luego `https://arquitechthor.github.io/arquitechthor/` — ver 3.5), licencia y repo. Incluir `nav.js` con el menú móvil.
- [x] **1.4** `index.html` + `catalogo.js`: hero breve, filtros, contador de resultados y
      tarjetas (nombre, categoría es/en, certificaciones, badge de estado).
- [x] **1.5** `servicio.html` + `servicio.js`: página genérica "Próximamente disponible" que
      lee `?id=`, muestra el nombre, la categoría y las certificaciones del servicio y enlaza de vuelta al catálogo.
- [x] **1.6** `plantillas/servicio.html` con la estructura fija de 11 secciones y `quiz.js`
      (preguntas de opción única y múltiple, corrección, explicación, fuentes).
- [x] **1.7** Favicon y metadatos (`<title>`, `description`, Open Graph) en español.
- [x] **1.8** `CLAUDE.md` del repo: reglas del proyecto y el flujo paso a paso de "rellenar un servicio".
- [x] **1.9** Añadir el proyecto a la tabla de `kopi/CLAUDE.md` (workspace).
- [x] **1.10** Añadir `.nojekyll` y comprobar que el sitio carga y los filtros funcionan en producción.
- [x] **1.11** Mostrar en la tarjeta de cada certificación su estado: "Se retira el 17/11/2026"
      en SAP-C02 y "Guía disponible a partir del 27/10/2026" en SAP-C03.
- [x] **1.12** Guardas legales: `aviso-legal.html` (naturaleza personal, educativa y no
      comercial; sin afiliación con AWS; marcas e iconos; preguntas originales y NDA de los
      exámenes; sin garantía de exactitud ni de aprobar; limitación de responsabilidad, incluidos
      cargos en cuentas de AWS; licencia y exclusiones; solicitudes de retirada; enlaces externos;
      privacidad: sin cookies ni analítica, `localStorage` solo local, registros de GitHub Pages;
      cambios; contacto por GitHub Issues). Pie legal resumido en todas las páginas y aviso en el
      `README.md`. *No es asesoramiento jurídico: si el sitio creciera o se monetizara, conviene
      revisarlo con un profesional.*

GitHub Pages quedó activado a mano (Settings → Pages → Deploy from a branch → `main` / root).
Cada push a `main` redespliega el sitio.

## Fase 2: rellenar servicios (iterativa)

Objetivo: publicar servicios uno a uno. Flujo por servicio:

1. Consultar la documentación con el MCP `aws-knowledge` (`search_documentation`, `read_documentation`).
   Comprobar también si el servicio está **discontinuado o cerrado a nuevos clientes**: la guía
   SAP-C02 incluye algunos antiguos (por ejemplo IoT Things Graph, IoT 1-Click, Elastic Transcoder
   o Proton). Si lo está, se indica con un aviso en la página y se explica qué lo sustituye.
2. Copiar `plantillas/servicio.html` a `servicios/<id>.html` y redactar las secciones con
   palabras propias, citando lo literal.
3. Crear `data/preguntas/<id>.json` con 5–15 preguntas originales etiquetadas por certificación y dominio.
4. Cambiar `estado` a `"publicado"` en `servicios.json`.
5. Revisar en local (`npx serve .`), hacer commit y push a `main` y marcar el servicio aquí.

### Cola de servicios

Se rellenará en la tarea 0.8. El estado real de cada servicio vive en `servicios.json`;
esta lista es solo el orden de trabajo.

#### Prioridad 0: núcleo (base para todo lo demás, en este orden) (20)

- [x] `iam` AWS IAM — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02, AIF-C01)
- [ ] `organizations` AWS Organizations — Administración y gobernanza (SAA-C03, SAP-C02)
- [x] `vpc` Amazon VPC — Redes y entrega de contenido (SAA-C03, SAP-C02, AIF-C01)
- [x] `ec2` Amazon EC2 — Computación (SAA-C03, SAP-C02, AIF-C01)
- [ ] `ebs` Amazon EBS — Almacenamiento (SAA-C03, SAP-C02)
- [ ] `elb` Elastic Load Balancing (ELB) — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [ ] `ec2-auto-scaling` Amazon EC2 Auto Scaling — Computación (SAA-C03, SAP-C02)
- [x] `s3` Amazon S3 — Almacenamiento (SAA-C03, SAP-C02, AIF-C01)
- [ ] `efs` Amazon EFS — Almacenamiento (SAA-C03, SAP-C02)
- [x] `rds` Amazon RDS — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [x] `aurora` Amazon Aurora — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [x] `dynamodb` Amazon DynamoDB — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [x] `lambda` AWS Lambda — Computación (SAA-C03, SAP-C02, AIF-C01)
- [x] `route-53` Amazon Route 53 — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [x] `cloudfront` Amazon CloudFront — Redes y entrega de contenido (SAA-C03, SAP-C02, AIF-C01)
- [ ] `sqs` Amazon SQS — Integración de aplicaciones (SAA-C03, SAP-C02)
- [ ] `sns` Amazon SNS — Integración de aplicaciones (SAA-C03, SAP-C02)
- [x] `kms` AWS KMS — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02, AIF-C01)
- [x] `cloudwatch` Amazon CloudWatch — Administración y gobernanza (SAA-C03, SAP-C02, AIF-C01)
- [x] `cloudtrail` AWS CloudTrail — Administración y gobernanza (SAA-C03, SAP-C02, AIF-C01)

#### Prioridad 1: resto de servicios en las tres guías (SAA + SAP + AIF) (30)

- [ ] `budgets` AWS Budgets — Administración financiera en la nube (SAA-C03, SAP-C02, AIF-C01)
- [ ] `cost-explorer` AWS Cost Explorer — Administración financiera en la nube (SAA-C03, SAP-C02, AIF-C01)
- [ ] `config` AWS Config — Administración y gobernanza (SAA-C03, SAP-C02, AIF-C01)
- [ ] `trusted-advisor` AWS Trusted Advisor — Administración y gobernanza (SAA-C03, SAP-C02, AIF-C01)
- [ ] `well-architected-tool` AWS Well-Architected Tool — Administración y gobernanza (SAA-C03, SAP-C02, AIF-C01)
- [ ] `s3-glacier` Amazon S3 Glacier — Almacenamiento (SAA-C03, SAP-C02, AIF-C01)
- [ ] `data-exchange` AWS Data Exchange — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [ ] `emr` Amazon EMR — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [ ] `glue` AWS Glue — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [ ] `lake-formation` AWS Lake Formation — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [x] `opensearch-service` Amazon OpenSearch Service — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [ ] `quick` Amazon Quick — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [ ] `redshift` Amazon Redshift — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [ ] `documentdb` Amazon DocumentDB — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [x] `elasticache` Amazon ElastiCache — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [ ] `neptune` Amazon Neptune — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [x] `ecs` Amazon ECS — Contenedores (SAA-C03, SAP-C02, AIF-C01)
- [x] `eks` Amazon EKS — Contenedores (SAA-C03, SAP-C02, AIF-C01)
- [ ] `comprehend` Amazon Comprehend — Machine learning (SAA-C03, SAP-C02, AIF-C01)
- [ ] `lex` Amazon Lex — Machine learning (SAA-C03, SAP-C02, AIF-C01)
- [ ] `polly` Amazon Polly — Machine learning (SAA-C03, SAP-C02, AIF-C01)
- [ ] `rekognition` Amazon Rekognition — Machine learning (SAA-C03, SAP-C02, AIF-C01)
- [ ] `sagemaker-ai` Amazon SageMaker AI — Machine learning (SAA-C03, SAP-C02, AIF-C01)
- [ ] `textract` Amazon Textract — Machine learning (SAA-C03, SAP-C02, AIF-C01)
- [ ] `transcribe` Amazon Transcribe — Machine learning (SAA-C03, SAP-C02, AIF-C01)
- [ ] `translate` Amazon Translate — Machine learning (SAA-C03, SAP-C02, AIF-C01)
- [ ] `artifact` AWS Artifact — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02, AIF-C01)
- [ ] `inspector` Amazon Inspector — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02, AIF-C01)
- [ ] `macie` Amazon Macie — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02, AIF-C01)
- [x] `secrets-manager` AWS Secrets Manager — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02, AIF-C01)

#### Prioridad 2: SAA-C03 + SAP-C02 (64)

- [ ] `cost-and-usage-report` AWS Cost and Usage Report — Administración financiera en la nube (SAA-C03, SAP-C02)
- [ ] `savings-plans` Savings Plans — Administración financiera en la nube (SAA-C03, SAP-C02)
- [ ] `cli` AWS CLI — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `cloudformation` AWS CloudFormation — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `compute-optimizer` AWS Compute Optimizer — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `control-tower` AWS Control Tower — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `health-dashboard` AWS Health Dashboard — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `license-manager` AWS License Manager — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `managed-grafana` Amazon Managed Grafana — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `managed-service-for-prometheus` Amazon Managed Service for Prometheus — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `management-console` AWS Management Console — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `service-catalog` AWS Service Catalog — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `systems-manager` AWS Systems Manager — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `backup` AWS Backup — Almacenamiento (SAA-C03, SAP-C02)
- [ ] `fsx` Amazon FSx — Almacenamiento (SAA-C03, SAP-C02)
- [ ] `storage-gateway` AWS Storage Gateway — Almacenamiento (SAA-C03, SAP-C02)
- [ ] `athena` Amazon Athena — Análisis (SAA-C03, SAP-C02)
- [ ] `data-firehose` Amazon Data Firehose — Análisis (SAA-C03, SAP-C02)
- [ ] `kinesis-data-streams` Amazon Kinesis Data Streams — Análisis (SAA-C03, SAP-C02)
- [ ] `msk` Amazon MSK — Análisis (SAA-C03, SAP-C02)
- [ ] `keyspaces` Amazon Keyspaces — Base de datos (SAA-C03, SAP-C02)
- [ ] `auto-scaling` AWS Auto Scaling — Computación (SAA-C03, SAP-C02)
- [ ] `batch` AWS Batch — Computación (SAA-C03, SAP-C02)
- [ ] `elastic-beanstalk` AWS Elastic Beanstalk — Computación (SAA-C03, SAP-C02)
- [ ] `fargate` AWS Fargate — Computación (SAA-C03, SAP-C02)
- [ ] `outposts` AWS Outposts — Computación (SAA-C03, SAP-C02)
- [ ] `serverless-application-repository` AWS Serverless Application Repository — Computación (SAA-C03)
- [ ] `vmware-cloud-on-aws` VMware Cloud on AWS — Computación (SAA-C03)
- [ ] `wavelength` AWS Wavelength — Computación (SAA-C03, SAP-C02)
- [ ] `ecr` Amazon ECR — Contenedores (SAA-C03, SAP-C02)
- [x] `api-gateway` Amazon API Gateway — Frontend web y móvil (SAA-C03, SAP-C02)
- [ ] `amplify` AWS Amplify — Frontend web y móvil (SAA-C03, SAP-C02)
- [ ] `device-farm` AWS Device Farm — Frontend web y móvil (SAA-C03, SAP-C02)
- [ ] `x-ray` AWS X-Ray — Herramientas para desarrolladores (SAA-C03, SAP-C02)
- [ ] `appflow` Amazon AppFlow — Integración de aplicaciones (SAA-C03, SAP-C02)
- [ ] `eventbridge` Amazon EventBridge — Integración de aplicaciones (SAA-C03, SAP-C02)
- [ ] `mq` Amazon MQ — Integración de aplicaciones (SAA-C03, SAP-C02)
- [ ] `step-functions` AWS Step Functions — Integración de aplicaciones (SAA-C03, SAP-C02)
- [ ] `application-migration-service` AWS Application Migration Service — Migración y transferencia (SAA-C03, SAP-C02)
- [ ] `dms` AWS DMS — Migración y transferencia (SAA-C03, SAP-C02)
- [ ] `datasync` AWS DataSync — Migración y transferencia (SAA-C03, SAP-C02)
- [ ] `snow-family` AWS Snow Family — Migración y transferencia (SAA-C03, SAP-C02)
- [ ] `transfer-family` AWS Transfer Family — Migración y transferencia (SAA-C03, SAP-C02)
- [ ] `client-vpn` AWS Client VPN — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [ ] `direct-connect` AWS Direct Connect — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [ ] `global-accelerator` AWS Global Accelerator — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [ ] `privatelink` AWS PrivateLink — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [ ] `site-to-site-vpn` AWS Site-to-Site VPN — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [ ] `transit-gateway` AWS Transit Gateway — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [x] `acm` AWS Certificate Manager (ACM) — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `cloudhsm` AWS CloudHSM — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [x] `cognito` Amazon Cognito — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `detective` Amazon Detective — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `directory-service` AWS Directory Service — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `firewall-manager` AWS Firewall Manager — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `guardduty` Amazon GuardDuty — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `iam-identity-center` AWS IAM Identity Center — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `network-firewall` AWS Network Firewall — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `ram` AWS RAM — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `security-hub` AWS Security Hub — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `shield` AWS Shield — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `waf` AWS WAF — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `elastic-transcoder` Amazon Elastic Transcoder — Servicios multimedia (SAA-C03, SAP-C02)
- [ ] `kinesis-video-streams` Amazon Kinesis Video Streams — Servicios multimedia (SAA-C03, SAP-C02)

#### Prioridad 3: solo SAP-C02 (fecha límite 17/11/2026) (33)

- [ ] `proton` AWS Proton — Administración y gobernanza (SAP-C02)
- [ ] `service-quotas` Service Quotas — Administración y gobernanza (SAP-C02)
- [ ] `elastic-disaster-recovery` AWS Elastic Disaster Recovery — Almacenamiento (SAP-C02)
- [ ] `managed-service-for-apache-flink` Amazon Managed Service for Apache Flink — Análisis (SAP-C02)
- [x] `ses` Amazon SES — Aplicaciones empresariales (SAP-C02)
- [ ] `timestream` Amazon Timestream — Base de datos (SAP-C02)
- [ ] `managed-blockchain` Amazon Managed Blockchain — Blockchain (SAP-C02)
- [ ] `app-runner` AWS App Runner — Computación (SAP-C02)
- [ ] `lightsail` Amazon Lightsail — Computación (SAP-C02)
- [ ] `appstream-2-0` Amazon AppStream 2.0 — Computación para usuarios finales (SAP-C02)
- [ ] `workspaces` Amazon WorkSpaces — Computación para usuarios finales (SAP-C02)
- [ ] `pinpoint` Amazon Pinpoint — Frontend web y móvil (SAP-C02)
- [ ] `codeartifact` AWS CodeArtifact — Herramientas para desarrolladores (SAP-C02)
- [ ] `codebuild` AWS CodeBuild — Herramientas para desarrolladores (SAP-C02)
- [ ] `codedeploy` AWS CodeDeploy — Herramientas para desarrolladores (SAP-C02)
- [ ] `codeguru` Amazon CodeGuru — Herramientas para desarrolladores (SAP-C02)
- [ ] `codepipeline` AWS CodePipeline — Herramientas para desarrolladores (SAP-C02)
- [ ] `appsync` AWS AppSync — Integración de aplicaciones (SAP-C02)
- [ ] `iot-1-click` AWS IoT 1-Click — Internet de las cosas (IoT) (SAP-C02)
- [ ] `iot-core` AWS IoT Core — Internet de las cosas (IoT) (SAP-C02)
- [ ] `iot-device-defender` AWS IoT Device Defender — Internet de las cosas (IoT) (SAP-C02)
- [ ] `iot-device-management` AWS IoT Device Management — Internet de las cosas (IoT) (SAP-C02)
- [ ] `iot-events` AWS IoT Events — Internet de las cosas (IoT) (SAP-C02)
- [ ] `iot-greengrass` AWS IoT Greengrass — Internet de las cosas (IoT) (SAP-C02)
- [ ] `iot-sitewise` AWS IoT SiteWise — Internet de las cosas (IoT) (SAP-C02)
- [ ] `iot-things-graph` AWS IoT Things Graph — Internet de las cosas (IoT) (SAP-C02)
- [ ] `fraud-detector` Amazon Fraud Detector — Machine learning (SAP-C02)
- [ ] `kendra` Amazon Kendra — Machine learning (SAP-C02)
- [ ] `application-discovery-service` AWS Application Discovery Service — Migración y transferencia (SAP-C02)
- [ ] `migration-hub` AWS Migration Hub — Migración y transferencia (SAP-C02)
- [ ] `sct` AWS SCT — Migración y transferencia (SAP-C02)
- [ ] `audit-manager` AWS Audit Manager — Seguridad, identidad y cumplimiento (SAP-C02)
- [ ] `sts` AWS STS — Seguridad, identidad y cumplimiento (SAP-C02)

#### Prioridad 4: AI Practitioner (AIF-C01) (8)

- [ ] `glue-databrew` AWS Glue DataBrew — Análisis (AIF-C01)
- [ ] `kiro` Kiro — Herramientas para desarrolladores (AIF-C01)
- [ ] `strands-agents` Strands Agents — Herramientas para desarrolladores (AIF-C01)
- [x] `bedrock` Amazon Bedrock — Machine learning (AIF-C01)
- [ ] `bedrock-agentcore` Amazon Bedrock AgentCore — Machine learning (AIF-C01)
- [ ] `nova` Amazon Nova — Machine learning (AIF-C01)
- [ ] `personalize` Amazon Personalize — Machine learning (SAP-C02, AIF-C01)
- [ ] `transform` AWS Transform — Machine learning (AIF-C01)

#### Prioridad 5: nuevos con CLF-C02 y DVA-C02 (9)

Primero los de DVA-C02 por su fecha límite (01/12/2026). Las certificaciones entre paréntesis del
resto de la cola son las de cuando se creó; las actuales están en `servicios.json`.

- [ ] `amazon-q` Amazon Q — Machine learning (CLF-C02, DVA-C02)
- [ ] `appconfig` AWS AppConfig — Administración y gobernanza (DVA-C02)
- [ ] `cdk` AWS CDK — Administración y gobernanza (DVA-C02)
- [ ] `cloudshell` AWS CloudShell — Herramientas para desarrolladores (DVA-C02)
- [ ] `connect` Amazon Connect — Aplicaciones empresariales (CLF-C02)
- [ ] `marketplace` AWS Marketplace — Administración financiera en la nube (CLF-C02)
- [ ] `migration-evaluator` Migration Evaluator — Migración y transferencia (CLF-C02)
- [ ] `support` AWS Support — Habilitación de clientes (CLF-C02)
- [ ] `workspaces-secure-browser` Amazon WorkSpaces Secure Browser — Computación para usuarios finales (CLF-C02)

## Fase 3: extras (opcional)

- [ ] **3.1** Simulacro por certificación: mezcla preguntas de todos los servicios, con
      temporizador y puntuación por dominio.
- [ ] **3.2** Progreso personal en `localStorage`: servicios estudiados, preguntas falladas y repaso.
- [ ] **3.3** `sitemap.xml` + `robots.txt`.
- [ ] **3.4** Enlace a este sitio desde `kopi-web` (en otro repo).
- [x] **3.5** Cambiar "Sobre mí" a la futura web independiente cuando exista. → `https://arquitechthor.github.io/arquitechthor/` (26/09/2026).
- [ ] **3.6** Ampliar a más certificaciones si hace falta (el modelo ya lo permite).
- [ ] **3.7** Tipos de pregunta "ordenar" y "emparejar" en `quiz.js` (los usa AIF-C01).

## Fase 4: juego de memoria por categorías

Objetivo: un juego tipo memoria (memorama) en `memoria.html` para aprender a qué categoría
pertenece cada servicio. Solo depende de la Fase 1 (catálogo y estilos), no del contenido de la
Fase 2, así que puede hacerse en cualquier momento después de la Fase 1.

**Reglas:**
- Las cartas empiezan boca abajo. Cada carta es **un servicio distinto** y muestra su
  **icono oficial** y su nombre.
- Se voltean dos cartas por turno. Son **pareja si los dos servicios son de la misma categoría**
  (se compara con `categoria`, la principal), por ejemplo Amazon EC2 + AWS Lambda (Computación).
- **Puede haber muchos servicios de la misma categoría en el tablero**, y una carta puede
  emparejarse con cualquiera de ellos: no hay una pareja "correcta" única. Esto es lo que
  sube la dificultad, porque obliga a razonar la categoría en vez de recordar un icono.
- Al acertar, las cartas quedan descubiertas y se muestra la categoría en español e inglés.
  Al fallar, se vuelven a tapar tras una pausa breve y se muestran las categorías de ambas,
  para aprender del error.
- Al terminar: movimientos, aciertos a la primera, tiempo y botón de revancha.

**Configuración:**
- **Tamaño del tablero**: el mínimo es **6×6 (36 cartas)** y sube hasta el máximo que permitan
  los servicios con icono del filtro elegido: 6×6 (36), 6×8 (48), 8×8 (64), 8×10 (80),
  10×10 (100), 10×12 (120) y 12×12 (144). Solo se ofrecen los tamaños que caben en el filtro.
  Con el catálogo completo (unos 150 servicios con icono) se llega a 10×12 o 12×12, según
  cuántos iconos casen en la tarea 4.1. Con AIF-C01 (50 servicios) solo cabe 6×6 o 6×8.
- **Filtro por certificación** (SAA-C03, SAP-C02, SAP-C03 o AIF-C01, o todo el catálogo) y,
  opcionalmente, por un subconjunto de categorías.
- **Modo difícil:** solo icono, sin nombre del servicio.
- La configuración se refleja en la URL (`memoria.html?tablero=8x8&cert=SAA-C03&dificil=1`)
  y la última usada se recuerda en `localStorage` (ya cubierto en la sección de privacidad
  del aviso legal).

**Generación del tablero:** se eligen al azar N servicios distintos del filtro, con la
condición de que **cada categoría aparezca un número par de veces**. Así el tablero siempre
se puede vaciar por completo, sin cartas huérfanas. El tamaño máximo ofrecido es la suma, por
categoría, de su número de servicios redondeado hacia abajo a par. En cada partida se eligen
servicios distintos.

**Tamaños grandes y móvil:** el tamaño del tablero fija el **número de cartas**, no la
disposición. En pantallas estrechas las columnas se reducen (máximo 6 en móvil) y el tablero
crece en vertical: **nunca desplazamiento horizontal**. Las cartas tienen un tamaño mínimo
táctil de unos 56 px; en modo normal el nombre puede truncarse con el nombre completo en
`aria-label`/tooltip.

**Tareas:**
- [x] **4.1** Mapear cada servicio de `servicios.json` a su icono del paquete
      (`Architecture-Service-Icons_07312025/Arch_<Categoría>/64/Arch_<Servicio>_64.svg`) con un
      script puntual, y revisar a mano los que no casen por nombre.
- [x] **4.2** Copiar solo esos SVG a `assets/iconos/servicios/<id>.svg` (y los 20 de categoría a
      `assets/iconos/categorias/<id>.svg`) y añadir el campo `icono` en `servicios.json`. Hecho el
      2026-09-26 junto con los iconos del catálogo: 145 de 155 tienen icono. Sin icono oficial en
      el paquete del 31/07/2025, y por tanto fuera del juego: `bedrock-agentcore`, `iot-1-click`,
      `iot-things-graph`, `kiro`, `quick`, `sct`, `service-quotas`, `strands-agents`, `sts` y
      `vmware-cloud-on-aws`. Mapeos a mano: `snow-family` → AWS Snowball, `outposts` → AWS Outposts
      family, `workspaces` → Amazon WorkSpaces Family.
- [x] **4.3** Aviso de marcas (el aviso legal general ya existe desde la tarea 1.12): "Amazon Web Services, AWS y los iconos de sus servicios son marcas
      de Amazon.com, Inc. o sus filiales. Este sitio no está afiliado ni patrocinado por AWS."
      Va en el pie del juego y del sitio, con la excepción de licencia en `LICENSE`/`README`.
- [ ] **4.4** `memoria.html` + `memoria.js`: tablero con CSS grid responsive (columnas
      según el ancho, máximo 6 en móvil, solo desplazamiento vertical), animación de volteo,
      contador de movimientos y temporizador.
- [ ] **4.5** Panel de configuración: tamaño de tablero, certificación, categorías, modo difícil.
- [ ] **4.6** Generador de tablero: N servicios distintos al azar con un número par por
      categoría; cálculo del tamaño máximo disponible para el filtro elegido.
- [ ] **4.7** Pantalla final con resumen y, para cada pareja acertada, enlace a la página
      del servicio (o a "Próximamente" si aún está pendiente).
- [ ] **4.8** Accesibilidad: cartas como `<button>` con `aria-label` ("Carta boca abajo" /
      nombre y categoría al voltear) y juego completo con teclado.
- [ ] **4.9** Enlace al juego en la navegación y en la portada.
- [ ] **4.10** Opcional: mejores marcas por tamaño de tablero en `localStorage`.

---

## Registro de sesiones

| Fecha | Qué se hizo |
|---|---|
| 2026-09-25 | Plan creado. Decisiones iniciales: 3 certificaciones, GitHub Pages, CC BY-SA 4.0, nombre `aws-cert-study`. |
| 2026-09-25 | Fase 0: repo renombrado, `.mcp.json`, guías verificadas (SAP-C02 se retira y SAP-C03 entra como certificación aparte), `servicios.json` (155), `categorias.json` (20), `certificaciones.json`, `data/fuentes/` y cola priorizada. |
| 2026-09-25 | Añadida la Fase 4 (juego de memoria con iconos oficiales de AWS); `data/asset-package/` en `.gitignore`. |
| 2026-09-25 | Fase 1 completada: portada con filtros, página "Próximamente", plantilla + quiz, aviso legal, licencia CC BY-SA 4.0, `CLAUDE.md`. Fase 4 revisada: tablero mínimo 6×6 y parejas por categoría con varias cartas posibles. |
| 2026-09-25 | Fase 2 iniciada: publicados los 12 servicios que usa Kopi, con sección "Así lo uso en Kopi" y 62 preguntas originales. MCP `aws-knowledge` usado por JSON-RPC desde la sesión (funciona sin autenticación); datos contrastados con la documentación actual (p. ej. carga asíncrona de Lambda de 1 MB, objetos de S3 de hasta ~50 TB, certificados de ACM de 198 días). |
| 2026-09-26 | Iconos oficiales de AWS en el catálogo: icono de servicio y de categoría en las tarjetas, icono de la categoría elegida en el filtro y en la cabecera de las páginas de servicio (y en la plantilla). Tareas 4.1–4.3 adelantadas; decisión de iconos, aviso legal y pie actualizados. |
| 2026-09-26 | Enlace a la documentación oficial en la cabecera de cada servicio (campo `documentacion`, 153 de 155 URLs comprobadas), estado "Finalizado" por progreso local en `localStorage` (barra de progreso en el quiz, insignia en la tarjeta, filtro "Solo finalizados") y modo Unión/Intersección en el filtro de certificaciones. |
| 2026-09-26 | Añadidas CLF-C02 (Cloud Practitioner) y DVA-C02 (Developer – Associate, se retira el 01/12/2026), más DVA-C03 como pendiente de guía: fuentes, dominios, 9 servicios nuevos (164), categoría "Habilitación de clientes", chips de las páginas publicadas regenerados. Tarea 0.10. |
| 2026-09-26 | Las certificaciones con la guía pendiente (SAP-C03, DVA-C03) dejan de aparecer en el filtro de certificaciones; siguen en las tarjetas. |
| 2026-09-26 | Publicados los 11 servicios pendientes de los 17 comunes a las cinco guías (EC2, VPC, RDS, Aurora, ElastiCache, ECS, EKS, KMS, Secrets Manager, CloudTrail, OpenSearch Service), con 99 preguntas originales. Datos contrastados con la documentación actual: Aurora hasta 256 TiB y Serverless v2 a 0 ACU, réplicas de RDS (15; 5 en Oracle/SQL Server; 3 en Db2), rotación de KMS de 90 a 2560 días, CloudTrail Lake cerrado a clientes nuevos desde el 31/05/2026, OpenSearch Serverless NextGen con escala a cero, ECS Managed Instances y EKS Auto Mode. |
| 2026-09-26 | Filtro "Usados en Kopi" en el catálogo (campo `kopi` en `servicios.json`, 12 servicios) y marca "Kopi" en sus tarjetas. |
