import { useEffect, useMemo, useRef, useState } from "react";
import {
  BsSearch, BsThreeDots, BsPinAngle, BsPinAngleFill,
  BsPaperclip, BsEmojiSmile, BsSend,
  BsTelephone, BsCameraVideo, BsInfoCircle,
  BsTrash, BsBellSlash
} from "react-icons/bs";

const THREADS_MOCK = [
  { id: 1, name: "María Gómez", initials: "MG", last: "¿Listo el diseño?", time: "12:03", unread: 2, pinned: true, online: true },
  { id: 2, name: "React RD", initials: "RD", last: "Nueva meetup este viernes", time: "10:41", unread: 0, pinned: false, online: false },
  { id: 3, name: "Juan Pérez", initials: "JP", last: "Te mando el repo", time: "Ayer", unread: 1, pinned: false, online: true },
  { id: 4, name: "Diseño UX", initials: "UX", last: "Mockups listos", time: "Ayer", unread: 0, pinned: false, online: false },
];

const MSGS_MOCK = {
  1: [
    { id: "m1", fromMe: false, text: "Hola! ¿cómo vas?", time: "11:58" },
    { id: "m2", fromMe: true, text: "Bien! avanzando el layout 💪", time: "12:00" },
    { id: "m3", fromMe: false, text: "¿Listo el diseño?", time: "12:03" },
  ],
  2: [{ id: "m4", fromMe: false, text: "Nueva meetup este viernes", time: "10:41" }],
  3: [
    { id: "m5", fromMe: true, text: "Te mando el repo", time: "Ayer" },
    { id: "m6", fromMe: false, text: "Perfecto!", time: "Ayer" },
  ],
  4: [{ id: "m7", fromMe: false, text: "Mockups listos", time: "Ayer" }],
};

