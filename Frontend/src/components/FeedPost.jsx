import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BsHandThumbsUp, BsHandThumbsDown, BsChatLeftText, BsShare, BsThreeDots,
  BsBookmark, BsFlag, BsEyeSlash, BsEye, BsTrash, BsChevronDown, BsChevronUp,
  BsClipboard
} from "react-icons/bs";


function formatDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
const slug = (name = "") =>
  name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

function CommentItem({
  c,
  allComments,
  onReply = () => { },
  onToggleLike = () => { },
  onToggleDislike = () => { },
  onCopy = () => { },
  onHide = () => { },
  onUnhide = () => { },
  onDelete = () => { },
  onReport = () => { },
  depth = 0,
}) {
  const children = useMemo(
    () => allComments.filter((x) => x.parentId === c.id),
    [allComments, c.id]
  );
  const liked = c.userReaction === "like";
  const disliked = c.userReaction === "dislike";

  // Estado visual si está oculto
  if (c.hidden) {
    return (
      <li className="fp-comment" style={{ marginLeft: depth * 16 }}>
        <div className="fp-comment-hidden">
          <div className="d-flex align-items-center gap-2">
            <BsEyeSlash /> <span>Comentario oculto</span>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onUnhide(c.id)}>
              <BsEye className="me-1" /> Mostrar
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(c.id)}>
              <BsTrash className="me-1" /> Eliminar
            </button>
          </div>
        </div>
      </li>
    );
  }





  return (
    <li className="fp-comment" style={{ marginLeft: depth * 16 }}>
      <div className="fp-comment-avatar" aria-hidden>💬</div>
      <div className="fp-comment-body">
        <div className="fp-comment-header">
          <strong>
            <Link to={`/profile/${slug(c.author)}`} className="fp-link">
              {c.author}
            </Link>
          </strong>
          <span className="fp-comment-date">{formatDate(c.createdAt)}</span>

          {/* Menú tres puntos por comentario */}
          <div className="dropdown ms-auto">
            <button type="button" className="btn btn-ghost btn-sm" data-bs-toggle="dropdown" title="Opciones">
              <BsThreeDots />
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button type="button" className="dropdown-item" onClick={() => onCopy(c.id)}>
                  <BsClipboard className="me-2" /> Copiar
                </button>
              </li>
              <li>
                <button type="button" className="dropdown-item" onClick={() => onHide(c.id)}>
                  <BsEyeSlash className="me-2" /> Esconder
                </button>
              </li>
              <li>
                <button type="button" className="dropdown-item text-danger" onClick={() => onDelete(c.id)}>
                  <BsTrash className="me-2" /> Eliminar
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button type="button" className="dropdown-item text-danger" onClick={() => onReport(c.id)}>
                  <BsFlag className="me-2" /> Reportar
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="fp-comment-text">{c.text}</div>

        <div className="fp-comment-actions">
          <button type="button" className={`c-action ${liked ? "active-like" : ""}`} onClick={() => onToggleLike(c.id)}>
            <BsHandThumbsUp /><span>{c.likes}</span>
          </button>
          <button type="button" className={`c-action ${disliked ? "active-dislike" : ""}`} onClick={() => onToggleDislike(c.id)}>
            <BsHandThumbsDown /><span>{c.dislikes}</span>
          </button>
          <button type="button" className="c-action" onClick={() => onReply(c.id, c.author)}>
            Responder
          </button>
        </div>

        {children.length > 0 && (
          <ul className="fp-children">
            {children.map((child) => (
              <CommentItem
                key={child.id}
                c={child}
                allComments={allComments}
                onReply={onReply}
                onToggleLike={onToggleLike}
                onToggleDislike={onToggleDislike}
                onCopy={onCopy}
                onHide={onHide}
                onUnhide={onUnhide}
                onDelete={onDelete}
                onReport={onReport}
                depth={Math.min(depth + 1, 4)}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
export default function FeedPost({
  post,
  // Reacciones y comentarios
  onToggleLike = () => { },
  onToggleDislike = () => { },
  onAddComment = () => { },
  onShare = () => { },
  onCommentLike = () => { },
  onCommentDislike = () => { },

  // 🔹 ACCIONES DEL POST (FALTABAN)
  onSave = () => { },
  onHide = () => { },
  onUnhide = () => { },
  onDelete = () => { },
  onReport = () => { },

  // Acciones por comentario
  onCommentCopy = () => { },
  onCommentHide = () => { },
  onCommentUnhide = () => { },
  onCommentDelete = () => { },
  onCommentReport = () => { },
}) {
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState(null); // {id, name} | null

  // Ver más / menos
  const [expanded, setExpanded] = useState(false);
  const MAX_CHARS = 220;
  const needsClamp = !!post.text && post.text.length > MAX_CHARS;
  const displayText = expanded || !needsClamp ? post.text : (post.text || "").slice(0, MAX_CHARS) + "…";

  // Reacciones
  const liked = post.userReaction === "like";
  const disliked = post.userReaction === "dislike";

  const rootComments = useMemo(
    () => (post.comments || []).filter((c) => !c.parentId),
    [post.comments]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = comment.trim();
    if (!value) return;
    onAddComment(post.id, value, replyTo?.id, replyTo?.name);
    setComment("");
    setReplyTo(null);
  };

  const startReply = (id, name) => {
    setReplyTo({ id, name });
    setComment((prev) => (prev?.startsWith(`@${name} `) ? prev : `@${name} `));
  };





  function escapeHtml(s = "") { return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function linkify(text = "") {
    // auto-enlaza URLs http/https
    const urlRe = /\bhttps?:\/\/[^\s)]+/gi;
    // escapa primero y luego reemplaza URLs por <a>
    const safe = escapeHtml(text);
    return safe.replace(urlRe, (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`);
  }






  // Si está oculto, mostrar tarjeta compacta
  if (post.hidden) {
    return (
      <article className="card feed-post">
        <div className="feed-hidden">
          <div className="d-flex align-items-center gap-2" style={{color:'white'}}>
            <BsEyeSlash />
            <span>Publicación oculta</span>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onUnhide(post.id)}>
              <BsEye className="me-1" /> Mostrar
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(post.id)}>
              <BsTrash className="me-1" /> Eliminar
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="card feed-post">
      <header className="feed-post-header">
        <div className="fp-user">
          <div className="fp-avatar" aria-hidden>
            {post.authorAvatarImage
              ? <img src={post.authorAvatarImage} alt={post.authorName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              : (post.authorAvatar ?? "🧑‍🚀")}
          </div>
          <div>
            <div className="fp-name">
              <Link to={`/profile/${slug(post.authorName)}`} className="fp-link">
                {post.authorName}
              </Link>
            </div>
            <div className="fp-date">{formatDate(post.createdAt)}</div>
            {post.groupSlug && (
              <div className="fp-context">
                en <a className="fp-link" href={`/groups/${post.groupSlug}`}>{post.groupName || "Grupo"}</a>
              </div>
            )}
          </div>
        </div>

        {/* Menú de opciones */}
        <div className="dropdown">
          <button className="btn btn-ghost btn-sm" data-bs-toggle="dropdown" title="Opciones" type="button">
            <BsThreeDots />
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            {/* Ver más / Ver menos (solo si aplica) */}
            {needsClamp && (
              <li>
                <button className="dropdown-item" type="button" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? <><BsChevronUp className="me-2" /> Ver menos</> : <><BsChevronDown className="me-2" /> Ver más</>}
                </button>
              </li>
            )}
            {needsClamp && <li><hr className="dropdown-divider" /></li>}

            <li>
              <button className="dropdown-item" type="button" onClick={() => onSave(post.id)}>
                <BsBookmark className="me-2" /> {post.saved ? "Guardado" : "Guardar"}
              </button>
            </li>
            <li>
              <button className="dropdown-item" type="button" onClick={() => onHide(post.id)}>
                <BsEyeSlash className="me-2" /> Ocultar
              </button>
            </li>
            <li>
              <button className="dropdown-item text-danger" type="button" onClick={() => onDelete(post.id)}>
                <BsTrash className="me-2" /> Eliminar
              </button>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item text-danger" type="button" onClick={() => onReport(post.id)}>
                <BsFlag className="me-2" /> Reportar
              </button>
            </li>
          </ul>
        </div>
      </header>

      {/* Texto (con clamp) */}




       <div style={{color: 'white'}}>

{post.text && (
        <div
          className="feed-post-text"
          dangerouslySetInnerHTML={{ __html: linkify(displayText) }}
        />
      )}

       </div>


      





      {/* Imágenes */}
      {Array.isArray(post.images) && post.images.length > 0 && (
        <div className="feed-images-grid">
          {post.images.map((src, i) => (
            <div className={`feed-img ${post.images.length === 1 ? "one" : ""}`} key={i}>
              <img src={src} alt={`post-${post.id}-${i}`} />
            </div>
          ))}
        </div>
      )}

      {/* Acciones del post */}
      <div className="feed-post-actions">
        <button type="button" className={`fp-action ${liked ? "active-like" : ""}`} onClick={() => onToggleLike(post.id)}>
          <BsHandThumbsUp /><span>{post.likes}</span>
        </button>
        <button type="button" className={`fp-action ${disliked ? "active-dislike" : ""}`} onClick={() => onToggleDislike(post.id)}>
          <BsHandThumbsDown /><span>{post.dislikes}</span>
        </button>
        <div className="fp-comments-count">
          <BsChatLeftText /><span>{post.comments?.length ?? 0}</span>
        </div>
        <button type="button" className="fp-action" onClick={() => onShare(post.id)}>
          <BsShare /><span>Compartir</span>
        </button>
      </div>

      {/* Comentarios */}
      <ul className="fp-comments">
        {rootComments.map((c) => (
          <CommentItem
            key={c.id}
            c={c}
            allComments={post.comments}
            onReply={startReply}
            onToggleLike={(cid) => onCommentLike(post.id, cid)}
            onToggleDislike={(cid) => onCommentDislike(post.id, cid)}
            onCopy={(cid) => onCommentCopy(post.id, cid)}
            onHide={(cid) => onCommentHide(post.id, cid)}
            onUnhide={(cid) => onCommentUnhide(post.id, cid)}
            onDelete={(cid) => onCommentDelete(post.id, cid)}
            onReport={(cid) => onCommentReport(post.id, cid)}
          />

        ))}
      </ul>

      {/* Form comentario */}
      <form onSubmit={handleSubmit} className="fp-comment-form">
        {replyTo && (
          <div className="replying-pill">
            Respondiendo a <strong>@{replyTo.name}</strong>
            <button type="button" className="btn btn-mini" onClick={() => setReplyTo(null)}>Cancelar</button>
          </div>
        )}
        <input
          className="fp-comment-input"
          placeholder="Escribe un comentario…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" type="submit">Comentar</button>
      </form>
    </article>
  );
}
