"""Genera el diagrama ER de Backline leyendo las bases creadas por los scripts.

Salidas: backline-er.drawio (draw.io), backline-er.dbml (dbdiagram.io) y backline-er.dot (Graphviz, opcional).
Uso (con la base levantada):  PGPASSWORD=<contraseña> python3 herramientas/generar_er.py localhost 5432 diagramas
"""
import json
import subprocess
import sys
from html import escape
from pathlib import Path

SOCK, PORT, OUT = sys.argv[1], sys.argv[2], Path(sys.argv[3])
BASES = [("backline_identidad", "Identidad"), ("backline_perfiles", "Perfiles"),
         ("backline_booking", "Booking"), ("backline_notificaciones", "Notificaciones")]

SQL = r"""
WITH cols AS (
  SELECT c.relname AS tabla, a.attnum, a.attname AS col,
         format_type(a.atttypid, a.atttypmod) AS tipo, a.attnotnull AS notnull
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped),
cons AS (
  SELECT c.relname AS tabla, k.conname, k.contype,
         (SELECT array_agg(a.attname ORDER BY x.o) FROM unnest(k.conkey) WITH ORDINALITY x(n, o)
            JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = x.n) AS cols,
         rc.relname AS ref_tabla,
         (SELECT array_agg(a.attname ORDER BY x.o) FROM unnest(k.confkey) WITH ORDINALITY x(n, o)
            JOIN pg_attribute a ON a.attrelid = k.confrelid AND a.attnum = x.n) AS ref_cols
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
    LEFT JOIN pg_class rc ON rc.oid = k.confrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'),
idx AS (
  SELECT t.relname AS tabla, i.relname AS indice, pg_get_indexdef(i.oid) AS def
    FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND x.indisunique AND NOT EXISTS
         (SELECT 1 FROM pg_constraint k WHERE k.conindid = i.oid))
SELECT json_build_object(
  'cols', (SELECT json_agg(cols ORDER BY tabla, attnum) FROM cols),
  'cons', (SELECT json_agg(cons ORDER BY tabla, contype, conname) FROM cons),
  'idx',  (SELECT COALESCE(json_agg(idx ORDER BY tabla, indice), '[]') FROM idx));
"""

modelo = {}
for base, servicio in BASES:
    raw = subprocess.check_output(["psql", "-h", SOCK, "-p", PORT, "-U", "postgres", "-d", base,
                                   "-X", "-At", "-c", SQL], text=True)
    d = json.loads(raw)
    tablas = {}
    for c in d["cols"]:
        tablas.setdefault(c["tabla"], {"cols": [], "pk": [], "fk": {}, "uq": [], "notas": []})
        tablas[c["tabla"]]["cols"].append(c)
    for k in d["cons"]:
        t = tablas[k["tabla"]]
        if k["contype"] == "p":
            t["pk"] = k["cols"]
        elif k["contype"] == "f":
            for col, rc in zip(k["cols"], k["ref_cols"]):
                t["fk"][col] = (k["ref_tabla"], rc, k["conname"], k["cols"], k["ref_cols"])
        elif k["contype"] == "u":
            t["uq"].append(k["cols"])
        elif k["contype"] == "x":
            t["notas"].append(f"EXCLUDE {k['conname']}")
    for i in d["idx"]:
        t = tablas[i["tabla"]]
        parcial = " WHERE " in i["def"]
        t["notas"].append(f"UNIQUE {'parcial ' if parcial else ''}{i['indice']}")
    modelo[base] = {"servicio": servicio, "tablas": tablas}

# Referencias lógicas entre bases: solo se guarda el id, no hay FK (cada servicio es dueño de su base)
LOGICAS = [
    ("backline_perfiles", "banda", "id", "backline_identidad", "usuario", "id", "1:1, mismo id"),
    ("backline_perfiles", "foro", "id", "backline_identidad", "usuario", "id", "1:1, mismo id"),
    ("backline_booking", "franja", "foro_id", "backline_perfiles", "foro", "id", "N:1"),
    ("backline_booking", "solicitud", "banda_id", "backline_perfiles", "banda", "id", "N:1"),
    ("backline_notificaciones", "contacto", "usuario_id", "backline_identidad", "usuario", "id", "1:1, copia por evento"),
]

def corto(tipo):
    return (tipo.replace("timestamp with time zone", "timestamptz").replace("character varying", "varchar")
                .replace("smallint", "smallint").replace("numeric", "numeric"))

def marca(t, col):
    m = []
    if col in t["pk"]:
        m.append("PK")
    if col in t["fk"]:
        m.append("FK")
    if any(col in u and len(u) == 1 for u in t["uq"]):
        m.append("UQ")
    return ",".join(m)

