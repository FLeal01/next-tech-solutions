# Tech Solutions

Sistema de gestión de proyectos con autenticación JWT, construido con **Next.js + Express (MVC) + Prisma 7 + MySQL**, vistas server-rendered en **Handlebars** con un **sistema de diseño propio** (CSS puro, paleta lapislázuli, tipografías Archivo + IBM Plex) y una cinta ticker que muestra la **UF del día** (mindicador.cl).

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)

Escogí este stack porque quería salir un poco de mi zona de confort y experimentar con tecnologías que no conocía. Mi objetivo no fue solamente aprender a usarlas, sino más bien formar mi propio criterio sobre el stack, entender cómo se relacionan sus tecnologías y evaluar qué tan cómodo me sentía trabajando con ellas. Por eso incorporé TypeScript, Next.js y un ORM que no había utilizado antes. En cambio, lo que sí mantuve fue MySQL porque ya lo conocía y preferí no cambiar absolutamente todo al mismo tiempo. Hasta ahora mi experiencia ha sido positiva y creo que fue una buena forma de ampliar mis conocimientos.
---

## Tabla de contenidos

- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [API REST](#api-rest)
  - [Health check](#health-check)
  - [Autenticación](#autenticación)
  - [Proyectos](#proyectos)
- [Vistas web](#vistas-web)
- [Middleware de autenticación](#middleware-de-autenticación)
- [Componente UF del día](#componente-uf-del-día)
- [Base de datos](#base-de-datos)
- [Decisiones de arquitectura](#decisiones-de-arquitectura)
- [Solución de problemas](#solución-de-problemas)
- [Roadmap](#roadmap)

---

## Características

- **CRUD completo de proyectos** vía API REST (JSON) e interfaz web (Handlebars), **todas las rutas protegidas por sesión**.
- **Permisos por propietario**: cada proyecto queda asociado al usuario que lo creó (`created_by`, siempre desde el JWT). Solo el propietario puede **editarlo o eliminarlo** — validado en el backend (API responde `403`; la web redirige con aviso) y reflejado en la interfaz (los botones Editar/Eliminar solo aparecen en proyectos propios). Cualquier usuario autenticado puede **ver** todos los proyectos.
- **Registro de usuarios** con clave cifrada mediante **Argon2id** y política de seguridad: mínimo 8 caracteres, al menos una minúscula, una mayúscula, un número y un símbolo especial. El formulario muestra **cada requisito en tiempo real** mientras se escribe (✓/✗ por requisito, mismas reglas que el backend) y, si el servidor rechaza la clave, **conserva nombre y correo**, marca el campo clave como inválido e indica qué requisito falta — sin borrar el formulario.
- **Inicio de sesión** con emisión de **JWT** (expiración configurable, 1h por defecto, sin refresh token). Los campos de clave de registro y login incluyen **toggle mostrar/ocultar** (accesible, con `aria-pressed`).
- **Sesión global**: middleware `cargarUsuario` publica el usuario en todas las vistas; la interfaz siempre refleja el estado de la sesión (saludo, navegación, Home diferenciado). Guardas `authApi` (401 JSON), `authWeb` (redirect a `/login`) y `soloInvitado` (`/login` y `/registro` redirigen si ya hay sesión).
- **Sistema de diseño propio** (`public/css/main.css`, sin framework CSS): paleta lapislázuli con acento dorado, Archivo Expanded + IBM Plex Sans/Mono, tabla de proyectos estilo *ledger*, responsive y accesible (`:focus-visible`, `prefers-reduced-motion`).
- **Cinta ticker con la UF del día**: consume `mindicador.cl`, con caché en memoria de 10 minutos y degradación elegante si el servicio externo falla.
- **Persistencia real** en MySQL 8 mediante Prisma 7 (driver adapter `@prisma/adapter-mariadb`).
- **Health check** para monitoreo (`/api/health`).
- **Endurecimiento**: `JWT_SECRET` obligatorio en producción, cookie de sesión `httpOnly` + `SameSite=Lax` + `Secure` (en producción).
- Validación de entradas en API y formularios, con mensajes de error en español.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22 (ESM) |
| Lenguaje | TypeScript (strict) |
| Framework | Next.js 16 con **servidor custom Express 5** |
| Patrón | MVC (rutas → controladores → modelos → vistas) |
| Vistas | Handlebars (`express-handlebars`) + CSS propio (`public/css/main.css`; Google Fonts: Archivo, IBM Plex Sans/Mono) |
| ORM | Prisma 7.9 (`prisma-client` generator) |
| Base de datos | MySQL 8.0 |
| Auth | `jsonwebtoken` (JWT) + `argon2` |
| Dev tooling | `tsx` (watch), `tsc --noEmit` |

## Requisitos previos

- **Node.js >= 22** (se usa `process.loadEnvFile()` y `fetch` nativo).
- **MySQL 8.0** corriendo en `localhost:3306` (o ajustar `DATABASE_URL`).
- npm >= 10.

## Instalación

```bash
git clone <url-del-repo>
cd docs
npm install
```

## Configuración

1. Copia el archivo de variables de entorno de ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Edita `.env`:

   ```dotenv
   PORT=3000
   JWT_SECRET=cambiar-por-un-secreto-seguro
   JWT_EXPIRES_IN=1h
   DATABASE_URL=mysql://root:password@localhost:3306/desarrollo_software_1
   ```

   > **Nota:** si la contraseña contiene caracteres especiales (`#`, `@`, `/`), deben ir URL-encoded (ej. `#` → `%23`).
   >
   > **Producción:** con `NODE_ENV=production`, el servidor **no arranca** si falta `JWT_SECRET`, y la cookie de sesión se emite con el flag `Secure`.

3. Crea la base de datos y aplica las migraciones:

   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS desarrollo_software_1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   npx prisma migrate dev
   ```

4. (Opcional) Carga datos de demostración — usuario `demo@test.cl` / `Demo123@` y 2 proyectos:

   ```bash
   npx tsx prisma/seed.ts
   ```

## Ejecución

```bash
npm run dev
```

```
> Tech Solutions listo en http://localhost:3000
```

| Recurso | URL |
|---|---|
| Home | http://localhost:3000/ |
| Proyectos (web) | http://localhost:3000/proyectos |
| Login / Registro | http://localhost:3000/login · http://localhost:3000/registro |
| Health check | http://localhost:3000/api/health |
| API proyectos | http://localhost:3000/api/proyectos |

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática (`tsx watch`) |
| `npm run build` | Build de Next.js |
| `npm start` | Servidor en modo producción |
| `npx prisma migrate dev` | Crear/aplicar migraciones (ejecuta el seed si está configurado) |
| `npx prisma generate` | Regenerar el cliente Prisma en `src/generated/prisma` |
| `npx tsx prisma/seed.ts` | Ejecutar el seed manualmente (idempotente) |
| `npx tsc --noEmit` | Verificación de tipos |

## Estructura del proyecto

```
├── prisma/
│   ├── schema.prisma            # Modelos Usuario y Proyecto
│   ├── migrations/              # Migraciones SQL versionadas
│   └── seed.ts                  # Datos de demostración (idempotente)
├── prisma.config.ts             # Config Prisma 7 (schema, migraciones, seed, datasource)
├── src/
│   ├── server.ts                # Entry: Express + Next fallback, motor HBS, helpers, locals
│   ├── config/
│   │   └── env.ts               # PORT, JWT_SECRET, JWT_EXPIRES_IN
│   ├── lib/
│   │   └── prisma.ts            # Singleton PrismaClient + adapter mariadb
│   ├── models/
│   │   ├── usuario.model.ts     # Acceso a datos de usuarios (async)
│   │   └── proyecto.model.ts    # Acceso a datos de proyectos + ESTADOS
│   ├── controllers/
│   │   ├── home.controller.ts
│   │   ├── health.controller.ts
│   │   ├── proyecto.controller.ts   # CRUD JSON
│   │   ├── auth.controller.ts       # Registro/login + lógica compartida
│   │   └── web.controller.ts        # Vistas + formularios
│   ├── middlewares/
│   │   └── auth.middleware.ts       # cargarUsuario (global) / authApi / authWeb / soloInvitado
│   ├── routes/
│   │   ├── index.ts             # Combina routers
│   │   ├── api.routes.ts        # /api/*
│   │   └── web.routes.ts        # Vistas HTML
│   ├── services/
│   │   └── uf.service.ts        # UF del día (mindicador.cl + caché 10 min)
│   ├── generated/prisma/        # Cliente Prisma generado (no editar)
│   └── views/
│       ├── layouts/main.hbs     # Layout base (navbar + cinta {{> uf}} + footer)
│       ├── partials/uf.hbs      # Cinta ticker con la UF del día
│       ├── partials/proyecto_form.hbs  # Formulario reutilizable
│       ├── proyectos/           # index, detalle, nuevo, editar, eliminar
│       ├── auth/                # login, registro
│       ├── home.hbs
│       └── 404.hbs
├── public/
│   └── css/main.css             # Sistema de diseño propio (paleta lapislázuli)
├── .env.example
├── BRIEF.md                     # Requerimientos originales
├── PLAN.md                      # Plan de implementación por fases
└── CONTEXT.md                   # Contexto técnico detallado del proyecto
```

## API REST

Base URL: `http://localhost:3000/api`

### Health check

#### `GET /api/health`

```bash
curl http://localhost:3000/api/health
```

```json
{ "status": "ok", "uptime": 92.37, "timestamp": "2026-08-14T05:26:38.214Z" }
```

### Autenticación

#### `POST /api/auth/registro`

Registra un usuario. La clave se almacena cifrada con Argon2id y **nunca** se devuelve en la respuesta. Política de clave: mínimo 8 caracteres, al menos una minúscula, una mayúscula, un número y un símbolo especial.

```bash
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Demo","correo":"demo@test.cl","clave":"Demo123!"}'
```

`201 Created`

```json
{
  "id": 1,
  "nombre": "Demo",
  "correo": "demo@test.cl",
  "created_at": "2026-08-14T05:27:01.509Z"
}
```

Errores: `400` (nombre vacío, correo inválido o duplicado, clave que no cumple la política: < 8 caracteres, sin minúscula, sin mayúscula, sin número o sin símbolo especial).

#### `POST /api/auth/login`

Devuelve un JWT si las credenciales son correctas.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"demo@test.cl","clave":"demo123"}'
```

`200 OK` → `{ "token": "eyJhbGciOi..." }` · `401` credenciales inválidas.

### Proyectos

Campos: `nombre` (string), `fecha_inicio` (ISO `YYYY-MM-DD`), `estado` (`pendiente` \| `en_progreso` \| `completado`), `responsable` (string), `monto` (entero CLP ≥ 0). `created_by` se toma del JWT.

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/proyectos` | JWT | Listar todos los proyectos |
| `GET` | `/api/proyectos/:id` | JWT | Obtener un proyecto por id |
| `POST` | `/api/proyectos` | JWT | Crear proyecto |
| `PUT` | `/api/proyectos/:id` | JWT | Actualizar proyecto por id (**solo propietario**) |
| `DELETE` | `/api/proyectos/:id` | JWT | Eliminar proyecto por id (**solo propietario**) |

`PUT` y `DELETE` verifican que `created_by` coincida con el `id` del JWT: si el proyecto no existe → `404`; si pertenece a otro usuario → `403`:

```json
{ "error": "No tienes permiso para modificar este proyecto" }
```

**Ejemplo completo** (crear, actualizar y eliminar con token):

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"demo@test.cl","clave":"demo123"}' | jq -r .token)

# Crear → 201
curl -X POST http://localhost:3000/api/proyectos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nombre":"Proyecto API","fecha_inicio":"2026-08-14","estado":"pendiente","responsable":"Demo","monto":999000}'

# Actualizar → 200
curl -X PUT http://localhost:3000/api/proyectos/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nombre":"Proyecto API v2","fecha_inicio":"2026-08-14","estado":"en_progreso","responsable":"Demo","monto":1500000}'

# Eliminar → 204
curl -X DELETE http://localhost:3000/api/proyectos/3 \
  -H "Authorization: Bearer $TOKEN"
```

Sin token válido, **todos** los endpoints de proyectos responden `401`:

```json
{ "error": "Token no provisto o formato inválido" }
```

## Vistas web

| Ruta | Descripción | Auth |
|---|---|---|
| `/` | Home diferenciado (invitado vs autenticado) | — |
| `/proyectos` | Tabla *ledger* de proyectos, con acciones sobre los propios | sesión |
| `/proyectos/:id` | Detalle del proyecto | sesión |
| `/proyectos/nuevo` | Formulario de creación | sesión |
| `/proyectos/:id/editar` | Formulario de edición | sesión + propietario |
| `/proyectos/:id/eliminar` | Confirmación de eliminación | sesión + propietario |
| `/registro` · `/login` | Formularios de autenticación | solo invitados (redirigen a `/proyectos` si hay sesión) |
| `/logout` | Cierra la sesión (limpia cookie) | — |

Las operaciones de escritura desde formularios HTML usan `method-override` (`POST /proyectos/:id?_method=PUT` y `POST /proyectos/:id/eliminar?_method=DELETE`). Al iniciar sesión, el JWT se guarda en una **cookie httpOnly** (`token`), que el middleware web valida en cada request protegido.

## Middleware de autenticación

`src/middlewares/auth.middleware.ts` se organiza en dos niveles:

**`cargarUsuario` (global, montado en `server.ts`)** — corre en cada request, nunca rechaza. Verifica el JWT (firma y expiración con `jsonwebtoken.verify` y `JWT_SECRET`) desde el header `Authorization: Bearer <jwt>` o la cookie `token`:

- Válido → publica `req.usuario` y `res.locals.usuario` (disponible en **todas** las vistas: navbar, Home, etc.).
- Inválido o expirado → limpia la cookie y marca `req.sesionInvalida`.
- Ausente → sigue como anónimo.

**Guardas** (solo comprueban `req.usuario`):

| Guarda | Uso | Fallo → |
|---|---|---|
| `authApi` | Todas las rutas `/api/proyectos` | `401` JSON (`Token no provisto…` / `Token inválido o expirado`) |
| `authWeb` | Todas las rutas `/proyectos` | Redirect a `/login?error=…` (`Sesión expirada` si el token era inválido) |
| `soloInvitado` | GET `/login` y `/registro` | Redirect a `/proyectos` si ya hay sesión |

El payload validado (`{ id, correo, nombre }`) se usa como `created_by` al crear proyectos — siempre desde el JWT, nunca del body — y como base de la **autorización por propiedad**: las mutaciones (`PUT`/`DELETE` en API; editar/eliminar en web) solo se permiten si `created_by` coincide con el usuario de la sesión. La API responde `403` y la web redirige a `/proyectos` con un aviso; la lectura sigue abierta a cualquier usuario autenticado.

## Componente UF del día

- **Servicio**: `src/services/uf.service.ts` consulta `https://mindicador.cl/api/uf`.
- **Caché**: 10 minutos en memoria; timeout de 5s por request; si el servicio falla se sirve el último valor conocido y, si no hay, se omite el componente.
- **Cinta ticker**: `src/views/partials/uf.hbs`, inyectado en todas las vistas mediante `res.locals.uf` e incluido bajo el navbar con `{{> uf}}`. Es el elemento signature del diseño: punto dorado pulsante + valor en IBM Plex Mono.

```
● UF DEL DÍA  $40.851 · 14-08-2026
```

## Base de datos

**MySQL 8.0** · base `desarrollo_software_1` (utf8mb4) · ORM Prisma 7 con driver adapter `@prisma/adapter-mariadb`.

### `usuarios`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | INT | PK, autoincrement |
| `nombre` | VARCHAR(100) | NOT NULL |
| `correo` | VARCHAR(150) | UNIQUE, NOT NULL |
| `clave` | VARCHAR(255) | NOT NULL (hash Argon2id) |
| `created_at` | DATETIME | automático |

### `proyectos`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | INT | PK, autoincrement |
| `nombre` | VARCHAR(150) | NOT NULL |
| `fecha_inicio` | DATE | NOT NULL |
| `estado` | VARCHAR(50) | DEFAULT `pendiente`; `pendiente` \| `en_progreso` \| `completado` |
| `responsable` | VARCHAR(100) | NOT NULL |
| `monto` | INT | CLP, ≥ 0 |
| `created_by` | INT | FK → `usuarios.id` (ON DELETE CASCADE) |
| `created_at` | DATETIME | automático |

```bash
npx prisma migrate dev --name <nombre>   # nueva migración tras editar schema.prisma
npx prisma studio                        # explorador visual (opcional)
```

## Decisiones de arquitectura

1. **Servidor custom Express sobre Next.js**: el brief exige patrón MVC con vistas Handlebars, algo que Next App Router no soporta de forma nativa. Express implementa todo el MVC; Next queda como fallback para futuras páginas React.
2. **Prisma 7 con driver adapter**: la versión 7 eliminó el engine Rust y requiere un adapter explícito (`@prisma/adapter-mariadb`, compatible con MySQL 8). La URL de conexión vive en `prisma.config.ts`, no en el schema.
3. **Nombres snake_case** (`created_at`, `created_by`, `fecha_inicio`) en schema, API y vistas, fieles al brief; tablas mapeadas a `usuarios`/`proyectos` con `@@map`.
4. **Todas las rutas de proyectos requieren sesión**: listados y detalles también están protegidos (web y API); las únicas rutas públicas son Home, login, registro y `/api/health`. La interfaz refleja la sesión en toda la navegación gracias al middleware global `cargarUsuario`.
5. **Argon2** (variante Argon2id por defecto) para el hash de claves: algoritmo moderno resistente a ataques con GPU, recomendado por OWASP; los parámetros (memoria, iteraciones, paralelismo) viajan embebidos en el propio hash.
6. **Diseño propio en lugar de framework CSS**: `public/css/main.css` implementa un sistema completo (tokens de color, escala tipográfica, componentes) con identidad específica del producto — paleta lapislázuli (piedra nacional de Chile), dorado restringido a marca/ticker/foco, cifras tabulares en IBM Plex Mono para datos financieros. Sin menú hamburguesa: el navbar envuelve con flex en móvil. El único JS de UI es un script mínimo en el layout: toggle mostrar/ocultar de los campos de clave y validación en tiempo real de los requisitos de clave en el registro (mismas reglas que el validador del backend).

Más detalle en [`CONTEXT.md`](CONTEXT.md) y [`PLAN.md`](PLAN.md).

## Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| `Access denied for user 'root'@'localhost'` | Credenciales MySQL incorrectas | Revisar `DATABASE_URL` en `.env`; recordar URL-encode de caracteres especiales |
| `PrismaClientInitializationError: driver adapter is required` | Cliente instanciado sin adapter | Usar el singleton de `src/lib/prisma.ts`, nunca `new PrismaClient()` directo |
| `ERR_MODULE_NOT_FOUND .../generated/prisma/client` | Cliente no generado | `npx prisma generate` |
| El seed no termina / proceso colgado | Pool de conexiones abierto | Ya resuelto: `seed.ts` llama `await prisma.$disconnect()` |
| Cinta UF no aparece | mindicador.cl inalcanzable | Comportamiento esperado (degradación elegante); revisar conectividad |
| `RangeError: Invalid time value` en formularios | Helper de fecha con valor `undefined` | Ya resuelto: helpers `formatFecha`/`fechaInput` son null-safe |

## Roadmap

- [ ] Suite de tests automatizados
- [ ] Paginación y filtros en listado de proyectos
- [ ] Refresh tokens y roles de usuario
- [ ] Protección CSRF en formularios web
- [ ] Pipeline de build/start de producción verificado

---

<div align="center">
  <sub>Tech Solutions · Proyecto IPSS — Node.js / Next.js / Express / Prisma / MySQL</sub>
</div>
