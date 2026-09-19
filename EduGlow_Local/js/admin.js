(async () => {
  const usuario = protegerPagina(['admin']);
  if (!usuario) return;

  cargarEstadisticas();
  cargarUsuarios();
  cargarMentores();
  cargarRutas();
  cargarReservasAdmin();
})();

// ------------------------------------------------------------
// Pestanas
// ------------------------------------------------------------
document.querySelectorAll('.pestanas button').forEach((boton) => {
  boton.addEventListener('click', () => {
    document.querySelectorAll('.pestanas button').forEach((b) => b.classList.remove('activo'));
    boton.classList.add('activo');
    const tab = boton.dataset.tab;
    document.querySelectorAll('.panel-tab').forEach((panel) => {
      panel.classList.toggle('oculto', panel.dataset.panel !== tab);
    });
  });
});

const modal = document.getElementById('modal-admin');
const modalContenido = document.getElementById('modal-admin-contenido');
function abrirModal(html) {
  modalContenido.innerHTML = html;
  modal.classList.remove('oculto');
}
function cerrarModal() { modal.classList.add('oculto'); }
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

// ------------------------------------------------------------
// Estadisticas
// ------------------------------------------------------------
async function cargarEstadisticas() {
  const cont = document.getElementById('tarjetas-estadisticas');
  try {
    const { estadisticas } = await EduGlowAPI.get('/admin/estadisticas');
    cont.innerHTML = `
      <div class="tarjeta tarjeta-stat"><span class="valor">${estadisticas.total_usuarios}</span><span class="etiqueta-stat">Usuarios totales</span></div>
      <div class="tarjeta tarjeta-stat"><span class="valor">${estadisticas.total_mentores}</span><span class="etiqueta-stat">Mentores activos</span></div>
      <div class="tarjeta tarjeta-stat"><span class="valor">${estadisticas.total_rutas}</span><span class="etiqueta-stat">Rutas activas</span></div>
      <div class="tarjeta tarjeta-stat"><span class="valor">${estadisticas.total_reservas}</span><span class="etiqueta-stat">Reservas totales</span></div>
    `;
  } catch (error) {
    cont.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}

// ------------------------------------------------------------
// Usuarios
// ------------------------------------------------------------
async function cargarUsuarios() {
  const cont = document.getElementById('tabla-usuarios');
  const busqueda = document.getElementById('filtro-usuario-busqueda').value.trim();
  const rol = document.getElementById('filtro-usuario-rol').value;
  const params = new URLSearchParams();
  if (busqueda) params.set('busqueda', busqueda);
  if (rol) params.set('rol', rol);

  try {
    const { usuarios } = await EduGlowAPI.get(`/users?${params.toString()}`);
    if (!usuarios.length) { cont.innerHTML = '<div class="estado-vacio">No se encontraron usuarios.</div>'; return; }

    cont.innerHTML = `
      <div class="tabla-envoltorio">
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead>
          <tbody>
            ${usuarios.map((u) => `
              <tr>
                <td>${escaparHtml(u.nombre)} ${escaparHtml(u.apellido)}</td>
                <td>${escaparHtml(u.email)}</td>
                <td>
                  <select data-accion="cambiar-rol" data-id="${u.id}" style="padding:.3rem .5rem; border-radius:6px; border:1px solid var(--border);">
                    <option value="estudiante" ${u.rol === 'estudiante' ? 'selected' : ''}>Estudiante</option>
                    <option value="mentor" ${u.rol === 'mentor' ? 'selected' : ''}>Mentor</option>
                    <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                </td>
                <td><span class="etiqueta ${u.estado === 'activo' ? '' : 'etiqueta-alerta'}">${u.estado}</span></td>
                <td>${formatearFecha(u.fecha_registro.slice(0, 10))}</td>
                <td class="acciones-tabla">
                  <button class="boton boton-linea boton-pequeno" data-accion="toggle-estado-usuario" data-id="${u.id}" data-estado="${u.estado}">
                    ${u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('[data-accion="toggle-estado-usuario"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nuevoEstado = btn.dataset.estado === 'activo' ? 'inactivo' : 'activo';
        try {
          await EduGlowAPI.put(`/users/${btn.dataset.id}/estado`, { estado: nuevoEstado });
          mostrarToast('Estado del usuario actualizado.');
          cargarUsuarios();
        } catch (error) { mostrarToast(error.message, 'error'); }
      });
    });
    document.querySelectorAll('[data-accion="cambiar-rol"]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        try {
          await EduGlowAPI.put(`/users/${sel.dataset.id}/rol`, { rol: sel.value });
          mostrarToast('Rol actualizado correctamente.');
          cargarMentores();
        } catch (error) { mostrarToast(error.message, 'error'); }
      });
    });
  } catch (error) {
    cont.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}
