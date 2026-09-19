// -------------------- Explorar mentores --------------------
const listaMentores = document.getElementById('lista-mentores');
if (listaMentores) {
  const formFiltros = document.getElementById('form-filtros');

  async function cargarMentores() {
    listaMentores.innerHTML = '<div class="cargando">Buscando mentores...</div>';
    const params = new URLSearchParams();
    const busqueda = document.getElementById('busqueda').value.trim();
    const especialidad = document.getElementById('especialidad').value;
    const experienciaMin = document.getElementById('experiencia').value;
    const orden = document.getElementById('orden').value;

    if (busqueda) params.set('busqueda', busqueda);
    if (especialidad) params.set('especialidad', especialidad);
    if (experienciaMin) params.set('experienciaMin', experienciaMin);
    if (orden) params.set('orden', orden);

    try {
      const { mentores } = await EduGlowAPI.get(`/mentores?${params.toString()}`);
      if (!mentores || mentores.length === 0) {
        listaMentores.innerHTML = '<div class="estado-vacio">No se encontraron mentores con esos filtros.</div>';
        return;
      }
      listaMentores.innerHTML = mentores.map(tarjetaMentorHTML).join('');
    } catch (error) {
      listaMentores.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
    }
  }

  formFiltros.addEventListener('submit', (e) => { e.preventDefault(); cargarMentores(); });
  cargarMentores();
}

function tarjetaMentorHTML(m) {
  const iniciales = `${m.nombre?.[0] || ''}${m.apellido?.[0] || ''}`.toUpperCase();
  return `
    <article class="tarjeta tarjeta-mentor">
      <div class="avatar-mentor">${iniciales}</div>
      <div>
        <h3 style="margin-bottom:.2rem;">${escaparHtml(m.nombre)} ${escaparHtml(m.apellido)}</h3>
        <span class="etiqueta etiqueta-glow">${escaparHtml(m.especialidad)}</span>
      </div>
      <p style="font-size:.9rem;">${escaparHtml((m.biografia || '').slice(0, 90))}${m.biografia && m.biografia.length > 90 ? '…' : ''}</p>
      <div class="flex-entre">
        <span class="calificacion">★ ${Number(m.calificacion).toFixed(1)} · ${m.experiencia} anios</span>
        <a href="mentor.html?id=${m.id}" class="boton boton-linea boton-pequeno">Ver perfil</a>
      </div>
    </article>
  `;
}

// -------------------- Perfil del mentor --------------------
const contenidoMentor = document.getElementById('contenido-mentor');
if (contenidoMentor) {
  const idMentor = new URLSearchParams(window.location.search).get('id');
  cargarPerfilMentor(idMentor);
}

async function cargarPerfilMentor(id) {
  if (!id) {
    contenidoMentor.innerHTML = '<div class="estado-vacio">Mentor no especificado.</div>';
    return;
  }
  try {
    const { mentor } = await EduGlowAPI.get(`/mentores/${id}`);
    const iniciales = `${mentor.nombre?.[0] || ''}${mentor.apellido?.[0] || ''}`.toUpperCase();
    const habilidades = (mentor.habilidades || '').split(',').map((h) => h.trim()).filter(Boolean);

    contenidoMentor.innerHTML = `
      <div class="rejilla" style="grid-template-columns: 1fr 1.6fr; gap: 2rem;">
        <div class="tarjeta texto-centro">
          <div class="avatar-mentor" style="width:88px;height:88px;font-size:2rem;margin:0 auto 1rem;">${iniciales}</div>
          <h2 style="margin-bottom:.2rem;">${escaparHtml(mentor.nombre)} ${escaparHtml(mentor.apellido)}</h2>
          <span class="etiqueta etiqueta-glow">${escaparHtml(mentor.especialidad)}</span>
          <p class="calificacion mt-1">★ ${Number(mentor.calificacion).toFixed(1)} · ${mentor.experiencia} anios de experiencia</p>
          <p style="font-size:.85rem;">Tarifa por sesion: <strong>S/ ${Number(mentor.tarifa).toFixed(2)}</strong></p>
          <p style="font-size:.85rem;">Disponibilidad: ${escaparHtml(mentor.disponibilidad || 'A coordinar')}</p>
        </div>

        <div>
          <div class="tarjeta">
            <h3>Biografia</h3>
            <p>${escaparHtml(mentor.biografia || 'Este mentor aun no agrego una biografia.')}</p>
            <h3 class="mt-2">Habilidades</h3>
            <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
              ${habilidades.length ? habilidades.map((h) => `<span class="etiqueta etiqueta-neutra">${escaparHtml(h)}</span>`).join('') : '<span class="estado-vacio" style="padding:0;">Sin habilidades registradas.</span>'}
            </div>
          </div>

          <div class="tarjeta mt-2" id="tarjeta-reserva">
            <h3>Reservar sesion</h3>
            <div class="mensaje-formulario" id="mensaje-reserva"></div>
            <form id="form-reserva">
              <div class="campo-fila">
                <div class="campo">
                  <label for="fecha">Fecha</label>
                  <input type="date" id="fecha" required>
                </div>
                <div class="campo">
                  <label for="hora">Hora</label>
                  <input type="time" id="hora" required>
                </div>
              </div>
              <div class="campo">
                <label for="motivo">Motivo de la sesion</label>
                <textarea id="motivo" rows="2" placeholder="Ej: revision de portafolio, orientacion de carrera..."></textarea>
              </div>
              <button type="submit" class="boton boton-glow boton-ancho">Reservar sesion</button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('form-reserva').addEventListener('submit', (e) => reservarSesion(e, mentor.id));
  } catch (error) {
    contenidoMentor.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}

async function reservarSesion(e, mentorId) {
  e.preventDefault();
  const mensaje = document.getElementById('mensaje-reserva');

  if (!EduGlowAPI.estaAutenticado()) {
    mostrarMensajeFormulario(mensaje, 'Debes iniciar sesion para reservar una sesion.', 'error');
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    return;
  }

  const fecha = document.getElementById('fecha').value;
  const hora = document.getElementById('hora').value;
  const motivo = document.getElementById('motivo').value.trim();
  const boton = e.target.querySelector('button');

  boton.disabled = true;
  boton.textContent = 'Reservando...';

  try {
    await EduGlowAPI.post('/sesiones', { mentor_id: mentorId, fecha, hora, motivo });
    mostrarMensajeFormulario(mensaje, 'Reserva creada correctamente. Queda pendiente de confirmacion.', 'exito');
    e.target.reset();
  } catch (error) {
    mostrarMensajeFormulario(mensaje, error.message, 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Reservar sesion';
  }
}
