import { iniciarServidor } from "@backline/comun";
import { crearAppPerfiles } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";

iniciarServidor({ app: crearAppPerfiles(), puerto: env.PORT, servicio: "perfiles", entorno: env.NODE_ENV, pool });
