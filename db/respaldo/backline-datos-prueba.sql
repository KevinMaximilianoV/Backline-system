-- Respaldo de Backline (2026-11-23T06:37:08.715Z)
-- Restaurar con: npm run db:restaurar -- db/respaldo/backline-datos-prueba.sql


-- =================================================================== backline_identidad
\connect backline_identidad

--
-- PostgreSQL database dump
--

\restrict lvlCQeWwWXkDkSIY5kD7MfkSEKflMo5oOtOmrsV6ixiTVb3rdPbsbM48ra0tzIk

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP TRIGGER IF EXISTS "tg_usuario_actualizado" ON "public"."usuario";
DROP INDEX IF EXISTS "public"."ux_usuario_correo";
DROP INDEX IF EXISTS "public"."ix_usuario_rol_estado";
DROP INDEX IF EXISTS "public"."ix_evento_sin_publicar";
ALTER TABLE IF EXISTS ONLY "public"."usuario" DROP CONSTRAINT IF EXISTS "usuario_pkey";
ALTER TABLE IF EXISTS ONLY "public"."evento_pendiente" DROP CONSTRAINT IF EXISTS "evento_pendiente_pkey";
DROP TABLE IF EXISTS "public"."usuario";
DROP TABLE IF EXISTS "public"."evento_pendiente";
DROP FUNCTION IF EXISTS "public"."fijar_actualizado_en"();
DROP TYPE IF EXISTS "public"."rol_usuario";
DROP TYPE IF EXISTS "public"."estado_cuenta";
--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: estado_cuenta; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."estado_cuenta" AS ENUM (
    'activa',
    'suspendida'
);


ALTER TYPE "public"."estado_cuenta" OWNER TO "postgres";

--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."rol_usuario" AS ENUM (
    'banda',
    'foro',
    'admin'
);


ALTER TYPE "public"."rol_usuario" OWNER TO "postgres";

--
-- Name: fijar_actualizado_en(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."fijar_actualizado_en"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fijar_actualizado_en"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: evento_pendiente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."evento_pendiente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo" character varying(60) NOT NULL,
    "payload" "jsonb" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "publicado_en" timestamp with time zone
);


ALTER TABLE "public"."evento_pendiente" OWNER TO "postgres";

--
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."usuario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "correo" character varying(254) NOT NULL,
    "hash_contrasena" character varying(100) NOT NULL,
    "rol" "public"."rol_usuario" NOT NULL,
    "estado" "public"."estado_cuenta" DEFAULT 'activa'::"public"."estado_cuenta" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "usuario_correo_check" CHECK ((("correo")::"text" ~~ '%_@_%'::"text"))
);


ALTER TABLE "public"."usuario" OWNER TO "postgres";

--
-- Data for Name: evento_pendiente; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."evento_pendiente" ("id", "tipo", "payload", "creado_en", "publicado_en") FROM stdin;
bbbb0000-0000-0000-0000-000000000001	UsuarioRegistrado	{"rol": "admin", "correo": "admin@backline.mx", "usuarioId": "33333333-3333-3333-3333-333333333333"}	2026-10-01 09:00:00-06	2026-10-01 09:00:02-06
bbbb0000-0000-0000-0000-000000000002	UsuarioRegistrado	{"rol": "banda", "correo": "desvelados@correo.com", "usuarioId": "11111111-1111-1111-1111-111111111111"}	2026-10-02 10:00:00-06	2026-10-02 10:00:02-06
bbbb0000-0000-0000-0000-000000000003	UsuarioRegistrado	{"rol": "banda", "correo": "ruidoblanco@correo.com", "usuarioId": "44444444-4444-4444-4444-444444444444"}	2026-10-02 11:00:00-06	2026-10-02 11:00:02-06
bbbb0000-0000-0000-0000-000000000004	UsuarioRegistrado	{"rol": "banda", "correo": "marealenta@correo.com", "usuarioId": "55555555-5555-5555-5555-555555555555"}	2026-10-02 12:00:00-06	2026-10-02 12:00:02-06
bbbb0000-0000-0000-0000-000000000005	UsuarioRegistrado	{"rol": "banda", "correo": "cuartooscuro@correo.com", "usuarioId": "66666666-6666-6666-6666-666666666666"}	2026-10-02 13:00:00-06	2026-10-02 13:00:02-06
bbbb0000-0000-0000-0000-000000000006	UsuarioRegistrado	{"rol": "banda", "correo": "sintoniasur@correo.com", "usuarioId": "77777777-7777-7777-7777-777777777777"}	2026-10-02 14:00:00-06	2026-10-02 14:00:02-06
bbbb0000-0000-0000-0000-000000000007	UsuarioRegistrado	{"rol": "banda", "correo": "ecopolar@correo.com", "usuarioId": "88888888-8888-8888-8888-888888888888"}	2026-10-02 15:00:00-06	2026-10-02 15:00:02-06
bbbb0000-0000-0000-0000-000000000008	UsuarioRegistrado	{"rol": "foro", "correo": "labodega@correo.com", "usuarioId": "22222222-2222-2222-2222-222222222222"}	2026-10-03 10:00:00-06	2026-10-03 10:00:02-06
bbbb0000-0000-0000-0000-000000000009	UsuarioRegistrado	{"rol": "foro", "correo": "elsotano@correo.com", "usuarioId": "99999999-9999-9999-9999-999999999999"}	2026-10-03 11:00:00-06	2026-10-03 11:00:02-06
bbbb0000-0000-0000-0000-000000000010	UsuarioRegistrado	{"rol": "foro", "correo": "arenanorte@correo.com", "usuarioId": "dddddddd-dddd-dddd-dddd-dddddddddddd"}	2026-10-03 12:00:00-06	2026-10-03 12:00:02-06
bbbb0000-0000-0000-0000-000000000011	UsuarioSuspendido	{"usuarioId": "88888888-8888-8888-8888-888888888888"}	2026-10-25 16:00:00-06	2026-10-25 16:00:02-06
\.


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."usuario" ("id", "correo", "hash_contrasena", "rol", "estado", "creado_en", "actualizado_en") FROM stdin;
33333333-3333-3333-3333-333333333333	admin@backline.mx	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	admin	activa	2026-10-01 09:00:00-06	2026-10-01 09:00:00-06
11111111-1111-1111-1111-111111111111	desvelados@correo.com	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	banda	activa	2026-10-02 10:00:00-06	2026-10-02 10:00:00-06
44444444-4444-4444-4444-444444444444	ruidoblanco@correo.com	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	banda	activa	2026-10-02 11:00:00-06	2026-10-02 11:00:00-06
55555555-5555-5555-5555-555555555555	marealenta@correo.com	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	banda	activa	2026-10-02 12:00:00-06	2026-10-02 12:00:00-06
66666666-6666-6666-6666-666666666666	cuartooscuro@correo.com	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	banda	activa	2026-10-02 13:00:00-06	2026-10-02 13:00:00-06
77777777-7777-7777-7777-777777777777	sintoniasur@correo.com	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	banda	activa	2026-10-02 14:00:00-06	2026-10-02 14:00:00-06
88888888-8888-8888-8888-888888888888	ecopolar@correo.com	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	banda	suspendida	2026-10-02 15:00:00-06	2026-10-02 15:00:00-06
22222222-2222-2222-2222-222222222222	labodega@correo.com	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	foro	activa	2026-10-03 10:00:00-06	2026-10-03 10:00:00-06
99999999-9999-9999-9999-999999999999	elsotano@correo.com	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	foro	activa	2026-10-03 11:00:00-06	2026-10-03 11:00:00-06
dddddddd-dddd-dddd-dddd-dddddddddddd	arenanorte@correo.com	$2b$10$eYNrLwVymWwX7rwktG.hSOK7WzpANxyNcMhzJwHOF8PQrtaTCip0u	foro	activa	2026-10-03 12:00:00-06	2026-10-03 12:00:00-06
\.


--
-- Name: evento_pendiente evento_pendiente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."evento_pendiente"
    ADD CONSTRAINT "evento_pendiente_pkey" PRIMARY KEY ("id");


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."usuario"
    ADD CONSTRAINT "usuario_pkey" PRIMARY KEY ("id");


--
-- Name: ix_evento_sin_publicar; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_evento_sin_publicar" ON "public"."evento_pendiente" USING "btree" ("creado_en") WHERE ("publicado_en" IS NULL);


--
-- Name: ix_usuario_rol_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_usuario_rol_estado" ON "public"."usuario" USING "btree" ("rol", "estado");


--
-- Name: ux_usuario_correo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ux_usuario_correo" ON "public"."usuario" USING "btree" ("lower"(("correo")::"text"));


--
-- Name: usuario tg_usuario_actualizado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "tg_usuario_actualizado" BEFORE UPDATE ON "public"."usuario" FOR EACH ROW EXECUTE FUNCTION "public"."fijar_actualizado_en"();


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "svc_identidad";


--
-- Name: TABLE "evento_pendiente"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE "public"."evento_pendiente" TO "svc_identidad";


--
-- Name: TABLE "usuario"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE "public"."usuario" TO "svc_identidad";


--
-- PostgreSQL database dump complete
--

\unrestrict lvlCQeWwWXkDkSIY5kD7MfkSEKflMo5oOtOmrsV6ixiTVb3rdPbsbM48ra0tzIk


-- =================================================================== backline_perfiles
\connect backline_perfiles

--
-- PostgreSQL database dump
--

\restrict SyWFP6pJRpDtfuCBYpGAvrqeUU4hKIaBFkaGNWriQgiCkFfogg1gP45lDrFotqr

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY "public"."rider_requisito" DROP CONSTRAINT IF EXISTS "rider_requisito_tipo_equipo_id_fkey";
ALTER TABLE IF EXISTS ONLY "public"."rider_requisito" DROP CONSTRAINT IF EXISTS "rider_requisito_banda_id_fkey";
ALTER TABLE IF EXISTS ONLY "public"."inventario_item" DROP CONSTRAINT IF EXISTS "inventario_item_tipo_equipo_id_fkey";
ALTER TABLE IF EXISTS ONLY "public"."inventario_item" DROP CONSTRAINT IF EXISTS "inventario_item_foro_id_fkey";
ALTER TABLE IF EXISTS ONLY "public"."foro_genero" DROP CONSTRAINT IF EXISTS "foro_genero_genero_id_fkey";
ALTER TABLE IF EXISTS ONLY "public"."foro_genero" DROP CONSTRAINT IF EXISTS "foro_genero_foro_id_fkey";
ALTER TABLE IF EXISTS ONLY "public"."banda_genero" DROP CONSTRAINT IF EXISTS "banda_genero_genero_id_fkey";
ALTER TABLE IF EXISTS ONLY "public"."banda_genero" DROP CONSTRAINT IF EXISTS "banda_genero_banda_id_fkey";
DROP TRIGGER IF EXISTS "tg_foro_actualizado" ON "public"."foro";
DROP TRIGGER IF EXISTS "tg_banda_actualizado" ON "public"."banda";
DROP INDEX IF EXISTS "public"."ix_foro_genero_genero";
DROP INDEX IF EXISTS "public"."ix_foro_activos";
DROP INDEX IF EXISTS "public"."ix_banda_genero_genero";
DROP INDEX IF EXISTS "public"."ix_banda_activas";
ALTER TABLE IF EXISTS ONLY "public"."rider_requisito" DROP CONSTRAINT IF EXISTS "uq_rider_banda_equipo";
ALTER TABLE IF EXISTS ONLY "public"."inventario_item" DROP CONSTRAINT IF EXISTS "uq_inventario_foro_equipo";
ALTER TABLE IF EXISTS ONLY "public"."tipo_equipo" DROP CONSTRAINT IF EXISTS "tipo_equipo_pkey";
ALTER TABLE IF EXISTS ONLY "public"."tipo_equipo" DROP CONSTRAINT IF EXISTS "tipo_equipo_nombre_key";
ALTER TABLE IF EXISTS ONLY "public"."rider_requisito" DROP CONSTRAINT IF EXISTS "rider_requisito_pkey";
ALTER TABLE IF EXISTS ONLY "public"."inventario_item" DROP CONSTRAINT IF EXISTS "inventario_item_pkey";
ALTER TABLE IF EXISTS ONLY "public"."genero" DROP CONSTRAINT IF EXISTS "genero_pkey";
ALTER TABLE IF EXISTS ONLY "public"."genero" DROP CONSTRAINT IF EXISTS "genero_nombre_key";
ALTER TABLE IF EXISTS ONLY "public"."foro" DROP CONSTRAINT IF EXISTS "foro_pkey";
ALTER TABLE IF EXISTS ONLY "public"."foro_genero" DROP CONSTRAINT IF EXISTS "foro_genero_pkey";
ALTER TABLE IF EXISTS ONLY "public"."banda" DROP CONSTRAINT IF EXISTS "banda_pkey";
ALTER TABLE IF EXISTS ONLY "public"."banda_genero" DROP CONSTRAINT IF EXISTS "banda_genero_pkey";
DROP TABLE IF EXISTS "public"."tipo_equipo";
DROP TABLE IF EXISTS "public"."rider_requisito";
DROP TABLE IF EXISTS "public"."inventario_item";
DROP TABLE IF EXISTS "public"."genero";
DROP TABLE IF EXISTS "public"."foro_genero";
DROP TABLE IF EXISTS "public"."foro";
DROP TABLE IF EXISTS "public"."banda_genero";
DROP TABLE IF EXISTS "public"."banda";
DROP FUNCTION IF EXISTS "public"."fijar_actualizado_en"();
DROP TYPE IF EXISTS "public"."categoria_equipo";
--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: categoria_equipo; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."categoria_equipo" AS ENUM (
    'sonido',
    'microfonia',
    'instrumentos',
    'energia'
);


