"""Rellena conceptos-aif-c01.html con las fichas de Tech Spider que cubren la AIF-C01.

Lee data/spider.json (bloques de "guias" y temas de "certificaciones") y, del repo hermano
../arquitechthor-spider, data/nodos.json (nombre y frase de cada ficha) y data/preguntas/<tema>.json
(cuántas preguntas llevan la certificación). Escribe las tarjetas entre <!-- TEMAS:INICIO --> y
<!-- TEMAS:FIN --> y marca las siglas de toda la página con el glosario de revisar_texto.py.
Ejecútalo cuando cambie data/spider.json o Tech Spider publique, renombre o etiquete un tema.

Uso: python scripts/generar_conceptos.py          (prueba: dice si cambiaría)
     python scripts/generar_conceptos.py --escribir
"""
import html
import importlib.util
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPIDER = os.path.join(os.path.dirname(REPO), 'arquitechthor-spider')
CERT = 'AIF-C01'
PAGINA = os.path.join(REPO, 'conceptos-aif-c01.html')
RX_ABBR = re.compile(r'<abbr class="sigla[^"]*"[^>]*>(.*?)(?:<span class="sigla-exp">.*?</span>)?</abbr>', re.S)

spec = importlib.util.spec_from_file_location('revisar_texto', os.path.join(REPO, 'scripts', 'revisar_texto.py'))
rt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rt)


def cargar(ruta):
    with open(ruta, encoding='utf8') as f:
        return json.load(f)


def main():
    escribir = '--escribir' in sys.argv
    sp = cargar(os.path.join(REPO, 'data', 'spider.json'))
    temas = sp['certificaciones'][CERT]
    bloques = sp['guias'][CERT]
    en_bloques = [t for b in bloques for t in b['temas']]
    errores = []
    if sorted(en_bloques) != sorted(temas) or len(set(en_bloques)) != len(en_bloques):
        errores.append('los temas de "guias" y de "certificaciones" no coinciden (o hay repetidos)')
    nodos = {n['id']: n for n in cargar(os.path.join(SPIDER, 'data', 'nodos.json'))}
    partes = []
    total = 0
    for b in bloques:
        tarjetas = []
        for t in b['temas']:
            n = nodos.get(t)
            if not n or n.get('estado') != 'publicado':
                errores.append(f'{t}: no es una ficha publicada en Tech Spider')
                continue
            preguntas = [p for p in cargar(os.path.join(SPIDER, 'data', 'preguntas', f'{t}.json'))
                         if CERT in p.get('certificaciones', [])]
            if not preguntas:
                errores.append(f'{t}: no tiene preguntas con {CERT}')
            total += len(preguntas)
            nombre = n.get('nombreEs') or n['nombre']
            tarjetas.append(f'''        <a class="service-card" href="../arquitechthor-spider/temas/{t}.html">
          <h3>{html.escape(nombre)}</h3>
          <p class="service-resumen">{html.escape(n.get('frase', ''))}</p>
          <p class="service-cat">{len(preguntas)} preguntas de {CERT}</p>
        </a>''')
        partes.append(f'''    <div class="conceptos-grupo">
      <h2 id="bloque-{b['id']}">{html.escape(b['titulo'])}</h2>
      <p>{html.escape(b['texto'])}</p>
      <div class="service-grid">
{chr(10).join(tarjetas)}
      </div>
    </div>''')
    if errores:
        for e in errores:
            print('ERROR', e)
        sys.exit(1)

    t = open(PAGINA, encoding='utf8').read()
    nuevo = re.sub(r'<!-- TEMAS:INICIO -->.*?<!-- TEMAS:FIN -->',
                   lambda m: '<!-- TEMAS:INICIO -->\n' + '\n'.join(partes) + '\n<!-- TEMAS:FIN -->', t, flags=re.S)
    ini, fin = nuevo.index('<main>'), nuevo.index('</main>')
    # Se quitan las siglas ya marcadas y se vuelven a marcar, para que el resultado no dependa de
    # lo que hubiera antes (la primera aparición de cada sigla lleva la explicación).
    limpio = RX_ABBR.sub(lambda m: m.group(1), nuevo[ini:fin])
    cuerpo, siglas = rt.aplicar_glosario_html(limpio, 'conceptos-aif-c01')
    nuevo = nuevo[:ini] + cuerpo + nuevo[fin:]
    cambia = nuevo != t
    if escribir and cambia:
        open(PAGINA, 'w', encoding='utf8', newline='\n').write(nuevo)
    estado = ('actualizada' if escribir else 'cambiaría') if cambia else 'sin cambios'
    print(f'conceptos-aif-c01.html {estado}: {len(temas)} fichas, {total} preguntas de {CERT}; siglas {" ".join(siglas)}')


if __name__ == '__main__':
    main()
