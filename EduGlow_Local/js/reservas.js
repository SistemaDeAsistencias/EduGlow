(async () => {
  const usuario = protegerPagina();
  if (!usuario) return;

  if (usuario.rol === 'admin') document.getElementById('enlace-admin').classList.remove('oculto');

  await cargarReservas();
})();

const ESTADO_ETIQUETA = {
  pendiente: 'etiqueta-neutra',
  confirmada: '',
  completada: 'etiqueta-glow',
  cancelada: 'etiqueta-alerta'
};

async function cargarReservas() {
  const cont = document.getElementById('lista-reservas');
  try {
    const usuario = EduGlowAPI.obtenerUsuario();
    const ruta = usuario.rol === 'mentor' ? '/sesiones/de-mi-mentoria' : '/sesiones/mias';
    const { sesiones } = await EduGlowAPI.get(ruta);

    if (!sesiones || sesiones.length === 0) {
      cont.innerHTML = '<div class="estado-vacio">Aun no tienes reservas. <a href="explorar.html">Busca un mentor</a> para agendar tu primera sesion.</div>';
      return;
    }

    cont.innerHTML = `
      <div class="tabla-envoltorio">
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Hora</th><th>${usuario.rol === 'mentor' ? 'Estudiante' : 'Mentor'}</th><th>Motivo</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${sesiones.map((s) => filaReservaHTML(s, usuario.rol)).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('[data-accion="cancelar"]').forEach((btn) => {
      btn.addEventListener('click', () => cancelarReserva(btn.dataset.id));
    });
    document.querySelectorAll('[data-accion="reprogramar"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirModalReprogramar(btn.dataset.id, btn.dataset.fecha, btn.dataset.hora));
    });
    document.querySelectorAll('[data-accion="cambiar-estado"]').forEach((sel) => {
      sel.addEventListener('change', () => cambiarEstadoReserva(sel.dataset.id, sel.value));
    });
  } catch (error) {
    cont.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}

function filaReservaHTML(s, rolActual) {
  const contraparte = rolActual === 'mentor'
    ? `${s.usuario_nombre} ${s.usuario_apellido}`
    : `${s.mentor_nombre} ${s.mentor_apellido}`;

  const puedeGestionar = s.estado === 'pendiente' || s.estado === 'confirmada';

  let selectorEstado = '';
  if (rolActual === 'mentor' && puedeGestionar) {
    selectorEstado = `
      <select data-accion="cambiar-estado" data-id="${s.id}" style="padding:.3rem .5rem; border-radius:6px; border:1px solid var(--border);">
        <option value="pendiente" ${s.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="confirmada" ${s.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
        <option value="completada">Completada</option>
      </select>
    `;
  }

  return `
    <tr>
      <td>${formatearFecha(s.fecha)}</td>
      <td>${formatearHora(s.hora)}</td>
      <td>${escaparHtml(contraparte)}</td>
      <td>${escaparHtml(s.motivo || '—')}</td>
      <td><span class="etiqueta ${ESTADO_ETIQUETA[s.estado] || ''}">${s.estado}</span></td>
      <td class="acciones-tabla">
        ${selectorEstado}
        ${puedeGestionar ? `
          <button class="boton boton-linea boton-pequeno" data-accion="reprogramar" data-id="${s.id}" data-fecha="${s.fecha}" data-hora="${s.hora}">Reprogramar</button>
          <button class="boton boton-peligro boton-pequeno" data-accion="cancelar" data-id="${s.id}">Cancelar</button>
        ` : ''}
      </td>
    </tr>
  `;
}

async function cancelarReserva(id) {
  if (!confirm('¿Seguro que deseas cancelar esta reserva?')) return;
  try {
    await EduGlowAPI.put(`/sesiones/${id}/cancelar`);
    mostrarToast('Reserva cancelada correctamente.');
    cargarReservas();
  } catch (error) {
    mostrarToast(error.message, 'error');
  }
}

async function cambiarEstadoReserva(id, estado) {
  try {
    await EduGlowAPI.put(`/sesiones/${id}/estado`, { estado });
    mostrarToast('Estado actualizado correctamente.');
    cargarReservas();
  } catch (error) {
    mostrarToast(error.message, 'error');
  }
}

// -------------------- Modal de reprogramacion --------------------
const modal = document.getElementById('modal-reprogramar');
function abrirModalReprogramar(id, fecha, hora) {
  document.getElementById('reprogramar-id').value = id;
  document.getElementById('reprogramar-fecha').value = fecha;
  document.getElementById('reprogramar-hora').value = hora.slice(0, 5);
  document.getElementById('mensaje-reprogramar').className = 'mensaje-formulario';
  modal.classList.remove('oculto');
}
document.getElementById('boton-cerrar-modal').addEventListener('click', () => modal.classList.add('oculto'));

document.getElementById('form-reprogramar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('reprogramar-id').value;
  const fecha = document.getElementById('reprogramar-fecha').value;
  const hora = document.getElementById('reprogramar-hora').value;
  const mensaje = document.getElementById('mensaje-reprogramar');

  try {
    await EduGlowAPI.put(`/sesiones/${id}`, { fecha, hora });
    modal.classList.add('oculto');
    mostrarToast('Reserva reprogramada correctamente.');
    cargarReservas();
  } catch (error) {
    mostrarMensajeFormulario(mensaje, error.message, 'error');
  }
});
