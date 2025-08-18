import React from "react";
import { BsTrophyFill, BsAward, BsStars } from "react-icons/bs";

/** Tabla de clasificación (top 10) */
export function Leaderboard({ board = [], meHandle }) {
  const sorted = [...board].sort((a, b) => b.score - a.score).slice(0, 10);
  return (
    <div className="card">
      <h4 className="card-title d-flex align-items-center gap-2">
        <BsTrophyFill /> Clasificación
      </h4>
      <ol className="list-unstyled m-0">
        {sorted.map((u, i) => (
          <li
            key={u.handle}
            className={`d-flex justify-content-between align-items-center py-1 ${
              u.handle === meHandle ? "fw-bold" : ""
            }`}
          >
            <span>{i + 1}. @{u.handle}</span>
            <span>{u.score} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Panel de Trofeos por umbral de puntos */
export function Trophies({ total = 0 }) {
  const tiers = [
    { name: "Bronce", need: 100, color: "#cd7f32" },
    { name: "Plata",  need: 250, color: "#c0c0c0" },
    { name: "Oro",    need: 500, color: "#ffd700" },
    { name: "Platino",need: 1000, color: "#9fe4ff" },
  ];
  return (
    <div className="card">
      <h4 className="card-title d-flex align-items-center gap-2">
        <BsAward /> Trofeos
      </h4>
      <div className="d-grid" style={{ gap: 8 }}>
        {tiers.map(t => (
          <div key={t.name}
               className="d-flex justify-content-between align-items-center p-2 trophy-row"
               style={{ border: "1px solid var(--border)", borderRadius: 10, background: "#0f141b" }}>
            <div className="d-flex align-items-center gap-2">
              <BsStars style={{ color: t.color }} />
              <strong>{t.name}</strong>
            </div>
            <div className="small text-secondary">
              {total >= t.need ? "¡Obtenido!" : `${total}/${t.need} pts`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
