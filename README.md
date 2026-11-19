# Backline

Plataforma para coordinar tocadas entre bandas independientes y foros de Querétaro.
Arquitectura de microservicios: Identidad, Perfiles y Booking, cada uno con su propia base PostgreSQL, detrás de un API Gateway.

Proyecto de la materia **Arquitectura Orientada a Servicios** · ISW-27 · Equipo Megapapo.

## Estado

| Componente | Puerto | Estado |
|---|---|---|
| Bases de datos (4 bases, un usuario por servicio, datos de prueba) | 5432 | Listo (Entrega 4) |
| **API Gateway**: punto de entrada único, enrutamiento, disponibilidad, CORS, documentación | 8080 | Listo (Entregas 6 y 7) |
| **Identidad**: registro, inicio de sesión con JWT, administración de cuentas | 3001 | Listo (Entrega 6) |
| **Perfiles**: catálogos, bandas, foros, rider, inventario, con autorización | 3002 | Listo (Entregas 5 y 6) |
| **Booking**: franjas, solicitudes, aceptación y su historial | 3003 | Listo (Entrega 6) |
| **Pruebas, seguridad, documentación y despliegue en contenedores** | — | **Entrega 7** |
| Notificaciones (consumir los eventos del outbox de Booking) | 3004 | Pendiente: la base y el outbox ya existen; el servicio no |
| App Flutter | — | Entregas siguientes |

## Inicio rápido

Hay dos formas de correr el sistema. Elige **una**: las dos usan el puerto 8080.

**A. Todo en contenedores** (como se desplegaría; solo necesita Docker y Node para generar las llaves):

```bash
cp .env.example .env              # define POSTGRES_PASSWORD
npm run configurar                # genera llaves/ (solo la primera vez)
docker compose --profile completo up -d --build --wait
```

**B. Desarrollo** (la base en Docker, los servicios con recarga al guardar):

```bash
cp .env.example .env
docker compose up -d --wait       # solo PostgreSQL y Adminer
npm ci                            # instala los 5 paquetes y compila @backline/comun
npm run configurar                # llaves/ y el .env de cada servicio
npm run dev                       # los cuatro servicios en una terminal
```

En los dos casos:

- API: `http://localhost:8080/api/v1`
- **Documentación interactiva (Swagger UI): `http://localhost:8080/docs`**
- Salud: `curl http://localhost:8080/salud` → `{"estado":"ok", ..., "servicios":{"identidad":"ok","perfiles":"ok","booking":"ok"}}`

> **¿Vienes de una entrega anterior?** Corre `docker compose down -v` una vez. PostgreSQL solo ejecuta `db/init` cuando el volumen está vacío, y en esta entrega cambió el script que crea los usuarios de cada servicio.

## Estructura

```
Backline-system/
├── package.json              Workspaces de npm y scripts de la raíz
├── Dockerfile                Una imagen por servicio (--build-arg SERVICIO=...)
├── docker-compose.yml        PostgreSQL + Adminer; con --profile completo, también los 4 servicios
├── vitest.config.ts          Pruebas automatizadas: un proyecto por paquete
├── .github/workflows/        Integración continua (GitHub Actions)
├── db/
│   ├── init/                 Scripts SQL: única fuente de verdad del esquema
│   └── verificacion/         Pruebas de restricciones y su salida esperada
├── packages/
│   └── comun/                Código compartido: errores, validación, JWT, registro, base de datos
├── services/
│   ├── gateway/              API Gateway (8080) y /docs
│   ├── identidad/            Cuentas y tokens (3001)
│   ├── perfiles/             Bandas y foros (3002)
│   └── booking/              Franjas y solicitudes (3003)
├── pruebas/                  Utilidades de prueba y la prueba de carga
├── postman/                  Colección y entorno de Postman (pruebas de punta a punta)
├── docs/
│   ├── openapi.yaml          Contrato de la API (OpenAPI 3.1)
│   ├── defectos.md           Defectos encontrados y corregidos
│   └── diagramas/            Diagrama ER
├── herramientas/             Configuración local y generadores
└── llaves/                   Llaves de los tokens (se generan; no se suben a Git)
```

