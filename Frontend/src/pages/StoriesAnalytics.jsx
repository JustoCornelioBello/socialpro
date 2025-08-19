// src/pages/StoriesAnalytics.jsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BsGraphUp, BsGraphUpArrow, BsClockHistory, BsTrophy, BsBook,
  BsShare, BsDownload, BsFire, BsArrowCounterclockwise
} from "react-icons/bs";

const STORIES_KEY = "stories_v1";
const HISTORY_KEY = "stories_read_history_v1"; // por usuario: HISTORY_KEY_handle
const FEED_KEY = "feed_posts_v1";
const CURRENT_USER = { id: "u1", handle: "justo", name: "Justo" };

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function stripHtml(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}
function wordsCount(html = "") {
  const txt = stripHtml(html);
  if (!txt) return 0;
  return txt.split(/\s+/).filter(Boolean).length;
}
function minutesReadEstimate(words, wpm = 220) {
  return Math.max(1, Math.round(words / wpm));
}

/* ---------- tiny sparkline (SVG) ---------- */
function Sparkline({ data = [], height = 40, strokeWidth = 2 }) {
  const max = Math.max(1, ...data);
  const w = Math.max(60, data.length * 12);
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * (w - 4) + 2;
    const y = height - (v / max) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth={strokeWidth} points={pts || `0,${height} ${w},${height}`} />
    </svg>
  );
}

/* ---------- heatmap day/hour ---------- */
function Heatmap({ matrix /* 7x24 */, max }) {
  return (
    <div className="heatmap">
      {matrix.map((row, r) => (
        <div className="heat-row" key={r}>
          {row.map((v, c) => {
            const alpha = max ? v / max : 0;
            const bg = `rgba(0, 173, 181, ${alpha})`;
            return <div key={c} className="heat-cell" title={`${v} lecturas`} style={{ background: bg }} />;
          })}
        </div>
      ))}
    </div>
  );
}

