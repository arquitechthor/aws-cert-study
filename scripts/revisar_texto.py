"""
Aplica las reglas de redacción de CLAUDE.md ("Content rules") a las páginas publicadas:
  1. Explica cada sigla la primera vez que aparece en la página (y en cada pregunta), con el
     glosario G de abajo. Las explicaciones van en <span class="sigla">.
  2. Enlaza la primera mención por sección de cada servicio de AWS a su página del sitio
     (<id>.html si está publicado, ../servicio.html?id=<id> si está pendiente).
Es idempotente. Sin dependencias (Python 3). Uso, desde la raíz del repo:
  python scripts/revisar_texto.py [--escribir] [id ...]   sin ids: todas las páginas publicadas
  python scripts/revisar_texto.py --publicado <id>        tras publicar <id>: los enlaces a su
                                                          página "Próximamente" pasan a la suya
Sin --escribir solo informa de lo que cambiaría. Si aparece una sigla nueva, añádela a G.
"""
import glob, html, json, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERV = json.load(open(os.path.join(REPO, 'data', 'servicios.json'), encoding='utf8'))
S = {s['id']: s for s in SERV}

# ── Glosario: sigla -> (inglés o None, explicación en español o None) ─────────────────────
G = {
    'ACID': (None, 'atomicidad, consistencia, aislamiento y durabilidad de las transacciones'),
    'ACL': ('Access Control List', 'lista de control de acceso'),
    'NACL': ('Network Access Control List', 'firewall a nivel de subred'),
    'ACU': ('Aurora Capacity Unit', 'unidad de capacidad de Aurora Serverless'),
    'AES-256': ('Advanced Encryption Standard', 'cifrado simétrico con claves de 256 bits'),
    'AMI': ('Amazon Machine Image', 'plantilla con el sistema operativo para arrancar instancias'),
    'API': ('Application Programming Interface', 'interfaz para que los programas se comuniquen'),
    'ARM': (None, 'arquitectura de procesador de bajo consumo'),
    'ARN': ('Amazon Resource Name', 'identificador único de un recurso de AWS'),
    'AZ': ('Availability Zone', 'zona de disponibilidad'),
    'BI': ('Business Intelligence', 'análisis de datos para el negocio'),
    'BYOL': ('Bring Your Own License', 'usar tu propia licencia'),
    'CA': ('Certificate Authority', 'autoridad de certificación'),
    'CAA': ('Certification Authority Authorization', 'registro DNS que indica qué autoridades pueden emitir certificados'),
    'CDN': ('Content Delivery Network', 'red de entrega de contenido'),
    'CI/CD': ('Continuous Integration / Continuous Delivery', 'integración y entrega continuas'),
    'CIDR': ('Classless Inter-Domain Routing', 'notación de rangos de IP como 10.0.0.0/16'),
    'CNAME': ('Canonical Name', 'registro DNS que apunta a otro nombre'),
    'CNI': ('Container Network Interface', 'plugin de red de los contenedores'),
    'CORS': ('Cross-Origin Resource Sharing', 'permite que una web llame a otro dominio'),
    'CPU': ('Central Processing Unit', 'procesador'),
    'CRR': ('Cross-Region Replication', 'replicación a otra región'),
    'SRR': ('Same-Region Replication', 'replicación en la misma región'),
    'CSS': ('Cascading Style Sheets', 'hojas de estilo de una web'),
    'CSV': ('Comma-Separated Values', 'texto con valores separados por comas'),
    'CUDA': ('Compute Unified Device Architecture', 'plataforma de NVIDIA para programar GPU'),
    'DAX': ('DynamoDB Accelerator', 'caché en memoria para DynamoDB'),
    'DKIM': ('DomainKeys Identified Mail', 'firma criptográfica de los correos'),
    'DMARC': ('Domain-based Message Authentication, Reporting and Conformance', 'política que indica qué hacer con correos que no se autentican'),
    'SPF': ('Sender Policy Framework', 'lista de servidores autorizados a enviar correo del dominio'),
    'DLQ': ('Dead-Letter Queue', 'cola donde acaban los mensajes que fallan'),
    'DNS': ('Domain Name System', 'traduce nombres de dominio a direcciones IP'),
    'DNSSEC': ('DNS Security Extensions', 'firma las respuestas DNS para evitar suplantaciones'),
    'PCI DSS': ('Payment Card Industry Data Security Standard', 'norma de seguridad para datos de tarjetas'),
    'DSSE-KMS': ('Dual-layer Server-Side Encryption with KMS', 'doble capa de cifrado con claves de KMS'),
    'SSE-KMS': ('Server-Side Encryption with KMS keys', 'cifrado en el servidor con claves de KMS'),
    'SSE-S3': ('Server-Side Encryption with S3 managed keys', 'cifrado en el servidor con claves que gestiona S3'),
    'SSE-C': ('Server-Side Encryption with Customer-provided keys', 'cifrado en el servidor con claves que aporta el cliente'),
    'ECC': ('Elliptic Curve Cryptography', 'criptografía de curva elíptica'),
    'ECPU': ('ElastiCache Processing Unit', 'unidad de cómputo de ElastiCache Serverless'),
    'ETL': ('Extract, Transform, Load', 'extraer, transformar y cargar datos'),
    'FIFO': ('First In, First Out', 'el primero en entrar es el primero en salir'),
    'FIPS': ('Federal Information Processing Standards', 'normas de seguridad del gobierno de EE. UU.'),
    'FM': ('Foundation Model', 'modelo fundacional'),
    'GPU': ('Graphics Processing Unit', 'procesador gráfico, muy usado en ML'),
    'GSI': ('Global Secondary Index', 'índice secundario global'),
    'LSI': ('Local Secondary Index', 'índice secundario local'),
    'HMAC': ('Hash-based Message Authentication Code', 'código que verifica integridad y autenticidad'),
    'HPA': ('Horizontal Pod Autoscaler', 'escala el número de pods'),
    'HPC': ('High Performance Computing', 'cómputo de alto rendimiento'),
    'HSM': ('Hardware Security Module', 'dispositivo físico que protege claves'),
    'HTML': ('HyperText Markup Language', 'lenguaje de las páginas web'),
    'HTTP': ('HyperText Transfer Protocol', 'protocolo de la web'),
    'HTTPS': ('HTTP Secure', 'HTTP cifrado con TLS'),
    'IA': (None, 'inteligencia artificial'),
    'IMDS': ('Instance Metadata Service', 'servicio de metadatos de la instancia'),
    'IMDSv2': ('Instance Metadata Service versión 2', 'con token de sesión'),
    'IOPS': ('Input/Output Operations Per Second', 'operaciones de disco por segundo'),
    'IP': ('Internet Protocol', 'dirección de red'),
    'IRSA': ('IAM Roles for Service Accounts', 'roles de IAM para cuentas de servicio de Kubernetes'),
    'ISM': ('Index State Management', 'políticas que mueven índices entre niveles'),
    'ISO': ('International Organization for Standardization', 'organismo de normas internacionales'),
    'JCE': ('Java Cryptography Extension', 'interfaz criptográfica de Java'),
    'PKCS': ('Public-Key Cryptography Standards', 'estándares de criptografía de clave pública'),
    'JSON': ('JavaScript Object Notation', 'formato de datos en texto'),
    'JS': ('JavaScript', None),
    'JWT': ('JSON Web Token', 'token firmado con datos del usuario'),
    'k-NN': ('k-Nearest Neighbors', 'búsqueda de los k vecinos más cercanos'),
    'LCU': ('Load Balancer Capacity Unit', 'unidad de facturación del balanceador'),
    'MAU': ('Monthly Active Users', 'usuarios activos al mes'),
    'MFA': ('Multi-Factor Authentication', 'inicio de sesión con un segundo factor'),
    'ML': ('Machine Learning', 'aprendizaje automático'),
    'MRSC': ('Multi-Region Strong Consistency', 'consistencia fuerte entre regiones'),
    'MX': ('Mail Exchange', 'registro DNS del servidor de correo'),
    'NS': ('Name Server', 'registro DNS con los servidores de nombres del dominio'),
    'SOA': ('Start of Authority', 'registro DNS con los datos de la zona'),
    'NAT': ('Network Address Translation', 'traducción de direcciones de red'),
    'NFS': ('Network File System', 'protocolo para compartir ficheros en red'),
    'OAC': ('Origin Access Control', 'permite que solo CloudFront lea el origen'),
    'OAI': ('Origin Access Identity', 'mecanismo anterior a OAC'),
    'OCU': ('OpenSearch Compute Unit', 'unidad de capacidad de OpenSearch Serverless'),
    'OIDC': ('OpenID Connect', 'estándar de identidad sobre OAuth 2.0'),
    'OLAP': ('Online Analytical Processing', 'consultas analíticas sobre grandes volúmenes'),
    'OSS': ('Open Source Software', 'la versión de código abierto'),
    'OU': ('Organizational Unit', 'unidad organizativa de AWS Organizations'),
    'PDF': ('Portable Document Format', None),
    'PITR': ('Point-In-Time Recovery', 'restaurar a un momento concreto'),
    'PKCE': ('Proof Key for Code Exchange', 'protege el flujo de OAuth en apps sin secreto'),
    'POSIX': ('Portable Operating System Interface', 'estándar de ficheros y permisos tipo Unix'),
    'RAG': ('Retrieval-Augmented Generation', 'el modelo responde apoyándose en información recuperada de tus documentos'),
    'RBAC': ('Role-Based Access Control', 'permisos según el rol'),
    'RCP': ('Resource Control Policy', 'política de Organizations que limita el acceso a los recursos'),
    'SCP': ('Service Control Policy', 'límite de permisos para las cuentas de una organización'),
    'RCU': ('Read Capacity Unit', 'unidad de capacidad de lectura'),
    'WCU': ('Write Capacity Unit', 'unidad de capacidad de escritura'),
    'REST': ('Representational State Transfer', 'estilo de API sobre HTTP'),
    'RPO': ('Recovery Point Objective', 'cuántos datos puedes permitirte perder'),
    'RTO': ('Recovery Time Objective', 'cuánto tiempo puedes estar sin servicio'),
    'RSA': ('Rivest-Shamir-Adleman', 'algoritmo de clave pública'),
    'RUM': ('Real User Monitoring', 'mide la experiencia de los usuarios reales'),
    'SAML': ('Security Assertion Markup Language', 'estándar de inicio de sesión federado'),
    'SAN': ('Subject Alternative Name', 'nombres adicionales de un certificado'),
    'SDK': ('Software Development Kit', 'bibliotecas para programar contra AWS'),
    'SLA': ('Service Level Agreement', 'compromiso de disponibilidad'),
    'SMS': ('Short Message Service', 'mensajes de texto al móvil'),
    'SMTP': ('Simple Mail Transfer Protocol', 'protocolo de envío de correo'),
    'SO': (None, 'sistema operativo'),
    'SPA': ('Single-Page Application', 'web de una sola página'),
    'SQL': ('Structured Query Language', 'lenguaje de consultas de bases de datos relacionales'),
    'SRP': ('Secure Remote Password', 'protocolo de inicio de sesión sin enviar la contraseña'),
    'SSD': ('Solid-State Drive', 'disco de estado sólido'),
    'SSH': ('Secure Shell', 'acceso remoto cifrado por terminal'),
    'SSL': ('Secure Sockets Layer', 'predecesor de TLS'),
    'SSO': ('Single Sign-On', 'un único inicio de sesión para varias aplicaciones'),
    'SSRF': ('Server-Side Request Forgery', 'ataque que hace que el servidor haga peticiones en tu nombre'),
    'TCP': ('Transmission Control Protocol', 'protocolo de transporte fiable'),
    'UDP': ('User Datagram Protocol', 'protocolo de transporte sin conexión'),
    'TLS': ('Transport Layer Security', 'cifrado de las conexiones'),
    'TOTP': ('Time-based One-Time Password', 'código temporal de una app autenticadora'),
    'TTL': ('Time To Live', 'tiempo de vida antes de caducar'),
    'UI': ('User Interface', 'interfaz de usuario'),
    'URL': ('Uniform Resource Locator', 'dirección web'),
    'VPN': ('Virtual Private Network', 'red privada virtual'),
    'VPS': ('Virtual Private Server', 'servidor virtual privado'),
    'WAN': ('Wide Area Network', 'red de área extensa'),
    'WORM': ('Write Once, Read Many', 'se escribe una vez y no se puede modificar'),
    'XKS': ('External Key Store', 'almacén de claves externo a AWS'),
    'YAML': ("YAML Ain't Markup Language", 'formato de configuración legible'),
    'RAM': ('Random Access Memory', 'memoria'),
    'SSE-SQS': ('Server-Side Encryption with SQS managed keys', 'cifrado con claves que gestiona SQS'),
    'AMQP': ('Advanced Message Queuing Protocol', 'protocolo estándar de mensajería'),
    'MQTT': ('Message Queuing Telemetry Transport', 'protocolo ligero de mensajería para dispositivos'),
    'JMS': ('Java Message Service', 'API estándar de mensajería de Java'),
    'STOMP': ('Simple Text Oriented Messaging Protocol', 'protocolo de mensajería basado en texto'),
    'ASL': ('Amazon States Language', 'lenguaje JSON con el que se definen los flujos de Step Functions'),
    'CRM': ('Customer Relationship Management', 'software de gestión de clientes'),
    'ERP': ('Enterprise Resource Planning', 'software de gestión empresarial'),
    'EDA': ('Event-Driven Architecture', 'arquitectura dirigida por eventos'),
    'ETA': (None, 'tiempo estimado'),
    'KPI': ('Key Performance Indicator', 'indicador clave'),
    'UTC': ('Coordinated Universal Time', 'hora universal coordinada'),
    'VTL': ('Velocity Template Language', 'lenguaje de plantillas'),
    'LDAP': ('Lightweight Directory Access Protocol', 'protocolo de directorios de usuarios'),
    'CLB': ('Classic Load Balancer', 'balanceador de la generación anterior'),
    'GWLB': ('Gateway Load Balancer', 'balanceador para appliances de red'),
    'GENEVE': ('Generic Network Virtualization Encapsulation', 'protocolo que encapsula el tráfico hacia los appliances'),
    'NLCU': ('Network Load Balancer Capacity Unit', 'unidad de facturación del NLB'),
    'GWLCU': ('Gateway Load Balancer Capacity Unit', 'unidad de facturación del GWLB'),
    'SNI': ('Server Name Indication', 'permite varios certificados en la misma IP'),
    'HDD': ('Hard Disk Drive', 'disco duro magnético'),
    'SAM': ('Serverless Application Model', 'extensión de CloudFormation para aplicaciones sin servidores'),
    'DPU': ('Data Processing Unit', 'unidad de capacidad de Glue'),
    'PII': ('Personally Identifiable Information', 'datos personales identificables'),
    'SSM': ('Systems Manager', 'nombre corto de AWS Systems Manager y de su agente'),
    'IaC': ('Infrastructure as Code', 'infraestructura como código'),
    'OWASP': ('Open Worldwide Application Security Project', 'fundación que publica los riesgos web más comunes'),
    'XSS': ('Cross-Site Scripting', 'inyección de scripts en una web'),
    'CAPTCHA': (None, 'prueba para distinguir personas de bots'),
    'CMS': ('Content Management System', 'gestor de contenidos web'),
    'SMB': ('Server Message Block', 'protocolo de ficheros compartidos de Windows'),
    'CTAS': ('CREATE TABLE AS SELECT', 'crear una tabla a partir de una consulta'),
    'KCL': ('Kinesis Client Library', 'biblioteca para escribir consumidores de Kinesis'),
    'KPL': ('Kinesis Producer Library', 'biblioteca para escribir productores de Kinesis'),
    'ORC': ('Optimized Row Columnar', 'formato de fichero por columnas'),
    'IoT': ('Internet of Things', 'internet de las cosas: dispositivos conectados'),
    'OLTP': ('Online Transaction Processing', 'las transacciones del día a día de una aplicación'),
    'RPU': ('Redshift Processing Unit', 'unidad de capacidad de Redshift Serverless'),
    'MPP': ('Massively Parallel Processing', 'procesamiento masivamente paralelo'),
    'DDoS': ('Distributed Denial of Service', 'ataque que satura un servicio desde muchos orígenes'),
    # Siglas de servicios: se expanden (sin explicación, el enlace lleva a su página).
    'ACM': ('AWS Certificate Manager', None), 'ALB': ('Application Load Balancer', 'balanceador HTTP/HTTPS'),
    'NLB': ('Network Load Balancer', 'balanceador TCP/UDP'), 'CLI': ('Command Line Interface', 'línea de comandos'),
    'DMS': ('Database Migration Service', None), 'EBS': ('Elastic Block Store', None),
    'EC2': ('Elastic Compute Cloud', None), 'ECR': ('Elastic Container Registry', None),
    'ECS': ('Elastic Container Service', None), 'EFS': ('Elastic File System', None),
    'EKS': ('Elastic Kubernetes Service', None), 'ELB': ('Elastic Load Balancing', None),
    'EMR': ('Elastic MapReduce', None), 'IAM': ('Identity and Access Management', None),
    'KMS': ('Key Management Service', None), 'MSK': ('Managed Streaming for Apache Kafka', None),
    'RDS': ('Relational Database Service', None), 'S3': ('Simple Storage Service', None),
    'SES': ('Simple Email Service', None), 'SNS': ('Simple Notification Service', None),
    'SQS': ('Simple Queue Service', None), 'STS': ('Security Token Service', None),
    'VPC': ('Virtual Private Cloud', None), 'WAF': ('Web Application Firewall', None),
    'SCT': ('Schema Conversion Tool', None),
}
# RAM es la memoria en EC2 y el servicio AWS RAM en el resto de páginas.
POR_PAGINA = {
    'RAM': {'*': ('Resource Access Manager', None), 'ec2': G['RAM']},
    'IA': {'*': G['IA'], 'efs': ('Infrequent Access', 'clase para ficheros poco usados')},
}

