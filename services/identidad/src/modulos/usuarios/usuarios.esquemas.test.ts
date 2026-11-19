import { describe, expect, it } from "vitest";
import { registroBody } from "./usuarios.esquemas";

const CLAVE = "Escenario2026";

describe("reglas de las credenciales", () => {
  it.each([
    ["corta", "abc12", "Debe tener al menos 8"],
    ["sin números", "soloLetrasAqui", "letras y números"],
    ["sin letras", "1234567890", "letras y números"],
    ["más de 72 bytes", "ñ".repeat(37) + "1", "72 bytes"],
  ])("rechaza una contraseña %s", (_caso, contrasena, mensaje) => {
    const r = registroBody.safeParse({ correo: "a@b.mx", contrasena, rol: "banda" });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain(mensaje);
  });

  it("normaliza el correo: sin espacios y en minúsculas", () => {
    const r = registroBody.parse({ correo: "  Ana.Ruiz@Correo.MX ", contrasena: CLAVE, rol: "foro" });
    expect(r.correo).toBe("ana.ruiz@correo.mx");
  });

  it("no permite registrarse como administrador", () => {
    expect(registroBody.safeParse({ correo: "a@b.mx", contrasena: CLAVE, rol: "admin" }).success).toBe(false);
  });
});
