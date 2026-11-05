-- =====================================================================
-- Backline · Verificación de la base de datos
-- Ejecutar después de crear las bases:
--   docker compose exec -T postgres psql -U postgres -f /verificacion/verificar.sql
-- Parte 1: consultas que reproducen operaciones de la API (V01 a V16).
-- Parte 2: pruebas que intentan romper las restricciones (P01 a P15).
--          Cada prueba imprime OK o FALLO y deshace sus cambios.
-- =====================================================================
\set ON_ERROR_STOP on
\pset footer off
\pset null '(nulo)'

-- ===================================================== PARTE 1 · Consultas
\connect backline_identidad
\echo '\n== V01 · Usuarios por rol y estado (E-04)'
SELECT rol, estado, count(*) AS usuarios
  FROM usuario GROUP BY rol, estado ORDER BY rol, estado;

\connect backline_perfiles
\echo '\n== V02 · Perfil de Los Desvelados con géneros y rider (E-09, E-11)'
SELECT b.nombre AS banda, b.integrantes,
       string_agg(DISTINCT g.nombre, ', ') AS generos,
       (SELECT string_agg(t.nombre || ' x' || r.cantidad, ', ' ORDER BY t.id)
          FROM rider_requisito r JOIN tipo_equipo t ON t.id = r.tipo_equipo_id
         WHERE r.banda_id = b.id) AS rider
  FROM banda b
  JOIN banda_genero bg ON bg.banda_id = b.id
  JOIN genero g ON g.id = bg.genero_id
 WHERE b.id = '11111111-1111-1111-1111-111111111111'
 GROUP BY b.id, b.nombre, b.integrantes;

\echo '\n== V03 · Foros visibles que programan Metal (E-14 con ?genero=2)'
SELECT f.nombre, f.capacidad
  FROM foro f JOIN foro_genero fg ON fg.foro_id = f.id
 WHERE f.visible AND fg.genero_id = 2
 ORDER BY f.nombre;

\echo '\n== V04 · Compatibilidad: unidades de equipo que le faltan a cada banda en cada foro (E-23)'
SELECT b.nombre AS banda, f.nombre AS foro,
       COALESCE(sum(GREATEST(r.cantidad - COALESCE(i.cantidad, 0), 0)), 0) AS unidades_faltantes
  FROM banda b
  CROSS JOIN foro f
  JOIN rider_requisito r ON r.banda_id = b.id
  LEFT JOIN inventario_item i ON i.foro_id = f.id AND i.tipo_equipo_id = r.tipo_equipo_id
 WHERE b.visible
 GROUP BY b.nombre, f.nombre
 ORDER BY b.nombre, unidades_faltantes;

\echo '\n== V05 · Detalle de faltantes de Los Desvelados en Foro La Bodega (E-23)'
SELECT t.nombre AS equipo, r.cantidad AS requerido, COALESCE(i.cantidad, 0) AS disponible,
       r.cantidad - COALESCE(i.cantidad, 0) AS faltan
  FROM rider_requisito r
  JOIN tipo_equipo t ON t.id = r.tipo_equipo_id
  LEFT JOIN inventario_item i ON i.tipo_equipo_id = r.tipo_equipo_id
                             AND i.foro_id = '22222222-2222-2222-2222-222222222222'
 WHERE r.banda_id = '11111111-1111-1111-1111-111111111111'
   AND r.cantidad > COALESCE(i.cantidad, 0);

\echo '\n== V06 · Perfiles ocultos por cuenta suspendida (RF-18)'
SELECT 'banda' AS tipo, nombre FROM banda WHERE NOT visible
UNION ALL
SELECT 'foro', nombre FROM foro WHERE NOT visible;

