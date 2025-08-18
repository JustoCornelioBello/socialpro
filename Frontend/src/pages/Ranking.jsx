import { Leaderboard, Trophies } from "./games/MetaPanels.jsx";
import { useGamesState } from "./games/store.js";

const ME = { handle: "justo" }; // mismo handle que usas en Juegos

export default function Ranking() {
  const state = useGamesState(); // lee y se actualiza en vivo
  const board = (state.leaderboard || []).concat([{ handle: ME.handle, score: state.totalScore || 0 }]);

  return (
    <section className="content-stack">
      <h2>Clasificación & Trofeos</h2>

      <div className="grid-2">
        <Trophies total={state.totalScore || 0} />
        <Leaderboard board={board} meHandle={ME.handle} />
      </div>

      {/* Puedes ampliar con más stats si quieres */}
      <div className="card mt-2">
        <h4 className="card-title">Resumen</h4>
        <div className="d-flex gap-3">
          <div className="badge text-bg-dark">🪙 {state.coins || 0} coins</div>
          <div className="badge text-bg-dark">⭐ {state.totalScore || 0} pts</div>
        </div>
      </div>
    </section>
  );
}
