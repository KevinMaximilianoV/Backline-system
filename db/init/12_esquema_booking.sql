-- =====================================================================
-- Backline · 12 · Esquema de backline_booking (servicio Booking)
-- =====================================================================
\connect backline_booking

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;   -- permite combinar = y && en la restricción de traslape

CREATE TYPE estado_franja    AS ENUM ('libre', 'reservada', 'retirada');
CREATE TYPE estado_solicitud AS ENUM ('solicitada', 'aceptada', 'rechazada', 'confirmada', 'cancelada');
CREATE TYPE tipo_acuerdo     AS ENUM ('pago_fijo', 'porcentaje_taquilla', 'a_convenir');

CREATE FUNCTION fijar_actualizado_en() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------- franja
-- Borrado lógico (RF-19): una franja no se borra; pasa a 'retirada' y conserva su historial.
CREATE TABLE franja (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    foro_id      UUID           NOT NULL,                -- = foro.id en backline_perfiles
    inicio       TIMESTAMPTZ    NOT NULL,
    fin          TIMESTAMPTZ    NOT NULL,
    estado       estado_franja  NOT NULL DEFAULT 'libre',
    creado_en    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    retirada_en  TIMESTAMPTZ,
    CONSTRAINT ck_franja_duracion CHECK (fin > inicio AND fin - inicio <= INTERVAL '12 hours'),
    -- retirada_en se llena si y solo si la franja está retirada
    CONSTRAINT ck_franja_retiro   CHECK ((estado = 'retirada') = (retirada_en IS NOT NULL)),
    -- Un foro no puede tener dos franjas activas que se encimen (RF-07).
    -- Las retiradas no cuentan, así que su horario se puede volver a publicar.
    CONSTRAINT ex_franja_sin_traslape EXCLUDE USING gist
        (foro_id WITH =, tstzrange(inicio, fin) WITH &&) WHERE (estado <> 'retirada'),
    CONSTRAINT uq_franja_id_foro UNIQUE (id, foro_id)  -- destino de la llave foránea compuesta de solicitud
);
CREATE INDEX ix_franja_libres_por_inicio ON franja (inicio) WHERE estado = 'libre';
CREATE INDEX ix_franja_foro_inicio       ON franja (foro_id, inicio);

-- ---------------------------------------------------------------- solicitud
CREATE TABLE solicitud (
    id                   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    franja_id            UUID              NOT NULL,
    foro_id              UUID              NOT NULL,     -- copia controlada por la FK compuesta
    banda_id             UUID              NOT NULL,     -- = banda.id en backline_perfiles
    banda_nombre         VARCHAR(80)       NOT NULL,     -- nombres al momento de solicitar
    foro_nombre          VARCHAR(80)       NOT NULL,
    tipo_acuerdo         tipo_acuerdo      NOT NULL,
    monto_mxn            NUMERIC(10,2),
    porcentaje           SMALLINT,
    notas                VARCHAR(500),
    estado               estado_solicitud  NOT NULL DEFAULT 'solicitada',
    rider_snapshot       JSONB             NOT NULL CHECK (jsonb_typeof(rider_snapshot) = 'array'),
    inventario_snapshot  JSONB             NOT NULL CHECK (jsonb_typeof(inventario_snapshot) = 'array'),
    faltantes            JSONB             NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(faltantes) = 'array'),
    creado_en            TIMESTAMPTZ       NOT NULL DEFAULT now(),
    actualizado_en       TIMESTAMPTZ       NOT NULL DEFAULT now(),
    -- El foro de la solicitud siempre es el de su franja
    CONSTRAINT fk_solicitud_franja FOREIGN KEY (franja_id, foro_id) REFERENCES franja (id, foro_id),
    -- Las condiciones económicas son coherentes con el tipo de acuerdo.
    -- IS NOT NULL es obligatorio: NULL > 0 da desconocido y un CHECK desconocido se acepta.
    CONSTRAINT ck_solicitud_acuerdo CHECK (
           (tipo_acuerdo = 'pago_fijo'
                AND monto_mxn IS NOT NULL AND monto_mxn > 0 AND porcentaje IS NULL)
        OR (tipo_acuerdo = 'porcentaje_taquilla'
                AND porcentaje IS NOT NULL AND porcentaje BETWEEN 1 AND 100 AND monto_mxn IS NULL)
        OR (tipo_acuerdo = 'a_convenir'
                AND monto_mxn IS NULL AND porcentaje IS NULL)
    )
);
-- Una franja solo puede tener una solicitud aceptada o confirmada: impide la doble reserva (RF-12, RNF-05)
CREATE UNIQUE INDEX ux_solicitud_franja_reservada
    ON solicitud (franja_id) WHERE estado IN ('aceptada', 'confirmada');
