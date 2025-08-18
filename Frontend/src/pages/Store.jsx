// src/pages/Store.jsx
import { useEffect, useMemo, useState } from "react";
import {
  BsCart, BsCoin, BsArrowLeftRight, BsShieldFill, BsBoxSeam, BsStars,
  BsGem, BsHeartFill, BsCreditCard, BsCheck2, BsXCircle, BsInbox, BsSend
} from "react-icons/bs";
import { getGamesState, addCoins, spendCoins, refillHearts, setGamesState } from "../pages/games/store.js";
import { Link } from "react-router-dom";

/* ===== Claves de storage ===== */
const INVENTORY_KEY = "store_inventory_v1";        // [{itemId, qty}]
const TRADES_KEY = "store_trades_v1";              // [{id, from, to, give:{itemId,qty}, want:{coins|itemId,qty}, status}]
const PURCHASES_KEY = "store_purchases_v1";        // recibos compra de coins
const PROFILE_KEYS = ["user_profile_v1", "profile_v1", "PROFILE_V1", "app_profile_v1"]; // para equipar avatar/marco

/* ===== Usuario actual (ajusta si usas auth) ===== */
const CURRENT_USER = { id: "u1", handle: "justo", name: "Justo" };

/* ===== Utilidades ===== */
const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const uid = (p = "id") => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* ===== Catálogo (puedes moverlo a JSON/API) ===== */
const CATALOG = [
  // Marcos (frames) — se pueden equipar al perfil
  { id: "frame_gold",   name: "Marco Dorado",      type: "frame",  price: 1200, rarity: "épico",   icon: "🟡" },
  { id: "frame_neon",   name: "Marco Neón",        type: "frame",  price: 900,  rarity: "raro",    icon: "🟣" },
  { id: "frame_rainbow",name: "Marco Arcoíris",    type: "frame",  price: 1500, rarity: "legend",  icon: "🌈" },

  // Avatares (data emoji para demo; en real sería imagen)
  { id: "avatar_fox",   name: "Avatar Zorro",      type: "avatar", price: 700,  rarity: "raro",    icon: "🦊" },
  { id: "avatar_panda", name: "Avatar Panda",      type: "avatar", price: 600,  rarity: "común",   icon: "🐼" },
  { id: "avatar_bot",   name: "Avatar Bot",        type: "avatar", price: 800,  rarity: "raro",    icon: "🤖" },

  // Boosters (afectan juegos)
  { id: "boost_hearts", name: "Recargar Corazones", type: "boost", price: 400,  rarity: "común",   icon: "❤️", effect: "refill_hearts" },
  { id: "boost_score",  name: "Doble Puntos (10m)", type: "boost", price: 1000, rarity: "épico",   icon: "⚡", effect: "double_score_10m" },

  // Cofres (aleatorio)
  { id: "loot_small",   name: "Cofre Pequeño",     type: "loot",   price: 500,  rarity: "común",   icon: "📦", gives: [{id:"avatar_panda", chance:0.5},{id:"avatar_fox", chance:0.2},{coins:300, chance:0.3}] },
];

/* ===== Paquetes de Coins (checkout simulado) ===== */
const COIN_PACKS = [
  { id: "p_small",  coins: 1000, priceUSD: 1.99 },
  { id: "p_med",    coins: 5500, priceUSD: 8.49 },
  { id: "p_big",    coins: 12000, priceUSD: 17.99 },
  { id: "p_mega",   coins: 26000, priceUSD: 34.99 },
];

