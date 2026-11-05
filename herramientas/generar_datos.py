"""Genera los scripts de datos de prueba de Backline (20_ a 23_).

Uso: python3 herramientas/generar_datos.py db/init   (sobrescribe los archivos 20_ a 23_).
Los .sql generados son la fuente de verdad; si cambia el esquema, se ajusta este script y se regeneran.
Calcular aquí faltantes, historial, eventos y notificaciones garantiza que los
datos de las cuatro bases sean coherentes entre sí.
"""
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(sys.argv[1])
TZ = timezone(timedelta(hours=-6))
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]

EQUIPO = {1: "Sistema de PA", 2: "Mezcladora", 3: "Monitor de piso", 4: "Monitor in-ear",
          5: "Entrada de línea (caja DI)", 6: "Micrófono vocal", 7: "Micrófono para instrumento",
          8: "Pedestal de micrófono", 9: "Batería completa", 10: "Amplificador de guitarra",
          11: "Amplificador de bajo", 12: "Toma de corriente en escenario"}

# ------------------------------------------------------------------ usuarios
ADMIN = "33333333-3333-3333-3333-333333333333"
BANDAS = {
    "desvelados": dict(id="11111111-1111-1111-1111-111111111111", nombre="Los Desvelados", correo="desvelados@correo.com",
                       integrantes=3, generos=[2, 1], demo="https://ejemplo.com/desvelados",
                       desc="Trío de metal; guitarra y bajo con simuladores de amplificador.",
                       rider={1: 1, 5: 4, 3: 2, 6: 2, 9: 1}, notas={5: "Guitarra y bajo con simulador, en estéreo"}),
    "ruido": dict(id="44444444-4444-4444-4444-444444444444", nombre="Ruido Blanco", correo="ruidoblanco@correo.com",
                  integrantes=4, generos=[3, 1], demo=None, desc="Punk rápido y corto.",
                  rider={1: 1, 10: 2, 11: 1, 9: 1, 6: 3}, notas={}),
    "marea": dict(id="55555555-5555-5555-5555-555555555555", nombre="Marea Lenta", correo="marealenta@correo.com",
                  integrantes=4, generos=[4, 12], demo="https://ejemplo.com/marealenta", desc="Indie acústico.",
                  rider={1: 1, 2: 1, 6: 3, 7: 2, 5: 2, 3: 3}, notas={7: "Para guitarra acústica y violín"}),
    "cuarto": dict(id="66666666-6666-6666-6666-666666666666", nombre="Cuarto Oscuro", correo="cuartooscuro@correo.com",
                   integrantes=4, generos=[1, 9], demo="https://ejemplo.com/cuartooscuro", desc="Rock y blues de los setenta.",
                   rider={1: 1, 10: 2, 11: 1, 9: 1, 6: 2, 3: 2}, notas={}),
    "sintonia": dict(id="77777777-7777-7777-7777-777777777777", nombre="Sintonía Sur", correo="sintoniasur@correo.com",
                     integrantes=6, generos=[10, 11], demo=None, desc="Ska con sección de metales.",
                     rider={1: 1, 2: 1, 6: 2, 7: 4, 10: 1, 11: 1, 9: 1, 3: 4}, notas={7: "Trompeta, trombón y dos saxofones"}),
    "eco": dict(id="88888888-8888-8888-8888-888888888888", nombre="Eco Polar", correo="ecopolar@correo.com",
                integrantes=2, generos=[6], demo="https://ejemplo.com/ecopolar", desc="Dúo de electrónica en vivo.",
                rider={1: 1, 5: 2, 12: 2}, notas={}, suspendida=True),
}
FOROS = {
    "bodega": dict(id="22222222-2222-2222-2222-222222222222", nombre="Foro La Bodega", correo="labodega@correo.com",
                   direccion="Calle Ejemplo 123, Centro, Querétaro", capacidad=150, generos=[1, 2, 3],
                   desc="Foro de rock y metal.", inv={1: 1, 2: 1, 3: 2, 6: 3, 9: 1, 10: 2, 5: 2}),
    "sotano": dict(id="99999999-9999-9999-9999-999999999999", nombre="El Sótano Café", correo="elsotano@correo.com",
                   direccion="Avenida Ejemplo 45, Centro, Querétaro", capacidad=60, generos=[4, 12, 8, 9],
                   desc="Café con escenario para formatos acústicos.", inv={1: 1, 2: 1, 6: 2, 7: 2, 5: 2, 3: 1, 8: 4, 12: 2}),
    "arena": dict(id="dddddddd-dddd-dddd-dddd-dddddddddddd", nombre="Arena Norte", correo="arenanorte@correo.com",
                  direccion="Boulevard Ejemplo 900, Juriquilla, Querétaro", capacidad=400, generos=[1, 10, 5, 6, 11],
                  desc="Salón grande con equipo completo.",
                  inv={1: 1, 2: 1, 3: 4, 4: 2, 6: 4, 7: 6, 9: 1, 10: 2, 11: 1, 5: 6, 8: 8, 12: 4}),
}

