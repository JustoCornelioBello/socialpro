// src/games/store.js
import { useEffect, useState } from "react";

export const STORAGE_KEY = "games_state_v2";

// Lectura segura
const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Estado por defecto (Juegos ya lo completará con progress por juego)
const defaultState = {
  hearts: 5,
  nextHeartAt: null,
  coins: 0,
  totalScore: 0,
  leaderboard: [
    { handle: "maria",  score: 320 },
    { handle: "juan",   score: 220 },
    { handle: "carlos", score: 180 },
  ],
  progress: {},        // { [gameId]: { completed: number } }
};

// ---- Lectura principal
export function getGamesState() {
  const s = readJSON(STORAGE_KEY, defaultState);
  // merge suave por si faltan claves nuevas
  return { ...defaultState, ...s };
}

// ---- Escritura principal (devuelve el estado siguiente)
export function setGamesState(next) {
  const val = typeof next === "function" ? next(getGamesState()) : next;
  writeJSON(STORAGE_KEY, val);
  // Notifica a otras rutas/componentes (misma pestaña)
  try { window.dispatchEvent(new CustomEvent("games:updated", { detail: val })); } catch {}
  return val;
}

// ---- Update con función o parche parcial (devuelve el estado siguiente)
export function updateGamesState(updater) {
  const cur = getGamesState();
  const next = typeof updater === "function" ? updater(cur) : { ...cur, ...updater };
  return setGamesState(next);
}

// ---- Hook reactivo a cambios (en esta pestaña y otras)
export function useGamesState() {
  const [state, setState] = useState(getGamesState());

  useEffect(() => {
    const onStorage = (e) => { if (!e || e.key === STORAGE_KEY) setState(getGamesState()); };
    const onCustom  = () => setState(getGamesState());
    window.addEventListener("storage", onStorage);   // otras pestañas
    window.addEventListener("games:updated", onCustom); // misma pestaña
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("games:updated", onCustom);
    };
  }, []);

  return state; // solo lectura; para escribir usa helpers de abajo
}

/* ======================================================================
   Helpers de monedero / corazones / score (los que necesitas en Store.jsx)
   ====================================================================== */

// +Coins (devuelve estado)
export function addCoins(n) {
  const amt = Number(n);
  if (!Number.isFinite(amt) || amt <= 0) return getGamesState();
  return updateGamesState(s => ({ ...s, coins: (s.coins || 0) + Math.floor(amt) }));
}

// -Coins (devuelve true/false según se pudo descontar)
export function spendCoins(n) {
  const amt = Number(n);
  if (!Number.isFinite(amt) || amt <= 0) return false;
  let ok = false;
  setGamesState(s => {
    const cur = s.coins || 0;
    if (cur >= amt) { ok = true; return { ...s, coins: cur - Math.floor(amt) }; }
    return s;
  });
  return ok;
}

// Corazones: rellenar a tope (por ejemplo 5)
export function refillHearts(max = 5) {
  const m = Number.isFinite(max) && max > 0 ? Math.floor(max) : 5;
  return updateGamesState(s => ({ ...s, hearts: m, nextHeartAt: null }));
}

// Añadir puntos de score total
export function addScore(n) {
  const amt = Number(n);
  if (!Number.isFinite(amt) || amt <= 0) return getGamesState();
  return updateGamesState(s => ({ ...s, totalScore: (s.totalScore || 0) + Math.floor(amt) }));
}

// (Opcional) Gastar corazones manualmente (por fallos en juegos, etc.)
export function spendHeart(count = 1) {
  const c = Number(count);
  if (!Number.isFinite(c) || c <= 0) return getGamesState();
  return updateGamesState(s => ({ ...s, hearts: Math.max(0, (s.hearts || 0) - Math.floor(c)) }));
}
