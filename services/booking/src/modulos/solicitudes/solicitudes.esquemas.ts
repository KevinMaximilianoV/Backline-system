import { paginacionQuery, textoOpcional, uuid } from "@backline/comun";
import { z } from "zod";

/** Esquemas de solicitudes. Reflejan docs/openapi.yaml y los CHECK de db/init/12_esquema_booking.sql. */

export const solicitudParams = z.object({ solicitudId: uuid });
export const cambioParams = solicitudParams.extend({ cambioId: uuid });

/**
 * Las condiciones económicas dependen del tipo de acuerdo:
 * - pago_fijo: monto en pesos, sin porcentaje;
 * - porcentaje_taquilla: porcentaje de 1 a 100, sin monto;
 * - a_convenir: ni monto ni porcentaje.
 * La base tiene el mismo CHECK (ck_solicitud_acuerdo): validar aquí da un mensaje claro; el CHECK protege la base.
 */
export const solicitudNuevaBody = z
  .object({
    franjaId: uuid,
    tipoAcuerdo: z.enum(["pago_fijo", "porcentaje_taquilla", "a_convenir"]),
    montoMxn: z.number().positive().max(99_999_999.99).multipleOf(0.01, "Máximo dos decimales.").optional(),
    porcentaje: z.number().int().min(1).max(100).optional(),
    notas: textoOpcional(500),
  })
  .strict()
  .superRefine((s, ctx) => {
    const requiere = (campo: "montoMxn" | "porcentaje", mensaje: string) =>
      ctx.addIssue({ code: "custom", path: [campo], message: mensaje });
    if (s.tipoAcuerdo === "pago_fijo") {
      if (s.montoMxn === undefined) requiere("montoMxn", "Con pago fijo, indica el monto en pesos.");
      if (s.porcentaje !== undefined) requiere("porcentaje", "Con pago fijo no se envía porcentaje.");
    }
    if (s.tipoAcuerdo === "porcentaje_taquilla") {
      if (s.porcentaje === undefined) requiere("porcentaje", "Con porcentaje de taquilla, indica el porcentaje.");
      if (s.montoMxn !== undefined) requiere("montoMxn", "Con porcentaje de taquilla no se envía monto.");
    }
    if (s.tipoAcuerdo === "a_convenir") {
      if (s.montoMxn !== undefined) requiere("montoMxn", "Con acuerdo a convenir no se envía monto.");
      if (s.porcentaje !== undefined) requiere("porcentaje", "Con acuerdo a convenir no se envía porcentaje.");
    }
  });

export const listarSolicitudesQuery = paginacionQuery.extend({
  estado: z.enum(["solicitada", "aceptada", "rechazada", "confirmada", "cancelada"]).optional(),
  franjaId: uuid.optional(),
});

export const cambioEstadoBody = z
  .object({
    estadoNuevo: z.enum(["aceptada", "rechazada", "confirmada", "cancelada"]),
    motivo: z.string().trim().min(1).max(300).optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    // Quien cancela un compromiso tiene que explicar por qué (la base lo exige con ck_cancelacion_con_motivo)
    if (c.estadoNuevo === "cancelada" && !c.motivo) {
      ctx.addIssue({ code: "custom", path: ["motivo"], message: "Para cancelar, indica el motivo." });
    }
  });

export type SolicitudNueva = z.infer<typeof solicitudNuevaBody>;
export type ListarSolicitudes = z.infer<typeof listarSolicitudesQuery>;
export type CambioEstadoNuevo = z.infer<typeof cambioEstadoBody>;
