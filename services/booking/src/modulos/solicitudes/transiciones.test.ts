import { describe, expect, it } from "vitest";
import { esPermitida, permitidas, type EstadoSolicitud } from "./transiciones";

/**
 * La máquina de estados completa (Figura 8): se prueban las 60 combinaciones
 * de rol × estado actual × estado nuevo, no solo los casos felices.
 */
const ESTADOS: EstadoSolicitud[] = ["solicitada", "aceptada", "rechazada", "confirmada", "cancelada"];
const DESTINOS: EstadoSolicitud[] = ["aceptada", "rechazada", "confirmada", "cancelada"];

const ESPERADO = new Set([
  "foro:solicitada:aceptada",
  "foro:solicitada:rechazada",
  "foro:aceptada:cancelada",
  "foro:confirmada:cancelada",
  "banda:solicitada:cancelada",
  "banda:aceptada:confirmada",
  "banda:aceptada:cancelada",
  "banda:confirmada:cancelada",
]);

describe("máquina de estados de la solicitud", () => {
  for (const rol of ["banda", "foro", "admin"] as const) {
    for (const actual of ESTADOS) {
      for (const nuevo of DESTINOS) {
        const clave = `${rol}:${actual}:${nuevo}`;
        const debe = ESPERADO.has(clave);
        it(`${rol}: ${actual} → ${nuevo} ${debe ? "permitida" : "rechazada"}`, () => {
          expect(esPermitida(rol, actual, nuevo)).toBe(debe);
        });
      }
    }
  }

  it("rechazada y cancelada son finales para todos", () => {
    for (const rol of ["banda", "foro", "admin"] as const) {
      expect(permitidas(rol, "rechazada")).toEqual([]);
      expect(permitidas(rol, "cancelada")).toEqual([]);
    }
  });

  it("nadie puede regresar una solicitud a solicitada", () => {
    for (const rol of ["banda", "foro", "admin"] as const) for (const e of ESTADOS) expect(esPermitida(rol, e, "solicitada")).toBe(false);
  });
});