def es_unico(t, cols):
    return list(cols) == t["pk"] or any(list(cols) == u for u in t["uq"])

# ------------------------------------------------------------------ DBML
dbml = ["// Backline · modelo de datos generado desde las bases creadas por los scripts SQL.",
        "// Abrir en https://dbdiagram.io (pegar el contenido). No editar a mano: regenerar.", ""]
for base, m in modelo.items():
    for tn, t in m["tablas"].items():
        dbml.append(f"Table {base}.{tn} {{")
        for c in t["cols"]:
            attrs = []
            if c["col"] in t["pk"] and len(t["pk"]) == 1:
                attrs.append("pk")
            if c["notnull"]:
                attrs.append("not null")
            if any([c["col"]] == u for u in t["uq"]):
                attrs.append("unique")
            tipo = corto(c["tipo"]).replace(" ", "_")
            dbml.append(f"  {c['col']} {tipo}" + (f" [{', '.join(attrs)}]" if attrs else ""))
        idx = []
        if len(t["pk"]) > 1:
            idx.append(f"    ({', '.join(t['pk'])}) [pk]")
        for u in t["uq"]:
            if len(u) > 1:
                idx.append(f"    ({', '.join(u)}) [unique]")
        if idx:
            dbml.append("  indexes {")
            dbml.extend(idx)
            dbml.append("  }")
        if t["notas"]:
            dbml.append(f"  Note: '{'; '.join(t['notas'])}'")
        dbml.append("}")
        dbml.append("")
    dbml.append(f"TableGroup {m['servicio']} {{")
    dbml.extend(f"  {base}.{tn}" for tn in m["tablas"])
    dbml.append("}")
    dbml.append("")
vistos = set()
for base, m in modelo.items():
    for tn, t in m["tablas"].items():
        for col, (rt, rc, name, cols, rcols) in t["fk"].items():
            if (tn, name) in vistos:
                continue
            vistos.add((tn, name))
            if len(cols) > 1:
                dbml.append(f"Ref {name}: {base}.{tn}.({', '.join(cols)}) > {base}.{rt}.({', '.join(rcols)})")
            else:
                rel = "-" if es_unico(t, cols) else ">"
                dbml.append(f"Ref {name}: {base}.{tn}.{col} {rel} {base}.{rt}.{rc}")
dbml.append("")
dbml.append("// Referencias lógicas entre bases (sin FK; solo se guarda el id)")
for b1, t1, c1, b2, t2, c2, nota in LOGICAS:
    rel = "-" if nota.startswith("1:1") else ">"
    dbml.append(f"Ref: {b1}.{t1}.{c1} {rel} {b2}.{t2}.{c2} // lógica, {nota}")
(OUT / "backline-er.dbml").write_text("\n".join(dbml) + "\n", encoding="utf-8")

# ------------------------------------------------------------------ draw.io
ANCHO_T, FILA, CAB, SEP, GAP_X = 320, 22, 30, 28, 70
celdas, aristas = [], []
ids = {}
n = [10]

def nuevo_id():
    n[0] += 1
    return f"c{n[0]}"

# Cuadrícula 2x2: arriba Identidad y Notificaciones; abajo Perfiles y Booking.
# banda y foro van en la columna derecha de Perfiles, junto a Booking y debajo de usuario,
# para que cada referencia lógica una tablas vecinas en lugar de cruzar por encima de otras.
DISTRIB = {
    "backline_identidad": [["usuario", "evento_pendiente"]],
    "backline_notificaciones": [["contacto", "notificacion"]],
    "backline_perfiles": [["banda_genero", "rider_requisito", "genero", "foro_genero", "inventario_item"],
                          ["banda", "foro", "tipo_equipo"]],
    "backline_booking": [["franja", "solicitud"], ["cambio_estado", "evento_pendiente"]],
}

def medir(base):
    m = modelo[base]
    cols = DISTRIB[base]
    assert sorted(sum(cols, [])) == sorted(m["tablas"]), base
    alturas = []
    for col_tablas in cols:
        y = 60
        for tn in col_tablas:
            t = m["tablas"][tn]
            y += CAB + FILA * len(t["cols"]) + FILA * len(t["notas"]) + SEP
        alturas.append(y)
    titulo = len(f"{base} (servicio {m['servicio']})") * 8.6 + 40
    ancho = max(len(cols) * ANCHO_T + (len(cols) - 1) * 40 + 40, titulo)
    return ancho, max(alturas) + 10