ALTER TYPE "public"."categoria_equipo" OWNER TO "postgres";

--
-- Name: fijar_actualizado_en(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."fijar_actualizado_en"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fijar_actualizado_en"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: banda; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."banda" (
    "id" "uuid" NOT NULL,
    "nombre" character varying(80) NOT NULL COLLATE "pg_catalog"."es-x-icu",
    "integrantes" smallint NOT NULL,
    "enlace_demo" character varying(300),
    "descripcion" character varying(500),
    "visible" boolean DEFAULT true NOT NULL,
    "dado_de_baja_en" timestamp with time zone,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "banda_enlace_demo_check" CHECK ((("enlace_demo")::"text" ~ '^https?://'::"text")),
    CONSTRAINT "banda_integrantes_check" CHECK ((("integrantes" >= 1) AND ("integrantes" <= 20))),
    CONSTRAINT "banda_nombre_check" CHECK (("char_length"("btrim"(("nombre")::"text")) >= 2))
);


ALTER TABLE "public"."banda" OWNER TO "postgres";

--
-- Name: banda_genero; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."banda_genero" (
    "banda_id" "uuid" NOT NULL,
    "genero_id" smallint NOT NULL
);


ALTER TABLE "public"."banda_genero" OWNER TO "postgres";

--
-- Name: foro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."foro" (
    "id" "uuid" NOT NULL,
    "nombre" character varying(80) NOT NULL COLLATE "pg_catalog"."es-x-icu",
    "direccion" character varying(200) NOT NULL,
    "capacidad" integer NOT NULL,
    "descripcion" character varying(500),
    "visible" boolean DEFAULT true NOT NULL,
    "dado_de_baja_en" timestamp with time zone,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "foro_capacidad_check" CHECK ((("capacidad" >= 10) AND ("capacidad" <= 5000))),
    CONSTRAINT "foro_direccion_check" CHECK (("char_length"("btrim"(("direccion")::"text")) > 0)),
    CONSTRAINT "foro_nombre_check" CHECK (("char_length"("btrim"(("nombre")::"text")) >= 2))
);


ALTER TABLE "public"."foro" OWNER TO "postgres";

--
-- Name: foro_genero; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."foro_genero" (
    "foro_id" "uuid" NOT NULL,
    "genero_id" smallint NOT NULL
);


ALTER TABLE "public"."foro_genero" OWNER TO "postgres";

--
-- Name: genero; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."genero" (
    "id" smallint NOT NULL,
    "nombre" character varying(40) NOT NULL
);


ALTER TABLE "public"."genero" OWNER TO "postgres";

--
-- Name: inventario_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."inventario_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "foro_id" "uuid" NOT NULL,
    "tipo_equipo_id" smallint NOT NULL,
    "cantidad" smallint NOT NULL,
    "notas" character varying(120),
    CONSTRAINT "inventario_item_cantidad_check" CHECK ((("cantidad" >= 1) AND ("cantidad" <= 50)))
);


ALTER TABLE "public"."inventario_item" OWNER TO "postgres";

--
-- Name: rider_requisito; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."rider_requisito" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "banda_id" "uuid" NOT NULL,
    "tipo_equipo_id" smallint NOT NULL,
    "cantidad" smallint NOT NULL,
    "notas" character varying(120),
    CONSTRAINT "rider_requisito_cantidad_check" CHECK ((("cantidad" >= 1) AND ("cantidad" <= 10)))
);


ALTER TABLE "public"."rider_requisito" OWNER TO "postgres";

--
-- Name: tipo_equipo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."tipo_equipo" (
    "id" smallint NOT NULL,
    "nombre" character varying(60) NOT NULL,
    "categoria" "public"."categoria_equipo" NOT NULL
);


ALTER TABLE "public"."tipo_equipo" OWNER TO "postgres";

--
-- Data for Name: banda; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."banda" ("id", "nombre", "integrantes", "enlace_demo", "descripcion", "visible", "dado_de_baja_en", "creado_en", "actualizado_en") FROM stdin;
11111111-1111-1111-1111-111111111111	Los Desvelados	3	https://ejemplo.com/desvelados	Trío de metal; guitarra y bajo con simuladores de amplificador.	t	\N	2026-10-02 12:00:00-06	2026-10-02 12:00:00-06
44444444-4444-4444-4444-444444444444	Ruido Blanco	4	\N	Punk rápido y corto.	t	\N	2026-10-02 12:00:00-06	2026-10-02 12:00:00-06
55555555-5555-5555-5555-555555555555	Marea Lenta	4	https://ejemplo.com/marealenta	Indie acústico.	t	\N	2026-10-02 12:00:00-06	2026-10-02 12:00:00-06
66666666-6666-6666-6666-666666666666	Cuarto Oscuro	4	https://ejemplo.com/cuartooscuro	Rock y blues de los setenta.	t	\N	2026-10-02 12:00:00-06	2026-10-02 12:00:00-06
77777777-7777-7777-7777-777777777777	Sintonía Sur	6	\N	Ska con sección de metales.	t	\N	2026-10-02 12:00:00-06	2026-10-02 12:00:00-06
88888888-8888-8888-8888-888888888888	Eco Polar	2	https://ejemplo.com/ecopolar	Dúo de electrónica en vivo.	f	\N	2026-10-02 12:00:00-06	2026-10-02 12:00:00-06
\.


--
-- Data for Name: banda_genero; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."banda_genero" ("banda_id", "genero_id") FROM stdin;
11111111-1111-1111-1111-111111111111	2
11111111-1111-1111-1111-111111111111	1
44444444-4444-4444-4444-444444444444	3
44444444-4444-4444-4444-444444444444	1
55555555-5555-5555-5555-555555555555	4
55555555-5555-5555-5555-555555555555	12
66666666-6666-6666-6666-666666666666	1
66666666-6666-6666-6666-666666666666	9
77777777-7777-7777-7777-777777777777	10
77777777-7777-7777-7777-777777777777	11
88888888-8888-8888-8888-888888888888	6
\.


--
-- Data for Name: foro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."foro" ("id", "nombre", "direccion", "capacidad", "descripcion", "visible", "dado_de_baja_en", "creado_en", "actualizado_en") FROM stdin;
22222222-2222-2222-2222-222222222222	Foro La Bodega	Calle Ejemplo 123, Centro, Querétaro	150	Foro de rock y metal.	t	\N	2026-10-03 12:00:00-06	2026-10-03 12:00:00-06
99999999-9999-9999-9999-999999999999	El Sótano Café	Avenida Ejemplo 45, Centro, Querétaro	60	Café con escenario para formatos acústicos.	t	\N	2026-10-03 12:00:00-06	2026-10-03 12:00:00-06
dddddddd-dddd-dddd-dddd-dddddddddddd	Arena Norte	Boulevard Ejemplo 900, Juriquilla, Querétaro	400	Salón grande con equipo completo.	t	\N	2026-10-03 12:00:00-06	2026-10-03 12:00:00-06
\.


--
-- Data for Name: foro_genero; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."foro_genero" ("foro_id", "genero_id") FROM stdin;
22222222-2222-2222-2222-222222222222	1
22222222-2222-2222-2222-222222222222	2
22222222-2222-2222-2222-222222222222	3
99999999-9999-9999-9999-999999999999	4
99999999-9999-9999-9999-999999999999	12
99999999-9999-9999-9999-999999999999	8
99999999-9999-9999-9999-999999999999	9
dddddddd-dddd-dddd-dddd-dddddddddddd	1
dddddddd-dddd-dddd-dddd-dddddddddddd	10
dddddddd-dddd-dddd-dddd-dddddddddddd	5
dddddddd-dddd-dddd-dddd-dddddddddddd	6
dddddddd-dddd-dddd-dddd-dddddddddddd	11
\.


--
-- Data for Name: genero; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."genero" ("id", "nombre") FROM stdin;
1	Rock
2	Metal
3	Punk
4	Indie
5	Pop
6	Electrónica
7	Hip hop
8	Jazz
9	Blues
10	Ska
11	Reggae
12	Folk
\.


--
-- Data for Name: inventario_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inventario_item" ("id", "foro_id", "tipo_equipo_id", "cantidad", "notas") FROM stdin;
6a6aa95c-3419-483e-a437-25215ca1684d	22222222-2222-2222-2222-222222222222	1	1	\N
5d5dd844-31f2-491a-9eb6-5ceb17c535ea	22222222-2222-2222-2222-222222222222	2	1	\N
2c5c32ca-e4ef-49f1-8599-144d26e62d3c	22222222-2222-2222-2222-222222222222	3	2	\N
62b3d0ee-c92c-48ec-99d4-6007bb189ddb	22222222-2222-2222-2222-222222222222	6	3	\N
aea7288e-b043-4af0-bee2-db2b187250bb	22222222-2222-2222-2222-222222222222	9	1	\N
a19e283d-f5ae-4008-8549-975731228808	22222222-2222-2222-2222-222222222222	10	2	\N
abfc2331-cc71-481f-bf36-398b31562c6f	22222222-2222-2222-2222-222222222222	5	2	\N
b9668759-a207-47c1-b606-6c2c2d5878cf	99999999-9999-9999-9999-999999999999	1	1	\N
855b2e01-4f8b-4577-a40c-4f0f8b6ff7bd	99999999-9999-9999-9999-999999999999	2	1	\N
8f6805e2-f068-43d1-a5ff-c4b6f92764eb	99999999-9999-9999-9999-999999999999	6	2	\N
a180d166-7af9-4511-abfb-aa061c3ca7aa	99999999-9999-9999-9999-999999999999	7	2	\N
d96c68af-e544-4637-9fe5-6d3d436a3e66	99999999-9999-9999-9999-999999999999	5	2	\N
253fd347-06fb-4e51-85cb-fc1cdadd903a	99999999-9999-9999-9999-999999999999	3	1	\N
aae2fe0e-1855-4650-b638-2d116aa0056c	99999999-9999-9999-9999-999999999999	8	4	\N
fdb580f1-4884-4377-a5af-d3cc5537debc	99999999-9999-9999-9999-999999999999	12	2	\N
e4472d3a-7a78-47a5-90ef-56437a77ab08	dddddddd-dddd-dddd-dddd-dddddddddddd	1	1	\N
51a366ed-d26a-49cb-8f11-3640752c558b	dddddddd-dddd-dddd-dddd-dddddddddddd	2	1	\N
133d7aca-3000-40b9-9576-c832fd1c859f	dddddddd-dddd-dddd-dddd-dddddddddddd	3	4	\N
f8bdc7a4-4e70-43c6-9bb8-6d5972ea0a89	dddddddd-dddd-dddd-dddd-dddddddddddd	4	2	\N
4d9fe49b-9b7c-49e7-9472-af55482bd472	dddddddd-dddd-dddd-dddd-dddddddddddd	6	4	\N
800a191b-2ef7-46e3-84fa-401f85d2cadb	dddddddd-dddd-dddd-dddd-dddddddddddd	7	6	\N
964fae16-b164-4016-b584-dd807b74dc21	dddddddd-dddd-dddd-dddd-dddddddddddd	9	1	\N
c3139301-d4b7-4890-b8fa-cba7eaa80a61	dddddddd-dddd-dddd-dddd-dddddddddddd	10	2	\N
2d40287f-f612-4b67-a69b-dd544c140c07	dddddddd-dddd-dddd-dddd-dddddddddddd	11	1	\N
05115aa6-ee8c-4b34-b921-acdd55fba637	dddddddd-dddd-dddd-dddd-dddddddddddd	5	6	\N
32ca6cc8-4ae6-4abf-8dcf-e0eaff967b99	dddddddd-dddd-dddd-dddd-dddddddddddd	8	8	\N
0c7d7419-398b-4d7b-97e1-8694bd3d163a	dddddddd-dddd-dddd-dddd-dddddddddddd	12	4	\N
\.


