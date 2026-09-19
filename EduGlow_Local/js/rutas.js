const contenidoRuta = document.getElementById('contenido-ruta');
if (contenidoRuta) {
  const idRuta = new URLSearchParams(window.location.search).get('id');
  cargarRuta(idRuta);
}

async function cargarRuta(id) {
  if (!id) {
    contenidoRuta.innerHTML = '<div class="estado-vacio">Ruta no especificada.</div>';
    return;
  }
  try {
    const { ruta, mentor_recomendado, progreso } = await EduGlowAPI.get(`/rutas/${id}`);
    const autenticado = EduGlowAPI.estaAutenticado();
    const porcentaje = progreso ? Number(progreso.porcentaje) : 0;

    contenidoRuta.innerHTML = `
      <span class="etiqueta etiqueta-neutra">${escaparHtml(ruta.nivel)}</span>
      <h1>${escaparHtml(ruta.nombre)}</h1>
      <p class="lead" style="color: var(--text-muted);">${escaparHtml(ruta.descripcion || '')}</p>
      <p style="font-size:.9rem;">Duracion estimada: <strong>${escaparHtml(ruta.duracion || 'No definida')}</strong></p>

      <div class="rejilla" style="grid-template-columns: 1.6fr 1fr; gap: 2rem; margin-top: 2rem;">
        <div>
          <div class="tarjeta">
            <h3>Objetivos de la ruta</h3>
            <ul style="list-style: disc; padding-left: 1.2rem; color: var(--text-muted);">
              <li>Comprender los fundamentos clave de ${escaparHtml(ruta.nombre)}.</li>
              <li>Practicar con ejercicios guiados y retroalimentacion de un mentor.</li>
              <li>Construir un proyecto o entregable que demuestre lo aprendido.</li>
            </ul>
          </div>

          <div class="tarjeta mt-2" id="tarjeta-progreso">
            <h3>Tu progreso</h3>
            ${autenticado ? `
              <div class="barra-progreso"><div class="barra-progreso__relleno" style="width:${porcentaje}%"></div></div>
              <p style="font-size:.85rem;" id="texto-porcentaje">${porcentaje.toFixed(0)}% completado</p>
              <div class="campo">
                <label for="input-porcentaje">Actualizar porcentaje completado</label>
                <input type="range" id="input-porcentaje" min="0" max="100" value="${porcentaje}">
              </div>
              <button class="boton boton-glow" id="boton-guardar-progreso">Guardar progreso</button>
            ` : `<p>Inicia sesion para llevar el registro de tu progreso en esta ruta.</p><a href="login.html" class="boton boton-glow">Iniciar sesion</a>`}
          </div>
        </div>

        <div>
          <div class="tarjeta">
            <h3>Mentor recomendado</h3>
            ${mentor_recomendado ? `
              <p><strong>${escaparHtml(mentor_recomendado.nombre)} ${escaparHtml(mentor_recomendado.apellido)}</strong></p>
              <span class="etiqueta etiqueta-glow">${escaparHtml(mentor_recomendado.especialidad)}</span>
              <p class="calificacion mt-1">★ ${Number(mentor_recomendado.calificacion).toFixed(1)}</p>
              <a href="mentor.html?id=${mentor_recomendado.id}" class="boton boton-linea boton-ancho">Ver perfil</a>
            ` : '<p>No hay un mentor recomendado disponible por el momento.</p>'}
          </div>
        </div>
      </div>
    `;

    if (autenticado) {
      const slider = document.getElementById('input-porcentaje');
      const texto = document.getElementById('texto-porcentaje');
      slider.addEventListener('input', () => { texto.textContent = `${slider.value}% completado`; });

      document.getElementById('boton-guardar-progreso').addEventListener('click', async () => {
        try {
          await EduGlowAPI.put('/progreso', { ruta_id: ruta.id, porcentaje: Number(slider.value) });
          mostrarToast('Progreso actualizado correctamente.');
          if (Number(slider.value) >= 100) {
            mostrarToast('¡Felicidades! Completaste la ruta y desbloqueaste una credencial digital.');
          }
        } catch (error) {
          mostrarToast(error.message, 'error');
        }
      });
    }
  } catch (error) {
    contenidoRuta.innerHTML = `<div class="estado-vacio">${escaparHtml(error.message)}</div>`;
  }
}
