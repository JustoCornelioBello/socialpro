
// src/components/RightPanel.jsx (o donde lo ubiques)
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BsPersonPlus, BsPersonCheck, BsThreeDots, BsX, BsArrowClockwise,
  BsHash, BsFire, BsPeople, BsPlusCircle, BsBell, BsCheckCircle,
  BsClockHistory, BsChevronDown, BsChevronUp
} from "react-icons/bs";
import PostBox from "../components/PostBox.jsx"; // ← ajusta si es necesario
import { getGamesState } from "../pages/games/store.js"; // usa tu store compartido

/* ========================= Claves y helpers ========================= */
const CURRENT_USER = { id: "u1", name: "Justo", handle: "justo" };

const SUG_KEY = "rightpanel_suggestions_v1";
const FOL_KEY = "rightpanel_following_v1";
const DISMISS_KEY = "rightpanel_dismissed_v1";
const REQ_KEY = "rightpanel_requests_v1";
const TRENDS_KEY = "rightpanel_trends_v1";
const GROUPS_KEY = "groups_v1";
const FOLLOWERS_KEY = "followers_v1";
const FOLLOWING_KEY = FOL_KEY; // alias
const PRESENCE_KEY = "presence_v1";
const FEED_KEY = "feed_posts_v1";

const PROFILE_KEYS = ["user_profile_v1", "profile_v1", "PROFILE_V1", "app_profile_v1"];

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };

function readProfileFromStorage(handle) {
  for (const k of PROFILE_KEYS) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const p = JSON.parse(raw);
      if (p?.handle === handle || p?.username === handle) return p;
      if (p && typeof p === "object" && !Array.isArray(p) && p[handle]) return p[handle];
    } catch { }
  }
  return null;
}

