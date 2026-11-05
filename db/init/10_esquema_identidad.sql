-- =====================================================================
-- Backline · 10 · Esquema de backline_identidad (servicio Identidad)
-- =====================================================================
\connect backline_identidad

BEGIN;

CREATE TYPE rol_usuario   AS ENUM ('banda', 'foro', 'admin');
CREATE TYPE estado_cuenta AS ENUM ('activa', 'suspendida');

-- Actualiza actualizado_en en cada UPDATE, sin depender del código del servicio
CREATE FUNCTION fijar_actualizado_en() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;

CREATE TABLE usuario (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    correo           VARCHAR(254)  NOT NULL CHECK (correo LIKE '%_@_%'),
    hash_contrasena  VARCHAR(100)  NOT NULL,             -- hash bcrypt; nunca la contraseña
    rol              rol_usuario   NOT NULL,
    estado           estado_cuenta NOT NULL DEFAULT 'activa',
    creado_en        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
-- El correo es único sin importar mayúsculas (RF-01)
CREATE UNIQUE INDEX ux_usuario_correo ON usuario (lower(correo));
CREATE INDEX ix_usuario_rol_estado ON usuario (rol, estado);
CREATE TRIGGER tg_usuario_actualizado BEFORE UPDATE ON usuario
    FOR EACH ROW EXECUTE FUNCTION fijar_actualizado_en();

-- Bandeja de salida de eventos (outbox): se escribe en la misma transacción
-- que el cambio; un proceso del servicio la publica después en RabbitMQ.
CREATE TABLE evento_pendiente (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo          VARCHAR(60)  NOT NULL,   -- UsuarioRegistrado, UsuarioSuspendido, UsuarioReactivado
    payload       JSONB        NOT NULL,
    creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    publicado_en  TIMESTAMPTZ
);
CREATE INDEX ix_evento_sin_publicar ON evento_pendiente (creado_en) WHERE publicado_en IS NULL;

-- Permisos del servicio
GRANT USAGE ON SCHEMA public TO svc_identidad;
GRANT SELECT, INSERT, UPDATE ON usuario TO svc_identidad;   -- las cuentas se suspenden, no se borran
GRANT SELECT, INSERT, UPDATE ON evento_pendiente TO svc_identidad;

COMMIT;
