# EduGlow — Version 100% local (sin instalar nada)

Plataforma de orientacion y mentoria academica/profesional. Esta version es
**front-end puro**: no requiere Node.js, MySQL, Docker ni ningun otro
programa instalado. Todo corre en el navegador y los datos se guardan en
`localStorage`.

> Esta version reemplaza a la variante "full-stack real" (Node/Express/MySQL/JWT).
> Toda la logica que antes vivia en el backend (autenticacion, mentores, rutas,
> reservas, progreso, credenciales, notificaciones, recomendaciones y panel
> admin) fue portada a `js/db-local.js`, que simula el mismo API pero
> operando sobre `localStorage` en vez de una base de datos real.

## Como ejecutarlo

**Opcion 1 — doble clic (mas simple):**
Abre `index.html` con tu navegador (Chrome, Edge o Firefox). Listo.

**Opcion 2 — servidor local (mas robusto, evita restricciones de `file://`):**
```bash
python3 -m http.server 8000
```
y abre `http://localhost:8000` en el navegador.

## Cuentas de prueba

La contrasena para **todas** las cuentas de prueba es `Password123`.

| Rol | Correo |
|---|---|
| Administrador | admin@eduglow.com |
| Mentor | carlos.mentor@eduglow.com |
| Mentor | lucia.mentor@eduglow.com |
| Mentor | diego.mentor@eduglow.com |
| Estudiante | maria.estudiante@eduglow.com |
| Estudiante | jose.estudiante@eduglow.com |
| Estudiante | valeria.estudiante@eduglow.com |
| Estudiante | andres.estudiante@eduglow.com |
| Estudiante | camila.estudiante@eduglow.com |

También puedes registrar una cuenta nueva desde `registro.html`.

## Estructura

```
index.html, login.html, registro.html, dashboard.html,
explorar.html, mentor.html, ruta.html, perfil.html,
reservas.html, admin.html
css/styles.css
js/
  db-local.js   <- "backend" simulado: toda la logica de negocio
                   (auth, mentores, rutas, sesiones, progreso,
                   credenciales, notificaciones, recomendaciones,
                   admin), operando sobre localStorage.
  api.js        <- mismo cliente de siempre; solo cambio como
                   "viaja" la peticion (ya no es fetch por red,
                   llama directo a EduGlowDB.manejar()).
  auth.js, common.js, dashboard.js, inicio.js, mentores.js,
  perfil.js, reservas.js, rutas.js, admin.js  <- sin cambios.
```

## Funcionalidades incluidas

- Registro e inicio de sesion (token simulado, no es un JWT real).
- Exploracion y filtrado de mentores; perfil de mentor y reserva de sesion
  con verificacion de conflictos de horario.
- Rutas de aprendizaje con progreso por usuario y credencial digital
  automatica al llegar a 100%.
- Dashboard con proximas sesiones, progreso, recomendaciones y notificaciones.
- Panel administrativo: estadisticas, gestion de usuarios (rol/estado),
  mentores (crear/editar/desactivar) y rutas (crear/editar/desactivar),
  y cambio de estado de reservas.

## Importante (uso academico)

Al ser una simulacion 100% en el navegador:
- Las "contrasenas" se ofuscan con un hash simple **no criptografico**
  (no bcrypt), solo para que la demo funcione sin backend.
- El "token" de sesion es un JSON codificado en base64, no un JWT firmado.
- Los datos viven en `localStorage` del navegador: son distintos en cada
  navegador/equipo y se borran si limpias los datos del sitio.

En una implementacion real, esto debe moverse a un backend con base de
datos, contrasenas con bcrypt/argon2, JWT firmado con secreto de servidor
y conexion HTTPS — que es justamente lo que tenia la version anterior
(`backend/`, `database/`, `Dockerfile`) por si se retoma ese camino.

Proyecto academico — EduGlow, 2026.
