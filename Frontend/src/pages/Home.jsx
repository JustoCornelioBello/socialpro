import { useEffect, useState } from "react";
import PostBox from "../components/PostBox.jsx";
import FeedPost from "../components/FeedPost.jsx";

const FEED_KEY = "feed_posts_v1";

const CURRENT_USER = { id: "u1", name: "Justo", avatar: "🧑‍🚀" };

export default function Home() {
  const [posts, setPosts] = useState(() => {
    try {
      const raw = localStorage.getItem(FEED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(FEED_KEY, JSON.stringify(posts)); } catch {}
  }, [posts]);

  const handleCreatePost = ({ text, images }) => {
    const newPost = {
      id: `p${Date.now()}`,
      authorId: CURRENT_USER.id,
      authorName: CURRENT_USER.name,
      authorAvatar: CURRENT_USER.avatar,
      text,
      images: images || [],                 // <-- guarda imágenes
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      userReaction: null,
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
  };

// --- HANDLERS REALES PARA POSTS Y COMENTARIOS ---

// Me gusta al post
const handleToggleLike = (postId) => {
  setPosts(prev =>
    prev.map(p => {
      if (p.id !== postId) return p;
      let { likes, dislikes, userReaction } = p;
      if (userReaction === "like") {
        likes -= 1; userReaction = null;
      } else if (userReaction === "dislike") {
        dislikes -= 1; likes += 1; userReaction = "like";
      } else {
        likes += 1; userReaction = "like";
      }
      return { ...p, likes, dislikes, userReaction };
    })
  );
};

// No me gusta al post
const handleToggleDislike = (postId) => {
  setPosts(prev =>
    prev.map(p => {
      if (p.id !== postId) return p;
      let { likes, dislikes, userReaction } = p;
      if (userReaction === "dislike") {
        dislikes -= 1; userReaction = null;
      } else if (userReaction === "like") {
        likes -= 1; dislikes += 1; userReaction = "dislike";
      } else {
        dislikes += 1; userReaction = "dislike";
      }
      return { ...p, likes, dislikes, userReaction };
    })
  );
};

// Agregar comentario (soporta responder a otro comentario)
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

  setPosts(prev =>
    prev.map(p => p.id === postId
      ? { ...p, comments: [...(p.comments || []), newC] }
      : p
    )
  );
};

// Me gusta a comentario
const handleCommentLike = (postId, commentId) => {
  setPosts(prev =>
    prev.map(p => {
      if (p.id !== postId) return p;
      const comments = (p.comments || []).map(c => {
        if (c.id !== commentId) return c;
        let { likes, dislikes, userReaction } = c;
        if (userReaction === "like") {
          likes -= 1; userReaction = null;
        } else if (userReaction === "dislike") {
          dislikes -= 1; likes += 1; userReaction = "like";
        } else {
          likes += 1; userReaction = "like";
        }
        return { ...c, likes, dislikes, userReaction };
      });
      return { ...p, comments };
    })
  );
};

// No me gusta a comentario
const handleCommentDislike = (postId, commentId) => {
  setPosts(prev =>
    prev.map(p => {
      if (p.id !== postId) return p;
      const comments = (p.comments || []).map(c => {
        if (c.id !== commentId) return c;
        let { likes, dislikes, userReaction } = c;
        if (userReaction === "dislike") {
          dislikes -= 1; userReaction = null;
        } else if (userReaction === "like") {
          likes -= 1; dislikes += 1; userReaction = "dislike";
        } else {
          dislikes += 1; userReaction = "dislike";
        }
        return { ...c, likes, dislikes, userReaction };
      });
      return { ...p, comments };
    })
  );
};

// Compartir (copia link al portapapeles; si es de grupo, apunta al grupo)
const handleShare = async (postId) => {
  const post = posts.find(p => p.id === postId);
  const url = post?.groupSlug
    ? `${window.location.origin}/groups/${post.groupSlug}?post=${postId}`
    : `${window.location.origin}/post/${postId}`;

  try {
    await navigator.clipboard.writeText(url);
    alert("Enlace copiado:\n" + url);
  } catch {
    alert("No se pudo copiar. Enlace:\n" + url);
  }
};


// Ocultar / Mostrar
const handleHide = (postId) => {
  setPosts(prev => prev.map(p => p.id === postId ? { ...p, hidden: true } : p));
};
const handleUnhide = (postId) => {
  setPosts(prev => prev.map(p => p.id === postId ? { ...p, hidden: false } : p));
};

// Eliminar
const handleDelete = (postId) => {
  setPosts(prev => prev.filter(p => p.id !== postId));
};

// Guardar
const handleSave = (postId) => {
  setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: !p.saved } : p));
  // opcional: toast/alert
  // alert(posts.find(p=>p.id===postId)?.saved ? "Quitado de guardados" : "Guardado");
};

// Reportar
const handleReport = (postId) => {
  alert("Gracias por reportar. Revisaremos esta publicación.");
};




// Copiar texto del comentario
const handleCommentCopy = async (postId, commentId) => {
  const p = posts.find(p => p.id === postId);
  const c = p?.comments?.find(c => c.id === commentId);
  if (!c) return;
  try {
    await navigator.clipboard.writeText(c.text || "");
    // opcional: toast/alert
    // alert("Comentario copiado");
  } catch {
    alert("No se pudo copiar");
  }
};

// Esconder / Mostrar comentario
const handleCommentHide = (postId, commentId) => {
  setPosts(prev => prev.map(p => {
    if (p.id !== postId) return p;
    const comments = (p.comments || []).map(c =>
      c.id === commentId ? { ...c, hidden: true } : c
    );
    return { ...p, comments };
  }));
};
const handleCommentUnhide = (postId, commentId) => {
  setPosts(prev => prev.map(p => {
    if (p.id !== postId) return p;
    const comments = (p.comments || []).map(c =>
      c.id === commentId ? { ...c, hidden: false } : c
    );
    return { ...p, comments };
  }));
};

// Eliminar comentario (y sus respuestas)
const handleCommentDelete = (postId, commentId) => {
  setPosts(prev => prev.map(p => {
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

// Reportar comentario
const handleCommentReport = (postId, commentId) => {
  alert("Gracias por reportar este comentario.");
};





  return (
    <section className="content-stack">

      <PostBox onPost={handleCreatePost} />

      <div className="feed-stack">
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
  onHide={handleHide}
  onUnhide={handleUnhide}
  onDelete={handleDelete}
  onSave={handleSave}
  onReport={handleReport}
   // NUEVOS:
  onCommentCopy={handleCommentCopy}
  onCommentHide={handleCommentHide}
  onCommentUnhide={handleCommentUnhide}
  onCommentDelete={handleCommentDelete}
  onCommentReport={handleCommentReport}
/>

        ))}
      </div>
    </section>
  );
}
