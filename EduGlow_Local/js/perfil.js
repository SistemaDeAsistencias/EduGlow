(async () => {
  const usuario = protegerPagina();
  if (!usuario) return;

  if (usuario.rol === 'admin') document.getElementById('enlace-admin').classList.remove('oculto');

  try {
    const { usuario: datosActuales } = await EduGlowAPI.get('/auth/me');
    document.getElementById('nombre').value = datosActuales.nombre;
    document.getElementById('apellido').value = datosActuales.apellido;
    document.getElementById('email').value = datosActuales.email;
    document.getElementById('rol').value = datosActuales.rol;
  } catch (error) {
    mostrarToast(error.message, 'error');
  }

  cargarProgreso();
  cargarCredenciales();
})();

document.getElementById('form-perfil').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mensaje = document.getElementById('mensaje-perfil');
  const nombre = document.getElementById('nombre').value.trim();
  const apellido = document.getElementById('apellido').value.trim();

  try {
    const { usuario } = await EduGlowAPI.put('/users/perfil', { nombre, apellido });
    const actual = EduGlowAPI.obtenerUsuario();
    EduGlowAPI.guardarSesion(EduGlowAPI.obtenerToken(), { ...actual, nombre: usuario.nombre, apellido: usuario.apellido });
    mostrarMensajeFormulario(mensaje, 'Perfil actualizado correctamente.', 'exito');
  } catch (error) {
    mostrarMensajeFormulario(mensaje, error.message, 'error');
  }
});

document.getElementById('form-password').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mensaje = document.getElementById('mensaje-password');
  const passwordActual = document.getElementById('passwordActual').value;
  const passwordNueva = document.getElementById('passwordNueva').value;

  try {
    await EduGlowAPI.put('/users/perfil/password', { passwordActual, passwordNueva });
    mostrarMensajeFormulario(mensaje, 'Contrasena actualizada correctamente.', 'exito');
    e.target.reset();
  } catch (error) {
    mostrarMensajeFormulario(mensaje, error.message, 'error');
  }
});

async function cargarProgreso() {
  const cont = document.getElementById('lista-progreso-perfil');
  try {
    const { progreso } = await EduGlowAPI.get('/progreso');
    if (!progreso || progreso.length === 0) {
      cont.innerHTML = '<div class="estado-vacio">Aun no iniciaste ninguna ruta. <a href="index.html#rutas">Explora las rutas disponibles</a>.</div>';
      return;
    }
    cont.innerHTML = progreso.map((p) => `
      <div class="fila-sesion">
        <div style="flex:1;">
          <strong>${escaparHtml(p.ruta_nombre)}</strong>
          <div class="barra-progreso mt-1" style="max-width:260px;"><div class="barra-progreso__relleno" style="width:${p.porcentaje}%"></div></div>
        </div>
        <span style="font-size:.85rem; color:var(--text-muted);">${Number(p.porcentaje).toFixed(0)}%</span>
        <a href="ruta.html?id=${p.ruta_id}" class="boton boton-linea boton-pequeno">Ver</a>
      </div>
    `).join('');
  } catch (error) {
    cont.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}

async function cargarCredenciales() {
  const cont = document.getElementById('lista-credenciales');
  try {
    const { credenciales } = await EduGlowAPI.get('/progreso/credenciales');
    if (!credenciales || credenciales.length === 0) {
      cont.innerHTML = '<div class="estado-vacio">Aun no obtienes credenciales. Completa una ruta al 100% para desbloquear tu primera credencial digital.</div>';
      return;
    }
    cont.innerHTML = credenciales.map((c) => `
      <div class="fila-sesion">
        <div style="flex:1;">
          <strong>🏅 ${escaparHtml(c.ruta_nombre)}</strong>
          <div style="font-size:.8rem; color:var(--text-muted);">Codigo de verificacion: ${escaparHtml(c.codigo_verificacion)}</div>
        </div>
        <span style="font-size:.8rem; color:var(--text-muted);">${formatearFecha(c.fecha_emision.slice(0, 10))}</span>
      </div>
    `).join('');
  } catch (error) {
    cont.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}