function getProfile(handle) {
  for (const k of PROFILE_KEYS) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const p = JSON.parse(raw);
      if (p?.handle === handle || p?.username === handle) return p;
      if (p && p[handle]) return p[handle];
    } catch {}
  }
  return null;
}
function setProfile(handle, patch) {
  // Guardamos en la primera key disponible; si no existe, usamos user_profile_v1 con mapa {handle: {...}}
  for (const k of PROFILE_KEYS) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const p = JSON.parse(raw);
      if (p?.handle === handle || p?.username === handle) {
        const next = { ...p, ...patch };
        localStorage.setItem(k, JSON.stringify(next));
        window.dispatchEvent(new Event("storage"));
        return;
      }
      if (p && p[handle]) {
        const next = { ...p, [handle]: { ...p[handle], ...patch } };
        localStorage.setItem(k, JSON.stringify(next));
        window.dispatchEvent(new Event("storage"));
        return;
      }
    } catch {}
  }
  // fallback: mapa
  const k = "user_profile_v1";
  const base = readJSON(k, {});
  base[handle] = { ...(base[handle] || {}), ...patch };
  writeJSON(k, base);
  window.dispatchEvent(new Event("storage"));
}

/* ===== Inventario helpers ===== */
function getInventory(handle) {
  const all = readJSON(INVENTORY_KEY, {});
  return Array.isArray(all[handle]) ? all[handle] : [];
}
function setInventory(handle, items) {
  const all = readJSON(INVENTORY_KEY, {});
  all[handle] = items;
  writeJSON(INVENTORY_KEY, all);
}
function addToInventory(handle, itemId, qty = 1) {
  const inv = getInventory(handle);
  const idx = inv.findIndex((i) => i.itemId === itemId);
  if (idx >= 0) inv[idx].qty += qty;
  else inv.push({ itemId, qty });
  setInventory(handle, inv);
}
function removeFromInventory(handle, itemId, qty = 1) {
  const inv = getInventory(handle).map((i) => ({ ...i }));
  const idx = inv.findIndex((i) => i.itemId === itemId);
  if (idx < 0) return false;
  inv[idx].qty -= qty;
  if (inv[idx].qty <= 0) inv.splice(idx, 1);
  setInventory(handle, inv);
  return true;
}

function itemMeta(id) {
  return CATALOG.find((x) => x.id === id);
}

/* ===== Intercambios ===== */
function getTrades() {
  return readJSON(TRADES_KEY, []); // array de ofertas
}
function setTrades(list) {
  writeJSON(TRADES_KEY, list);
}
function myInbox(handle) {
  return getTrades().filter((t) => t.to === handle && t.status === "pending");
}
function myOutbox(handle) {
  return getTrades().filter((t) => t.from === handle && t.status === "pending");
}

/* ===== Componentes auxiliares ===== */
function Pill({ children }) {
  return <span className="badge text-bg-dark" style={{ marginRight: 6 }}>{children}</span>;
}
function Price({ coins }) {
  return <span className="badge text-bg-dark"><BsCoin className="me-1" /> {coins}</span>;
}