--
-- Data for Name: rider_requisito; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."rider_requisito" ("id", "banda_id", "tipo_equipo_id", "cantidad", "notas") FROM stdin;
d76dea5c-3c98-4940-9a70-b06b7b45e4a5	11111111-1111-1111-1111-111111111111	1	1	\N
cae509e1-3618-48da-8bb1-6bdd4dadbd86	11111111-1111-1111-1111-111111111111	5	4	Guitarra y bajo con simulador, en estéreo
decd60ac-0568-4f49-9823-045ddb77400c	11111111-1111-1111-1111-111111111111	3	2	\N
ab3679c9-ab5d-4bb7-ac69-c1d02eda76a8	11111111-1111-1111-1111-111111111111	6	2	\N
8c12e829-a35c-445b-b598-fc5fa57f64fd	11111111-1111-1111-1111-111111111111	9	1	\N
6641b185-6c29-4cc7-9886-a4600b69b39f	44444444-4444-4444-4444-444444444444	1	1	\N
816ed54c-6c5c-40f2-91ad-c33434bccbd9	44444444-4444-4444-4444-444444444444	10	2	\N
be271d1c-e1bf-44c4-9695-f1d193f122ca	44444444-4444-4444-4444-444444444444	11	1	\N
2e7a4fb1-e218-49cd-958a-fc73d354f122	44444444-4444-4444-4444-444444444444	9	1	\N
530a1e8c-e817-46ae-809e-c6236b843ad9	44444444-4444-4444-4444-444444444444	6	3	\N
0ce46307-7f55-440e-bbb5-10fa6edc9e64	55555555-5555-5555-5555-555555555555	1	1	\N
cedeae4f-9752-49f7-8c34-e46ea9d0ed58	55555555-5555-5555-5555-555555555555	2	1	\N
45b432b2-5f06-4065-9d09-3480a543eb80	55555555-5555-5555-5555-555555555555	6	3	\N
76bcb004-556c-4881-bcad-40f8d917e980	55555555-5555-5555-5555-555555555555	7	2	Para guitarra acústica y violín
6dbab5a0-49ad-4dc7-9136-f2141cf02a22	55555555-5555-5555-5555-555555555555	5	2	\N
3a300097-7b66-40a0-b203-f58f96eed766	55555555-5555-5555-5555-555555555555	3	3	\N
17ca3b12-0d8f-461e-b01f-12acbe1eb34d	66666666-6666-6666-6666-666666666666	1	1	\N
03600566-83f3-4086-95b2-9a29f81701de	66666666-6666-6666-6666-666666666666	10	2	\N
4c6e7e9f-b5cf-4004-b5b6-d19951cf6563	66666666-6666-6666-6666-666666666666	11	1	\N
92e86808-1399-4cba-801b-52975c479342	66666666-6666-6666-6666-666666666666	9	1	\N
c53a59ea-551f-4259-a553-1ff868fa8089	66666666-6666-6666-6666-666666666666	6	2	\N
2115da19-792b-4c96-a151-9e8f55c2ce9a	66666666-6666-6666-6666-666666666666	3	2	\N
4dd344e0-63fa-44ad-a86e-5660c1ff3e4f	77777777-7777-7777-7777-777777777777	1	1	\N
6dc2a56f-f087-4a5f-83d0-f90957a7313e	77777777-7777-7777-7777-777777777777	2	1	\N
2a845b0b-8f24-4b6d-ac59-8426254fb42b	77777777-7777-7777-7777-777777777777	6	2	\N
509f2927-690d-4aa1-90df-fa1f530ce2a1	77777777-7777-7777-7777-777777777777	7	4	Trompeta, trombón y dos saxofones
e2c7081b-bea1-4071-8829-ef36b512fc3e	77777777-7777-7777-7777-777777777777	10	1	\N
79f9e45c-afac-4776-a513-fc1b5bb15abf	77777777-7777-7777-7777-777777777777	11	1	\N
2ee77438-e4fe-4393-966c-60d29a5c974b	77777777-7777-7777-7777-777777777777	9	1	\N
61a5d1a3-b50f-4130-8bf0-762f9717584e	77777777-7777-7777-7777-777777777777	3	4	\N
b258c15c-0a58-4fa6-ad69-55adde0aeb27	88888888-8888-8888-8888-888888888888	1	1	\N
5fa2160f-a6c1-4d1e-af38-748eb50d014a	88888888-8888-8888-8888-888888888888	5	2	\N
54ea29e1-6c02-40da-bcc1-8231d941b769	88888888-8888-8888-8888-888888888888	12	2	\N
\.


--
-- Data for Name: tipo_equipo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."tipo_equipo" ("id", "nombre", "categoria") FROM stdin;
1	Sistema de PA	sonido
2	Mezcladora	sonido
3	Monitor de piso	sonido
4	Monitor in-ear	sonido
5	Entrada de línea (caja DI)	sonido
6	Micrófono vocal	microfonia
7	Micrófono para instrumento	microfonia
8	Pedestal de micrófono	microfonia
9	Batería completa	instrumentos
10	Amplificador de guitarra	instrumentos
11	Amplificador de bajo	instrumentos
12	Toma de corriente en escenario	energia
\.


--
-- Name: banda_genero banda_genero_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."banda_genero"
    ADD CONSTRAINT "banda_genero_pkey" PRIMARY KEY ("banda_id", "genero_id");


--
-- Name: banda banda_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."banda"
    ADD CONSTRAINT "banda_pkey" PRIMARY KEY ("id");


--
-- Name: foro_genero foro_genero_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."foro_genero"
    ADD CONSTRAINT "foro_genero_pkey" PRIMARY KEY ("foro_id", "genero_id");


--
-- Name: foro foro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."foro"
    ADD CONSTRAINT "foro_pkey" PRIMARY KEY ("id");


--
-- Name: genero genero_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."genero"
    ADD CONSTRAINT "genero_nombre_key" UNIQUE ("nombre");


--
-- Name: genero genero_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."genero"
    ADD CONSTRAINT "genero_pkey" PRIMARY KEY ("id");


--
-- Name: inventario_item inventario_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inventario_item"
    ADD CONSTRAINT "inventario_item_pkey" PRIMARY KEY ("id");


--
-- Name: rider_requisito rider_requisito_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rider_requisito"
    ADD CONSTRAINT "rider_requisito_pkey" PRIMARY KEY ("id");


--
-- Name: tipo_equipo tipo_equipo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tipo_equipo"
    ADD CONSTRAINT "tipo_equipo_nombre_key" UNIQUE ("nombre");


--
-- Name: tipo_equipo tipo_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."tipo_equipo"
    ADD CONSTRAINT "tipo_equipo_pkey" PRIMARY KEY ("id");


--
-- Name: inventario_item uq_inventario_foro_equipo; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inventario_item"
    ADD CONSTRAINT "uq_inventario_foro_equipo" UNIQUE ("foro_id", "tipo_equipo_id");


--
-- Name: rider_requisito uq_rider_banda_equipo; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rider_requisito"
    ADD CONSTRAINT "uq_rider_banda_equipo" UNIQUE ("banda_id", "tipo_equipo_id");


--
-- Name: ix_banda_activas; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_banda_activas" ON "public"."banda" USING "btree" ("nombre") WHERE ("visible" AND ("dado_de_baja_en" IS NULL));


--
-- Name: ix_banda_genero_genero; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_banda_genero_genero" ON "public"."banda_genero" USING "btree" ("genero_id");


--
-- Name: ix_foro_activos; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_foro_activos" ON "public"."foro" USING "btree" ("nombre") WHERE ("visible" AND ("dado_de_baja_en" IS NULL));


--
-- Name: ix_foro_genero_genero; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_foro_genero_genero" ON "public"."foro_genero" USING "btree" ("genero_id");


--
-- Name: banda tg_banda_actualizado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "tg_banda_actualizado" BEFORE UPDATE ON "public"."banda" FOR EACH ROW EXECUTE FUNCTION "public"."fijar_actualizado_en"();


--
-- Name: foro tg_foro_actualizado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "tg_foro_actualizado" BEFORE UPDATE ON "public"."foro" FOR EACH ROW EXECUTE FUNCTION "public"."fijar_actualizado_en"();


--
-- Name: banda_genero banda_genero_banda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."banda_genero"
    ADD CONSTRAINT "banda_genero_banda_id_fkey" FOREIGN KEY ("banda_id") REFERENCES "public"."banda"("id") ON DELETE CASCADE;


--
-- Name: banda_genero banda_genero_genero_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."banda_genero"
    ADD CONSTRAINT "banda_genero_genero_id_fkey" FOREIGN KEY ("genero_id") REFERENCES "public"."genero"("id");


--
-- Name: foro_genero foro_genero_foro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."foro_genero"
    ADD CONSTRAINT "foro_genero_foro_id_fkey" FOREIGN KEY ("foro_id") REFERENCES "public"."foro"("id") ON DELETE CASCADE;


--
-- Name: foro_genero foro_genero_genero_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."foro_genero"
    ADD CONSTRAINT "foro_genero_genero_id_fkey" FOREIGN KEY ("genero_id") REFERENCES "public"."genero"("id");


--
-- Name: inventario_item inventario_item_foro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inventario_item"
    ADD CONSTRAINT "inventario_item_foro_id_fkey" FOREIGN KEY ("foro_id") REFERENCES "public"."foro"("id") ON DELETE CASCADE;


--
-- Name: inventario_item inventario_item_tipo_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inventario_item"
    ADD CONSTRAINT "inventario_item_tipo_equipo_id_fkey" FOREIGN KEY ("tipo_equipo_id") REFERENCES "public"."tipo_equipo"("id");


--
-- Name: rider_requisito rider_requisito_banda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rider_requisito"
    ADD CONSTRAINT "rider_requisito_banda_id_fkey" FOREIGN KEY ("banda_id") REFERENCES "public"."banda"("id") ON DELETE CASCADE;


--
-- Name: rider_requisito rider_requisito_tipo_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."rider_requisito"
    ADD CONSTRAINT "rider_requisito_tipo_equipo_id_fkey" FOREIGN KEY ("tipo_equipo_id") REFERENCES "public"."tipo_equipo"("id");


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "svc_perfiles";


--
-- Name: TABLE "banda"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE "public"."banda" TO "svc_perfiles";


--
-- Name: TABLE "banda_genero"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."banda_genero" TO "svc_perfiles";


--
-- Name: TABLE "foro"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE "public"."foro" TO "svc_perfiles";


--
-- Name: TABLE "foro_genero"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."foro_genero" TO "svc_perfiles";


--
-- Name: TABLE "genero"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE "public"."genero" TO "svc_perfiles";


--
-- Name: TABLE "inventario_item"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."inventario_item" TO "svc_perfiles";


--
-- Name: TABLE "rider_requisito"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rider_requisito" TO "svc_perfiles";


--
-- Name: TABLE "tipo_equipo"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE "public"."tipo_equipo" TO "svc_perfiles";


--
-- PostgreSQL database dump complete
--

\unrestrict SyWFP6pJRpDtfuCBYpGAvrqeUU4hKIaBFkaGNWriQgiCkFfogg1gP45lDrFotqr


-- =================================================================== backline_booking
\connect backline_booking