# ── Índice de nombres de servicio -> id ──────────────────────────────────────────────────
ARRIESGADOS = {'Config', 'Backup', 'Batch', 'Support', 'Connect', 'Transform', 'Quick', 'Budgets',
               'Artifact', 'Nova', 'Q', 'MQ', 'Management Console', 'Marketplace', 'VPN', 'AWS VPN'}
EXTRA = {
    'elb': ['Application Load Balancer', 'Network Load Balancer', 'Gateway Load Balancer', 'ALB', 'NLB'],
    'systems-manager': ['Parameter Store', 'Session Manager', 'Patch Manager'],
    'sagemaker-ai': ['SageMaker'], 'quick': ['QuickSight', 'Amazon QuickSight'],
    'data-firehose': ['Firehose', 'Kinesis Data Firehose'], 'snow-family': ['Snowball'],
    'opensearch-service': ['OpenSearch', 'Amazon OpenSearch'], 'cli': ['CLI'],
    'ram': ['AWS RAM'], 'amazon-q': ['Amazon Q Developer'], 'transit-gateway': ['Transit Gateway'],
    'site-to-site-vpn': ['Site-to-Site VPN'], 'iam': ['IAM'],
}


def nombres_de(s):
    base = [s['nombre'], re.sub(r'\s*\(.*?\)', '', s.get('nombreCompleto', '')), *s.get('alias', [])]
    base += re.findall(r'\(([^)]+)\)', s['nombre'] + ' ' + s.get('nombreCompleto', ''))
    base += EXTRA.get(s['id'], [])
    out = set()
    for n in filter(None, base):
        n = re.sub(r'\s*\(.*?\)', '', n).strip()
        out.add(n)
        corto = re.sub(r'^(Amazon|AWS)\s+', '', n)
        if corto not in ARRIESGADOS:
            out.add(corto)
    return {n for n in out if n and n not in ARRIESGADOS}