def t(s):  # "2026-11-14 20:00"
    return datetime.strptime(s, "%Y-%m-%d %H:%M").replace(tzinfo=TZ)

# ------------------------------------------------------------------ franjas
# (clave, foro, inicio, fin)
FRANJAS = [
    ("A01", "bodega", "2026-11-14 20:00", "2026-11-14 23:00"),
    ("A02", "bodega", "2026-11-14 23:00", "2026-11-15 02:00"),   # cruza la medianoche
    ("A03", "bodega", "2026-11-21 20:00", "2026-11-21 23:00"),
    ("A04", "bodega", "2026-11-28 20:00", "2026-11-28 23:00"),
    ("A05", "sotano", "2026-11-13 19:00", "2026-11-13 21:00"),
    ("A06", "sotano", "2026-11-20 19:00", "2026-11-20 21:00"),
    ("A07", "sotano", "2026-11-27 19:00", "2026-11-27 21:00"),   # se retira (borrado lógico)
    ("A08", "arena",  "2026-11-15 18:00", "2026-11-15 23:00"),
    ("A09", "arena",  "2026-11-22 18:00", "2026-11-22 23:00"),
    ("A10", "arena",  "2026-11-29 18:00", "2026-11-29 23:00"),
    ("A11", "sotano", "2026-12-04 19:00", "2026-12-04 21:00"),
    ("A12", "arena",  "2026-12-06 18:00", "2026-12-06 23:00"),
]
FR = {k: dict(id=f"aaaaaaaa-0000-0000-0000-0000000000{k[1:]}", foro=f, inicio=t(i), fin=t(e), estado="libre")
      for k, f, i, e in FRANJAS}

# ------------------------------------------------------------------ solicitudes y su historia
# (clave, banda, franja, acuerdo, monto, porcentaje, notas, creada, [(estado, quién, motivo, cuándo)])
# quién: 'banda', 'foro' o None (sistema)
SOL = [
    ("S01", "desvelados", "A01", "pago_fijo", 1500, None, "Llevamos nuestras dos cajas DI.", "2026-10-20 12:20",
     [("aceptada", "foro", None, "2026-10-21 12:30")]),
    ("S02", "ruido", "A01", "a_convenir", None, None, None, "2026-10-20 18:05",
     [("rechazada", None, "La franja fue reservada por otra banda", "2026-10-21 12:30")]),
    ("S03", "cuarto", "A03", "porcentaje_taquilla", None, 60, None, "2026-10-15 10:00",
     [("aceptada", "foro", None, "2026-10-16 09:00"), ("confirmada", "banda", None, "2026-10-16 20:15")]),
    ("S04", "ruido", "A04", "pago_fijo", 1200, None, "Podemos cerrar la noche.", "2026-10-27 17:40", []),
    ("S05", "marea", "A05", "pago_fijo", 800, None, None, "2026-10-10 11:00",
     [("aceptada", "foro", None, "2026-10-11 10:00"), ("confirmada", "banda", None, "2026-10-11 13:30")]),
    ("S06", "marea", "A06", "a_convenir", None, None, None, "2026-10-12 16:00",
     [("aceptada", "foro", None, "2026-10-13 09:45"),
      ("cancelada", "banda", "Uno de los integrantes no podrá asistir", "2026-10-22 08:10")]),
    ("S07", "cuarto", "A07", "pago_fijo", 900, None, None, "2026-10-18 13:00",
     [("rechazada", "foro", "Ya tenemos el cartel completo ese día", "2026-10-19 10:00")]),
    ("S08", "sintonia", "A08", "porcentaje_taquilla", None, 70, "Somos seis en escena.", "2026-10-17 19:00",
     [("aceptada", "foro", None, "2026-10-18 12:00")]),
    ("S09", "cuarto", "A09", "pago_fijo", 2500, None, None, "2026-10-26 09:30", []),
    ("S10", "ruido", "A09", "a_convenir", None, None, None, "2026-10-26 21:00", []),
    ("S11", "desvelados", "A12", "pago_fijo", 2000, None, None, "2026-10-23 15:00",
     [("cancelada", "banda", "Conseguimos otra fecha", "2026-10-24 11:00")]),
]
RETIROS = {"A07": t("2026-10-19 10:05")}

