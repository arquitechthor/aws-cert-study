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
POR_PAGINA = {'RAM': {'*': ('Resource Access Manager', None), 'ec2': G['RAM']}}

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
SALTAR_GLOSARIO = {'a', 'code', 'h1', 'h2', 'h3', 'cite', 'pre', 'script', 'style', 'span'}  # span: explicaciones ya insertadas
SALTAR_ENLACE = SALTAR_GLOSARIO | {'em'}


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


def sigla_rx(tok):
    # No cuenta si va seguida de una palabra en mayúscula: es parte de un nombre
    # ("API Gateway", "RDS Proxy", "IAM Identity Center", "S3 Glacier").
    if tok in SUFIJOS:  # "NAT gateway": la explicación va tras el nombre completo
        return re.compile(rf'(?<![\w/.-]){re.escape(tok)}(?:{SUFIJOS[tok]})?(?![\w/-])(?! [A-ZÁÉÍÓÚ])')
    return re.compile(rf'(?<![\w/.-]){re.escape(tok)}(?![\w/-])(?! [A-ZÁÉÍÓÚ])')


SUFIJOS = {'NAT': ' [Gg]ateway'}


def explicado(tok, eng, gloss, texto_total, pos_txt, txt, pos):
    """True si la sigla ya se entiende: va entre paréntesis tras el término o ya está desplegada."""
    antes = txt[max(0, pos - 2):pos]
    if antes.endswith('('):
        return True
    siguiente = txt[pos + len(tok):pos + len(tok) + 22]
    if siguiente.startswith(' (') or siguiente.startswith(' <span class="sigla">'):
        return True  # ya va seguida de su explicación entre paréntesis
    despues = txt[pos + len(tok):pos + len(tok) + 3]
    if despues.startswith(' (') and eng and txt[pos + len(tok) + 2:pos + len(tok) + 2 + len(eng)].lower() == eng.lower():
        return True
    for frase in filter(None, [eng]):
        if frase.lower() in texto_total.lower():
            return True
    return False


def expansion_html(eng, gloss):
    if eng and gloss:
        dentro = f'(<em>{html.escape(eng)}</em>: {html.escape(gloss)})'
    elif eng:
        dentro = f'(<em>{html.escape(eng)}</em>)'
    else:
        dentro = f'({html.escape(gloss)})'
    return f' <span class="sigla">{dentro}</span>'


def expansion_txt(eng, gloss):
    if eng and gloss:
        return f' ({eng}: {gloss})'
    return f' ({eng or gloss})'


def glosario_para(pagina):
    g = dict(G)
    for tok, opciones in POR_PAGINA.items():
        g[tok] = opciones.get(pagina, opciones['*'])
    return g


def aplicar_glosario_html(fragmento, pagina):
    """Busca cada sigla en el texto ORIGINAL (así las explicaciones insertadas, que a veces
    contienen otras siglas, no se vuelven a procesar) y las inserta todas al final."""
    partes = trozos(fragmento)
    texto_total = html.unescape(''.join(p[1] for p in partes if p[0] == 'text'))
    inserciones = {}  # índice de trozo -> [(posición, texto)]
    ocupados = {}     # índice de trozo -> [(ini, fin)] de siglas ya elegidas (evita solapes)
    cambios = []
    for tok, (eng, gloss) in sorted(glosario_para(pagina).items(), key=lambda kv: -len(kv[0])):
        rx = sigla_rx(tok)
        for i, p in enumerate(partes):
            if p[0] != 'text' or (SALTAR_GLOSARIO - {'a'}) & set(p[2]):
                continue
            m = next((m for m in rx.finditer(p[1])
                      if not any(a <= m.start() < b for a, b in ocupados.get(i, []))), None)
            if not m:
                continue
            ocupados.setdefault(i, []).append((m.start(), m.end()))
            if 'a' in p[2]:
                break  # dentro de un enlace (normalmente creado en una pasada anterior): ya tratada
            sigue_span = (not p[1][m.end():].strip() and i + 1 < len(partes)
                          and partes[i + 1][1].startswith('<span class="sigla">'))
            if not sigue_span and not explicado(tok, eng, gloss, texto_total, 0, p[1], m.start()):
                inserciones.setdefault(i, []).append((m.end(), expansion_html(eng, gloss)))
                cambios.append(tok)
            break  # solo la primera aparición (visible) de la página
    for i, ins in inserciones.items():
        t = partes[i][1]
        for pos, txt in sorted(ins, reverse=True):
            t = t[:pos] + txt + t[pos:]
        partes[i][1] = t
    return ''.join(p[1] for p in partes), cambios


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
    cuerpo, siglas = aplicar_glosario_html(t[ini:fin], sid)
    cuerpo, enlaces = enlazar_html(cuerpo, sid)
    nuevo = t[:ini] + cuerpo + t[fin:]
    if escribir and nuevo != t:
        open(ruta, 'w', encoding='utf8', newline='\n').write(nuevo)
    return siglas, enlaces


