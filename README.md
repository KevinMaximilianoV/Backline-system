# Backline

Plataforma para coordinar tocadas entre bandas independientes y foros de Querétaro.
Arquitectura de microservicios: Identidad, Perfiles, Booking y Notificaciones, cada uno con su propia base PostgreSQL, detrás de un API Gateway.

Proyecto de la materia **Arquitectura Orientada a Servicios** · ISW-27 · Equipo Megapapo.

## Estado

| Componente | Estado |
|---|---|
| Bases de datos (4 bases, roles por servicio, datos de prueba) | Listo (Entrega 4) |
| **Servicio Perfiles**: catálogos, CRUD de bandas y foros, rider e inventario | **Listo (Entrega 5)** |
| Autenticación JWT (servicio Identidad) | Entrega 6 |
| Booking, Notificaciones, API Gateway, app Flutter | Entregas siguientes |

## Estructura

```
Backline-system/
├── docker-compose.yml        PostgreSQL 16 + Adminer para desarrollo
├── .env.example              Variables de Docker Compose (copiar a .env)
├── db/
│   ├── init/                 Scripts SQL: única fuente de verdad del esquema
│   └── verificacion/         Pruebas de restricciones y su salida esperada
├── services/
│   └── perfiles/             Servicio Perfiles (Node 22 + Express 5 + TypeScript)
├── postman/                  Colección y entorno de Postman
├── docs/
│   ├── openapi.yaml          Contrato de la API (OpenAPI 3.1)
│   └── diagramas/            Diagrama ER (.drawio, .dbml, .png)
└── herramientas/             Scripts para generar datos de prueba y el diagrama ER
```

Dentro de `services/perfiles/src` el código está separado por capas:

```
src/
├── server.ts                 Arranque: abre el puerto y apaga en orden (SIGTERM)
├── app.ts                    Arma Express: middlewares, rutas y manejo de errores
├── config/env.ts             Lee y valida las variables de entorno al arrancar
├── db/pool.ts                Pool de conexiones y transacciones (pg)
├── errores/                  ApiError, traducción de errores de Zod y de PostgreSQL
├── middlewares/              Correlation id, registro, validación, 404 y 500
├── comun/                    Esquemas y reglas que comparten bandas y foros
└── modulos/
    ├── catalogos/            rutas → controlador → servicio → repositorio
    ├── bandas/               + esquemas (validación) y mapeo (fila → JSON)
    ├── foros/
    └── salud/
```

Una petición recorre: **ruta** (valida con Zod) → **controlador** (HTTP: código y headers) → **servicio** (reglas de negocio, transacciones) → **repositorio** (SQL parametrizado). Cada capa solo conoce a la siguiente.

## Requisitos

- Docker con Docker Compose v2 (`docker compose version`)
- Node.js 22.9 o superior (`node --version`; con nvm: `nvm use` dentro de `services/perfiles`)
- Postman, opcional; las pruebas también corren desde la terminal con newman

## Instalación y ejecución

### 1. Base de datos

```bash
cp .env.example .env              # define POSTGRES_PASSWORD
docker compose up -d --wait       # crea las 4 bases y carga los datos de prueba
```

> **¿Ya tenías la base de la Entrega 4?** El esquema cambió (columna `dado_de_baja_en` y orden alfabético en español).
> Los scripts de `db/init` solo corren cuando el volumen está vacío, así que bórralo una vez:
> `docker compose down -v && docker compose up -d --wait`

Para comprobar la base (opcional): `docker compose exec postgres psql -U postgres -f /verificacion/verificar.sql` debe mostrar 15 líneas `OK`.
Adminer queda en http://localhost:8081.

### 2. Servicio Perfiles

```bash
cd services/perfiles
cp .env.example .env              # si cambiaste POSTGRES_PORT, ajústalo en DATABASE_URL
npm install
npm run dev                       # http://localhost:3002, se reinicia al guardar
```

Comprueba que responde: `curl http://localhost:3002/salud` → `{"estado":"ok", ...}`

Otros scripts:

| Script | Qué hace |
|---|---|
| `npm run typecheck` | Revisa tipos sin compilar |
| `npm run build` y `npm start` | Compila a `dist/` y lo ejecuta (como en producción) |
| `npm run test:postman` | Corre la colección de Postman contra el servicio levantado |

### 3. Pruebas con Postman

1. En Postman: **Import** → los dos archivos de `postman/`.
2. Selecciona el entorno **Backline local**.
3. Clic derecho en la colección → **Run collection**.

O desde la terminal, con el servicio levantado: `cd services/perfiles && npm run test:postman`.