def fecha_txt(d):
    return f"{d.day} de {MESES[d.month - 1]} de {d.year}, {d:%H:%M}"

def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, datetime):
        return "'" + v.isoformat() + "'"
    return "'" + str(v).replace("'", "''") + "'"

def js(v):
    return q(json.dumps(v, ensure_ascii=False)) + "::jsonb"

def faltantes(rider, inv):
    out = []
    for te, req in rider.items():
        disp = inv.get(te, 0)
        if req > disp:
            out.append({"tipoEquipoId": te, "tipoEquipo": EQUIPO[te], "requerido": req,
                        "disponible": disp, "faltan": req - disp})
    return out

def lista(d):
    return [{"tipoEquipoId": k, "tipoEquipo": EQUIPO[k], "cantidad": v} for k, v in d.items()]

def nid(prefix, n):
    return f"{prefix}-0000-0000-0000-{n:012d}"

# ------------------------------------------------------------------ simulación
cambios, eventos_bk, avisos = [], [], []
sol_rows = []
ev_n = 0
contactos = {}

def evento(tipo, payload, cuando):
    global ev_n
    ev_n += 1
    eid = nid("cccccccc", ev_n)
    eventos_bk.append(dict(id=eid, tipo=tipo, payload=payload, creado=cuando))
    return eid

def avisar(eid, tipo, usuario, mensaje, sol_id, cuando, leida):
    avisos.append(dict(evento=eid, tipo=tipo, usuario=usuario, mensaje=mensaje, sol=sol_id,
                       canal="app", leida=leida, enviada=None, creado=cuando))
    avisos.append(dict(evento=eid, tipo=tipo, usuario=usuario, mensaje=mensaje, sol=sol_id,
                       canal="correo", leida=False, enviada=cuando + timedelta(seconds=4), creado=cuando))