export default function Messages() {
  const [threads, setThreads] = useState(THREADS_MOCK);
  const [messagesByThread, setMessagesByThread] = useState(MSGS_MOCK);
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? null);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");

  const chatBodyRef = useRef(null);

  const currentThread = useMemo(
    () => threads.find(t => t.id === selectedId) || null,
    [threads, selectedId]
  );
  const currentMessages = messagesByThread[selectedId] || [];

  // Autoscroll al final
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [selectedId, currentMessages]);

  // Orden: fijados primero, luego por no leídos, luego por hora (mock simple)
  const stripThreads = useMemo(() => {
    const q = filter.toLowerCase().trim();
    const base = threads.filter(t =>
      !q || t.name.toLowerCase().includes(q) || (t.last || "").toLowerCase().includes(q)
    );
    return [...base].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if ((b.unread > 0) !== (a.unread > 0)) return b.unread - a.unread;
      return 0;
    });
  }, [threads, filter]);

  const selectThread = (id) => {
    setSelectedId(id);
    // marcar como leído al abrir
    setThreads(prev => prev.map(t => t.id === id ? { ...t, unread: 0 } : t));
  };

  const togglePin = (id) => setThreads(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
  const deleteThread = (id) => {
    if (!window.confirm("¿Eliminar conversación?")) return;
    setThreads(prev => prev.filter(t => t.id !== id));
    setMessagesByThread(prev => { const cp = { ...prev }; delete cp[id]; return cp; });
    if (selectedId === id) {
      const next = threads.find(t => t.id !== id)?.id ?? null;
      setSelectedId(next);
    }
  };
  const muteThread = () => alert("Silenciado (placeholder)");

  const sendMessage = () => {
    const value = text.trim();
    if (!value || !selectedId) return;
    const newMsg = {
      id: `m${Date.now()}`,
      fromMe: true,
      text: value,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessagesByThread(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newMsg],
    }));
    setThreads(prev => prev.map(t =>
      t.id === selectedId ? { ...t, last: value, time: "Ahora" } : t
    ));
    setText("");
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <section className="content-stack">
      <h2>Mensajes</h2>

      {/* ====== STRIP superior como "estados" ====== */}
      <div className="card p-2 thread-strip">
        <div className="strip-tools">
          <div className="input-group input-group-sm strip-search">
            <span className="input-group-text bg-transparent text-secondary border-secondary-subtle">
              <BsSearch />
            </span>
            <input
              className="form-control bg-transparent text-light border-secondary-subtle"
              placeholder="Buscar chats…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="strip-scroll">
          {stripThreads.map(t => (
            <button
              key={t.id}
              className={`thread-chip ${t.id === selectedId ? "active" : ""}`}
              onClick={() => selectThread(t.id)}
              title={t.name}
            >
              <div className={`chip-avatar ${t.online ? "online" : ""} ${t.unread ? "ring-unread" : ""} ${t.pinned ? "ring-pinned" : ""}`}>
                {t.initials}
              </div>
              <div className="chip-name">{t.name}</div>
              {t.unread > 0 && <span className="chip-badge">{t.unread}</span>}
              {t.pinned && <span className="chip-pin" title="Fijado"><BsPinAngleFill /></span>}
            </button>
          ))}
        </div>
      </div>

      {/* ====== CHAT a pantalla completa ====== */}
      <div className="card p-0 msg-fullshell">
        {!currentThread ? (
          <div className="msg-empty h-100 d-flex align-items-center justify-content-center text-secondary">
            Selecciona una conversación
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <header className="msg-chat-header border-bottom">
              <div className="d-flex align-items-center gap-2">
                <div className={`msg-avatar ${currentThread.online ? "online" : ""}`}>
                  {currentThread.initials}
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <strong>{currentThread.name}</strong>
                    {currentThread.online && <span className="badge text-bg-success">En línea</span>}
                  </div>
                  <small className="text-secondary">Último mensaje: {currentThread.time}</small>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button className="btn btn-sm btn-outline-secondary" title="Llamar">
                  <BsTelephone />
                </button>
                <button className="btn btn-sm btn-outline-secondary" title="Video">
                  <BsCameraVideo />
                </button>
                <button className="btn btn-sm btn-outline-secondary" title="Info">
                  <BsInfoCircle />
                </button>

                {/* Menú opciones del chat actual */}
                <div className="dropdown">
                  <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                    <BsThreeDots />
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <button className="dropdown-item" onClick={() => togglePin(currentThread.id)}>
                        {currentThread.pinned ? <BsPinAngle className="me-2" /> : <BsPinAngleFill className="me-2" />}
                        {currentThread.pinned ? "Desfijar" : "Fijar conversación"}
                      </button>
                    </li>
                    <li>
                      <button className="dropdown-item" onClick={() => muteThread(currentThread.id)}>
                        <BsBellSlash className="me-2" /> Silenciar
                      </button>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={() => deleteThread(currentThread.id)}>
                        <BsTrash className="me-2" /> Eliminar chat
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </header>

            {/* Cuerpo del chat */}
            <div className="msg-body" ref={chatBodyRef}>
              {currentMessages.map(m => (
                <div key={m.id} className={`msg-row ${m.fromMe ? "from-me" : "from-them"}`}>
                  <div className="msg-bubble">
                    <div className="msg-text">{m.text}</div>
                    <div className="msg-time">{m.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <footer className="msg-input border-top">
              <div className="d-flex align-items-end gap-2 w-100">
                <button className="btn btn-outline-secondary" title="Adjuntar archivo">
                  <BsPaperclip />
                </button>
                <button className="btn btn-outline-secondary" title="Emoji">
                  <BsEmojiSmile />
                </button>
                <textarea
                  className="form-control bg-transparent text-light border-secondary-subtle"
                  placeholder="Escribe un mensaje… (Enter para enviar)"
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                />
                <button className="btn btn-primary" onClick={sendMessage} title="Enviar">
                  <BsSend />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </section>
  );
}
