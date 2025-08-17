import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BsSearch, BsGlobe, BsLock, BsPeople, BsArrowRight } from "react-icons/bs";

const GROUPS_KEY = "groups_v1";
const CURRENT_USER = { id: "u1", name: "Justo" };

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState(() => readJSON(GROUPS_KEY, []));
  const [q, setQ] = useState("");

  const mine = useMemo(() => groups.filter(g => g.members?.includes(CURRENT_USER.id)), [groups]);
  const recs = useMemo(() => {
    const base = groups.filter(g => !(g.members?.includes(CURRENT_USER.id)));
    // Recomendados simples: públicos primero, luego recientes
    return [...base].sort((a, b) => {
      if (a.privacy !== b.privacy) return a.privacy === "public" ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [groups]);

  const searchFilter = (arr) => {
    const s = q.trim().toLowerCase();
    if (!s) return arr;
    return arr.filter(g =>
      g.name.toLowerCase().includes(s) ||
      (g.description || "").toLowerCase().includes(s)
    );
  };

  const join = (slug) => {
    const updated = groups.map(g =>
      g.slug === slug
        ? { ...g, members: Array.from(new Set([...(g.members || []), CURRENT_USER.id])) }
        : g
    );
    setGroups(updated); writeJSON(GROUPS_KEY, updated);
  };

  const leave = (slug) => {
    const updated = groups.map(g =>
      g.slug === slug
        ? { ...g, members: (g.members || []).filter(id => id !== CURRENT_USER.id) }
        : g
    );
    setGroups(updated); writeJSON(GROUPS_KEY, updated);
  };

  return (
    <section className="content-stack">
      <div className="d-flex align-items-center justify-content-between">
        <h2>Grupos</h2>
        <Link to="/groups/new" className="btn btn-primary">Crear grupo</Link>
      </div>

      {/* Buscador */}
      <div className="card">
        <div className="input-group">
          <span className="input-group-text bg-transparent text-secondary border-secondary-subtle">
            <BsSearch />
          </span>
          <input
            className="form-control bg-transparent text-light border-secondary-subtle"
            placeholder="Buscar grupos por nombre o descripción"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Tus grupos */}
      <div className="card">
        <h4 className="card-title d-flex align-items-center gap-2">
          <BsPeople /> Tus grupos
        </h4>
        {searchFilter(mine).length === 0 ? (
          <div className="muted">No perteneces a ningún grupo todavía.</div>
        ) : (
          <div className="groups-grid">
            {searchFilter(mine).map(g => (
              <GroupItem key={g.id} g={g} onView={() => navigate(`/groups/${g.slug}`)} onLeave={() => leave(g.slug)} />
            ))}
          </div>
        )}
      </div>

      {/* Recomendados */}
      <div className="card">
        <h4 className="card-title">Recomendados para ti</h4>
        {searchFilter(recs).length === 0 ? (
          <div className="muted">No hay recomendaciones con este filtro.</div>
        ) : (
          <div className="groups-grid">
            {searchFilter(recs).slice(0, 12).map(g => (
              <GroupItem
                key={g.id}
                g={g}
                onView={() => navigate(`/groups/${g.slug}`)}
                onJoin={() => join(g.slug)}
                joined={g.members?.includes(CURRENT_USER.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GroupItem({ g, onView, onJoin, onLeave, joined }) {
  const isJoined = joined ?? g.members?.includes("u1");
  return (
    <div className="group-card">
      <div className="gc-cover">
        {g.cover ? <img src={g.cover} alt="cover" /> : <div className="cover-fallback" />}
      </div>
      <div className="gc-body">
        <div className="gc-head">
          <div className="gc-avatar">{g.avatar ? <img src={g.avatar} alt={g.name} /> : "👥"}</div>
          <div className="gc-title">
            <div className="gc-name">{g.name}</div>
            <div className="gc-meta">
              {g.privacy === "private" ? <><BsLock /> Privado</> : <><BsGlobe /> Público</>} · {new Date(g.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        {g.description && <p className="gc-desc">{g.description}</p>}
        <div className="d-flex gap-2">
          <button className="btn btn-ghost" onClick={onView}>
            Ver <BsArrowRight className="ms-1" />
          </button>
          {!isJoined ? (
            <button className="btn btn-primary" onClick={onJoin}>Unirse</button>
          ) : (
            <button className="btn btn-outline-secondary" onClick={onLeave}>Salir</button>
          )}
        </div>
      </div>
    </div>
  );
}
