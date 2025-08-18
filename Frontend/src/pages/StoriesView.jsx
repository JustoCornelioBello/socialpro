import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

const STORAGE_KEY = "stories_v1";
const HISTORY_KEY = "stories_read_history_v1";
const CURRENT_USER = { id: "u1", handle: "justo", name: "Justo" };

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function StoriesView() {
  const { id } = useParams();
  const [stories, setStories] = useState(()=>readJSON(STORAGE_KEY, []));
  const s = stories.find(x=>x.id===id);

  // incrementar vistas + registrar historial del usuario
  useEffect(() => {
    if (!s || !s.published) return;

    // 1) Stats en la historia
    setStories(prev => {
      const ix = prev.findIndex(x=>x.id===id);
      if (ix<0) return prev;
      const next = [...prev];
      const stats = {
        ...(next[ix].stats || { downloads:{pdf:0,doc:0,json:0} }),
        views: (next[ix].stats?.views || 0) + 1,
        lastReadAt: new Date().toISOString()
      };
      next[ix] = { ...next[ix], stats };
      writeJSON(STORAGE_KEY, next);
      return next;
    });

    // 2) Historial por usuario
    const key = `${HISTORY_KEY}_${CURRENT_USER.handle}`;
    const hist = readJSON(key, []);
    hist.unshift({ id, title: s.title, ts: new Date().toISOString() });
    writeJSON(key, hist.slice(0, 200)); // límite simple
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!s || !s.published) {
    return (
      <section className="content-stack">
        <div className="card" style={{textAlign:"center"}}>
          <h4>Historia no disponible</h4>
          <p className="text-secondary">Puede que haya sido eliminada o aún no esté publicada.</p>
          <Link className="btn btn-primary" to="/stories">Volver a Historias</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="content-stack">
      <article className="card story-public">
        {s.cover && (
          <div className="story-cover-view">
            <img src={s.cover} alt="Portada" />
          </div>
        )}
        <h1 className="story-title">{s.title || "Sin título"}</h1>
        <div className="text-secondary small">Categoría: {s.category} · {new Date(s.updatedAt).toLocaleString()}</div>
        <div className="story-content" style={{ fontFamily:s.font, fontSize:s.fontSize, color:'#fff' }}
             dangerouslySetInnerHTML={{ __html: s.contentHTML }} />
      </article>
    </section>
  );
}