W = {b: medir(b) for b in DISTRIB}
x_perf = 40
x_ident = x_perf + 20 + ANCHO_T + 40 - 20          # usuario queda sobre la columna de banda y foro
x_notif = x_ident + W["backline_identidad"][0] + GAP_X
y_abajo = 40 + max(W["backline_identidad"][1], W["backline_notificaciones"][1]) + 80
x_book = x_perf + W["backline_perfiles"][0] + GAP_X
POS = {"backline_identidad": (x_ident, 40), "backline_notificaciones": (x_notif, 40),
       "backline_perfiles": (x_perf, y_abajo), "backline_booking": (x_book, y_abajo)}

for base in DISTRIB:
    m = modelo[base]
    cont_id = nuevo_id()
    columnas = DISTRIB[base]
    ancho_cont, alto_cont = W[base]
    tablas_xml = []
    for ci, col_tablas in enumerate(columnas):
        y = 60
        for tn in col_tablas:
            t = m["tablas"][tn]
            alto = CAB + FILA * len(t["cols"]) + FILA * len(t["notas"])
            tid = nuevo_id()
            ids[(base, tn)] = {"tabla": tid}
            tx = 20 + ci * (ANCHO_T + 40)
            tablas_xml.append(
                f'<mxCell id="{tid}" value="{escape(tn)}" style="shape=table;startSize={CAB};container=1;collapsible=0;'
                f'childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeLast=1;html=1;'
                f'fillColor=#f5f5f5;strokeColor=#666666;" vertex="1" parent="{cont_id}">'
                f'<mxGeometry x="{tx}" y="{y}" width="{ANCHO_T}" height="{alto}" as="geometry"/></mxCell>')
            fy = CAB
            filas = [(marca(t, c["col"]), f'{c["col"]}: {corto(c["tipo"])}{"" if c["notnull"] else " (nulo)"}', c["col"])
                     for c in t["cols"]]
            filas += [("", nota, None) for nota in t["notas"]]
            for mk, txt, col in filas:
                rid = nuevo_id()
                if col:
                    ids[(base, tn)][col] = rid
                estilo_txt = "fontStyle=2;fontColor=#666666;" if col is None else f"fontStyle={4 if 'PK' in mk else 0};"
                tablas_xml.append(
                    f'<mxCell id="{rid}" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;'
                    f'fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
                    f'top=0;left=0;right=0;bottom=0;html=1;" vertex="1" parent="{tid}">'
                    f'<mxGeometry y="{fy}" width="{ANCHO_T}" height="{FILA}" as="geometry"/></mxCell>')
                for (val, w, extra) in ((mk, 44, "fontStyle=1;"), (txt, ANCHO_T - 44, estilo_txt)):
                    cid = nuevo_id()
                    tablas_xml.append(
                        f'<mxCell id="{cid}" value="{escape(val)}" style="shape=partialRectangle;connectable=0;fillColor=none;'
                        f'top=0;left=0;bottom=0;right=0;align=left;spacingLeft=6;overflow=hidden;fontSize=11;html=1;{extra}" '
                        f'vertex="1" parent="{rid}"><mxGeometry x="{0 if w == 44 else 44}" width="{w}" height="{FILA}" as="geometry">'
                        f'<mxRectangle width="{w}" height="{FILA}" as="alternateBounds"/></mxGeometry></mxCell>')
                fy += FILA
            y += alto + SEP
    cx, cy = POS[base]
    celdas.append(
        f'<mxCell id="{cont_id}" value="{base} (servicio {m["servicio"]})" style="swimlane;startSize=34;fontStyle=1;'
        f'fontSize=14;rounded=1;arcSize=4;fillColor=none;strokeColor=#333333;strokeWidth=2;html=1;container=1;collapsible=0;" '
        f'vertex="1" parent="1"><mxGeometry x="{cx}" y="{cy}" width="{ancho_cont}" height="{alto_cont}" as="geometry"/></mxCell>')
    celdas.extend(tablas_xml)

ER_SOLIDO = "edgeStyle=entityRelationEdgeStyle;fontSize=11;html=1;rounded=0;strokeColor=#333333;"
vistos = set()
for base, m in modelo.items():
    for tn, t in m["tablas"].items():
        for col, (rt, rc, name, cols, rcols) in t["fk"].items():
            if (tn, name) in vistos:
                continue
            vistos.add((tn, name))
            uno = es_unico(t, cols)
            src, dst = ids[(base, tn)][cols[0]], ids[(base, rt)][rcols[0]]
            aristas.append(
                f'<mxCell id="{nuevo_id()}" value="" style="{ER_SOLIDO}startArrow={"ERmandOne" if uno else "ERmany"};'
                f'endArrow=ERmandOne;startFill=0;endFill=0;" edge="1" parent="1" source="{src}" target="{dst}">'
                f'<mxGeometry relative="1" as="geometry"/></mxCell>')
