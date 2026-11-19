# Defectos encontrados y corregidos

Registro de la Entrega 7 (pruebas, seguridad y despliegue) y de los defectos relevantes de entregas anteriores.
Cada defecto corregido tiene una prueba que falla si vuelve a aparecer, salvo donde se indica.

## Entrega 7

| Id | Área | Defecto | Cómo se encontró | Corrección | Estado |
|---|---|---|---|---|---|
| D1 | Seguridad | Los campos de texto aceptaban caracteres de control (NUL, escape); un NUL llegaba a PostgreSQL y terminaba en 500 | Prueba de entradas con `\u0000` | `buscarCaracterDeControl` en `validar.ts`: 422 `CARACTER_NO_PERMITIDO` en el cuerpo, 400 en parámetros y query. Los saltos de línea siguen permitidos | Corregido |
| D2 | Seguridad | Una URL mal codificada (`/bandas/%E0%A4%A`) respondía 500 | Prueba de errores | Todo error de Express con status 4xx responde 400 `SOLICITUD_MAL_FORMADA` | Corregido |
| D3 | Seguridad | El Gateway no respondía CORS: un cliente web no podía llamar a la API | Revisión del checklist | `cors` en el Gateway con lista explícita `CORS_ORIGENES` (nunca `*`) | Corregido |
| D4 | Seguridad | Las respuestas no llevaban encabezados de seguridad | Revisión del checklist | Helmet en `crearApp` con `default-src 'none'` y `frame-ancestors 'none'` | Corregido |
| D5 | Seguridad | El 404 copiaba la ruta pedida al `detail` y al `instance` sin límite de tamaño | Prueba con una ruta de 3,000 caracteres | Texto del cliente recortado a 200 caracteres | Corregido |
| D6 | Seguridad | Las contraseñas de los usuarios de cada base estaban fijas en `00_bases_y_roles.sql` | Revisión de secretos | Se leen de `SVC_*_PASSWORD` con `\getenv`; `dev_*` solo como valor de desarrollo | Corregido |
| D7 | Herramientas | `npm install` con npm 10 fallaba (`Cannot read properties of null (reading 'edgesOut')`) al agregar Vitest | Instalación | Lockfile regenerado con npm 11; verificado que `npm ci` e `npm install` funcionan con npm 10 | Corregido |
| D8 | Despliegue | `tsc` compilaba los archivos `*.test.ts` dentro de `dist/` | Construcción de la imagen | `exclude: ["src/**/*.test.ts"]` en cada `tsconfig.json` | Corregido |
| D9 | Despliegue | La imagen de Identidad fallaba con `Cannot find module 'jose'`: npm dejó `jose` 6 dentro del paquete (newman usa `jose` 4) y la imagen solo copiaba los `node_modules` de la raíz | Arranque del contenedor | El Dockerfile copia también los `node_modules` de `comun` y del servicio | Corregido (verificado al levantar el perfil `completo`) |
| D10 | Despliegue | Si la llave privada no se podía leer por permisos, el mensaje decía "no se encontró", que manda a buscar el problema equivocado | Arranque del contenedor (uid 1000) | `leerLlave` distingue `EACCES` y explica el `chmod` para desarrollo | Corregido |
| D11 | Rendimiento | p95 de creación de solicitudes en 593 ms con 50 usuarios (meta RNF-06: 500 ms) | Prueba de carga | `FOR SHARE` al crear, registro agrupado por vuelta del event loop, consulta ligera de rider e inventario: 593 → 523 ms | **Abierto** |

### D11: análisis

| Cambio | p95 de creación |
|---|---|
| Primera medición | 593 ms |
| `FOR SHARE` en lugar de `FOR UPDATE` al crear una solicitud | 581 ms |
| Registro agrupado (stdout por pipe es síncrono en Linux) | ~535 ms |
| Consulta ligera de rider e inventario en Perfiles | 523 ms |
| Referencia: sin registro de peticiones | 483 ms |

La máquina de prueba tiene 2 vCPU: los servicios (~125% de CPU), el generador de carga (~60%) y PostgreSQL (~60%)
compiten por los mismos núcleos. Siguiente paso: medir con el generador en otra máquina; si sigue arriba de 500 ms,
agregar un caché corto de riders en Booking.

## Entregas anteriores

| Entrega | Defecto | Corrección |
|---|---|---|
| 6 | Aceptar una solicitud mientras otra transacción la cancelaba podía terminar en `deadlock detected` | Orden fijo de bloqueo: primero la franja, después las solicitudes |
| 6 | Los eventos del outbox escritos en una misma transacción quedaban con la misma hora (`now()` es la hora de inicio de la transacción) | `clock_timestamp()`: los eventos quedan en el orden en que ocurrieron |
| 5 | Los nombres de bandas y foros no se ordenaban como en español | Columnas con `COLLATE "es-x-icu"` |
