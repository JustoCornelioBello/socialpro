import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BsHandThumbsUp, BsHandThumbsDown, BsChatLeftText, BsShare, BsThreeDots,
} from "react-icons/bs";

function formatDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
const slug = (name) => name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

function CommentItem({
  c,
  allComments,
  onReply,
  onToggleLike,
  onToggleDislike,
  depth = 0,
}) {
  const children = useMemo(
    () => allComments.filter((x) => x.parentId === c.id),
    [allComments, c.id]
  );
  const liked = c.userReaction === "like";
  const disliked = c.userReaction === "dislike";

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
        </div>
        <div className="fp-comment-text">{c.text}</div>

        <div className="fp-comment-actions">
          <button
            className={`c-action ${liked ? "active-like" : ""}`}
            onClick={() => onToggleLike(c.id)}
            title="Me gusta"
          >
            <BsHandThumbsUp /><span>{c.likes}</span>
          </button>
          <button
            className={`c-action ${disliked ? "active-dislike" : ""}`}
            onClick={() => onToggleDislike(c.id)}
            title="No me gusta"
          >
            <BsHandThumbsDown /><span>{c.dislikes}</span>
          </button>
          <button className="c-action" onClick={() => onReply(c.id, c.author)}>
            Responder
          </button>
        </div>

        {/* Hijos */}
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
  onToggleLike,
  onToggleDislike,
  onAddComment,
  onShare,
  onCommentLike,
  onCommentDislike,
}) {
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState(null); // {id, name} | null

  const liked = post.userReaction === "like";
  const disliked = post.userReaction === "dislike";

  const rootComments = useMemo(
    () => post.comments.filter((c) => !c.parentId),
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

  return (
    <article className="card feed-post">
      {/* Header post */}
      <header className="feed-post-header">
        <div className="fp-user">
          <div className="fp-avatar" aria-hidden>{post.authorAvatar ?? "🧑‍🚀"}</div>
          <div>
            <div className="fp-name">
              <Link to={`/profile/${slug(post.authorName)}`} className="fp-link">
                {post.authorName}
              </Link>
            </div>
            <div className="fp-date">{formatDate(post.createdAt)}</div>
          </div>

<div className="fp-date">{formatDate(post.createdAt)}</div>

{post.groupSlug && (
  <div className="fp-context">
    en <a className="fp-link" href={`/groups/${post.groupSlug}`}>{post.groupName || "Grupo"}</a>
  </div>
)}

        </div>

        <div className="dropdown">
          <button className="btn btn-ghost btn-sm" data-bs-toggle="dropdown" title="Opciones">
            <BsThreeDots />
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li><button className="dropdown-item">Guardar</button></li>
            <li><button className="dropdown-item">Ocultar publicación</button></li>
            <li><hr className="dropdown-divider" /></li>
            <li><button className="dropdown-item text-danger">Reportar</button></li>
          </ul>
        </div>
      </header>

      {/* Texto */}
      <div className="feed-post-text" style={{color: "white"}}>{post.text}</div>

      {/* Acciones post */}
      <div className="feed-post-actions">
        <button
          className={`fp-action ${liked ? "active-like" : ""}`}
          onClick={() => onToggleLike(post.id)}
        >
          <BsHandThumbsUp /><span>{post.likes}</span>
        </button>
        <button
          className={`fp-action ${disliked ? "active-dislike" : ""}`}
          onClick={() => onToggleDislike(post.id)}
        >
          <BsHandThumbsDown /><span>{post.dislikes}</span>
        </button>
        <div className="fp-comments-count">
          <BsChatLeftText /><span>{post.comments.length}</span>
        </div>
        <button className="fp-action" onClick={() => onShare(post.id)}>
          <BsShare /><span>Compartir</span>
        </button>
      </div>

      {/* Lista de comentarios (árbol) */}
      <ul className="fp-comments">
        {rootComments.map((c) => (
          <CommentItem
            key={c.id}
            c={c}
            allComments={post.comments}
            onReply={startReply}
            onToggleLike={(cid) => onCommentLike(post.id, cid)}
            onToggleDislike={(cid) => onCommentDislike(post.id, cid)}
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