function useLiveStorage(keys = []) {
  const [, force] = useState(0);
  useEffect(() => {
    const onStorage = (e) => {
      if (!e || !e.key || (keys.length && !keys.includes(e.key))) return;
      force(x => x + 1);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("games:updated", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("games:updated", onStorage);
    };
  }, [keys]);
}

/* ========================= Mini perfil dinámico ========================= */
function useCurrentUserMini(user) {
  useLiveStorage([FOLLOWERS_KEY, FOLLOWING_KEY, GROUPS_KEY]);

  const prof = readProfileFromStorage(user.handle) || {};
  const displayName = prof.name || user.name;
  const handle = prof.handle || user.handle;
  const avatarUrl = prof.photoUrl || prof.avatar || null;
  const avatarEmoji = prof.emoji || "🧑‍🚀";
  const frame = prof.frame || prof.marco || null;
  const location = prof.location || prof.city || "Santo Domingo, DO";

  const gs = getGamesState?.() || { coins: 0, totalScore: 0 };
  const coins = gs.coins ?? 0;
  const score = gs.totalScore ?? 0;

  let followingCount = 0;
  try { followingCount = new Set(readJSON(FOLLOWING_KEY, [])).size; } catch { }
  let followersCount = 0;
  try { followersCount = (readJSON(FOLLOWERS_KEY, []) || []).length; } catch { }

  let groupsCount = 0;
  try {
    const all = readJSON(GROUPS_KEY, []);
    groupsCount = (all || []).filter(g => (g.members || []).includes(user.id)).length;
  } catch { }

  const tiers = [
    { name: "Bronce", need: 100, color: "#cd7f32" },
    { name: "Plata", need: 250, color: "#c0c0c0" },
    { name: "Oro", need: 500, color: "#ffd700" },
    { name: "Platino", need: 1000, color: "#9fe4ff" },
  ];
  const next = tiers.find(t => score < t.need) || tiers[tiers.length - 1];
  const current = [...tiers].reverse().find(t => score >= t.need) || tiers[0];
  const pctToNext = Math.min(100, Math.round((score / next.need) * 100));

  return {
    displayName, handle, avatarUrl, avatarEmoji, frame, location,
    coins, score, followingCount, followersCount, groupsCount,
    tierName: current.name, tierColor: current.color, nextNeed: next.need, pctToNext
  };
}

/* ========================= Mock data ========================= */
const MOCK_SUGGESTIONS = [
  { id: "u101", name: "María López", handle: "maria", avatar: "🦊", bio: "Frontend | UI/UX", mutuals: 3 },
  { id: "u102", name: "Carlos Pérez", handle: "carlitox", avatar: "🧑‍💻", bio: "Backend • Node • DB", mutuals: 1 },
  { id: "u103", name: "Ana García", handle: "anag", avatar: "🎨", bio: "Product Design", mutuals: 5 },
  { id: "u104", name: "Diego Ruiz", handle: "diegor", avatar: "🤖", bio: "AI • ML • LLMs", mutuals: 2 },
  { id: "u105", name: "Lucía Fernández", handle: "lu", avatar: "🦄", bio: "Mobile Dev", mutuals: 0 },
  { id: "u106", name: "Pedro Peña", handle: "pedrop", avatar: "🎮", bio: "Game Dev", mutuals: 4 },
];

const MOCK_REQUESTS = [
  { id: "r1", userId: "u201", name: "Sofía Ramírez", handle: "sofi", avatar: "🐼", note: "Te conoce por React RD" },
  { id: "r2", userId: "u202", name: "Tomás Núñez", handle: "tom", avatar: "🦁", note: "Amigo de María" },
];

const MOCK_TRENDS = [
  { tag: "react", count: 1200 },
  { tag: "javascript", count: 980 },
  { tag: "frontend", count: 640 },
  { tag: "webdev", count: 590 },
  { tag: "ai", count: 540 },
];

const MOCK_ONLINE = [
  { id: "on1", name: "Paola", avatar: "🐨" },
  { id: "on2", name: "Raúl", avatar: "🐯" },
  { id: "on3", name: "Nina", avatar: "🐰" },
  { id: "on4", name: "Luis", avatar: "🦊" },
];

function Shimmer({ lines = 2 }) {
  return (
    <div className="shimmer-wrap">
      {Array.from({ length: lines }).map((_, i) => <div key={i} className="shimmer-line" />)}
    </div>
  );
}

/* ========================= RightPanel ========================= */
export default function RightPanel() {
  const navigate = useNavigate();

  // Loading simulado
  const [loading, setLoading] = useState(true);

  // Secciones
  const [suggestions, setSuggestions] = useState(() => readJSON(SUG_KEY, MOCK_SUGGESTIONS));
  const [following, setFollowing] = useState(() => new Set(readJSON(FOL_KEY, [])));
  const [dismissed, setDismissed] = useState(() => new Set(readJSON(DISMISS_KEY, [])));
  const [lastDismissed, setLastDismissed] = useState(null);

  const [requests, setRequests] = useState(() => readJSON(REQ_KEY, MOCK_REQUESTS));

  const [trends, setTrends] = useState(() => readJSON(TRENDS_KEY, MOCK_TRENDS));
  const [hiddenTrends, setHiddenTrends] = useState(new Set());

  const [openSug, setOpenSug] = useState(true);
  const [openReq, setOpenReq] = useState(true);
  const [openTr, setOpenTr] = useState(true);
  const [openGrp, setOpenGrp] = useState(true);
  const [openOn, setOpenOn] = useState(true);

  const [joining, setJoining] = useState(null); // unirse a grupo

  // Presencia y composer
  const [presence, setPresence] = useState(() => localStorage.getItem(PRESENCE_KEY) || "online");
  useEffect(() => { localStorage.setItem(PRESENCE_KEY, presence); }, [presence]);

  const [composeOpen, setComposeOpen] = useState(false);

  // Mini perfil dinámico (datos en vivo)
  const info = useCurrentUserMini(CURRENT_USER);

  // Simula carga
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // Persistencia básica
  useEffect(() => writeJSON(SUG_KEY, suggestions), [suggestions]);
  useEffect(() => writeJSON(FOL_KEY, [...following]), [following]);
  useEffect(() => writeJSON(DISMISS_KEY, [...dismissed]), [dismissed]);
  useEffect(() => writeJSON(REQ_KEY, requests), [requests]);
  useEffect(() => writeJSON(TRENDS_KEY, trends), [trends]);

  // Derivados
  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id)).slice(0, 5);
  const visibleTrends = trends.filter(t => !hiddenTrends.has(t.tag)).slice(0, 6);

  // Handlers Sugerencias
  const followToggle = (userId) => {
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      window.dispatchEvent(new CustomEvent("follow:changed", { detail: { userId, following: next.has(userId) } }));
      return next;
    });
  };
  const dismissUser = (userId) => {
    setDismissed(prev => { const next = new Set(prev); next.add(userId); return next; });
    setLastDismissed(userId);
  };
  const undoDismiss = () => {
    if (!lastDismissed) return;
    setDismissed(prev => { const n = new Set(prev); n.delete(lastDismissed); return n; });
    setLastDismissed(null);
  };
  const refreshSug = () => {
    setLoading(true);
    setTimeout(() => {
      const shuffled = [...MOCK_SUGGESTIONS].sort(() => Math.random() - 0.5);
      setSuggestions(shuffled);
      setLoading(false);
    }, 650);
  };

  // Handlers Requests
  const acceptReq = (reqId) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    setRequests(prev => prev.filter(r => r.id !== reqId));
    setFollowing(prev => new Set(prev).add(req.userId));
  };
  const ignoreReq = (reqId) => setRequests(prev => prev.filter(r => r.id !== reqId));

  // Handlers Trends
  const goToTrend = (tag) => navigate(`/search?q=%23${encodeURIComponent(tag)}`);
  const hideTrend = (tag) => setHiddenTrends(prev => new Set(prev).add(tag));

  // Recomendaciones de grupos
  const groups = readJSON(GROUPS_KEY, []);
  const myGroups = groups.filter(g => g.members?.includes(CURRENT_USER.id));
  const recommendedGroups = groups.filter(g => !g.members?.includes(CURRENT_USER.id)).slice(0, 4);

  const joinGroup = async (groupId) => {
    setJoining(groupId);
    setTimeout(() => {
      const all = readJSON(GROUPS_KEY, []);
      const idx = all.findIndex(g => g.id === groupId);
      if (idx >= 0) {
        const g = all[idx];
        const members = Array.from(new Set([...(g.members || []), CURRENT_USER.id]));
        const updated = { ...g, members };
        const next = [...all]; next[idx] = updated;
        writeJSON(GROUPS_KEY, next);
      }
      setJoining(null);
      window.location.reload();
    }, 700);
  };

  // Crear post rápido
  const handleQuickPost = (payload) => {
    const posts = readJSON(FEED_KEY, []);
    const newPost = {
      id: `p_${Date.now()}`,
      authorId: CURRENT_USER.id,
      authorName: info.displayName,
      authorAvatar: info.avatarEmoji,
      authorAvatarImage: info.avatarUrl || null,
      createdAt: new Date().toISOString(),
      text: (payload.text || "").trim(),
      images: payload.images || [],
      likes: 0, dislikes: 0, userReaction: null,
      comments: [],
    };
    writeJSON(FEED_KEY, [newPost, ...posts]);
    window.dispatchEvent(new CustomEvent("feed:updated", { detail: { postId: newPost.id } }));
    setComposeOpen(false);
  };

  return (
    <div className="rightpanel-stack">
      {/* Mini perfil dinámico */}
      <div className="card">
        <div className="d-flex align-items-center justify-content-between" style={{ color: "white" }}>
          <div className="d-flex align-items-center" style={{ gap: 10 }}>
            <div className={`rp-avatar ${info.frame ? `rp-frame-${info.frame}` : ""}`} aria-hidden>
              {info.avatarUrl
                ? <img src={info.avatarUrl} alt={info.displayName} />
                : <span style={{ fontSize: 18 }}>{info.avatarEmoji}</span>}
            </div>
            <div>
              <div className="fw-bold d-flex align-items-center" style={{ gap: 8 }}>
                {info.displayName}
                <span className={`presence-dot ${presence}`} title={presence}></span>
              </div>
              <div className="text-secondary small">@{info.handle} · {info.location}</div>
            </div>
          </div>
          <div className="d-flex" style={{ gap: 6 }}>
            <Link className="btn btn-ghost btn-sm" to="/settings/profile">Editar</Link>
            <Link className="btn btn-ghost btn-sm" to={`/profile/${info.handle}`}>Ver perfil</Link>
          </div>
        </div>

        <div className="rp-stats m-2">
          <div className="badge text-bg-dark">🪙 {info.coins} coins</div>
          <div className="badge text-bg-dark">⭐ {info.score} pts</div>
          <div className="badge text-bg-dark">👥 {info.followersCount} seg.</div>
          <div className="badge text-bg-dark">↗️ {info.followingCount} sig.</div>
          <div className="badge text-bg-dark">🧩 {info.groupsCount} grupos</div>
        </div>

        <div className="mt-2">
          <div className="d-flex justify-content-between align-items-center">
            <div className="small">Trofeo: <b style={{ color: info.tierColor }}>{info.tierName}</b></div>
            <div className="text-secondary small">{info.pctToNext}%</div>
          </div>
          <div className="progress progress-striped mt-1">
            <div className="progress-bar" style={{ width: `${info.pctToNext}%` }} />
          </div>
          <div className="text-secondary small mt-1">Próximo a {info.nextNeed} pts</div>
        </div>

        {/* Controles rápidos */}
        <div className="d-flex mt-2" style={{ gap: 8 }}>
          <select
            className="form-select form-select-sm bg-transparent text-light border-secondary-subtle"
            style={{ maxWidth: 160 }}
            value={presence}
            onChange={(e) => setPresence(e.target.value)}
            title="Estado"
          >
            <option value="online">En línea</option>
            <option value="busy">Ocupado</option>
            <option value="away">Ausente</option>
            <option value="offline">Invisible</option>
          </select>

          <button className="btn btn-primary btn-sm" type="button" onClick={() => setComposeOpen(true)}>
            Crear post
          </button>
        </div>
      </div>

      {/* Sugerencias para seguir */}
      <div className="card">
        <div className="d-flex align-items-center justify-content-between">
          <h4 className="card-title m-0 d-flex align-items-center" style={{ gap: 8 }}>
            <BsPeople /> Sugerencias para seguir
          </h4>
          <div className="d-flex align-items-center" style={{ gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpenSug(v => !v)}>
              {openSug ? <BsChevronUp /> : <BsChevronDown />}
            </button>
            <button className="btn btn-ghost btn-sm" title="Refrescar" onClick={refreshSug}>
              <BsArrowClockwise />
            </button>
          </div>
        </div>

        {!openSug ? null : loading ? (
          <Shimmer lines={4} />
        ) : (
          <>
            {visibleSuggestions.length === 0 && <div className="text-secondary small">Sin sugerencias por ahora.</div>}

            <ul className="list-unstyled m-0 rp-list">
              {visibleSuggestions.map(u => (
                <li key={u.id} className="rp-row">
                  <div className="rp-avatar" aria-hidden>{u.avatar}</div>
                  <div className="rp-main">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <Link to={`/profile/${u.handle}`} className="fp-link fw-bold">{u.name}</Link>
                        <div className="text-secondary small">@{u.handle} · {u.mutuals} amigos en común</div>
                      </div>
                      <div className="dropdown">
                        <button className="btn btn-ghost btn-sm" data-bs-toggle="dropdown"><BsThreeDots /></button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><button className="dropdown-item" onClick={() => dismissUser(u.id)}><BsX className="me-2" /> No me interesa</button></li>
                          <li>
                            <Link className="dropdown-item" to={`/profile/${u.handle}`}>
                              Ver perfil
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="text-secondary small mt-1">{u.bio}</div>

                    <div className="d-flex align-items-center mt-2" style={{ gap: 8 }}>
                      {following.has(u.id) ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => followToggle(u.id)}>
                          <BsPersonCheck className="me-1" /> Siguiendo
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => followToggle(u.id)}>
                          <BsPersonPlus className="me-1" /> Seguir
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => dismissUser(u.id)}><BsX /> Ocultar</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {lastDismissed && (
              <div className="rp-undo">
                <button className="btn btn-ghost btn-sm" onClick={undoDismiss}>Deshacer ocultar</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Solicitudes de amistad */}
      <div className="card">
        <div className="d-flex align-items-center justify-content-between">
          <h4 className="card-title m-0 d-flex align-items-center" style={{ gap: 8 }}>
            <BsBell /> Solicitudes
          </h4>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpenReq(v => !v)}>
            {openReq ? <BsChevronUp /> : <BsChevronDown />}
          </button>
        </div>

        {!openReq ? null : loading ? (
          <Shimmer lines={2} />
        ) : (
          <ul className="list-unstyled m-0 rp-list">
            {requests.length === 0 && <div className="text-secondary small">No tienes solicitudes.</div>}
            {requests.map(r => (
              <li key={r.id} className="rp-row">
                <div className="rp-avatar">{r.avatar}</div>
                <div className="rp-main">
                  <div className="fw-bold">{r.name} <span className="text-secondary">@{r.handle}</span></div>
                  <div className="small text-secondary">{r.note}</div>
                  <div className="d-flex mt-2" style={{ gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => acceptReq(r.id)}><BsCheckCircle className="me-1" /> Aceptar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => ignoreReq(r.id)}><BsX className="me-1" /> Ignorar</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tendencias */}
      <div className="card">
        <div className="d-flex align-items-center justify-content-between">
          <h4 className="card-title m-0 d-flex align-items-center" style={{ gap: 8 }}>
            <BsFire /> Tendencias
          </h4>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpenTr(v => !v)}>
            {openTr ? <BsChevronUp /> : <BsChevronDown />}
          </button>
        </div>

        {!openTr ? null : loading ? (
          <Shimmer lines={3} />
        ) : (
          <ul className="list-unstyled m-0 rp-list">
            {visibleTrends.map(t => (
              <li key={t.tag} className="rp-row trend">
                <div className="rp-hash"><BsHash /></div>
                <div className="rp-main">
                  <div className="d-flex align-items-center justify-content-between">
                    <button className="btn-as-link fp-link" onClick={() => goToTrend(t.tag)}>#{t.tag}</button>
                    <button className="btn btn-ghost btn-sm" title="No me interesa" onClick={() => hideTrend(t.tag)}><BsX /></button>
                  </div>
                  <div className="text-secondary small">{t.count.toLocaleString()} publicaciones</div>
                </div>
              </li>
            ))}
            {visibleTrends.length === 0 && <div className="text-secondary small">Sin tendencias por ahora.</div>}
          </ul>
        )}
      </div>

      {/* Grupos recomendados */}
      <div className="card">
        <div className="d-flex align-items-center justify-content-between">
          <h4 className="card-title m-0 d-flex align-items-center" style={{ gap: 8 }}>
            <BsPeople /> Grupos recomendados
          </h4>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpenGrp(v => !v)}>
            {openGrp ? <BsChevronUp /> : <BsChevronDown />}
          </button>
        </div>

        {!openGrp ? null : (
          <>
            {recommendedGroups.length === 0 && (
              <div className="text-secondary small">Ya perteneces a todos los grupos recomendados.</div>
            )}
            <ul className="list-unstyled m-0 rp-list">
              {recommendedGroups.map(g => (
                <li key={g.id} className="rp-row">
                  <div className="rp-avatar">
                    {g.avatar ? <img src={g.avatar} alt={g.name} /> : "👥"}
                  </div>
                  <div className="rp-main">
                    <Link to={`/groups/${g.slug}`} className="fp-link fw-bold">{g.name}</Link>
                    <div className="text-secondary small">{g.description || "Grupo"}</div>
                    <div className="d-flex mt-2" style={{ gap: 8 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={joining === g.id}
                        onClick={() => joinGroup(g.id)}
                        title="Unirme al grupo"
                      >
                        <BsPlusCircle className="me-1" /> {joining === g.id ? "Uniendo…" : "Unirme"}
                      </button>
                      <Link className="btn btn-ghost btn-sm" to={`/groups/${g.slug}`}>Ver</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {myGroups.length > 0 && (
              <div className="small text-secondary mt-2">
                Ya eres miembro de {myGroups.length} grupo{myGroups.length > 1 ? "s" : ""}.
              </div>
            )}
          </>
        )}
      </div>

      {/* Amigos conectados (mock) */}
      <div className="card">
        <div className="d-flex align-items-center justify-content-between">
          <h4 className="card-title m-0">Conectados</h4>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpenOn(v => !v)}>
            {openOn ? <BsChevronUp /> : <BsChevronDown />}
          </button>
        </div>

        {!openOn ? null : (
          <div className="rp-online-grid">
            {MOCK_ONLINE.map(o => (
              <button key={o.id} className="rp-online">
                <span className="dot" /> <span className="avatar">{o.avatar}</span> {o.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Consejos */}
      <div className="card">
        <h4 className="card-title m-0">Consejos</h4>
        <ul className="list-unstyled small m-0 rp-tips">
          <li><BsClockHistory className="me-1" /> Programa tus publicaciones para mejores horarios.</li>
          <li><BsPeople className="me-1" /> Únete a grupos para aumentar tu alcance.</li>
        </ul>
      </div>

      {/* Modal Crear post (usa tu PostBox) */}
      {composeOpen && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content" style={{ background: "#0f141b", color: "var(--text)" }}>
                <div className="modal-header">
                  <h5 className="modal-title">Crear publicación</h5>
                  <button type="button" className="btn-close" onClick={() => setComposeOpen(false)} aria-label="Cerrar" />
                </div>
                <div className="modal-body">
                  <PostBox onPost={handleQuickPost} />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setComposeOpen(false)} />
        </>
      )}


    </div>
  );
}
