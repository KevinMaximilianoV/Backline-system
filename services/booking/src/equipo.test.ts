import { describe, expect, it } from "vitest";
import { calcularFaltantes } from "./equipo";
import { solicitudNuevaBody } from "./modulos/solicitudes/solicitudes.esquemas";

const e = (tipoEquipoId: number, cantidad: number) => ({ tipoEquipoId, tipoEquipo: `Equipo ${tipoEquipoId}`, cantidad });

describe("calcularFaltantes (RF-10)", () => {
  it("lista solo lo que el foro no cubre, con cuánto falta", () => {
    const f = calcularFaltantes([e(3, 3), e(1, 1), e(9, 1)], [e(1, 2), e(3, 1)]);
    expect(f).toEqual([
      { tipoEquipoId: 3, tipoEquipo: "Equipo 3", requerido: 3, disponible: 1, faltan: 2 },
      { tipoEquipoId: 9, tipoEquipo: "Equipo 9", requerido: 1, disponible: 0, faltan: 1 },
    ]);
  });

  it("rider cubierto o vacío: sin faltantes", () => {
    expect(calcularFaltantes([e(1, 1)], [e(1, 5)])).toEqual([]);
    expect(calcularFaltantes([], [e(1, 5)])).toEqual([]);
  });

  it("inventario vacío: falta todo el rider", () => {
    expect(calcularFaltantes([e(2, 1)], []).map((f) => f.faltan)).toEqual([1]);
  });
});

describe("condiciones económicas de una solicitud (RN-16)", () => {
  const FRANJA = "aaaaaaaa-0000-0000-0000-000000000001";
  const valida = (s: object) => solicitudNuevaBody.safeParse({ franjaId: FRANJA, ...s }).success;

  it.each([
    [{ tipoAcuerdo: "pago_fijo", montoMxn: 1500 }, true],
    [{ tipoAcuerdo: "pago_fijo", montoMxn: 1500.5 }, true],
    [{ tipoAcuerdo: "pago_fijo" }, false],
    [{ tipoAcuerdo: "pago_fijo", montoMxn: 0 }, false],
    [{ tipoAcuerdo: "pago_fijo", montoMxn: 10.001 }, false],
    [{ tipoAcuerdo: "pago_fijo", montoMxn: 1500, porcentaje: 10 }, false],
    [{ tipoAcuerdo: "porcentaje_taquilla", porcentaje: 60 }, true],
    [{ tipoAcuerdo: "porcentaje_taquilla", porcentaje: 101 }, false],
    [{ tipoAcuerdo: "porcentaje_taquilla", montoMxn: 100 }, false],
    [{ tipoAcuerdo: "a_convenir" }, true],
    [{ tipoAcuerdo: "a_convenir", montoMxn: 100 }, false],
    [{ tipoAcuerdo: "trueque" }, false],
  ])("%j → %s", (datos, esperado) => {
    expect(valida(datos)).toBe(esperado);
  });

  it("el cliente no puede mandar sus propios faltantes", () => {
    expect(valida({ tipoAcuerdo: "a_convenir", faltantes: [] })).toBe(false);
  });
});
