(async () => {
  const usuario = protegerPagina();
  if (!usuario) return;

  if (usuario.rol === 'admin') {
    document.getElementById('enlace-admin').classList.remove('oculto');
  }

  document.getElementById('saludo-usuario').textContent = `Hola, ${usuario.nombre} 👋`;

  try {
    const data = await EduGlowAPI.get('/dashboard');
    renderizarProximasSesiones(data.proximas_sesiones);
    renderizarRutaActual(data.ruta_actual);
    renderizarRecomendaciones(data.recomendaciones);
    renderizarNotificaciones(data.notificaciones);
  } catch (error) {
    mostrarToast(error.message, 'error');
  }
})();

function renderizarProximasSesiones(sesiones) {
  const cont = document.getElementById('lista-proximas-sesiones');
  if (!sesiones || sesiones.length === 0) {
    cont.innerHTML = '<div class="estado-vacio">No tienes sesiones programadas. <a href="explorar.html">Reserva una ahora</a>.</div>';
    return;
  }
  cont.innerHTML = sesiones.map((s) => `
    <div class="fila-sesion">
      <div class="fecha-badge">${formatearFecha(s.fecha)}</div>
      <div style="flex:1;">
        <strong>${escaparHtml(s.mentor_nombre)} ${escaparHtml(s.mentor_apellido)}</strong>
        <div style="font-size:.82rem; color: var(--text-muted);">${escaparHtml(s.especialidad)} · ${formatearHora(s.hora)}</div>
      </div>
      <span class="etiqueta ${s.estado === 'confirmada' ? '' : 'etiqueta-neutra'}">${s.estado}</span>
    </div>
  `).join('');
}

function renderizarRutaActual(ruta) {
  const cont = document.getElementById('ruta-actual');
  if (!ruta) {
    cont.innerHTML = '<div class="estado-vacio">Aun no iniciaste ninguna ruta. <a href="index.html#rutas">Explora las rutas</a>.</div>';
    return;
  }
  cont.innerHTML = `
    <h3 style="margin-bottom:.4rem;">${escaparHtml(ruta.ruta_nombre)}</h3>
    <div class="barra-progreso"><div class="barra-progreso__relleno" style="width:${ruta.porcentaje}%"></div></div>
    <div class="flex-entre mt-1">
      <span style="font-size:.85rem; color: var(--text-muted);">${Number(ruta.porcentaje).toFixed(0)}% completado</span>
      <a href="ruta.html?id=${ruta.ruta_id}" class="boton boton-linea boton-pequeno">Continuar</a>
    </div>
  `;
}

function renderizarRecomendaciones(rec) {
  const cont = document.getElementById('recomendaciones');
  if (!rec) { cont.innerHTML = '<div class="estado-vacio">Sin recomendaciones por ahora.</div>'; return; }

  const rutas = (rec.rutas_recomendadas || []).slice(0, 2).map((r) => `
    <div class="fila-sesion">
      <div style="flex:1;"><strong>${escaparHtml(r.nombre)}</strong><div style="font-size:.8rem; color:var(--text-muted);">Ruta · ${escaparHtml(r.nivel)}</div></div>
      <a href="ruta.html?id=${r.id}" class="boton boton-linea boton-pequeno">Ver</a>
    </div>
  `).join('');

  const mentores = (rec.mentores_recomendados || []).slice(0, 2).map((m) => `
    <div class="fila-sesion">
      <div style="flex:1;"><strong>${escaparHtml(m.nombre)} ${escaparHtml(m.apellido)}</strong><div style="font-size:.8rem; color:var(--text-muted);">Mentor · ${escaparHtml(m.especialidad)}</div></div>
      <a href="mentor.html?id=${m.id}" class="boton boton-linea boton-pequeno">Ver</a>
    </div>
  `).join('');

  cont.innerHTML = (rutas + mentores) || '<div class="estado-vacio">Sin recomendaciones por ahora.</div>';
}

function renderizarNotificaciones(notificaciones) {
  const cont = document.getElementById('lista-notificaciones');
  if (!notificaciones || notificaciones.length === 0) {
    cont.innerHTML = '<div class="estado-vacio">No tienes notificaciones nuevas.</div>';
    return;
  }
  cont.innerHTML = notificaciones.map((n) => `
    <div class="notificacion-item">
      <strong>${escaparHtml(n.titulo)}</strong>
      ${escaparHtml(n.mensaje)}
    </div>
  `).join('');
}