Cada servicio separa su código en capas: **rutas** (validan con Zod y revisan el rol) → **servicio** (reglas de negocio, transacciones) → **repositorio** (SQL parametrizado). `packages/comun` es el "chasis": lo que todos los servicios hacen igual (formato de errores, autenticación, validación, registro). No contiene reglas de negocio; si las tuviera, los servicios dejarían de ser independientes.

## Requisitos

- Docker con Docker Compose v2 (`docker compose version`)
- Node.js **22.12 o superior** (`node --version`; con nvm: `nvm use` en la raíz). `jose` 6 solo funciona desde esa versión.
- Postman, opcional: las mismas pruebas corren desde la terminal

## Scripts

Todo se corre desde la **raíz** del repositorio.

| Script | Qué hace |
|---|---|
| `npm run dev` | Los cuatro servicios con recarga al guardar, con el registro de cada uno en un color |
| `npm run build` y `npm start` | Compila a `dist/` y lo ejecuta (como en producción) |
| `npm run typecheck` | Revisa los tipos de todos los paquetes y de las pruebas |
| `npm test` | Todas las pruebas automatizadas (unitarias e integración) |
| `npm run test:unitarias` | Solo las unitarias: no necesitan base de datos |
| `npm run test:cobertura` | Pruebas con reporte de cobertura en `cobertura/index.html` |
| `npm run test:postman` | Colección de Postman contra el Gateway (servicios arriba) |
| `npm run test:carga` | Prueba de carga y concurrencia contra el Gateway (servicios arriba) |
| `npm run configurar` | Genera llaves y archivos `.env` faltantes; no sobrescribe nada |

### Cuentas de prueba

Todas usan la contraseña **`Backline.2026`**. Solo existen en desarrollo: vienen de `db/init/` y no deben cargarse en un despliegue real.

| Correo | Rol | Nota |
|---|---|---|
| `admin@backline.mx` | admin | |
| `desvelados@correo.com`, `ruidoblanco@correo.com`, `marealenta@correo.com`, `cuartooscuro@correo.com`, `sintoniasur@correo.com` | banda | |
| `ecopolar@correo.com` | banda | Suspendida: el inicio de sesión responde 403 |
| `labodega@correo.com`, `elsotano@correo.com`, `arenanorte@correo.com` | foro | |

## Pruebas

Cuatro niveles, de más rápidos y numerosos a más lentos y completos:

| Nivel | Herramienta | Qué cubre | Cómo correrlo |
|---|---|---|---|
| Unitarias | Vitest | Validación, errores, JWT, matriz de transiciones, cálculo de equipo faltante | `npm run test:unitarias` |
| Integración | Vitest + Supertest + PostgreSQL real | Cada endpoint con casos correctos e incorrectos: 401, 403, 404, 409, 422, inyección, concurrencia | `npm test` |
| Punta a punta | Postman / Newman | El flujo de negocio completo a través del Gateway | `npm run test:postman` |
| Carga | Script de Node (`pruebas/carga/carga.mjs`) | p95 de búsqueda y creación con 50 usuarios; 20 aceptaciones simultáneas | `npm run test:carga` |

### Integración continua

`.github/workflows/ci.yml` corre en cada pull request y en cada push a `main`, en dos trabajos:

1. **Pruebas y cobertura**: levanta PostgreSQL con Compose, corre `npm run typecheck` y `npm run test:cobertura`. Falla si alguna prueba falla o si la cobertura baja de los umbrales (RNF-10). El reporte queda como artefacto `cobertura`.
2. **Sistema completo**: construye las cuatro imágenes, levanta `--profile completo` y corre la colección de Postman y la prueba de carga contra el Gateway.

### Pruebas automatizadas (Vitest)

Las de integración necesitan la base de datos arriba (`docker compose up -d --wait`). No necesitan los servicios corriendo: cada prueba levanta la aplicación en memoria. Las de Booking levantan además un Perfiles real en el puerto 43202, porque Booking lo consulta por HTTP.

```bash
npm test                    # todo
npm run test:cobertura      # con cobertura; abre cobertura/index.html
npx vitest run --project booking    # un solo paquete
```

Las pruebas usan un par de llaves RSA propio (en la carpeta temporal del sistema) y `BCRYPT_COSTO=4` para ser rápidas: no tocan `llaves/` ni los `.env`.

Algunos casos que vale la pena conocer:

