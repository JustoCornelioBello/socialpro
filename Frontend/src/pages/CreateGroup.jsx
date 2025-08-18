import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsGlobe, BsLock } from "react-icons/bs";
import { SpinnerOverlay, InlineSpinner } from "../components/Loaders.jsx";

const GROUPS_KEY = "groups_v1";
const CURRENT_USER = { id: "u1", name: "Justo" };

const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const slugify = (s) => s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

const fileToDataURL = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = rej;
  fr.readAsDataURL(file);
});

async function downscale(dataUrl, max = 900) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(max / img.width, max / img.height, 1);
      const w = Math.round(img.width * sc);
      const h = Math.round(img.height * sc);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const x = c.getContext("2d");
      x.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}

export default function CreateGroup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [privacy, setPrivacy] = useState("public"); // public | private
  const [avatar, setAvatar] = useState(null); // dataURL
  const [cover, setCover] = useState(null);   // dataURL
  const [saving, setSaving] = useState(false);

  // loaders de subida
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // ========== handlers con loader ==========
  const onPickAvatar = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingAvatar(true);
    try {
      const raw = await fileToDataURL(f);
      const scaled = await downscale(raw, 512);
      setAvatar(scaled);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const onPickCover = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingCover(true);
    try {
      const raw = await fileToDataURL(f);
      const scaled = await downscale(raw, 1200);
      setCover(scaled);
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setSaving(true);

    const groups = readJSON(GROUPS_KEY, []);
    const s = slugify(n);
    const exists = groups.some((g) => g.slug === s);
    const slug = exists ? `${s}-${Date.now().toString(36)}` : s;

    const group = {
      id: `g_${Date.now()}`,
      slug,
      name: n,
      description: desc.trim(),
      privacy,
      avatar,
      cover,
      ownerId: CURRENT_USER.id,
      createdAt: new Date().toISOString(),
      members: [CURRENT_USER.id],
    };

    writeJSON(GROUPS_KEY, [group, ...groups]);

    // Pequeño delay opcional para percibir el overlay
    await new Promise((r) => setTimeout(r, 600));

    setSaving(false);
    navigate(`/groups/${slug}`);
  };

  const disabled = saving || uploadingAvatar || uploadingCover;

  return (
    <section className="content-stack">
      <h2>Crear grupo</h2>

      <form className="card position-relative" style={{ color: "white" }} onSubmit={submit} aria-busy={saving ? "true" : "false"}>
        {/* Overlay cuando se crea el grupo */}
        <SpinnerOverlay visible={saving} label="Creando grupo…" />

        <div className="mb-2">
          <label className="form-label">Nombre del grupo</label>
          <input
            className="form-control bg-transparent text-light border-secondary-subtle"
            placeholder="Ej. React Developers RD"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={disabled}
          />
        </div>

        <div className="mb-2">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-control bg-transparent text-light border-secondary-subtle"
            rows={3}
            placeholder="Cuenta de qué trata este grupo…"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="mb-3">
          <label className="form-label d-block">Privacidad</label>
          <div className="d-flex gap-3">
            <label className="d-flex align-items-center gap-2">
              <input
                type="radio"
                name="privacy"
                value="public"
                checked={privacy === "public"}
                onChange={() => setPrivacy("public")}
                disabled={disabled}
              />
              <BsGlobe /> Público (cualquiera puede encontrarlo)
            </label>
            <label className="d-flex align-items-center gap-2">
              <input
                type="radio"
                name="privacy"
                value="private"
                checked={privacy === "private"}
                onChange={() => setPrivacy("private")}
                disabled={disabled}
              />
              <BsLock /> Privado (solo miembros)
            </label>
          </div>
        </div>

        <div className="grid-2 mb-3">
          <div>
            <label className="form-label">
              Avatar del grupo {uploadingAvatar && <InlineSpinner />}
            </label>
            <input
              type="file"
              accept="image/*"
              className="form-control bg-transparent text-light border-secondary-subtle"
              onChange={onPickAvatar}
              disabled={disabled}
            />
            {avatar && (
              <div className="group-img-preview mt-2">
                <img alt="avatar" src={avatar} />
              </div>
            )}
          </div>

          <div>
            <label className="form-label">
              Portada (cover) {uploadingCover && <InlineSpinner />}
            </label>
            <input
              type="file"
              accept="image/*"
              className="form-control bg-transparent text-light border-secondary-subtle"
              onChange={onPickCover}
              disabled={disabled}
            />
            {cover && (
              <div className="group-cover-preview mt-2">
                <img alt="cover" src={cover} />
              </div>
            )}
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={disabled}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={disabled || !name.trim()}>
            {saving ? <>Creando… <InlineSpinner /></> : "Crear grupo"}
          </button>
        </div>
      </form>
    </section>
  );
}