--
-- PostgreSQL database dump
--

\restrict yq31f8qlQ4fYMcAzpsgMcHqeDJ60cp6HFdi9Y1ncz8POlsGpNVrBEwDPUPObCIl

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY "public"."solicitud" DROP CONSTRAINT IF EXISTS "fk_solicitud_franja";
ALTER TABLE IF EXISTS ONLY "public"."cambio_estado" DROP CONSTRAINT IF EXISTS "cambio_estado_solicitud_id_fkey";
DROP TRIGGER IF EXISTS "tg_solicitud_actualizado" ON "public"."solicitud";
DROP TRIGGER IF EXISTS "tg_franja_retiro" ON "public"."franja";
DROP INDEX IF EXISTS "public"."ux_solicitud_franja_reservada";
DROP INDEX IF EXISTS "public"."ux_solicitud_banda_franja_activa";
DROP INDEX IF EXISTS "public"."ix_solicitud_foro";
DROP INDEX IF EXISTS "public"."ix_solicitud_banda";
DROP INDEX IF EXISTS "public"."ix_franja_libres_por_inicio";
DROP INDEX IF EXISTS "public"."ix_franja_foro_inicio";
DROP INDEX IF EXISTS "public"."ix_evento_sin_publicar";
DROP INDEX IF EXISTS "public"."ix_cambio_estado_solicitud";
ALTER TABLE IF EXISTS ONLY "public"."franja" DROP CONSTRAINT IF EXISTS "uq_franja_id_foro";
ALTER TABLE IF EXISTS ONLY "public"."solicitud" DROP CONSTRAINT IF EXISTS "solicitud_pkey";
ALTER TABLE IF EXISTS ONLY "public"."franja" DROP CONSTRAINT IF EXISTS "franja_pkey";
ALTER TABLE IF EXISTS ONLY "public"."franja" DROP CONSTRAINT IF EXISTS "ex_franja_sin_traslape";
ALTER TABLE IF EXISTS ONLY "public"."evento_pendiente" DROP CONSTRAINT IF EXISTS "evento_pendiente_pkey";
ALTER TABLE IF EXISTS ONLY "public"."cambio_estado" DROP CONSTRAINT IF EXISTS "cambio_estado_pkey";
DROP TABLE IF EXISTS "public"."solicitud";
DROP TABLE IF EXISTS "public"."franja";
DROP TABLE IF EXISTS "public"."evento_pendiente";
DROP TABLE IF EXISTS "public"."cambio_estado";
DROP FUNCTION IF EXISTS "public"."impedir_retiro_con_solicitudes"();
DROP FUNCTION IF EXISTS "public"."fijar_actualizado_en"();
DROP TYPE IF EXISTS "public"."tipo_acuerdo";
DROP TYPE IF EXISTS "public"."estado_solicitud";
DROP TYPE IF EXISTS "public"."estado_franja";
DROP EXTENSION IF EXISTS "btree_gist";
--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";


--
-- Name: EXTENSION "btree_gist"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "btree_gist" IS 'support for indexing common datatypes in GiST';


--
-- Name: estado_franja; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."estado_franja" AS ENUM (
    'libre',
    'reservada',
    'retirada'
);


ALTER TYPE "public"."estado_franja" OWNER TO "postgres";

--
-- Name: estado_solicitud; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."estado_solicitud" AS ENUM (
    'solicitada',
    'aceptada',
    'rechazada',
    'confirmada',
    'cancelada'
);


ALTER TYPE "public"."estado_solicitud" OWNER TO "postgres";

--
-- Name: tipo_acuerdo; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."tipo_acuerdo" AS ENUM (
    'pago_fijo',
    'porcentaje_taquilla',
    'a_convenir'
);


ALTER TYPE "public"."tipo_acuerdo" OWNER TO "postgres";

--
-- Name: fijar_actualizado_en(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."fijar_actualizado_en"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fijar_actualizado_en"() OWNER TO "postgres";

--
-- Name: impedir_retiro_con_solicitudes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."impedir_retiro_con_solicitudes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."impedir_retiro_con_solicitudes"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: cambio_estado; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."cambio_estado" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "solicitud_id" "uuid" NOT NULL,
    "estado_anterior" "public"."estado_solicitud",
    "estado_nuevo" "public"."estado_solicitud" NOT NULL,
    "autor_usuario_id" "uuid",
    "motivo" character varying(300),
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_cambio_distinto" CHECK (("estado_anterior" IS DISTINCT FROM "estado_nuevo")),
    CONSTRAINT "ck_cancelacion_con_motivo" CHECK ((("estado_nuevo" <> 'cancelada'::"public"."estado_solicitud") OR ("motivo" IS NOT NULL)))
);


ALTER TABLE "public"."cambio_estado" OWNER TO "postgres";

--
-- Name: evento_pendiente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."evento_pendiente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo" character varying(60) NOT NULL,
    "payload" "jsonb" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "publicado_en" timestamp with time zone
);


ALTER TABLE "public"."evento_pendiente" OWNER TO "postgres";

--
-- Name: franja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."franja" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "foro_id" "uuid" NOT NULL,
    "inicio" timestamp with time zone NOT NULL,
    "fin" timestamp with time zone NOT NULL,
    "estado" "public"."estado_franja" DEFAULT 'libre'::"public"."estado_franja" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "retirada_en" timestamp with time zone,
    CONSTRAINT "ck_franja_duracion" CHECK ((("fin" > "inicio") AND (("fin" - "inicio") <= '12:00:00'::interval))),
    CONSTRAINT "ck_franja_retiro" CHECK ((("estado" = 'retirada'::"public"."estado_franja") = ("retirada_en" IS NOT NULL)))
);


ALTER TABLE "public"."franja" OWNER TO "postgres";

--
-- Name: solicitud; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."solicitud" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "franja_id" "uuid" NOT NULL,
    "foro_id" "uuid" NOT NULL,
    "banda_id" "uuid" NOT NULL,
    "banda_nombre" character varying(80) NOT NULL,
    "foro_nombre" character varying(80) NOT NULL,
    "tipo_acuerdo" "public"."tipo_acuerdo" NOT NULL,
    "monto_mxn" numeric(10,2),
    "porcentaje" smallint,
    "notas" character varying(500),
    "estado" "public"."estado_solicitud" DEFAULT 'solicitada'::"public"."estado_solicitud" NOT NULL,
    "rider_snapshot" "jsonb" NOT NULL,
    "inventario_snapshot" "jsonb" NOT NULL,
    "faltantes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_solicitud_acuerdo" CHECK (((("tipo_acuerdo" = 'pago_fijo'::"public"."tipo_acuerdo") AND ("monto_mxn" IS NOT NULL) AND ("monto_mxn" > (0)::numeric) AND ("porcentaje" IS NULL)) OR (("tipo_acuerdo" = 'porcentaje_taquilla'::"public"."tipo_acuerdo") AND ("porcentaje" IS NOT NULL) AND (("porcentaje" >= 1) AND ("porcentaje" <= 100)) AND ("monto_mxn" IS NULL)) OR (("tipo_acuerdo" = 'a_convenir'::"public"."tipo_acuerdo") AND ("monto_mxn" IS NULL) AND ("porcentaje" IS NULL)))),
    CONSTRAINT "solicitud_faltantes_check" CHECK (("jsonb_typeof"("faltantes") = 'array'::"text")),
    CONSTRAINT "solicitud_inventario_snapshot_check" CHECK (("jsonb_typeof"("inventario_snapshot") = 'array'::"text")),
    CONSTRAINT "solicitud_rider_snapshot_check" CHECK (("jsonb_typeof"("rider_snapshot") = 'array'::"text"))
);


ALTER TABLE "public"."solicitud" OWNER TO "postgres";

--
-- Data for Name: cambio_estado; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cambio_estado" ("id", "solicitud_id", "estado_anterior", "estado_nuevo", "autor_usuario_id", "motivo", "creado_en") FROM stdin;
eeeeeeee-0000-0000-0000-000000000001	bbbbbbbb-0000-0000-0000-000000000001	\N	solicitada	11111111-1111-1111-1111-111111111111	\N	2026-10-20 12:20:00-06
eeeeeeee-0000-0000-0000-000000000002	bbbbbbbb-0000-0000-0000-000000000001	solicitada	aceptada	22222222-2222-2222-2222-222222222222	\N	2026-10-21 12:30:00-06
eeeeeeee-0000-0000-0000-000000000003	bbbbbbbb-0000-0000-0000-000000000002	\N	solicitada	44444444-4444-4444-4444-444444444444	\N	2026-10-20 18:05:00-06
eeeeeeee-0000-0000-0000-000000000004	bbbbbbbb-0000-0000-0000-000000000002	solicitada	rechazada	\N	La franja fue reservada por otra banda	2026-10-21 12:30:00-06
eeeeeeee-0000-0000-0000-000000000005	bbbbbbbb-0000-0000-0000-000000000003	\N	solicitada	66666666-6666-6666-6666-666666666666	\N	2026-10-15 10:00:00-06
eeeeeeee-0000-0000-0000-000000000006	bbbbbbbb-0000-0000-0000-000000000003	solicitada	aceptada	22222222-2222-2222-2222-222222222222	\N	2026-10-16 09:00:00-06
eeeeeeee-0000-0000-0000-000000000007	bbbbbbbb-0000-0000-0000-000000000003	aceptada	confirmada	66666666-6666-6666-6666-666666666666	\N	2026-10-16 20:15:00-06
eeeeeeee-0000-0000-0000-000000000008	bbbbbbbb-0000-0000-0000-000000000004	\N	solicitada	44444444-4444-4444-4444-444444444444	\N	2026-10-27 17:40:00-06
eeeeeeee-0000-0000-0000-000000000009	bbbbbbbb-0000-0000-0000-000000000005	\N	solicitada	55555555-5555-5555-5555-555555555555	\N	2026-10-10 11:00:00-06
eeeeeeee-0000-0000-0000-000000000010	bbbbbbbb-0000-0000-0000-000000000005	solicitada	aceptada	99999999-9999-9999-9999-999999999999	\N	2026-10-11 10:00:00-06
eeeeeeee-0000-0000-0000-000000000011	bbbbbbbb-0000-0000-0000-000000000005	aceptada	confirmada	55555555-5555-5555-5555-555555555555	\N	2026-10-11 13:30:00-06
eeeeeeee-0000-0000-0000-000000000012	bbbbbbbb-0000-0000-0000-000000000006	\N	solicitada	55555555-5555-5555-5555-555555555555	\N	2026-10-12 16:00:00-06
eeeeeeee-0000-0000-0000-000000000013	bbbbbbbb-0000-0000-0000-000000000006	solicitada	aceptada	99999999-9999-9999-9999-999999999999	\N	2026-10-13 09:45:00-06
eeeeeeee-0000-0000-0000-000000000014	bbbbbbbb-0000-0000-0000-000000000006	aceptada	cancelada	55555555-5555-5555-5555-555555555555	Uno de los integrantes no podrá asistir	2026-10-22 08:10:00-06
eeeeeeee-0000-0000-0000-000000000015	bbbbbbbb-0000-0000-0000-000000000007	\N	solicitada	66666666-6666-6666-6666-666666666666	\N	2026-10-18 13:00:00-06
eeeeeeee-0000-0000-0000-000000000016	bbbbbbbb-0000-0000-0000-000000000007	solicitada	rechazada	99999999-9999-9999-9999-999999999999	Ya tenemos el cartel completo ese día	2026-10-19 10:00:00-06
eeeeeeee-0000-0000-0000-000000000017	bbbbbbbb-0000-0000-0000-000000000008	\N	solicitada	77777777-7777-7777-7777-777777777777	\N	2026-10-17 19:00:00-06
eeeeeeee-0000-0000-0000-000000000018	bbbbbbbb-0000-0000-0000-000000000008	solicitada	aceptada	dddddddd-dddd-dddd-dddd-dddddddddddd	\N	2026-10-18 12:00:00-06
eeeeeeee-0000-0000-0000-000000000019	bbbbbbbb-0000-0000-0000-000000000009	\N	solicitada	66666666-6666-6666-6666-666666666666	\N	2026-10-26 09:30:00-06
eeeeeeee-0000-0000-0000-000000000020	bbbbbbbb-0000-0000-0000-000000000010	\N	solicitada	44444444-4444-4444-4444-444444444444	\N	2026-10-26 21:00:00-06
eeeeeeee-0000-0000-0000-000000000021	bbbbbbbb-0000-0000-0000-000000000011	\N	solicitada	11111111-1111-1111-1111-111111111111	\N	2026-10-23 15:00:00-06
eeeeeeee-0000-0000-0000-000000000022	bbbbbbbb-0000-0000-0000-000000000011	solicitada	cancelada	11111111-1111-1111-1111-111111111111	Conseguimos otra fecha	2026-10-24 11:00:00-06
\.