for b1, t1, c1, b2, t2, c2, nota in LOGICAS:
    src, dst = ids[(b1, t1)][c1], ids[(b2, t2)][c2]
    aristas.append(
        f'<mxCell id="{nuevo_id()}" value="" style="edgeStyle=entityRelationEdgeStyle;dashed=1;'
        f'strokeColor=#999999;html=1;startArrow={"ERmandOne" if nota.startswith("1:1") else "ERmany"};'
        f'endArrow=ERmandOne;startFill=0;endFill=0;" edge="1" parent="1" source="{src}" target="{dst}">'
        f'<mxGeometry relative="1" as="geometry"/></mxCell>')

leyenda = ("<b>Leyenda</b><br>Línea sólida: llave foránea dentro de una base.<br>"
           "Línea punteada: referencia lógica entre bases (solo el id, sin FK).<br>"
           "PK llave primaria · FK llave foránea · UQ valor único · (nulo) admite NULL.<br>"
           "Generado desde los scripts SQL; no editar la estructura a mano.")
celdas.append(f'<mxCell id="{nuevo_id()}" value="{escape(leyenda)}" style="text;html=1;align=left;verticalAlign=top;'
              f'whiteSpace=wrap;fontSize=12;strokeColor=#999999;fillColor=#ffffff;spacing=8;" vertex="1" parent="1">'
              f'<mxGeometry x="40" y="40" width="{max(260, x_ident - 80)}" height="140" as="geometry"/></mxCell>')

xml = ('<mxfile host="Backline generador" version="24.7.0">'
       '<diagram id="backline-er" name="Modelo ER">'
       '<mxGraphModel dx="1600" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" '
       'fold="1" page="0" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0"><root>'
       '<mxCell id="0"/><mxCell id="1" parent="0"/>' + "".join(celdas) + "".join(aristas) +
       '</root></mxGraphModel></diagram></mxfile>')
(OUT / "backline-er.drawio").write_text(xml, encoding="utf-8")

# ------------------------------------------------------------------ Graphviz (PNG para el documento)
g = ['digraph ER {', '  graph [rankdir=LR, fontname="DejaVu Sans", fontsize=13, nodesep=0.3, ranksep=0.8, pad=0.3, bgcolor=white, newrank=true];',
     '  node [shape=plain, fontname="DejaVu Sans", fontsize=10];',
     '  edge [fontname="DejaVu Sans", fontsize=9, color="#444444", arrowsize=0.7, dir=both];']
for base, m in modelo.items():
    g.append(f'  subgraph cluster_{base} {{ label=<<B>{base}</B><BR/><FONT POINT-SIZE="10">servicio {m["servicio"]}</FONT>>; '
             f'style=rounded; color="#222222"; penwidth=1.6;')
    for tn, t in m["tablas"].items():
        filas = "".join(
            f'<TR><TD ALIGN="LEFT" PORT="{c["col"]}">{"<U>" if c["col"] in t["pk"] else ""}{escape(c["col"])}'
            f'{"</U>" if c["col"] in t["pk"] else ""} <FONT COLOR="#666666">{escape(corto(c["tipo"]))}'
            f'{" " + marca(t, c["col"]) if marca(t, c["col"]) else ""}</FONT></TD></TR>' for c in t["cols"])
        g.append(f'    "{base}.{tn}" [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="2" COLOR="#888888">'
                 f'<TR><TD BGCOLOR="#e6e6e6" ALIGN="LEFT"><B>{tn}</B></TD></TR>{filas}</TABLE>>];')
    g.append('  }')
vistos = set()
for base, m in modelo.items():
    for tn, t in m["tablas"].items():
        for col, (rt, rc, name, cols, rcols) in t["fk"].items():
            if (tn, name) in vistos:
                continue
            vistos.add((tn, name))
            cola = "teetee" if es_unico(t, cols) else "crowodot"
            g.append(f'  "{base}.{tn}":{cols[0]} -> "{base}.{rt}":{rcols[0]} [arrowtail={cola}, arrowhead=teetee];')
for b1, t1, c1, b2, t2, c2, nota in LOGICAS:
    cola = "teetee" if nota.startswith("1:1") else "crowodot"
    g.append(f'  "{b1}.{t1}":{c1} -> "{b2}.{t2}":{c2} [style=dashed, color="#999999", arrowtail={cola}, arrowhead=teetee];')
g.append('}')
(OUT / "backline-er.dot").write_text("\n".join(g) + "\n", encoding="utf-8")

print("tablas:", sum(len(m["tablas"]) for m in modelo.values()),
      "| FK:", len(vistos), "| lógicas:", len(LOGICAS))
