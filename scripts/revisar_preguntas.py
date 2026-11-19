"""Revisa las preguntas de data/preguntas/ en busca de pistas que delatan la respuesta.

Uso:
    python scripts/revisar_preguntas.py              # resumen + avisos de las difíciles
    python scripts/revisar_preguntas.py --todas      # avisos también de las no difíciles
    python scripts/revisar_preguntas.py --cert SAP-C03 --dominios

Comprueba:
- La opción correcta es claramente la más larga (más de un 15 % por encima de la siguiente):
  en el examen real la longitud no ayuda, aquí tampoco debería.
- En las difíciles de respuesta única o múltiple: enunciado de al menos 350 caracteres (escenario
  con varias restricciones; en emparejar y ordenar el enunciado es solo la instrucción).
- Reparto de la posición de la respuesta correcta en las de respuesta única.
- Con --dominios: difíciles por dominio frente a las que pide un simulacro completo "solo
  difíciles" de cada certificación (mismo reparto por mayor resto que assets/simulacro.js).
No cambia nada; solo informa. Devuelve 1 si hay avisos en las difíciles.
"""
import argparse
import collections
import glob
import json
import math
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARGEN_LARGA = 1.15
MIN_ENUNCIADO_DIFICIL = 350


def cargar(ruta):
    with open(ruta, encoding='utf-8') as f:
        return json.load(f)


def cuotas(n, dominios):
    """Reparto por mayor resto, igual que el simulacro."""
    total = sum(d['peso'] for d in dominios)
    exactos = [n * d['peso'] / total for d in dominios]
    base = [math.floor(x) for x in exactos]
    resto = n - sum(base)
    orden = sorted(range(len(dominios)), key=lambda i: exactos[i] - base[i], reverse=True)
    for i in orden[:resto]:
        base[i] += 1
    return base


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--todas', action='store_true', help='avisar también de las no difíciles')
    ap.add_argument('--cert', help='limitar a una certificación')
    ap.add_argument('--dominios', action='store_true', help='difíciles por dominio frente al simulacro')
    a = ap.parse_args()

    avisos_dif = 0
    posiciones = collections.Counter()
    larga = collections.Counter()
    for ruta in sorted(glob.glob(os.path.join(RAIZ, 'data', 'preguntas', '*.json'))):
        for p in cargar(ruta):
            if a.cert and a.cert not in p.get('certificaciones', []):
                continue
            dif = bool(p.get('dificil'))
            avisos = []
            if p.get('tipo', 'unica') in ('unica', 'multiple'):
                largos = [len(o) for o in p['opciones']]
                correctas = p['correctas']
                if p.get('tipo', 'unica') == 'unica':
                    posiciones[(dif, correctas[0])] += 1
                malas = [l for i, l in enumerate(largos) if i not in correctas]
                if malas:
                    clave = 'dif' if dif else 'normal'
                    larga[clave + '_total'] += 1
                    if min(largos[i] for i in correctas) > max(malas):
                        larga[clave] += 1
                    if max(largos[i] for i in correctas) > max(malas) * MARGEN_LARGA:
                        avisos.append('la correcta es claramente la más larga (%d frente a %d)'
                                      % (max(largos[i] for i in correctas), max(malas)))
            if dif and p.get('tipo', 'unica') in ('unica', 'multiple') and len(p['enunciado']) < MIN_ENUNCIADO_DIFICIL:
                avisos.append('enunciado corto para una difícil (%d caracteres)' % len(p['enunciado']))
            if avisos and (dif or a.todas):
                if dif:
                    avisos_dif += 1
                print('%s%s: %s' % (p['id'], ' [difícil]' if dif else '', '; '.join(avisos)))

    print()
    for clave, nombre in (('dif', 'difíciles'), ('normal', 'no difíciles')):
        t = larga[clave + '_total']
        if t:
            print('%s: la correcta es la más larga en %d de %d (%.0f %%; al azar sería ~25-30 %%)'
                  % (nombre, larga[clave], t, 100 * larga[clave] / t))
    for dif, nombre in ((True, 'difíciles'), (False, 'no difíciles')):
        pos = {i: posiciones[(dif, i)] for i in range(4)}
        print('posición de la correcta (única, %s): %s' % (nombre, pos))

    if a.dominios:
        certs = cargar(os.path.join(RAIZ, 'data', 'certificaciones.json'))
        cont = collections.defaultdict(collections.Counter)
        for ruta in glob.glob(os.path.join(RAIZ, 'data', 'preguntas', '*.json')):
            for p in cargar(ruta):
                if not p.get('dificil'):
                    continue
                for c in p.get('certificaciones', []):
                    cont[c][(p.get('dominios') or {}).get(c) or p.get('dominio')] += 1
        for c in certs:
            if a.cert and c['codigo'] != a.cert or not c.get('examen') or not cont[c['codigo']]:
                continue
            ex = c['examen']
            n = ex['preguntasPuntuadas'] + ex['preguntasSinPuntuar']
            print('\n%s, simulacro completo solo difíciles (%d preguntas):' % (c['codigo'], n))
            for d, q in zip(c['dominios'], cuotas(n, c['dominios'])):
                hay = cont[c['codigo']][d['nombre']]
                print('  %-62s pide %2d, hay %3d %s' % (d['nombre'], q, hay, 'OK' if hay >= q else 'FALTAN %d' % (q - hay)))
            otros = set(cont[c['codigo']]) - {d['nombre'] for d in c['dominios']}
            for o in otros:
                print('  AVISO dominio desconocido: %r (%d)' % (o, cont[c['codigo']][o]))
    return 1 if avisos_dif else 0


if __name__ == '__main__':
    sys.exit(main())
