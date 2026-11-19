# Una imagen por servicio, construida con este mismo archivo:
#   docker build --build-arg SERVICIO=booking -t backline-booking .
# docker compose --profile completo lo hace para los cuatro servicios.
#
# Dos etapas: la primera instala todo y compila TypeScript; la segunda solo copia lo que se
# ejecuta (JavaScript compilado y dependencias de producción). La imagen final no tiene
# compilador, código fuente, dependencias de desarrollo ni secretos.

ARG NODE_IMAGE=node:22-alpine

# ---------------------------------------------------------------- 1. construcción
FROM ${NODE_IMAGE} AS construccion
WORKDIR /app

# Primero solo los package.json: si el código cambia pero las dependencias no,
# Docker reutiliza esta capa y no vuelve a descargar nada.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/comun/package.json packages/comun/
COPY services/identidad/package.json services/identidad/
COPY services/perfiles/package.json services/perfiles/
COPY services/booking/package.json services/booking/
COPY services/gateway/package.json services/gateway/
RUN npm ci --ignore-scripts --no-audit --no-fund

ARG SERVICIO
COPY packages/comun packages/comun
COPY services/${SERVICIO} services/${SERVICIO}
RUN test -n "${SERVICIO}" \
 && npm run build -w @backline/comun \
 && npm run build -w @backline/${SERVICIO} \
 && npm prune --omit=dev --ignore-scripts --no-audit --no-fund \
 && mkdir -p packages/comun/node_modules services/${SERVICIO}/node_modules

# ---------------------------------------------------------------- 2. ejecución
FROM ${NODE_IMAGE}
ARG SERVICIO
ENV NODE_ENV=production
WORKDIR /app

COPY --from=construccion /app/package.json ./
# npm no siempre sube todas las dependencias a la raíz: si dos paquetes piden versiones
# distintas (jose 4 para newman, jose 6 para nosotros), una queda dentro del paquete que la
# usa. Por eso se copian también los node_modules de comun y del servicio (defecto D9).
COPY --from=construccion /app/node_modules ./node_modules
COPY --from=construccion /app/packages/comun/package.json packages/comun/
COPY --from=construccion /app/packages/comun/node_modules packages/comun/node_modules
COPY --from=construccion /app/packages/comun/dist packages/comun/dist
COPY --from=construccion /app/services/${SERVICIO}/package.json services/${SERVICIO}/
COPY --from=construccion /app/services/${SERVICIO}/node_modules services/${SERVICIO}/node_modules
COPY --from=construccion /app/services/${SERVICIO}/dist services/${SERVICIO}/dist
# El Gateway publica el contrato en /docs
COPY docs/openapi.yaml docs/openapi.yaml

WORKDIR /app/services/${SERVICIO}
# Nunca como root: si alguien lograra ejecutar código en el contenedor, no sería administrador
USER node
CMD ["node", "dist/server.js"]