--
-- Data for Name: evento_pendiente; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."evento_pendiente" ("id", "tipo", "payload", "creado_en", "publicado_en") FROM stdin;
cccccccc-0000-0000-0000-000000000001	SolicitudCreada	{"foroId": "22222222-2222-2222-2222-222222222222", "inicio": "2026-11-14T20:00:00-06:00", "bandaId": "11111111-1111-1111-1111-111111111111", "foroNombre": "Foro La Bodega", "bandaNombre": "Los Desvelados", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000001"}	2026-10-20 12:20:00-06	2026-10-20 12:20:02-06
cccccccc-0000-0000-0000-000000000002	SolicitudAceptada	{"foroId": "22222222-2222-2222-2222-222222222222", "inicio": "2026-11-14T20:00:00-06:00", "motivo": null, "bandaId": "11111111-1111-1111-1111-111111111111", "foroNombre": "Foro La Bodega", "bandaNombre": "Los Desvelados", "estadoNuevo": "aceptada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000001", "estadoAnterior": "solicitada"}	2026-10-21 12:30:00-06	2026-10-21 12:30:02-06
cccccccc-0000-0000-0000-000000000003	SolicitudCreada	{"foroId": "22222222-2222-2222-2222-222222222222", "inicio": "2026-11-14T20:00:00-06:00", "bandaId": "44444444-4444-4444-4444-444444444444", "foroNombre": "Foro La Bodega", "bandaNombre": "Ruido Blanco", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000002"}	2026-10-20 18:05:00-06	2026-10-20 18:05:02-06
cccccccc-0000-0000-0000-000000000004	SolicitudRechazada	{"foroId": "22222222-2222-2222-2222-222222222222", "inicio": "2026-11-14T20:00:00-06:00", "motivo": "La franja fue reservada por otra banda", "bandaId": "44444444-4444-4444-4444-444444444444", "foroNombre": "Foro La Bodega", "bandaNombre": "Ruido Blanco", "estadoNuevo": "rechazada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000002", "estadoAnterior": "solicitada"}	2026-10-21 12:30:00-06	2026-10-21 12:30:02-06
cccccccc-0000-0000-0000-000000000005	SolicitudCreada	{"foroId": "22222222-2222-2222-2222-222222222222", "inicio": "2026-11-21T20:00:00-06:00", "bandaId": "66666666-6666-6666-6666-666666666666", "foroNombre": "Foro La Bodega", "bandaNombre": "Cuarto Oscuro", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000003"}	2026-10-15 10:00:00-06	2026-10-15 10:00:02-06
cccccccc-0000-0000-0000-000000000006	SolicitudAceptada	{"foroId": "22222222-2222-2222-2222-222222222222", "inicio": "2026-11-21T20:00:00-06:00", "motivo": null, "bandaId": "66666666-6666-6666-6666-666666666666", "foroNombre": "Foro La Bodega", "bandaNombre": "Cuarto Oscuro", "estadoNuevo": "aceptada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000003", "estadoAnterior": "solicitada"}	2026-10-16 09:00:00-06	2026-10-16 09:00:02-06
cccccccc-0000-0000-0000-000000000007	SolicitudConfirmada	{"foroId": "22222222-2222-2222-2222-222222222222", "inicio": "2026-11-21T20:00:00-06:00", "motivo": null, "bandaId": "66666666-6666-6666-6666-666666666666", "foroNombre": "Foro La Bodega", "bandaNombre": "Cuarto Oscuro", "estadoNuevo": "confirmada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000003", "estadoAnterior": "aceptada"}	2026-10-16 20:15:00-06	2026-10-16 20:15:02-06
cccccccc-0000-0000-0000-000000000008	SolicitudCreada	{"foroId": "22222222-2222-2222-2222-222222222222", "inicio": "2026-11-28T20:00:00-06:00", "bandaId": "44444444-4444-4444-4444-444444444444", "foroNombre": "Foro La Bodega", "bandaNombre": "Ruido Blanco", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000004"}	2026-10-27 17:40:00-06	\N
cccccccc-0000-0000-0000-000000000009	SolicitudCreada	{"foroId": "99999999-9999-9999-9999-999999999999", "inicio": "2026-11-13T19:00:00-06:00", "bandaId": "55555555-5555-5555-5555-555555555555", "foroNombre": "El Sótano Café", "bandaNombre": "Marea Lenta", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000005"}	2026-10-10 11:00:00-06	2026-10-10 11:00:02-06
cccccccc-0000-0000-0000-000000000010	SolicitudAceptada	{"foroId": "99999999-9999-9999-9999-999999999999", "inicio": "2026-11-13T19:00:00-06:00", "motivo": null, "bandaId": "55555555-5555-5555-5555-555555555555", "foroNombre": "El Sótano Café", "bandaNombre": "Marea Lenta", "estadoNuevo": "aceptada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000005", "estadoAnterior": "solicitada"}	2026-10-11 10:00:00-06	2026-10-11 10:00:02-06
cccccccc-0000-0000-0000-000000000011	SolicitudConfirmada	{"foroId": "99999999-9999-9999-9999-999999999999", "inicio": "2026-11-13T19:00:00-06:00", "motivo": null, "bandaId": "55555555-5555-5555-5555-555555555555", "foroNombre": "El Sótano Café", "bandaNombre": "Marea Lenta", "estadoNuevo": "confirmada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000005", "estadoAnterior": "aceptada"}	2026-10-11 13:30:00-06	2026-10-11 13:30:02-06
cccccccc-0000-0000-0000-000000000012	SolicitudCreada	{"foroId": "99999999-9999-9999-9999-999999999999", "inicio": "2026-11-20T19:00:00-06:00", "bandaId": "55555555-5555-5555-5555-555555555555", "foroNombre": "El Sótano Café", "bandaNombre": "Marea Lenta", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000006"}	2026-10-12 16:00:00-06	2026-10-12 16:00:02-06
cccccccc-0000-0000-0000-000000000013	SolicitudAceptada	{"foroId": "99999999-9999-9999-9999-999999999999", "inicio": "2026-11-20T19:00:00-06:00", "motivo": null, "bandaId": "55555555-5555-5555-5555-555555555555", "foroNombre": "El Sótano Café", "bandaNombre": "Marea Lenta", "estadoNuevo": "aceptada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000006", "estadoAnterior": "solicitada"}	2026-10-13 09:45:00-06	2026-10-13 09:45:02-06
cccccccc-0000-0000-0000-000000000014	SolicitudCancelada	{"foroId": "99999999-9999-9999-9999-999999999999", "inicio": "2026-11-20T19:00:00-06:00", "motivo": "Uno de los integrantes no podrá asistir", "bandaId": "55555555-5555-5555-5555-555555555555", "foroNombre": "El Sótano Café", "bandaNombre": "Marea Lenta", "estadoNuevo": "cancelada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000006", "estadoAnterior": "aceptada"}	2026-10-22 08:10:00-06	2026-10-22 08:10:02-06
cccccccc-0000-0000-0000-000000000015	SolicitudCreada	{"foroId": "99999999-9999-9999-9999-999999999999", "inicio": "2026-11-27T19:00:00-06:00", "bandaId": "66666666-6666-6666-6666-666666666666", "foroNombre": "El Sótano Café", "bandaNombre": "Cuarto Oscuro", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000007"}	2026-10-18 13:00:00-06	2026-10-18 13:00:02-06
cccccccc-0000-0000-0000-000000000016	SolicitudRechazada	{"foroId": "99999999-9999-9999-9999-999999999999", "inicio": "2026-11-27T19:00:00-06:00", "motivo": "Ya tenemos el cartel completo ese día", "bandaId": "66666666-6666-6666-6666-666666666666", "foroNombre": "El Sótano Café", "bandaNombre": "Cuarto Oscuro", "estadoNuevo": "rechazada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000007", "estadoAnterior": "solicitada"}	2026-10-19 10:00:00-06	2026-10-19 10:00:02-06
cccccccc-0000-0000-0000-000000000017	SolicitudCreada	{"foroId": "dddddddd-dddd-dddd-dddd-dddddddddddd", "inicio": "2026-11-15T18:00:00-06:00", "bandaId": "77777777-7777-7777-7777-777777777777", "foroNombre": "Arena Norte", "bandaNombre": "Sintonía Sur", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000008"}	2026-10-17 19:00:00-06	2026-10-17 19:00:02-06
cccccccc-0000-0000-0000-000000000018	SolicitudAceptada	{"foroId": "dddddddd-dddd-dddd-dddd-dddddddddddd", "inicio": "2026-11-15T18:00:00-06:00", "motivo": null, "bandaId": "77777777-7777-7777-7777-777777777777", "foroNombre": "Arena Norte", "bandaNombre": "Sintonía Sur", "estadoNuevo": "aceptada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000008", "estadoAnterior": "solicitada"}	2026-10-18 12:00:00-06	2026-10-18 12:00:02-06
cccccccc-0000-0000-0000-000000000019	SolicitudCreada	{"foroId": "dddddddd-dddd-dddd-dddd-dddddddddddd", "inicio": "2026-11-22T18:00:00-06:00", "bandaId": "66666666-6666-6666-6666-666666666666", "foroNombre": "Arena Norte", "bandaNombre": "Cuarto Oscuro", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000009"}	2026-10-26 09:30:00-06	2026-10-26 09:30:02-06
cccccccc-0000-0000-0000-000000000020	SolicitudCreada	{"foroId": "dddddddd-dddd-dddd-dddd-dddddddddddd", "inicio": "2026-11-22T18:00:00-06:00", "bandaId": "44444444-4444-4444-4444-444444444444", "foroNombre": "Arena Norte", "bandaNombre": "Ruido Blanco", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000010"}	2026-10-26 21:00:00-06	2026-10-26 21:00:02-06
cccccccc-0000-0000-0000-000000000021	SolicitudCreada	{"foroId": "dddddddd-dddd-dddd-dddd-dddddddddddd", "inicio": "2026-12-06T18:00:00-06:00", "bandaId": "11111111-1111-1111-1111-111111111111", "foroNombre": "Arena Norte", "bandaNombre": "Los Desvelados", "estadoNuevo": "solicitada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000011"}	2026-10-23 15:00:00-06	2026-10-23 15:00:02-06
cccccccc-0000-0000-0000-000000000022	SolicitudCancelada	{"foroId": "dddddddd-dddd-dddd-dddd-dddddddddddd", "inicio": "2026-12-06T18:00:00-06:00", "motivo": "Conseguimos otra fecha", "bandaId": "11111111-1111-1111-1111-111111111111", "foroNombre": "Arena Norte", "bandaNombre": "Los Desvelados", "estadoNuevo": "cancelada", "solicitudId": "bbbbbbbb-0000-0000-0000-000000000011", "estadoAnterior": "solicitada"}	2026-10-24 11:00:00-06	2026-10-24 11:00:02-06
\.


--
-- Data for Name: franja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."franja" ("id", "foro_id", "inicio", "fin", "estado", "creado_en", "retirada_en") FROM stdin;
aaaaaaaa-0000-0000-0000-000000000001	22222222-2222-2222-2222-222222222222	2026-11-14 20:00:00-06	2026-11-14 23:00:00-06	reservada	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000002	22222222-2222-2222-2222-222222222222	2026-11-14 23:00:00-06	2026-11-15 02:00:00-06	libre	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000003	22222222-2222-2222-2222-222222222222	2026-11-21 20:00:00-06	2026-11-21 23:00:00-06	reservada	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000004	22222222-2222-2222-2222-222222222222	2026-11-28 20:00:00-06	2026-11-28 23:00:00-06	libre	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000005	99999999-9999-9999-9999-999999999999	2026-11-13 19:00:00-06	2026-11-13 21:00:00-06	reservada	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000006	99999999-9999-9999-9999-999999999999	2026-11-20 19:00:00-06	2026-11-20 21:00:00-06	libre	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000008	dddddddd-dddd-dddd-dddd-dddddddddddd	2026-11-15 18:00:00-06	2026-11-15 23:00:00-06	reservada	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000009	dddddddd-dddd-dddd-dddd-dddddddddddd	2026-11-22 18:00:00-06	2026-11-22 23:00:00-06	libre	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000010	dddddddd-dddd-dddd-dddd-dddddddddddd	2026-11-29 18:00:00-06	2026-11-29 23:00:00-06	libre	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000011	99999999-9999-9999-9999-999999999999	2026-12-04 19:00:00-06	2026-12-04 21:00:00-06	libre	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000012	dddddddd-dddd-dddd-dddd-dddddddddddd	2026-12-06 18:00:00-06	2026-12-06 23:00:00-06	libre	2026-10-05 10:00:00-06	\N
aaaaaaaa-0000-0000-0000-000000000007	99999999-9999-9999-9999-999999999999	2026-11-27 19:00:00-06	2026-11-27 21:00:00-06	retirada	2026-10-05 10:00:00-06	2026-10-19 10:05:00-06
\.


--
-- Data for Name: solicitud; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."solicitud" ("id", "franja_id", "foro_id", "banda_id", "banda_nombre", "foro_nombre", "tipo_acuerdo", "monto_mxn", "porcentaje", "notas", "estado", "rider_snapshot", "inventario_snapshot", "faltantes", "creado_en", "actualizado_en") FROM stdin;
bbbbbbbb-0000-0000-0000-000000000001	aaaaaaaa-0000-0000-0000-000000000001	22222222-2222-2222-2222-222222222222	11111111-1111-1111-1111-111111111111	Los Desvelados	Foro La Bodega	pago_fijo	1500.00	\N	Llevamos nuestras dos cajas DI.	aceptada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 4, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 2, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 2, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 3, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}]	[{"faltan": 2, "requerido": 4, "disponible": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}]	2026-10-20 12:20:00-06	2026-10-21 12:30:00-06
bbbbbbbb-0000-0000-0000-000000000002	aaaaaaaa-0000-0000-0000-000000000001	22222222-2222-2222-2222-222222222222	44444444-4444-4444-4444-444444444444	Ruido Blanco	Foro La Bodega	a_convenir	\N	\N	\N	rechazada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 3, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 2, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 3, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}]	[{"faltan": 1, "requerido": 1, "disponible": 0, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}]	2026-10-20 18:05:00-06	2026-10-21 12:30:00-06
bbbbbbbb-0000-0000-0000-000000000003	aaaaaaaa-0000-0000-0000-000000000003	22222222-2222-2222-2222-222222222222	66666666-6666-6666-6666-666666666666	Cuarto Oscuro	Foro La Bodega	porcentaje_taquilla	\N	60	\N	confirmada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 2, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 2, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 3, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}]	[{"faltan": 1, "requerido": 1, "disponible": 0, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}]	2026-10-15 10:00:00-06	2026-10-16 20:15:00-06
bbbbbbbb-0000-0000-0000-000000000004	aaaaaaaa-0000-0000-0000-000000000004	22222222-2222-2222-2222-222222222222	44444444-4444-4444-4444-444444444444	Ruido Blanco	Foro La Bodega	pago_fijo	1200.00	\N	Podemos cerrar la noche.	solicitada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 3, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 2, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 3, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}]	[{"faltan": 1, "requerido": 1, "disponible": 0, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}]	2026-10-27 17:40:00-06	2026-10-27 17:40:00-06
bbbbbbbb-0000-0000-0000-000000000005	aaaaaaaa-0000-0000-0000-000000000005	99999999-9999-9999-9999-999999999999	55555555-5555-5555-5555-555555555555	Marea Lenta	El Sótano Café	pago_fijo	800.00	\N	\N	confirmada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 3, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 2, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 3, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 2, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 1, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 4, "tipoEquipo": "Pedestal de micrófono", "tipoEquipoId": 8}, {"cantidad": 2, "tipoEquipo": "Toma de corriente en escenario", "tipoEquipoId": 12}]	[{"faltan": 1, "requerido": 3, "disponible": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"faltan": 2, "requerido": 3, "disponible": 1, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}]	2026-10-10 11:00:00-06	2026-10-11 13:30:00-06
bbbbbbbb-0000-0000-0000-000000000006	aaaaaaaa-0000-0000-0000-000000000006	99999999-9999-9999-9999-999999999999	55555555-5555-5555-5555-555555555555	Marea Lenta	El Sótano Café	a_convenir	\N	\N	\N	cancelada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 3, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 2, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 3, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 2, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 1, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 4, "tipoEquipo": "Pedestal de micrófono", "tipoEquipoId": 8}, {"cantidad": 2, "tipoEquipo": "Toma de corriente en escenario", "tipoEquipoId": 12}]	[{"faltan": 1, "requerido": 3, "disponible": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"faltan": 2, "requerido": 3, "disponible": 1, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}]	2026-10-12 16:00:00-06	2026-10-22 08:10:00-06
bbbbbbbb-0000-0000-0000-000000000007	aaaaaaaa-0000-0000-0000-000000000007	99999999-9999-9999-9999-999999999999	66666666-6666-6666-6666-666666666666	Cuarto Oscuro	El Sótano Café	pago_fijo	900.00	\N	\N	rechazada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 2, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 2, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 2, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 1, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 4, "tipoEquipo": "Pedestal de micrófono", "tipoEquipoId": 8}, {"cantidad": 2, "tipoEquipo": "Toma de corriente en escenario", "tipoEquipoId": 12}]	[{"faltan": 2, "requerido": 2, "disponible": 0, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"faltan": 1, "requerido": 1, "disponible": 0, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"faltan": 1, "requerido": 1, "disponible": 0, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"faltan": 1, "requerido": 2, "disponible": 1, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}]	2026-10-18 13:00:00-06	2026-10-19 10:00:00-06
bbbbbbbb-0000-0000-0000-000000000008	aaaaaaaa-0000-0000-0000-000000000008	dddddddd-dddd-dddd-dddd-dddddddddddd	77777777-7777-7777-7777-777777777777	Sintonía Sur	Arena Norte	porcentaje_taquilla	\N	70	Somos seis en escena.	aceptada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 4, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 1, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 4, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 4, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 2, "tipoEquipo": "Monitor in-ear", "tipoEquipoId": 4}, {"cantidad": 4, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 6, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 6, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 8, "tipoEquipo": "Pedestal de micrófono", "tipoEquipoId": 8}, {"cantidad": 4, "tipoEquipo": "Toma de corriente en escenario", "tipoEquipoId": 12}]	[]	2026-10-17 19:00:00-06	2026-10-18 12:00:00-06
bbbbbbbb-0000-0000-0000-000000000009	aaaaaaaa-0000-0000-0000-000000000009	dddddddd-dddd-dddd-dddd-dddddddddddd	66666666-6666-6666-6666-666666666666	Cuarto Oscuro	Arena Norte	pago_fijo	2500.00	\N	\N	solicitada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 2, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 4, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 2, "tipoEquipo": "Monitor in-ear", "tipoEquipoId": 4}, {"cantidad": 4, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 6, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 6, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 8, "tipoEquipo": "Pedestal de micrófono", "tipoEquipoId": 8}, {"cantidad": 4, "tipoEquipo": "Toma de corriente en escenario", "tipoEquipoId": 12}]	[]	2026-10-26 09:30:00-06	2026-10-26 09:30:00-06
bbbbbbbb-0000-0000-0000-000000000010	aaaaaaaa-0000-0000-0000-000000000009	dddddddd-dddd-dddd-dddd-dddddddddddd	44444444-4444-4444-4444-444444444444	Ruido Blanco	Arena Norte	a_convenir	\N	\N	\N	solicitada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 3, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 4, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 2, "tipoEquipo": "Monitor in-ear", "tipoEquipoId": 4}, {"cantidad": 4, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 6, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 6, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 8, "tipoEquipo": "Pedestal de micrófono", "tipoEquipoId": 8}, {"cantidad": 4, "tipoEquipo": "Toma de corriente en escenario", "tipoEquipoId": 12}]	[]	2026-10-26 21:00:00-06	2026-10-26 21:00:00-06
bbbbbbbb-0000-0000-0000-000000000011	aaaaaaaa-0000-0000-0000-000000000012	dddddddd-dddd-dddd-dddd-dddddddddddd	11111111-1111-1111-1111-111111111111	Los Desvelados	Arena Norte	pago_fijo	2000.00	\N	\N	cancelada	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 4, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 2, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 2, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}]	[{"cantidad": 1, "tipoEquipo": "Sistema de PA", "tipoEquipoId": 1}, {"cantidad": 1, "tipoEquipo": "Mezcladora", "tipoEquipoId": 2}, {"cantidad": 4, "tipoEquipo": "Monitor de piso", "tipoEquipoId": 3}, {"cantidad": 2, "tipoEquipo": "Monitor in-ear", "tipoEquipoId": 4}, {"cantidad": 4, "tipoEquipo": "Micrófono vocal", "tipoEquipoId": 6}, {"cantidad": 6, "tipoEquipo": "Micrófono para instrumento", "tipoEquipoId": 7}, {"cantidad": 1, "tipoEquipo": "Batería completa", "tipoEquipoId": 9}, {"cantidad": 2, "tipoEquipo": "Amplificador de guitarra", "tipoEquipoId": 10}, {"cantidad": 1, "tipoEquipo": "Amplificador de bajo", "tipoEquipoId": 11}, {"cantidad": 6, "tipoEquipo": "Entrada de línea (caja DI)", "tipoEquipoId": 5}, {"cantidad": 8, "tipoEquipo": "Pedestal de micrófono", "tipoEquipoId": 8}, {"cantidad": 4, "tipoEquipo": "Toma de corriente en escenario", "tipoEquipoId": 12}]	[]	2026-10-23 15:00:00-06	2026-10-24 11:00:00-06
\.