- **Barrido de 401 guiado por el contrato**: las pruebas leen `docs/openapi.yaml` y piden **cada** operación protegida sin token. Si alguien agrega un endpoint al contrato y olvida protegerlo, la prueba falla.
- **RNF-05 (concurrencia)**: 20 aceptaciones simultáneas sobre la misma franja → exactamente 1 responde 201 y 19 responden 409; ningún 500, y la base termina con 1 aceptada y 19 rechazadas.
- **JWT**: token alterado, firmado con otra llave, `alg: none`, confusión HS256 con la llave pública, emisor o audiencia ajenos, vencido.
- **RNF-01**: ninguna contraseña en la base deja de ser un hash bcrypt.

Umbrales de cobertura (la corrida falla si no se alcanzan): 80% de líneas en general y en el Gateway, y **60% en Booking** (RNF-10). Resultado actual: 92% en general, 90% en Booking, 99% en el Gateway.

Las pruebas del Gateway se dividen en dos proyectos: `gateway` apunta a servicios caídos (503, CORS, `/docs`) y `gateway-composicion` levanta servicios falsos para probar el reenvío y la composición de `/disponibilidad`.

### Prueba de carga

```bash
# con el sistema arriba (cualquiera de las dos formas)
npm run test:carga
USUARIOS=50 DURACION=30 BASE_URL=http://localhost:8080 npm run test:carga
```

Crea un foro, 50 bandas y 60 franjas, y corre tres escenarios:

1. **Búsqueda**: 50 usuarios alternan `GET /disponibilidad` y `GET /franjas` durante 30 s.
2. **Creación de solicitudes**: cada banda solicita cada franja (3,000 solicitudes).
3. **Concurrencia**: 20 aceptaciones simultáneas de solicitudes de la misma franja.

Imprime una tabla con p50, p95 y p99, y dice `CUMPLE` / `NO CUMPLE` por criterio (RNF-05 y RNF-06: p95 < 500 ms). Sale con código 1 si algún criterio no se cumple.

Resultado de referencia en una máquina de 2 vCPU con todo el sistema y el generador de carga compartiendo CPU:

| Escenario | Peticiones | p50 | p95 | Errores 5xx | Criterio |
|---|---|---|---|---|---|
| Búsqueda | ~9,900 | 138 ms | 304 ms | 0 | Cumple |
| Creación de solicitudes | 3,000 | 264 ms | 341 ms | 0 | Cumple |
| 20 aceptaciones simultáneas | 20 | — | — | 0 | Cumple: 1 × 201, 19 × 409 |

La creación llegó a 593 ms en la primera medición; el análisis de cómo bajó a 341 ms está en [docs/defectos.md](docs/defectos.md) (D11).

### Pruebas con Postman

1. **Import** → los dos archivos de `postman/`.
2. Selecciona el entorno **Backline local**.
3. Clic derecho en la colección → **Run collection**.

O desde la terminal: `npm run test:postman`. Cada corrida registra una banda y un foro nuevos, así que se puede repetir sin limpiar la base. La carpeta **3 · Flujo completo** es el escenario de negocio de punta a punta:

```
foro publica franja → banda busca disponibilidad → banda revisa compatibilidad de equipo
→ banda solicita → otra banda solicita la misma franja → el foro acepta una
   (franja reservada + la otra rechazada, en una transacción) → la banda confirma
→ historial → la banda cancela con motivo (la franja se libera)
```

## Documentación de la API

- **Swagger UI**: `http://localhost:8080/docs`. Para probar endpoints protegidos: `POST /sesiones` → copia `tokenAcceso` → botón **Authorize**.
- **Contrato**: `docs/openapi.yaml` (OpenAPI 3.1), también servido en `http://localhost:8080/docs/openapi.yaml`.

El contrato es la fuente de verdad: las pruebas lo leen para comprobar que cada operación protegida exige token.

## Autenticación

1. `POST /api/v1/usuarios` registra una cuenta de banda o de foro.
2. `POST /api/v1/sesiones` con correo y contraseña regresa un `tokenAcceso` (JWT RS256, válido 60 minutos).
3. Cada petición protegida lleva el encabezado `Authorization: Bearer <tokenAcceso>`.

Identidad firma los tokens con la llave **privada**; los demás servicios los verifican con la **pública**. Ningún otro servicio puede emitir tokens, y cada servicio verifica el token aunque la petición venga del Gateway: entrar directo al puerto de un servicio no salta la seguridad.

