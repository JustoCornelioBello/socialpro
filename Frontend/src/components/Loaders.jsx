import React from "react";

/** Overlay centrado con spinner y texto */
export function SpinnerOverlay({ visible = false, label = "Cargando…" }) {
  if (!visible) return null;
  return (
    <div className="loader-overlay">
      <div className="loader-box">
        <div className="spinner" aria-hidden />
        <div className="loader-label">{label}</div>
      </div>
    </div>
  );
}

/** Spinner pequeño inline */
export function InlineSpinner({ size = 16 }) {
  return <span className="spinner inline" style={{ width: size, height: size }} aria-hidden />;
}

/** Skeleton para una tarjeta de post */
export function SkeletonPost() {
  return (
    <div className="card skel-card">
      <div className="skel-row gap">
        <div className="skel-avatar" />
        <div className="skel-col">
          <div className="skel-line w-40" />
          <div className="skel-line w-25" />
        </div>
      </div>
      <div className="skel-line w-100" />
      <div className="skel-line w-90" />
      <div className="skel-line w-70" />
      <div className="skel-img" />
    </div>
  );
}

/** Skeleton de comentario */
export function SkeletonComment({ lines = 2 }) {
  return (
    <div className="skel-comment">
      <div className="skel-avatar sm" />
      <div className="skel-col">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`skel-line ${i === 0 ? "w-60" : i === lines - 1 ? "w-40" : "w-90"}`} />
        ))}
      </div>
    </div>
  );
}
