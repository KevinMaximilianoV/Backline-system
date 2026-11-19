import { iniciarServidor } from "@backline/comun";
import { crearAppIdentidad } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";

iniciarServidor({ app: crearAppIdentidad(), puerto: env.PORT, servicio: "identidad", entorno: env.NODE_ENV, pool });
