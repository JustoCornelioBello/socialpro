import { useEffect, useMemo, useState } from "react";
import FeedPost from "../components/FeedPost.jsx";

const FEED_KEY = "feed_posts_v1";
const CURRENT_USER = { id: "u1", name: "Justo" };

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function Saved() {
  // trabajamos local al componente y persistimos
  const [feed, setFeed] = useState(() => readJSON(FEED_KEY, []));
  useEffect(() => writeJSON(FEED_KEY, feed), [feed]);

  const savedPosts = useMemo(
    () => feed.filter(p => p.saved).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [feed]
  );

  /* ===== Handlers (mismo patrón que en Home/Profile/GroupDetail) ===== */
  const handleToggleLike = (postId) => {
    setFeed(prev => prev.map(p => {
      if (p.id !== postId) return p;
      let { likes, dislikes, userReaction } = p;
      if (userReaction === "like") { likes -= 1; userReaction = null; }
      else if (userReaction === "dislike") { dislikes -= 1; likes += 1; userReaction = "like"; }
      else { likes += 1; userReaction = "like"; }
      return { ...p, likes, dislikes, userReaction };
    }));
  };

  const handleToggleDislike = (postId) => {
    setFeed(prev => prev.map(p => {
      if (p.id !== postId) return p;
      let { likes, dislikes, userReaction } = p;
      if (userReaction === "dislike") { dislikes -= 1; userReaction = null; }
      else if (userReaction === "like") { likes -= 1; dislikes += 1; userReaction = "dislike"; }
      else { dislikes += 1; userReaction = "dislike"; }
      return { ...p, likes, dislikes, userReaction };
    }));
  };

  const handleAddComment = (postId, text, parentId = null, replyingToName = null) => {
    const newC = {
      id: `c${Date.now()}`,
      authorId: CURRENT_USER.id,
      author: CURRENT_USER.name,
      text,
      createdAt: new Date().toISOString(),
      likes: 0, dislikes: 0, userReaction: null,
      parentId: parentId || null,
      replyingTo: replyingToName || null,
    };
    setFeed(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), newC] } : p));
  };

  const handleCommentLike = (postId, commentId) => {
    setFeed(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = (p.comments || []).map(c => {
        if (c.id !== commentId) return c;
        let { likes, dislikes, userReaction } = c;
        if (userReaction === "like") { likes -= 1; userReaction = null; }
        else if (userReaction === "dislike") { dislikes -= 1; likes += 1; userReaction = "like"; }
        else { likes += 1; userReaction = "like"; }
        return { ...c, likes, dislikes, userReaction };
      });
      return { ...p, comments };
    }));
  };

  const handleCommentDislike = (postId, commentId) => {
    setFeed(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = (p.comments || []).map(c => {
        if (c.id !== commentId) return c;
        let { likes, dislikes, userReaction } = c;
        if (userReaction === "dislike") { dislikes -= 1; userReaction = null; }
        else if (userReaction === "like") { likes -= 1; dislikes += 1; userReaction = "dislike"; }
        else { dislikes += 1; userReaction = "dislike"; }
        return { ...c, likes, dislikes, userReaction };
      });
      return { ...p, comments };
    }));
  };

  const handleShare = async (postId) => {
    const post = feed.find(p => p.id === postId);
    const url = post?.groupSlug
      ? `${window.location.origin}/groups/${post.groupSlug}?post=${postId}`
      : `${window.location.origin}/post/${postId}`;
    try { await navigator.clipboard.writeText(url); alert("Enlace copiado:\n" + url); }
    catch { alert("No se pudo copiar. Enlace:\n" + url); }
  };

  // Acciones del post
  const handleSave = (postId) => {
    setFeed(prev => prev.map(p => p.id === postId ? { ...p, saved: !p.saved } : p));
  };
  const handleHide = (postId) => {
    setFeed(prev => prev.map(p => p.id === postId ? { ...p, hidden: true } : p));
  };
  const handleUnhide = (postId) => {
    setFeed(prev => prev.map(p => p.id === postId ? { ...p, hidden: false } : p));
  };
  const handleDelete = (postId) => {
    setFeed(prev => prev.filter(p => p.id !== postId));
  };
  const handleReport = (postId) => {
    alert("Gracias por reportar. Revisaremos esta publicación.");
  };

  // Acciones de comentario
  const handleCommentCopy = async (postId, commentId) => {
    const p = feed.find(p => p.id === postId);
    const c = p?.comments?.find(c => c.id === commentId);
    if (!c) return;
    try { await navigator.clipboard.writeText(c.text || ""); }
    catch { alert("No se pudo copiar"); }
  };
  const handleCommentHide = (postId, commentId) => {
    setFeed(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = (p.comments || []).map(c => c.id === commentId ? { ...c, hidden: true } : c);
      return { ...p, comments };
    }));
  };
  const handleCommentUnhide = (postId, commentId) => {
    setFeed(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = (p.comments || []).map(c => c.id === commentId ? { ...c, hidden: false } : c);
      return { ...p, comments };
    }));
  };
  const handleCommentDelete = (postId, commentId) => {
    setFeed(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const all = p.comments || [];
      const toRemove = new Set([commentId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const cm of all) {
          if (cm.parentId && toRemove.has(cm.parentId) && !toRemove.has(cm.id)) {
            toRemove.add(cm.id); changed = true;
          }
        }
      }
      const comments = all.filter(cm => !toRemove.has(cm.id));
      return { ...p, comments };
    }));
  };
  const handleCommentReport = (postId, commentId) => {
    alert("Gracias por reportar este comentario.");
  };

  return (
    <section className="content-stack">
      <h2>Guardados</h2>

      {savedPosts.length === 0 ? (
        <div className="card">
          <div className="muted">Aún no has guardado publicaciones. Usa el menú de los tres puntos → “Guardar”.</div>
        </div>
      ) : (
        <div className="feed-stack">
          {savedPosts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              onToggleLike={handleToggleLike}
              onToggleDislike={handleToggleDislike}
              onAddComment={handleAddComment}
              onCommentLike={handleCommentLike}
              onCommentDislike={handleCommentDislike}
              onShare={handleShare}
              // Post-level
              onSave={handleSave}
              onHide={handleHide}
              onUnhide={handleUnhide}
              onDelete={handleDelete}
              onReport={handleReport}
              // Comment-level
              onCommentCopy={handleCommentCopy}
              onCommentHide={handleCommentHide}
              onCommentUnhide={handleCommentUnhide}
              onCommentDelete={handleCommentDelete}
              onCommentReport={handleCommentReport}
            />
          ))}
        </div>
      )}
    </section>
  );
}