document.getElementById('boton-filtrar-usuarios').addEventListener('click', cargarUsuarios);

// ------------------------------------------------------------
// Mentores
// ------------------------------------------------------------
async function cargarMentores() {
  const cont = document.getElementById('tabla-mentores');
  try {
    const { mentores } = await EduGlowAPI.get('/mentores?estado=activo');
    let inactivos = [];
    try {
      const resp = await EduGlowAPI.get('/mentores?estado=inactivo');
      inactivos = resp.mentores || [];
    } catch (e) { /* sin mentores inactivos */ }
    const todos = [...mentores, ...inactivos];

    if (!todos.length) { cont.innerHTML = '<div class="estado-vacio">Aun no hay mentores registrados.</div>'; return; }

    cont.innerHTML = `
      <div class="tabla-envoltorio">
        <table>
          <thead><tr><th>Nombre</th><th>Especialidad</th><th>Experiencia</th><th>Calificacion</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            ${todos.map((m) => `
              <tr>
                <td>${escaparHtml(m.nombre)} ${escaparHtml(m.apellido)}</td>
                <td>${escaparHtml(m.especialidad)}</td>
                <td>${m.experiencia} anios</td>
                <td>★ ${Number(m.calificacion).toFixed(1)}</td>
                <td><span class="etiqueta ${m.estado === 'activo' ? '' : 'etiqueta-alerta'}">${m.estado}</span></td>
                <td class="acciones-tabla">
                  <button class="boton boton-linea boton-pequeno" data-accion="editar-mentor" data-id="${m.id}">Editar</button>
                  <button class="boton boton-peligro boton-pequeno" data-accion="toggle-estado-mentor" data-id="${m.id}" data-estado="${m.estado}">
                    ${m.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('[data-accion="toggle-estado-mentor"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nuevoEstado = btn.dataset.estado === 'activo' ? 'inactivo' : 'activo';
        try {
          await EduGlowAPI.put(`/mentores/${btn.dataset.id}/estado`, { estado: nuevoEstado });
          mostrarToast('Estado del mentor actualizado.');
          cargarMentores();
        } catch (error) { mostrarToast(error.message, 'error'); }
      });
    });
    document.querySelectorAll('[data-accion="editar-mentor"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirModalEditarMentor(todos.find((m) => String(m.id) === btn.dataset.id)));
    });
  } catch (error) {
    cont.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}