cambio_n = 0
for n, (k, b, fk, acuerdo, monto, pct, notas, creada, historia) in enumerate(SOL, start=1):
    banda, fr = BANDAS[b], FR[fk]
    foro = FOROS[fr["foro"]]
    sid = f"bbbbbbbb-0000-0000-0000-0000000000{k[1:]}"
    falt = faltantes(banda["rider"], foro["inv"])
    estado, ts = "solicitada", t(creada)
    cambio_n += 1
    cambios.append(dict(id=nid("eeeeeeee", cambio_n), sol=sid, ant=None, nuevo="solicitada", autor=banda["id"], motivo=None, creado=ts))
    payload = {"solicitudId": sid, "bandaId": banda["id"], "bandaNombre": banda["nombre"], "foroId": foro["id"],
               "foroNombre": foro["nombre"], "inicio": fr["inicio"].isoformat(), "estadoNuevo": "solicitada"}
    eid = evento("SolicitudCreada", payload, ts)
    avisar(eid, "SolicitudCreada", foro["id"], f"{banda['nombre']} solicitó tocar el {fecha_txt(fr['inicio'])}.", sid, ts, leida=bool(historia))
    for (nuevo, quien, motivo, cuando) in historia:
        c = t(cuando)
        autor = banda["id"] if quien == "banda" else foro["id"] if quien == "foro" else None
        cambio_n += 1
        cambios.append(dict(id=nid("eeeeeeee", cambio_n), sol=sid, ant=estado, nuevo=nuevo, autor=autor, motivo=motivo, creado=c))
        tipo = {"aceptada": "SolicitudAceptada", "rechazada": "SolicitudRechazada",
                "confirmada": "SolicitudConfirmada", "cancelada": "SolicitudCancelada"}[nuevo]
        p = dict(payload, estadoAnterior=estado, estadoNuevo=nuevo, motivo=motivo)
        eid = evento(tipo, p, c)
        fecha = fecha_txt(fr["inicio"])
        if nuevo == "aceptada":
            avisar(eid, tipo, banda["id"], f"{foro['nombre']} aceptó tu solicitud para el {fecha}.", sid, c, leida=(k != "S01"))
        elif nuevo == "rechazada":
            avisar(eid, tipo, banda["id"], f"{foro['nombre']} rechazó tu solicitud para el {fecha}. Motivo: {motivo}.", sid, c, leida=False)
        elif nuevo == "confirmada":
            avisar(eid, tipo, foro["id"], f"{banda['nombre']} confirmó su presentación del {fecha}.", sid, c, leida=True)
            avisar(eid, tipo, banda["id"], f"Confirmaste tu presentación en {foro['nombre']} del {fecha}.", sid, c, leida=True)
        elif nuevo == "cancelada":
            otro = foro["id"] if quien == "banda" else banda["id"]
            quien_txt = banda["nombre"] if quien == "banda" else foro["nombre"]
            avisar(eid, tipo, otro, f"{quien_txt} canceló la presentación del {fecha}. Motivo: {motivo}.", sid, c, leida=False)
        estado, ts = nuevo, c
    sol_rows.append(dict(id=sid, franja=fr["id"], foro=foro["id"], banda=banda["id"], bnom=banda["nombre"], fnom=foro["nombre"],
                         acuerdo=acuerdo, monto=monto, pct=pct, notas=notas, estado=estado,
                         rider=lista(banda["rider"]), inv=lista(foro["inv"]), falt=falt, creado=t(creada), act=ts))
    if estado in ("aceptada", "confirmada"):
        fr["estado"] = "reservada"
for k, cuando in RETIROS.items():
    FR[k]["estado"] = "retirada"
    FR[k]["retirada_en"] = cuando
# el último evento queda sin publicar, para mostrar el outbox funcionando
ultimo_evento = max(eventos_bk, key=lambda e: e["creado"])["id"]

# ------------------------------------------------------------------ escritura
def encabezado(n, base, desc):
    return (f"-- =====================================================================\n"
            f"-- Backline · {n} · Datos de prueba de {base}\n-- {desc}\n"
            f"-- Generado; no editar a mano.\n"
            f"-- =====================================================================\n"
            f"\\connect {base}\n\nBEGIN;\n\n")

usuarios = [dict(id=ADMIN, correo="admin@backline.mx", rol="admin", estado="activa", creado=t("2026-10-01 09:00"))]
for i, b in enumerate(BANDAS.values()):
    usuarios.append(dict(id=b["id"], correo=b["correo"], rol="banda",
                         estado="suspendida" if b.get("suspendida") else "activa", creado=t("2026-10-02 10:00") + timedelta(hours=i)))
for i, f in enumerate(FOROS.values()):
    usuarios.append(dict(id=f["id"], correo=f["correo"], rol="foro", estado="activa", creado=t("2026-10-03 10:00") + timedelta(hours=i)))

HASH = "$2b$10$hashDeEjemploGeneradoPorBcryptNoEsUnaContrasenaReal{:02d}"
s = encabezado(20, "backline_identidad", "10 usuarios: 1 administrador, 6 bandas (1 suspendida) y 3 foros.")
s += "INSERT INTO usuario (id, correo, hash_contrasena, rol, estado, creado_en, actualizado_en) VALUES\n"
s += ",\n".join(f"  ({q(u['id'])}, {q(u['correo'])}, {q(HASH.format(i))}, {q(u['rol'])}, {q(u['estado'])}, {q(u['creado'])}, {q(u['creado'])})"
                for i, u in enumerate(usuarios)) + ";\n\n"