PATRONES = []  # (regex, id) de mayor a menor longitud
for s in SERV:
    for n in nombres_de(s):
        if s['id'] == 'auto-scaling' and n == 'Auto Scaling':
            continue  # "Auto Scaling" suelto casi siempre es EC2 Auto Scaling
        PATRONES.append((n, s['id']))
PATRONES.append(('Auto Scaling', 'ec2-auto-scaling'))
PATRONES = sorted(set(PATRONES), key=lambda p: -len(p[0]))
PREFIJO_NO = {'Auto Scaling': r'(?<!Service )(?<!Application )(?<!AWS )(?<!EC2 )'}
RX_SERV = re.compile('|'.join(
    f'(?P<p{i}>{PREFIJO_NO.get(n, "")}(?<![\\w@/.-]){re.escape(n)}(?![\\w@-]))' for i, (n, _) in enumerate(PATRONES)))


def destino(sid):
    return f'{sid}.html' if S[sid]['estado'] == 'publicado' else f'../servicio.html?id={sid}'


# ── Tokenización de HTML en etiquetas y texto ──────────────────────────────────────────────
SALTAR_GLOSARIO = {'code', 'h1', 'h2', 'h3', 'cite', 'pre', 'script', 'style', 'abbr'}
SALTAR_ENLACE = {'a', 'code', 'h1', 'h2', 'h3', 'cite', 'pre', 'script', 'style', 'abbr', 'em'}


