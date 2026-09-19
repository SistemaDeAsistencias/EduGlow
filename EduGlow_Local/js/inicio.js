document.addEventListener('DOMContentLoaded', async () => {
  const contMentores = document.getElementById('lista-mentores-destacados');
  const contRutas = document.getElementById('lista-rutas-destacadas');

  try {
    const { mentores } = await EduGlowAPI.get('/mentores/destacados');
    if (!mentores || mentores.length === 0) {
      contMentores.innerHTML = '<div class="estado-vacio">Aun no hay mentores publicados.</div>';
    } else {
      contMentores.innerHTML = mentores.map(tarjetaMentorHTML).join('');
    }
  } catch (error) {
    contMentores.innerHTML = `<div class="estado-vacio">No se pudieron cargar los mentores. ${escaparHtml(error.message)}</div>`;
  }

  try {
    const { rutas } = await EduGlowAPI.get('/rutas/destacadas');
    if (!rutas || rutas.length === 0) {
      contRutas.innerHTML = '<div class="estado-vacio">Aun no hay rutas publicadas.</div>';
    } else {
      contRutas.innerHTML = rutas.map(tarjetaRutaHTML).join('');
    }
  } catch (error) {
    contRutas.innerHTML = `<div class="estado-vacio">No se pudieron cargar las rutas. ${escaparHtml(error.message)}</div>`;
  }
});

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
        <span class="calificacion">★ ${Number(m.calificacion).toFixed(1)}</span>
        <a href="mentor.html?id=${m.id}" class="boton boton-linea boton-pequeno">Ver perfil</a>
      </div>
    </article>
  `;
}

function tarjetaRutaHTML(r) {
  return `
    <article class="tarjeta tarjeta-ruta nivel-${r.nivel}">
      <span class="etiqueta etiqueta-neutra">${escaparHtml(r.nivel)}</span>
      <h3>${escaparHtml(r.nombre)}</h3>
      <p style="font-size:.9rem;">${escaparHtml((r.descripcion || '').slice(0, 110))}${r.descripcion && r.descripcion.length > 110 ? '…' : ''}</p>
      <div class="flex-entre">
        <span style="font-size:.85rem; color: var(--text-muted);">${escaparHtml(r.duracion || '')}</span>
        <a href="ruta.html?id=${r.id}" class="boton boton-linea boton-pequeno">Ver ruta</a>
      </div>
    </article>
  `;
}