--
-- Name: cambio_estado cambio_estado_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."cambio_estado"
    ADD CONSTRAINT "cambio_estado_pkey" PRIMARY KEY ("id");


--
-- Name: evento_pendiente evento_pendiente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."evento_pendiente"
    ADD CONSTRAINT "evento_pendiente_pkey" PRIMARY KEY ("id");


--
-- Name: franja ex_franja_sin_traslape; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."franja"
    ADD CONSTRAINT "ex_franja_sin_traslape" EXCLUDE USING "gist" ("foro_id" WITH =, "tstzrange"("inicio", "fin") WITH &&) WHERE (("estado" <> 'retirada'::"public"."estado_franja"));


--
-- Name: franja franja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."franja"
    ADD CONSTRAINT "franja_pkey" PRIMARY KEY ("id");


--
-- Name: solicitud solicitud_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."solicitud"
    ADD CONSTRAINT "solicitud_pkey" PRIMARY KEY ("id");


--
-- Name: franja uq_franja_id_foro; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."franja"
    ADD CONSTRAINT "uq_franja_id_foro" UNIQUE ("id", "foro_id");


--
-- Name: ix_cambio_estado_solicitud; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_cambio_estado_solicitud" ON "public"."cambio_estado" USING "btree" ("solicitud_id", "creado_en");


--
-- Name: ix_evento_sin_publicar; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_evento_sin_publicar" ON "public"."evento_pendiente" USING "btree" ("creado_en") WHERE ("publicado_en" IS NULL);


--
-- Name: ix_franja_foro_inicio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_franja_foro_inicio" ON "public"."franja" USING "btree" ("foro_id", "inicio");


--
-- Name: ix_franja_libres_por_inicio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_franja_libres_por_inicio" ON "public"."franja" USING "btree" ("inicio") WHERE ("estado" = 'libre'::"public"."estado_franja");


--
-- Name: ix_solicitud_banda; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_solicitud_banda" ON "public"."solicitud" USING "btree" ("banda_id", "creado_en" DESC);


--
-- Name: ix_solicitud_foro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_solicitud_foro" ON "public"."solicitud" USING "btree" ("foro_id", "creado_en" DESC);