def trozos(fragmento):
    """Lista de [tipo, valor, pila_de_etiquetas] con tipo 'tag' o 'text'."""
    out, pila = [], []
    for m in re.finditer(r'(<[^>]+>)|([^<]+)', fragmento):
        if m.group(1):
            tag = m.group(1)
            nombre = re.match(r'</?\s*([a-zA-Z0-9]+)', tag)
            if nombre:
                n = nombre.group(1).lower()
                if tag.startswith('</'):
                    if n in pila:
                        while pila and pila.pop() != n:
                            pass
                elif not tag.endswith('/>') and n not in ('br', 'img', 'hr', 'meta', 'link', 'input'):
                    pila.append(n)
            out.append(['tag', tag, list(pila)])
        else:
            out.append(['text', m.group(2), list(pila)])
    return out


SUFIJOS = {'NAT': ' [Gg]ateway'}  # "NAT gateway": la sigla abarca el nombre completo


def sigla_rx(tok):
    # No cuenta si va seguida de una palabra en mayúscula: es parte de un nombre
    # ("API Gateway", "RDS Proxy", "IAM Identity Center", "S3 Glacier").
    suf = f'(?:{SUFIJOS[tok]})?' if tok in SUFIJOS else ''
    return re.compile(rf'(?<![\w/.-]){re.escape(tok)}{suf}(?![\w/-])(?! [A-ZÁÉÍÓÚ])')


