import { useMemo, useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { BsShare, BsPersonPlus } from "react-icons/bs";
import PostBox from "../components/PostBox.jsx";
import FeedPost from "../components/FeedPost.jsx";

const GROUPS_KEY = "groups_v1";
const NOTIF_KEY = "notifications_v1";
const FEED_KEY = "feed_posts_v1";
const USERS_KEY = "profile_users_v1";

const CURRENT_USER = { id: "u1", name: "Justo", handle: "justo", avatarFallback: "🧑‍🚀" };

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function GroupDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // ===== grupos
  const [groups, setGroups] = useState(() => readJSON(GROUPS_KEY, []));
  const g = useMemo(() => groups.find((x) => x.slug === slug), [groups, slug]);
  const isMember = !!g?.members?.includes(CURRENT_USER.id);
  const membersCount = g?.members?.length || 1;

  // ===== feed (posts)
  const [feed, setFeed] = useState(() => readJSON(FEED_KEY, []));
  useEffect(() => writeJSON(FEED_KEY, feed), [feed]);

  const groupPosts = useMemo(
    () => feed.filter((p) => p.groupSlug === slug).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [feed, slug]
  );

  // ===== info de usuario (para avatar actual al crear post)
  const usersStore = useMemo(() => readJSON(USERS_KEY, {}), []);
  const me = usersStore[CURRENT_USER.handle] || {
    id: CURRENT_USER.id,
    name: CURRENT_USER.name,
    avatar: CURRENT_USER.avatarFallback,
    avatarImage: null,
  };

  // ===== acciones grupo
  const join = () => {
    if (!g) return;
    const updated = groups.map(x =>
      x.slug === g.slug
        ? { ...x, members: Array.from(new Set([...(x.members || []), CURRENT_USER.id])) }
        : x
    );
    setGroups(updated); writeJSON(GROUPS_KEY, updated);
  };
  const leave = () => {
    if (!g) return;
    const updated = groups.map(x =>
      x.slug === g.slug
        ? { ...x, members: (x.members || []).filter(id => id !== CURRENT_USER.id) }
        : x
    );
    setGroups(updated); writeJSON(GROUPS_KEY, updated);
  };

  // ===== invitaciones
  const [inviteText, setInviteText] = useState(""); // @maria, @juan
  const sendInvites = () => {
    const handles = inviteText
      .split(/[,\s]+/)
      .map(h => h.trim().replace(/^@/, ""))
      .filter(Boolean);
    if (!g || handles.length === 0) return;

    const existing = readJSON(NOTIF_KEY, []);
    const now = new Date().toISOString();
    const newItems = handles.map(h => ({
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      type: "invite",
      title: `Invitación a ${g.name}`,
      meta: "Ahora",
      unread: true,
      targetHandle: h.toLowerCase(),
      payload: { groupSlug: g.slug, groupName: g.name, inviter: CURRENT_USER.name },
      createdAt: now,
    }));
    writeJSON(NOTIF_KEY, [...newItems, ...existing]);
    setInviteText("");
    alert("Invitaciones enviadas ✅");
  };

  // ===== crear post en el grupo
  const handleCreateGroupPost = ({ text, images }) => {
    if (!g) return;
    const newPost = {
      id: `p${Date.now()}`,
      authorId: me.id || CURRENT_USER.id,
      authorName: me.name || CURRENT_USER.name,
      authorAvatar: me.avatar || CURRENT_USER.avatarFallback,       // fallback (emoji)
      authorAvatarImage: me.avatarImage || null,                    // si hay foto real
      text,
      images: images || [],
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      userReaction: null,
      comments: [],
      // contexto del grupo:
      groupSlug: g.slug,
      groupName: g.name,
    };
    setFeed((prev) => [newPost, ...prev]);
  };

  // ===== handlers FeedPost (igual que en Home/Profile)
  const handleToggleLike = (postId) => {
    setFeed((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        let { likes, dislikes, userReaction } = p;
        if (userReaction === "like") { likes -= 1; userReaction = null; }
        else if (userReaction === "dislike") { dislikes -= 1; likes += 1; userReaction = "like"; }
        else { likes += 1; userReaction = "like"; }
        return { ...p, likes, dislikes, userReaction };
      })
    );
  };
  const handleToggleDislike = (postId) => {
    setFeed((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        let { likes, dislikes, userReaction } = p;
        if (userReaction === "dislike") { dislikes -= 1; userReaction = null; }
        else if (userReaction === "like") { likes -= 1; dislikes += 1; userReaction = "dislike"; }
        else { dislikes += 1; userReaction = "dislike"; }
        return { ...p, likes, dislikes, userReaction };
      })
    );
  };
  const handleAddComment = (postId, text, parentId = null, replyingToName = null) => {
    const newC = {
      id: `c${Date.now()}`,
      authorId: me.id || CURRENT_USER.id,
      author: me.name || CURRENT_USER.name,
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      userReaction: null,
      parentId: parentId || null,
      replyingTo: replyingToName || null,
    };
    setFeed((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, newC] } : p
      )
    );
  };
  const handleCommentLike = (postId, commentId) => {
    setFeed((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const comments = p.comments.map((c) => {
          if (c.id !== commentId) return c;
          let { likes, dislikes, userReaction } = c;
          if (userReaction === "like") { likes -= 1; userReaction = null; }
          else if (userReaction === "dislike") { dislikes -= 1; likes += 1; userReaction = "like"; }
          else { likes += 1; userReaction = "like"; }
          return { ...c, likes, dislikes, userReaction };
        });
        return { ...p, comments };
      })
    );
  };
  const handleCommentDislike = (postId, commentId) => {
    setFeed((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const comments = p.comments.map((c) => {
          if (c.id !== commentId) return c;
          let { likes, dislikes, userReaction } = c;
          if (userReaction === "dislike") { dislikes -= 1; userReaction = null; }
          else if (userReaction === "like") { likes -= 1; dislikes += 1; userReaction = "dislike"; }
          else { dislikes += 1; userReaction = "dislike"; }
          return { ...c, likes, dislikes, userReaction };
        });
        return { ...p, comments };
      })
    );
  };
  const handleShare = async (postId) => {
    const url = `${window.location.origin}/groups/${slug}?post=${postId}`;
    try { await navigator.clipboard.writeText(url); alert("Enlace copiado:\n" + url); }
    catch { alert("No se pudo copiar. Enlace:\n" + url); }
  };

  if (!g) {
    return (
      <section className="content-stack">
        <div className="card">
          <h4 className="card-title">Grupo no encontrado</h4>
          <button className="btn btn-primary" onClick={() => navigate("/groups/new")}>Crear grupo</button>
        </div>
      </section>
    );
  }

  return (
    <section className="content-stack">
      {/* Cabecera del grupo */}
      <div className="card p-0">
        <div className="group-cover">
          {g.cover ? <img src={g.cover} alt="cover" /> : <div className="cover-fallback" />}
        </div>
        <div className="group-head">
          <div className="group-avatar">
            {g.avatar ? <img src={g.avatar} alt={g.name} /> : <div className="avatar-fallback">👥</div>}
          </div>
          <div>
            <h2 className="m-0">{g.name}</h2>
            <div className="muted small">
              {g.privacy === "private" ? "Privado" : "Público"} · {new Date(g.createdAt).toLocaleDateString()} · {membersCount} miembros
            </div>
          </div>
        </div>

        {/* Acciones del grupo */}
        <div className="p-3 d-flex gap-2 flex-wrap">
          {!isMember ? (
            <button className="btn btn-primary" onClick={join}>Unirse</button>
          ) : (
            <button className="btn btn-outline-secondary" onClick={leave}>Salir</button>
          )}

          <button
            className="btn btn-ghost"
            onClick={async () => {
              const url = `${window.location.origin}/groups/${g.slug}`;
              try { await navigator.clipboard.writeText(url); alert("Enlace copiado:\n" + url); }
              catch { alert("No se pudo copiar. Enlace:\n" + url); }
            }}
          >
            <BsShare className="me-1" /> Compartir
          </button>

          <button className="btn btn-ghost" data-bs-toggle="modal" data-bs-target="#inviteModal">
            <BsPersonPlus className="me-1" /> Invitar
          </button>

          <Link to="/groups" className="btn btn-ghost">Volver a grupos</Link>
        </div>

        <div className="p-3">
          {g.description ? <p>{g.description}</p> : <p className="muted">Sin descripción.</p>}
        </div>
      </div>

      {/* ===== NUEVO: Publicar en el grupo ===== */}
      <div className="card">
        <h4 className="card-title">Publicar en {g.name}</h4>
        {isMember ? (
          <PostBox onPost={handleCreateGroupPost} />
        ) : (
          <div className="muted">Únete al grupo para publicar.</div>
        )}
      </div>

      {/* Feed del grupo */}
      <div className="feed-stack">
        {groupPosts.length === 0 ? (
          <div className="card"><div className="muted">Aún no hay publicaciones en este grupo.</div></div>
        ) : (
          groupPosts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              onToggleLike={handleToggleLike}
              onToggleDislike={handleToggleDislike}
              onAddComment={handleAddComment}
              onCommentLike={handleCommentLike}
              onCommentDislike={handleCommentDislike}
              onShare={handleShare}
            />
          ))
        )}
      </div>

      {/* Modal Invitaciones */}
      <div className="modal fade" id="inviteModal" tabIndex="-1" aria-labelledby="inviteLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content" style={{ background: "#0f141b", color: "var(--text)" }}>
            <div className="modal-header">
              <h5 className="modal-title" id="inviteLabel">Invitar a {g.name}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div className="modal-body">
              <label className="form-label">Usuarios a invitar (separados por coma o espacios)</label>
              <input
                className="form-control bg-transparent text-light border-secondary-subtle"
                placeholder="@maria, @juan, pedro"
                value={inviteText}
                onChange={(e) => setInviteText(e.target.value)}
              />
              <div className="text-secondary small mt-2">
                * Las invitaciones aparecen como notificaciones para los usuarios objetivo.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-primary" data-bs-dismiss="modal" onClick={sendInvites}>
                Enviar invitaciones
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
