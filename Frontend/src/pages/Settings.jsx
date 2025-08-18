import { useMemo, useState } from "react";
import { SpinnerOverlay, InlineSpinner } from "../components/Loaders.jsx";
import { BsDownload, BsPlus, BsTrash, BsShieldLock, BsKey, BsLifePreserver, BsPersonPlus, BsPersonX, BsPersonCheck, BsPeople, BsCheck2, BsX, BsExclamationTriangle } from "react-icons/bs";

const FEED_KEY = "feed_posts_v1";
const USERS_KEY = "profile_users_v1";
const SETTINGS_KEY = "app_settings_v1";
const LEGAL_KEY = "legal_accept_v1";
const FRIENDS_KEY = "friends_v1";
const ACCOUNT_KEY = "account_v1";        // { email, password }
const BACKUP_CODES_KEY = "backup_codes_v1";

const CURRENT_USER = { id: "u1", name: "Justo", handle: "justo" };

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const removeKey = (k) => { try { localStorage.removeItem(k); } catch {} };

const toSlug = (s="") => s.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");

function downloadJSON(filename, data){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function newBackupCodes(n=10){
  const codes = [];
  for(let i=0;i<n;i++){
    const code = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => (b % 36).toString(36)).join("").toUpperCase();
    codes.push(code);
  }
  return codes;
}