def explicado(tok, eng, texto_total, txt, pos, fin):
    """True si el propio texto ya explica la sigla: "término (SIGLA)", "SIGLA (explicación)"
    o el nombre completo en inglés aparece en la página."""
    if txt[max(0, pos - 1):pos] == '(' and txt[fin:fin + 1] == ')':
        return True
    if txt[fin:fin + 2] == ' (':
        return True
    return bool(eng) and eng.lower() in texto_total.lower()


def expansion_txt(eng, gloss):
    if eng and gloss:
        return f' ({eng}: {gloss})'
    return f' ({eng or gloss})'


def glosario_para(pagina):
    g = dict(G)
    for tok, opciones in POR_PAGINA.items():
        g[tok] = opciones.get(pagina, opciones['*'])
    return g


def abbr_html(texto, tok, eng, gloss, primera):
    """Sigla con tooltip. La primera aparición de la página lleva además la explicación en un
    <span class="sigla-exp">: oculta en pantallas con ratón (se ve el tooltip), visible en las
    táctiles y siempre leída por los lectores de pantalla."""
    datos = f' data-s="{html.escape(tok)}"'
    if eng:
        datos += f' data-en="{html.escape(eng)}"'
    if gloss:
        datos += f' data-es="{html.escape(gloss)}"'
    exp = f'<span class="sigla-exp">{html.escape(expansion_txt(eng, gloss))}</span>' if primera else ''
    clase = 'sigla sigla-1' if primera else 'sigla'
    return f'<abbr class="{clase}"{datos} tabindex="0">{texto}{exp}</abbr>'


