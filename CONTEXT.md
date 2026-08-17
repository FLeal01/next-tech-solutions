# CONTEXT — Tech Solutions

> Contexto completo del proyecto para cualquier desarrollador que se incorpore.
> Estado: **permisos por propietario + validación de clave en vivo y formulario de registro preservado + rediseño visual propio**.

## Qué es

Sistema de gestión de proyectos. Stack: **Node.js 22 + TypeScript + Next.js 16** (servidor custom **Express 5**), patrón **MVC**, vistas **Handlebars** (`.hbs` + sistema de diseño propio en `public/css/main.css`, sin framework CSS), ORM **Prisma 7.9.1** sobre **MySQL 8.0**, auth con **JWT** (login) y **argon2** (Argon2id, hash de claves).

## Cómo ejecutar

```bash
npm install
npm run dev        # tsx watch src/server.ts → http://localhost:3000
```

- `.env` ya existe (gitignored) con `PORT`, `JWT_SECRET`, `DATABASE_URL`.
- Credenciales MySQL: `root` / ver `.env` (`DATABASE_URL`, la clave lleva `#` URL-encoded como `%23`).
- BD: `desarrollo_software_1` (utf8mb4). Migración aplicada: `prisma/migrations/20260814065759_init_desarrollo_software_1`.
- Seed (`npx tsx prisma/seed.ts`, también corre con `prisma migrate dev`): usuario `demo@test.cl` / `demo123` + 2 proyectos. Es idempotente (omite si hay usuarios).
- Type check: `npx tsc --noEmit` (en Windows, exportar `TMPDIR="$TEMP"` si falla `sort`).

## Arquitectura y decisiones clave

