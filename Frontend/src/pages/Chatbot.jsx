// src/pages/Chatbot.jsx
import { useEffect, useRef, useState } from "react";
import { BsSend } from "react-icons/bs";

const API = "http://localhost:8000/api";
const fmtDate = (iso) => new Date(iso).toLocaleString();

function MessageBubble({ m }) {
  const isUser = m.role === "user";
  return (
    <div className={`msg-row ${isUser ? "me" : "bot"}`}>
      <div className="bubble">
        <div className="meta">
          {isUser ? "Tú" : "Asistente"} · <span className="ts">{fmtDate(m.ts)}</span>
        </div>
        <div className="content">{m.content}</div>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="msg-row bot">
      <div className="bubble typing">
        <div className="dots">
          <span/><span/><span/>
        </div>
      </div>
    </div>
  );
}

export default function Chatbot() {
  const [sid, setSid] = useState(localStorage.getItem("chat_sid") || null);
  const [session, setSession] = useState(null);     // {messages: [...]}
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const listRef = useRef(null);

  // ---- Telemetría básica (guardado automático en backend) ----
  const track = async (type, data = {}) => {
    try {
      await fetch(`${API}/analytics/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, session_id: sid, user_id: "u1", data }),
      });
    } catch {}
  };

  // Crear sesión si no existe
  const ensureSession = async () => {
    if (sid) return sid;
    const res = await fetch(`${API}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const js = await res.json();
    localStorage.setItem("chat_sid", js.id);
    setSid(js.id);
    return js.id;
  };

  const loadSession = async (id = sid) => {
    if (!id) return;
    const res = await fetch(`${API}/chats/${id}`);
    if (!res.ok) return;
    const js = await res.json();
    setSession(js);
    // autoscroll
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 40);
  };

  // Efecto máquina de escribir para la respuesta del bot
  const typeReply = async (fullText) => {
    // agrega un mensaje temporal con flag _typing
    const temp = { role: "assistant", content: "", ts: new Date().toISOString(), _typing: true };
    setSession(prev => prev ? { ...prev, messages: [...prev.messages, temp] } : prev);

    let i = 0;
    // velocidad dinámica según longitud
    const speed = Math.min(28, Math.max(8, Math.round(1800 / (fullText.length + 10))));
    await new Promise((resolve) => {
      const timer = setInterval(() => {
        i += 1;
        setSession(prev => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const idx = msgs.findIndex(x => x._typing);
          if (idx >= 0) msgs[idx] = { ...msgs[idx], content: fullText.slice(0, i) };
          return { ...prev, messages: msgs };
        });
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });

        if (i >= fullText.length) {
          clearInterval(timer);
          setSession(prev => {
            if (!prev) return prev;
            const msgs = [...prev.messages];
            const idx = msgs.findIndex(x => x._typing);
            if (idx >= 0) { delete msgs[idx]._typing; }
            return { ...prev, messages: msgs };
          });
          resolve();
        }
      }, speed);
    });

    // sincroniza contra el backend por si hubo cambios
    await loadSession();
  };

  const send = async () => {
    const msg = input.trim();
    if (!msg) return;

    setSending(true);
    setBotTyping(true);
    setInput("");

    const sidNow = await ensureSession();

    // append optimista del usuario
    setSession(prev => prev
      ? { ...prev, messages: [...prev.messages, { role: "user", content: msg, ts: new Date().toISOString() }] }
      : { messages: [{ role: "user", content: msg, ts: new Date().toISOString() }] }
    );
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });

    track("send_message", { len: msg.length });

    try {
      const t0 = performance.now();
      const res = await fetch(`${API}/chat/${sidNow}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const js = await res.json();
      const reply = js?.reply || "…";
      const latency = performance.now() - t0;

      track("receive_reply", { len: reply.length, latency_ms: Math.round(latency) });

      setBotTyping(false);
      await typeReply(reply);
      track("assistant_render_complete", { len: reply.length });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    (async () => {
      const id = await ensureSession();
      await loadSession(id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="content-stack">
      <div className="chat-full card glass">
        <div className="messages" ref={listRef}>
          {!session?.messages?.length && (
            <div className="empty-hint fade-in">Escribe un mensaje para empezar la conversación.</div>
          )}
          {session?.messages?.map((m, i) => <MessageBubble key={i} m={m} />)}
          {botTyping && <TypingBubble />}
        </div>

        <div className="composer">
          <input
            className="form-control chat-input"
            placeholder="Escribe tu mensaje…"
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="btn btn-primary chat-send" onClick={send} disabled={sending}>
            <BsSend className="me-1" /> {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </section>
  );
}