VIEJA_EXPANSION = re.compile(r' <span class="sigla">\(.*?\)</span>', re.S)


def aplicar_glosario_html(fragmento, pagina):
    """Marca TODAS las apariciones de las siglas del glosario con un tooltip (<abbr>)."""
    fragmento = VIEJA_EXPANSION.sub('', fragmento)  # migra el formato anterior (paréntesis)
    partes = trozos(fragmento)
    texto_total = html.unescape(''.join(p[1] for p in partes if p[0] == 'text'))
    g = glosario_para(pagina)
    toks = sorted(g, key=len, reverse=True)
    rx = re.compile('|'.join(f'(?P<t{i}>{sigla_rx(t).pattern})' for i, t in enumerate(toks)))
    vistas = {m.group(0) for m in re.finditer(r'data-s="([^"]+)"', fragmento)}
    vistas = {re.search(r'data-s="([^"]+)"', v).group(1) for v in vistas}
    cambios = []
    for i, p in enumerate(partes):
        if p[0] != 'text' or SALTAR_GLOSARIO & set(p[2]):
            continue
        txt = p[1]
        # Texto que sigue a este trozo (tras etiquetas), para aplicar la regla "seguida de una
        # palabra en mayúscula" también cuando la palabra está en otro trozo (<abbr>, <a>…).
        siguiente = next((q[1] for q in partes[i + 1:] if q[0] == 'text'), '')

        def marcar(m):
            if txt[m.end():] == ' ' and re.match(r'[A-ZÁÉÍÓÚ]', siguiente):
                return m.group(0)
            tok = toks[int(m.lastgroup[1:])]
            eng, gloss = g[tok]
            primera = tok not in vistas and not explicado(tok, eng, texto_total, txt, m.start(), m.end())
            vistas.add(tok)
            cambios.append(tok)
            return abbr_html(m.group(0), tok, eng, gloss, primera)
        p[1] = rx.sub(marcar, txt)
    return ''.join(p[1] for p in partes), sorted(set(cambios))


