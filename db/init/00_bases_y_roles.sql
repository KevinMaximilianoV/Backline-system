-- =====================================================================
-- Backline · 00 · Bases de datos y roles
-- Se ejecuta como superusuario. Borra y vuelve a crear todo, así que el
-- conjunto de scripts se puede correr desde cero cuantas veces se quiera.
--
-- Contraseñas de los usuarios de cada servicio: se leen de variables de entorno
-- (SVC_IDENTIDAD_PASSWORD, ...) con \getenv. Si una variable no existe se usa el
-- valor de desarrollo dev_<servicio>; en cualquier despliegue real se definen en .env.
-- =====================================================================

-- Bases de datos: una por microservicio
DROP DATABASE IF EXISTS backline_identidad      WITH (FORCE);
DROP DATABASE IF EXISTS backline_perfiles       WITH (FORCE);
DROP DATABASE IF EXISTS backline_booking        WITH (FORCE);
DROP DATABASE IF EXISTS backline_notificaciones WITH (FORCE);

-- Roles: cada servicio se conecta con su propio usuario
DROP ROLE IF EXISTS svc_identidad;
DROP ROLE IF EXISTS svc_perfiles;
DROP ROLE IF EXISTS svc_booking;
DROP ROLE IF EXISTS svc_notificaciones;

\getenv clave_identidad      SVC_IDENTIDAD_PASSWORD
\getenv clave_perfiles       SVC_PERFILES_PASSWORD
\getenv clave_booking        SVC_BOOKING_PASSWORD
\getenv clave_notificaciones SVC_NOTIFICACIONES_PASSWORD
\if :{?clave_identidad}      \else \set clave_identidad      dev_identidad      \endif
\if :{?clave_perfiles}       \else \set clave_perfiles       dev_perfiles       \endif
\if :{?clave_booking}        \else \set clave_booking        dev_booking        \endif
\if :{?clave_notificaciones} \else \set clave_notificaciones dev_notificaciones \endif

CREATE ROLE svc_identidad      LOGIN PASSWORD :'clave_identidad';
CREATE ROLE svc_perfiles       LOGIN PASSWORD :'clave_perfiles';
CREATE ROLE svc_booking        LOGIN PASSWORD :'clave_booking';
CREATE ROLE svc_notificaciones LOGIN PASSWORD :'clave_notificaciones';

CREATE DATABASE backline_identidad      ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE backline_perfiles       ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE backline_booking        ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE backline_notificaciones ENCODING 'UTF8' TEMPLATE template0;

-- Aislamiento: ningún rol puede conectarse a una base que no es la suya
REVOKE CONNECT ON DATABASE backline_identidad      FROM PUBLIC;
REVOKE CONNECT ON DATABASE backline_perfiles       FROM PUBLIC;
REVOKE CONNECT ON DATABASE backline_booking        FROM PUBLIC;
REVOKE CONNECT ON DATABASE backline_notificaciones FROM PUBLIC;

GRANT CONNECT ON DATABASE backline_identidad      TO svc_identidad;
GRANT CONNECT ON DATABASE backline_perfiles       TO svc_perfiles;
GRANT CONNECT ON DATABASE backline_booking        TO svc_booking;
GRANT CONNECT ON DATABASE backline_notificaciones TO svc_notificaciones;
