import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FeedPost from "../components/FeedPost.jsx";
import {
  BsGeoAlt, BsLink45Deg, BsCalendar3, BsPencilSquare,
  BsPersonPlus, BsChatDots, BsCamera, BsCheck, BsImage
} from "react-icons/bs";

const FEED_KEY = "feed_posts_v1";
const USERS_KEY = "profile_users_v1";

const CURRENT_USER = { id: "u1", name: "Justo", avatar: "🧑‍🚀" };

const slug = (name) =>
  name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

const readJSON = (k, fallback) => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
};
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Helpers de imagen
const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

async function downscaleDataURL(dataUrl, maxSize = 512) {
  // Reduce la imagen para no llenar localStorage (simple, mantiene proporción)
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}

export default function Profile() {
  const params = useParams();
  const navigate = useNavigate();

  const defaultHandle = slug(CURRENT_USER.name);
  const handle = params.handle || defaultHandle;
  const isOwn = handle === defaultHandle;

  const [feed, setFeed] = useState(() => readJSON(FEED_KEY, []));
  useEffect(() => writeJSON(FEED_KEY, feed), [feed]);

  const [users, setUsers] = useState(() =>
    readJSON(USERS_KEY, {
      [defaultHandle]: {
        id: CURRENT_USER.id,
        name: CURRENT_USER.name,
        avatar: CURRENT_USER.avatar,   // emoji de fallback
        avatarImage: null,             // dataURL si sube imagen
        avatarFrame: "none",           // marco seleccionado
        bio: "Construyendo apps con IA y educación.",
        location: "Santo Domingo",
        website: "https://ejemplo.dev",
        joinedAt: "2024-01-15",
        followers: 128,
        following: 87,
        cover: null,
      },
    })
  );
  useEffect(() => writeJSON(USERS_KEY, users), [users]);

  // Crear placeholder de perfiles inexistentes
  useEffect(() => {
    if (!users[handle]) {
      setUsers((prev) => ({
        ...prev,
        [handle]: {
          id: `u_${handle}`,
          name: handle.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
          avatar: "👤",
          avatarImage: null,
          avatarFrame: "none",
          bio: "Sin bio aún.",
          location: "—",
          website: "",
          joinedAt: "2025-01-01",
          followers: 0,
          following: 0,
          cover: null,
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  const profile = users[handle] || {};
  const posts = useMemo(
    () => feed.filter((p) => slug(p.authorName) === handle),
    [feed, handle]
  );

  const photos = useMemo(() => {
    const imgs = [];
    posts.forEach((p) => Array.isArray(p.images) && imgs.push(...p.images));
    return imgs;
  }, [posts]);

  const [following, setFollowing] = useState(false);
  const toggleFollow = () => {
    setFollowing((f) => !f);
    setUsers((prev) => ({
      ...prev,
      [handle]: {
        ...prev[handle],
        followers: (prev[handle]?.followers || 0) + (following ? -1 : 1),
      },
    }));
  };
  const openMessage = () => navigate("/messages");

  // Editar info básica (ya lo teníamos)
  const [draft, setDraft] = useState({
    name: profile.name,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
  });
  useEffect(() => {
    setDraft({
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
    });
  }, [profile.name, profile.bio, profile.location, profile.website]);

  const saveProfileInfo = () => {
    setUsers((prev) => ({
      ...prev,
      [handle]: { ...prev[handle], ...draft },
    }));
  };

  // ===== NUEVO: cambiar foto y marco =====
  const FRAME_OPTIONS = [
    { key: "none", label: "Sin marco" },
    { key: "blue", label: "Azul" },
    { key: "gold", label: "Dorado" },
    { key: "rainbow", label: "Arcoíris" },
    { key: "neon", label: "Neón" },
    { key: "flag", label: "Bandera" },
  ];

  const [avatarDraft, setAvatarDraft] = useState({
    image: profile.avatarImage,  // dataURL
    frame: profile.avatarFrame || "none",
  });
  useEffect(() => {
    setAvatarDraft({ image: profile.avatarImage, frame: profile.avatarFrame || "none" });
  }, [profile.avatarImage, profile.avatarFrame]);

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await fileToDataURL(file);
    const resized = await downscaleDataURL(raw, 512);
    setAvatarDraft((d) => ({ ...d, image: resized }));
    e.target.value = "";
  };

  const clearAvatar = () => setAvatarDraft((d) => ({ ...d, image: null }));
  const saveAvatarAndFrame = () => {
    // Guarda en usuarios
    setUsers((prev) => ({
      ...prev,
      [handle]: {
        ...prev[handle],
        avatarImage: avatarDraft.image,
        avatarFrame: avatarDraft.frame,
      },
    }));
    // Actualiza avatar en posts del mismo autor (para que FeedPost lo muestre)
    setFeed((prev) =>
      prev.map((p) =>
        slug(p.authorName) === handle
          ? { ...p, authorAvatarImage: avatarDraft.image }
          : p
      )
    );
  };

  const [tab, setTab] = useState("posts"); // posts | about | photos

  // Handlers del feed (igual que antes)
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
      authorId: CURRENT_USER.id,
      author: CURRENT_USER.name,
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
    const url = `${window.location.origin}/post/${postId}`;
    try { await navigator.clipboard.writeText(url); alert("Enlace copiado:\n" + url); }
    catch { alert("No se pudo copiar. Enlace:\n" + url); }
  };

  return (
    <section className="content-stack">
      {/* COVER */}
      <div className="card p-0 profile-cover">
        <div className="cover-bg">
          {!profile.cover && <div className="cover-gradient" />}
        </div>

        {/* Header */}
        <div className="profile-header">
          <div className={`profile-avatar frame-${profile.avatarFrame || "none"}`}>
            {profile.avatarImage ? (
              <img src={profile.avatarImage} alt={profile.name} />
            ) : (
              <span aria-hidden>{profile.avatar || "👤"}</span>
            )}
          </div>

          <div className="profile-id">
            <h2 className="m-0" style={{color: 'white'}}>{profile.name || "(Sin nombre)"}</h2>
            <div className="muted">@{handle}</div>
            <div className="muted small">
              {posts.length} publicaciones · {profile.followers ?? 0} seguidores · {profile.following ?? 0} siguiendo
            </div>
          </div>

          <div className="profile-actions">
            {isOwn ? (
              <>
                <button
                  className="btn btn-ghost"
                  data-bs-toggle="modal"
                  data-bs-target="#editProfileModal"
                  title="Editar perfil"
                >
                  <BsPencilSquare className="me-1" /> Editar perfil
                </button>
                <button
                  className="btn btn-ghost"
                  data-bs-toggle="modal"
                  data-bs-target="#avatarModal"
                  title="Cambiar foto y marco"
                >
                  <BsCamera className="me-1" /> Foto y marco
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={toggleFollow}>
                  {following ? <><BsCheck className="me-1" /> Siguiendo</> : <><BsPersonPlus className="me-1" /> Seguir</>}
                </button>
                <button className="btn btn-ghost" onClick={openMessage}>
                  <BsChatDots className="me-1" /> Mensaje
                </button>
              </>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="profile-meta">
          {profile.bio && <p className="mb-2">{profile.bio}</p>}
          <div className="d-flex flex-wrap gap-3 muted">
            {profile.location && (<span><BsGeoAlt className="me-1" /> {profile.location}</span>)}
            {profile.website && (
              <span>
                <BsLink45Deg className="me-1" />
                <a href={profile.website} target="_blank" rel="noreferrer" className="fp-link">
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              </span>
            )}
            {profile.joinedAt && (<span><BsCalendar3 className="me-1" /> Se unió: {profile.joinedAt}</span>)}
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button className={`tab-btn ${tab === "posts" ? "active" : ""}`} onClick={() => setTab("posts")}>Publicaciones</button>
          <button className={`tab-btn ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>Acerca de</button>
          <button className={`tab-btn ${tab === "photos" ? "active" : ""}`} onClick={() => setTab("photos")}>Fotos</button>
        </div>
      </div>

      {/* Contenido tabs */}
      {tab === "posts" && (
        <div className="feed-stack">
          {posts.length === 0 && <div className="card"><div className="muted">Este usuario aún no tiene publicaciones.</div></div>}
          {posts.map((post) => (
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
          ))}
        </div>
      )}

      {tab === "about" && (
        <div className="card" style={{color:'white'}}>
          <h4 className="card-title">Información</h4>
          <ul className="list">
            <li><strong>Nombre:</strong> {profile.name}</li>
            <li><strong>Usuario:</strong> @{handle}</li>
            <li><strong>Ubicación:</strong> {profile.location || "—"}</li>
            <li><strong>Sitio web:</strong> {profile.website
              ? <a className="fp-link" href={profile.website} target="_blank" rel="noreferrer">{profile.website}</a>
              : "—"}</li>
            <li><strong>Se unió:</strong> {profile.joinedAt || "—"}</li>
          </ul>
          {isOwn && (
            <div className="mt-3">
              <button className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#editProfileModal">
                <BsPencilSquare className="me-1" /> Editar información
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "photos" && (
        <div className="card">
          <h4 className="card-title">Fotos</h4>
          {photos.length === 0 ? (
            <div className="muted">No hay fotos aún.</div>
          ) : (
            <div className="profile-photos-grid">
              {photos.map((src, i) => (
                <div key={i} className="photo-cell">
                  <img src={src} alt={`photo-${i}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Editar perfil (info básica) */}
      <div className="modal fade" id="editProfileModal" tabIndex="-1" aria-labelledby="editProfileLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content" style={{ background: "#0f141b", color: "var(--text)" }}>
            <div className="modal-header">
              <h5 className="modal-title" id="editProfileLabel">Editar perfil</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div className="modal-body">
              <div className="mb-2">
                <label className="form-label">Nombre</label>
                <input
                  className="form-control bg-transparent text-light border-secondary-subtle"
                  value={draft.name || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Bio</label>
                <textarea
                  rows={3}
                  className="form-control bg-transparent text-light border-secondary-subtle"
                  value={draft.bio || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Ubicación</label>
                <input
                  className="form-control bg-transparent text-light border-secondary-subtle"
                  value={draft.location || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Website</label>
                <input
                  className="form-control bg-transparent text-light border-secondary-subtle"
                  placeholder="https://..."
                  value={draft.website || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={saveProfileInfo}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== NUEVO: Modal Foto y Marco ===== */}
      <div className="modal fade" id="avatarModal" tabIndex="-1" aria-labelledby="avatarModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content" style={{ background: "#0f141b", color: "var(--text)" }}>
            <div className="modal-header">
              <h5 className="modal-title" id="avatarModalLabel">Foto de perfil y marco</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div className="modal-body">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className={`avatar-preview frame-${avatarDraft.frame}`}>
                  {avatarDraft.image ? (
                    <img src={avatarDraft.image} alt="preview avatar" />
                  ) : (
                    <div className="avatar-placeholder"><BsImage /> Sin foto</div>
                  )}
                </div>

                <div className="flex-grow-1">
                  <label className="form-label">Subir nueva foto</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control bg-transparent text-light border-secondary-subtle"
                    onChange={onPickAvatar}
                  />
                  <div className="d-flex gap-2 mt-2">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearAvatar}>
                      Quitar foto
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <div className="fw-semibold mb-2">Marco</div>
                <div className="frame-picker">
                  {[
                    { key: "none", label: "Sin" },
                    { key: "blue", label: "Azul" },
                    { key: "gold", label: "Dorado" },
                    { key: "rainbow", label: "Arcoíris" },
                    { key: "neon", label: "Neón" },
                    { key: "flag", label: "Bandera" },
                  ].map((f) => (
                    <label key={f.key} className="frame-chip">
                      <input
                        type="radio"
                        name="frame"
                        value={f.key}
                        checked={avatarDraft.frame === f.key}
                        onChange={() => setAvatarDraft((d) => ({ ...d, frame: f.key }))}
                      />
                      <span className={`chip-ring frame-${f.key}`} />
                      <span className="chip-label">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-bs-dismiss="modal"
                onClick={saveAvatarAndFrame}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
