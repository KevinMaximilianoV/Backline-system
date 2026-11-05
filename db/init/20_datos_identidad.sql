-- =====================================================================
-- Backline · 20 · Datos de prueba de backline_identidad
-- 10 usuarios: 1 administrador, 6 bandas (1 suspendida) y 3 foros.
-- Generado; no editar a mano.
-- =====================================================================
\connect backline_identidad

BEGIN;

INSERT INTO usuario (id, correo, hash_contrasena, rol, estado, creado_en, actualizado_en) VALUES
  ('33333333-3333-3333-3333-333333333333', 'admin@backline.mx', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal00', 'admin', 'activa', '2026-10-01T09:00:00-06:00', '2026-10-01T09:00:00-06:00'),
  ('11111111-1111-1111-1111-111111111111', 'desvelados@correo.com', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal01', 'banda', 'activa', '2026-10-02T10:00:00-06:00', '2026-10-02T10:00:00-06:00'),
  ('44444444-4444-4444-4444-444444444444', 'ruidoblanco@correo.com', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal02', 'banda', 'activa', '2026-10-02T11:00:00-06:00', '2026-10-02T11:00:00-06:00'),
  ('55555555-5555-5555-5555-555555555555', 'marealenta@correo.com', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal03', 'banda', 'activa', '2026-10-02T12:00:00-06:00', '2026-10-02T12:00:00-06:00'),
  ('66666666-6666-6666-6666-666666666666', 'cuartooscuro@correo.com', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal04', 'banda', 'activa', '2026-10-02T13:00:00-06:00', '2026-10-02T13:00:00-06:00'),
  ('77777777-7777-7777-7777-777777777777', 'sintoniasur@correo.com', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal05', 'banda', 'activa', '2026-10-02T14:00:00-06:00', '2026-10-02T14:00:00-06:00'),
  ('88888888-8888-8888-8888-888888888888', 'ecopolar@correo.com', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal06', 'banda', 'suspendida', '2026-10-02T15:00:00-06:00', '2026-10-02T15:00:00-06:00'),
  ('22222222-2222-2222-2222-222222222222', 'labodega@correo.com', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal07', 'foro', 'activa', '2026-10-03T10:00:00-06:00', '2026-10-03T10:00:00-06:00'),
  ('99999999-9999-9999-9999-999999999999', 'elsotano@correo.com', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal08', 'foro', 'activa', '2026-10-03T11:00:00-06:00', '2026-10-03T11:00:00-06:00'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'arenanorte@correo.com', '$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal09', 'foro', 'activa', '2026-10-03T12:00:00-06:00', '2026-10-03T12:00:00-06:00');

INSERT INTO evento_pendiente (id, tipo, payload, creado_en, publicado_en) VALUES
  ('bbbb0000-0000-0000-0000-000000000001', 'UsuarioRegistrado', '{"usuarioId": "33333333-3333-3333-3333-333333333333", "correo": "admin@backline.mx", "rol": "admin"}'::jsonb, '2026-10-01T09:00:00-06:00', '2026-10-01T09:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000002', 'UsuarioRegistrado', '{"usuarioId": "11111111-1111-1111-1111-111111111111", "correo": "desvelados@correo.com", "rol": "banda"}'::jsonb, '2026-10-02T10:00:00-06:00', '2026-10-02T10:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000003', 'UsuarioRegistrado', '{"usuarioId": "44444444-4444-4444-4444-444444444444", "correo": "ruidoblanco@correo.com", "rol": "banda"}'::jsonb, '2026-10-02T11:00:00-06:00', '2026-10-02T11:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000004', 'UsuarioRegistrado', '{"usuarioId": "55555555-5555-5555-5555-555555555555", "correo": "marealenta@correo.com", "rol": "banda"}'::jsonb, '2026-10-02T12:00:00-06:00', '2026-10-02T12:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000005', 'UsuarioRegistrado', '{"usuarioId": "66666666-6666-6666-6666-666666666666", "correo": "cuartooscuro@correo.com", "rol": "banda"}'::jsonb, '2026-10-02T13:00:00-06:00', '2026-10-02T13:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000006', 'UsuarioRegistrado', '{"usuarioId": "77777777-7777-7777-7777-777777777777", "correo": "sintoniasur@correo.com", "rol": "banda"}'::jsonb, '2026-10-02T14:00:00-06:00', '2026-10-02T14:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000007', 'UsuarioRegistrado', '{"usuarioId": "88888888-8888-8888-8888-888888888888", "correo": "ecopolar@correo.com", "rol": "banda"}'::jsonb, '2026-10-02T15:00:00-06:00', '2026-10-02T15:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000008', 'UsuarioRegistrado', '{"usuarioId": "22222222-2222-2222-2222-222222222222", "correo": "labodega@correo.com", "rol": "foro"}'::jsonb, '2026-10-03T10:00:00-06:00', '2026-10-03T10:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000009', 'UsuarioRegistrado', '{"usuarioId": "99999999-9999-9999-9999-999999999999", "correo": "elsotano@correo.com", "rol": "foro"}'::jsonb, '2026-10-03T11:00:00-06:00', '2026-10-03T11:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000010', 'UsuarioRegistrado', '{"usuarioId": "dddddddd-dddd-dddd-dddd-dddddddddddd", "correo": "arenanorte@correo.com", "rol": "foro"}'::jsonb, '2026-10-03T12:00:00-06:00', '2026-10-03T12:00:02-06:00'),
  ('bbbb0000-0000-0000-0000-000000000011', 'UsuarioSuspendido', '{"usuarioId": "88888888-8888-8888-8888-888888888888"}'::jsonb, '2026-10-25T16:00:00-06:00', '2026-10-25T16:00:02-06:00');

COMMIT;
