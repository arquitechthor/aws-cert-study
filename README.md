# aws-cert-study

Apuntes personales para preparar certificaciones de AWS, organizados por servicio, con
preguntas de práctica originales. Sitio estático publicado con GitHub Pages:

**https://arquitechthor.github.io/aws-cert-study/**

Certificaciones cubiertas: Solutions Architect – Associate (SAA-C03), Solutions Architect –
Professional (SAP-C02 y SAP-C03) y AI Practitioner (AIF-C01).

## Aviso

Proyecto **personal, educativo y sin fines comerciales**. No está afiliado, patrocinado ni
respaldado por Amazon Web Services, Inc. ni por Amazon.com, Inc. No es material oficial de
AWS Training and Certification y no contiene preguntas reales de examen. Amazon Web Services,
AWS, los nombres de sus servicios y sus iconos son marcas de Amazon.com, Inc. o sus filiales.

El aviso legal completo está en [`aviso-legal.html`](aviso-legal.html).

## Licencia

El contenido original de este repositorio (textos, preguntas, código y datos) se publica bajo
**[Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.es)**.
Ver [`LICENSE`](LICENSE).

**Excluido de la licencia** (pertenece a sus titulares y conserva sus propias condiciones):

- Los iconos oficiales de AWS (*AWS Architecture Icons*) de `assets/iconos/`.
- Las marcas, nombres de servicios y logotipos de AWS.
- Las citas literales de documentación de AWS, identificadas y enlazadas a su fuente.
- Los recursos de marca de Kopi (`assets/logo.png` y los favicons).

## Desarrollo

HTML/CSS/JS puro, sin build. Para verlo en local (los `fetch` de JSON no funcionan con
`file://`):

```bash
npx serve .
# o
python -m http.server
```

El plan de trabajo y su seguimiento están en [`PLAN.md`](PLAN.md).
