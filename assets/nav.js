/**
 * Menú de navegación móvil, compartido por todas las páginas (copiado de kopi-web). Alterna la
 * clase .nav-links-open (los estilos del panel desplegable viven en styles.css) y mantiene
 * aria-expanded en sincronía para lectores de pantalla.
 */
(function () {
  const toggle = document.getElementById('navToggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'navLinks');
  links.id = links.id || 'navLinks';

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('nav-links-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
})();