document.getElementById('boton-nuevo-mentor').addEventListener('click', () => {
  abrirModal(`
    <h3>Nuevo mentor</h3>
    <div class="mensaje-formulario" id="mensaje-modal"></div>
    <form id="form-nuevo-mentor">
      <div class="campo-fila">
        <div class="campo"><label>Nombre</label><input type="text" id="nm-nombre" required></div>
        <div class="campo"><label>Apellido</label><input type="text" id="nm-apellido" required></div>
      </div>
      <div class="campo"><label>Correo</label><input type="email" id="nm-email" required></div>
      <div class="campo"><label>Contrasena temporal</label><input type="password" id="nm-password" minlength="8" required></div>
      <div class="campo"><label>Especialidad</label><input type="text" id="nm-especialidad" required></div>
      <div class="campo"><label>Biografia</label><textarea id="nm-biografia" rows="2"></textarea></div>
      <div class="campo-fila">
        <div class="campo"><label>Experiencia (anios)</label><input type="number" id="nm-experiencia" min="0" value="0"></div>
        <div class="campo"><label>Tarifa (S/)</label><input type="number" id="nm-tarifa" min="0" value="0"></div>
      </div>
      <div class="campo"><label>Habilidades (separadas por coma)</label><input type="text" id="nm-habilidades"></div>
      <div class="campo"><label>Disponibilidad</label><input type="text" id="nm-disponibilidad"></div>
      <div class="flex-entre mt-1">
        <button type="button" class="boton boton-linea" onclick="cerrarModal()">Cancelar</button>
        <button type="submit" class="boton boton-glow">Crear mentor</button>
      </div>
    </form>
  `);

  document.getElementById('form-nuevo-mentor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mensaje = document.getElementById('mensaje-modal');
    try {
      await EduGlowAPI.post('/mentores', {
        nombre: document.getElementById('nm-nombre').value.trim(),
        apellido: document.getElementById('nm-apellido').value.trim(),
        email: document.getElementById('nm-email').value.trim(),
        password: document.getElementById('nm-password').value,
        especialidad: document.getElementById('nm-especialidad').value.trim(),
        biografia: document.getElementById('nm-biografia').value.trim(),
        experiencia: Number(document.getElementById('nm-experiencia').value),
        tarifa: Number(document.getElementById('nm-tarifa').value),
        habilidades: document.getElementById('nm-habilidades').value.trim(),
        disponibilidad: document.getElementById('nm-disponibilidad').value.trim()
      });
      cerrarModal();
      mostrarToast('Mentor creado correctamente.');
      cargarMentores();
      cargarEstadisticas();
    } catch (error) {
      mostrarMensajeFormulario(mensaje, error.message, 'error');
    }
  });
});

function abrirModalEditarMentor(mentor) {
  abrirModal(`
    <h3>Editar mentor</h3>
    <div class="mensaje-formulario" id="mensaje-modal"></div>
    <form id="form-editar-mentor">
      <div class="campo"><label>Especialidad</label><input type="text" id="em-especialidad" value="${escaparHtml(mentor.especialidad)}" required></div>
      <div class="campo"><label>Biografia</label><textarea id="em-biografia" rows="2">${escaparHtml(mentor.biografia || '')}</textarea></div>
      <div class="campo-fila">
        <div class="campo"><label>Experiencia (anios)</label><input type="number" id="em-experiencia" min="0" value="${mentor.experiencia}"></div>
        <div class="campo"><label>Tarifa (S/)</label><input type="number" id="em-tarifa" min="0" value="${mentor.tarifa}"></div>
      </div>
      <div class="campo"><label>Habilidades</label><input type="text" id="em-habilidades" value="${escaparHtml(mentor.habilidades || '')}"></div>
      <div class="campo"><label>Disponibilidad</label><input type="text" id="em-disponibilidad" value="${escaparHtml(mentor.disponibilidad || '')}"></div>
      <div class="flex-entre mt-1">
        <button type="button" class="boton boton-linea" onclick="cerrarModal()">Cancelar</button>
        <button type="submit" class="boton boton-glow">Guardar cambios</button>
      </div>
    </form>
  `);

  document.getElementById('form-editar-mentor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mensaje = document.getElementById('mensaje-modal');
    try {
      await EduGlowAPI.put(`/mentores/${mentor.id}`, {
        especialidad: document.getElementById('em-especialidad').value.trim(),
        biografia: document.getElementById('em-biografia').value.trim(),
        experiencia: Number(document.getElementById('em-experiencia').value),
        tarifa: Number(document.getElementById('em-tarifa').value),
        habilidades: document.getElementById('em-habilidades').value.trim(),
        disponibilidad: document.getElementById('em-disponibilidad').value.trim()
      });
      cerrarModal();
      mostrarToast('Mentor actualizado correctamente.');
      cargarMentores();
    } catch (error) {
      mostrarMensajeFormulario(mensaje, error.message, 'error');
    }
  });
}

