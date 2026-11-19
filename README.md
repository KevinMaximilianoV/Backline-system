# Backline

Plataforma para coordinar tocadas entre bandas independientes y foros de Querétaro.
Arquitectura de microservicios: Identidad, Perfiles, Booking y Notificaciones, cada uno con su propia base PostgreSQL, detrás de un API Gateway.

Proyecto de la materia **Arquitectura Orientada a Servicios** · ISW-27 · Equipo Megapapo.

## Estado

| Componente | Puerto | Estado |
|---|---|---|
| Bases de datos (4 bases, un usuario por servicio, datos de prueba) | 5432 | Listo (Entrega 4) |
| **API Gateway**: punto de entrada único, enrutamiento, disponibilidad | 8080 | **Listo (Entrega 6)** |
| **Identidad**: registro, inicio de sesión con JWT, administración de cuentas | 3001 | **Listo (Entrega 6)** |
| **Perfiles**: catálogos, bandas, foros, rider, inventario, con autorización | 3002 | Listo (Entregas 5 y 6) |
| **Booking**: franjas, solicitudes, aceptación y su historial | 3003 | **Listo (Entrega 6)** |
| Notificaciones y publicación de eventos en RabbitMQ | 3004 | Entrega 7 |
| App Flutter | — | Entregas siguientes |

## Estructura

```
Backline-system/
├── package.json              Workspaces de npm: un "npm install" instala todo
├── docker-compose.yml        PostgreSQL 16 + Adminer para desarrollo
├── db/
│   ├── init/                 Scripts SQL: única fuente de verdad del esquema
│   └── verificacion/         Pruebas de restricciones y su salida esperada
├── packages/
│   └── comun/                Código compartido: errores, validación, JWT, base de datos
├── services/
│   ├── gateway/              API Gateway (8080)
│   ├── identidad/            Cuentas y tokens (3001)
│   ├── perfiles/             Bandas y foros (3002)
│   └── booking/              Franjas y solicitudes (3003)
├── postman/                  Colección y entorno de Postman
├── docs/
│   ├── openapi.yaml          Contrato de la API (OpenAPI 3.1)
│   └── diagramas/            Diagrama ER
├── herramientas/             Configuración local y generadores (datos de prueba, diagrama ER)
└── llaves/                   Llaves de los tokens (se generan; no se suben a Git)
```

Cada servicio separa su código en capas: **rutas** (validan con Zod y revisan el rol) → **servicio** (reglas de negocio, transacciones) → **repositorio** (SQL parametrizado). `packages/comun` es el "chasis": lo que todos los servicios hacen igual (formato de errores, autenticación, conexión a la base). No contiene reglas de negocio; si las tuviera, los servicios dejarían de ser independientes.

## Requisitos

- Docker con Docker Compose v2 (`docker compose version`)
- Node.js **22.12 o superior** (`node --version`; con nvm: `nvm use` en la raíz)
- Postman, opcional: las pruebas también corren desde la terminal

## Instalación y ejecución

Todo se corre desde la **raíz** del repositorio.

```bash
# 1. Base de datos
cp .env.example .env              # define POSTGRES_PASSWORD
docker compose down -v            # solo si ya tenías la base de una entrega anterior
docker compose up -d --wait

# 2. Dependencias, llaves y configuración
npm install                       # instala los 5 paquetes y compila @backline/comun
npm run configurar                # genera llaves/ y copia el .env.example de cada servicio

# 3. Levantar los cuatro servicios en una sola terminal
npm run dev
```

> **¿Por qué `down -v`?** Los datos de prueba cambiaron en la Entrega 6: ahora las cuentas tienen una contraseña real.
> PostgreSQL solo ejecuta los scripts de `db/init` cuando el volumen está vacío, así que hay que borrarlo una vez.

Comprueba que todo responde: `curl http://localhost:8080/salud` → `{"estado":"ok", ..., "servicios":{"identidad":"ok","perfiles":"ok","booking":"ok"}}`

| Script (en la raíz) | Qué hace |
|---|---|
| `npm run dev` | Los cuatro servicios con recarga al guardar, con el registro de cada uno en un color |
| `npm run typecheck` | Revisa los tipos de todos los paquetes |
| `npm run build` y `npm start` | Compila a `dist/` y lo ejecuta (como en producción) |
| `npm run test:postman` | Corre la colección de Postman contra el Gateway |
| `npm run configurar` | Genera llaves y archivos `.env` faltantes; no sobrescribe nada |

