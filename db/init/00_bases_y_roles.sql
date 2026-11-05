-- =====================================================================
-- Backline · 00 · Bases de datos y roles
-- Se ejecuta como superusuario. Borra y vuelve a crear todo, así que el
-- conjunto de scripts se puede correr desde cero cuantas veces se quiera.
-- Las contraseñas son SOLO para desarrollo local.
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

CREATE ROLE svc_identidad      LOGIN PASSWORD 'dev_identidad';
CREATE ROLE svc_perfiles       LOGIN PASSWORD 'dev_perfiles';
CREATE ROLE svc_booking        LOGIN PASSWORD 'dev_booking';
CREATE ROLE svc_notificaciones LOGIN PASSWORD 'dev_notificaciones';

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
