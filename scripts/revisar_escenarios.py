"""
Comprueba data/escenarios.json (juego Arquitecto, Fase 6.B de PLAN.md):
  - ids únicos de escenario y de nodo, y certificaciones que existen en certificaciones.json;
  - cada nodo es fijo (texto y/o servicio) o hueco (validos + explicacion), con col/fila >= 1
    y sin dos nodos en la misma celda;
  - los servicios (validos, noVale, distractores, nodos fijos) existen en servicios.json;
  - ninguna ficha de distracción es válida en algún hueco (sería una respuesta correcta disfrazada)
    y ninguna clave de noVale está entre los válidos de su hueco;
  - las flechas unen nodos que existen;
  - siglas en mayúsculas que no están en data/siglas.json (solo aviso: quedarían sin tooltip);
  - topes de tamaño para que la solución quepa en una hoja A4 (assets/arquitecto-pdf.js): rejilla
    de 5 × 4 como mucho, 8 huecos, longitud del título, del caso, de las explicaciones y de los
    textos de nodos y flechas (ver TOPES). Se comprobaron con escenarios de prueba en el límite.
Sin dependencias. Uso, desde la raíz del repo:
  python scripts/revisar_escenarios.py
"""
import json, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Partes de nombres de servicio, unidades y tipos de registro DNS: no llevan tooltip.
IGNORAR = {'AWS', 'AI', 'MQ', 'MGN', 'TB', 'GB', 'PHP', 'AAAA'}
# Topes para el PDF de una hoja A4. Con todos en el máximo, el PDF aún cabe (letra al 80-85 %).
TOPES = {
    'cols': 5, 'filas': 4, 'huecos': 8, 'requisitos': 7,
    'titulo': 60,          # caracteres
    'caso': 900,           # enunciado + requisitos
    'explicacion': 320,    # cada hueco
    'explicaciones': 1400, # todas, más las líneas "También vale: ..."
    'texto_fijo': 60,      # nodo sin servicio
    'texto_servicio': 40,  # texto bajo el nombre de un servicio
    'flecha': 15,
}


def cargar(ruta):
    return json.load(open(os.path.join(REPO, ruta), encoding='utf8'))


def main():
    nombres = {s['id']: s['nombre'] for s in cargar('data/servicios.json')}
    servicios = set(nombres)
    certs = {c['codigo'] for c in cargar('data/certificaciones.json')}
    siglas = set(cargar('data/siglas.json')['siglas'])
    escenarios = cargar('data/escenarios.json')['escenarios']
    errores, avisos = [], []
    vistos = set()

    def textos(e):
        yield e['enunciado']
        yield from e.get('requisitos', [])
        for n in e['nodos']:
            if 'hueco' in n:
                yield n['hueco']['explicacion']
                yield from n['hueco'].get('noVale', {}).values()

    for e in escenarios:
        eid = e.get('id', '?')
        err = lambda m: errores.append(f'{eid}: {m}')
        if eid in vistos:
            err('id repetido')
        vistos.add(eid)
        for campo in ('titulo', 'nivel', 'enunciado', 'certificaciones', 'nodos', 'flechas'):
            if not e.get(campo):
                err(f'falta {campo}')
        if e.get('nivel') not in ('básico', 'intermedio', 'avanzado'):
            err(f'nivel desconocido: {e.get("nivel")}')
        for c in e.get('certificaciones', []):
            if c not in certs:
                err(f'certificación desconocida: {c}')

        nodos, celdas, validos = {}, {}, set()
        for n in e['nodos']:
            nid = n.get('id')
            if nid in nodos:
                err(f'nodo repetido: {nid}')
            nodos[nid] = n
            celda = (n.get('col'), n.get('fila'))
            if not all(isinstance(v, int) and v >= 1 for v in celda):
                err(f'{nid}: col/fila no válidas')
            elif celda in celdas:
                err(f'{nid} y {celdas[celda]} ocupan la misma celda {celda}')
            celdas[celda] = nid
            if 'hueco' in n:
                h = n['hueco']
                if not h.get('validos'):
                    err(f'{nid}: hueco sin validos')
                if not h.get('explicacion'):
                    err(f'{nid}: hueco sin explicacion')
                for s in h.get('validos', []):
                    if s not in servicios:
                        err(f'{nid}: servicio válido desconocido: {s}')
                validos.update(h.get('validos', []))
                for s in h.get('noVale', {}):
                    if s not in servicios:
                        err(f'{nid}: noVale con servicio desconocido: {s}')
                    if s in h.get('validos', []):
                        err(f'{nid}: {s} está en validos y en noVale')
            else:
                if not n.get('texto') and not n.get('servicio'):
                    err(f'{nid}: nodo fijo sin texto ni servicio')
                if n.get('servicio') and n['servicio'] not in servicios:
                    err(f'{nid}: servicio desconocido: {n["servicio"]}')
        if not any('hueco' in n for n in e['nodos']):
            err('no tiene huecos')

        # Topes del PDF A4.
        def tope(clave, valor, que):
            if valor > TOPES[clave]:
                err(f'{que}: {valor} (máximo {TOPES[clave]} para que el PDF quepa en una hoja A4)')
        huecos = [n['hueco'] for n in e['nodos'] if 'hueco' in n]
        tope('cols', max((n.get('col') or 0) for n in e['nodos']), 'columnas')
        tope('filas', max((n.get('fila') or 0) for n in e['nodos']), 'filas')
        tope('huecos', len(huecos), 'huecos')
        tope('requisitos', len(e.get('requisitos', [])), 'requisitos')
        tope('titulo', len(e.get('titulo', '')), 'caracteres del título')
        tope('caso', len(e.get('enunciado', '')) + sum(map(len, e.get('requisitos', []))), 'caracteres de enunciado y requisitos')
        total = 0
        for h in huecos:
            tope('explicacion', len(h.get('explicacion', '')), 'caracteres de una explicación')
            otros = [nombres.get(s, s) for s in h.get('validos', [])[1:]]
            total += len(h.get('explicacion', '')) + (len('También vale: ' + ', '.join(otros) + '.') if otros else 0)
        tope('explicaciones', total, 'caracteres de las explicaciones (con "También vale")')
        for n in e['nodos']:
            if 'hueco' not in n and n.get('texto'):
                tope('texto_servicio' if n.get('servicio') else 'texto_fijo', len(n['texto']), f'caracteres del texto de {n.get("id")}')
        for f in e['flechas']:
            tope('flecha', len(f.get('texto', '')), f'caracteres de la flecha {f.get("de")}→{f.get("a")}')

        for s in e.get('distractores', []) + e.get('distractoresDificil', []):
            if s not in servicios:
                err(f'distractor desconocido: {s}')
            if s in validos:
                err(f'el distractor {s} es válido en algún hueco')

        for f in e['flechas']:
            for lado in ('de', 'a'):
                if f.get(lado) not in nodos:
                    err(f'flecha con nodo desconocido: {f.get(lado)}')

        for t in textos(e):
            for m in re.findall(r'(?<![\w/.-])([A-Z][A-Z0-9]{1,})(?![\w-])', t):
                if m not in siglas and m not in IGNORAR:
                    avisos.append(f'{eid}: sigla sin glosario: {m}')

    for a in sorted(set(avisos)):
        print('AVISO', a)
    for m in errores:
        print('ERROR', m)
    print(f'{len(escenarios)} escenarios, {len(errores)} errores, {len(set(avisos))} avisos')
    sys.exit(1 if errores else 0)


if __name__ == '__main__':
    main()
