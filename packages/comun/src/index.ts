/**
 * @backline/comun: el "chasis" de los servicios de Backline.
 *
 * Reúne lo que todos los servicios hacen igual: formato de errores, validación,
 * correlación, registro, autenticación con JWT, acceso a PostgreSQL y llamadas
 * entre servicios. Lo propio de cada dominio (bandas, franjas, solicitudes) NO va aquí:
 * si este paquete empieza a saber de negocio, los servicios quedan acoplados.
 */
export { ApiError, type CodigoError, type ErrorCampo } from "./errores/ApiError";
export { traducirErroresZod } from "./errores/traducirZod";
export {
  esCheckViolado,
  esErrorDeConexion,
  esExclusionViolada,
  esLlaveForaneaInvalida,
  esValorDuplicado,
  restriccion,
} from "./errores/erroresBaseDatos";
export { correlacion } from "./http/correlacion";
export { registroPeticiones } from "./http/registro";
export { validar, validado } from "./http/validar";
export { manejadorErrores, rutaNoEncontrada } from "./http/errores";
export { crearApp, iniciarServidor } from "./http/app";
export { crearClienteServicio, type ClienteServicio } from "./http/clienteServicio";
export {
  crearAutenticacion,
  exigirDueno,
  JWT,
  leerLlave,
  requerirRol,
  usuarioActual,
  type Rol,
  type UsuarioAutenticado,
} from "./auth/jwt";
export { crearBaseDatos, type BaseDatos, type Ejecutor } from "./db/baseDatos";
export { leerEntorno, variables } from "./config/entorno";
export { fecha, instante, limites, paginacionQuery, textoOpcional, uuid, type Pagina } from "./esquemas";
