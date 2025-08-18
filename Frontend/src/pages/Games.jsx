import { useEffect, useMemo, useRef, useState } from "react";
import {
  BsHeartFill, BsHeart, BsClock, BsLightningCharge,
  BsPatchCheckFill, BsPatchExclamation, BsArrowRepeat, BsController, BsSpeedometer2,
  BsQuestionLg, BsPuzzle, BsLightning, BsShuffle, BsPersonBadge
} from "react-icons/bs";

// ✅ paths corregidos
import WORDS from "./games/words";
import { getGamesState, setGamesState } from "./games/store.js";

// =================== Constantes ===================
const CURRENT_USER = { id: "u1", name: "Justo", handle: "justo" };

const MAX_HEARTS = 5;
const HEART_COOLDOWN_MS = 20 * 60 * 1000; // 20 min por corazón
const LEVELS_MAX = 25;
const COINS_PER_LEVEL = 200;

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
const msToClock = (ms) => {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${pad2(m)}:${pad2(rs)}`;
};

// =================== Catálogo de juegos (meta) ===================
const GAMES = [
  { id: "riddles",  title: "Adivinanzas",  icon: <BsQuestionLg />,  avgSec: 20, desc: "Responde la adivinanza correcta.", pointsPerLevel: 10 },
  { id: "who",      title: "¿Quién soy?",  icon: <BsPersonBadge />, avgSec: 15, desc: "Adivina la persona con 3 pistas.", pointsPerLevel: 15 },
  { id: "mind",     title: "Mentales",     icon: <BsPuzzle />,      avgSec: 10, desc: "Cálculo rápido (sumas/restas/mult.).", pointsPerLevel: 8 },
  { id: "sequence", title: "Secuencia",    icon: <BsController />,  avgSec: 20, desc: "Memoriza y repite la secuencia.", pointsPerLevel: 12 },
  { id: "reaction", title: "Reacción",     icon: <BsLightning />,   avgSec: 8,  desc: "Haz clic en cuanto cambie a ¡YA!", pointsPerLevel: 6 },
  { id: "scramble", title: "Word Scramble",icon: <BsShuffle />,     avgSec: 15, desc: "Ordena la palabra revuelta.", pointsPerLevel: 10 },
];

// =================== Datos simples para los juegos base ===================
const RIDDLES = [
  { q: "Blanca por dentro, verde por fuera. Si quieres que te lo diga, espera.", a: "pera" },
  { q: "Vuelo sin alas, lloro sin ojos.", a: "nube" },
  { q: "Cuanto más le quitas, más grande es.", a: "agujero" },
  { q: "Tengo agujas pero no pincho.", a: "reloj" },
  { q: "Pasa por el sol sin quemarse y por el agua sin mojarse.", a: "sombra" },
];
const WHO = [
  { name: "Albert Einstein", hints: ["Nací en Alemania", "Teoría de la relatividad", "Premio Nobel 1921"], options: ["Albert Einstein","Isaac Newton","Nikola Tesla"] },
  { name: "Frida Kahlo", hints: ["Pintora mexicana", "Autorretratos", "Casa azul"], options: ["Frida Kahlo","Salvador Dalí","Diego Rivera"] },
  { name: "Lionel Messi", hints: ["Rosario", "Balón de Oro", "PSG/Barcelona/Inter Miami"], options: ["Cristiano Ronaldo","Lionel Messi","Neymar"] },
];
const OPS = ["+", "-", "×"];
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// =================== Componentes de UI ===================
function HeartsBar({ hearts, nextAt, onRefill }) {
  const now = Date.now();
  const remaining = nextAt ? Math.max(0, nextAt - now) : 0;
  return (
    <div className="card hearts-card">
      <div className="hearts-left">
        {Array.from({ length: MAX_HEARTS }).map((_, i) =>
          i < hearts ? <BsHeartFill key={i} className="heart full" /> : <BsHeart key={i} className="heart" />
        )}
      </div>
      <div className="hearts-right" style={{color: 'white', fontSize: '0.8rem'}}>
        <BsClock />
        {hearts < MAX_HEARTS ? <> Siguiente ❤️ en <strong>{msToClock(remaining)}</strong></> : " Lleno"}
        <button className="btn btn-sm btn-ghost ms-2" onClick={onRefill} title="Rellenar (demo)">
          <BsArrowRepeat /> Regen
        </button>
      </div>
    </div>
  );
}


// dentro de export default function Games() {
const onMistake = () => {
  if (canScore) {
    // solo descuenta si puede puntuar
    spendHeart();
  }
};


// Card con progreso por juego
function GameCard({ meta, progress, onPlay }) {
  const pct = Math.round((progress.completed / LEVELS_MAX) * 100);
  const levelsLeft = Math.max(0, LEVELS_MAX - progress.completed);
  const timeLeftSec = levelsLeft * meta.avgSec;
  const mm = Math.floor(timeLeftSec / 60);
  const ss = timeLeftSec % 60;

  return (
    <div className="game-card card tilt">
      <div className="game-card-head">
        <div className="game-icon">{meta.icon}</div>
        <div>
          <div className="game-title" style={{color: 'white'}}>{meta.title}</div>
          <div className="game-desc">{meta.desc}</div>
        </div>
      </div>

      <div className="progress progress-striped mt-2" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="small text-secondary mt-1">
        Nivel {progress.completed}/{LEVELS_MAX} — Tiempo restante aprox: <strong>{pad2(mm)}:{pad2(ss)}</strong>
      </div>

      <div className="d-flex justify-content-end mt-2">
        <button className="btn btn-primary pulse" onClick={() => onPlay(meta.id)}>
          <BsSpeedometer2 className="me-1" /> Jugar
        </button>
      </div>
    </div>
  );
}

// =================== Juegos (runners) ===================

// Adivinanzas
function GameRiddles({ canScore, onWin }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * RIDDLES.length));
  const [value, setValue] = useState("");
  const [state, setState] = useState("playing");
  const [hintUsed, setHintUsed] = useState(false);
  const current = RIDDLES[idx];
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

  const submit = (e) => {
    e.preventDefault();
    const ok = norm(value) === norm(current.a);
    if (ok) {
      onWin({ coins: canScore ? COINS_PER_LEVEL : 0, score: 10, label: hintUsed ? "(pista usada)" : "" });
      setState("correct");
    } else{
        setState("wrong")
        onMistake();  
    }
  };
  const next = () => { setIdx((p) => (p + 1) % RIDDLES.length); setValue(""); setState("playing"); setHintUsed(false); };

  return (
    <div className="card">
      <h4 className="card-title">Adivinanzas</h4>
      <p>{current.q}</p>
      <form onSubmit={submit} className="d-flex gap-2">
        <input className="form-control bg-transparent text-light border-secondary-subtle" placeholder="Tu respuesta"
               value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn btn-primary">Responder</button>
      </form>
      <div className="d-flex gap-2 mt-2">
        <button className="btn btn-ghost btn-sm" onClick={() => setHintUsed(true)} disabled={hintUsed}>Pista</button>
        <button className="btn btn-ghost btn-sm" onClick={next}>Saltar</button>
        {!canScore && <span className="badge text-bg-secondary">Práctica</span>}
      </div>
      {state === "correct" && <div className="alert alert-success mt-2 coin-pop"><BsPatchCheckFill className="me-1" /> ¡Correcto!</div>}
      {state === "wrong" && <div className="alert alert-danger mt-2"><BsPatchExclamation className="me-1" /> Incorrecto. Era <b>{current.a}</b></div>}
    </div>
  );
}

// ¿Quién soy?
function GameWho({ canScore, onWin }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * WHO.length));
  const [choice, setChoice] = useState(null);
  const current = WHO[idx];
  const submit = () => {
    if (choice == null) return;
    const ok = current.options[choice] === current.name;
   if (ok) {
      onWin({ coins: canScore ? COINS_PER_LEVEL : 0, score: 15 });
      alert("¡Correcto!");
    } else {
      onMistake(); // ← resta 1 ❤️
      alert(`Incorrecto. Era ${current.name}`);
    }
  };
  return (
    <div className="card">
      <h4 className="card-title">¿Quién soy?</h4>
      <ul className="mb-2">{current.hints.map((h,i)=><li key={i} className="small">{h}</li>)}</ul>
      <div className="d-grid" style={{ gap: 8 }}>
        {current.options.map((op,i)=>(
          <label key={i} className={`option ${choice === i ? "selected" : ""}`}>
            <input type="radio" name="who" checked={choice===i} onChange={()=>setChoice(i)} /> {op}
          </label>
        ))}
      </div>
      <div className="d-flex gap-2 mt-2 align-items-center">
        <button className="btn btn-primary" onClick={submit} disabled={choice==null}>Confirmar</button>
        <button className="btn btn-ghost" onClick={()=>{ setIdx((p)=>(p+1)%WHO.length); setChoice(null);} }>Saltar</button>
        {!canScore && <span className="badge text-bg-secondary">Práctica</span>}
      </div>
    </div>
  );
}

// Mentales (aritmética)
function GameMind({ canScore, onWin }) {
  const [a, setA] = useState(() => rnd(3, 20));
  const [b, setB] = useState(() => rnd(3, 20));
  const [op, setOp] = useState(() => OPS[rnd(0, OPS.length - 1)]);
  const [value, setValue] = useState("");
  const answer = useMemo(() => op==="+"?a+b:op==="-"?a-b:a*b, [a,b,op]);

  const next = () => { setA(rnd(3,20)); setB(rnd(3,20)); setOp(OPS[rnd(0, OPS.length - 1)]); setValue(""); };
  const submit = (e) => {
    e.preventDefault();
    const ok = Number(value) === answer;
     if (ok) {
      onWin({ coins: canScore ? COINS_PER_LEVEL : 0, score: 8 });
    } else {
      onMistake(); // ← resta 1 ❤️
    }
    next();
  };
  return (
    <div className="card" style={{ color: 'white' }}>
      <h4 className="card-title">Juegos mentales</h4>
      <form onSubmit={submit} className="d-flex gap-2 align-items-center">
        <div className="display-6 fw-bold">{a} {op} {b} =</div>
        <input className="form-control bg-transparent text-light border-secondary-subtle" style={{maxWidth:140}} placeholder="?" value={value} onChange={e=>setValue(e.target.value)} />
        <button className="btn btn-primary">OK</button>
      </form>
      {!canScore && <span className="badge text-bg-secondary mt-2">Práctica</span>}
    </div>
  );
}

// Secuencia (Simon)
function GameSequence({ canScore, level, onWin }) {
  const pads = ["#f87171","#60a5fa","#34d399","#fbbf24"]; // rojo, azul, verde, amarillo
  const [seq, setSeq] = useState([]);
  const [showing, setShowing] = useState(false);
  const [step, setStep] = useState(0);

  const playSequence = async (s) => {
    setShowing(true);
    for (let i=0;i<s.length;i++){
      setStep(i+1);
      await new Promise(r=>setTimeout(r, 450));
    }
    setStep(0);
    setShowing(false);
  };

  useEffect(() => {
    const len = clamp(3 + Math.floor(level/3), 3, 8);
    const s = Array.from({length: len}, () => rnd(0, pads.length-1));
    setSeq(s);
    playSequence(s);
    // eslint-disable-next-line
  }, [level]);

  const input = useRef([]);
  const onPad = async (i) => {
    if (showing) return;
    input.current.push(i);
    // feedback visual del pad clickeado:
    setStep(-1); setTimeout(()=>setStep(0), 120);

    const idx = input.current.length - 1;
    if (seq[idx] !== i) {
         onMistake();
      alert("¡Ups! Fallaste la secuencia.");
      input.current = [];
      playSequence(seq);
      return;
    }
    if (input.current.length === seq.length) {
      onWin({ coins: canScore ? COINS_PER_LEVEL : 0, score: 12 });
      input.current = [];
      // nueva secuencia:
      const len = clamp(3 + Math.floor((level+1)/3), 3, 8);
      const s = Array.from({length: len}, () => rnd(0, pads.length-1));
      setSeq(s);
      playSequence(s);
    }
  };

  return (
    <div className="card">
      <h4 className="card-title">Secuencia</h4>
      <div className="pads">
        {pads.map((c, i) => (
          <button key={i} className={`pad ${step && (seq[step-1]===i) ? "blink" : ""}`}
                  style={{ background: c }} onClick={()=>onPad(i)} />
        ))}
      </div>
      <div className="small text-secondary mt-2">
        {showing ? "Memoriza la secuencia…" : "Repite la secuencia"}
      </div>
      {!canScore && <span className="badge text-bg-secondary mt-2">Práctica</span>}
    </div>
  );
}

// Reacción
function GameReaction({ canScore, level, onWin }) {
  const [state, setState] = useState("ready"); // ready | waiting | go
  const startTs = useRef(0);

  const start = () => {
    setState("waiting");
    const delay = rnd(800, 1800) - Math.min(level*10, 600); // algo más rápido con nivel
    setTimeout(() => { startTs.current = performance.now(); setState("go"); }, delay);
  };

  const click = () => {
    if (state === "ready") return start();
 if (state === "waiting") {  // clic antes de tiempo
      onMistake();              // ← resta 1 ❤️
      alert("¡Muy pronto! 😅");
      setState("ready"); 
      return;
    }    if (state === "go") {
      const rt = Math.round(performance.now() - startTs.current);
      const thresh = 350 - Math.min(level*5, 200); // umbral
      const ok = rt <= thresh;
      if (ok) onWin({ coins: canScore ? COINS_PER_LEVEL : 0, score: 6, label: `${rt}ms` });
      else alert(`Tarde (${rt}ms). Intenta < ${thresh}ms`);
      setState("ready");
    }
  };

  return (
    <div className={`card reaction ${state}`} onClick={click}>
      <h4 className="card-title">Reacción</h4>
      {state === "ready"   && <div className="reaction-box">Haz clic para iniciar</div>}
      {state === "waiting" && <div className="reaction-box">Espera…</div>}
      {state === "go"      && <div className="reaction-box go">¡YA!</div>}
      {!canScore && <span className="badge text-bg-secondary mt-2">Práctica</span>}
    </div>
  );
}

// Word Scramble
function shuffle(s) { return s.split("").sort(()=>Math.random()-0.5).join(""); }
function GameScramble({ canScore, onWin }) {
  const [word, setWord] = useState("");
  const [scr, setScr] = useState("");
  const [value, setValue] = useState("");

  const newWord = () => {
    const w = WORDS[rnd(0, WORDS.length-1)];
    let s = shuffle(w);
    if (s === w) s = shuffle(w); // intenta otro shuffle
    setWord(w); setScr(s); setValue("");
  };
  useEffect(() => { newWord(); }, []);

  const submit = (e) => {
    e.preventDefault();
    const ok = value.toLowerCase().trim() === word.toLowerCase();
    if (ok) onWin({ coins: canScore ? COINS_PER_LEVEL : 0, score: 10 });
    else {
      onMistake(); // ← resta 1 ❤️
      alert(`Incorrecto. Era "${word}"`);
    }
    newWord();
  };

  return (
    <div className="card">
      <h4 className="card-title">Word Scramble</h4>
      <div className="scramble">{scr}</div>
      <form onSubmit={submit} className="d-flex gap-2">
        <input className="form-control bg-transparent text-light border-secondary-subtle"
               placeholder="Palabra correcta" value={value} onChange={e=>setValue(e.target.value)} />
        <button className="btn btn-primary">OK</button>
      </form>
      {!canScore && <span className="badge text-bg-secondary mt-2">Práctica</span>}
    </div>
  );
}

// =================== Página principal ===================
export default function Games() {







// …dentro de export default function Games() { …después de otros useState
const [resetAlsoSubtract, setResetAlsoSubtract] = useState(false);

// Resetea un juego y (opcional) resta coins/puntos estimados
const resetGame = (gameId, alsoSubtract = false) => {
  const completed = (progress[gameId]?.completed ?? 0);
  if (completed <= 0) {
    // No hay nada que resetear
    setProgress(prev => ({ ...prev, [gameId]: { completed: 0 } }));
    return;
  }

  // Estimaciones
  const meta = GAMES.find(g => g.id === gameId);
  const estCoins  = completed * COINS_PER_LEVEL;
  const estPoints = completed * (meta?.pointsPerLevel ?? 0);

  // 1) Resetear progreso
  setProgress(prev => ({ ...prev, [gameId]: { completed: 0 } }));

  if (alsoSubtract) {
    // 2) Restar monedas (clamp 0)
    setCoins(c => Math.max(0, c - estCoins));

    // 3) Restar puntos y actualizar leaderboard con el nuevo total
    setTotalScore(s => {
      const newScore = Math.max(0, s - estPoints);
      setLeaderboard(prevLB => {
        const others = prevLB.filter(u => u.handle !== CURRENT_USER.handle);
        return [...others, { handle: CURRENT_USER.handle, score: newScore }];
      });
      return newScore;
    });
  }
};






  // Estado global desde el store compartido
  const raw = getGamesState();
  const baseProgress = GAMES.reduce((acc, g) => ({ ...acc, [g.id]: { completed: 0 } }), {});
  const [progress, setProgress] = useState({ ...baseProgress, ...(raw.progress || {}) });

  const [hearts, setHearts] = useState(raw.hearts ?? MAX_HEARTS);
  const [nextHeartAt, setNextHeartAt] = useState(raw.nextHeartAt ?? null);
  const [coins, setCoins] = useState(raw.coins ?? 0);
  const [totalScore, setTotalScore] = useState(raw.totalScore ?? 0);
  const [leaderboard, setLeaderboard] = useState(raw.leaderboard ?? [
    { handle: "maria", score: 320 },
    { handle: "juan", score: 220 },
    { handle: "carlos", score: 180 },
  ]);

  const [active, setActive] = useState(null); // id del juego activo (Runner) o null para cards

  // Persistir al store (y notificar a /ranking)
  useEffect(() => {
    setGamesState({ hearts, nextHeartAt, coins, totalScore, leaderboard, progress });
  }, [hearts, nextHeartAt, coins, totalScore, leaderboard, progress]);

  // Regen corazones (1/s)
  useEffect(() => {
    const t = setInterval(() => {
      if (hearts >= MAX_HEARTS || !nextHeartAt) return;
      const now = Date.now();
      if (now >= nextHeartAt) {
        setHearts((prev) => {
          const h = clamp(prev + 1, 0, MAX_HEARTS);
          // programa el siguiente corazón solo si aún no llenamos
          setNextHeartAt(h < MAX_HEARTS ? now + HEART_COOLDOWN_MS : null);
          return h;
        });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [hearts, nextHeartAt]);

  // Helpers
  const canScore = hearts > 0;
  const spendHeart = () => {
    if (hearts > 0) {
      setHearts((prev) => {
        const newH = prev - 1;
        if (newH < MAX_HEARTS && !nextHeartAt) setNextHeartAt(Date.now() + HEART_COOLDOWN_MS);
        return newH;
      });
    }
  };
  const addCoins = (n) => setCoins(c => c + n);
  const addPoints = (n) => {
    const next = totalScore + n;
    setTotalScore(next);
    setLeaderboard(prev => {
      const others = prev.filter(u => u.handle !== CURRENT_USER.handle);
      return [...others, { handle: CURRENT_USER.handle, score: next }];
    });
  };

  // Terminar un nivel (desde cada Runner)
  const onLevelWin = (gameId, payload = { coins: 0, score: 0 }) => {
    // Avanza progreso SIEMPRE; coins/puntos solo si hay corazones (vidas ilimitadas estilo práctica)
    setProgress(prev => {
      const cur = prev[gameId]?.completed ?? 0;
      const next = Math.min(LEVELS_MAX, cur + 1);
      return { ...prev, [gameId]: { completed: next } };
    });
    if (canScore) {
      spendHeart();
      if (payload.coins) addCoins(payload.coins);
      if (payload.score) addPoints(payload.score);
    }
  };

// Después (sin depender de canScore):
const onMistake = () => {
  if (hearts > 0) {
    spendHeart();
  }
};




  // UI: barra superior con monedas/puntos
  const Header = (
    <div className="games-top card">
      <div className="d-flex align-items-center gap-2">
        <BsLightningCharge /> <strong>Juegos</strong>
      </div>
      <div className="d-flex align-items-center gap-3">
        <div className="coins">🪙 {coins}</div>
        <div className="score">⭐ {totalScore} pts</div>
      </div>
    </div>
  );

  // Cards de selección
  if (!active) {
    return (
      <section className="content-stack">
        {Header}
        <HeartsBar
          hearts={hearts}
          nextAt={nextHeartAt}
          onRefill={()=>{
            if (hearts >= MAX_HEARTS) return;
            setHearts(h => clamp(h + 1, 0, MAX_HEARTS));
            setNextHeartAt(hearts + 1 < MAX_HEARTS ? Date.now() + HEART_COOLDOWN_MS : null);
          }}
        />

        <div className="games-grid">
          <div className="games-main">
            <div className="cards-grid">
              {GAMES.map(g => (
                <GameCard
                  key={g.id}
                  meta={g}
                  progress={progress[g.id] || { completed: 0 }}
                  onPlay={setActive}
                />
              ))}
            </div>
          </div>
         
        </div>
      </section>
    );
  }

  // Runner (contenido del juego activo)
  const meta = GAMES.find((x) => x.id === active) || GAMES[0]; // sin "!"
  if (!meta) return null;

  const completed = progress[active]?.completed ?? 0;
  const level = Math.min(LEVELS_MAX, completed + 1);

  const Runner = () => {
    const props = { canScore, level, onWin: (payload) => onLevelWin(active, payload),  onMistake };
    if (active === "riddles")  return <GameRiddles {...props} />;
    if (active === "who")      return <GameWho {...props} />;
    if (active === "mind")     return <GameMind {...props} />;
    if (active === "sequence") return <GameSequence {...props} />;
    if (active === "reaction") return <GameReaction {...props} />;
    if (active === "scramble") return <GameScramble {...props} />;
    return null;
  };

  const pct = Math.round((completed / LEVELS_MAX) * 100);
  const leftSec = Math.max(0, (LEVELS_MAX - completed) * meta.avgSec);

  return (
    <section className="content-stack">
      {Header}
      <HeartsBar
        hearts={hearts}
        nextAt={nextHeartAt}
        onRefill={()=>{
          if (hearts >= MAX_HEARTS) return;
          setHearts(h => clamp(h + 1, 0, MAX_HEARTS));
          setNextHeartAt(hearts + 1 < MAX_HEARTS ? Date.now() + HEART_COOLDOWN_MS : null);
        }}
      />

      <div className="card runner-head">
        <div className="d-flex align-items-center gap-2">
          <div className="game-icon">{meta.icon}</div>
          <div>
            <div className="game-title">{meta.title}</div>
            <div className="small text-secondary">{meta.desc}</div>
          </div>
        </div>
        <div className="runner-right">
          <div className="progress progress-striped" role="progressbar">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <div className="small text-secondary">Nivel {completed}/{LEVELS_MAX} — Tiempo restante: <b>{msToClock(leftSec*1000)}</b></div>
        </div>
      </div>

      <Runner />




      {/* Modal de confirmación de reseteo */}
<div
  className="modal fade"
  id={`resetModal-${active}`}
  tabIndex="-1"
  aria-labelledby={`resetLabel-${active}`}
  aria-hidden="true"
>
  <div className="modal-dialog">
    <div className="modal-content" style={{ background:"#0f141b", color:"var(--text)" }}>
      <div className="modal-header">
        <h5 className="modal-title" id={`resetLabel-${active}`}>Restablecer {meta.title}</h5>
        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
      </div>

      <div className="modal-body">
        <p className="mb-2">
          Esto pondrá el progreso de <strong>{meta.title}</strong> a <strong>nivel 0</strong>.
        </p>

        <div className="form-check">
          <input
            id={`subtract-${active}`}
            className="form-check-input"
            type="checkbox"
            checked={resetAlsoSubtract}
            onChange={(e)=>setResetAlsoSubtract(e.target.checked)}
          />
          <label className="form-check-label" htmlFor={`subtract-${active}`}>
            También restar <strong>coins</strong> y <strong>puntos</strong> estimados obtenidos en este juego.
          </label>
        </div>

        <small className="text-secondary d-block mt-2">
          Estimación a restar: <strong>{completed * COINS_PER_LEVEL}</strong> coins y{" "}
          <strong>{completed * (meta.pointsPerLevel || 0)}</strong> pts.
        </small>
        <small className="text-secondary d-block">
          Nota: si jugaste en <em>modo práctica</em> (sin corazones), puede que no se hayan otorgado coins/pts en esos niveles.
        </small>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" data-bs-dismiss="modal">Cancelar</button>
        <button
          type="button"
          className="btn btn-danger"
          data-bs-dismiss="modal"
          onClick={() => { resetGame(active, resetAlsoSubtract); setResetAlsoSubtract(false); }}
        >
          Sí, restablecer
        </button>
      </div>
    </div>
  </div>
</div>




<div className="card runner-head">
  <div className="d-flex align-items-center gap-2">
    <div className="game-icon">{meta.icon}</div>
    <div>
      <div className="game-title">{meta.title}</div>
      <div className="small text-secondary">{meta.desc}</div>
    </div>
  </div>
  <div className="runner-right">
    <div className="progress progress-striped" role="progressbar">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
    </div>
    <div className="small text-secondary">
      Nivel {completed}/{LEVELS_MAX} — Tiempo restante: <b>{msToClock(leftSec*1000)}</b>
    </div>

    {/* 🔽 Añade este botón aquí */}
    <div className="mt-2 d-flex justify-content-end">
      <button
        className="btn btn-outline-danger btn-sm"
        data-bs-toggle="modal"
        data-bs-target={`#resetModal-${active}`}
        type="button"
        title="Restablecer progreso de este juego"
      >
        Restablecer
      </button>
    </div>
  </div>
</div>







      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-ghost" onClick={()=>setActive(null)}>Volver a juegos</button>
      </div>
    </section>
  );
}
