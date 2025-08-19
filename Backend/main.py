import os, re, uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# arriba
from pydantic import BaseModel, Field
from storage import (read_json, write_json, session_path, list_sessions_meta,
                     user_memory_path, export_json, export_csv, export_pdf, log_event)


from models import ChatSession, Message, CreateChatIn, ChatIn


# ---- Config ---
API_PREFIX = "/api"
FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
DEFAULT_USER = "u1"  # en producción, obtén el user_id desde auth o header

# ---- App ----
app = FastAPI(title="Chatbot Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




class AnalyticsEvent(BaseModel):
    type: str
    session_id: str | None = None
    user_id: str | None = None
    data: dict = {}
    ts: datetime = Field(default_factory=datetime.utcnow)

@app.post(API_PREFIX + "/analytics/event")
def analytics_event(ev: AnalyticsEvent):
    log_event(ev.model_dump())
    return {"ok": True}




# ---- Utils: 'aprende' cosas simples del usuario ----
FACT_PATTERNS = [
    (re.compile(r"\bme llamo ([A-Za-zÁÉÍÓÚÜÑñáéíóúü'\- ]{2,})", re.I), "name"),
    (re.compile(r"\bmi nombre es ([A-Za-zÁÉÍÓÚÜÑñáéíóúü'\- ]{2,})", re.I), "name"),
    (re.compile(r"\bvivo en ([A-Za-zÁÉÍÓÚÜÑñáéíóúü'\- ,]{2,})", re.I), "location"),
    (re.compile(r"\bsoy de ([A-Za-zÁÉÍÓÚÜÑñáéíóúü'\- ,]{2,})", re.I), "location"),
    (re.compile(r"\btrabajo en ([A-Za-z0-9ÁÉÍÓÚÜÑñáéíóúü'\- ,]{2,})", re.I), "job"),
    (re.compile(r"\bmi color favorito es ([A-Za-zÁÉÍÓÚÜÑñáéíóúü'\- ]{2,})", re.I), "fav_color"),
    (re.compile(r"\bme gusta[n]? ([A-Za-z0-9ÁÉÍÓÚÜÑñáéíóúü'\- ,]{2,})", re.I), "likes"),
]

def extract_facts(text: str) -> dict:
    facts = {}
    for rx, key in FACT_PATTERNS:
        m = rx.search(text)
        if m:
            facts[key] = m.group(1).strip()
    return facts

def merge_user_memory(user_id: str, new_facts: dict) -> dict:
    path = user_memory_path(user_id)
    cur = read_json(path, {})
    cur.update({k: v for k, v in new_facts.items() if v})
    write_json(path, cur)
    return cur

# ---- Optional: usar OpenAI si hay API key ----
USE_OPENAI = bool(os.environ.get("OPENAI_API_KEY"))
if USE_OPENAI:
    from openai import OpenAI
    oai = OpenAI()

def generate_reply(session: ChatSession, user_text: str) -> str:
    """
    Si hay OPENAI_API_KEY usa GPT; si no, usa un modelo sencillo "reflexivo" + memoria.
    """
    memory = session.memory or {}
    sys_prompt = (
        "Eres un asistente útil y amable. Responde en español. "
        "Si el usuario te ha dicho su nombre/ubicación/gustos antes, utilízalos para personalizar."
    )
    persona = []
    if "name" in memory: persona.append(f"Se llama {memory['name']}.")
    if "location" in memory: persona.append(f"Vive en {memory['location']}.")
    if "job" in memory: persona.append(f"Trabaja en {memory['job']}.")
    if "fav_color" in memory: persona.append(f"Su color favorito es {memory['fav_color']}.")
    if "likes" in memory: persona.append(f"Le gusta {memory['likes']}.")
    persona_str = " ".join(persona) if persona else "Aún no sabes datos del usuario."

    if USE_OPENAI:
        msgs = [{"role": "system", "content": sys_prompt + " " + persona_str}]
        for m in session.messages[-12:]:
            msgs.append({"role": m.role, "content": m.content})
        msgs.append({"role": "user", "content": user_text})
        resp = oai.chat.completions.create(
            model="gpt-4o-mini",
            messages=msgs,
            temperature=0.7,
        )
        return resp.choices[0].message.content.strip()

    # --- Fallback simple (sin OpenAI) ---
    # Reglas básicas + eco con cortesía y memoria
    if re.search(r"\b(hola|buenas|qué tal)\b", user_text, re.I):
        name = session.memory.get("name")
        return f"¡Hola{f' {name}' if name else ''}! ¿En qué puedo ayudarte hoy?"
    if re.search(r"\bqu[ié]n eres\b", user_text, re.I):
        return "Soy tu asistente. Puedo ayudarte a escribir, analizar y organizar ideas."
    if re.search(r"\bmi nombre es\b|\bme llamo\b", user_text, re.I):
        facts = extract_facts(user_text)
        n = facts.get("name")
        return f"¡Encantado{f', {n}' if n else ''}! Lo recordaré."
    if re.search(r"\b(ad[ií]os|gracias)\b", user_text, re.I):
        return "¡Gracias a ti! Estoy aquí cuando me necesites."

    # Eco empático (muy simple)
    return f"Entiendo. Me dices: “{user_text[:220]}”. ¿Podrías contarme un poco más?"
# ---- End utils ----

# ---------- Endpoints ----------

@app.get(API_PREFIX + "/chats")
def list_chats():
    return {"items": list_sessions_meta()}

@app.post(API_PREFIX + "/chats")
def create_chat(payload: CreateChatIn):
    sid = uuid.uuid4().hex[:12]
    title = payload.title or "Nueva conversación"
    session = ChatSession(id=sid, title=title, user_id=DEFAULT_USER)
    write_json(session_path(sid), session.model_dump())
    return {"id": sid, "title": title}

@app.get(API_PREFIX + "/chats/{sid}")
def get_chat(sid: str):
    data = read_json(session_path(sid), None)
    if not data:
        raise HTTPException(404, "Sesión no encontrada")
    return data

@app.delete(API_PREFIX + "/chats/{sid}")
def delete_chat(sid: str):
    p = session_path(sid)
    if not os.path.exists(p):
        raise HTTPException(404, "Sesión no encontrada")
    os.remove(p)
    return {"ok": True}

@app.get(API_PREFIX + "/memory/{sid}")
def get_memory(sid: str):
    data = read_json(session_path(sid), None)
    if not data: raise HTTPException(404, "Sesión no encontrada")
    return data.get("memory", {})

@app.post(API_PREFIX + "/chat/{sid}")
def chat_to_session(sid: str, payload: ChatIn):
    p = session_path(sid)
    data = read_json(p, None)
    if not data: raise HTTPException(404, "Sesión no encontrada")

    session = ChatSession(**data)
    user_msg = Message(role="user", content=payload.message, ts=datetime.utcnow())
    session.messages.append(user_msg)


 log_event({"type":"user_message","session_id":sid,"user_id":session.user_id,
               "data":{"len":len(payload.message)}})

    reply_text = generate_reply(session, payload.message)
    asst_msg = Message(role="assistant", content=reply_text, ts=datetime.utcnow())
    session.messages.append(asst_msg)

    # log de respuesta
    log_event({"type":"assistant_message","session_id":sid,"user_id":session.user_id,
               "data":{"len":len(reply_text)}})



    # aprender hechos
    facts = extract_facts(payload.message)
    if facts:
        # actualiza memoria de sesión y global por usuario
        session.memory.update(facts)
        merge_user_memory(session.user_id, facts)

    # generar respuesta
    reply_text = generate_reply(session, payload.message)
    asst_msg = Message(role="assistant", content=reply_text, ts=datetime.utcnow())
    session.messages.append(asst_msg)

    # refrescar título si está vacío
    if session.title == "Nueva conversación" and session.messages:
        session.title = session.messages[0].content[:40]

    session.updated_at = datetime.utcnow()
    write_json(p, session.model_dump())

    return {"reply": reply_text, "memory": session.memory}

@app.get(API_PREFIX + "/chats/{sid}/export")
def export_chat(sid: str, fmt: str):
    data = read_json(session_path(sid), None)
    if not data: raise HTTPException(404, "Sesión no encontrada")
    if fmt == "json":
        path = export_json(data)
    elif fmt == "csv":
        path = export_csv(data)
    elif fmt == "pdf":
        path = export_pdf(data)
    else:
        raise HTTPException(400, "Formato no soportado")
    return FileResponse(path, filename=os.path.basename(path))