def enlazar_html(fragmento, pagina):
    """Primera mención de cada servicio por sección (<h2>) -> enlace a su página."""
    partes = trozos(fragmento)
    enlazados, cambios = set(), []
    for p in partes:
        if p[0] == 'tag':
            if re.match(r'<h2\b', p[1]):
                enlazados = set()
            # un enlace existente a un servicio cuenta como su mención en la sección
            m = re.match(r'<a href="(?:\.\./servicio\.html\?id=([\w-]+)|([\w-]+)\.html)"', p[1])
            if m:
                enlazados.add(m.group(1) or m.group(2))
            continue
        if SALTAR_ENLACE & set(p[2]):
            continue

        def sustituir(m):
            texto = m.group(0)
            idx = int(m.lastgroup[1:])
            sid = PATRONES[idx][1]
            if sid == pagina or sid in enlazados:
                return texto
            enlazados.add(sid)
            cambios.append(sid)
            return f'<a href="{destino(sid)}">{texto}</a>'
        p[1] = RX_SERV.sub(sustituir, p[1])
    return ''.join(p[1] for p in partes), cambios


def revisar_pagina(sid, escribir):
    ruta = os.path.join(REPO, 'servicios', f'{sid}.html')
    t = open(ruta, encoding='utf8').read()
    ini = t.index('<article class="doc">')
    fin = t.index('<h2 id="preguntas">')
    # Primero los enlaces (sobre el texto limpio) y después las siglas, también dentro de enlaces.
    cuerpo, enlaces = enlazar_html(VIEJA_EXPANSION.sub('', t[ini:fin]), sid)
    cuerpo, siglas = aplicar_glosario_html(cuerpo, sid)
    nuevo = t[:ini] + cuerpo + t[fin:]
    if '../assets/siglas.js' not in nuevo:  # script del tooltip, antes que quiz.js
        nuevo = nuevo.replace('<script src="../assets/quiz.js" defer></script>',
                              '<script src="../assets/siglas.js" defer></script>\n<script src="../assets/quiz.js" defer></script>')
    cambio = nuevo != t
    if escribir and cambio:
        open(ruta, 'w', encoding='utf8', newline='\n').write(nuevo)
    return (siglas if cambio else []), (enlaces if cambio else [])


