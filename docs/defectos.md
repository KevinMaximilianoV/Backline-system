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
| D11 | Rendimiento | p95 de creación de solicitudes en 593 ms con 50 usuarios (meta RNF-06: 500 ms) | Prueba de carga | `FOR SHARE` al crear, registro agrupado, consulta ligera de rider e inventario, y 2 llamadas a Perfiles en lugar de 4: 593 → 341 ms | Corregido |
| D12 | Pruebas | La prueba de Postman *Token alterado (401)* pasaba sin probar nada: su script previo usaba `require("atob")`, que choca con el `atob` global del sandbox de Newman; el script fallaba, el token quedaba vacío y el 401 llegaba por **falta** de token, no por la firma inválida | Revisión del reporte de Newman (1 error de script con 0 fallas) | Script con `CryptoJS` y dos verificaciones nuevas: que el token enviado sí es el alterado y que el código es `TOKEN_INVALIDO` | Corregido |

### D11: análisis

| Cambio | p95 de creación |
|---|---|
| Primera medición | 593 ms |
| `FOR SHARE` en lugar de `FOR UPDATE` al crear una solicitud | 581 ms |
| Registro agrupado (stdout por pipe es síncrono en Linux) | ~535 ms |
| Consulta ligera de rider e inventario en Perfiles | 523 ms |
| Rider e inventario traen el nombre de su dueño: Booking hace 2 llamadas a Perfiles en lugar de 4, y no relee la solicitud después de la transacción | **341 ms** |

**Por qué el último cambio fue el que más pesó.** Con 50 usuarios sin pausa, la latencia la decide el rendimiento
(ley de Little: latencia ≈ usuarios concurrentes / peticiones por segundo). En 2 vCPU el cuello de botella es la CPU,
así que lo que importa es cuánto trabajo cuesta cada solicitud. Cada creación hacía 4 peticiones HTTP a Perfiles
(cada una con verificación del JWT, validación, consulta y serialización) para obtener 2 nombres que ya estaban en
la misma fila que el rider y el inventario. Agregar `bandaNombre` y `foroNombre` a esas respuestas (cambio compatible
del contrato, versión 1.3.1) quitó la mitad de ese trabajo: el rendimiento subió de ~135 a ~186 solicitudes por segundo.

Lo que **no** se hizo: un caché de perfiles en Booking. Habría bajado más la latencia, pero el rider y el inventario
se guardan como foto al solicitar (RF-10): un caché haría que esa foto pudiera estar desactualizada.

## Entregas anteriores

| Entrega | Defecto | Corrección |
|---|---|---|
| 6 | Aceptar una solicitud mientras otra transacción la cancelaba podía terminar en `deadlock detected` | Orden fijo de bloqueo: primero la franja, después las solicitudes |
| 6 | Los eventos del outbox escritos en una misma transacción quedaban con la misma hora (`now()` es la hora de inicio de la transacción) | `clock_timestamp()`: los eventos quedan en el orden en que ocurrieron |
| 5 | Los nombres de bandas y foros no se ordenaban como en español | Columnas con `COLLATE "es-x-icu"` |