1. **Servidor custom Express** (`src/server.ts`): Next solo actúa como fallback (`app.all(/(.*)/)` → `nextHandler`); no hay páginas React reales (`src/pages/.gitkeep` existe solo porque Next exige el directorio). Express hace todo el MVC. Razón: Next App Router no soporta Handlebars.
2. **Prisma 7 exige driver adapter**: no basta `DATABASE_URL`; se usa `@prisma/adapter-mariadb` (compatible MySQL 8) en `src/lib/prisma.ts`. El cliente se genera en `src/generated/prisma` (provider `prisma-client`).
3. **`prisma.config.ts`** (obligatorio en Prisma 7): carga `.env` vía `process.loadEnvFile()`, define schema, migraciones y comando de seed.
4. **Campos snake_case** (`created_at`, `created_by`, `fecha_inicio`) tanto en Prisma como en la API, tal como pide el brief. Tablas mapeadas a `usuarios`/`proyectos`.
5. **Sesión global + guardas** (`src/middlewares/auth.middleware.ts`): `cargarUsuario` corre **globalmente** (montado en `server.ts` antes de las rutas): verifica el JWT (header `Authorization: Bearer` o cookie httpOnly `token`; firma y expiración con `jwt.verify`), y si es válido publica `req.usuario` + `res.locals.usuario` en **todas** las vistas; si es inválido/expirado limpia la cookie y marca `req.sesionInvalida`. Nunca rechaza. Las guardas solo comprueban `req.usuario`: `authApi` → 401 JSON (`Token no provisto o formato inválido` / `Token inválido o expirado`); `authWeb` → redirect a `/login?error=…` (`Sesión expirada` si el token era inválido); `soloInvitado` (GET `/login` y `/registro`) → redirect a `/proyectos` si ya hay sesión. **Todas** las rutas de proyectos (web y API, lectura incluida) requieren sesión — decisión D1 aprobada por el usuario. **No** hay autorización por propiedad: `created_by` registra quién creó el proyecto, pero cualquier autenticado puede editar/eliminar (D2 rechazada). La identidad se confía al payload `{ id, correo, nombre }` tras validar firma/expiración, sin re-consulta a BD (D3); JWT de 1h sin refresh token (D4).
6. **API y web comparten modelos**: controladores API (`proyecto.controller.ts`, `auth.controller.ts`) responden JSON; `web.controller.ts` renderiza vistas y maneja formularios reutilizando `registrarUsuario`/`autenticarUsuario` y los mismos modelos. La política de clave vive en `validarClave` (exportada de `auth.controller.ts`), usada por API y web; el JS en vivo del registro replica sus regex literalmente. Validación duplicada en `parseInput` (API, mensajes minúscula) y `parseForm` (web, mensajes capitalizados) — candidato a unificar si crece.
7. **Formularios HTML** usan `method-override` (`?_method=PUT|DELETE`) porque HTML solo soporta GET/POST.
8. **Componente UF**: `src/services/uf.service.ts` consulta `https://mindicador.cl/api/uf` con caché en memoria de 10 min y timeout 5s; se inyecta en `res.locals.uf` para todas las vistas y se renderiza con el partial `{{> uf}}` como **cinta ticker** bajo el navbar (elemento signature del diseño). Si el servicio externo cae, se sirve el último valor cacheado o se omite la cinta.
9. **Diseño propio (sin Bootstrap)**: `public/css/main.css` define el sistema completo — paleta "lapislázuli" (tinta `#0E1B33`, lapis `#1D4E9E`, dorado `#C7952C` restringido a marca/ticker/foco), tipografías Google Fonts (Archivo Expanded para titulares, IBM Plex Sans para cuerpo, IBM Plex Mono para cifras tabulares), tabla de proyectos estilo *ledger* con pills de estado. Responsive con wrap de flex (sin menú hamburguesa ni JS), `:focus-visible` dorado, `prefers-reduced-motion` respetado.
10. **Endurecimiento**: `src/config/env.ts` lanza error al arrancar si `NODE_ENV=production` sin `JWT_SECRET`; la cookie de sesión usa `secure: true` en producción (`httpOnly` + `sameSite: 'lax'` siempre). Eliminado el fallback `req.usuario?.id ?? 0` en los controladores: las rutas protegidas usan `req.usuario!.id` (la guarda lo garantiza; un fallo debe romper visiblemente, no crear datos con `created_by = 0`).
11. **Autorización por propietario**: solo el creador puede editar/eliminar su proyecto. API (`actualizarProyecto`/`eliminarProyecto`): `obtenerPorId` → 404 si no existe → 403 si `created_by !== req.usuario!.id` (orden deliberado: 404 antes que 403). Web: helper `obtenerProyectoPropio` en `web.controller.ts` usado por los 4 handlers de mutación (vista/procesar editar y eliminar) → redirect `conError('/proyectos', …)`; la lista muestra el alert (`vistaListarProyectos` pasa `error`). En vistas, los botones se ocultan con `{{#if (eq created_by usuario.id)}}` (`../usuario` dentro del `{{#each}}`) — UX solamente, la seguridad es el backend. Lectura (lista/detalle) abierta a cualquier autenticado.
12. **Registro: validación en vivo + formulario preservado**: `registro.hbs` tiene `<ul class="clave-requisitos">` con un `<li data-req>` por requisito; el script inline de `main.hbs` evalúa en cada `input` (estado neutro hasta la primera tecla) alternando `.cumple`/`.falta` (✓/✗ vía CSS, variables `--ok`/`--danger`). Requisitos: 8+ caracteres, minúscula, mayúscula, número, símbolo (regex con tildes/ñ, idénticas front/back). `procesarRegistro` ya no hace redirect ante error: **re-renderiza con 400** pasando `valores: { nombre, correo }` (conservados en los `value` de los inputs; la clave nunca se reenvía) y, si el error es de clave (`validarClave`), `errorClave` marca el campo (`input-invalid`, `aria-invalid`, `aria-describedby`) con el mensaje específico del requisito faltante; otros errores (correo duplicado/inválido, nombre vacío) usan el alert general sin marcar la clave.

## Estructura

