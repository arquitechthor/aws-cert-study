"""
Genera sitemap.xml (tarea 3.3 de PLAN.md) con las páginas indexables del sitio:
  - la portada, el simulacro, el juego de memoria y el aviso legal;
  - servicios/<id>.html de cada servicio con estado "publicado" en data/servicios.json.
Se excluyen las páginas con noindex: servicio.html ("Próximamente"), progreso.html (datos locales
de cada visitante) y plantillas/.
<lastmod> es la fecha del último commit que tocó cada fichero, o la de hoy si tiene cambios sin
confirmar. El robots.txt que lo anuncia vive en la raíz del dominio (repo arquitechthor.github.io),
porque los buscadores solo leen /robots.txt.
Sin dependencias (Python 3 y git). Uso, desde la raíz del repo, tras publicar una guía:
  python scripts/generar_sitemap.py
"""
import datetime, json, os, subprocess
from xml.sax.saxutils import escape

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://arquitechthor.github.io/aws-cert-study/'
FIJAS = [('index.html', ''), ('simulacro.html', 'simulacro.html'), ('memoria.html', 'memoria.html'),
         ('aviso-legal.html', 'aviso-legal.html')]


def git(*args):
    return subprocess.run(['git', *args], cwd=REPO, capture_output=True, text=True).stdout.strip()


def lastmod(ruta):
    if git('status', '--porcelain', '--', ruta):
        return datetime.date.today().isoformat()
    return git('log', '-1', '--format=%cs', '--', ruta) or datetime.date.today().isoformat()


def main():
    servicios = json.load(open(os.path.join(REPO, 'data', 'servicios.json'), encoding='utf8'))
    paginas = list(FIJAS) + [(f'servicios/{s["id"]}.html', f'servicios/{s["id"]}.html')
                             for s in sorted(servicios, key=lambda s: s['id']) if s['estado'] == 'publicado']
    filas = []
    for fichero, ruta_url in paginas:
        if not os.path.exists(os.path.join(REPO, fichero)):
            raise SystemExit(f'Falta {fichero}')
        filas.append(f'  <url><loc>{escape(BASE + ruta_url)}</loc><lastmod>{lastmod(fichero)}</lastmod></url>')
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(filas) + '\n</urlset>\n')
    open(os.path.join(REPO, 'sitemap.xml'), 'w', encoding='utf8', newline='\n').write(xml)
    print(f'sitemap.xml: {len(filas)} URL')


if __name__ == '__main__':
    main()