def expandir_texto(texto, tok, eng, gloss):
    m = sigla_rx(tok).search(texto)
    if not m:
        return texto, False
    if texto[max(0, m.start() - 1):m.start()] == '(' or (eng and eng.lower() in texto.lower()):
        return texto, True
    return texto[:m.end()] + expansion_txt(eng, gloss) + texto[m.end():], True


def revisar_preguntas(sid, escribir):
    ruta = os.path.join(REPO, 'data', 'preguntas', f'{sid}.json')
    if not os.path.exists(ruta):
        return 0
    qs = json.load(open(ruta, encoding='utf8'))
    n = 0
    g = g_completo = glosario_para(sid)
    # Las siglas que ya aparecen (y por tanto se explican) en la guía del servicio no se vuelven
    # a explicar en sus preguntas. Las explicaciones que ya tengan las preguntas se conservan.
    pagina = os.path.join(REPO, 'servicios', f'{sid}.html')
    if os.path.exists(pagina):
        t = open(pagina, encoding='utf8').read()
        texto_guia = html.unescape(re.sub(r'<[^>]+>', ' ', t[t.index('<article class="doc">'):t.index('<h2 id="preguntas">')]))
        g = {tok: v for tok, v in g.items() if not sigla_rx(tok).search(texto_guia)}
    for q in qs:
        # Todo se decide sobre el texto original; las explicaciones insertadas no se reprocesan.
        orig = {'enunciado': q['enunciado'], 'explicacion': q['explicacion']}
        completo = ' '.join([orig['enunciado'], *q['opciones'], orig['explicacion']]).lower()
        ins = {'enunciado': [], 'explicacion': []}
        ocupado = {'enunciado': [], 'explicacion': []}
        for c in ('enunciado', 'explicacion'):
            for tok2, (e2, g2) in g_completo.items():  # protege todas las explicaciones existentes
                exp = expansion_txt(e2, g2)
                for x in re.finditer(re.escape(exp), orig[c]):
                    ocupado[c].append((x.start(), x.end()))
        anexos = []
        for tok, (eng, gloss) in sorted(g.items(), key=lambda kv: -len(kv[0])):
            rx = sigla_rx(tok)
            campo, m = None, None
            for c in ('enunciado', 'explicacion'):
                m = next((x for x in rx.finditer(orig[c]) if not any(a <= x.start() < b for a, b in ocupado[c])), None)
                if m:
                    campo = c
                    break
            if campo:
                ocupado[campo].append((m.start(), m.end()))
                ya = (orig[campo][max(0, m.start() - 1):m.start()] == '('
                      or orig[campo][m.end():m.end() + 2] == ' ('
                      or (eng and eng.lower() in completo))
                if not ya:
                    ins[campo].append((m.end(), expansion_txt(eng, gloss)))
            elif (rx.search(' '.join(q['opciones'])) and not (eng and eng.lower() in completo)
                  and f'{tok}{expansion_txt(eng, gloss)}' not in orig['explicacion']):
                anexos.append(f'{tok}{expansion_txt(eng, gloss)}')
        for c in ('enunciado', 'explicacion'):
            t = orig[c]
            for pos, txt in sorted(ins[c], reverse=True):
                t = t[:pos] + txt + t[pos:]
            q[c] = t
        if anexos:
            q['explicacion'] = q['explicacion'].rstrip() + ' Siglas: ' + '; '.join(anexos) + '.'
        n += (q['enunciado'] != orig['enunciado']) + (q['explicacion'] != orig['explicacion'])
    if escribir:
        open(ruta, 'w', encoding='utf8', newline='\n').write(json.dumps(qs, indent=2, ensure_ascii=False) + '\n')
    return n


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
    ids = [a for a in sys.argv[1:] if not a.startswith('--')] or [s['id'] for s in SERV if s['estado'] == 'publicado']
    for sid in ids:
        siglas, enlaces = revisar_pagina(sid, escribir)
        nq = revisar_preguntas(sid, escribir)
        print(f'{sid:20} siglas {len(siglas):2} enlaces {len(enlaces):3} preguntas {nq:3} | {" ".join(siglas)}')
