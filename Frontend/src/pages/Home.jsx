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

  // ...mantén tus handlers de like/dislike, comments y share (no cambian)

  // si los tienes en otro archivo, recuerda pasarlos abajo
  const handleToggleLike = (postId) => { /* ... */ };
  const handleToggleDislike = (postId) => { /* ... */ };
  const handleAddComment = (postId, text, parentId, replyingToName) => { /* ... */ };
  const handleCommentLike = (postId, commentId) => { /* ... */ };
  const handleCommentDislike = (postId, commentId) => { /* ... */ };
  const handleShare = async (postId) => { /* ... */ };

  return (
    <section className="content-stack">
      <h2>Inicio</h2>
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
          />
        ))}
      </div>
    </section>
  );
}