--
-- Name: ux_solicitud_banda_franja_activa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ux_solicitud_banda_franja_activa" ON "public"."solicitud" USING "btree" ("franja_id", "banda_id") WHERE ("estado" = ANY (ARRAY['solicitada'::"public"."estado_solicitud", 'aceptada'::"public"."estado_solicitud", 'confirmada'::"public"."estado_solicitud"]));


--
-- Name: ux_solicitud_franja_reservada; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ux_solicitud_franja_reservada" ON "public"."solicitud" USING "btree" ("franja_id") WHERE ("estado" = ANY (ARRAY['aceptada'::"public"."estado_solicitud", 'confirmada'::"public"."estado_solicitud"]));


--
-- Name: franja tg_franja_retiro; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "tg_franja_retiro" BEFORE UPDATE OF "estado" ON "public"."franja" FOR EACH ROW EXECUTE FUNCTION "public"."impedir_retiro_con_solicitudes"();


--
-- Name: solicitud tg_solicitud_actualizado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "tg_solicitud_actualizado" BEFORE UPDATE ON "public"."solicitud" FOR EACH ROW EXECUTE FUNCTION "public"."fijar_actualizado_en"();


--
-- Name: cambio_estado cambio_estado_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."cambio_estado"
    ADD CONSTRAINT "cambio_estado_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitud"("id");


--
-- Name: solicitud fk_solicitud_franja; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."solicitud"
    ADD CONSTRAINT "fk_solicitud_franja" FOREIGN KEY ("franja_id", "foro_id") REFERENCES "public"."franja"("id", "foro_id");


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "svc_booking";


--
-- Name: TABLE "cambio_estado"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE "public"."cambio_estado" TO "svc_booking";


--
-- Name: TABLE "evento_pendiente"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE "public"."evento_pendiente" TO "svc_booking";


--
-- Name: TABLE "franja"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE "public"."franja" TO "svc_booking";


--
-- Name: TABLE "solicitud"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE "public"."solicitud" TO "svc_booking";


--
-- PostgreSQL database dump complete
--

\unrestrict yq31f8qlQ4fYMcAzpsgMcHqeDJ60cp6HFdi9Y1ncz8POlsGpNVrBEwDPUPObCIl


-- =================================================================== backline_notificaciones
\connect backline_notificaciones

--
-- PostgreSQL database dump
--

\restrict Dwg913NjFasn9RYzvmU6Cq5Gk57t1L3bMqIQkDXDGCwz4uaaudMWsRdFVDNHlw2

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY "public"."notificacion" DROP CONSTRAINT IF EXISTS "notificacion_usuario_id_fkey";
DROP TRIGGER IF EXISTS "tg_contacto_actualizado" ON "public"."contacto";
DROP INDEX IF EXISTS "public"."ix_notificacion_bandeja";
ALTER TABLE IF EXISTS ONLY "public"."notificacion" DROP CONSTRAINT IF EXISTS "uq_notificacion_evento";
ALTER TABLE IF EXISTS ONLY "public"."notificacion" DROP CONSTRAINT IF EXISTS "notificacion_pkey";
ALTER TABLE IF EXISTS ONLY "public"."contacto" DROP CONSTRAINT IF EXISTS "contacto_pkey";
DROP TABLE IF EXISTS "public"."notificacion";
DROP TABLE IF EXISTS "public"."contacto";
DROP FUNCTION IF EXISTS "public"."fijar_actualizado_en"();
DROP TYPE IF EXISTS "public"."canal_notificacion";
--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: canal_notificacion; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."canal_notificacion" AS ENUM (
    'correo',
    'app'
);


ALTER TYPE "public"."canal_notificacion" OWNER TO "postgres";

--
-- Name: fijar_actualizado_en(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."fijar_actualizado_en"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fijar_actualizado_en"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: contacto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."contacto" (
    "usuario_id" "uuid" NOT NULL,
    "correo" character varying(254) NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contacto" OWNER TO "postgres";

--
-- Name: notificacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."notificacion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "evento_id" "uuid" NOT NULL,
    "tipo" character varying(60) NOT NULL,
    "mensaje" character varying(300) NOT NULL,
    "solicitud_id" "uuid",
    "canal" "public"."canal_notificacion" NOT NULL,
    "leida" boolean DEFAULT false NOT NULL,
    "enviada_en" timestamp with time zone,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_notificacion_canal" CHECK (((("canal" = 'app'::"public"."canal_notificacion") AND ("enviada_en" IS NULL)) OR (("canal" = 'correo'::"public"."canal_notificacion") AND ("leida" = false))))
);


ALTER TABLE "public"."notificacion" OWNER TO "postgres";

--
-- Data for Name: contacto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."contacto" ("usuario_id", "correo", "actualizado_en") FROM stdin;
33333333-3333-3333-3333-333333333333	admin@backline.mx	2026-10-01 09:00:00-06
11111111-1111-1111-1111-111111111111	desvelados@correo.com	2026-10-02 10:00:00-06
44444444-4444-4444-4444-444444444444	ruidoblanco@correo.com	2026-10-02 11:00:00-06
55555555-5555-5555-5555-555555555555	marealenta@correo.com	2026-10-02 12:00:00-06
66666666-6666-6666-6666-666666666666	cuartooscuro@correo.com	2026-10-02 13:00:00-06
77777777-7777-7777-7777-777777777777	sintoniasur@correo.com	2026-10-02 14:00:00-06
88888888-8888-8888-8888-888888888888	ecopolar@correo.com	2026-10-02 15:00:00-06
22222222-2222-2222-2222-222222222222	labodega@correo.com	2026-10-03 10:00:00-06
99999999-9999-9999-9999-999999999999	elsotano@correo.com	2026-10-03 11:00:00-06
dddddddd-dddd-dddd-dddd-dddddddddddd	arenanorte@correo.com	2026-10-03 12:00:00-06
\.


