// -------------------- Login --------------------
const formLogin = document.getElementById('form-login');
if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mensaje = document.getElementById('mensaje-login');
    const boton = document.getElementById('boton-login');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    boton.disabled = true;
    boton.textContent = 'Ingresando...';

    try {
      const data = await EduGlowAPI.post('/auth/login', { email, password });
      EduGlowAPI.guardarSesion(data.token, data.usuario);
      mostrarMensajeFormulario(mensaje, 'Sesion iniciada. Redirigiendo...', 'exito');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
    } catch (error) {
      mostrarMensajeFormulario(mensaje, error.message, 'error');
      boton.disabled = false;
      boton.textContent = 'Iniciar sesion';
    }
  });
}

// -------------------- Registro --------------------
const formRegistro = document.getElementById('form-registro');
if (formRegistro) {
  formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mensaje = document.getElementById('mensaje-registro');
    const boton = document.getElementById('boton-registro');

    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmarPassword = document.getElementById('confirmarPassword').value;

    if (password !== confirmarPassword) {
      mostrarMensajeFormulario(mensaje, 'Las contrasenas no coinciden.', 'error');
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Creando cuenta...';

    try {
      const data = await EduGlowAPI.post('/auth/register', { nombre, apellido, email, password, confirmarPassword });
      EduGlowAPI.guardarSesion(data.token, data.usuario);
      mostrarMensajeFormulario(mensaje, 'Cuenta creada. Redirigiendo...', 'exito');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
    } catch (error) {
      mostrarMensajeFormulario(mensaje, error.message, 'error');
      boton.disabled = false;
      boton.textContent = 'Crear cuenta';
    }
  });
}