### Cuentas de prueba

Todas usan la contraseña **`Backline.2026`** (solo existen en desarrollo).

| Correo | Rol | Nota |
|---|---|---|
| `admin@backline.mx` | admin | |
| `desvelados@correo.com`, `ruidoblanco@correo.com`, `marealenta@correo.com`, `cuartooscuro@correo.com`, `sintoniasur@correo.com` | banda | |
| `ecopolar@correo.com` | banda | Suspendida: el inicio de sesión responde 403 |
| `labodega@correo.com`, `elsotano@correo.com`, `arenanorte@correo.com` | foro | |

### Pruebas con Postman

1. **Import** → los dos archivos de `postman/`.
2. Selecciona el entorno **Backline local**.
3. Clic derecho en la colección → **Run collection**.

O desde la terminal, con los servicios arriba: `npm run test:postman`.

La colección tiene 65 peticiones y 299 pruebas automáticas, con casos positivos y negativos. Cada corrida registra una banda y un foro nuevos, así que se puede repetir sin limpiar la base. La carpeta **3 · Flujo completo** es el escenario de negocio de punta a punta:

```
foro publica franja → banda busca disponibilidad → banda revisa compatibilidad de equipo
→ banda solicita → otra banda solicita la misma franja → el foro acepta una
   (franja reservada + la otra rechazada, en una transacción) → la banda confirma
→ historial → la banda cancela con motivo (la franja se libera)
```

## Autenticación

1. `POST /api/v1/usuarios` registra una cuenta de banda o de foro.
2. `POST /api/v1/sesiones` con correo y contraseña regresa un `tokenAcceso` (JWT RS256, válido 60 minutos).
3. Cada petición protegida lleva el encabezado `Authorization: Bearer <tokenAcceso>`.

Identidad firma los tokens con la llave **privada**; los demás servicios los verifican con la **pública**. Ningún otro servicio puede emitir tokens, y cada servicio verifica el token aunque la petición venga del Gateway: entrar directo al puerto de un servicio no salta la seguridad.

Hay dos niveles de autorización:

- **Por rol**: cada operación indica quién puede hacerla (solo un foro publica franjas, solo una banda solicita, solo el administrador suspende cuentas).
- **Por dueño**: aun con el rol correcto, solo modificas lo tuyo (tu perfil, tus franjas, las solicitudes donde participas).

## Endpoints

Base: `http://localhost:8080/api/v1`. Contrato completo en `docs/openapi.yaml`.

| Servicio | Método y ruta | Quién | Éxito |
|---|---|---|---|
| Identidad | `POST /usuarios` | Público | 201 |
| | `POST /sesiones` | Público (5 intentos fallidos/min) | 201 |
| | `GET /usuarios/me` | Cualquier sesión | 200 |
| | `GET /usuarios?correo=&rol=&estado=&pagina=` | admin | 200 |
| | `PATCH /usuarios/{id}` (suspender o reactivar) | admin | 200 |
| Perfiles | `GET /catalogos/generos`, `/catalogos/tipos-equipo` | Cualquier sesión | 200 |
| | `POST /bandas` · `POST /foros` | banda · foro | 201 |
| | `GET /bandas` · `GET /foros?genero=&ids=` | Cualquier sesión | 200 |
| | `GET`, `PATCH`, `DELETE /bandas/{id}` y `/foros/{id}` | Lectura: cualquiera. Cambios: el dueño | 200 / 204 |
| | `GET`, `PUT /bandas/{id}/rider` · `/foros/{id}/inventario` | Lectura: cualquiera. Cambios: el dueño | 200 |
| Booking | `POST /franjas` | foro | 201 |
| | `GET /franjas?foroId=&desde=&hasta=&estado=&pagina=` | Cualquier sesión | 200 |
| | `GET /franjas/{id}` · `DELETE /franjas/{id}` | Cualquiera · el foro dueño | 200 · 204 |
| | `GET /franjas/{id}/compatibilidad?bandaId=` | La banda indicada | 200 |
| | `POST /solicitudes` | banda | 201 |
| | `GET /solicitudes?estado=&franjaId=&pagina=` | Cada quien ve las suyas; admin, todas | 200 |
| | `GET /solicitudes/{id}` · `.../cambios-estado` · `.../cambios-estado/{id}` | Banda y foro de la solicitud, admin | 200 |
| | `POST /solicitudes/{id}/cambios-estado` | Banda o foro de la solicitud | 201 |
| Gateway | `GET /disponibilidad?fecha=&genero=` | banda | 200 |

