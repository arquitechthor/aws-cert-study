"""
Comprueba data/escenarios.json (juego Arquitecto, Fase 6.B de PLAN.md):
  - ids únicos de escenario y de nodo, y certificaciones que existen en certificaciones.json;
  - cada nodo es fijo (texto y/o servicio) o hueco (validos + explicacion), con col/fila >= 1
    y sin dos nodos en la misma celda;
  - los servicios (validos, noVale, distractores, nodos fijos) existen en servicios.json;
  - ninguna ficha de distracción es válida en algún hueco (sería una respuesta correcta disfrazada)
    y ninguna clave de noVale está entre los válidos de su hueco;
  - las flechas unen nodos que existen;
  - siglas en mayúsculas que no están en data/siglas.json (solo aviso: quedarían sin tooltip).
Sin dependencias. Uso, desde la raíz del repo:
  python scripts/revisar_escenarios.py
"""
import json, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Partes de nombres de servicio y unidades: no llevan tooltip.
IGNORAR = {'AWS', 'AI', 'MQ', 'MGN', 'TB', 'GB', 'PHP'}


def cargar(ruta):
    return json.load(open(os.path.join(REPO, ruta), encoding='utf8'))


def main():
    servicios = {s['id'] for s in cargar('data/servicios.json')}
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
