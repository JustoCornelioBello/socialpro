import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BsTrash, BsArrowCounterclockwise } from "react-icons/bs";

const STORAGE_KEY = "stories_v1";
const TRASH_KEY   = "stories_trash_v1";

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const MS_30D = 30*24*60*60*1000;

export default function StoriesTrash() {
  const navigate = useNavigate();
  const [trash, setTrash] = useState(()=>readJSON(TRASH_KEY, []));

  // Autolimpieza al entrar
  useEffect(() => {
    const now = Date.now();
    const keep = trash.filter(t => (now - new Date(t.deletedAt).getTime()) < MS_30D);
    if (keep.length !== trash.length) {
      setTrash(keep);
      writeJSON(TRASH_KEY, keep);
    }
    // eslint-disable-next-line
  }, []);

  const daysLeft = (dAt) => {
    const leftMs = MS_30D - (Date.now() - new Date(dAt).getTime());
    return Math.max(0, Math.ceil(leftMs / (24*60*60*1000)));
  };

  const restore = (id) => {
    const list = readJSON(TRASH_KEY, []);
    const ix = list.findIndex(x => x.id===id); if (ix<0) return;
    const [it] = list.splice(ix,1);
    writeJSON(TRASH_KEY, list);
    // devolver a historias
    const stories = readJSON(STORAGE_KEY, []);
    writeJSON(STORAGE_KEY, [it, ...stories]);
    setTrash(list);
  };

  const removeForever = (id) => {
    if (!confirm("Eliminar definitivamente esta historia?")) return;
    const list = readJSON(TRASH_KEY, []);
    const next = list.filter(x => x.id !== id);
    writeJSON(TRASH_KEY, next);
    setTrash(next);
  };

  return (
    <section className="content-stack">
      <div className="card d-flex align-items-center justify-content-between" style={{ padding:12 }}>
        <strong>Papelera</strong>
        <button className="btn btn-ghost btn-sm" onClick={()=>navigate("/stories")}>Volver</button>
      </div>

      <div className="cards-grid">
        {trash.length===0 && <div className="text-secondary">Tu papelera está vacía.</div>}
        {trash.map(s => (
          <div className="card" key={s.id}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="fw-bold">{s.title || <span className="text-secondary">Sin título</span>}</div>
                <div className="small text-secondary">Se elimina en {daysLeft(s.deletedAt)} día(s)</div>
              </div>
              <div className="d-flex" style={{ gap:8 }}>
                <button className="btn btn-primary btn-sm" title="Restaurar" onClick={()=>restore(s.id)}>
                  <BsArrowCounterclockwise className="me-1" /> Restaurar
                </button>
                <button className="btn btn-ghost btn-sm text-danger" title="Eliminar definitivamente" onClick={()=>removeForever(s.id)}>
                  <BsTrash className="me-1" /> Eliminar
                </button>
              </div>
            </div>
            {s.cover && (
              <div className="story-cover-preview mt-2">
                <img src={s.cover} alt="Portada" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