export default function StoriesAnalytics() {
  // lee del storage (simple; al reset forzamos recarga para refrescar cálculos)
  const stories = readJSON(STORIES_KEY, []);
  const history = readJSON(`${HISTORY_KEY}_${CURRENT_USER.handle}`, []); // [{id, title, ts}]
  const feed = readJSON(FEED_KEY, []);

  /* ======= Acciones: RESET ======= */
  const resetAllAnalytics = () => {
    if (!confirm("¿Restablecer TODA la analítica de historias y tu historial de lectura?")) return;
    const next = stories.map(s => ({
      ...s,
      stats: { views: 0, shares: 0, downloads: { pdf: 0, doc: 0, json: 0 }, lastReadAt: null }
    }));
    writeJSON(STORIES_KEY, next);
    writeJSON(`${HISTORY_KEY}_${CURRENT_USER.handle}`, []);
    alert("Analítica restablecida.");
    window.location.reload();
  };

  const resetOne = (id) => {
    if (!confirm("¿Restablecer analítica de esta historia?")) return;
    const all = readJSON(STORIES_KEY, []);
    const ix = all.findIndex(x => x.id === id);
    if (ix >= 0) {
      all[ix] = {
        ...all[ix],
        stats: { views: 0, shares: 0, downloads: { pdf: 0, doc: 0, json: 0 }, lastReadAt: null }
      };
      writeJSON(STORIES_KEY, all);
      alert("Analítica de la historia restablecida.");
      window.location.reload();
    }
  };

  /* ======= métricas agregadas ======= */
  const totals = useMemo(() => {
    let views = 0, shares = 0, dPdf = 0, dDoc = 0, dJson = 0;
    stories.forEach(s => {
      views += s?.stats?.views || 0;
      shares += s?.stats?.shares || 0;
      dPdf   += s?.stats?.downloads?.pdf  || 0;
      dDoc   += s?.stats?.downloads?.doc  || 0;
      dJson  += s?.stats?.downloads?.json || 0;
    });
    const downloads = dPdf + dDoc + dJson;
    const ctr = views ? Math.round((shares / views) * 100) : 0;

    const words = stories.reduce((acc, s) => acc + wordsCount(s.contentHTML), 0);
    const avgMin = stories.length ? Math.round(minutesReadEstimate(words) / Math.max(1, stories.length)) : 0;

    const published = stories.filter(s => s.published).length;

    const byCat = {};
    stories.forEach(s => {
      const k = s.category || "Sin categoría";
      byCat[k] = (byCat[k] || 0) + (s?.stats?.views || 0);
    });
    const topCategory = Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—";

    return { views, shares, downloads, dPdf, dDoc, dJson, ctr, avgMin, totalStories: stories.length, published, topCategory };
  }, [stories]);

  /* ======= lecturas por día (últimos 30) ======= */
  const lastDays = 30;
  const byDay = useMemo(() => {
    const map = new Map(); // "YYYY-MM-DD" -> count
    const arr = [];
    const today = new Date();
    for (let i = lastDays - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      map.set(key, 0);
      arr.push(key);
    }
    history.forEach(h => {
      const key = new Date(h.ts).toISOString().slice(0,10);
      if (map.has(key)) map.set(key, map.get(key) + 1);
    });
    return arr.map(k => map.get(k));
  }, [history]);

  /* ======= heatmap día/hora (0-6 x 0-23) ======= */
  const heat = useMemo(() => {
    const m = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    history.forEach(h => {
      const d = new Date(h.ts);
      const day = d.getDay();     // 0=Dom ... 6=Sab
      const hr  = d.getHours();
      m[day][hr] += 1;
    });
    const max = m.reduce((mx, row) => Math.max(mx, ...row), 0);
    return { matrix: m, max };
  }, [history]);

  /* ======= logros ======= */
  const achievements = useMemo(() => {
    const out = [];
    const push = (name, cur, goal) => {
      const pct = Math.min(100, Math.round((cur/goal)*100));
      out.push({ name, cur, goal, pct, done: cur >= goal });
    };
    push("Primeras 50 vistas", totals.views, 50);
    push("100 vistas", totals.views, 100);
    push("500 vistas", totals.views, 500);
    push("Autor constante (5 publicadas)", totals.published, 5);
    push("Compartidor (20 shares)", totals.shares, 20);
    push("Muy descargadas (25 descargas)", totals.downloads, 25);
    return out;
  }, [totals]);

  /* ======= estadísticas por historia ======= */
  const perStory = useMemo(() => {
    return stories.map(s => {
      const words = wordsCount(s.contentHTML);
      const min = minutesReadEstimate(words);
      const views = s?.stats?.views || 0;
      const shares = s?.stats?.shares || 0;
      const dls = (s?.stats?.downloads?.pdf||0) + (s?.stats?.downloads?.doc||0) + (s?.stats?.downloads?.json||0);
      const ctr = views ? Math.round((shares / views) * 100) : 0;
      return {
        id: s.id, title: s.title || "Sin título", category: s.category || "—",
        views, shares, downloads: dls, ctr, min, updatedAt: s.updatedAt, published: !!s.published
      };
    }).sort((a,b)=>b.views-a.views);
  }, [stories]);

  const lastFeedItems = useMemo(() => (readJSON(FEED_KEY, []) || []).slice(0, 6), []);

  return (
    <section className="content-stack">
      <div className="card d-flex align-items-center justify-content-between" style={{ padding: 12 }}>
        <div className="d-flex align-items-center" style={{ gap: 10 }}>
          <BsGraphUp /> <strong>Analytics de Historias</strong>
        </div>
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          <button className="btn btn-outline-danger btn-sm" onClick={resetAllAnalytics}>
            <BsArrowCounterclockwise className="me-1" /> Restablecer
          </button>
          <Link className="btn btn-ghost btn-sm" to="/stories">← Volver a Historias</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="cards-grid">
        <div className="card kpi">
          <div className="kpi-top"><BsBook/> Total historias</div>
          <div className="kpi-num">{totals.totalStories}</div>
          <div className="text-secondary small">Publicadas: {totals.published}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><BsGraphUpArrow/> Vistas</div>
          <div className="kpi-num">{totals.views}</div>
          <div className="text-secondary small">Top categoría: {totals.topCategory}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><BsShare/> CTR compartir</div>
          <div className="kpi-num">{totals.ctr}%</div>
          <div className="text-secondary small">Shares: {totals.shares}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><BsDownload/> Descargas</div>
          <div className="kpi-num">{totals.downloads}</div>
          <div className="text-secondary small">PDF {totals.dPdf} · DOC {totals.dDoc} · JSON {totals.dJson}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><BsClockHistory/> Tiempo lectura</div>
          <div className="kpi-num">{totals.avgMin}m</div>
          <div className="text-secondary small">Promedio por historia</div>
        </div>
      </div>

      {/* Gráfica por fecha */}
      <div className="card">
        <div className="d-flex align-items-center justify-content-between">
          <h4 className="card-title m-0">Lecturas últimos 30 días</h4>
          <div className="text-secondary small">Total historial: {history.length}</div>
        </div>
        <div className="sparkline-wrap">
          <Sparkline data={byDay} />
        </div>
      </div>

      {/* Heatmap por día/hora */}
      <div className="card">
        <h4 className="card-title m-0">Mapa de calor (día x hora)</h4>
        <div className="text-secondary small mb-2">Dom..Sab (filas) vs 0–23h (columnas)</div>
        <Heatmap matrix={heat.matrix} max={heat.max} />
      </div>

      {/* Logros */}
      <div className="card">
        <h4 className="card-title m-0"><BsTrophy className="me-1" /> Logros</h4>
        <ul className="list-unstyled m-0">
          {achievements.map((a, i) => (
            <li key={i} className="ach-row">
              <div className="ach-name">{a.name} {a.done && <span className="badge text-bg-success ms-1">¡Listo!</span>}</div>
              <div className="progress progress-striped">
                <div className="progress-bar" style={{ width: `${a.pct}%` }} />
              </div>
              <div className="small text-secondary">{a.cur} / {a.goal}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Estadísticas por historia */}
      <div className="card">
        <h4 className="card-title m-0"><BsFire className="me-1"/> Historias (rendimiento)</h4>
        <div className="table-responsive">
          <table className="table table-dark table-sm align-middle">
            <thead>
              <tr>
                <th>Título</th>
                <th>Cat.</th>
                <th>Vistas</th>
                <th>Shares</th>
                <th>CTR</th>
                <th>Descargas</th>
                <th>Lectura</th>
                <th>Actualizado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {perStory.map(s => (
                <tr key={s.id}>
                  <td><Link className="fp-link" to={`/stories/view/${s.id}`}>{s.title}</Link></td>
                  <td className="text-secondary">{s.category}</td>
                  <td>{s.views}</td>
                  <td>{s.shares}</td>
                  <td>{s.ctr}%</td>
                  <td>{s.downloads}</td>
                  <td>{s.min}m</td>
                  <td className="text-secondary small">{new Date(s.updatedAt).toLocaleString()}</td>
                  <td>{s.published ? "Publicado" : "Borrador"}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm text-danger"
                      title="Restablecer analítica de esta historia"
                      onClick={() => resetOne(s.id)}
                    >
                      <BsArrowCounterclockwise />
                    </button>
                  </td>
                </tr>
              ))}
              {perStory.length === 0 && (
                <tr><td colSpan={10} className="text-secondary">Sin historias aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Últimos posts en feed (texto ya se auto-enlaza en el feed con tu linkify) */}
      <div className="card">
        <h4 className="card-title m-0">Últimos posts en inicio</h4>
        <ul className="list-unstyled m-0">
          {lastFeedItems.map(p => (
            <li key={p.id} className="small" style={{ marginBottom: 6 }}>
              <span className="text-secondary">{new Date(p.createdAt).toLocaleString()} — </span>
              {p.text}
            </li>
          ))}
          {lastFeedItems.length === 0 && <li className="text-secondary">No hay publicaciones.</li>}
        </ul>
      </div>
    </section>
  );
}
