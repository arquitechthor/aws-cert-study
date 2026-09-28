"""
Comprueba el campo `frase` de data/servicios.json (juego de memoria, modo "funciones"; decisión
"Campo `frase`" de PLAN.md):
  - Todos los servicios la tienen y mide de 60 a 90 caracteres.
  - No contiene el nombre del servicio, su sigla ni su id: se rechaza cualquier palabra de
    `nombre`, `nombreCompleto`, `alias` o `id` (salvo "Amazon", "AWS" y palabras de relleno).
  - No hay dos frases iguales.
Sin dependencias (Python 3). Uso, desde la raíz del repo:
  python scripts/revisar_frases.py
Termina con código 1 si hay algún error.
"""
import json, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERV = json.load(open(os.path.join(REPO, 'data', 'servicios.json'), encoding='utf8'))

MIN, MAX = 60, 90
# Palabras de los nombres que no delatan al servicio (marca o relleno en inglés).
IGNORAR = {'amazon', 'aws', 'for', 'on', 'of', 'and', 'the', 'with', 'all', 'types', 'service'}


def palabras(texto):
    return {p for p in re.findall(r'[0-9a-záéíóúüñ]+', texto.lower())}


def prohibidas(s):
    fuentes = [s['id'].replace('-', ' '), s['nombre'], s.get('nombreCompleto', '')]
    fuentes += s.get('alias', [])
    fuera = set()
    for f in fuentes:
        fuera |= palabras(f)
        # Nombres pegados como "CloudFront" o "EventBridge" también se buscan enteros.
        fuera |= {p.lower() for p in re.findall(r'[A-Za-z0-9]+', f)}
        # Siglas pegadas a otra palabra, como "HSM" en "CloudHSM".
        fuera |= {p.lower() for p in re.findall(r'[A-Z]{2,}', f)}
    return {p for p in fuera if len(p) > 1 and p not in IGNORAR}


errores = []
vistas = {}
for s in SERV:
    frase = s.get('frase', '')
    if not frase:
        errores.append(f"{s['id']}: sin frase")
        continue
    if not MIN <= len(frase) <= MAX:
        errores.append(f"{s['id']}: {len(frase)} caracteres (debe tener {MIN}-{MAX})")
    choque = palabras(frase) & prohibidas(s)
    if choque:
        errores.append(f"{s['id']}: contiene {', '.join(sorted(choque))}")
    if frase in vistas:
        errores.append(f"{s['id']}: frase repetida de {vistas[frase]}")
    vistas[frase] = s['id']

for e in errores:
    print(e)
print(f"{len(SERV)} servicios, {len(errores)} errores")
sys.exit(1 if errores else 0)
