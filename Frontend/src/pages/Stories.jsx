import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BsPlus, BsTrash, BsPencil, BsShare, BsDownload, BsXLg, BsEye,
  BsTypeBold, BsTypeItalic, BsTypeUnderline, BsListUl, BsListOl, BsQuote,
  BsTypeH1, BsTypeH2, BsTypeH3, BsFonts, BsTag, BsCloudCheck, BsCloudSlash,
  BsSearch, BsImage, BsGraphUpArrow
} from "react-icons/bs";
import { exportStoryAsJSON, exportStoryAsDoc, exportStoryAsPDF } from "../utils/downloads.js";

const STORAGE_KEY = "stories_v1";
const TRASH_KEY   = "stories_trash_v1";
const HISTORY_KEY = "stories_read_history_v1"; // por usuario (agregamos handle)
const FEED_KEY    = "feed_posts_v1";
const CURRENT_USER = { id: "u1", handle: "justo", name: "Justo" };

const CATEGORIES = [
  "Ficción","Aventura","Acción","Romance","Misterio",
  "Ciencia Ficción","Fantasía","Terror","Drama","Poesía","Ensayo"
];
const FONTS = [
  { id:"Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial", name:"Inter / System" },
  { id:"'Merriweather', Georgia, serif", name:"Merriweather (serif)" },
  { id:"Georgia, 'Times New Roman', serif", name:"Georgia (serif)" },
  { id:"'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, monospace", name:"Roboto Mono (mono)" },
];

const readJSON  = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const uid = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;

// helpers imagen → dataURL
const fileToDataURL = (file) => new Promise((res, rej) => {
  const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file);
});