```
src/
  server.ts                  # Express + Next fallback, motor HBS, helpers, locals UF, cargarUsuario global
  config/env.ts              # PORT, JWT_SECRET (obligatorio en producción), JWT_EXPIRES_IN
  lib/prisma.ts              # PrismaClient + adapter mariadb (singleton)
  models/                    # usuario.model.ts, proyecto.model.ts (async, delegan en Prisma)
  controllers/
    home.controller.ts       # GET / (vista home, diferenciada por sesión vía res.locals.usuario)
    health.controller.ts     # GET /api/health
    proyecto.controller.ts   # CRUD JSON (5 handlers; PUT/DELETE con verificación de propietario → 403)
    auth.controller.ts       # registro/login API + registrarUsuario/autenticarUsuario/validarClave (lógica compartida)
    web.controller.ts        # vistas + formularios (redirects con ?error=; cookie secure en prod; obtenerProyectoPropio; registro re-renderiza conservando valores)
  middlewares/auth.middleware.ts  # cargarUsuario (global) / authApi / authWeb / soloInvitado
  routes/                    # index.ts (combina), api.routes.ts, web.routes.ts
  services/uf.service.ts     # UF del día (mindicador.cl + caché)
  views/
    layouts/main.hbs         # navbar (marca dorada, links por sesión) + {{> uf}} + footer + JS inline (toggle clave, requisitos en vivo)
    partials/uf.hbs          # cinta ticker UF (signature del diseño)
    partials/proyecto_form.hbs  # formulario reutilizado por nuevo/editar
    proyectos/               # index (tabla ledger, acciones solo al propietario), detalle, nuevo, editar, eliminar
    auth/                    # login, registro (requisitos de clave en vivo, valores preservados en error)
    home.hbs, 404.hbs
public/
  css/main.css               # sistema de diseño propio (paleta lapislázuli, sin framework CSS)
prisma/
  schema.prisma              # Usuario, Proyecto (snake_case, @@map)
  migrations/                # 20260814065759_init_desarrollo_software_1
  seed.ts                    # demo@test.cl/demo123 + 2 proyectos (idempotente)
prisma.config.ts
PLAN.md                      # plan permisos por propietario + validación de clave (ejecutado 2026-08-16; decisiones D1–D6)
BRIEF.md                     # ajustes solicitados 2026-08-16 (reemplazó al brief original)
```

## Helpers Handlebars registrados (server.ts)

- `formatFecha` → `dd-mm-aaaa` (es-CL, UTC)
- `fechaInput` → `yyyy-mm-dd` para `<input type="date">`
- `formatMonto` → CLP es-CL (`$4.500.000`)
- `eq` → comparación para `{{#if (eq a b)}}`

**Ojo**: los helpers de fecha son null-safe (`undefined` → `''`); el formulario de "nuevo proyecto" no tiene objeto `proyecto` y antes lanzaba `RangeError: Invalid time value`.

## Rutas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | — | Home (diferenciada: invitado vs autenticado) |
| GET | `/api/health` | — | `{status, uptime, timestamp}` |
| POST | `/api/auth/registro` | — | Crea usuario (Argon2id), devuelve sin clave |
| POST | `/api/auth/login` | — | Devuelve `{token}` JWT (1h) |
| GET | `/api/proyectos` | JWT | Lista JSON |
| GET | `/api/proyectos/:id` | JWT | Detalle JSON / 404 |
| POST/PUT/DELETE | `/api/proyectos[/:id]` | JWT | Crear / actualizar / eliminar (PUT/DELETE solo propietario → 403) |
| GET | `/proyectos`, `/proyectos/:id` | cookie | Vistas lista/detalle |
| GET/POST | `/proyectos/nuevo`, `/proyectos` | cookie | Crear (vista + form) |
| GET/PUT | `/proyectos/:id/editar`, `/proyectos/:id` | cookie + propietario | Editar (vista + form) |
| GET/DELETE | `/proyectos/:id/eliminar` | cookie + propietario | Confirmar y eliminar (vista dedicada) |
| GET | `/registro`, `/login` | solo invitado | Redirigen a `/proyectos` si ya hay sesión |
| POST | `/registro`, `/login` | — | Forms auth |
| GET | `/logout` | — | Limpia cookie, redirect `/` |