Hay dos niveles de autorización:

- **Por rol**: cada operación indica quién puede hacerla (solo un foro publica franjas, solo una banda solicita, solo el administrador suspende cuentas).
- **Por dueño**: aun con el rol correcto, solo modificas lo tuyo (tu perfil, tus franjas, las solicitudes donde participas).

## Seguridad

| Control | Cómo se cumple | Evidencia |
|---|---|---|
| Sin contraseñas en texto plano | bcrypt con costo 10 (RNF-01; `BCRYPT_COSTO`). Las pruebas usan 4 solo para ser rápidas. La respuesta nunca incluye el hash | Prueba que revisa todos los hashes de la base |
| Sin secretos reales en el repositorio | `.env`, `llaves/` y `*.pem` están en `.gitignore` y `.dockerignore`. Las llaves se generan con `npm run configurar`. Las contraseñas de los usuarios de la base se leen de variables (`SVC_*_PASSWORD`); `dev_*` es solo el valor de desarrollo | `git ls-files` no tiene `.pem` ni `.env`; las imágenes no contienen llaves |
| Endpoints protegidos verifican autenticación | Middleware `autenticar` en cada servicio: firma RS256, emisor, audiencia y vencimiento | Barrido de 401 sobre todas las operaciones del contrato |
| Endpoints sensibles verifican autorización | `requerirRol` por operación y `exigirDueno` por recurso | Pruebas de 403: editar el perfil, el rider o la franja de otro |
| Entradas validadas | Zod en params, query y body; campos desconocidos rechazados (`CAMPO_NO_PERMITIDO`); caracteres de control rechazados (`CARACTER_NO_PERMITIDO`); SQL siempre parametrizado | Tablas de casos 422 y 400; filtros con comillas y `' OR 1=1` |
| Los errores no exponen detalles internos | Un 500 responde un mensaje genérico; el detalle (con la pila) solo va al registro, con el `correlationId` para encontrarlo | Prueba que fuerza un error de base y revisa que no salga SQL ni la pila |
| CORS apropiado | Solo el Gateway responde CORS, con una lista explícita de orígenes (`CORS_ORIGENES`); sin `*` | Preflight de un origen permitido vs. uno no permitido |
| La API rechaza operaciones imposibles | Máquina de estados de solicitudes, franjas traslapadas, fechas pasadas o imposibles, autosuspensión del admin, solicitudes duplicadas | Matriz completa de transiciones; 10 franjas traslapadas simultáneas → 1 creada |
| Otros | Límite de 5 intentos fallidos de sesión por minuto (429); encabezados de seguridad con Helmet (CSP, `nosniff`, `frame-ancestors 'none'`); contenedores sin root; solo el puerto del Gateway expuesto | Pruebas de 429 y de encabezados |

## Despliegue

`docker compose --profile completo up -d --build --wait` construye una imagen por servicio con el mismo `Dockerfile` y los levanta en orden: PostgreSQL → Identidad y Perfiles → Booking → Gateway. Cada uno espera a que el anterior responda su `/salud`.

Decisiones:

- **Dos etapas en el Dockerfile.** La primera compila; la segunda solo tiene JavaScript compilado y dependencias de producción. Sin código fuente, sin TypeScript, sin pruebas, sin `.env`.
- **Las llaves se montan como *secrets*** de Compose (`/run/secrets/...`), nunca dentro de la imagen. Solo Identidad recibe la privada.
- **Solo el Gateway publica un puerto.** Identidad, Perfiles y Booking están en la red interna de Compose; desde fuera no se llega a ellos.
- **Los servicios corren como el usuario `node`** (uid 1000), no como root.

### Para un despliegue real

1. En `.env` define contraseñas propias: `POSTGRES_PASSWORD` y las cuatro `SVC_*_PASSWORD` (ver `.env.example`). Hazlo **antes** del primer arranque: los usuarios de la base se crean con esos valores cuando el volumen está vacío.
2. Define `CORS_ORIGENES` con el origen real del cliente.
3. Genera llaves nuevas (`npm run configurar` en una carpeta limpia) y no las compartas.
4. Quita los datos de prueba: `db/init/` incluye cuentas de demostración con una contraseña pública.
5. Pon un proxy con HTTPS (Caddy, Nginx o el balanceador del proveedor) delante del puerto 8080. El Gateway no termina TLS.