def revisar_preguntas(sid, escribir):
    """Las preguntas son texto plano: el quiz marca las siglas al pintarlas (data/siglas.json).
    Aquí solo se quitan las explicaciones entre paréntesis que se insertaron antes."""
    ruta = os.path.join(REPO, 'data', 'preguntas', f'{sid}.json')
    if not os.path.exists(ruta):
        return 0
    qs = json.load(open(ruta, encoding='utf8'))
    variantes = set()
    for eng, gloss in list(G.values()) + [o for d in POR_PAGINA.values() for o in d.values()]:
        variantes.add(expansion_txt(eng, gloss))
    n = 0
    for q in qs:
        for c in ('enunciado', 'explicacion'):
            t = q[c]
            for v in sorted(variantes, key=len, reverse=True):
                t = t.replace(v, '')
            t = re.sub(r' Siglas: [A-Za-z0-9/ -]+(?:; [A-Za-z0-9/ -]+)*\.$', '', t)
            if t != q[c]:
                q[c] = t
                n += 1
    if escribir and n:
        open(ruta, 'w', encoding='utf8', newline='\n').write(json.dumps(qs, indent=2, ensure_ascii=False) + '\n')
    return n


def exportar_glosario(escribir):
    """data/siglas.json: el glosario para el quiz (mismas reglas de detección que aquí)."""
    datos = {
        'siglas': {tok: {'en': eng, 'es': gloss} for tok, (eng, gloss) in sorted(G.items())},
        'porPagina': {tok: {pag: {'en': e, 'es': s} for pag, (e, s) in ops.items()} for tok, ops in POR_PAGINA.items()},
        'sufijos': SUFIJOS,
    }
    ruta = os.path.join(REPO, 'data', 'siglas.json')
    nuevo = json.dumps(datos, indent=1, ensure_ascii=False) + '\n'
    viejo = open(ruta, encoding='utf8').read() if os.path.exists(ruta) else ''
    if escribir and nuevo != viejo:
        open(ruta, 'w', encoding='utf8', newline='\n').write(nuevo)
    return nuevo != viejo


def reapuntar_enlaces(sid, escribir=True):
    """Al publicar sid, los enlaces a su página "Próximamente" pasan a su página propia."""
    for ruta in glob.glob(os.path.join(REPO, 'servicios', '*.html')):
        t = open(ruta, encoding='utf8').read()
        n = t.replace(f'href="../servicio.html?id={sid}"', f'href="{sid}.html"')
        if n != t and escribir:
            open(ruta, 'w', encoding='utf8', newline='\n').write(n)


if __name__ == '__main__':
    if '--publicado' in sys.argv:
        for sid in sys.argv[sys.argv.index('--publicado') + 1:]:
            reapuntar_enlaces(sid)
            print(f'{sid}: enlaces reapuntados a {sid}.html')
        sys.exit()
    escribir = '--escribir' in sys.argv
    if exportar_glosario(escribir):
        print('data/siglas.json actualizado' if escribir else 'data/siglas.json cambiaría')
    ids = [a for a in sys.argv[1:] if not a.startswith('--')] or [s['id'] for s in SERV if s['estado'] == 'publicado']
    for sid in ids:
        siglas, enlaces = revisar_pagina(sid, escribir)
        nq = revisar_preguntas(sid, escribir)
        print(f'{sid:20} siglas {len(siglas):2} enlaces {len(enlaces):3} preguntas {nq:3} | {" ".join(siglas)}')