--
-- Data for Name: notificacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notificacion" ("id", "usuario_id", "evento_id", "tipo", "mensaje", "solicitud_id", "canal", "leida", "enviada_en", "creado_en") FROM stdin;
3f3a8efa-cb09-47b6-b198-d7af01cbec3d	33333333-3333-3333-3333-333333333333	bbbb0000-0000-0000-0000-000000000001	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-01 09:00:05-06	2026-10-01 09:00:03-06
c5b6a8b2-838d-4c4a-89eb-93867f6300f8	11111111-1111-1111-1111-111111111111	bbbb0000-0000-0000-0000-000000000002	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-02 10:00:05-06	2026-10-02 10:00:03-06
f0d71ded-3526-47ff-8c62-f1b52ad80b5f	44444444-4444-4444-4444-444444444444	bbbb0000-0000-0000-0000-000000000003	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-02 11:00:05-06	2026-10-02 11:00:03-06
df67eb12-251e-4c44-992d-d32ee2b95381	55555555-5555-5555-5555-555555555555	bbbb0000-0000-0000-0000-000000000004	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-02 12:00:05-06	2026-10-02 12:00:03-06
4334ebef-8af2-49e7-8654-a32ba26d197e	66666666-6666-6666-6666-666666666666	bbbb0000-0000-0000-0000-000000000005	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-02 13:00:05-06	2026-10-02 13:00:03-06
f5200bdf-5087-4774-b7c2-f87492550c22	77777777-7777-7777-7777-777777777777	bbbb0000-0000-0000-0000-000000000006	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-02 14:00:05-06	2026-10-02 14:00:03-06
e94008da-cd42-42b6-b0b6-54044a093f9e	88888888-8888-8888-8888-888888888888	bbbb0000-0000-0000-0000-000000000007	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-02 15:00:05-06	2026-10-02 15:00:03-06
1e429a4f-5baf-4a3c-af16-2210bdf57dc0	22222222-2222-2222-2222-222222222222	bbbb0000-0000-0000-0000-000000000008	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-03 10:00:05-06	2026-10-03 10:00:03-06
8e916aed-3147-4022-bd93-aeacbd234007	99999999-9999-9999-9999-999999999999	bbbb0000-0000-0000-0000-000000000009	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-03 11:00:05-06	2026-10-03 11:00:03-06
a9b39181-b6da-4609-b8d2-d8741229ca49	dddddddd-dddd-dddd-dddd-dddddddddddd	bbbb0000-0000-0000-0000-000000000010	UsuarioRegistrado	Te damos la bienvenida a Backline.	\N	correo	f	2026-10-03 12:00:05-06	2026-10-03 12:00:03-06
5d3d1fc1-ad0c-43f0-bca6-0b4c8efc9a4e	88888888-8888-8888-8888-888888888888	bbbb0000-0000-0000-0000-000000000011	UsuarioSuspendido	Tu cuenta fue suspendida por el administrador.	\N	correo	f	2026-10-25 16:00:05-06	2026-10-25 16:00:03-06
dba72f44-9719-427f-bddc-d7f5dd0c0932	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000001	SolicitudCreada	Los Desvelados solicitó tocar el 14 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000001	app	t	\N	2026-10-20 12:20:03-06
46af83e2-7c02-4abd-99b4-3c2fc2e8a39c	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000001	SolicitudCreada	Los Desvelados solicitó tocar el 14 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000001	correo	f	2026-10-20 12:20:04-06	2026-10-20 12:20:03-06
56125732-b4ab-4917-b01d-0bd6afee4229	11111111-1111-1111-1111-111111111111	cccccccc-0000-0000-0000-000000000002	SolicitudAceptada	Foro La Bodega aceptó tu solicitud para el 14 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000001	app	f	\N	2026-10-21 12:30:03-06
f46dc48e-6dc6-495d-b21c-d4016d09982c	11111111-1111-1111-1111-111111111111	cccccccc-0000-0000-0000-000000000002	SolicitudAceptada	Foro La Bodega aceptó tu solicitud para el 14 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000001	correo	f	2026-10-21 12:30:04-06	2026-10-21 12:30:03-06
bdd27aa7-44d9-4902-8807-5ee22ec27643	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000003	SolicitudCreada	Ruido Blanco solicitó tocar el 14 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000002	app	t	\N	2026-10-20 18:05:03-06
6d14fd3a-579f-4245-aae2-b556a2ef4aa3	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000003	SolicitudCreada	Ruido Blanco solicitó tocar el 14 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000002	correo	f	2026-10-20 18:05:04-06	2026-10-20 18:05:03-06
ffe95e2f-339f-4bd9-9170-a49e45ba5bd7	44444444-4444-4444-4444-444444444444	cccccccc-0000-0000-0000-000000000004	SolicitudRechazada	Foro La Bodega rechazó tu solicitud para el 14 de noviembre de 2026, 20:00. Motivo: La franja fue reservada por otra banda.	bbbbbbbb-0000-0000-0000-000000000002	app	f	\N	2026-10-21 12:30:03-06
c0bfeb73-0e9d-45df-89ed-fb4cea5265b3	44444444-4444-4444-4444-444444444444	cccccccc-0000-0000-0000-000000000004	SolicitudRechazada	Foro La Bodega rechazó tu solicitud para el 14 de noviembre de 2026, 20:00. Motivo: La franja fue reservada por otra banda.	bbbbbbbb-0000-0000-0000-000000000002	correo	f	2026-10-21 12:30:04-06	2026-10-21 12:30:03-06
8d941b7f-3e10-4a26-8cbd-d7d85b2ca30a	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000005	SolicitudCreada	Cuarto Oscuro solicitó tocar el 21 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000003	app	t	\N	2026-10-15 10:00:03-06
ed299abc-3f9c-4b1a-9be5-156b0f76d92e	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000005	SolicitudCreada	Cuarto Oscuro solicitó tocar el 21 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000003	correo	f	2026-10-15 10:00:04-06	2026-10-15 10:00:03-06
ffdbfe2d-42f4-49fd-a36a-b6021c937e19	66666666-6666-6666-6666-666666666666	cccccccc-0000-0000-0000-000000000006	SolicitudAceptada	Foro La Bodega aceptó tu solicitud para el 21 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000003	app	t	\N	2026-10-16 09:00:03-06
9d6524ee-0046-47ac-85d8-85ba5a0e42bc	66666666-6666-6666-6666-666666666666	cccccccc-0000-0000-0000-000000000006	SolicitudAceptada	Foro La Bodega aceptó tu solicitud para el 21 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000003	correo	f	2026-10-16 09:00:04-06	2026-10-16 09:00:03-06
d0bab950-8947-4541-ba82-6ea5a3c22a85	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000007	SolicitudConfirmada	Cuarto Oscuro confirmó su presentación del 21 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000003	app	t	\N	2026-10-16 20:15:03-06
a17a5705-b4c2-4032-ad93-a184c1730a5e	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000007	SolicitudConfirmada	Cuarto Oscuro confirmó su presentación del 21 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000003	correo	f	2026-10-16 20:15:04-06	2026-10-16 20:15:03-06
258d829a-747a-471e-9cd2-eef3efb5228a	66666666-6666-6666-6666-666666666666	cccccccc-0000-0000-0000-000000000007	SolicitudConfirmada	Confirmaste tu presentación en Foro La Bodega del 21 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000003	app	t	\N	2026-10-16 20:15:03-06
e19e9e3d-28b6-422c-bbfa-979ac8cf310b	66666666-6666-6666-6666-666666666666	cccccccc-0000-0000-0000-000000000007	SolicitudConfirmada	Confirmaste tu presentación en Foro La Bodega del 21 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000003	correo	f	2026-10-16 20:15:04-06	2026-10-16 20:15:03-06
056b9991-223d-4560-b271-ab94a34e4fcd	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000008	SolicitudCreada	Ruido Blanco solicitó tocar el 28 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000004	app	f	\N	2026-10-27 17:40:03-06
f1034b3a-b77f-4e95-a6b9-4f3c861fe5d6	22222222-2222-2222-2222-222222222222	cccccccc-0000-0000-0000-000000000008	SolicitudCreada	Ruido Blanco solicitó tocar el 28 de noviembre de 2026, 20:00.	bbbbbbbb-0000-0000-0000-000000000004	correo	f	2026-10-27 17:40:04-06	2026-10-27 17:40:03-06
0a0d7b9b-295b-45fc-977d-822b73f578de	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000009	SolicitudCreada	Marea Lenta solicitó tocar el 13 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000005	app	t	\N	2026-10-10 11:00:03-06
0c6528af-ad28-4434-a486-db20ecc52713	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000009	SolicitudCreada	Marea Lenta solicitó tocar el 13 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000005	correo	f	2026-10-10 11:00:04-06	2026-10-10 11:00:03-06
08a31d87-579a-4884-ab32-343932459ed4	55555555-5555-5555-5555-555555555555	cccccccc-0000-0000-0000-000000000010	SolicitudAceptada	El Sótano Café aceptó tu solicitud para el 13 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000005	app	t	\N	2026-10-11 10:00:03-06
47f1a11f-4223-4e47-a548-203a7de5a56e	55555555-5555-5555-5555-555555555555	cccccccc-0000-0000-0000-000000000010	SolicitudAceptada	El Sótano Café aceptó tu solicitud para el 13 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000005	correo	f	2026-10-11 10:00:04-06	2026-10-11 10:00:03-06
2bccaa64-ad4b-4078-a58c-bd87ed7bc16c	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000011	SolicitudConfirmada	Marea Lenta confirmó su presentación del 13 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000005	app	t	\N	2026-10-11 13:30:03-06
d9518337-625b-4f56-b938-1c6874782b89	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000011	SolicitudConfirmada	Marea Lenta confirmó su presentación del 13 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000005	correo	f	2026-10-11 13:30:04-06	2026-10-11 13:30:03-06
86043567-7c13-4994-89e3-fa3edafc9bce	55555555-5555-5555-5555-555555555555	cccccccc-0000-0000-0000-000000000011	SolicitudConfirmada	Confirmaste tu presentación en El Sótano Café del 13 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000005	app	t	\N	2026-10-11 13:30:03-06
a355c806-78cf-47f3-884d-5761e686e431	55555555-5555-5555-5555-555555555555	cccccccc-0000-0000-0000-000000000011	SolicitudConfirmada	Confirmaste tu presentación en El Sótano Café del 13 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000005	correo	f	2026-10-11 13:30:04-06	2026-10-11 13:30:03-06
cb03f771-a5fb-4216-a1bd-fd8be5102d32	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000012	SolicitudCreada	Marea Lenta solicitó tocar el 20 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000006	app	t	\N	2026-10-12 16:00:03-06
ea4e8960-c565-4c01-b95d-a1c06a1f7663	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000012	SolicitudCreada	Marea Lenta solicitó tocar el 20 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000006	correo	f	2026-10-12 16:00:04-06	2026-10-12 16:00:03-06
0c04ce80-54d1-42ea-8ada-cef52f972660	55555555-5555-5555-5555-555555555555	cccccccc-0000-0000-0000-000000000013	SolicitudAceptada	El Sótano Café aceptó tu solicitud para el 20 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000006	app	t	\N	2026-10-13 09:45:03-06
381773cc-eec9-43a2-8912-2819e4cc1001	55555555-5555-5555-5555-555555555555	cccccccc-0000-0000-0000-000000000013	SolicitudAceptada	El Sótano Café aceptó tu solicitud para el 20 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000006	correo	f	2026-10-13 09:45:04-06	2026-10-13 09:45:03-06
fa68aeb9-4806-4dcc-9780-77ccda5aefd1	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000014	SolicitudCancelada	Marea Lenta canceló la presentación del 20 de noviembre de 2026, 19:00. Motivo: Uno de los integrantes no podrá asistir.	bbbbbbbb-0000-0000-0000-000000000006	app	f	\N	2026-10-22 08:10:03-06
fa1f7739-09c7-4c1e-93e1-4899b0f81255	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000014	SolicitudCancelada	Marea Lenta canceló la presentación del 20 de noviembre de 2026, 19:00. Motivo: Uno de los integrantes no podrá asistir.	bbbbbbbb-0000-0000-0000-000000000006	correo	f	2026-10-22 08:10:04-06	2026-10-22 08:10:03-06
b9cfb8ed-8938-4a0d-970d-1741055787dd	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000015	SolicitudCreada	Cuarto Oscuro solicitó tocar el 27 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000007	app	t	\N	2026-10-18 13:00:03-06
a85d61a4-6bb0-44d5-9de2-d8eaa26b1cb4	99999999-9999-9999-9999-999999999999	cccccccc-0000-0000-0000-000000000015	SolicitudCreada	Cuarto Oscuro solicitó tocar el 27 de noviembre de 2026, 19:00.	bbbbbbbb-0000-0000-0000-000000000007	correo	f	2026-10-18 13:00:04-06	2026-10-18 13:00:03-06
ad07efa5-564f-4a97-8c7a-13dbd897c801	66666666-6666-6666-6666-666666666666	cccccccc-0000-0000-0000-000000000016	SolicitudRechazada	El Sótano Café rechazó tu solicitud para el 27 de noviembre de 2026, 19:00. Motivo: Ya tenemos el cartel completo ese día.	bbbbbbbb-0000-0000-0000-000000000007	app	f	\N	2026-10-19 10:00:03-06
5ecb07e1-e874-40c4-a658-8ba605693c60	66666666-6666-6666-6666-666666666666	cccccccc-0000-0000-0000-000000000016	SolicitudRechazada	El Sótano Café rechazó tu solicitud para el 27 de noviembre de 2026, 19:00. Motivo: Ya tenemos el cartel completo ese día.	bbbbbbbb-0000-0000-0000-000000000007	correo	f	2026-10-19 10:00:04-06	2026-10-19 10:00:03-06
632ec133-7e77-4310-8af6-fe0fa8ab9560	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000017	SolicitudCreada	Sintonía Sur solicitó tocar el 15 de noviembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000008	app	t	\N	2026-10-17 19:00:03-06
1f63e45d-679f-418d-bbd9-3f1bb671e7ba	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000017	SolicitudCreada	Sintonía Sur solicitó tocar el 15 de noviembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000008	correo	f	2026-10-17 19:00:04-06	2026-10-17 19:00:03-06
8b3c0c6d-6250-42c8-878c-a96fed1968d3	77777777-7777-7777-7777-777777777777	cccccccc-0000-0000-0000-000000000018	SolicitudAceptada	Arena Norte aceptó tu solicitud para el 15 de noviembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000008	app	t	\N	2026-10-18 12:00:03-06
de3b2bac-ad8b-4561-9599-988ead12709a	77777777-7777-7777-7777-777777777777	cccccccc-0000-0000-0000-000000000018	SolicitudAceptada	Arena Norte aceptó tu solicitud para el 15 de noviembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000008	correo	f	2026-10-18 12:00:04-06	2026-10-18 12:00:03-06
e0f6baf2-18ed-4ce3-b6d1-1f2fdff0a9ce	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000019	SolicitudCreada	Cuarto Oscuro solicitó tocar el 22 de noviembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000009	app	f	\N	2026-10-26 09:30:03-06
b1905b9d-11e3-4d0c-961c-c93433956918	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000019	SolicitudCreada	Cuarto Oscuro solicitó tocar el 22 de noviembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000009	correo	f	2026-10-26 09:30:04-06	2026-10-26 09:30:03-06
32ab7f5c-6e04-46fa-8fa3-b976c48eea4e	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000020	SolicitudCreada	Ruido Blanco solicitó tocar el 22 de noviembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000010	app	f	\N	2026-10-26 21:00:03-06
ad907e86-46ff-4112-9905-eb16c31fcbbd	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000020	SolicitudCreada	Ruido Blanco solicitó tocar el 22 de noviembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000010	correo	f	2026-10-26 21:00:04-06	2026-10-26 21:00:03-06
c82730f4-180b-4c9c-ae08-6cf139d73616	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000021	SolicitudCreada	Los Desvelados solicitó tocar el 6 de diciembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000011	app	t	\N	2026-10-23 15:00:03-06
6b712aaf-4013-42f0-b701-06570e2e2ae3	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000021	SolicitudCreada	Los Desvelados solicitó tocar el 6 de diciembre de 2026, 18:00.	bbbbbbbb-0000-0000-0000-000000000011	correo	f	2026-10-23 15:00:04-06	2026-10-23 15:00:03-06
9891fd1f-c8d3-4a81-956d-e95cef79130f	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000022	SolicitudCancelada	Los Desvelados canceló la presentación del 6 de diciembre de 2026, 18:00. Motivo: Conseguimos otra fecha.	bbbbbbbb-0000-0000-0000-000000000011	app	f	\N	2026-10-24 11:00:03-06
6c992665-19b5-496c-abfe-f470c8c2af5f	dddddddd-dddd-dddd-dddd-dddddddddddd	cccccccc-0000-0000-0000-000000000022	SolicitudCancelada	Los Desvelados canceló la presentación del 6 de diciembre de 2026, 18:00. Motivo: Conseguimos otra fecha.	bbbbbbbb-0000-0000-0000-000000000011	correo	f	2026-10-24 11:00:04-06	2026-10-24 11:00:03-06
\.


--
-- Name: contacto contacto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."contacto"
    ADD CONSTRAINT "contacto_pkey" PRIMARY KEY ("usuario_id");


--
-- Name: notificacion notificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notificacion"
    ADD CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id");


--
-- Name: notificacion uq_notificacion_evento; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notificacion"
    ADD CONSTRAINT "uq_notificacion_evento" UNIQUE ("evento_id", "usuario_id", "canal");


--
-- Name: ix_notificacion_bandeja; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ix_notificacion_bandeja" ON "public"."notificacion" USING "btree" ("usuario_id", "creado_en" DESC) WHERE ("canal" = 'app'::"public"."canal_notificacion");


--
-- Name: contacto tg_contacto_actualizado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "tg_contacto_actualizado" BEFORE UPDATE ON "public"."contacto" FOR EACH ROW EXECUTE FUNCTION "public"."fijar_actualizado_en"();


--
-- Name: notificacion notificacion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notificacion"
    ADD CONSTRAINT "notificacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."contacto"("usuario_id");


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "svc_notificaciones";


--
-- Name: TABLE "contacto"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE "public"."contacto" TO "svc_notificaciones";


--
-- Name: TABLE "notificacion"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE "public"."notificacion" TO "svc_notificaciones";


--
-- PostgreSQL database dump complete
--

\unrestrict Dwg913NjFasn9RYzvmU6Cq5Gk57t1L3bMqIQkDXDGCwz4uaaudMWsRdFVDNHlw2

