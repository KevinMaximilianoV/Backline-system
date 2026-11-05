-- =====================================================================
-- Backline · 11 · Esquema de backline_perfiles (servicio Perfiles)
-- =====================================================================
\connect backline_perfiles

BEGIN;

CREATE TYPE categoria_equipo AS ENUM ('sonido', 'microfonia', 'instrumentos', 'energia');

CREATE FUNCTION fijar_actualizado_en() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------- catálogos
CREATE TABLE genero (
    id      SMALLINT     PRIMARY KEY,
    nombre  VARCHAR(40)  NOT NULL UNIQUE
);

CREATE TABLE tipo_equipo (
    id         SMALLINT          PRIMARY KEY,
    nombre     VARCHAR(60)       NOT NULL UNIQUE,
    categoria  categoria_equipo  NOT NULL
);

-- ---------------------------------------------------------------- bandas
-- El id de la banda es el mismo id del usuario dueño (relación 1 a 1 con Identidad)
CREATE TABLE banda (
    id              UUID          PRIMARY KEY,           -- = usuario.id en backline_identidad
    nombre          VARCHAR(80)   COLLATE "es-x-icu" NOT NULL CHECK (char_length(btrim(nombre)) >= 2), -- orden alfabético en español
    integrantes     SMALLINT      NOT NULL CHECK (integrantes BETWEEN 1 AND 20),
    enlace_demo     VARCHAR(300)  CHECK (enlace_demo ~ '^https?://'),
    descripcion     VARCHAR(500),
    visible         BOOLEAN       NOT NULL DEFAULT TRUE, -- FALSE mientras la cuenta está suspendida
    dado_de_baja_en TIMESTAMPTZ,                         -- baja lógica: la banda se disolvió (Entrega 5)
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
-- Perfiles activos: visibles y sin baja; es el filtro de casi todas las consultas
CREATE INDEX ix_banda_activas ON banda (nombre) WHERE visible AND dado_de_baja_en IS NULL;
CREATE TRIGGER tg_banda_actualizado BEFORE UPDATE ON banda
    FOR EACH ROW EXECUTE FUNCTION fijar_actualizado_en();

CREATE TABLE banda_genero (
    banda_id   UUID      NOT NULL REFERENCES banda (id) ON DELETE CASCADE,
    genero_id  SMALLINT  NOT NULL REFERENCES genero (id),
    PRIMARY KEY (banda_id, genero_id)
);
CREATE INDEX ix_banda_genero_genero ON banda_genero (genero_id);

-- El rider de una banda es el conjunto de sus filas en esta tabla
CREATE TABLE rider_requisito (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    banda_id        UUID          NOT NULL REFERENCES banda (id) ON DELETE CASCADE,
    tipo_equipo_id  SMALLINT      NOT NULL REFERENCES tipo_equipo (id),
    cantidad        SMALLINT      NOT NULL CHECK (cantidad BETWEEN 1 AND 10),
    notas           VARCHAR(120),
    CONSTRAINT uq_rider_banda_equipo UNIQUE (banda_id, tipo_equipo_id)
);

-- ---------------------------------------------------------------- foros
-- El id del foro es el mismo id del usuario dueño
CREATE TABLE foro (
    id              UUID          PRIMARY KEY,           -- = usuario.id en backline_identidad
    nombre          VARCHAR(80)   COLLATE "es-x-icu" NOT NULL CHECK (char_length(btrim(nombre)) >= 2), -- orden alfabético en español
    direccion       VARCHAR(200)  NOT NULL CHECK (char_length(btrim(direccion)) > 0),
    capacidad       INTEGER       NOT NULL CHECK (capacidad BETWEEN 10 AND 5000),
    descripcion     VARCHAR(500),
    visible         BOOLEAN       NOT NULL DEFAULT TRUE,
    dado_de_baja_en TIMESTAMPTZ,                         -- baja lógica: el foro cerró (Entrega 5)
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_foro_activos ON foro (nombre) WHERE visible AND dado_de_baja_en IS NULL;
CREATE TRIGGER tg_foro_actualizado BEFORE UPDATE ON foro
    FOR EACH ROW EXECUTE FUNCTION fijar_actualizado_en();

CREATE TABLE foro_genero (
    foro_id    UUID      NOT NULL REFERENCES foro (id) ON DELETE CASCADE,
    genero_id  SMALLINT  NOT NULL REFERENCES genero (id),
    PRIMARY KEY (foro_id, genero_id)
);
CREATE INDEX ix_foro_genero_genero ON foro_genero (genero_id);

CREATE TABLE inventario_item (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    foro_id         UUID          NOT NULL REFERENCES foro (id) ON DELETE CASCADE,
    tipo_equipo_id  SMALLINT      NOT NULL REFERENCES tipo_equipo (id),
    cantidad        SMALLINT      NOT NULL CHECK (cantidad BETWEEN 1 AND 50),
    notas           VARCHAR(120),
    CONSTRAINT uq_inventario_foro_equipo UNIQUE (foro_id, tipo_equipo_id)
);

-- ---------------------------------------------------------------- catálogos iniciales
-- Son parte del esquema (no datos de prueba): el sistema no funciona sin ellos.
INSERT INTO genero (id, nombre) VALUES
    (1, 'Rock'), (2, 'Metal'), (3, 'Punk'), (4, 'Indie'), (5, 'Pop'), (6, 'Electrónica'),
    (7, 'Hip hop'), (8, 'Jazz'), (9, 'Blues'), (10, 'Ska'), (11, 'Reggae'), (12, 'Folk');

INSERT INTO tipo_equipo (id, nombre, categoria) VALUES
    (1,  'Sistema de PA',                  'sonido'),
    (2,  'Mezcladora',                     'sonido'),
    (3,  'Monitor de piso',                'sonido'),
    (4,  'Monitor in-ear',                 'sonido'),
    (5,  'Entrada de línea (caja DI)',     'sonido'),
    (6,  'Micrófono vocal',                'microfonia'),
    (7,  'Micrófono para instrumento',     'microfonia'),
    (8,  'Pedestal de micrófono',          'microfonia'),
    (9,  'Batería completa',               'instrumentos'),
    (10, 'Amplificador de guitarra',       'instrumentos'),
    (11, 'Amplificador de bajo',           'instrumentos'),
    (12, 'Toma de corriente en escenario', 'energia');

-- ---------------------------------------------------------------- permisos
GRANT USAGE ON SCHEMA public TO svc_perfiles;
GRANT SELECT ON genero, tipo_equipo TO svc_perfiles;                -- catálogos de solo lectura
GRANT SELECT, INSERT, UPDATE ON banda, foro TO svc_perfiles;        -- los perfiles se dan de baja, no se borran
GRANT SELECT, INSERT, UPDATE, DELETE
    ON banda_genero, foro_genero, rider_requisito, inventario_item
    TO svc_perfiles;                                                 -- PUT del rider e inventario reemplaza filas

COMMIT;
