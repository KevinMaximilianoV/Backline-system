import type { core, ZodError } from "zod";
import type { ErrorCampo } from "./ApiError";

/**
 * Convierte los errores de Zod en la lista `errores` del contrato, con mensajes
 * en español y un código estable por tipo de problema.
 * Requiere validar con `reportInput: true` para distinguir un campo ausente de uno con otro tipo.
 */
export function traducirErroresZod(error: ZodError): ErrorCampo[] {
  return error.issues.map(traducir);
}

function traducir(issue: core.$ZodIssue): ErrorCampo {
  const campo = issue.path.length > 0 ? issue.path.join(".") : "(cuerpo)";

  switch (issue.code) {
    case "invalid_type":
      if (issue.input === undefined) {
        return { campo, codigo: "REQUERIDO", mensaje: "Este campo es obligatorio." };
      }
      return { campo, codigo: "TIPO_INVALIDO", mensaje: `Se esperaba ${nombreTipo(issue.expected)}.` };

    case "too_small":
      if (issue.origin === "string") {
        return { campo, codigo: "DEMASIADO_CORTO", mensaje: `Debe tener al menos ${issue.minimum} caracteres.` };
      }
      if (issue.origin === "array") {
        return { campo, codigo: "FUERA_DE_RANGO", mensaje: `Debe tener al menos ${issue.minimum} elemento(s).` };
      }
      return { campo, codigo: "FUERA_DE_RANGO", mensaje: `Debe ser mayor o igual a ${issue.minimum}.` };

    case "too_big":
      if (issue.origin === "string") {
        return { campo, codigo: "DEMASIADO_LARGO", mensaje: `Debe tener como máximo ${issue.maximum} caracteres.` };
      }
      if (issue.origin === "array") {
        return { campo, codigo: "FUERA_DE_RANGO", mensaje: `Debe tener como máximo ${issue.maximum} elemento(s).` };
      }
      return { campo, codigo: "FUERA_DE_RANGO", mensaje: `Debe ser menor o igual a ${issue.maximum}.` };

    case "invalid_format":
      // En los regex el esquema define su propio mensaje en español
      return { campo, codigo: "FORMATO", mensaje: issue.format === "regex" ? issue.message : mensajeFormato(issue.format) };

    case "invalid_value":
      return { campo, codigo: "VALOR_NO_PERMITIDO", mensaje: `Valores permitidos: ${issue.values.join(", ")}.` };

    case "unrecognized_keys":
      return {
        campo: issue.keys.join(", "),
        codigo: "CAMPO_NO_PERMITIDO",
        mensaje: "El contrato no incluye este campo.",
      };

    default:
      // Reglas propias (refine): su mensaje ya está en español
      return { campo, codigo: "INVALIDO", mensaje: issue.message };
  }
}

function nombreTipo(tipo: string): string {
  const nombres: Record<string, string> = {
    string: "un texto",
    number: "un número",
    int: "un número entero",
    boolean: "verdadero o falso",
    array: "una lista",
    object: "un objeto",
  };
  return nombres[tipo] ?? tipo;
}

function mensajeFormato(formato: string): string {
  if (formato === "guid" || formato === "uuid") return "Debe ser un UUID válido.";
  if (formato === "url") return "Debe ser una URL válida.";
  return "Formato inválido.";
}