// ------------------------------------------------------------
// Rutas
// ------------------------------------------------------------
async function cargarRutas() {
  const cont = document.getElementById('tabla-rutas');
  try {
    const { rutas } = await EduGlowAPI.get('/rutas');
    if (!rutas.length) { cont.innerHTML = '<div class="estado-vacio">Aun no hay rutas registradas.</div>'; return; }

    cont.innerHTML = `
      <div class="tabla-envoltorio">
        <table>
          <thead><tr><th>Nombre</th><th>Nivel</th><th>Duracion</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            ${rutas.map((r) => `
              <tr>
                <td>${escaparHtml(r.nombre)}</td>
                <td>${escaparHtml(r.nivel)}</td>
                <td>${escaparHtml(r.duracion || '—')}</td>
                <td><span class="etiqueta ${r.estado === 'activo' ? '' : 'etiqueta-alerta'}">${r.estado}</span></td>
                <td class="acciones-tabla">
                  <button class="boton boton-linea boton-pequeno" data-accion="editar-ruta" data-id="${r.id}">Editar</button>
                  <button class="boton boton-peligro boton-pequeno" data-accion="toggle-estado-ruta" data-id="${r.id}" data-estado="${r.estado}">
                    ${r.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('[data-accion="toggle-estado-ruta"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nuevoEstado = btn.dataset.estado === 'activo' ? 'inactivo' : 'activo';
        try {
          await EduGlowAPI.put(`/rutas/${btn.dataset.id}/estado`, { estado: nuevoEstado });
          mostrarToast('Estado de la ruta actualizado.');
          cargarRutas();
          cargarEstadisticas();
        } catch (error) { mostrarToast(error.message, 'error'); }
      });
    });
    document.querySelectorAll('[data-accion="editar-ruta"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirModalEditarRuta(rutas.find((r) => String(r.id) === btn.dataset.id)));
    });
  } catch (error) {
    cont.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}

document.getElementById('boton-nueva-ruta').addEventListener('click', () => {
  abrirModal(`
    <h3>Nueva ruta</h3>
    <div class="mensaje-formulario" id="mensaje-modal"></div>
    <form id="form-nueva-ruta">
      <div class="campo"><label>Nombre</label><input type="text" id="nr-nombre" required></div>
      <div class="campo"><label>Descripcion</label><textarea id="nr-descripcion" rows="3"></textarea></div>
      <div class="campo-fila">
        <div class="campo">
          <label>Nivel</label>
          <select id="nr-nivel">
            <option value="basico">Basico</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
        <div class="campo"><label>Duracion</label><input type="text" id="nr-duracion" placeholder="Ej: 8 semanas"></div>
      </div>
      <div class="flex-entre mt-1">
        <button type="button" class="boton boton-linea" onclick="cerrarModal()">Cancelar</button>
        <button type="submit" class="boton boton-glow">Crear ruta</button>
      </div>
    </form>
  `);

  document.getElementById('form-nueva-ruta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mensaje = document.getElementById('mensaje-modal');
    try {
      await EduGlowAPI.post('/rutas', {
        nombre: document.getElementById('nr-nombre').value.trim(),
        descripcion: document.getElementById('nr-descripcion').value.trim(),
        nivel: document.getElementById('nr-nivel').value,
        duracion: document.getElementById('nr-duracion').value.trim()
      });
      cerrarModal();
      mostrarToast('Ruta creada correctamente.');
      cargarRutas();
      cargarEstadisticas();
    } catch (error) {
      mostrarMensajeFormulario(mensaje, error.message, 'error');
    }
  });
});