function Toolbar({ onCmd, font, setFont, fontSize, setFontSize }) {
  return (
    <div className="story-toolbar">
      <div className="left">
        <button className="tb-btn" onClick={()=>onCmd("bold")} title="Negrita"><BsTypeBold/></button>
        <button className="tb-btn" onClick={()=>onCmd("italic")} title="Itálica"><BsTypeItalic/></button>
        <button className="tb-btn" onClick={()=>onCmd("underline")} title="Subrayado"><BsTypeUnderline/></button>
        <span className="tb-sep"/>
        <button className="tb-btn" onClick={()=>onCmd("insertUnorderedList")} title="Lista con viñetas"><BsListUl/></button>
        <button className="tb-btn" onClick={()=>onCmd("insertOrderedList")} title="Lista numerada"><BsListOl/></button>
        <button className="tb-btn" onClick={()=>onCmd("formatBlock","blockquote")} title="Cita"><BsQuote/></button>
        <span className="tb-sep"/>
        <button className="tb-btn" onClick={()=>onCmd("formatBlock","h1")} title="Título H1"><BsTypeH1/></button>
        <button className="tb-btn" onClick={()=>onCmd("formatBlock","h2")} title="Título H2"><BsTypeH2/></button>
        <button className="tb-btn" onClick={()=>onCmd("formatBlock","h3")} title="Título H3"><BsTypeH3/></button>
      </div>
      <div className="right">
        <div className="tb-field">
          <BsFonts/>
          <select value={font} onChange={e=>setFont(e.target.value)} className="form-select form-select-sm bg-transparent text-light border-secondary-subtle">
            {FONTS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="tb-field" style={{width:90}}>
          <span>Size</span>
          <input type="number" min={12} max={28} value={fontSize} onChange={e=>setFontSize(Number(e.target.value)||16)}
                 className="form-control form-control-sm bg-transparent text-light border-secondary-subtle"/>
        </div>
      </div>
    </div>
  );
}

function Editor({ draft, setDraft, onSave, onCancel, onPickCover, onRemoveCover }) {
  const ref = useRef(null);

  const exec = (cmd, val=null) => {
    if (cmd==="formatBlock") document.execCommand(cmd, false, val);
    else document.execCommand(cmd, false, null);
  };

  useEffect(() => { setTimeout(()=>{ ref.current?.focus(); }, 100); }, []);

  return (
    <div className="card story-editor">
      <div className="d-flex align-items-center justify-content-between">
        <input
          className="form-control bg-transparent text-light border-secondary-subtle story-title-input"
          placeholder="Título de tu historia…"
          value={draft.title}
          onChange={(e)=>setDraft({...draft, title: e.target.value})}
        />
        <div className="d-flex" style={{gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}><BsXLg className="me-1"/>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={onSave}><BsCloudCheck className="me-1"/>Guardar</button>
        </div>
      </div>

      <div className="d-flex align-items-center flex-wrap" style={{gap:10, marginTop:8}}>
        <div className="d-flex align-items-center" style={{gap:8}}>
          <BsTag/>
          <select
            className="form-select form-select-sm bg-transparent text-light border-secondary-subtle"
            value={draft.category}
            onChange={(e)=>setDraft({...draft, category: e.target.value})}
          >
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Portada */}
        <div className="d-flex align-items-center" style={{gap:8}}>
          <BsImage/>
          <label className="btn btn-ghost btn-sm mb-0">
            Seleccionar portada
            <input type="file" accept="image/*" hidden onChange={onPickCover} />
          </label>
          {draft.cover && (
            <button className="btn btn-ghost btn-sm text-danger" onClick={onRemoveCover} title="Quitar portada">
              Quitar
            </button>
          )}
        </div>

        <div className="badge text-bg-dark">{draft.published ? "Publicado" : "Borrador"}</div>
      </div>

      {draft.cover && (
        <div className="story-cover-preview mt-2">
          <img src={draft.cover} alt="Portada" />
        </div>
      )}

      <Toolbar
        onCmd={exec}
        font={draft.font}
        setFont={(v)=>setDraft({...draft, font:v})}
        fontSize={draft.fontSize}
        setFontSize={(v)=>setDraft({...draft, fontSize:v})}
      />

      <div
        ref={ref}
        className="story-content"
        style={{ fontFamily: draft.font, fontSize: draft.fontSize, color: '#fff' }}
        contentEditable
        suppressContentEditableWarning
        onInput={(e)=>setDraft({...draft, contentHTML: e.currentTarget.innerHTML})}
        dangerouslySetInnerHTML={{ __html: draft.contentHTML || "<p><br/></p>" }}
      />
    </div>
  );
}

export default function Stories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState(()=>readJSON(STORAGE_KEY, []));
  const [editing, setEditing] = useState(null); // id o 'new' o null
  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [toast, setToast] = useState(null);

  // ------------ Autolimpieza de papelera (>30 días)
  useEffect(() => {
    const trash = readJSON(TRASH_KEY, []);
    const now = Date.now();
    const keep = trash.filter(t => (now - new Date(t.deletedAt).getTime()) < 30*24*60*60*1000);
    if (keep.length !== trash.length) writeJSON(TRASH_KEY, keep);
  }, []);

  // crear nuevo
  const newDraft = () => ({
    id: uid(),
    title: "",
    category: CATEGORIES[0],
    font: FONTS[0].id,
    fontSize: 16,
    contentHTML: "",
    cover: null, // dataURL
    authorId: CURRENT_USER.id,
    authorName: CURRENT_USER.name,
    published: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shareSlug: null,
    // stats
    stats: { views: 0, shares: 0, downloads: { pdf: 0, doc: 0, json: 0 }, lastReadAt: null }
  });

  // abrir editor
  const openEditor = (idOrNew="new") => {
    if (idOrNew === "new") {
      setDraft(newDraft());
      setEditing("new");
    } else {
      const s = stories.find(x=>x.id===idOrNew);
      if (!s) return;
      setDraft({ ...s });
      setEditing(s.id);
    }
    window.scrollTo({top:0, behavior:"smooth"});
  };

  const onPickCover = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const data = await fileToDataURL(f);
    setDraft(prev => ({ ...prev, cover: data }));
    e.target.value = "";
  };
  const onRemoveCover = () => setDraft(prev => ({ ...prev, cover: null }));

  const saveDraft = () => {
    setStories(prev => {
      const exists = editing !== "new";
      const now = new Date().toISOString();
      const s = { ...draft, updatedAt: now };
      if (exists) {
        const ix = prev.findIndex(x=>x.id===editing);
        const next = [...prev]; next[ix] = s;
        return next;
      } else {
        return [s, ...prev];
      }
    });
    setToast("Historia guardada.");
    setEditing(null);
    setDraft(null);
  };

  // publicar: marca published y crea un post en el feed
  const publish = (id) => {
    let publishedStory = null;
    setStories(prev => {
      const ix = prev.findIndex(x=>x.id===id);
      if (ix<0) return prev;
      const s0 = prev[ix];
      const slug = s0.shareSlug || `${s0.id}`;
      const next = [...prev];
      const s = { ...s0, published:true, shareSlug:slug, updatedAt:new Date().toISOString() };
      next[ix] = s;
      publishedStory = s;
      return next;
    });
    if (publishedStory) createFeedItem(publishedStory);
    setToast("Historia publicada y enviada al inicio.");
  };

  const unpublish = (id) => {
    setStories(prev => {
      const ix = prev.findIndex(x=>x.id===id);
      if (ix<0) return prev;
      const next = [...prev];
      next[ix] = { ...prev[ix], published:false, updatedAt:new Date().toISOString() };
      return next;
    });
    setToast("Historia movida a borrador.");
  };

  // Enviar a papelera
  const softDelete = (id) => {
    if (!confirm("¿Enviar a la papelera? Se eliminará definitivamente en 30 días.")) return;
    let removed = null;
    setStories(prev => {
      const ix = prev.findIndex(x=>x.id===id);
      if (ix<0) return prev;
      const next = [...prev];
      removed = next.splice(ix,1)[0];
      return next;
    });
    if (removed) {
      const trash = readJSON(TRASH_KEY, []);
      writeJSON(TRASH_KEY, [{ ...removed, deletedAt: new Date().toISOString() }, ...trash]);
      setToast("Historia enviada a la papelera.");
    }
  };

  // persistir
  useEffect(()=>{ writeJSON(STORAGE_KEY, stories); }, [stories]);

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    const list = filter==="Todas" ? stories : stories.filter(s=>s.category===filter);
    if (!q) return list;
    return list.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.contentHTML?.toLowerCase().includes(q)
    );
  }, [stories, query, filter]);

  const shareUrl = (s) => `${location.origin}/stories/view/${encodeURIComponent(s.id)}`;

  const doShare = async (s) => {
    const url = shareUrl(s);
    const text = `Lee mi historia "${s.title}" en mi app.`;
    // incrementa stat de share
    setStories(prev => {
      const ix = prev.findIndex(x=>x.id===s.id);
      if (ix<0) return prev;
      const next = [...prev];
      const stats = { ...(next[ix].stats||{}), shares: (next[ix].stats?.shares||0) + 1 };
      next[ix] = { ...next[ix], stats };
      return next;
    });

    if (navigator.share) {
      try { await navigator.share({ title: s.title, text, url }); } catch {}
      return;
    }
    const encoded = encodeURIComponent(url);
    const fb = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
    const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encoded}`;
    const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`;
    window.open(fb, "_blank", "noopener");
    setTimeout(()=>window.open(tw, "_blank", "noopener"), 100);
    setTimeout(()=>window.open(wa, "_blank", "noopener"), 200);
  };

  // Descargas + stats
  const downloadJSON = (s) => { exportStoryAsJSON(s); bumpDownloads(s.id, "json"); };
  const downloadDOC  = (s) => { exportStoryAsDoc(s);  bumpDownloads(s.id, "doc");  };
  const downloadPDF  = (s) => { exportStoryAsPDF(s);  bumpDownloads(s.id, "pdf");  };

  const bumpDownloads = (id, key) => {
    setStories(prev => {
      const ix = prev.findIndex(x=>x.id===id); if (ix<0) return prev;
      const next = [...prev];
      const dls = { ...(next[ix].stats?.downloads||{}) };
      dls[key] = (dls[key]||0) + 1;
      next[ix] = { ...next[ix], stats: { ...(next[ix].stats||{}), downloads: dls } };
      return next;
    });
  };

  // Crear post en el feed al publicar
  const createFeedItem = (story) => {
    const posts = readJSON(FEED_KEY, []);
    const url = `/stories/view/${encodeURIComponent(story.id)}`;
    const text = `Nueva historia: ${story.title} — ${story.category}\n${location.origin}${url}`;
    const post = {
      id: `p_${Date.now()}`,
      authorId: CURRENT_USER.id,
      authorName: CURRENT_USER.name,
      authorAvatar: "🧑‍🚀",
      authorAvatarImage: null,
      createdAt: new Date().toISOString(),
      text,
      images: story.cover ? [story.cover] : [],
      likes: 0, dislikes: 0, userReaction: null,
      comments: [],
    };
    writeJSON(FEED_KEY, [post, ...posts]);
    try { window.dispatchEvent(new CustomEvent("feed:updated", { detail: { postId: post.id } })); } catch {}
  };

  // Lecturas recientes (historial del usuario)
  const myHistory = readJSON(`${HISTORY_KEY}_${CURRENT_USER.handle}`, []);

  return (
    <section className="content-stack">
      <div className="card d-flex align-items-center justify-content-between" style={{padding:12}}>
        <div className="d-flex align-items-center" style={{gap:12, color:'white'}}>
          <BsFonts/><strong>Historias</strong>
        </div>
        <div className="d-flex align-items-center" style={{gap:8}}>
          <div className="d-flex align-items-center rp-search-wrap">
            <BsSearch className="text-secondary"/>
            <input
              className="form-control bg-transparent text-light border-secondary-subtle"
              placeholder="Buscar…"
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              style={{maxWidth:220}}
            />
          </div>
          <select
            className="form-select bg-transparent text-light border-secondary-subtle"
            value={filter}
            onChange={(e)=>setFilter(e.target.value)}
          >
            <option>Todas</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <Link className="btn btn-ghost" to="/stories/trash">Papelera</Link>
          <button className="btn btn-primary" onClick={()=>openEditor("new")}><BsPlus className="me-1"/>Nueva</button>
        </div>
      </div>

      {/* Editor */}
      {draft && (
        <Editor
          draft={draft}
          setDraft={setDraft}
          onSave={saveDraft}
          onCancel={()=>{ setEditing(null); setDraft(null); }}
          onPickCover={onPickCover}
          onRemoveCover={onRemoveCover}
        />
      )}

      {/* Lista */}
      <div className="cards-grid">
        {filtered.length===0 && <div className="text-secondary">No hay historias aún.</div>}
        {filtered.map(s=>(
          <div className="card" key={s.id}>
            <div className="d-flex align-items-center flex-column gap-3 justify-content-between">
              <div>
                <div className="fw-bold" style={{color:'white'}}>{s.title || <span className="text-secondary">Sin título</span>}</div>
                <div className="small text-secondary"><BsTag className="me-1"/>{s.category} · {new Date(s.updatedAt).toLocaleString()}</div>
              </div>
              
              <div className="d-flex" style={{gap:6}}>
              
                <Link to={`/stories/view/${s.id}`} className="btn btn-ghost btn-sm" title="Vista pública"><BsEye/></Link>
                {s.published
                  ? <button className="btn btn-ghost btn-sm" onClick={()=>unpublish(s.id)} title="Quitar de publicado"><BsCloudSlash/></button>
                  : <button className="btn btn-ghost btn-sm" onClick={()=>publish(s.id)} title="Publicar"><BsCloudCheck/></button>
                }
                <button className="btn btn-ghost btn-sm" onClick={()=>openEditor(s.id)} title="Editar"><BsPencil/></button>
                <button className="btn btn-ghost btn-sm" onClick={()=>doShare(s)} title="Compartir"><BsShare/></button>
                <div className="dropdown">
                  <button className="btn btn-ghost btn-sm" data-bs-toggle="dropdown" title="Descargar"><BsDownload/></button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><button className="dropdown-item" onClick={()=>downloadPDF(s)}>PDF</button></li>
                    <li><button className="dropdown-item" onClick={()=>downloadDOC(s)}>Word (.doc)</button></li>
                    <li><button className="dropdown-item" onClick={()=>downloadJSON(s)}>JSON</button></li>
                  </ul>
                </div>
                <button className="btn btn-ghost btn-sm text-danger" onClick={()=>softDelete(s.id)} title="Enviar a papelera"><BsTrash/></button>
              </div>
            </div>

            {/* Portada */}
            {s.cover && (
              <div className="story-cover-preview mt-2">
                <img src={s.cover} alt="Portada" />
              </div>
            )}

            {/* Preview corto */}
            <div className="story-preview" style={{ fontFamily:s.font, fontSize:s.fontSize, color:'#fff' }}>
              <div dangerouslySetInnerHTML={{ __html: s.contentHTML || "<p class='text-secondary'>Vacío…</p>" }} />
            </div>

            {/* Stats */}
            <div className="small text-secondary d-flex align-items-center" style={{gap:10, marginTop:6}}>
              <span><BsGraphUpArrow className="me-1" />Vistas: <b>{s.stats?.views ?? 0}</b></span>
              <span>Descargas: PDF <b>{s.stats?.downloads?.pdf ?? 0}</b> · DOC <b>{s.stats?.downloads?.doc ?? 0}</b> · JSON <b>{s.stats?.downloads?.json ?? 0}</b></span>
              <span>Compartidos: <b>{s.stats?.shares ?? 0}</b></span>
            </div>
          </div>
        ))}
      </div>

      {/* Historial de lectura (usuario actual) */}
      <div className="card">
        <div className="d-flex align-items-center justify-content-between">
          <h4 className="card-title m-0"><BsGraphUpArrow className="me-1"/> Historial de lectura</h4>
          <button className="btn btn-ghost btn-sm" onClick={()=>{
            writeJSON(`${HISTORY_KEY}_${CURRENT_USER.handle}`, []);
            window.location.reload();
          }}>Limpiar</button>
        </div>
        {myHistory.length===0 ? (
          <div className="text-secondary small">Aún no has leído historias publicadas.</div>
        ) : (
          <ul className="list-unstyled m-0">
            {myHistory.slice(0,12).map(h => (
              <li key={h.ts+h.id} className="small">
                <Link className="fp-link" to={`/stories/view/${h.id}`}>{h.title || "Sin título"}</Link>
                <span className="text-secondary"> — {new Date(h.ts).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="toast-like" onAnimationEnd={()=>setToast(null)}>{toast}</div>}
    </section>
  );
}