La colección tiene 38 peticiones con pruebas automáticas (crear, consultar uno, listar, modificar, dar de baja, validaciones, recursos inexistentes, JSON mal formado, conflictos). Cada corrida usa ids nuevos, así que se puede repetir sin limpiar la base.

## Endpoints del servicio Perfiles

Base: `http://localhost:3002/api/v1`. Contrato completo en `docs/openapi.yaml`.

| Método | Ruta | Descripción | Éxito |
|---|---|---|---|
| GET | `/catalogos/generos` | Catálogo de géneros | 200 |
| GET | `/catalogos/tipos-equipo` | Catálogo de tipos de equipo | 200 |
| POST | `/bandas` | Crear banda | 201 + `Location` |
| GET | `/bandas?genero=&pagina=&porPagina=` | Listar bandas activas | 200 |
| GET | `/bandas/{id}` | Consultar banda | 200 |
| PATCH | `/bandas/{id}` | Modificar campos enviados | 200 |
| DELETE | `/bandas/{id}` | Baja lógica | 204 |
| GET / PUT | `/bandas/{id}/rider` | Consultar o reemplazar el rider | 200 |
| POST | `/foros` | Crear foro | 201 + `Location` |
| GET | `/foros?genero=&ids=&pagina=&porPagina=` | Listar foros activos | 200 |
| GET | `/foros/{id}` | Consultar foro | 200 |
| PATCH | `/foros/{id}` | Modificar campos enviados | 200 |
| DELETE | `/foros/{id}` | Baja lógica | 204 |
| GET / PUT | `/foros/{id}/inventario` | Consultar o reemplazar el inventario | 200 |
| GET | `/salud` (fuera de `/api/v1`) | Estado del servicio y de su base | 200 / 503 |

Ejemplo:

```bash
curl -i -X POST http://localhost:3002/api/v1/bandas \
  -H "Content-Type: application/json" \
  -d '{"id":"0b6f3c1e-8a52-4d7e-9f10-2c3d4e5f6a7b","nombre":"Los Prueba","integrantes":4,"generoIds":[1,3]}'
```

> **Temporal hasta la Entrega 6:** sin autenticación, el `id` de la cuenta dueña viaja en el cuerpo del `POST`.
> Cuando exista el login, el id saldrá del token JWT y ese campo desaparece.

## Errores

Todas las respuestas de error usan Problem Details (RFC 9457), `Content-Type: application/problem+json`:

```json
{
  "type": "https://api.backline.mx/errores/validacion-fallida",
  "title": "Los datos enviados no son válidos",
  "status": 422,
  "detail": "Revisa los campos marcados.",
  "instance": "/api/v1/bandas",
  "codigo": "VALIDACION_FALLIDA",
  "correlationId": "5b0f8c7e-0d3a-4c51-9d6e-2f1a7b3c9e40",
  "errores": [{ "campo": "integrantes", "codigo": "FUERA_DE_RANGO", "mensaje": "Debe ser mayor o igual a 1." }]
}
```

| Status | `codigo` | Cuándo |
|---|---|---|
| 400 | `SOLICITUD_MAL_FORMADA` | El cuerpo no es JSON válido o no es un objeto |
| 400 | `PARAMETRO_INVALIDO` | Id que no es UUID, paginación fuera de rango |
| 404 | `RECURSO_NO_ENCONTRADO` | El recurso no existe, se dio de baja, o la ruta no existe |
| 409 | `PERFIL_YA_EXISTE` | Ya hay un perfil (de banda o de foro) con ese id |
| 422 | `VALIDACION_FALLIDA` | Campos inválidos, o ids que no existen en los catálogos |
| 500 | `ERROR_INTERNO` | Error no previsto; el detalle va al registro, nunca al cliente |
| 503 | `SERVICIO_NO_DISPONIBLE` | La base no responde (incluye `Retry-After`) |

Cada respuesta lleva el header `X-Correlation-Id`. Si el cliente lo envía, se reutiliza. Con ese id se encuentra la petición en el registro del servicio, que escribe una línea JSON por petición.

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `column "dado_de_baja_en" does not exist` | La base es de la Entrega 4: `docker compose down -v && docker compose up -d --wait` |
| `/salud` responde 503 | La base no está arriba (`docker compose ps`), o `DATABASE_URL` apunta a otro puerto |
| El servicio no arranca: `Configuración inválida` | Falta `services/perfiles/.env`; cópialo de `.env.example` |
| `EADDRINUSE :::3002` | Otro proceso usa el puerto; cambia `PORT` en `.env` y `baseUrl` en el entorno de Postman |
| `permission denied ... docker.sock` | Usa `sudo` o agrega tu usuario al grupo docker: `sudo usermod -aG docker $USER` y vuelve a iniciar sesión |
