export default function RightPanel() {
  // Aquí podrías consumir un contexto o fetch del usuario
  const user = {
    name: "Justo",
    handle: "@justo_dev",
    bio: "Construyendo apps con IA y educación.",
  };

  const recomendaciones = [
    { id: 1, title: "Sigue a @edtech_news", meta: "Tendencias EdTech" },
    { id: 2, title: "Únete a #ReactRD", meta: "Comunidad local" },
    { id: 3, title: "Explora Cursos IA", meta: "Aprende modelos locales" },
  ];

  return (
    <div className="rightpanel">
      <div className="card user-card">
        <div className="avatar" aria-hidden>🧑‍🚀</div>
        <div className="u-info">
          <strong>{user.name}</strong>
          <div className="muted">{user.handle}</div>
          <p className="u-bio">{user.bio}</p>
          <div className="u-actions">
            <button className="btn btn-primary">Editar perfil</button>
            <button className="btn btn-ghost">Ajustes</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h4 className="card-title">Recomendaciones</h4>
        <ul className="rec-list">
          {recomendaciones.map((r) => (
            <li key={r.id} className="rec-item">
              <div className="rec-dot" />
              <div>
                <div className="rec-title">{r.title}</div>
                <div className="muted">{r.meta}</div>
              </div>
              <button className="btn btn-mini">Seguir</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
