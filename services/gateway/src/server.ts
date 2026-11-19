import { iniciarServidor } from "@backline/comun";
import { crearAppGateway } from "./app";
import { env } from "./config/env";

iniciarServidor({ app: crearAppGateway(), puerto: env.PORT, servicio: "gateway", entorno: env.NODE_ENV });