s += "INSERT INTO evento_pendiente (id, tipo, payload, creado_en, publicado_en) VALUES\n"
ev_id = []
for i, u in enumerate(usuarios, start=1):
    ev_id.append(dict(id=nid("bbbb0000", i), tipo="UsuarioRegistrado", payload={"usuarioId": u["id"], "correo": u["correo"], "rol": u["rol"]}, creado=u["creado"]))
eco = BANDAS["eco"]
ev_id.append(dict(id=nid("bbbb0000", len(usuarios) + 1), tipo="UsuarioSuspendido", payload={"usuarioId": eco["id"]}, creado=t("2026-10-25 16:00")))
s += ",\n".join(f"  ({q(e['id'])}, {q(e['tipo'])}, {js(e['payload'])}, {q(e['creado'])}, {q(e['creado'] + timedelta(seconds=2))})" for e in ev_id) + ";\n\nCOMMIT;\n"
(OUT / "20_datos_identidad.sql").write_text(s, encoding="utf-8")

s = encabezado(21, "backline_perfiles", "6 bandas y 3 foros con sus géneros, riders e inventarios.")
s += "INSERT INTO banda (id, nombre, integrantes, enlace_demo, descripcion, visible, creado_en, actualizado_en) VALUES\n"
s += ",\n".join(f"  ({q(b['id'])}, {q(b['nombre'])}, {b['integrantes']}, {q(b['demo'])}, {q(b['desc'])}, {q(not b.get('suspendida'))}, '2026-10-02T12:00:00-06:00', '2026-10-02T12:00:00-06:00')"
                for b in BANDAS.values()) + ";\n\n"
s += "INSERT INTO banda_genero (banda_id, genero_id) VALUES\n"
s += ",\n".join(f"  ({q(b['id'])}, {g})" for b in BANDAS.values() for g in b["generos"]) + ";\n\n"
s += "INSERT INTO rider_requisito (banda_id, tipo_equipo_id, cantidad, notas) VALUES\n"
s += ",\n".join(f"  ({q(b['id'])}, {te}, {c}, {q(b['notas'].get(te))})" for b in BANDAS.values() for te, c in b["rider"].items()) + ";\n\n"
s += "INSERT INTO foro (id, nombre, direccion, capacidad, descripcion, creado_en, actualizado_en) VALUES\n"
s += ",\n".join(f"  ({q(f['id'])}, {q(f['nombre'])}, {q(f['direccion'])}, {f['capacidad']}, {q(f['desc'])}, '2026-10-03T12:00:00-06:00', '2026-10-03T12:00:00-06:00')"
                for f in FOROS.values()) + ";\n\n"
s += "INSERT INTO foro_genero (foro_id, genero_id) VALUES\n"
s += ",\n".join(f"  ({q(f['id'])}, {g})" for f in FOROS.values() for g in f["generos"]) + ";\n\n"
s += "INSERT INTO inventario_item (foro_id, tipo_equipo_id, cantidad) VALUES\n"
s += ",\n".join(f"  ({q(f['id'])}, {te}, {c})" for f in FOROS.values() for te, c in f["inv"].items()) + ";\n\nCOMMIT;\n"
(OUT / "21_datos_perfiles.sql").write_text(s, encoding="utf-8")

s = encabezado(22, "backline_booking", "12 franjas, 11 solicitudes en los cinco estados, su historial y el outbox.")
s += ("-- Las franjas se insertan en su estado final; la retirada se inserta libre y se retira\n"
      "-- al final con UPDATE, para que el trigger de retiro también se ejecute.\n")
s += "INSERT INTO franja (id, foro_id, inicio, fin, estado, creado_en) VALUES\n"
s += ",\n".join(f"  ({q(f['id'])}, {q(FOROS[f['foro']]['id'])}, {q(f['inicio'])}, {q(f['fin'])}, "
                f"{q('libre' if f['estado'] == 'retirada' else f['estado'])}, '2026-10-05T10:00:00-06:00')" for f in FR.values()) + ";\n\n"
