import { Router } from "express";
import { pool } from "../../db/pool";
import { ApiError } from "../../errores/ApiError";

/**
 * GET /salud: el orquestador (Docker, el Gateway) pregunta si el servicio puede atender.
 * Responde 200 solo si además alcanza la base; si no, 503 para que deje de mandarle tráfico.
 */
export const rutasSalud = Router();

rutasSalud.get("/", async (_req, res) => {
  const inicio = Date.now();
  try {
    await pool.query("SELECT 1");
  } catch {
    throw ApiError.noDisponible("La base de datos de Perfiles no responde.");
  }
  res.json({ estado: "ok", servicio: "perfiles", baseDeDatos: { estado: "ok", ms: Date.now() - inicio } });
});
