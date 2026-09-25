# Plan de trabajo: aws-cert-study

Web pública y estática con apuntes de estudio de servicios de AWS para certificaciones,
servida con GitHub Pages en `https://arquitechthor.github.io/aws-cert-study/`.

Este fichero sirve para **retomar el trabajo en cualquier momento**: antes de empezar una
sesión, lee "Estado actual"; al terminar, marca las tareas hechas y actualiza "Próximo paso".

---

## Estado actual

- **Fase en curso:** Fase 0 completada (salvo 0.9, programada para el 27/10/2026). Siguiente: **Fase 1**.
- **Próximo paso:** tarea 1.1 (licencia CC BY-SA 4.0). Antes, reiniciar Claude Code en
  `aws-cert-study/` y aprobar el MCP `aws-knowledge` de `.mcp.json`.
- **Última actualización:** 2026-09-25

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Stack | HTML/CSS/JS puro, sin framework ni build ni `package.json`, igual que `kopi-web`. |
| Estilo | Paleta y componentes de `kopi-web/styles.css` (`--cyan`, `--violet`, `--magenta`, `--gradient-brand`), **copiados** porque los repos son independientes. |
| Hosting | Solo GitHub Pages (`arquitechthor.github.io/aws-cert-study/`). Sin dominio propio ni Route 53. |
| Nombre del repo | `aws-cert-study` (antes `knowledgement-aws`). |
| Certificaciones | **SAA-C03** (Solutions Architect – Associate), **SAP-C02** y **SAP-C03** (Solutions Architect – Professional) y **AIF-C01** (AI Practitioner). Verificado el 2026-09-25 con las guías oficiales. |
| SAP-C02 vs SAP-C03 | Son **certificaciones distintas** en el catálogo: una persona presenta SAP-C02 (último día 17/11/2026) y otra SAP-C03 (registro desde el 27/10/2026, sin guía publicada aún). SAP-C03 aparece en `certificaciones.json` con `estado: "guia-pendiente"` y sin servicios hasta la tarea 0.9. |
| Idioma | Español. Los nombres de servicio van en inglés, como los usa AWS. Las categorías usan la **traducción oficial de AWS** (guías en `es_es`) **con su nombre en inglés** como referencia, por ejemplo "Computación (*Compute*)". |
| Categorías | 20 categorías, la unión de las usadas en las tres guías. "AWS Cost Management" (SAA) y "Cloud Financial Management" (SAP/AIF) se unifican como "Administración financiera en la nube". Cada servicio tiene una `categoria` principal (la más usada en las guías; si hay empate, la de SAP) y opcionalmente `categoriasAdicionales`. El filtro busca en ambas, así que "Sin servidor" (*Serverless*) muestra Lambda y Fargate aunque su categoría principal sea Computación. |
| Alias y fusiones | Las guías nombran el mismo servicio de formas distintas ("Amazon S3" / "Amazon Simple Storage Service (Amazon S3)"), así que se unifican en un id. Las funcionalidades que las guías listan aparte se fusionan en su servicio (`incluye`): Aurora Serverless → Aurora, CloudWatch Logs → CloudWatch, ECS Anywhere → ECS, EKS Anywhere/Distro → EKS, SageMaker JumpStart → SageMaker AI. "AWS VPN" (SAP) cubre Site-to-Site VPN y Client VPN. "Amazon Kinesis" (SAA) → Kinesis Data Streams. Amazon QuickSight aparece como Amazon Quick (nombre actual) con alias de búsqueda. |
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
│   ├── preguntas/<id>.json   # preguntas de práctica por servicio
│   └── fuentes/<código>.txt  # listas originales de servicios en alcance de cada guía
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
  "id": "ecs",
  "nombre": "Amazon ECS",
  "nombreCompleto": "Amazon Elastic Container Service (Amazon ECS)",
  "categoria": "contenedores",
  "certificaciones": ["SAA-C03", "SAP-C02", "AIF-C01"],
  "incluye": ["Amazon ECS Anywhere"],
  "estado": "pendiente",
  "resumen": ""
}
```

`nombreCompleto`, `categoriasAdicionales`, `incluye` y `alias` son opcionales. `resumen` se
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
9. **Preguntas de práctica**, cargadas desde `data/preguntas/<id>.json`.
10. **Fuentes:** enlaces a la documentación oficial y citas de lo que sea literal.
11. **Pie de página** con navegación: Kopi, Sobre mí, licencia CC BY-SA 4.0.

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
- [ ] **0.9** **A partir del 27/10/2026:** descargar la guía SAP-C03, guardar su lista en
      `data/fuentes/SAP-C03.txt`, añadir `SAP-C03` a los servicios que corresponda (y crear los nuevos),
      completar sus dominios en `certificaciones.json` y añadir a la cola los servicios nuevos.

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
- [ ] **1.10** Añadir `.nojekyll` y comprobar que el sitio carga y los filtros funcionan en producción.
- [ ] **1.11** Mostrar en la tarjeta de cada certificación su estado: "Se retira el 17/11/2026"
      en SAP-C02 y "Guía disponible a partir del 27/10/2026" en SAP-C03.

**Paso manual en GitHub (una sola vez, se puede hacer ya):** repo → Settings → Pages →
*Build and deployment* → Source: **Deploy from a branch** → Branch: **main** / **(root)** →
Save. El repo ya es público, que es requisito de Pages en el plan gratuito. Hasta que exista
`index.html`, Pages mostrará el README.

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

- [ ] `iam` AWS IAM — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02, AIF-C01)
- [ ] `organizations` AWS Organizations — Administración y gobernanza (SAA-C03, SAP-C02)
- [ ] `vpc` Amazon VPC — Redes y entrega de contenido (SAA-C03, SAP-C02, AIF-C01)
- [ ] `ec2` Amazon EC2 — Computación (SAA-C03, SAP-C02, AIF-C01)
- [ ] `ebs` Amazon EBS — Almacenamiento (SAA-C03, SAP-C02)
- [ ] `elb` Elastic Load Balancing (ELB) — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [ ] `ec2-auto-scaling` Amazon EC2 Auto Scaling — Computación (SAA-C03, SAP-C02)
- [ ] `s3` Amazon S3 — Almacenamiento (SAA-C03, SAP-C02, AIF-C01)
- [ ] `efs` Amazon EFS — Almacenamiento (SAA-C03, SAP-C02)
- [ ] `rds` Amazon RDS — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [ ] `aurora` Amazon Aurora — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [ ] `dynamodb` Amazon DynamoDB — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [ ] `lambda` AWS Lambda — Computación (SAA-C03, SAP-C02, AIF-C01)
- [ ] `route-53` Amazon Route 53 — Redes y entrega de contenido (SAA-C03, SAP-C02)
- [ ] `cloudfront` Amazon CloudFront — Redes y entrega de contenido (SAA-C03, SAP-C02, AIF-C01)
- [ ] `sqs` Amazon SQS — Integración de aplicaciones (SAA-C03, SAP-C02)
- [ ] `sns` Amazon SNS — Integración de aplicaciones (SAA-C03, SAP-C02)
- [ ] `kms` AWS KMS — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02, AIF-C01)
- [ ] `cloudwatch` Amazon CloudWatch — Administración y gobernanza (SAA-C03, SAP-C02, AIF-C01)
- [ ] `cloudtrail` AWS CloudTrail — Administración y gobernanza (SAA-C03, SAP-C02, AIF-C01)

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
- [ ] `opensearch-service` Amazon OpenSearch Service — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [ ] `quick` Amazon Quick — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [ ] `redshift` Amazon Redshift — Análisis (SAA-C03, SAP-C02, AIF-C01)
- [ ] `documentdb` Amazon DocumentDB — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [ ] `elasticache` Amazon ElastiCache — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [ ] `neptune` Amazon Neptune — Base de datos (SAA-C03, SAP-C02, AIF-C01)
- [ ] `ecs` Amazon ECS — Contenedores (SAA-C03, SAP-C02, AIF-C01)
- [ ] `eks` Amazon EKS — Contenedores (SAA-C03, SAP-C02, AIF-C01)
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
- [ ] `secrets-manager` AWS Secrets Manager — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02, AIF-C01)

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
- [ ] `api-gateway` Amazon API Gateway — Frontend web y móvil (SAA-C03, SAP-C02)
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
- [ ] `acm` AWS Certificate Manager (ACM) — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `cloudhsm` AWS CloudHSM — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
- [ ] `cognito` Amazon Cognito — Seguridad, identidad y cumplimiento (SAA-C03, SAP-C02)
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
- [ ] `ses` Amazon SES — Aplicaciones empresariales (SAP-C02)
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
- [ ] `bedrock` Amazon Bedrock — Machine learning (AIF-C01)
- [ ] `bedrock-agentcore` Amazon Bedrock AgentCore — Machine learning (AIF-C01)
- [ ] `nova` Amazon Nova — Machine learning (AIF-C01)
- [ ] `personalize` Amazon Personalize — Machine learning (SAP-C02, AIF-C01)
- [ ] `transform` AWS Transform — Machine learning (AIF-C01)

## Fase 3: extras (opcional)

- [ ] **3.1** Simulacro por certificación: mezcla preguntas de todos los servicios, con
      temporizador y puntuación por dominio.
- [ ] **3.2** Progreso personal en `localStorage`: servicios estudiados, preguntas falladas y repaso.
- [ ] **3.3** `sitemap.xml` + `robots.txt`.
- [ ] **3.4** Enlace a este sitio desde `kopi-web` (en otro repo).
- [ ] **3.5** Cambiar "Sobre mí" a la futura web independiente cuando exista.
- [ ] **3.6** Ampliar a más certificaciones si hace falta (el modelo ya lo permite).
- [ ] **3.7** Tipos de pregunta "ordenar" y "emparejar" en `quiz.js` (los usa AIF-C01).

---

## Registro de sesiones

| Fecha | Qué se hizo |
|---|---|
| 2026-09-25 | Plan creado. Decisiones iniciales: 3 certificaciones, GitHub Pages, CC BY-SA 4.0, nombre `aws-cert-study`. |
| 2026-09-25 | Fase 0: repo renombrado, `.mcp.json`, guías verificadas (SAP-C02 se retira y SAP-C03 entra como certificación aparte), `servicios.json` (155), `categorias.json` (20), `certificaciones.json`, `data/fuentes/` y cola priorizada. |