function abrirModalEditarRuta(ruta) {
  abrirModal(`
    <h3>Editar ruta</h3>
    <div class="mensaje-formulario" id="mensaje-modal"></div>
    <form id="form-editar-ruta">
      <div class="campo"><label>Nombre</label><input type="text" id="er-nombre" value="${escaparHtml(ruta.nombre)}" required></div>
      <div class="campo"><label>Descripcion</label><textarea id="er-descripcion" rows="3">${escaparHtml(ruta.descripcion || '')}</textarea></div>
      <div class="campo-fila">
        <div class="campo">
          <label>Nivel</label>
          <select id="er-nivel">
            <option value="basico" ${ruta.nivel === 'basico' ? 'selected' : ''}>Basico</option>
            <option value="intermedio" ${ruta.nivel === 'intermedio' ? 'selected' : ''}>Intermedio</option>
            <option value="avanzado" ${ruta.nivel === 'avanzado' ? 'selected' : ''}>Avanzado</option>
          </select>
        </div>
        <div class="campo"><label>Duracion</label><input type="text" id="er-duracion" value="${escaparHtml(ruta.duracion || '')}"></div>
      </div>
      <div class="flex-entre mt-1">
        <button type="button" class="boton boton-linea" onclick="cerrarModal()">Cancelar</button>
        <button type="submit" class="boton boton-glow">Guardar cambios</button>
      </div>
    </form>
  `);

  document.getElementById('form-editar-ruta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mensaje = document.getElementById('mensaje-modal');
    try {
      await EduGlowAPI.put(`/rutas/${ruta.id}`, {
        nombre: document.getElementById('er-nombre').value.trim(),
        descripcion: document.getElementById('er-descripcion').value.trim(),
        nivel: document.getElementById('er-nivel').value,
        duracion: document.getElementById('er-duracion').value.trim()
      });
      cerrarModal();
      mostrarToast('Ruta actualizada correctamente.');
      cargarRutas();
    } catch (error) {
      mostrarMensajeFormulario(mensaje, error.message, 'error');
    }
  });
}

// ------------------------------------------------------------
// Reservas (vista global)
// ------------------------------------------------------------
async function cargarReservasAdmin() {
  const cont = document.getElementById('tabla-reservas');
  const estado = document.getElementById('filtro-reserva-estado').value;
  const fecha = document.getElementById('filtro-reserva-fecha').value;
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (fecha) params.set('fecha', fecha);

  try {
    const { sesiones } = await EduGlowAPI.get(`/sesiones?${params.toString()}`);
    if (!sesiones.length) { cont.innerHTML = '<div class="estado-vacio">No hay reservas para estos filtros.</div>'; return; }

    cont.innerHTML = `
      <div class="tabla-envoltorio">
        <table>
          <thead><tr><th>Fecha</th><th>Hora</th><th>Estudiante</th><th>Mentor</th><th>Estado</th><th>Cambiar estado</th></tr></thead>
          <tbody>
            ${sesiones.map((s) => `
              <tr>
                <td>${formatearFecha(s.fecha)}</td>
                <td>${formatearHora(s.hora)}</td>
                <td>${escaparHtml(s.usuario_nombre)} ${escaparHtml(s.usuario_apellido)}</td>
                <td>${escaparHtml(s.mentor_nombre)} ${escaparHtml(s.mentor_apellido)}</td>
                <td><span class="etiqueta ${s.estado === 'cancelada' ? 'etiqueta-alerta' : ''}">${s.estado}</span></td>
                <td>
                  <select data-accion="admin-cambiar-estado" data-id="${s.id}" style="padding:.3rem .5rem; border-radius:6px; border:1px solid var(--border);">
                    <option value="pendiente" ${s.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="confirmada" ${s.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
                    <option value="completada" ${s.estado === 'completada' ? 'selected' : ''}>Completada</option>
                    <option value="cancelada" ${s.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('[data-accion="admin-cambiar-estado"]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        try {
          await EduGlowAPI.put(`/sesiones/${sel.dataset.id}/estado`, { estado: sel.value });
          mostrarToast('Estado de la reserva actualizado.');
          cargarEstadisticas();
        } catch (error) { mostrarToast(error.message, 'error'); }
      });
    });
  } catch (error) {
    cont.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}
document.getElementById('boton-filtrar-reservas').addEventListener('click', cargarReservasAdmin);