\connect backline_booking
\echo '\n== V07 · Disponibilidad del 22 de noviembre: franjas libres (E-30, parte de Booking)'
SELECT foro_id, to_char(inicio AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') AS inicio,
       to_char(fin AT TIME ZONE 'America/Mexico_City', 'HH24:MI') AS fin
  FROM franja
 WHERE estado = 'libre'
   AND inicio >= '2026-11-22T00:00:00-06:00' AND inicio < '2026-11-23T00:00:00-06:00';

\echo '\n== V08 · Agenda de Foro La Bodega (E-20 con ?foroId=), incluida la franja que cruza la medianoche'
SELECT to_char(inicio AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') AS inicio,
       to_char(fin    AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') AS fin, estado
  FROM franja
 WHERE foro_id = '22222222-2222-2222-2222-222222222222'
 ORDER BY inicio;

\echo '\n== V09 · Franjas por estado, incluida la retirada (borrado lógico, RF-19)'
SELECT estado, count(*) AS franjas FROM franja GROUP BY estado ORDER BY estado;

\echo '\n== V10 · Solicitudes por estado (E-25)'
SELECT estado, count(*) AS solicitudes FROM solicitud GROUP BY estado ORDER BY estado;

\echo '\n== V11 · Solicitudes de Ruido Blanco, de la más reciente a la más antigua (E-25 como banda)'
SELECT foro_nombre, to_char(f.inicio AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') AS fecha,
       s.tipo_acuerdo, s.estado, jsonb_array_length(s.faltantes) AS equipos_faltantes
  FROM solicitud s JOIN franja f ON f.id = s.franja_id
 WHERE s.banda_id = '44444444-4444-4444-4444-444444444444'
 ORDER BY s.creado_en DESC;

\echo '\n== V12 · Historial de la solicitud S06: aceptada y luego cancelada por la banda (E-27)'
SELECT to_char(creado_en AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') AS cuando,
       estado_anterior, estado_nuevo, motivo
  FROM cambio_estado
 WHERE solicitud_id = 'bbbbbbbb-0000-0000-0000-000000000006'
 ORDER BY creado_en;

\echo '\n== V13 · Integridad: cada franja reservada tiene exactamente una solicitud aceptada o confirmada (debe salir vacío)'
SELECT f.id, f.estado, count(s.id) AS solicitudes_vigentes
  FROM franja f
  LEFT JOIN solicitud s ON s.franja_id = f.id AND s.estado IN ('aceptada', 'confirmada')
 GROUP BY f.id, f.estado
HAVING (f.estado = 'reservada') <> (count(s.id) = 1);

\echo '\n== V14 · Integridad: el último cambio del historial coincide con el estado de la solicitud (debe salir vacío)'
SELECT s.id, s.estado, u.estado_nuevo AS ultimo_cambio
  FROM solicitud s
  JOIN LATERAL (SELECT estado_nuevo FROM cambio_estado c
                 WHERE c.solicitud_id = s.id ORDER BY c.creado_en DESC LIMIT 1) u ON TRUE
 WHERE u.estado_nuevo <> s.estado;

\echo '\n== V15 · Outbox: eventos aún no publicados en RabbitMQ'
SELECT tipo, payload ->> 'bandaNombre' AS banda, creado_en FROM evento_pendiente WHERE publicado_en IS NULL;

\connect backline_notificaciones
\echo '\n== V16 · Notificaciones no leídas en la app por usuario (E-31, campo noLeidas)'
SELECT c.correo, count(*) AS no_leidas
  FROM notificacion n JOIN contacto c ON c.usuario_id = n.usuario_id
 WHERE n.canal = 'app' AND NOT n.leida
 GROUP BY c.correo ORDER BY no_leidas DESC, c.correo;

-- ===================================================== PARTE 2 · Restricciones
\echo '\n== PRUEBAS DE RESTRICCIONES (cada una debe imprimir OK)'

\connect backline_identidad
DO $$ BEGIN
    INSERT INTO usuario (correo, hash_contrasena, rol) VALUES ('DESVELADOS@correo.com', 'x', 'banda');
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN unique_violation THEN RAISE NOTICE 'P01 OK · correo duplicado con mayúsculas rechazado (ux_usuario_correo)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P01 FALLO · se aceptó un correo duplicado';
END $$;

\connect backline_perfiles
DO $$ BEGIN
    INSERT INTO rider_requisito (banda_id, tipo_equipo_id, cantidad)
    VALUES ('11111111-1111-1111-1111-111111111111', 12, 11);
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN check_violation THEN RAISE NOTICE 'P02 OK · cantidad 11 en el rider rechazada (máximo 10)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P02 FALLO · se aceptó cantidad 11';
END $$;

DO $$ BEGIN
    INSERT INTO rider_requisito (banda_id, tipo_equipo_id, cantidad)
    VALUES ('11111111-1111-1111-1111-111111111111', 5, 1);
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN unique_violation THEN RAISE NOTICE 'P03 OK · tipo de equipo repetido en el rider rechazado (uq_rider_banda_equipo)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P03 FALLO · se aceptó un tipo de equipo repetido';
END $$;

DO $$ BEGIN
    INSERT INTO banda_genero (banda_id, genero_id) VALUES ('11111111-1111-1111-1111-111111111111', 99);
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN foreign_key_violation THEN RAISE NOTICE 'P04 OK · género inexistente rechazado (FK a genero)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P04 FALLO · se aceptó un género inexistente';
END $$;

\connect backline_booking
DO $$ BEGIN
    INSERT INTO franja (foro_id, inicio, fin)
    VALUES ('22222222-2222-2222-2222-222222222222', '2026-11-14T22:00:00-06:00', '2026-11-15T00:30:00-06:00');
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN exclusion_violation THEN RAISE NOTICE 'P05 OK · franja encimada con otra del mismo foro rechazada (ex_franja_sin_traslape)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P05 FALLO · se aceptó una franja encimada';
END $$;

DO $$ BEGIN
    INSERT INTO franja (foro_id, inicio, fin)
    VALUES ('22222222-2222-2222-2222-222222222222', '2026-12-10T08:00:00-06:00', '2026-12-10T21:00:00-06:00');
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN check_violation THEN RAISE NOTICE 'P06 OK · franja de 13 horas rechazada (ck_franja_duracion)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P06 FALLO · se aceptó una franja de 13 horas';
END $$;

DO $$ BEGIN
    UPDATE solicitud SET estado = 'aceptada' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002';
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN unique_violation THEN RAISE NOTICE 'P07 OK · segunda aceptación en una franja reservada rechazada (ux_solicitud_franja_reservada)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P07 FALLO · doble reserva aceptada';
END $$;

DO $$ BEGIN
    INSERT INTO solicitud (franja_id, foro_id, banda_id, banda_nombre, foro_nombre, tipo_acuerdo,
                           rider_snapshot, inventario_snapshot)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000010', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            '55555555-5555-5555-5555-555555555555', 'Marea Lenta', 'Arena Norte', 'pago_fijo', '[]', '[]');
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN check_violation THEN RAISE NOTICE 'P08 OK · pago fijo sin monto rechazado (ck_solicitud_acuerdo)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P08 FALLO · se aceptó un pago fijo sin monto';
END $$;

DO $$ BEGIN
    INSERT INTO solicitud (franja_id, foro_id, banda_id, banda_nombre, foro_nombre, tipo_acuerdo,
                           rider_snapshot, inventario_snapshot)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000010', '22222222-2222-2222-2222-222222222222',
            '55555555-5555-5555-5555-555555555555', 'Marea Lenta', 'Foro La Bodega', 'a_convenir', '[]', '[]');
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN foreign_key_violation THEN RAISE NOTICE 'P09 OK · solicitud con un foro distinto al de su franja rechazada (fk_solicitud_franja)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P09 FALLO · se aceptó un foro distinto al de la franja';
END $$;

DO $$ BEGIN
    INSERT INTO cambio_estado (solicitud_id, estado_anterior, estado_nuevo)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aceptada', 'cancelada');
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN check_violation THEN RAISE NOTICE 'P10 OK · cancelación sin motivo rechazada (ck_cancelacion_con_motivo)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P10 FALLO · se aceptó una cancelación sin motivo';
END $$;

DO $$ BEGIN
    UPDATE franja SET estado = 'retirada', retirada_en = now() WHERE id = 'aaaaaaaa-0000-0000-0000-000000000009';
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN check_violation THEN RAISE NOTICE 'P11 OK · retiro de una franja con solicitudes pendientes rechazado (tg_franja_retiro)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P11 FALLO · se retiró una franja con solicitudes pendientes';
END $$;

-- P12 es una prueba positiva: retirar una franja libera su horario
DO $$
DECLARE nueva UUID;
BEGIN
    UPDATE franja SET estado = 'retirada', retirada_en = now() WHERE id = 'aaaaaaaa-0000-0000-0000-000000000010';
    INSERT INTO franja (foro_id, inicio, fin)
    VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-11-29T19:00:00-06:00', '2026-11-29T22:00:00-06:00')
    RETURNING id INTO nueva;
    RAISE EXCEPTION USING ERRCODE = 'P0098';   -- deshace la prueba
EXCEPTION
    WHEN SQLSTATE 'P0098' THEN RAISE NOTICE 'P12 OK · al retirar una franja, su horario se puede volver a publicar';
    WHEN exclusion_violation THEN RAISE NOTICE 'P12 FALLO · la franja retirada sigue bloqueando su horario';
END $$;

-- P13 se ejecuta con el usuario del servicio, no con el superusuario
SET ROLE svc_booking;
DO $$ BEGIN
    UPDATE cambio_estado SET motivo = 'editado' WHERE solicitud_id = 'bbbbbbbb-0000-0000-0000-000000000006';
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN insufficient_privilege THEN RAISE NOTICE 'P13 OK · el servicio Booking no puede modificar el historial (solo INSERT y SELECT)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P13 FALLO · el historial se pudo modificar';
END $$;
DO $$ BEGIN
    DELETE FROM franja WHERE id = 'aaaaaaaa-0000-0000-0000-000000000011';
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN insufficient_privilege THEN RAISE NOTICE 'P14 OK · el servicio Booking no puede borrar franjas (borrado lógico obligatorio)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P14 FALLO · se pudo borrar una franja';
END $$;
RESET ROLE;

\connect backline_notificaciones
DO $$ BEGIN
    INSERT INTO notificacion (usuario_id, evento_id, tipo, mensaje, canal)
    SELECT usuario_id, evento_id, tipo, mensaje, canal FROM notificacion LIMIT 1;
    RAISE EXCEPTION USING ERRCODE = 'P0099';
EXCEPTION
    WHEN unique_violation THEN RAISE NOTICE 'P15 OK · notificación duplicada del mismo evento rechazada (uq_notificacion_evento)';
    WHEN SQLSTATE 'P0099' THEN RAISE NOTICE 'P15 FALLO · se aceptó una notificación duplicada';
END $$;

\echo '\n== Verificación terminada'
