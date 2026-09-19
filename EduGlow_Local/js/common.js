/**
 * Comportamiento comun del encabezado: menu movil y estado de sesion
 * en la barra de navegacion publica (index.html).
 */
document.addEventListener('DOMContentLoaded', () => {
  const encabezado = document.querySelector('.encabezado');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle && encabezado) {
    toggle.addEventListener('click', () => encabezado.classList.toggle('abierto'));
  }

  const zonaAuth = document.querySelector('[data-zona-auth]');
  if (zonaAuth) {
    if (EduGlowAPI.estaAutenticado()) {
      const usuario = EduGlowAPI.obtenerUsuario();
      zonaAuth.innerHTML = `
        <a href="dashboard.html" class="boton boton-fantasma boton-pequeno">Hola, ${escaparHtml(usuario.nombre)}</a>
        <a href="dashboard.html" class="boton boton-glow boton-pequeno">Mi panel</a>
      `;
    } else {
      zonaAuth.innerHTML = `
        <a href="login.html" class="boton boton-fantasma boton-pequeno">Iniciar sesion</a>
        <a href="registro.html" class="boton boton-glow boton-pequeno">Registrarse</a>
      `;
    }
  }

  const marcaActivo = document.body.dataset.pagina;
  if (marcaActivo) {
    document.querySelectorAll(`.nav-principal a[data-pagina="${marcaActivo}"]`).forEach((el) => el.classList.add('activo'));
    document.querySelectorAll(`.barra-lateral a[data-pagina="${marcaActivo}"]`).forEach((el) => el.classList.add('activo'));
  }

  const botonSalir = document.querySelector('[data-accion="cerrar-sesion"]');
  if (botonSalir) {
    botonSalir.addEventListener('click', (e) => {
      e.preventDefault();
      EduGlowAPI.cerrarSesion();
    });
  }
});