export default function Settings(){
  const tabs = [
    { id: "profile", label: "Editar perfil" },
    { id: "reports", label: "Reportes semanales" },
    { id: "friends", label: "Amigos" },
    { id: "security", label: "Seguridad" },
    { id: "behavior", label: "Comportamiento" },
    { id: "legal", label: "Términos" },
    { id: "account", label: "Cuenta" },
  ];
  const [active, setActive] = useState("profile");

  return (
    <section className="content-stack">
      <h2>Configuración</h2>

      <div className="card">
        <div className="settings-tabs">
          {tabs.map(t => (
            <button key={t.id}
              className={`tab-btn ${active===t.id?"active":""}`}
              onClick={()=>setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {active==="profile" && <ProfileSection />}
      {active==="reports" && <ReportsSection />}
      {active==="friends" && <FriendsSection />}
      {active==="security" && <SecuritySection />}
      {active==="behavior" && <BehaviorSection />}
      {active==="legal" && <LegalSection />}
      {active==="account" && <AccountSection />}
    </section>
  );
}

/* =================== EDITAR PERFIL =================== */
function ProfileSection(){
  const users = readJSON(USERS_KEY, {});
  const me0 = users[CURRENT_USER.handle] || {
    id: CURRENT_USER.id,
    name: CURRENT_USER.name,
    handle: CURRENT_USER.handle,
    bio: "",
    location: "",
    avatarImage: null,
    frame: null,
  };

  const [me, setMe] = useState(me0);
  const [saving, setSaving] = useState(false);

  const onPickAvatar = async (e) => {
    const f = e.target.files?.[0]; if(!f) return;
    const url = await new Promise((res,rej)=>{
      const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(f);
    });
    setMe(prev=>({...prev, avatarImage: url}));
    e.target.value = "";
  };
  const onPickFrame = async (e) => {
    const f = e.target.files?.[0]; if(!f) return;
    const url = await new Promise((res,rej)=>{
      const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(f);
    });
    setMe(prev=>({...prev, frame: url}));
    e.target.value = "";
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    const db = readJSON(USERS_KEY, {});
    const handle = toSlug(me.handle || CURRENT_USER.handle);
    const next = { ...db, [handle]: { ...me, handle } };
    writeJSON(USERS_KEY, next);
    await new Promise(r=>setTimeout(r,400));
    setSaving(false);
    alert("Perfil actualizado ✅");
  };

  return (
    <form className="card position-relative" style={{color: 'white'}} onSubmit={save}>
      <SpinnerOverlay visible={saving} label="Guardando perfil…" />
      <h4 className="card-title">Editar perfil</h4>

      <div className="grid-2" >
        <div>
          <label className="form-label">Nombre</label>
          <input className="form-control bg-transparent text-light border-secondary-subtle"
                 value={me.name} onChange={e=>setMe({...me, name:e.target.value})} />
        </div>
        <div>
          <label className="form-label">Usuario (@handle)</label>
          <input className="form-control bg-transparent text-light border-secondary-subtle"
                 value={me.handle} onChange={e=>setMe({...me, handle:e.target.value})} />
        </div>
      </div>

      <div className="grid-2">
        <div>
          <label className="form-label">Biografía</label>
          <textarea className="form-control bg-transparent text-light border-secondary-subtle" rows={3}
                    value={me.bio} onChange={e=>setMe({...me, bio:e.target.value})} />
        </div>
        <div>
          <label className="form-label">Ubicación</label>
          <input className="form-control bg-transparent text-light border-secondary-subtle"
                 value={me.location} onChange={e=>setMe({...me, location:e.target.value})} />
        </div>
      </div>

      <div className="grid-2">
        <div>
          <label className="form-label">Foto de perfil</label>
          <input type="file" accept="image/*" className="form-control bg-transparent text-light border-secondary-subtle" onChange={onPickAvatar}/>
          {me.avatarImage && <div className="mt-2"><img src={me.avatarImage} alt="avatar" style={{width:96, height:96, borderRadius:12, objectFit:"cover"}}/></div>}
        </div>
        <div>
          <label className="form-label">Marco</label>
          <input type="file" accept="image/*" className="form-control bg-transparent text-light border-secondary-subtle" onChange={onPickFrame}/>
          {me.frame && <div className="mt-2"><img src={me.frame} alt="frame" style={{width:96, height:96, borderRadius:12, objectFit:"cover"}}/></div>}
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-2">
        <button className="btn btn-primary" type="submit" disabled={saving}>Guardar cambios</button>
      </div>
    </form>
  );
}

/* =================== REPORTES SEMANALES =================== */
function ReportsSection(){
  const feed = readJSON(FEED_KEY, []);
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);

  const myPosts = feed.filter(p => p.authorName === CURRENT_USER.name && new Date(p.createdAt) >= weekAgo);
  const myComments = feed.flatMap(p => (p.comments||[]).filter(c => c.author === CURRENT_USER.name && new Date(c.createdAt) >= weekAgo));
  const likesGiven = feed.filter(p => p.userReaction === "like").length +
    feed.reduce((acc,p)=>acc+(p.comments||[]).filter(c=>c.userReaction==="like").length,0);
  const dislikesGiven = feed.filter(p => p.userReaction === "dislike").length +
    feed.reduce((acc,p)=>acc+(p.comments||[]).filter(c=>c.userReaction==="dislike").length,0);

  const report = {
    user: CURRENT_USER.name,
    range: { from: weekAgo.toISOString(), to: now.toISOString() },
    totals: {
      posts: myPosts.length,
      comments: myComments.length,
      likesGiven, dislikesGiven,
    },
    recentPosts: myPosts.map(p=>({id:p.id, text:(p.text||"").slice(0,80), date:p.createdAt, inGroup:p.groupName||null})),
  };

  return (
    <div className="card" style={{color: 'white'}}>
      <h4 className="card-title">Reporte semanal</h4>
      <div className="grid-2">
        <div className="kpibox">
          <div className="kpi">📝 {report.totals.posts}</div>
          <div className="kpi-label">Publicaciones</div>
        </div>
        <div className="kpibox">
          <div className="kpi">💬 {report.totals.comments}</div>
          <div className="kpi-label">Comentarios</div>
        </div>
        <div className="kpibox">
          <div className="kpi">👍 {report.totals.likesGiven}</div>
          <div className="kpi-label">Likes dados</div>
        </div>
        <div className="kpibox">
          <div className="kpi">👎 {report.totals.dislikesGiven}</div>
          <div className="kpi-label">Dislikes dados</div>
        </div>
      </div>

      <div className="mt-3">
        <h6 className="mb-2">Tus publicaciones de la semana</h6>
        {report.recentPosts.length===0 ? (
          <div className="muted">No hay publicaciones recientes.</div>
        ) : (
          <ul className="list-unstyled">
            {report.recentPosts.map(p=>(
              <li key={p.id} className="small mb-1">• <strong>{new Date(p.date).toLocaleString()}</strong> — {p.text}{p.inGroup?` (en ${p.inGroup})`:""}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="d-flex justify-content-end mt-2">
        <button className="btn btn-ghost" onClick={()=>downloadJSON(`reporte_${new Date().toISOString().slice(0,10)}.json`, report)}>
          <BsDownload className="me-1" /> Exportar JSON
        </button>
      </div>
    </div>
  );
}

/* =================== AMIGOS =================== */
function FriendsSection(){
  const def = { friends: ["maria","juan"], requests: ["carlos"], blocked: [] };
  const [db, setDb] = useState(readJSON(FRIENDS_KEY, def));
  const [input, setInput] = useState("");

  const save = (next) => { setDb(next); writeJSON(FRIENDS_KEY, next); };

  const accept = (h) => {
    const next = {
      ...db,
      requests: db.requests.filter(x=>x!==h),
      friends: Array.from(new Set([...db.friends, h]))
    }; save(next);
  };
  const reject = (h) => save({...db, requests: db.requests.filter(x=>x!==h)});
  const remove = (h) => save({...db, friends: db.friends.filter(x=>x!==h)});
  const block = (h) => save({
    ...db,
    blocked: Array.from(new Set([...db.blocked, h])),
    friends: db.friends.filter(x=>x!==h),
    requests: db.requests.filter(x=>x!==h),
  });
  const unblock = (h) => save({...db, blocked: db.blocked.filter(x=>x!==h)});

  const sendRequest = () => {
    const h = toSlug(input).replace(/^@/,"");
    if(!h) return; setInput("");
    // Para demo: cae directo a "requests" como si te hubieran pedido
    if(db.requests.includes(h) || db.friends.includes(h)) return;
    save({...db, requests: [...db.requests, h]});
  };

  return (
    <div className="card" style={{color: 'white'}}>
      <h4 className="card-title"><BsPeople className="me-2"/>Gestionar amigos</h4>

      <div className="d-flex gap-2 mb-3">
        <input className="form-control bg-transparent text-light border-secondary-subtle" placeholder="@usuario"
               value={input} onChange={e=>setInput(e.target.value)} />
        <button className="btn btn-primary" onClick={sendRequest}><BsPersonPlus className="me-1" /> Solicitar</button>
      </div>

      <div className="grid-3">
        <div>
          <h6>Amigos</h6>
          {db.friends.length===0 ? <div className="muted">Sin amigos</div> : (
            <ul className="list-unstyled">
              {db.friends.map(h=>(
                <li key={h} className="d-flex justify-content-between align-items-center py-1">
                  <span>@{h}</span>
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-secondary" onClick={()=>remove(h)}><BsPersonX/></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={()=>block(h)} title="Bloquear">🚫</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h6>Solicitudes</h6>
          {db.requests.length===0 ? <div className="muted">Sin solicitudes</div> : (
            <ul className="list-unstyled">
              {db.requests.map(h=>(
                <li key={h} className="d-flex justify-content-between align-items-center py-1">
                  <span>@{h}</span>
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-success" onClick={()=>accept(h)}><BsCheck2/></button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={()=>reject(h)}><BsX/></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={()=>block(h)} title="Bloquear">🚫</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h6>Bloqueados</h6>
          {db.blocked.length===0 ? <div className="muted">Nadie bloqueado</div> : (
            <ul className="list-unstyled">
              {db.blocked.map(h=>(
                <li key={h} className="d-flex justify-content-between align-items-center py-1">
                  <span>@{h}</span>
                  <button className="btn btn-sm btn-outline-warning" onClick={()=>unblock(h)}>Desbloquear</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================== SEGURIDAD (Cambiar/Restablecer/Recuperación) =================== */
function SecuritySection(){
  const defAcc = { email: "justo@example.com", password: "12345678" };
  const [acc, setAcc] = useState(readJSON(ACCOUNT_KEY, defAcc));
  const [saving, setSaving] = useState(false);

  // Cambiar contraseña
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");

  const changePassword = async (e) => {
    e.preventDefault();
    if(oldPwd !== acc.password) return alert("La contraseña actual no coincide.");
    if(newPwd.length < 6) return alert("La nueva contraseña debe tener al menos 6 caracteres.");
    if(newPwd !== newPwd2) return alert("La confirmación no coincide.");

    setSaving(true);
    const next = { ...acc, password: newPwd };
    writeJSON(ACCOUNT_KEY, next);
    await new Promise(r=>setTimeout(r,400));
    setSaving(false);
    setAcc(next);
    setOldPwd(""); setNewPwd(""); setNewPwd2("");
    alert("Contraseña actualizada ✅");
  };

  // Recuperación: email y códigos
  const [recoveryEmail, setRecoveryEmail] = useState(readJSON(ACCOUNT_KEY, defAcc).recoveryEmail || "");
  const [codes, setCodes] = useState(readJSON(BACKUP_CODES_KEY, []));
  const regenCodes = () => {
    const cs = newBackupCodes(10);
    writeJSON(BACKUP_CODES_KEY, cs);
    setCodes(cs);
  };
  const saveRecoveryEmail = () => {
    const next = { ...acc, recoveryEmail: recoveryEmail.trim() };
    writeJSON(ACCOUNT_KEY, next);
    setAcc(next);
    alert("Email de recuperación guardado ✅");
  };

  // Restablecer contraseña (simulado con código)
  const [resetCode, setResetCode] = useState("");
  const genCode = () => {
    const c = Math.random().toString(36).slice(2,8).toUpperCase();
    const next = { ...acc, resetCode: c };
    writeJSON(ACCOUNT_KEY, next); setAcc(next);
    alert(`Código de restablecimiento: ${c}\n(En producción se enviaría por email/SMS)`);
  };
  const useCode = () => {
    if(!resetCode || resetCode !== acc.resetCode) return alert("Código inválido.");
    const newPass = prompt("Nueva contraseña (≥6 caracteres):") || "";
    if(newPass.length < 6) return alert("Muy corta.");
    const next = { ...acc, password: newPass, resetCode: null };
    writeJSON(ACCOUNT_KEY, next); setAcc(next); setResetCode("");
    alert("Contraseña restablecida ✅");
  };

  return (
    <div className="card position-relative" style={{color: 'white'}}>
      <SpinnerOverlay visible={saving} label="Actualizando seguridad…" />
      <h4 className="card-title"><BsShieldLock className="me-2" />Seguridad</h4>

      {/* Cambiar contraseña */}
      <form onSubmit={changePassword} className="mb-4">
        <h6><BsKey className="me-2" />Cambiar contraseña</h6>
        <div className="grid-3">
          <input type="password" className="form-control bg-transparent text-light border-secondary-subtle" placeholder="Actual"
                 value={oldPwd} onChange={e=>setOldPwd(e.target.value)} disabled={saving} />
          <input type="password" className="form-control bg-transparent text-light border-secondary-subtle" placeholder="Nueva"
                 value={newPwd} onChange={e=>setNewPwd(e.target.value)} disabled={saving} />
          <input type="password" className="form-control bg-transparent text-light border-secondary-subtle" placeholder="Confirmar"
                 value={newPwd2} onChange={e=>setNewPwd2(e.target.value)} disabled={saving} />
        </div>
        <div className="mt-2">
          <button className="btn btn-primary" disabled={saving}>Actualizar</button>
        </div>
      </form>

      {/* Recuperación */}
      <div className="mb-4">
        <h6><BsLifePreserver className="me-2" />Recuperación</h6>
        <div className="d-flex gap-2">
          <input type="email" className="form-control bg-transparent text-light border-secondary-subtle" placeholder="Email de recuperación"
                 value={recoveryEmail} onChange={e=>setRecoveryEmail(e.target.value)} />
          <button className="btn btn-ghost" onClick={saveRecoveryEmail}>Guardar</button>
        </div>
        <div className="mt-2 d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={regenCodes}>Generar códigos de respaldo</button>
          {codes.length>0 && (
            <button className="btn btn-ghost" onClick={()=>downloadJSON("backup_codes.json", { codes })}>
              Descargar códigos
            </button>
          )}
        </div>
        {codes.length>0 && (
          <div className="codes-wrap mt-2">
            {codes.map(c=><code key={c} className="code-chip">{c}</code>)}
          </div>
        )}
      </div>

      {/* Restablecer (con código simulado) */}
      <div>
        <h6>Restablecer contraseña (con código)</h6>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={genCode}>Generar código</button>
          <input className="form-control bg-transparent text-light border-secondary-subtle" placeholder="Ingresa el código"
                 value={resetCode} onChange={e=>setResetCode(e.target.value)} />
          <button className="btn btn-primary" onClick={useCode}>Usar código</button>
        </div>
      </div>
    </div>
  );
}

/* =================== COMPORTAMIENTO / PREFERENCIAS =================== */
function BehaviorSection(){
  const def = {
    showGroupPostsInHome: true,
    compactMode: false,
    nsfw: false,
    language: "es",
    notifications: { likes: true, comments: true, invites: true },
  };
  const [cfg, setCfg] = useState(readJSON(SETTINGS_KEY, def));

  const update = (next) => { setCfg(next); writeJSON(SETTINGS_KEY, next); };

  return (
    <div className="card" style={{color: 'white'}}>
      <h4 className="card-title">Comportamiento y preferencias</h4>

      <div className="grid-2">
        <div className="pref-item">
          <label className="form-check">
            <input type="checkbox" className="form-check-input" checked={cfg.showGroupPostsInHome}
                   onChange={e=>update({...cfg, showGroupPostsInHome: e.target.checked})}/>
            <span className="form-check-label">Mostrar publicaciones de grupos en Inicio</span>
          </label>
        </div>

        <div className="pref-item">
          <label className="form-check">
            <input type="checkbox" className="form-check-input" checked={cfg.compactMode}
                   onChange={e=>update({...cfg, compactMode: e.target.checked})}/>
            <span className="form-check-label">Modo compacto</span>
          </label>
        </div>

        <div className="pref-item">
          <label className="form-check">
            <input type="checkbox" className="form-check-input" checked={cfg.nsfw}
                   onChange={e=>update({...cfg, nsfw: e.target.checked})}/>
            <span className="form-check-label">Permitir contenido sensible (NSFW)</span>
          </label>
        </div>

        <div className="pref-item">
          <label className="form-label">Idioma</label>
          <select className="form-select bg-transparent text-light border-secondary-subtle"
                  value={cfg.language} onChange={e=>update({...cfg, language: e.target.value})}>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="pt">Portugués</option>
          </select>
        </div>

        <div className="pref-item">
          <label className="form-label">Notificaciones</label>
          <div className="d-grid gap-1">
            <label className="form-check">
              <input type="checkbox" className="form-check-input" checked={cfg.notifications.likes}
                     onChange={e=>update({...cfg, notifications:{...cfg.notifications, likes:e.target.checked}})} />
              <span className="form-check-label">Me gusta</span>
            </label>
            <label className="form-check">
              <input type="checkbox" className="form-check-input" checked={cfg.notifications.comments}
                     onChange={e=>update({...cfg, notifications:{...cfg.notifications, comments:e.target.checked}})} />
              <span className="form-check-label">Comentarios</span>
            </label>
            <label className="form-check">
              <input type="checkbox" className="form-check-input" checked={cfg.notifications.invites}
                     onChange={e=>update({...cfg, notifications:{...cfg.notifications, invites:e.target.checked}})} />
              <span className="form-check-label">Invitaciones</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================== TÉRMINOS Y CONDICIONES =================== */
function LegalSection(){
  const def = { accepted: false, acceptedAt: null, version: "1.0" };
  const [legal, setLegal] = useState(readJSON(LEGAL_KEY, def));

  const accept = () => {
    const next = { accepted: true, acceptedAt: new Date().toISOString(), version: legal.version };
    writeJSON(LEGAL_KEY, next); setLegal(next);
  };
  const revoke = () => {
    const next = { accepted: false, acceptedAt: null, version: legal.version };
    writeJSON(LEGAL_KEY, next); setLegal(next);
  };

  return (
    <div className="card" style={{color: 'white'}}>
      <h4 className="card-title">Términos y Condiciones</h4>
      <div className="terms-box">
        <p><strong>1. Uso de la plataforma.</strong> Esta app es un demo local con datos en tu navegador (localStorage).</p>
        <p><strong>2. Contenido.</strong> Eres responsable de lo que publicas. Evita contenido ilegal o dañino.</p>
        <p><strong>3. Privacidad.</strong> No hay servidores; los datos se guardan en tu dispositivo.</p>
        <p><strong>4. Seguridad.</strong> No uses contraseñas reales. Este demo no cifra información.</p>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-2">
        <div className="small text-secondary">
          {legal.accepted ? `Aceptado el ${new Date(legal.acceptedAt).toLocaleString()}` : "No aceptado"}
        </div>
        {legal.accepted ? (
          <button className="btn btn-outline-secondary" onClick={revoke}>Revocar aceptación</button>
        ) : (
          <button className="btn btn-primary" onClick={accept}>Aceptar</button>
        )}
      </div>
    </div>
  );
}

/* =================== CUENTA (Eliminar / Reset app) =================== */
function AccountSection(){
  const [confirmText, setConfirmText] = useState("");
  const acc = readJSON(ACCOUNT_KEY, { email:"justo@example.com", password:"12345678" });
  const [pwd, setPwd] = useState("");

  const deleteAll = () => {
    const keys = [FEED_KEY, USERS_KEY, SETTINGS_KEY, LEGAL_KEY, FRIENDS_KEY, ACCOUNT_KEY, BACKUP_CODES_KEY, "groups_v1", "notifications_v1"];
    keys.forEach(removeKey);
  };

  const deleteAccount = () => {
    if(confirmText.trim().toUpperCase() !== "ELIMINAR") return alert('Escribe "ELIMINAR" para confirmar.');
    if(pwd !== acc.password) return alert("Contraseña incorrecta.");
    deleteAll();
    alert("Cuenta eliminada y datos locales borrados.");
    window.location.href = "/home";
  };

  const resetApp = () => {
    if(!window.confirm("Esto borrará configuración y cache (no publicaciones). ¿Continuar?")) return;
    [SETTINGS_KEY, LEGAL_KEY, BACKUP_CODES_KEY].forEach(removeKey);
    alert("La app se ha restablecido.");
    window.location.reload();
  };

  return (
    <div className="card" style={{color: 'white'}}>
      <h4 className="card-title">Cuenta</h4>

      <div className="alert alert-warning d-flex gap-2 align-items-center" role="alert">
        <BsExclamationTriangle /> Ten en cuenta que esto es un demo local: no uses datos reales.
      </div>

      <div className="mb-3">
        <h6>Eliminar cuenta</h6>
        <p className="small text-secondary">Escribe <code>ELIMINAR</code> y tu contraseña para borrar todos tus datos locales.</p>
        <div className="d-flex gap-2">
          <input className="form-control bg-transparent text-light border-secondary-subtle" placeholder='Escribe "ELIMINAR"'
                 value={confirmText} onChange={e=>setConfirmText(e.target.value)} />
          <input type="password" className="form-control bg-transparent text-light border-secondary-subtle" placeholder="Contraseña"
                 value={pwd} onChange={e=>setPwd(e.target.value)} />
          <button className="btn btn-outline-danger" onClick={deleteAccount}><BsTrash className="me-1"/>Eliminar</button>
        </div>
      </div>

      <div>
        <h6>Restablecer aplicación</h6>
        <p className="small text-secondary">Reinicia preferencias, términos y códigos (no elimina publicaciones ni amigos).</p>
        <button className="btn btn-ghost" onClick={resetApp}>Restablecer</button>
      </div>
    </div>
  );
}