## Errores

Todas las respuestas de error usan Problem Details (RFC 9457), `Content-Type: application/problem+json`, con un `codigo` estable y un `correlationId`:

```json
{
  "type": "https://api.backline.mx/errores/transicion-no-permitida",
  "title": "Cambio de estado no permitido",
  "status": 409,
  "detail": "Como banda no puedes pasar una solicitud de solicitada a aceptada. Desde solicitada puedes pasarla a: cancelada.",
  "instance": "/api/v1/solicitudes/0b6f3c1e-8a52-4d7e-9f10-2c3d4e5f6a7b/cambios-estado",
  "codigo": "TRANSICION_NO_PERMITIDA",
  "correlationId": "5b0f8c7e-0d3a-4c51-9d6e-2f1a7b3c9e40"
}
```

| Status | Códigos | Cuándo |
|---|---|---|
| 400 | `SOLICITUD_MAL_FORMADA`, `PARAMETRO_INVALIDO` | JSON inválido; id que no es UUID, fecha pasada, rango demasiado grande |
| 401 | `TOKEN_INVALIDO`, `TOKEN_EXPIRADO`, `CREDENCIALES_INVALIDAS` | Sin token, token alterado o vencido, correo o contraseña incorrectos |
| 403 | `PERMISO_INSUFICIENTE`, `CUENTA_SUSPENDIDA`, `AUTOSUSPENSION_NO_PERMITIDA` | Rol incorrecto, no eres el dueño, cuenta suspendida |
| 404 | `RECURSO_NO_ENCONTRADO` | No existe, se dio de baja, se retiró, o la ruta no existe |
| 409 | `CORREO_YA_REGISTRADO`, `PERFIL_YA_EXISTE`, `PERFIL_REQUERIDO`, `FRANJA_TRASLAPADA`, `FRANJA_NO_DISPONIBLE`, `FRANJA_CON_SOLICITUDES`, `SOLICITUD_DUPLICADA`, `TRANSICION_NO_PERMITIDA` | La petición es válida, pero choca con el estado actual |
| 422 | `VALIDACION_FALLIDA` | Campos inválidos o una regla de negocio de un campo (con `errores[]`) |
| 429 | `LIMITE_EXCEDIDO` | Demasiados intentos fallidos de inicio de sesión (con `Retry-After`) |
| 500 | `ERROR_INTERNO` | Error no previsto; el detalle va al registro, nunca al cliente |
| 503 | `SERVICIO_NO_DISPONIBLE` | Una base o un servicio no responde (con `Retry-After`) |

Cada respuesta lleva `X-Correlation-Id`. El Gateway lo reenvía a los servicios, y Booking lo reenvía a Perfiles: con ese id se sigue una misma petición en el registro de los cuatro servicios.

Las reglas de negocio implementadas están documentadas en la Parte VI del documento técnico del proyecto.

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `CREDENCIALES_INVALIDAS` con las cuentas de prueba | La base es de una entrega anterior (sin contraseñas reales): `docker compose down -v && docker compose up -d --wait` |
| `No se encontró la llave pública...` al arrancar | Falta `npm run configurar` en la raíz |
| `Configuración inválida` al arrancar un servicio | Falta su `.env`: `npm run configurar` lo crea |
| `Cannot find module '@backline/comun'` | Corriste `npm install` dentro de un servicio; córrelo en la raíz |
| `/salud` del Gateway responde 503 | Uno de los servicios no arrancó: el mensaje dice cuál; revisa su registro en `npm run dev` |
| `EADDRINUSE` | Otro proceso usa el puerto; cambia `PORT` en el `.env` del servicio y la URL correspondiente en `services/gateway/.env` |
| `permission denied ... docker.sock` | Usa `sudo` o agrega tu usuario al grupo docker: `sudo usermod -aG docker $USER` y vuelve a iniciar sesión |