-- Una banda no puede tener dos solicitudes activas para la misma franja
CREATE UNIQUE INDEX ux_solicitud_banda_franja_activa
    ON solicitud (franja_id, banda_id) WHERE estado IN ('solicitada', 'aceptada', 'confirmada');
CREATE INDEX ix_solicitud_banda ON solicitud (banda_id, creado_en DESC);
CREATE INDEX ix_solicitud_foro  ON solicitud (foro_id,  creado_en DESC);
CREATE TRIGGER tg_solicitud_actualizado BEFORE UPDATE ON solicitud
    FOR EACH ROW EXECUTE FUNCTION fijar_actualizado_en();

-- Una franja con solicitudes activas no se puede retirar (RF-19)
CREATE FUNCTION impedir_retiro_con_solicitudes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.estado = 'retirada' AND OLD.estado <> 'retirada' AND EXISTS (
        SELECT 1 FROM solicitud
         WHERE franja_id = NEW.id AND estado IN ('solicitada', 'aceptada', 'confirmada')
    ) THEN
        RAISE EXCEPTION 'La franja % tiene solicitudes activas y no se puede retirar', NEW.id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER tg_franja_retiro BEFORE UPDATE OF estado ON franja
    FOR EACH ROW EXECUTE FUNCTION impedir_retiro_con_solicitudes();

-- ---------------------------------------------------------------- historial
CREATE TABLE cambio_estado (
    id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id      UUID              NOT NULL REFERENCES solicitud (id),
    estado_anterior   estado_solicitud,                  -- NULL en la creación
    estado_nuevo      estado_solicitud  NOT NULL,
    autor_usuario_id  UUID,                              -- NULL cuando lo hace el sistema
    motivo            VARCHAR(300),
    creado_en         TIMESTAMPTZ       NOT NULL DEFAULT now(),
    CONSTRAINT ck_cambio_distinto        CHECK (estado_anterior IS DISTINCT FROM estado_nuevo),
    CONSTRAINT ck_cancelacion_con_motivo CHECK (estado_nuevo <> 'cancelada' OR motivo IS NOT NULL)
);
CREATE INDEX ix_cambio_estado_solicitud ON cambio_estado (solicitud_id, creado_en);

-- ---------------------------------------------------------------- outbox
CREATE TABLE evento_pendiente (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo          VARCHAR(60)  NOT NULL,   -- SolicitudCreada, SolicitudAceptada, ...
    payload       JSONB        NOT NULL,
    creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    publicado_en  TIMESTAMPTZ
);
CREATE INDEX ix_evento_sin_publicar ON evento_pendiente (creado_en) WHERE publicado_en IS NULL;

-- ---------------------------------------------------------------- permisos
GRANT USAGE ON SCHEMA public TO svc_booking;
GRANT SELECT, INSERT, UPDATE ON franja, solicitud, evento_pendiente TO svc_booking;  -- sin DELETE: borrado lógico
GRANT SELECT, INSERT ON cambio_estado TO svc_booking;                               -- el historial es inmutable

COMMIT;