### Comandos útiles

```bash
docker compose --profile completo ps            # estado y salud de cada contenedor
docker compose --profile completo logs -f booking
docker compose --profile completo down          # detener (conserva los datos)
docker compose --profile completo down -v       # detener y borrar la base
```

## Endpoints

Base: `http://localhost:8080/api/v1`. Detalle completo en `/docs`.

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
| 400 | `SOLICITUD_MAL_FORMADA`, `PARAMETRO_INVALIDO` | JSON o URL que no se puede interpretar, cuerpo de más de 100 KB; id que no es UUID, fecha pasada, rango demasiado grande |
| 401 | `TOKEN_INVALIDO`, `TOKEN_EXPIRADO`, `CREDENCIALES_INVALIDAS` | Sin token, token alterado o vencido, correo o contraseña incorrectos |
| 403 | `PERMISO_INSUFICIENTE`, `CUENTA_SUSPENDIDA`, `AUTOSUSPENSION_NO_PERMITIDA` | Rol incorrecto, no eres el dueño, cuenta suspendida |
| 404 | `RECURSO_NO_ENCONTRADO` | No existe, se dio de baja, se retiró, o la ruta no existe |
| 409 | `CORREO_YA_REGISTRADO`, `PERFIL_YA_EXISTE`, `PERFIL_REQUERIDO`, `FRANJA_TRASLAPADA`, `FRANJA_NO_DISPONIBLE`, `FRANJA_CON_SOLICITUDES`, `SOLICITUD_DUPLICADA`, `TRANSICION_NO_PERMITIDA` | La petición es válida, pero choca con el estado actual |
| 422 | `VALIDACION_FALLIDA` | Campos inválidos (con `errores[]`, cada uno con su `codigo`: `REQUERIDO`, `CAMPO_NO_PERMITIDO`, `CARACTER_NO_PERMITIDO`, ...) |
| 429 | `LIMITE_EXCEDIDO` | Demasiados intentos fallidos de inicio de sesión (con `Retry-After`) |
| 500 | `ERROR_INTERNO` | Error no previsto; el detalle va al registro, nunca al cliente |
| 503 | `SERVICIO_NO_DISPONIBLE` | Una base o un servicio no responde (con `Retry-After`) |

Cada respuesta lleva `X-Correlation-Id`. El Gateway lo reenvía a los servicios, y Booking lo reenvía a Perfiles: con ese id se sigue una misma petición en el registro de los cuatro servicios (RNF-11).

## Pendientes conocidos

- **Servicio de Notificaciones**: Booking ya escribe los eventos en su outbox; falta el servicio que los consuma.

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `CREDENCIALES_INVALIDAS` con las cuentas de prueba | La base es de una entrega anterior: `docker compose down -v && docker compose up -d --wait` |
| `No se encontró la llave pública...` al arrancar | Falta `npm run configurar` en la raíz |
| `No hay permiso para leer la llave privada` en el contenedor de Identidad | El contenedor corre con uid 1000 y tu llave es de otro usuario. **Solo en desarrollo**: `chmod 644 llaves/jwt-privada.pem` |
| `Configuración inválida` al arrancar un servicio | Falta su `.env`: `npm run configurar` lo crea |
| `Cannot find module '@backline/comun'` | Corriste `npm install` dentro de un servicio; córrelo en la raíz |
| `/salud` del Gateway responde 503 | Uno de los servicios no arrancó: el mensaje dice cuál; revisa su registro |
| `EADDRINUSE` en el 8080 | Tienes `npm run dev` y `--profile completo` a la vez; detén uno. O cambia `GATEWAY_PORT` en `.env` |
| Las pruebas de Booking fallan con `Perfiles no respondió en el puerto 43202` | Otro proceso usa ese puerto o la máquina está saturada (por ejemplo, con la prueba de carga corriendo); vuelve a correrlas |
| `password authentication failed for user "svc_..."` | Cambiaste `SVC_*_PASSWORD` después de crear el volumen: `docker compose down -v` |
| `permission denied ... docker.sock` | Usa `sudo` o agrega tu usuario al grupo docker: `sudo usermod -aG docker $USER` y vuelve a iniciar sesión |
