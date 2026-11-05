-- =====================================================================
-- Backline · 13 · Esquema de backline_notificaciones (servicio Notificaciones)
-- =====================================================================
\connect backline_notificaciones

BEGIN;

CREATE TYPE canal_notificacion AS ENUM ('correo', 'app');

CREATE FUNCTION fijar_actualizado_en() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;

-- Copia local del correo de cada usuario, llenada con el evento UsuarioRegistrado
CREATE TABLE contacto (
    usuario_id      UUID          PRIMARY KEY,           -- = usuario.id en backline_identidad
    correo          VARCHAR(254)  NOT NULL,
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE TRIGGER tg_contacto_actualizado BEFORE UPDATE ON contacto
    FOR EACH ROW EXECUTE FUNCTION fijar_actualizado_en();

CREATE TABLE notificacion (
    id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID                NOT NULL REFERENCES contacto (usuario_id),
    evento_id     UUID                NOT NULL,          -- evento que la originó
    tipo          VARCHAR(60)         NOT NULL,
    mensaje       VARCHAR(300)        NOT NULL,
    solicitud_id  UUID,                                  -- para abrir el detalle desde la app
    canal         canal_notificacion  NOT NULL,
    leida         BOOLEAN             NOT NULL DEFAULT FALSE,
    enviada_en    TIMESTAMPTZ,                           -- solo canal correo
    creado_en     TIMESTAMPTZ         NOT NULL DEFAULT now(),
    -- RabbitMQ puede entregar un evento dos veces: esto evita avisos duplicados
    CONSTRAINT uq_notificacion_evento UNIQUE (evento_id, usuario_id, canal),
    -- leida solo aplica a la app; enviada_en solo al correo
    CONSTRAINT ck_notificacion_canal CHECK (
           (canal = 'app'    AND enviada_en IS NULL)
        OR (canal = 'correo' AND leida = FALSE)
    )
);
CREATE INDEX ix_notificacion_bandeja ON notificacion (usuario_id, creado_en DESC) WHERE canal = 'app';

GRANT USAGE ON SCHEMA public TO svc_notificaciones;
GRANT SELECT, INSERT, UPDATE ON contacto, notificacion TO svc_notificaciones;

COMMIT;
