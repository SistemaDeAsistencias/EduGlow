/**
 * EduGlow — motor de datos 100% local (sin backend, sin MySQL).
 * ------------------------------------------------------------
 * Sustituye a Node.js/Express/MySQL/JWT del proyecto "EduGlow_Despliegue"
 * por una simulacion que corre entera en el navegador usando localStorage.
 *
 * Replica, endpoint por endpoint, la misma logica que antes vivia en
 * backend/controllers + backend/models + backend/services, para que
 * el resto del frontend (api.js, auth.js, dashboard.js, mentores.js,
 * rutas.js, reservas.js, perfil.js, admin.js) siga funcionando SIN
 * modificaciones: solo cambia como "viaja" la peticion (ya no es un
 * fetch por red, es una llamada a EduGlowDB.manejar()).
 *
 * IMPORTANTE (uso academico): las "contrasenas" se ofuscan con un
 * hash simple no criptografico (igual que el prototipo AA1 anterior).
 * Esto es solo para que la demo funcione abriendo el HTML directamente,
 * sin instalar Node, MySQL, ni nada. No usar este esquema en produccion.
 */
const EduGlowDB = (() => {
  const CLAVE_DB = 'eduglow_db_v1';
  const PASSWORD_DEMO = 'Password123';

  // ------------------------------------------------------------
  // Utilidades basicas
  // ------------------------------------------------------------
  class ErrorApp extends Error {
    constructor(mensaje, status = 400) {
      super(mensaje);
      this.status = status;
    }
  }

  function hashSimulado(texto) {
    // Ofuscacion simple, NO criptografica. Suficiente para un prototipo
    // que corre solo en el navegador del propio usuario.
    let h = 0;
    const str = String(texto || '');
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return 'sim_' + Math.abs(h).toString(16);
  }

  function ahoraISO() {
    return new Date().toISOString();
  }

  function hoyYMD() {
    return new Date().toISOString().slice(0, 10);
  }

  function sumarDias(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // Token "JWT-like": no es criptografico, pero mantiene la misma forma
  // de uso (Authorization: Bearer <token>, decodificar payload, expirar).
  function generarToken(usuario) {
    const payload = {
      id: usuario.id,
      rol: usuario.rol,
      email: usuario.email,
      nombre: usuario.nombre,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 dias, igual que JWT_EXPIRES_IN por defecto
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }

  function verificarToken(token) {
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(token))));
      if (!payload || !payload.id) return null;
      if (payload.exp && Date.now() > payload.exp) return null;
      return payload;
    } catch (error) {
      return null;
    }
  }

  // ------------------------------------------------------------
  // Persistencia
  // ------------------------------------------------------------
  function guardarDB(db) {
    localStorage.setItem(CLAVE_DB, JSON.stringify(db));
  }

  function cargarDBCruda() {
    const raw = localStorage.getItem(CLAVE_DB);
    return raw ? JSON.parse(raw) : null;
  }

  function crearDBInicial() {
    const db = {
      usuarios: [],
      mentores: [],
      rutas: [],
      progreso: [],
      sesiones: [],
      notificaciones: [],
      credenciales: [],
      contadores: {
        usuarios: 0, mentores: 0, rutas: 0, progreso: 0,
        sesiones: 0, notificaciones: 0, credenciales: 0
      }
    };

    function nuevoId(tabla) {
      db.contadores[tabla] += 1;
      return db.contadores[tabla];
    }

    function crearUsuarioSeed({ nombre, apellido, email, rol }) {
      const id = nuevoId('usuarios');
      db.usuarios.push({
        id,
        nombre,
        apellido,
        email,
        password: hashSimulado(PASSWORD_DEMO),
        rol,
        foto: null,
        fecha_registro: ahoraISO(),
        estado: 'activo'
      });
      return id;
    }

    // --- Administrador ---
    crearUsuarioSeed({ nombre: 'Ana', apellido: 'Administradora', email: 'admin@eduglow.com', rol: 'admin' });

    // --- Mentores ---
    const datosMentores = [
      { nombre: 'Carlos', apellido: 'Ramirez', email: 'carlos.mentor@eduglow.com', especialidad: 'Desarrollo Web', biografia: 'Ingeniero de software con experiencia en aplicaciones full-stack.', experiencia: 6, habilidades: 'JavaScript, Node.js, React, MySQL', tarifa: 45, disponibilidad: 'Lunes a viernes, 6pm - 9pm' },
      { nombre: 'Lucia', apellido: 'Fernandez', email: 'lucia.mentor@eduglow.com', especialidad: 'Ciencia de Datos', biografia: 'Analista de datos apasionada por ayudar a nuevos talentos a entrar al sector.', experiencia: 4, habilidades: 'Python, SQL, Power BI, Estadistica', tarifa: 40, disponibilidad: 'Martes y jueves, 4pm - 8pm' },
      { nombre: 'Diego', apellido: 'Torres', email: 'diego.mentor@eduglow.com', especialidad: 'Diseno UX/UI', biografia: 'Disenador de producto enfocado en experiencias centradas en el usuario.', experiencia: 8, habilidades: 'Figma, Investigacion UX, Prototipado', tarifa: 50, disponibilidad: 'Fines de semana' }
    ];
    const mentorIds = [];
    for (const m of datosMentores) {
      const usuarioId = crearUsuarioSeed({ nombre: m.nombre, apellido: m.apellido, email: m.email, rol: 'mentor' });
      const id = nuevoId('mentores');
      db.mentores.push({
        id,
        usuario_id: usuarioId,
        especialidad: m.especialidad,
        biografia: m.biografia,
        experiencia: m.experiencia,
        habilidades: m.habilidades,
        tarifa: m.tarifa,
        calificacion: Number((4 + Math.random()).toFixed(2)),
        disponibilidad: m.disponibilidad,
        estado: 'activo'
      });
      mentorIds.push(id);
    }

    // --- Estudiantes ---
    const datosEstudiantes = [
      { nombre: 'Maria', apellido: 'Lopez', email: 'maria.estudiante@eduglow.com' },
      { nombre: 'Jose', apellido: 'Garcia', email: 'jose.estudiante@eduglow.com' },
      { nombre: 'Valeria', apellido: 'Chavez', email: 'valeria.estudiante@eduglow.com' },
      { nombre: 'Andres', apellido: 'Rojas', email: 'andres.estudiante@eduglow.com' },
      { nombre: 'Camila', apellido: 'Vega', email: 'camila.estudiante@eduglow.com' }
    ];
    const estudianteIds = datosEstudiantes.map((e) =>
      crearUsuarioSeed({ nombre: e.nombre, apellido: e.apellido, email: e.email, rol: 'estudiante' })
    );

    // --- Rutas de aprendizaje ---
    const datosRutas = [
      { nombre: 'Fundamentos de Desarrollo Web', descripcion: 'HTML, CSS, JavaScript y fundamentos de backend.', nivel: 'basico', duracion: '6 semanas' },
      { nombre: 'Desarrollo Full-Stack con Node.js', descripcion: 'Construccion de APIs REST y aplicaciones completas.', nivel: 'intermedio', duracion: '10 semanas' },
      { nombre: 'Introduccion a la Ciencia de Datos', descripcion: 'Python, estadistica descriptiva y visualizacion.', nivel: 'basico', duracion: '8 semanas' },
      { nombre: 'Diseno de Experiencia de Usuario', descripcion: 'Investigacion, wireframing y prototipado en Figma.', nivel: 'intermedio', duracion: '6 semanas' },
      { nombre: 'Emprendimiento Digital', descripcion: 'De la idea al modelo de negocio validado.', nivel: 'avanzado', duracion: '4 semanas' }
    ];
    const rutaIds = datosRutas.map((r) => {
      const id = nuevoId('rutas');
      db.rutas.push({ id, nombre: r.nombre, descripcion: r.descripcion, nivel: r.nivel, duracion: r.duracion, imagen: null, estado: 'activo' });
      return id;
    });

    // --- Progreso de ejemplo ---
    function crearProgresoSeed(usuario_id, ruta_id, porcentaje) {
      const id = nuevoId('progreso');
      db.progreso.push({ id, usuario_id, ruta_id, porcentaje, fecha_actualizacion: ahoraISO() });
    }
    crearProgresoSeed(estudianteIds[0], rutaIds[0], 65);
    crearProgresoSeed(estudianteIds[0], rutaIds[1], 20);
    crearProgresoSeed(estudianteIds[1], rutaIds[2], 100);
    crearProgresoSeed(estudianteIds[2], rutaIds[3], 40);

    // Credencial para el estudiante que completo una ruta al 100%
    db.credenciales.push({
      id: nuevoId('credenciales'),
      usuario_id: estudianteIds[1],
      ruta_id: rutaIds[2],
      codigo_verificacion: `EDG-${estudianteIds[1]}-${rutaIds[2]}-DEMO01`,
      fecha_emision: ahoraISO()
    });

    // --- Sesiones (reservas) de ejemplo ---
    function crearSesionSeed(mentor_id, usuario_id, fecha, hora, duracion, estado, motivo) {
      const id = nuevoId('sesiones');
      db.sesiones.push({ id, mentor_id, usuario_id, fecha, hora, duracion, estado, motivo, observaciones: null, fecha_creacion: ahoraISO() });
    }
    crearSesionSeed(mentorIds[0], estudianteIds[0], sumarDias(3), '18:00:00', 60, 'confirmada', 'Revision de portafolio');
    crearSesionSeed(mentorIds[1], estudianteIds[1], sumarDias(5), '16:00:00', 45, 'pendiente', 'Orientacion sobre ciencia de datos');
    crearSesionSeed(mentorIds[2], estudianteIds[2], sumarDias(-2), '10:00:00', 60, 'completada', 'Feedback de prototipo');

    // --- Notificaciones de ejemplo ---
    function crearNotificacionSeed(usuario_id, titulo, mensaje) {
      const id = nuevoId('notificaciones');
      db.notificaciones.push({ id, usuario_id, titulo, mensaje, leida: false, fecha: ahoraISO() });
    }
    crearNotificacionSeed(estudianteIds[0], 'Bienvenido a EduGlow', 'Tu cuenta fue creada correctamente. Explora mentores y rutas disponibles.');
    crearNotificacionSeed(estudianteIds[0], 'Sesion confirmada', 'Tu sesion con Carlos Ramirez fue confirmada.');

    return db;
  }

  function obtenerDB() {
    let db = cargarDBCruda();
    if (!db) {
      db = crearDBInicial();
      guardarDB(db);
    }
    return db;
  }

  function reiniciarDB() {
    localStorage.removeItem(CLAVE_DB);
    return obtenerDB();
  }

  // ------------------------------------------------------------
  // Helpers de "join" (equivalentes a los SELECT con JOIN de MySQL)
  // ------------------------------------------------------------
  function usuarioPublico(u) {
    if (!u) return null;
    const { password, ...resto } = u;
    return resto;
  }

  function buscarUsuarioPorId(db, id) {
    return db.usuarios.find((u) => u.id === Number(id)) || null;
  }

  function buscarUsuarioPorEmail(db, email) {
    return db.usuarios.find((u) => u.email === email) || null;
  }

  function mentorConDatos(db, mentor) {
    if (!mentor) return null;
    const u = buscarUsuarioPorId(db, mentor.usuario_id) || {};
    return {
      id: mentor.id,
      usuario_id: mentor.usuario_id,
      especialidad: mentor.especialidad,
      biografia: mentor.biografia,
      experiencia: mentor.experiencia,
      habilidades: mentor.habilidades,
      tarifa: mentor.tarifa,
      calificacion: mentor.calificacion,
      disponibilidad: mentor.disponibilidad,
      estado: mentor.estado,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      foto: u.foto
    };
  }

  function buscarMentorPorId(db, id) {
    return db.mentores.find((m) => m.id === Number(id)) || null;
  }

  function buscarMentorPorUsuarioId(db, usuario_id) {
    return db.mentores.find((m) => m.usuario_id === Number(usuario_id)) || null;
  }

  function sesionConDatos(db, s) {
    if (!s) return null;
    const mentor = buscarMentorPorId(db, s.mentor_id) || {};
    const mentorUsuario = buscarUsuarioPorId(db, mentor.usuario_id) || {};
    const usuario = buscarUsuarioPorId(db, s.usuario_id) || {};
    return {
      id: s.id,
      mentor_id: s.mentor_id,
      usuario_id: s.usuario_id,
      fecha: s.fecha,
      hora: s.hora,
      duracion: s.duracion,
      estado: s.estado,
      motivo: s.motivo,
      observaciones: s.observaciones,
      fecha_creacion: s.fecha_creacion,
      mentor_nombre: mentorUsuario.nombre,
      mentor_apellido: mentorUsuario.apellido,
      especialidad: mentor.especialidad,
      usuario_nombre: usuario.nombre,
      usuario_apellido: usuario.apellido
    };
  }

  function buscarRutaPorId(db, id) {
    return db.rutas.find((r) => r.id === Number(id)) || null;
  }

  function nuevoId(db, tabla) {
    db.contadores[tabla] += 1;
    return db.contadores[tabla];
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

  function normalizarHora(hora) {
    // Igual que MySQL TIME: aceptamos HH:MM o HH:MM:SS, guardamos con segundos.
    return hora.length === 5 ? `${hora}:00` : hora;
  }

  // ------------------------------------------------------------
  // ---------------------- AUTH ---------------------------------
  // ------------------------------------------------------------
  function authRegistrar(db, body) {
    const { nombre, apellido, email, password, confirmarPassword } = body || {};

    if (!nombre || !nombre.trim()) throw new ErrorApp('El nombre es obligatorio.');
    if (!apellido || !apellido.trim()) throw new ErrorApp('El apellido es obligatorio.');
    if (!email || !EMAIL_REGEX.test(email)) throw new ErrorApp('El correo electronico no es valido.');
    if (!password || password.length < 8) throw new ErrorApp('La contrasena debe tener minimo 8 caracteres.');
    if (confirmarPassword !== undefined && password !== confirmarPassword) {
      throw new ErrorApp('Las contrasenas no coinciden.');
    }

    const emailNorm = email.toLowerCase().trim();
    if (buscarUsuarioPorEmail(db, emailNorm)) {
      throw new ErrorApp('Ya existe una cuenta con este correo electronico.', 409);
    }

    const id = nuevoId(db, 'usuarios');
    const usuario = {
      id,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: emailNorm,
      password: hashSimulado(password),
      rol: 'estudiante',
      foto: null,
      fecha_registro: ahoraISO(),
      estado: 'activo'
    };
    db.usuarios.push(usuario);
    guardarDB(db);

    const token = generarToken(usuario);
    return { ok: true, mensaje: 'Cuenta creada correctamente.', token, usuario: usuarioPublico(usuario) };
  }

  function authLogin(db, body) {
    const { email, password } = body || {};
    if (!email || !password) throw new ErrorApp('Correo y contrasena son obligatorios.');

    const usuario = buscarUsuarioPorEmail(db, email.toLowerCase().trim());
    if (!usuario) throw new ErrorApp('Credenciales incorrectas.', 401);
    if (usuario.estado !== 'activo') throw new ErrorApp('Esta cuenta esta inactiva. Contacta al administrador.', 403);
    if (hashSimulado(password) !== usuario.password) throw new ErrorApp('Credenciales incorrectas.', 401);

    const token = generarToken(usuario);
    return { ok: true, mensaje: 'Sesion iniciada correctamente.', token, usuario: usuarioPublico(usuario) };
  }

  function authMe(db, usuarioReq) {
    const usuario = buscarUsuarioPorId(db, usuarioReq.id);
    if (!usuario) throw new ErrorApp('Usuario no encontrado.', 404);
    return { ok: true, usuario: usuarioPublico(usuario) };
  }

  // ------------------------------------------------------------
  // ---------------------- USERS --------------------------------
  // ------------------------------------------------------------
  function usersListar(db, query) {
    const { rol, estado, busqueda } = query;
    let lista = [...db.usuarios];
    if (rol) lista = lista.filter((u) => u.rol === rol);
    if (estado) lista = lista.filter((u) => u.estado === estado);
    if (busqueda) {
      const b = busqueda.toLowerCase();
      lista = lista.filter((u) =>
        u.nombre.toLowerCase().includes(b) || u.apellido.toLowerCase().includes(b) || u.email.toLowerCase().includes(b)
      );
    }
    lista.sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));
    return { ok: true, usuarios: lista.map(usuarioPublico) };
  }

  function usersObtener(db, id) {
    const usuario = buscarUsuarioPorId(db, id);
    if (!usuario) throw new ErrorApp('Usuario no encontrado.', 404);
    return { ok: true, usuario: usuarioPublico(usuario) };
  }

  function usersActualizarPerfil(db, usuarioReq, body) {
    const usuario = buscarUsuarioPorId(db, usuarioReq.id);
    if (!usuario) throw new ErrorApp('Usuario no encontrado.', 404);
    const { nombre, apellido, foto } = body || {};
    let huboCambios = false;
    if (nombre !== undefined) { usuario.nombre = nombre; huboCambios = true; }
    if (apellido !== undefined) { usuario.apellido = apellido; huboCambios = true; }
    if (foto !== undefined) { usuario.foto = foto; huboCambios = true; }
    if (!huboCambios) throw new ErrorApp('No se realizaron cambios.');
    guardarDB(db);
    return { ok: true, mensaje: 'Perfil actualizado correctamente.', usuario: usuarioPublico(usuario) };
  }

  function usersCambiarPassword(db, usuarioReq, body) {
    const { passwordActual, passwordNueva } = body || {};
    if (!passwordNueva || passwordNueva.length < 8) {
      throw new ErrorApp('La nueva contrasena debe tener minimo 8 caracteres.');
    }
    const usuario = buscarUsuarioPorEmail(db, usuarioReq.email);
    if (!usuario || hashSimulado(passwordActual || '') !== usuario.password) {
      throw new ErrorApp('La contrasena actual es incorrecta.', 401);
    }
    usuario.password = hashSimulado(passwordNueva);
    guardarDB(db);
    return { ok: true, mensaje: 'Contrasena actualizada correctamente.' };
  }

  function usersCambiarEstado(db, id, body) {
    const { estado } = body || {};
    if (!['activo', 'inactivo'].includes(estado)) throw new ErrorApp('Estado invalido.');
    const usuario = buscarUsuarioPorId(db, id);
    if (!usuario) throw new ErrorApp('Usuario no encontrado.', 404);
    usuario.estado = estado;
    guardarDB(db);
    return { ok: true, mensaje: `Usuario ${estado === 'activo' ? 'activado' : 'desactivado'} correctamente.` };
  }

  function usersCambiarRol(db, id, body) {
    const { rol } = body || {};
    if (!['estudiante', 'mentor', 'admin'].includes(rol)) throw new ErrorApp('Rol invalido.');
    const usuario = buscarUsuarioPorId(db, id);
    if (!usuario) throw new ErrorApp('Usuario no encontrado.', 404);
    usuario.rol = rol;
    guardarDB(db);
    return { ok: true, mensaje: 'Rol actualizado correctamente.' };
  }

  // ------------------------------------------------------------
  // ---------------------- MENTORES ------------------------------
  // ------------------------------------------------------------
  function mentoresListar(db, query, usuarioReq) {
    const { especialidad, experienciaMin, busqueda, orden, estado } = query;
    const estadoFiltro = estado === 'inactivo' && usuarioReq?.rol === 'admin' ? 'inactivo' : 'activo';

    let lista = db.mentores.filter((m) => m.estado === estadoFiltro).map((m) => mentorConDatos(db, m));

    if (especialidad) {
      const e = especialidad.toLowerCase();
      lista = lista.filter((m) => (m.especialidad || '').toLowerCase().includes(e));
    }
    if (experienciaMin) {
      lista = lista.filter((m) => Number(m.experiencia) >= Number(experienciaMin));
    }
    if (busqueda) {
      const b = busqueda.toLowerCase();
      lista = lista.filter((m) => (m.nombre || '').toLowerCase().includes(b) || (m.apellido || '').toLowerCase().includes(b));
    }

    const comparadores = {
      calificacion: (a, b) => b.calificacion - a.calificacion,
      experiencia: (a, b) => b.experiencia - a.experiencia,
      tarifa_asc: (a, b) => a.tarifa - b.tarifa,
      tarifa_desc: (a, b) => b.tarifa - a.tarifa,
      nombre: (a, b) => (a.nombre || '').localeCompare(b.nombre || '')
    };
    lista.sort(comparadores[orden] || comparadores.calificacion);

    return { ok: true, mentores: lista };
  }

  function mentoresObtener(db, id) {
    const mentor = buscarMentorPorId(db, id);
    if (!mentor) throw new ErrorApp('Mentor no encontrado.', 404);
    return { ok: true, mentor: mentorConDatos(db, mentor) };
  }

  function mentoresDestacados(db) {
    const lista = db.mentores
      .filter((m) => m.estado === 'activo')
      .map((m) => mentorConDatos(db, m))
      .sort((a, b) => b.calificacion - a.calificacion)
      .slice(0, 3);
    return { ok: true, mentores: lista };
  }

  function mentoresCrear(db, body) {
    const { usuario_id, nombre, apellido, email, password, especialidad, biografia, experiencia, habilidades, tarifa, disponibilidad } = body || {};
    if (!especialidad) throw new ErrorApp('La especialidad es obligatoria.');

    let idUsuarioFinal = usuario_id;

    if (!idUsuarioFinal) {
      if (!nombre || !apellido || !email || !password) {
        throw new ErrorApp('Para crear un mentor nuevo se requieren nombre, apellido, email y password.');
      }
      const emailNorm = email.toLowerCase().trim();
      if (buscarUsuarioPorEmail(db, emailNorm)) throw new ErrorApp('Ya existe un usuario con este correo.', 409);
      idUsuarioFinal = nuevoId(db, 'usuarios');
      db.usuarios.push({
        id: idUsuarioFinal,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: emailNorm,
        password: hashSimulado(password),
        rol: 'mentor',
        foto: null,
        fecha_registro: ahoraISO(),
        estado: 'activo'
      });
    } else {
      const usuarioExistente = buscarUsuarioPorId(db, idUsuarioFinal);
      if (!usuarioExistente) throw new ErrorApp('Usuario no encontrado.', 404);
      usuarioExistente.rol = 'mentor';
    }

    if (buscarMentorPorUsuarioId(db, idUsuarioFinal)) throw new ErrorApp('Este usuario ya es mentor.', 409);

    const id = nuevoId(db, 'mentores');
    db.mentores.push({
      id,
      usuario_id: Number(idUsuarioFinal),
      especialidad,
      biografia: biografia || null,
      experiencia: experiencia || 0,
      habilidades: habilidades || null,
      tarifa: tarifa || 0,
      calificacion: 0,
      disponibilidad: disponibilidad || null,
      estado: 'activo'
    });
    guardarDB(db);

    const mentor = buscarMentorPorId(db, id);
    return { ok: true, mensaje: 'Mentor creado correctamente.', mentor: mentorConDatos(db, mentor) };
  }

  function mentoresActualizar(db, id, body, usuarioReq) {
    const mentor = buscarMentorPorId(db, id);
    if (!mentor) throw new ErrorApp('Mentor no encontrado.', 404);

    if (usuarioReq.rol === 'mentor' && mentor.usuario_id !== usuarioReq.id) {
      throw new ErrorApp('No puedes editar el perfil de otro mentor.', 403);
    }

    const permitidos = ['especialidad', 'biografia', 'experiencia', 'habilidades', 'tarifa', 'disponibilidad'];
    let huboCambios = false;
    for (const campo of permitidos) {
      if (body && body[campo] !== undefined) {
        mentor[campo] = body[campo];
        huboCambios = true;
      }
    }
    if (!huboCambios) throw new ErrorApp('No se realizaron cambios.');
    guardarDB(db);

    return { ok: true, mensaje: 'Mentor actualizado correctamente.', mentor: mentorConDatos(db, mentor) };
  }

  function mentoresCambiarEstado(db, id, body) {
    const { estado } = body || {};
    if (!['activo', 'inactivo'].includes(estado)) throw new ErrorApp('Estado invalido.');
    const mentor = buscarMentorPorId(db, id);
    if (!mentor) throw new ErrorApp('Mentor no encontrado.', 404);
    mentor.estado = estado;
    guardarDB(db);
    return { ok: true, mensaje: `Mentor ${estado === 'activo' ? 'activado' : 'desactivado'} correctamente.` };
  }

  // ------------------------------------------------------------
  // ---------------------- RUTAS ---------------------------------
  // ------------------------------------------------------------
  function rutasListar(db, query) {
    const { nivel } = query;
    let lista = db.rutas.filter((r) => r.estado === 'activo');
    if (nivel) lista = lista.filter((r) => r.nivel === nivel);
    lista.sort((a, b) => a.id - b.id);
    return { ok: true, rutas: lista };
  }

  function rutasDestacadas(db) {
    const lista = db.rutas.filter((r) => r.estado === 'activo').sort((a, b) => a.id - b.id).slice(0, 3);
    return { ok: true, rutas: lista };
  }

  function progresoObtenerOCrear(db, usuario_id, ruta_id) {
    let p = db.progreso.find((x) => x.usuario_id === Number(usuario_id) && x.ruta_id === Number(ruta_id));
    if (p) return p;
    p = { id: nuevoId(db, 'progreso'), usuario_id: Number(usuario_id), ruta_id: Number(ruta_id), porcentaje: 0, fecha_actualizacion: ahoraISO() };
    db.progreso.push(p);
    guardarDB(db);
    return p;
  }

  function rutasObtener(db, id, usuarioReq) {
    const ruta = buscarRutaPorId(db, id);
    if (!ruta) throw new ErrorApp('Ruta no encontrada.', 404);

    const mentoresActivos = db.mentores.filter((m) => m.estado === 'activo').map((m) => mentorConDatos(db, m));
    mentoresActivos.sort((a, b) => b.calificacion - a.calificacion);
    const mentorRecomendado = mentoresActivos[0] || null;

    let progresoUsuario = null;
    if (usuarioReq) {
      progresoUsuario = progresoObtenerOCrear(db, usuarioReq.id, ruta.id);
    }

    return { ok: true, ruta, mentor_recomendado: mentorRecomendado, progreso: progresoUsuario };
  }

  function rutasCrear(db, body) {
    const { nombre, descripcion, nivel, duracion, imagen } = body || {};
    if (!nombre) throw new ErrorApp('El nombre de la ruta es obligatorio.');
    const id = nuevoId(db, 'rutas');
    db.rutas.push({ id, nombre, descripcion: descripcion || null, nivel: nivel || 'basico', duracion: duracion || null, imagen: imagen || null, estado: 'activo' });
    guardarDB(db);
    return { ok: true, mensaje: 'Ruta creada correctamente.', ruta: buscarRutaPorId(db, id) };
  }

  function rutasActualizar(db, id, body) {
    const ruta = buscarRutaPorId(db, id);
    if (!ruta) throw new ErrorApp('Ruta no encontrada o sin cambios.', 404);
    const permitidos = ['nombre', 'descripcion', 'nivel', 'duracion', 'imagen'];
    let huboCambios = false;
    for (const campo of permitidos) {
      if (body && body[campo] !== undefined) { ruta[campo] = body[campo]; huboCambios = true; }
    }
    if (!huboCambios) throw new ErrorApp('Ruta no encontrada o sin cambios.', 404);
    guardarDB(db);
    return { ok: true, mensaje: 'Ruta actualizada correctamente.', ruta };
  }

  function rutasCambiarEstado(db, id, body) {
    const { estado } = body || {};
    if (!['activo', 'inactivo'].includes(estado)) throw new ErrorApp('Estado invalido.');
    const ruta = buscarRutaPorId(db, id);
    if (!ruta) throw new ErrorApp('Ruta no encontrada.', 404);
    ruta.estado = estado;
    guardarDB(db);
    return { ok: true, mensaje: 'Ruta actualizada correctamente.' };
  }

  // ------------------------------------------------------------
  // ---------------------- SESIONES ------------------------------
  // ------------------------------------------------------------
  function crearNotificacion(db, usuario_id, titulo, mensaje) {
    const id = nuevoId(db, 'notificaciones');
    db.notificaciones.push({ id, usuario_id, titulo, mensaje, leida: false, fecha: ahoraISO() });
    return id;
  }

  function existeConflictoSesion(db, mentor_id, fecha, hora, excluirId) {
    return db.sesiones.some((s) =>
      s.mentor_id === Number(mentor_id) && s.fecha === fecha && s.hora === hora &&
      s.estado !== 'cancelada' && s.id !== excluirId
    );
  }

  function sesionesCrear(db, body, usuarioReq) {
    const { mentor_id, fecha, hora: horaCruda, duracion, motivo } = body || {};

    if (!mentor_id) throw new ErrorApp('Debes seleccionar un mentor.');
    if (!fecha || !FECHA_REGEX.test(fecha)) throw new ErrorApp('La fecha no es valida (formato YYYY-MM-DD).');
    if (!horaCruda || !HORA_REGEX.test(horaCruda)) throw new ErrorApp('La hora no es valida (formato HH:MM).');
    const hora = normalizarHora(horaCruda);

    const fechaHoraSeleccionada = new Date(`${fecha}T${hora}`);
    if (isNaN(fechaHoraSeleccionada.getTime()) || fechaHoraSeleccionada < new Date()) {
      throw new ErrorApp('No puedes reservar una fecha u hora en el pasado.');
    }

    const mentor = buscarMentorPorId(db, mentor_id);
    if (!mentor || mentor.estado !== 'activo') throw new ErrorApp('El mentor seleccionado no esta disponible.', 404);

    if (existeConflictoSesion(db, mentor_id, fecha, hora)) {
      throw new ErrorApp('Ese mentor ya tiene una sesion agendada en ese horario. Elige otro horario.', 409);
    }

    const id = nuevoId(db, 'sesiones');
    db.sesiones.push({
      id,
      mentor_id: Number(mentor_id),
      usuario_id: usuarioReq.id,
      fecha,
      hora,
      duracion: duracion || 60,
      estado: 'pendiente',
      motivo: motivo || null,
      observaciones: null,
      fecha_creacion: ahoraISO()
    });

    const mentorUsuario = buscarUsuarioPorId(db, mentor.usuario_id) || {};
    crearNotificacion(db, usuarioReq.id, 'Reserva creada', `Tu sesion con ${mentorUsuario.nombre} ${mentorUsuario.apellido} quedo registrada para el ${fecha} a las ${hora}, pendiente de confirmacion.`);
    crearNotificacion(db, mentor.usuario_id, 'Nueva reserva', `Tienes una nueva solicitud de sesion para el ${fecha} a las ${hora}.`);
    guardarDB(db);

    return { ok: true, mensaje: 'Reserva creada correctamente. Queda pendiente de confirmacion.', sesion: sesionConDatos(db, db.sesiones.find((s) => s.id === id)) };
  }

  function sesionesMisReservas(db, usuarioReq) {
    const lista = db.sesiones
      .filter((s) => s.usuario_id === usuarioReq.id)
      .map((s) => sesionConDatos(db, s))
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    return { ok: true, sesiones: lista };
  }

  function sesionesDeMiMentoria(db, usuarioReq) {
    const mentor = buscarMentorPorUsuarioId(db, usuarioReq.id);
    if (!mentor) throw new ErrorApp('Tu cuenta no tiene un perfil de mentor asociado.', 404);
    const lista = db.sesiones
      .filter((s) => s.mentor_id === mentor.id)
      .map((s) => sesionConDatos(db, s))
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    return { ok: true, sesiones: lista };
  }

  function sesionesObtener(db, id) {
    const s = db.sesiones.find((x) => x.id === Number(id));
    if (!s) throw new ErrorApp('Sesion no encontrada.', 404);
    return { ok: true, sesion: sesionConDatos(db, s) };
  }

  function sesionesListarTodas(db, query) {
    const { estado, fecha } = query;
    let lista = [...db.sesiones];
    if (estado) lista = lista.filter((s) => s.estado === estado);
    if (fecha) lista = lista.filter((s) => s.fecha === fecha);
    lista = lista.map((s) => sesionConDatos(db, s)).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    return { ok: true, sesiones: lista };
  }

  function esParteDeLaSesion(sesionOwnerId, usuarioReq) {
    return usuarioReq.rol === 'admin' || usuarioReq.id === sesionOwnerId;
  }

  function sesionesModificar(db, id, body, usuarioReq) {
    const s = db.sesiones.find((x) => x.id === Number(id));
    if (!s) throw new ErrorApp('Sesion no encontrada.', 404);
    if (!esParteDeLaSesion(s.usuario_id, usuarioReq)) throw new ErrorApp('No puedes modificar una reserva que no es tuya.', 403);
    if (s.estado === 'cancelada' || s.estado === 'completada') throw new ErrorApp(`No se puede modificar una sesion ${s.estado}.`);

    const { fecha, hora: horaCruda, observaciones } = body || {};
    if (fecha && !FECHA_REGEX.test(fecha)) throw new ErrorApp('La fecha no es valida.');
    if (horaCruda && !HORA_REGEX.test(horaCruda)) throw new ErrorApp('La hora no es valida.');
    const hora = horaCruda ? normalizarHora(horaCruda) : undefined;

    if (fecha || hora) {
      const nuevaFecha = fecha || s.fecha;
      const nuevaHora = hora || s.hora;
      if (existeConflictoSesion(db, s.mentor_id, nuevaFecha, nuevaHora, s.id)) {
        throw new ErrorApp('El mentor ya tiene otra sesion en ese horario.', 409);
      }
    }

    if (fecha !== undefined) s.fecha = fecha;
    if (hora !== undefined) s.hora = hora;
    if (observaciones !== undefined) s.observaciones = observaciones;
    guardarDB(db);

    return { ok: true, mensaje: 'Reserva actualizada correctamente.', sesion: sesionConDatos(db, s) };
  }

  function sesionesCancelar(db, id, usuarioReq) {
    const s = db.sesiones.find((x) => x.id === Number(id));
    if (!s) throw new ErrorApp('Sesion no encontrada.', 404);
    if (!esParteDeLaSesion(s.usuario_id, usuarioReq)) throw new ErrorApp('No puedes cancelar una reserva que no es tuya.', 403);
    if (s.estado === 'completada') throw new ErrorApp('No se puede cancelar una sesion ya completada.');

    s.estado = 'cancelada';
    crearNotificacion(db, s.usuario_id, 'Reserva cancelada', `Tu sesion del ${s.fecha} fue cancelada.`);
    guardarDB(db);
    return { ok: true, mensaje: 'Reserva cancelada correctamente.' };
  }

  function sesionesCambiarEstado(db, id, body) {
    const { estado } = body || {};
    const validos = ['pendiente', 'confirmada', 'cancelada', 'completada'];
    if (!validos.includes(estado)) throw new ErrorApp('Estado invalido.');

    const s = db.sesiones.find((x) => x.id === Number(id));
    if (!s) throw new ErrorApp('Sesion no encontrada.', 404);

    s.estado = estado;
    crearNotificacion(db, s.usuario_id, 'Estado de tu reserva actualizado', `Tu sesion del ${s.fecha} ahora esta: ${estado}.`);
    guardarDB(db);
    return { ok: true, mensaje: 'Estado actualizado correctamente.' };
  }

  // ------------------------------------------------------------
  // ---------------------- PROGRESO -------------------------------
  // ------------------------------------------------------------
  function progresoListarPorUsuario(db, usuario_id) {
    const lista = db.progreso
      .filter((p) => p.usuario_id === Number(usuario_id))
      .map((p) => {
        const ruta = buscarRutaPorId(db, p.ruta_id) || {};
        return {
          id: p.id,
          ruta_id: p.ruta_id,
          porcentaje: p.porcentaje,
          fecha_actualizacion: p.fecha_actualizacion,
          ruta_nombre: ruta.nombre,
          nivel: ruta.nivel,
          duracion: ruta.duracion,
          imagen: ruta.imagen
        };
      })
      .sort((a, b) => new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion));
    return lista;
  }

  function progresoMisRutas(db, usuarioReq) {
    return { ok: true, progreso: progresoListarPorUsuario(db, usuarioReq.id) };
  }

  function progresoIniciarORetomar(db, body, usuarioReq) {
    const { ruta_id } = body || {};
    const ruta = buscarRutaPorId(db, ruta_id);
    if (!ruta) throw new ErrorApp('Ruta no encontrada.', 404);
    const progreso = progresoObtenerOCrear(db, usuarioReq.id, ruta_id);
    return { ok: true, mensaje: 'Ruta iniciada.', progreso };
  }

  function progresoActualizar(db, body, usuarioReq) {
    const { ruta_id, porcentaje } = body || {};
    if (porcentaje === undefined || porcentaje < 0 || porcentaje > 100) {
      throw new ErrorApp('El porcentaje debe estar entre 0 y 100.');
    }
    const ruta = buscarRutaPorId(db, ruta_id);
    if (!ruta) throw new ErrorApp('Ruta no encontrada.', 404);

    const p = progresoObtenerOCrear(db, usuarioReq.id, ruta_id);
    const pct = Math.max(0, Math.min(100, Number(porcentaje)));
    p.porcentaje = pct;
    p.fecha_actualizacion = ahoraISO();

    if (pct >= 100) {
      const yaExiste = db.credenciales.some((c) => c.usuario_id === usuarioReq.id && c.ruta_id === Number(ruta_id));
      if (!yaExiste) {
        const codigo = `EDG-${usuarioReq.id}-${ruta_id}-${Date.now().toString(36).toUpperCase()}`;
        db.credenciales.push({
          id: nuevoId(db, 'credenciales'),
          usuario_id: usuarioReq.id,
          ruta_id: Number(ruta_id),
          codigo_verificacion: codigo,
          fecha_emision: ahoraISO()
        });
      }
    }
    guardarDB(db);

    return { ok: true, mensaje: 'Progreso actualizado.', porcentaje: pct };
  }

  function progresoMisCredenciales(db, usuarioReq) {
    const lista = db.credenciales
      .filter((c) => c.usuario_id === usuarioReq.id)
      .map((c) => {
        const ruta = buscarRutaPorId(db, c.ruta_id) || {};
        return { id: c.id, codigo_verificacion: c.codigo_verificacion, fecha_emision: c.fecha_emision, ruta_nombre: ruta.nombre };
      })
      .sort((a, b) => new Date(b.fecha_emision) - new Date(a.fecha_emision));
    return { ok: true, credenciales: lista };
  }

  // ------------------------------------------------------------
  // ---------------------- NOTIFICACIONES --------------------------
  // ------------------------------------------------------------
  function notificacionesListar(db, usuarioReq, query) {
    const soloNoLeidas = query.soloNoLeidas === 'true';
    let lista = db.notificaciones.filter((n) => n.usuario_id === usuarioReq.id);
    if (soloNoLeidas) lista = lista.filter((n) => !n.leida);
    lista = lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 50);
    return { ok: true, notificaciones: lista };
  }

  function notificacionesMarcarLeida(db, id, usuarioReq) {
    const n = db.notificaciones.find((x) => x.id === Number(id) && x.usuario_id === usuarioReq.id);
    if (n) { n.leida = true; guardarDB(db); }
    return { ok: true, actualizado: !!n };
  }

  // ------------------------------------------------------------
  // ---------------------- RECOMENDACIONES -------------------------
  // ------------------------------------------------------------
  function generarRecomendaciones(db, usuario_id) {
    const progresoRows = db.progreso.filter((p) => p.usuario_id === Number(usuario_id));
    const rutasEnProgreso = progresoRows.map((r) => r.ruta_id);

    const sesionesUsuario = db.sesiones.filter((s) => s.usuario_id === Number(usuario_id));
    const especialidadesInteres = [...new Set(
      sesionesUsuario.map((s) => (buscarMentorPorId(db, s.mentor_id) || {}).especialidad).filter(Boolean)
    )];

    const progresoPromedio = progresoRows.length
      ? progresoRows.reduce((acc, r) => acc + Number(r.porcentaje), 0) / progresoRows.length
      : 0;

    let nivelSugerido = 'basico';
    if (progresoPromedio >= 75) nivelSugerido = 'avanzado';
    else if (progresoPromedio >= 35) nivelSugerido = 'intermedio';

    let rutasCandidatas = db.rutas.filter((r) => r.estado === 'activo' && !rutasEnProgreso.includes(r.id));
    rutasCandidatas.sort((a, b) => {
      const aCoincide = a.nivel === nivelSugerido ? 1 : 0;
      const bCoincide = b.nivel === nivelSugerido ? 1 : 0;
      if (bCoincide !== aCoincide) return bCoincide - aCoincide;
      return a.id - b.id;
    });
    const rutasSugeridas = rutasCandidatas.slice(0, 4);

    let mentoresCandidatos = db.mentores.filter((m) => m.estado === 'activo');
    if (especialidadesInteres.length > 0) {
      mentoresCandidatos = mentoresCandidatos.filter((m) => especialidadesInteres.includes(m.especialidad));
    }
    const mentoresSugeridos = mentoresCandidatos
      .map((m) => mentorConDatos(db, m))
      .sort((a, b) => b.calificacion - a.calificacion)
      .slice(0, 3);

    return {
      criterio: {
        progreso_promedio: Number(progresoPromedio.toFixed(1)),
        nivel_sugerido: nivelSugerido,
        especialidades_interes: especialidadesInteres
      },
      rutas_recomendadas: rutasSugeridas,
      mentores_recomendados: mentoresSugeridos
    };
  }

  function recomendacionesObtener(db, usuarioReq) {
    return { ok: true, ...generarRecomendaciones(db, usuarioReq.id) };
  }

  // ------------------------------------------------------------
  // ---------------------- DASHBOARD -------------------------------
  // ------------------------------------------------------------
  function dashboardObtener(db, usuarioReq) {
    const usuario = buscarUsuarioPorId(db, usuarioReq.id);
    const hoy = hoyYMD();

    const proximasSesiones = db.sesiones
      .filter((s) => s.usuario_id === usuarioReq.id && ['pendiente', 'confirmada'].includes(s.estado) && s.fecha >= hoy)
      .map((s) => sesionConDatos(db, s))
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
      .slice(0, 5);

    const progreso = progresoListarPorUsuario(db, usuarioReq.id);
    const notificaciones = notificacionesListar(db, usuarioReq, { soloNoLeidas: 'true' }).notificaciones;
    const recomendaciones = generarRecomendaciones(db, usuarioReq.id);

    const rutaActual = progreso.find((r) => Number(r.porcentaje) < 100) || progreso[0] || null;

    return {
      ok: true,
      usuario: usuarioPublico(usuario),
      proximas_sesiones: proximasSesiones,
      progreso,
      ruta_actual: rutaActual,
      recomendaciones,
      notificaciones
    };
  }

  // ------------------------------------------------------------
  // ---------------------- ADMIN -----------------------------------
  // ------------------------------------------------------------
  function adminEstadisticas(db) {
    const porRol = {};
    db.usuarios.forEach((u) => { porRol[u.rol] = (porRol[u.rol] || 0) + 1; });
    const usuariosPorRol = Object.entries(porRol).map(([rol, total]) => ({ rol, total }));
    const totalUsuarios = usuariosPorRol.reduce((acc, r) => acc + r.total, 0);

    return {
      ok: true,
      estadisticas: {
        total_usuarios: totalUsuarios,
        usuarios_por_rol: usuariosPorRol,
        total_mentores: db.mentores.filter((m) => m.estado === 'activo').length,
        total_rutas: db.rutas.filter((r) => r.estado === 'activo').length,
        total_reservas: db.sesiones.length
      }
    };
  }

  // ------------------------------------------------------------
  // ---------------------- ENRUTADOR PRINCIPAL ----------------------
  // ------------------------------------------------------------
  function manejar(metodo, rutaCompleta, cuerpo) {
    const db = obtenerDB();
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('eduglow_token') : null;

    let usuarioReq = null;
    if (token) {
      usuarioReq = verificarToken(token);
      if (!usuarioReq) throw new ErrorApp('Token invalido o expirado.', 401);
    }

    function requireAuth() {
      if (!usuarioReq) throw new ErrorApp('No se proporciono un token de autenticacion.', 401);
      return usuarioReq;
    }
    function requireRoles(...roles) {
      const u = requireAuth();
      if (!roles.includes(u.rol)) throw new ErrorApp('No tienes permisos para realizar esta accion.', 403);
      return u;
    }

    const [pathPart, queryString] = rutaCompleta.split('?');
    const query = Object.fromEntries(new URLSearchParams(queryString || ''));
    const seg = pathPart.split('/').filter(Boolean);

    // -------- /auth --------
    if (seg[0] === 'auth') {
      if (seg[1] === 'register' && metodo === 'POST') return authRegistrar(db, cuerpo);
      if (seg[1] === 'login' && metodo === 'POST') return authLogin(db, cuerpo);
      if (seg[1] === 'me' && metodo === 'GET') { const u = requireAuth(); return authMe(db, u); }
    }

    // -------- /users --------
    if (seg[0] === 'users') {
      if (seg.length === 1 && metodo === 'GET') { requireRoles('admin'); return usersListar(db, query); }
      if (seg[1] === 'perfil' && seg.length === 2 && metodo === 'PUT') { const u = requireAuth(); return usersActualizarPerfil(db, u, cuerpo); }
      if (seg[1] === 'perfil' && seg[2] === 'password' && metodo === 'PUT') { const u = requireAuth(); return usersCambiarPassword(db, u, cuerpo); }
      if (seg.length === 2 && metodo === 'GET') { requireRoles('admin'); return usersObtener(db, seg[1]); }
      if (seg.length === 3 && seg[2] === 'estado' && metodo === 'PUT') { requireRoles('admin'); return usersCambiarEstado(db, seg[1], cuerpo); }
      if (seg.length === 3 && seg[2] === 'rol' && metodo === 'PUT') { requireRoles('admin'); return usersCambiarRol(db, seg[1], cuerpo); }
    }

    // -------- /mentores --------
    if (seg[0] === 'mentores') {
      if (seg[1] === 'destacados' && metodo === 'GET') return mentoresDestacados(db);
      if (seg.length === 1 && metodo === 'GET') return mentoresListar(db, query, usuarioReq);
      if (seg.length === 1 && metodo === 'POST') { requireRoles('admin'); return mentoresCrear(db, cuerpo); }
      if (seg.length === 2 && metodo === 'GET') return mentoresObtener(db, seg[1]);
      if (seg.length === 2 && metodo === 'PUT') { const u = requireRoles('admin', 'mentor'); return mentoresActualizar(db, seg[1], cuerpo, u); }
      if (seg.length === 3 && seg[2] === 'estado' && metodo === 'PUT') { requireRoles('admin'); return mentoresCambiarEstado(db, seg[1], cuerpo); }
    }

    // -------- /rutas --------
    if (seg[0] === 'rutas') {
      if (seg[1] === 'destacadas' && metodo === 'GET') return rutasDestacadas(db);
      if (seg.length === 1 && metodo === 'GET') return rutasListar(db, query);
      if (seg.length === 1 && metodo === 'POST') { requireRoles('admin'); return rutasCrear(db, cuerpo); }
      if (seg.length === 2 && metodo === 'GET') return rutasObtener(db, seg[1], usuarioReq);
      if (seg.length === 2 && metodo === 'PUT') { requireRoles('admin'); return rutasActualizar(db, seg[1], cuerpo); }
      if (seg.length === 3 && seg[2] === 'estado' && metodo === 'PUT') { requireRoles('admin'); return rutasCambiarEstado(db, seg[1], cuerpo); }
    }

    // -------- /sesiones --------
    if (seg[0] === 'sesiones') {
      if (seg.length === 1 && metodo === 'POST') { const u = requireRoles('estudiante'); return sesionesCrear(db, cuerpo, u); }
      if (seg[1] === 'mias' && metodo === 'GET') { const u = requireAuth(); return sesionesMisReservas(db, u); }
      if (seg[1] === 'de-mi-mentoria' && metodo === 'GET') { const u = requireRoles('mentor'); return sesionesDeMiMentoria(db, u); }
      if (seg.length === 1 && metodo === 'GET') { requireRoles('admin'); return sesionesListarTodas(db, query); }
      if (seg.length === 2 && metodo === 'GET') { requireAuth(); return sesionesObtener(db, seg[1]); }
      if (seg.length === 2 && metodo === 'PUT') { const u = requireAuth(); return sesionesModificar(db, seg[1], cuerpo, u); }
      if (seg.length === 3 && seg[2] === 'cancelar' && metodo === 'PUT') { const u = requireAuth(); return sesionesCancelar(db, seg[1], u); }
      if (seg.length === 3 && seg[2] === 'estado' && metodo === 'PUT') { requireRoles('admin', 'mentor'); return sesionesCambiarEstado(db, seg[1], cuerpo); }
    }

    // -------- /progreso --------
    if (seg[0] === 'progreso') {
      if (seg[1] === 'credenciales' && metodo === 'GET') { const u = requireAuth(); return progresoMisCredenciales(db, u); }
      if (seg.length === 1 && metodo === 'GET') { const u = requireAuth(); return progresoMisRutas(db, u); }
      if (seg.length === 1 && metodo === 'POST') { const u = requireAuth(); return progresoIniciarORetomar(db, cuerpo, u); }
      if (seg.length === 1 && metodo === 'PUT') { const u = requireAuth(); return progresoActualizar(db, cuerpo, u); }
    }

    // -------- /notificaciones --------
    if (seg[0] === 'notificaciones') {
      if (seg.length === 1 && metodo === 'GET') { const u = requireAuth(); return notificacionesListar(db, u, query); }
      if (seg.length === 3 && seg[2] === 'leida' && metodo === 'PUT') { const u = requireAuth(); return notificacionesMarcarLeida(db, seg[1], u); }
    }

    // -------- /recomendaciones --------
    if (seg[0] === 'recomendaciones' && seg.length === 1 && metodo === 'GET') {
      const u = requireAuth();
      return recomendacionesObtener(db, u);
    }

    // -------- /dashboard --------
    if (seg[0] === 'dashboard' && seg.length === 1 && metodo === 'GET') {
      const u = requireAuth();
      return dashboardObtener(db, u);
    }

    // -------- /admin --------
    if (seg[0] === 'admin' && seg[1] === 'estadisticas' && metodo === 'GET') {
      requireRoles('admin');
      return adminEstadisticas(db);
    }

    throw new ErrorApp(`Ruta no encontrada: ${metodo} ${pathPart}`, 404);
  }

  return { manejar, ErrorApp, reiniciarDB, obtenerDB };
})();
