import { useMemo, useState, useEffect } from "react";
import {
  BsBell, BsCheck2All, BsThreeDots, BsFilter,
  BsHeart, BsChatLeftText, BsPersonPlus, BsAt,
  BsBellSlash, BsTrash, BsEye, BsPeople
} from "react-icons/bs";

const NOTIF_KEY = "notifications_v1";
const GROUPS_KEY = "groups_v1";
const CURRENT_USER = { id: "u1", name: "Justo", handle: "justo" };

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Semilla inicial si no hay nada guardado
const SEED = [
  { id: "n1", type: "like", title: "A María le gustó tu publicación", meta: "Hace 5 min", unread: true },
  { id: "n2", type: "mention", title: "@edtech_news te mencionó", meta: "Hace 20 min", unread: true },
  { id: "n3", type: "comment", title: "Nuevo comentario en tu post", meta: "Hace 1 h", unread: false },
  { id: "n4", type: "follow", title: "Juan Pérez empezó a seguirte", meta: "Ayer", unread: false },
];

export default function Notifications() {
  // Cargar/persistir
  const [items, setItems] = useState(() => {
    const saved = readJSON(NOTIF_KEY, null);
    return saved ?? SEED;
  });
  useEffect(() => writeJSON(NOTIF_KEY, items), [items]);

  // Filtros Offcanvas
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [types, setTypes] = useState({
    like: true, mention: true, comment: true, follow: true, invite: true,
  });

  // Mostrar solo invitaciones dirigidas a mí (si tienen target)
  const visible = useMemo(() => {
    return items.filter(n => {
      if (onlyUnread && !n.unread) return false;
      if (!types[n.type]) return false;
      if (n.type === "invite" && n.targetHandle && n.targetHandle !== CURRENT_USER.handle) return false;
      return true;
    });
  }, [items, onlyUnread, types]);

  const unreadCount = items.filter(n =>
    n.unread && (n.type !== "invite" || !n.targetHandle || n.targetHandle === CURRENT_USER.handle)
  ).length;

  // Acciones header
  const markAllAsRead = () => setItems(prev => prev.map(n => ({ ...n, unread: false })));
  const markAllAsUnread = () => setItems(prev => prev.map(n => ({ ...n, unread: true })));
  const clearAll = () => { if (confirm("¿Eliminar todas las notificaciones?")) setItems([]); };

  // Acciones item
  const toggleRead = (id) => setItems(prev => prev.map(n => n.id === id ? ({ ...n, unread: !n.unread }) : n));
  const removeOne = (id) => setItems(prev => prev.filter(n => n.id !== id));

  // Aceptar invitación → te une al grupo
  const acceptInvite = (n) => {
    const gSlug = n?.payload?.groupSlug;
    if (!gSlug) return;
    const groups = readJSON(GROUPS_KEY, []);
    const updated = groups.map(g => g.slug === gSlug
      ? { ...g, members: Array.from(new Set([...(g.members || []), CURRENT_USER.id])) }
      : g
    );
    writeJSON(GROUPS_KEY, updated);
    // marcar notificación como leída + texto
    setItems(prev => prev.map(x => x.id === n.id ? ({ ...x, unread: false, meta: "Aceptada" }) : x));
    alert(`Te uniste a ${n.payload.groupName} ✅`);
  };
  const rejectInvite = (n) => {
    setItems(prev => prev.map(x => x.id === n.id ? ({ ...x, unread: false, meta: "Rechazada" }) : x));
  };

  // Helpers Offcanvas
  const resetFilters = () => {
    setOnlyUnread(false);
    setTypes({ like: true, mention: true, comment: true, follow: true, invite: true });
  };
  const toggleType = (key) => setTypes(t => ({ ...t, [key]: !t[key] }));

  const iconFor = (t) =>
    t === "like" ? <BsHeart className="text-danger" /> :
    t === "mention" ? <BsAt className="text-primary" /> :
    t === "comment" ? <BsChatLeftText className="text-success" /> :
    t === "follow" ? <BsPersonPlus className="text-info" /> :
    t === "invite" ? <BsPeople className="text-warning" /> : "🔔";

  return (
    <section className="content-stack">
      <div className="card p-0 border-0 bg-transparent">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h2 className="h5 d-flex align-items-center gap-2 m-0">
            <BsBell /> Notificaciones
            {unreadCount > 0 && <span className="badge text-bg-primary">{unreadCount} nuevas</span>}
          </h2>

          <div className="d-flex align-items-center gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={markAllAsRead}>
              <BsCheck2All className="me-1" /> Marcar todo
            </button>

            <button
              type="button" className="btn btn-sm btn-outline-secondary"
              data-bs-toggle="offcanvas" data-bs-target="#notifFilters" aria-controls="notifFilters"
            >
              <BsFilter />
            </button>

            {/* Dropdown tres puntitos */}
            <div className="dropdown">
              <button type="button" className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                <BsThreeDots />
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><button className="dropdown-item" onClick={markAllAsRead}><BsCheck2All className="me-2" />Marcar todo leído</button></li>
                <li><button className="dropdown-item" onClick={markAllAsUnread}><BsBellSlash className="me-2" />Marcar todo no leído</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item text-danger" onClick={clearAll}><BsTrash className="me-2" />Eliminar todas</button></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Lista */}
        <ul className="list-group shadow-sm">
          {visible.length === 0 && (
            <li className="list-group-item py-4 text-center text-muted">No hay notificaciones con los filtros actuales.</li>
          )}

          {visible.map((n) => (
            <li
              key={n.id}
              className={`list-group-item d-flex align-items-center justify-content-between ${n.unread ? "list-group-item-action bg-opacity-25 bg-primary-subtle" : ""}`}
            >
              <div className="d-flex align-items-center gap-3">
                <div className={`d-inline-flex align-items-center justify-content-center rounded-circle border ${n.unread ? "border-primary" : "border-secondary-subtle"}`} style={{ width: 40, height: 40 }}>
                  {iconFor(n.type)}
                </div>
                <div>
                  <div className="fw-semibold">
                    {n.title}
                    {n.type === "invite" && n.payload?.groupName && <span className="text-secondary"> · {n.payload.groupName}</span>}
                  </div>
                  <small className="text-secondary">{n.meta}</small>
                </div>
              </div>

              {/* Acciones por item */}
              <div className="d-flex align-items-center gap-2">
                {/* Invitaciones: aceptar / rechazar */}
                {n.type === "invite" && (!n.targetHandle || n.targetHandle === CURRENT_USER.handle) && (
                  <>
                    <button className="btn btn-sm btn-primary" onClick={() => acceptInvite(n)}>Aceptar</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => rejectInvite(n)}>Rechazar</button>
                  </>
                )}

                {n.unread && <span className="badge rounded-pill text-bg-primary">Nuevo</span>}
                <button
                  className={`btn btn-sm ${n.unread ? "btn-outline-primary" : "btn-outline-secondary"}`}
                  onClick={() => toggleRead(n.id)}
                >
                  {n.unread ? "Marcar leído" : "Marcar no leído"}
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => removeOne(n.id)} title="Eliminar">
                  <BsTrash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* OFFCANVAS filtros */}
      <div className="offcanvas offcanvas-end" tabIndex="-1" id="notifFilters" aria-labelledby="notifFiltersLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="notifFiltersLabel">Filtros de notificaciones</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Cerrar"></button>
        </div>

        <div className="offcanvas-body">
          <div className="form-check form-switch mb-3">
            <input className="form-check-input" type="checkbox" id="onlyUnreadSwitch" checked={onlyUnread} onChange={() => setOnlyUnread(v => !v)} />
            <label className="form-check-label" htmlFor="onlyUnreadSwitch">Mostrar solo no leídas</label>
          </div>

          <div className="mb-3">
            <div className="fw-semibold mb-2">Tipos</div>
            <div className="row g-2">
              {[
                ["like","Me gusta"],["mention","Menciones"],["comment","Comentarios"],["follow","Seguimientos"],["invite","Invitaciones"],
              ].map(([key,label]) => (
                <div className="col-6" key={key}>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id={`type-${key}`} checked={types[key]} onChange={() => toggleType(key)} />
                    <label className="form-check-label" htmlFor={`type-${key}`}>{label}</label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="offcanvas-footer border-top p-3 d-flex justify-content-between">
          <button type="button" className="btn btn-outline-secondary" onClick={resetFilters}>Restablecer</button>
          <button type="button" className="btn btn-primary" data-bs-dismiss="offcanvas">Aplicar</button>
        </div>
      </div>
    </section>
  );
}
