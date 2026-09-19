/**
 * Cliente API de EduGlow.
 *
 * VERSION LOCAL: ya no hace fetch() a un backend Node/Express en red.
 * En su lugar delega cada peticion a EduGlowDB.manejar() (ver db-local.js),
 * que simula el mismo API REST pero guardando todo en localStorage.
 * El resto del frontend (auth.js, dashboard.js, mentores.js, etc.) no
 * necesita ningun cambio: sigue llamando a EduGlowAPI.get/post/put/del
 * exactamente igual que antes.
 */
const EduGlowAPI = (() => {
  function obtenerToken() {
    return localStorage.getItem('eduglow_token');
  }

  function guardarSesion(token, usuario) {
    localStorage.setItem('eduglow_token', token);
    localStorage.setItem('eduglow_usuario', JSON.stringify(usuario));
  }

  function obtenerUsuario() {
    const raw = localStorage.getItem('eduglow_usuario');
    return raw ? JSON.parse(raw) : null;
  }

  function cerrarSesion() {
    localStorage.removeItem('eduglow_token');
    localStorage.removeItem('eduglow_usuario');
    window.location.href = 'login.html';
  }

  function estaAutenticado() {
    return !!obtenerToken();
  }

  async function solicitud(metodo, ruta, cuerpo) {
    // "await" y el try/catch se mantienen para no cambiar la forma en que
    // el resto del frontend consume esta funcion (con .then/async-await),
    // aunque EduGlowDB.manejar() ya no es una llamada de red real.
    try {
      const datos = await Promise.resolve(EduGlowDB.manejar(metodo, ruta, cuerpo));
      return datos;
    } catch (error) {
      if (error && error.status === 401 && ruta !== '/auth/login') {
        cerrarSesion();
        return;
      }
      throw new Error(error && error.message ? error.message : `Error ${(error && error.status) || ''}`.trim());
    }
  }

  return {
    get: (ruta) => solicitud('GET', ruta),
    post: (ruta, cuerpo) => solicitud('POST', ruta, cuerpo),
    put: (ruta, cuerpo) => solicitud('PUT', ruta, cuerpo),
    del: (ruta) => solicitud('DELETE', ruta),
    obtenerToken,
    guardarSesion,
    obtenerUsuario,
    cerrarSesion,
    estaAutenticado
  };
})();

/** Muestra un mensaje flotante (toast) en la esquina inferior derecha. */
function mostrarToast(mensaje, tipo = 'exito') {
  let contenedor = document.querySelector('.toast-contenedor');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.className = 'toast-contenedor';
    document.body.appendChild(contenedor);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${tipo === 'error' ? 'toast-error' : ''}`;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

/** Redirige al login si no hay sesion activa. Usar en paginas privadas. */
function protegerPagina(rolesPermitidos) {
  if (!EduGlowAPI.estaAutenticado()) {
    window.location.href = 'login.html';
    return null;
  }
  const usuario = EduGlowAPI.obtenerUsuario();
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    window.location.href = 'dashboard.html';
    return null;
  }
  return usuario;
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '';
  const [anio, mes, dia] = fechaIso.split('-');
  return `${dia}/${mes}/${anio}`;
}

function formatearHora(hora) {
  return hora ? hora.slice(0, 5) : '';
}

/** Muestra un mensaje inline dentro de un formulario (exito o error). */
function mostrarMensajeFormulario(elemento, mensaje, tipo = 'exito') {
  if (!elemento) return;
  elemento.textContent = mensaje;
  elemento.className = `mensaje-formulario visible ${tipo}`;
}