Estados de proyecto válidos: `pendiente`, `en_progreso`, `completado` (`ESTADOS` en `proyecto.model.ts`).

## Estado verificado (2026-08-16, permisos por propietario + validación de clave)

- `tsc --noEmit` limpio.
- Permisos por propietario (en vivo, dos usuarios A/B): API — B hace PUT/DELETE sobre proyecto de A → **403** (`No tienes permiso para…`), GET ajeno → 200, inexistente → 404, proyecto intacto tras los intentos; A (dueño) hace PUT 200 y DELETE 204 sin regresión. Web — B en `/editar`, `/eliminar` y forms PUT/DELETE de proyecto ajeno → 302 a `/proyectos?error=No+tienes+permiso…` con alert visible en la lista; lista y detalle muestran botones Editar/Eliminar **solo en proyectos propios** (A los ve, B no).
- Registro (navegador): requisitos neutros hasta la primera tecla, luego ✓/✗ por requisito en vivo (mismas regex que `validarClave`); submit con clave inválida → **400 re-render** en `/registro` (sin redirect): nombre y correo conservados, clave vacía marcada en rojo (`input-invalid` + `aria-invalid`) con el mensaje del requisito faltante; corregir solo la clave → registro OK → `/login`; correo duplicado → alert general con campos conservados y clave sin marcar. Requisito de minúscula verificado front y back (400 `la clave debe incluir al menos una minúscula`; `ABCDefg1#` → 201).
- BD `desarrollo_software_1`: migración `init_desarrollo_software_1` aplicada; sin `updated_at`; `estado` VARCHAR(50) DEFAULT `pendiente`; relación Prisma renombrada a `autor`.
- Auth (verificado en vivo con curl + navegador): anónimo → `GET /proyectos` 302 a `/login?error=Debes%20iniciar%20sesión…`, `GET /api/proyectos` 401; login → cookie `token` httpOnly + redirect `/proyectos`; navbar y Home muestran "Hola, {nombre}" en todas las vistas (vía `cargarUsuario` global); `/login` y `/registro` con sesión → 302 `/proyectos`; proyecto creado queda con `created_by` del JWT; token alterado → web limpia cookie + redirect `Sesión expirada`, API 401 `Token inválido o expirado`; logout → cookie eliminada → `/proyectos` vuelve a 302.
- Guard de producción verificado: `NODE_ENV=production` sin `JWT_SECRET` → `Error: JWT_SECRET es obligatorio…` al cargar `env.ts`.
- Diseño verificado con screenshots (Chromium, 1440px y 390px): home anónimo/autenticado, login, lista ledger, detalle; ticker UF con dato real; móvil con wrap de navbar y scroll horizontal de tabla.
- API: CRUD completo contra MySQL; `GET /api/proyectos` incluye `autor` **sin `clave`** (select anidado); registro devuelve usuario sin `clave`; JWT con payload `{ id, correo, nombre }`.

## Convenciones y notas

- ESM (`"type": "module"`), imports sin extensión (moduleResolution Bundler + tsx).
- Modelos async (Prisma); controladores async — Express 5 maneja rechazos.
- `monto` es `Int` (CLP sin decimales).
- Regla de estilo del proyecto: evitar funciones de una sola expresión salvo que sean API pública/seam (verificadores de reglas activos).
- No hay tests automatizados; verificación fue manual (curl + browser).
- Proceso dev gestionado por `hub` (nombre `techsolutions`): `cmd.exe /c "npm run dev"` con watch (en Windows, `npm` no es ejecutable directo como PTY).

## Posibles siguientes pasos (no solicitados)

- Tests (no existe suite), paginación en listados, refresh tokens, roles, unificar `parseInput`/`parseForm`, CSRF en formularios web, `npm run build`/`start` de producción aún no probados end-to-end.