/* ========================= Página Store ========================= */
export default function Store() {
  const [tab, setTab] = useState("shop"); // shop | inventory | trade | buy
  const gs = getGamesState();
  const [coins, setCoins] = useState(gs.coins || 0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // sync con store global
  useEffect(() => {
    const onGames = () => setCoins(getGamesState().coins || 0);
    window.addEventListener("games:updated", onGames);
    return () => window.removeEventListener("games:updated", onGames);
  }, []);

  /* ------- Comprar en Tienda ------- */
  const buy = async (product) => {
    if (busy) return;
    if (product.type === "loot") {
      if (!spendCoins(product.price)) {
        return setToast("No tienes coins suficientes.");
      }
      setBusy(true);
      // “abrir cofre” animado
      setTimeout(() => {
        // resultado simple por probabilidad
        const r = Math.random();
        let acc = 0;
        const pick = product.gives.find((g) => {
          acc += g.chance;
          return r <= acc;
        }) || product.gives[product.gives.length - 1];

        if (pick.coins) {
          addCoins(pick.coins);
          setToast(`¡Te tocaron ${pick.coins} coins!`);
        } else if (pick.id) {
          addToInventory(CURRENT_USER.handle, pick.id, 1);
          setToast(`¡Ganaste ${itemMeta(pick.id)?.name || pick.id}!`);
        }
        setBusy(false);
      }, 900);
      return;
    }

    // Compra normal
    if (!spendCoins(product.price)) {
      return setToast("No tienes coins suficientes.");
    }
    setBusy(true);
    setTimeout(() => {
      if (product.type === "boost" && product.effect === "refill_hearts") {
        refillHearts(5);
      } else {
        addToInventory(CURRENT_USER.handle, product.id, 1);
      }
      setBusy(false);
      setToast(`Comprado: ${product.name}`);
    }, 500);
  };

  /* ------- Equipar desde Inventario ------- */
  const equip = (invItem) => {
    const meta = itemMeta(invItem.itemId);
    if (!meta) return;
    if (meta.type === "frame") {
      setProfile(CURRENT_USER.handle, { frame: meta.id.replace("frame_", "") });
      setToast(`Marco aplicado: ${meta.name}`);
      return;
    }
    if (meta.type === "avatar") {
      // Para demo guardamos emoji como photoUrl si no hay URL real
      const emojiAsData = null;
      const current = getProfile(CURRENT_USER.handle);
      const next = meta.icon && !meta.icon.startsWith("data:")
        ? { emoji: meta.icon, photoUrl: current?.photoUrl || null } // si tienes avatar real, no lo borres
        : { photoUrl: emojiAsData };
      setProfile(CURRENT_USER.handle, next);
      setToast(`Avatar aplicado: ${meta.name}`);
      return;
    }
    if (meta.type === "boost" && meta.effect === "refill_hearts") {
      refillHearts(5);
      setToast("Corazones recargados");
      return;
    }
    setToast("Este item no es equipable.");
  };

  /* ------- Intercambios ------- */
  const [tradeForm, setTradeForm] = useState({
    to: "",
    giveItemId: "",
    giveQty: 1,
    wantType: "coins", // coins | item
    wantCoins: 0,
    wantItemId: "",
    wantQty: 1,
  });

  const sendTrade = () => {
    const inv = getInventory(CURRENT_USER.handle);
    const have = inv.find((i) => i.itemId === tradeForm.giveItemId);
    if (!have || have.qty < tradeForm.giveQty) {
      return setToast("No tienes suficientes unidades del ítem a ofrecer.");
    }
    const offer = {
      id: uid("offer"),
      from: CURRENT_USER.handle,
      to: tradeForm.to.trim(),
      give: { itemId: tradeForm.giveItemId, qty: clamp(tradeForm.giveQty, 1, 99) },
      want:
        tradeForm.wantType === "coins"
          ? { coins: clamp(Number(tradeForm.wantCoins) || 0, 0, 999999) }
          : { itemId: tradeForm.wantItemId, qty: clamp(tradeForm.wantQty, 1, 99) },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const all = getTrades();
    all.unshift(offer);
    setTrades(all);
    setToast("Oferta enviada.");
    setTradeForm({
      to: "",
      giveItemId: "",
      giveQty: 1,
      wantType: "coins",
      wantCoins: 0,
      wantItemId: "",
      wantQty: 1,
    });
  };

  const inbox = myInbox(CURRENT_USER.handle);
  const outbox = myOutbox(CURRENT_USER.handle);

  const acceptTrade = (offerId) => {
    const all = getTrades();
    const ix = all.findIndex((t) => t.id === offerId && t.to === CURRENT_USER.handle && t.status === "pending");
    if (ix < 0) return;
    const t = all[ix];

    // Validar requisitos del receptor (yo): si piden coins, debo tenerlos; si piden item, debo tenerlo
    if (t.want.coins != null) {
      if ((getGamesState().coins || 0) < t.want.coins) {
        return setToast("No tienes coins suficientes para aceptar la oferta.");
      }
    } else if (t.want.itemId) {
      const myInv = getInventory(CURRENT_USER.handle);
      const need = myInv.find((i) => i.itemId === t.want.itemId);
      if (!need || need.qty < (t.want.qty || 1)) {
        return setToast("No tienes el ítem requerido para aceptar la oferta.");
      }
    }

    // Validar que el otro aún tenga lo que ofreció
    const otherInv = getInventory(t.from);
    const otherHas = otherInv.find((i) => i.itemId === t.give.itemId);
    if (!otherHas || otherHas.qty < t.give.qty) {
      return setToast("El oferente ya no tiene el ítem ofrecido.");
    }

    // Ejecutar intercambio
    // 1) Mover lo que ofrece el otro -> a mi inventario
    removeFromInventory(t.from, t.give.itemId, t.give.qty);
    addToInventory(CURRENT_USER.handle, t.give.itemId, t.give.qty);

    // 2) Entregar lo que yo doy (coins o ítem)
    if (t.want.coins != null) {
      // Yo pago coins al otro
      if (!spendCoins(t.want.coins)) {
        return setToast("Fallo al descontar coins.");
      }
      setGamesState((s) => ({ ...s, coins: (s.coins || 0) })); // fuerza evento
      // acreditamos al otro (registro simple: guardamos monedero del otro en un "wallet map")
      const wallets = readJSON("wallets_demo_v1", {});
      wallets[t.from] = (wallets[t.from] || 0) + t.want.coins;
      writeJSON("wallets_demo_v1", wallets);
    } else if (t.want.itemId) {
      removeFromInventory(CURRENT_USER.handle, t.want.itemId, t.want.qty || 1);
      addToInventory(t.from, t.want.itemId, t.want.qty || 1);
    }

    // 3) Cerrar oferta
    all[ix] = { ...t, status: "accepted", decidedAt: new Date().toISOString() };
    setTrades(all);
    setToast("Intercambio realizado ✔️");
  };

  const rejectTrade = (offerId) => {
    const all = getTrades();
    const ix = all.findIndex((t) => t.id === offerId && t.to === CURRENT_USER.handle && t.status === "pending");
    if (ix < 0) return;
    all[ix] = { ...all[ix], status: "rejected", decidedAt: new Date().toISOString() };
    setTrades(all);
    setToast("Oferta rechazada.");
  };

  /* ------- Comprar Coins (checkout simulado) ------- */
  const buyCoins = (pack) => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      addCoins(pack.coins);
      const rec = readJSON(PURCHASES_KEY, []);
      rec.unshift({
        id: uid("rcpt"),
        packId: pack.id,
        coins: pack.coins,
        amountUSD: pack.priceUSD,
        ts: new Date().toISOString(),
      });
      writeJSON(PURCHASES_KEY, rec);
      setBusy(false);
      setToast(`Compra exitosa: +${pack.coins} coins`);
    }, 800);
  };

  const inv = getInventory(CURRENT_USER.handle);
  const coinsFmt = useMemo(() => coins.toLocaleString(), [coins]);

  return (
    <section className="content-stack">
      <div className="card d-flex align-items-center justify-content-between" style={{ padding: 12 }}>
        <div className="d-flex align-items-center" style={{ gap: 12, color: 'white' }}>
          <BsCart />
          <strong>Tienda</strong>
        </div>
        <div className="d-flex align-items-center" style={{ gap: 10 }}>
          <Pill>🪙 {coinsFmt} coins</Pill>
          <button className={`btn btn-sm ${tab==="shop"?"btn-primary":"btn-ghost"}`} onClick={() => setTab("shop")}>Tienda</button>
          <button className={`btn btn-sm ${tab==="inventory"?"btn-primary":"btn-ghost"}`} onClick={() => setTab("inventory")}>Inventario</button>
          <button className={`btn btn-sm ${tab==="trade"?"btn-primary":"btn-ghost"}`} onClick={() => setTab("trade")}>
            <BsArrowLeftRight className="me-1" /> Intercambio
          </button>
          <button className={`btn btn-sm ${tab==="buy"?"btn-primary":"btn-ghost"}`} onClick={() => setTab("buy")}>
            <BsCreditCard className="me-1" /> Comprar Coins
          </button>
        </div>
      </div>

      {/* ===== Tab TIENDA ===== */}
      {tab === "shop" && (
        <div className="cards-grid" >
          {CATALOG.map((p) => (
            <div className="card tilt" key={p.id} style={{color:'white'}}>
              <div className="d-flex align-items-center" style={{ gap: 10 }}>
                <div className="store-icon">{p.icon}</div>
                <div>
                  <div className="fw-bold">{p.name}</div>
                  <div className="text-secondary small">
                    {p.type} · {p.rarity}
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <Price coins={p.price} />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => buy(p)}
                  disabled={busy}
                  title="Comprar"
                >
                  <BsCart className="me-1" /> {busy ? "Procesando…" : "Comprar"}
                </button>
              </div>
              {p.type === "boost" && p.effect === "refill_hearts" && (
                <div className="small mt-2"><BsHeartFill className="me-1" /> Recarga tus corazones a tope.</div>
              )}
              {p.type === "loot" && (
                <div className="small mt-2"><BsBoxSeam className="me-1" /> Contiene premios aleatorios.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== Tab INVENTARIO ===== */}
      {tab === "inventory" && (
        <div className="cards-grid">
          {inv.length === 0 && <div className="text-secondary">Tu inventario está vacío.</div>}
          {inv.map((it) => {
            const meta = itemMeta(it.itemId);
            if (!meta) return null;
            return (
              <div className="card" key={it.itemId}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center" style={{ gap: 10 }}>
                    <div className="store-icon">{meta.icon}</div>
                    <div>
                      <div className="fw-bold">{meta.name}</div>
                      <div className="text-secondary small">{meta.type} · {meta.rarity}</div>
                    </div>
                  </div>
                  <div><Pill>x{it.qty}</Pill></div>
                </div>
                <div className="d-flex justify-content-end mt-2" style={{ gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => equip(it)}>
                    Equipar
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (removeFromInventory(CURRENT_USER.handle, it.itemId, 1)) {
                        setToast("Item descartado (−1).");
                      }
                    }}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Tab INTERCAMBIO ===== */}
      {tab === "trade" && (
        <div className="grid-2">
          {/* Crear oferta */}
          <div className="card">
            <h5 className="card-title">Crear oferta</h5>
            <div className="mb-2">
              <label className="form-label">Enviar a (handle)</label>
              <input
                className="form-control bg-transparent text-light border-secondary-subtle"
                placeholder="ej: maria"
                value={tradeForm.to}
                onChange={(e) => setTradeForm({ ...tradeForm, to: e.target.value })}
              />
            </div>

            <div className="mb-2">
              <label className="form-label">Ofreces</label>
              <div className="d-flex" style={{ gap: 8 }}>
                <select
                  className="form-select bg-transparent text-light border-secondary-subtle"
                  value={tradeForm.giveItemId}
                  onChange={(e) => setTradeForm({ ...tradeForm, giveItemId: e.target.value })}
                >
                  <option value="">— Elige ítem de tu inventario —</option>
                  {inv.map((it) => {
                    const meta = itemMeta(it.itemId);
                    return (
                      <option key={it.itemId} value={it.itemId}>
                        {meta?.name || it.itemId} (x{it.qty})
                      </option>
                    );
                  })}
                </select>
                <input
                  type="number"
                  min={1}
                  className="form-control bg-transparent text-light border-secondary-subtle"
                  style={{ maxWidth: 120 }}
                  value={tradeForm.giveQty}
                  onChange={(e) => setTradeForm({ ...tradeForm, giveQty: clamp(Number(e.target.value) || 1, 1, 99) })}
                />
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label">Solicitas</label>
              <div className="d-flex align-items-center" style={{ gap: 8 }}>
                <select
                  className="form-select bg-transparent text-light border-secondary-subtle"
                  value={tradeForm.wantType}
                  onChange={(e) => setTradeForm({ ...tradeForm, wantType: e.target.value })}
                  style={{ maxWidth: 160 }}
                >
                  <option value="coins">Coins</option>
                  <option value="item">Ítem</option>
                </select>

                {tradeForm.wantType === "coins" ? (
                  <input
                    type="number"
                    min={0}
                    className="form-control bg-transparent text-light border-secondary-subtle"
                    placeholder="Cantidad de coins"
                    value={tradeForm.wantCoins}
                    onChange={(e) => setTradeForm({ ...tradeForm, wantCoins: clamp(Number(e.target.value) || 0, 0, 999999) })}
                  />
                ) : (
                  <>
                    <select
                      className="form-select bg-transparent text-light border-secondary-subtle"
                      value={tradeForm.wantItemId}
                      onChange={(e) => setTradeForm({ ...tradeForm, wantItemId: e.target.value })}
                    >
                      <option value="">— Elige ítem del otro —</option>
                      {CATALOG.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="form-control bg-transparent text-light border-secondary-subtle"
                      style={{ maxWidth: 120 }}
                      value={tradeForm.wantQty}
                      onChange={(e) => setTradeForm({ ...tradeForm, wantQty: clamp(Number(e.target.value) || 1, 1, 99) })}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="d-flex justify-content-end" style={{ gap: 8 }}>
              <button className="btn btn-primary" onClick={sendTrade}><BsSend className="me-1" /> Enviar oferta</button>
            </div>
          </div>

          {/* Bandejas */}
          <div className="card">
            <h5 className="card-title"><BsInbox className="me-1" /> Ofertas recibidas</h5>
            {inbox.length === 0 && <div className="text-secondary small">No tienes ofertas por ahora.</div>}
            <ul className="list-unstyled m-0" style={{ display: "grid", gap: 10 }}>
              {inbox.map((t) => {
                const giveMeta = itemMeta(t.give.itemId);
                const wantMeta = t.want.itemId ? itemMeta(t.want.itemId) : null;
                return (
                  <li key={t.id} className="p-2 rounded border border-secondary-subtle">
                    <div className="small">
                      <b>@{t.from}</b> te ofrece <b>{t.give.qty}× {giveMeta?.name || t.give.itemId}</b> a cambio de{" "}
                      {t.want.coins != null
                        ? <b>{t.want.coins} coins</b>
                        : <b>{t.want.qty}× {wantMeta?.name || t.want.itemId}</b>}
                    </div>
                    <div className="d-flex justify-content-end mt-2" style={{ gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => acceptTrade(t.id)}><BsCheck2 className="me-1" /> Aceptar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => rejectTrade(t.id)}><BsXCircle className="me-1" /> Rechazar</button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <h5 className="card-title mt-3">Enviadas</h5>
            {outbox.length === 0 && <div className="text-secondary small">No has enviado ofertas.</div>}
            <ul className="list-unstyled m-0" style={{ display: "grid", gap: 10 }}>
              {outbox.map((t) => {
                const giveMeta = itemMeta(t.give.itemId);
                const wantMeta = t.want.itemId ? itemMeta(t.want.itemId) : null;
                return (
                  <li key={t.id} className="p-2 rounded border border-secondary-subtle">
                    <div className="small">
                      A <b>@{t.to}</b>: ofreces <b>{t.give.qty}× {giveMeta?.name || t.give.itemId}</b> por{" "}
                      {t.want.coins != null
                        ? <b>{t.want.coins} coins</b>
                        : <b>{t.want.qty}× {wantMeta?.name || t.want.itemId}</b>}
                      {" "} — <i>{t.status}</i>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* ===== Tab COMPRAR COINS ===== */}
      {tab === "buy" && (
        <div className="cards-grid">
          {COIN_PACKS.map((pk) => (
            <div className="card tilt" key={pk.id}>
              <div className="d-flex align-items-center" style={{ gap: 10 }}>
                <div className="store-icon">🪙</div>
                <div>
                  <div className="fw-bold">{pk.coins.toLocaleString()} coins</div>
                  <div className="text-secondary small">USD ${pk.priceUSD.toFixed(2)}</div>
                </div>
              </div>
              <div className="d-flex justify-content-end mt-2">
                <button className="btn btn-primary btn-sm" onClick={() => buyCoins(pk)} disabled={busy}>
                  {busy ? "Procesando…" : "Comprar"}
                </button>
              </div>
            </div>
          ))}
          <div className="card">
            <div className="small text-secondary">
              * Pago de prueba simulado. Puedes integrar Stripe/PayPal más adelante.
            </div>
          </div>
        </div>
      )}

      {/* Toast simple */}
      {toast && (
        <div className="toast-like" onAnimationEnd={() => setToast(null)}>
          {toast}
        </div>
      )}
    </section>
  );
}
