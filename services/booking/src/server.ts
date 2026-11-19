import { iniciarServidor } from "@backline/comun";
import { crearAppBooking } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";

iniciarServidor({ app: crearAppBooking(), puerto: env.PORT, servicio: "booking", entorno: env.NODE_ENV, pool });