s += ("INSERT INTO solicitud (id, franja_id, foro_id, banda_id, banda_nombre, foro_nombre, tipo_acuerdo, monto_mxn, porcentaje,\n"
      "                       notas, estado, rider_snapshot, inventario_snapshot, faltantes, creado_en, actualizado_en) VALUES\n")
s += ",\n".join(f"  ({q(r['id'])}, {q(r['franja'])}, {q(r['foro'])}, {q(r['banda'])}, {q(r['bnom'])}, {q(r['fnom'])}, {q(r['acuerdo'])}, "
                f"{q(r['monto'])}, {q(r['pct'])},\n   {q(r['notas'])}, {q(r['estado'])}, {js(r['rider'])},\n   {js(r['inv'])},\n   {js(r['falt'])}, "
                f"{q(r['creado'])}, {q(r['act'])})" for r in sol_rows) + ";\n\n"
s += "INSERT INTO cambio_estado (id, solicitud_id, estado_anterior, estado_nuevo, autor_usuario_id, motivo, creado_en) VALUES\n"
s += ",\n".join(f"  ({q(c['id'])}, {q(c['sol'])}, {q(c['ant'])}, {q(c['nuevo'])}, {q(c['autor'])}, {q(c['motivo'])}, {q(c['creado'])})" for c in cambios) + ";\n\n"
s += "INSERT INTO evento_pendiente (id, tipo, payload, creado_en, publicado_en) VALUES\n"
s += ",\n".join(f"  ({q(e['id'])}, {q(e['tipo'])}, {js(e['payload'])}, {q(e['creado'])}, "
                f"{'NULL' if e['id'] == ultimo_evento else q(e['creado'] + timedelta(seconds=2))})" for e in eventos_bk) + ";\n\n"
for k, cuando in RETIROS.items():
    s += f"UPDATE franja SET estado = 'retirada', retirada_en = {q(cuando)} WHERE id = {q(FR[k]['id'])};\n"
s += "\nCOMMIT;\n"
(OUT / "22_datos_booking.sql").write_text(s, encoding="utf-8")

s = encabezado(23, "backline_notificaciones", "Contactos de los 10 usuarios y los avisos generados por los eventos.")
s += "INSERT INTO contacto (usuario_id, correo, actualizado_en) VALUES\n"
s += ",\n".join(f"  ({q(u['id'])}, {q(u['correo'])}, {q(u['creado'])})" for u in usuarios) + ";\n\n"
bienvenida = [dict(evento=e["id"], tipo="UsuarioRegistrado", usuario=e["payload"]["usuarioId"],
                   mensaje="Te damos la bienvenida a Backline.", sol=None, canal="correo", leida=False,
                   enviada=e["creado"] + timedelta(seconds=5), creado=e["creado"]) for e in ev_id if e["tipo"] == "UsuarioRegistrado"]
susp = [dict(evento=ev_id[-1]["id"], tipo="UsuarioSuspendido", usuario=eco["id"], mensaje="Tu cuenta fue suspendida por el administrador.",
             sol=None, canal="correo", leida=False, enviada=ev_id[-1]["creado"] + timedelta(seconds=5), creado=ev_id[-1]["creado"])]
todos = bienvenida + susp + avisos
s += "INSERT INTO notificacion (usuario_id, evento_id, tipo, mensaje, solicitud_id, canal, leida, enviada_en, creado_en) VALUES\n"
s += ",\n".join(f"  ({q(a['usuario'])}, {q(a['evento'])}, {q(a['tipo'])}, {q(a['mensaje'])}, {q(a['sol'])}, {q(a['canal'])}, "
                f"{q(a['leida'])}, {q(a['enviada'])}, {q(a['creado'] + timedelta(seconds=3))})" for a in todos) + ";\n\nCOMMIT;\n"
(OUT / "23_datos_notificaciones.sql").write_text(s, encoding="utf-8")

print(f"usuarios={len(usuarios)} franjas={len(FR)} solicitudes={len(sol_rows)} cambios={len(cambios)} "
      f"eventos_booking={len(eventos_bk)} eventos_identidad={len(ev_id)} notificaciones={len(todos)}")
