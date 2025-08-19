import json, os, csv
from datetime import datetime
from typing import Dict, List, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_LEFT

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SESSIONS_DIR = os.path.join(DATA_DIR, "sessions")
USERS_DIR = os.path.join(DATA_DIR, "users")
EXPORTS_DIR = os.path.join(DATA_DIR, "exports")
os.makedirs(SESSIONS_DIR, exist_ok=True)
os.makedirs(USERS_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)

def session_path(sid: str) -> str:
    return os.path.join(SESSIONS_DIR, f"{sid}.json")

def user_memory_path(uid: str) -> str:
    return os.path.join(USERS_DIR, f"{uid}_memory.json")

def read_json(path: str, fb):
    try:
        if not os.path.exists(path): return fb
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return fb

def write_json(path: str, data) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    os.replace(tmp, path)

def list_sessions_meta() -> List[Dict]:
    out = []
    for fn in os.listdir(SESSIONS_DIR):
        if not fn.endswith(".json"): continue
        try:
            j = read_json(os.path.join(SESSIONS_DIR, fn), None)
            if j:
                out.append({
                    "id": j["id"],
                    "title": j.get("title") or j["messages"][0]["content"][:40] if j.get("messages") else "Nueva conversación",
                    "updated_at": j.get("updated_at"),
                    "created_at": j.get("created_at"),
                    "messages": len(j.get("messages", []))
                })
        except Exception:
            pass
    out.sort(key=lambda x: x["updated_at"], reverse=True)
    return out

# ---- Exporters ----

def export_json(session: Dict) -> str:
    name = f'{session["id"]}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json'
    path = os.path.join(EXPORTS_DIR, name)
    write_json(path, session)
    return path

def export_csv(session: Dict) -> str:
    name = f'{session["id"]}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'
    path = os.path.join(EXPORTS_DIR, name)
    rows = [["timestamp", "role", "content"]]
    for m in session.get("messages", []):
        rows.append([m.get("ts"), m.get("role"), m.get("content", "").replace("\n"," ")])
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter=",")
        writer.writerows(rows)
    return path

def export_pdf(session: Dict) -> str:
    name = f'{session["id"]}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.pdf'
    path = os.path.join(EXPORTS_DIR, name)

    doc = SimpleDocTemplate(path, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    title = session.get("title") or "Conversación"
    meta_table = Table([
        ["ID", session["id"]],
        ["Título", title],
        ["Mensajes", str(len(session.get("messages", [])))],
        ["Actualizado", str(session.get("updated_at"))],
    ], colWidths=[3*cm, 11*cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(1,0), colors.lightgrey),
        ("BOX",(0,0),(-1,-1), 0.25, colors.grey),
        ("INNERGRID",(0,0),(-1,-1), 0.25, colors.grey),
        ("ALIGN",(0,0),(-1,-1),"LEFT"),
    ]))
    story.append(Paragraph(f"<b>Conversación</b>: {title}", styles["Title"]))
    story.append(Spacer(1, 8))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    for m in session.get("messages", []):
        role = m.get("role")
        ts = m.get("ts")
        header = f'<b>{role.upper()}</b> · <font color="grey">{ts}</font>'
        story.append(Paragraph(header, styles["Heading4"]))
        txt = m.get("content","").replace("\n", "<br/>")
        p = Paragraph(txt, styles["BodyText"])
        story.append(p)
        story.append(Spacer(1, 6))

    doc.build(story)
    return path


# ... (resto del archivo igual)
ANALYTICS_DIR = os.path.join(DATA_DIR, "analytics")
os.makedirs(ANALYTICS_DIR, exist_ok=True)

def log_event(event: dict) -> str:
    """Guarda eventos línea por línea para análisis (JSONL)."""
    path = os.path.join(ANALYTICS_DIR, "events.jsonl")
    try:
        with open(path, "a", encoding="utf-8") as f:
            import json
            f.write(json.dumps(event, ensure_ascii=False, default=str) + "\n")
    except Exception:
        pass
    return path
