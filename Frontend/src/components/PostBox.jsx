import { useState, useMemo } from "react";
import { FiImage, FiSmile, FiSend, FiX } from "react-icons/fi";
import { SpinnerOverlay, InlineSpinner } from "./Loaders.jsx";

// Emojis simples (puedes extender la lista)
const EMOJIS = [
  "😀","😁","😂","🤣","😅","😊","😍","🤩","😘","😎","😇","🤓","😴","🤯","🤔","🙃","😢","😭","😡","🤬","😱","😳","🥶","🥵","🤤",
  "🤪","😜","🤗","😌","😋","😴","🥱","🤧","🤒","🤕","🥴","🤠","🙌","👏","👍","👎","👌","🤌","✌️","🤞","🤟","🤘","👊","🤛","🤜",
  "🙏","☝️","👇","👉","👈","🖐️","✋","🖖","🤲","👐","🤝","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷",
  "🐸","🐵","🐔","🐧","🐦","🦆","🦉","🦇","🐺","🐢","🐍","🦖","🦕","🐙","🐠","🐬","🐳","🦈","🦑","🦋","🐞","🐝","🦄","🐴",
  "🍎","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🥑","🍅","🥕","🌽","🥦","🍔","🍟","🍕","🌭","🥪",
  "🍣","🍤","🥗","🍦","🍫","🍿","☕","🍵","🍺","🍷","🥂","🥃","⚽","🏀","🏈","⚾","🎾","🏐","🎱","🏓","🥊","🏹","🎯","🎮",
  "🎲","🧩","🎼","🎹","🎸","🥁","🎤","🎧","📱","💻","🖥️","⌨️","🖱️","💾","📷","🎥","📺","📚","📖","✏️","🖊️","🖌️","📌","📍",
  "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚜","🚲","🛴","🛵","🏍️","🚂","✈️","🚀","🛸","🚢","⚓","🏠","🏢","🏛️","🗽","🗿",
  "🌋","🗻","🏞️","🏝️","🏖️","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💡","🔥","💯","🎉","✨","⭐",
  "🌟","⚡","☀️","🌙","🌈","☁️","🌧️","🌊","🍀","🌹","🌸","🌻","🌼","🌷","🌵","🌲","🌳","🪐","🌍","🇺🇸","🇪🇸","🇲🇽","🇦🇷","🇨🇱",
  "🇨🇴","🇵🇪","🇧🇷","🇩🇴","🇯🇵","🇨🇳","🇰🇷"
];

export default function PostBox({ onPost }) {
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);            // dataURLs definitivas
  const [tempPreviews, setTempPreviews] = useState([]); // previews dentro del modal

  // Loading states
  const [posting, setPosting] = useState(false);        // overlay al publicar
  const [selecting, setSelecting] = useState(false);    // leyendo imágenes
  const [selectProgress, setSelectProgress] = useState(0); // 0..100

  const canPublish = useMemo(() => text.trim() || images.length > 0, [text, images]);

  // Helper single file → dataURL
  const fileToDataURL = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value && images.length === 0) return;

    setPosting(true);
    try {
      // soporta onPost síncrono o asíncrono
      await Promise.resolve(onPost?.({ text: value, images }));
      // pequeño delay para que el usuario perciba el loader
      await new Promise((r) => setTimeout(r, 600));
      // Reset
      setText("");
      setImages([]);
    } finally {
      setPosting(false);
    }
  };

  // --- Modal de Imágenes ---
  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSelecting(true);
    setSelectProgress(0);
    const urls = [];
    try {
      for (let i = 0; i < files.length; i++) {
        // lectura secuencial para mostrar progreso
        const url = await fileToDataURL(files[i]);
        urls.push(url);
        setSelectProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setTempPreviews((prev) => [...prev, ...urls]);
    } finally {
      setSelecting(false);
      // permite volver a elegir las mismas fotos
      e.target.value = "";
    }
  };

  const removeTempPreview = (idx) => setTempPreviews((prev) => prev.filter((_, i) => i !== idx));
  const confirmAddImages = () => { setImages((p) => [...p, ...tempPreviews]); setTempPreviews([]); };
  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  // --- Modal de Emoji ---
  const insertEmoji = (emoji) => setText((t) => (t ? `${t}${emoji}` : emoji));

  return (
    <div className="card postbox position-relative" aria-busy={posting ? "true" : "false"}>
      {/* Overlay de publicación */}
      <SpinnerOverlay visible={posting} label="Publicando…" />

      <form onSubmit={handleSubmit} className="postbox-form">
        <div className="postbox-row">
          <div className="postbox-avatar" aria-hidden>🧑‍🚀</div>

          <div className="w-100">
            <textarea
              className="postbox-input"
              placeholder="¿En qué estás pensando?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={posting}
            />

            {/* Thumbnails de imágenes ya agregadas al post */}
            {images.length > 0 && (
              <div className="postbox-images-grid mt-2">
                {images.map((src, idx) => (
                  <div key={idx} className="img-thumb">
                    <img src={src} alt={`img-${idx}`} />
                    <button
                      type="button"
                      className="img-remove"
                      onClick={() => removeImage(idx)}
                      title="Quitar"
                      disabled={posting}
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="postbox-actions">
          <div className="postbox-icons">
            {/* Botón abre modal imágenes */}
            <button
              type="button"
              className="icon-btn"
              title="Agregar imagen"
              data-bs-toggle="modal"
              data-bs-target="#imagePickerModal"
              disabled={posting}
            >
              <FiImage size={18} />
            </button>

            {/* Botón abre modal emojis */}
            <button
              type="button"
              className="icon-btn"
              title="Agregar emoji"
              data-bs-toggle="modal"
              data-bs-target="#emojiPickerModal"
              disabled={posting}
            >
              <FiSmile size={18} />
            </button>
          </div>

          <button type="submit" className="btn btn-primary" disabled={!canPublish || posting}>
            {posting ? <>Publicando <InlineSpinner /></> : <><FiSend size={16} style={{ marginRight: 6 }} /> Publicar</>}
          </button>
        </div>
      </form>

      {/* ===== Modal: Selector de Imágenes ===== */}
      <div className="modal fade" id="imagePickerModal" tabIndex="-1" aria-labelledby="imagePickerLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content" style={{ background: "#0f141b", color: "var(--text)" }}>
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2" id="imagePickerLabel">
                Selecciona imágenes
                {selecting && <InlineSpinner />}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar" disabled={selecting}></button>
            </div>

            <div className="modal-body">
              <input
                type="file"
                accept="image/*"
                multiple
                className="form-control bg-transparent text-light border-secondary-subtle"
                onChange={onPickImages}
                disabled={selecting}
              />

              {/* Progreso de lectura */}
              {selecting && (
                <div className="mt-3">
                  <div className="progress" role="progressbar" aria-valuenow={selectProgress} aria-valuemin="0" aria-valuemax="100">
                    <div className="progress-bar" style={{ width: `${selectProgress}%` }}>
                      {selectProgress}%
                    </div>
                  </div>
                  <div className="text-secondary small mt-1">Preparando tus imágenes…</div>
                </div>
              )}

              {tempPreviews.length > 0 && !selecting ? (
                <div className="postbox-images-grid mt-3">
                  {tempPreviews.map((src, idx) => (
                    <div key={idx} className="img-thumb">
                      <img src={src} alt={`preview-${idx}`} />
                      <button
                        type="button"
                        className="img-remove"
                        onClick={() => removeTempPreview(idx)}
                        title="Quitar"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              ) : !selecting ? (
                <div className="text-secondary small mt-3">Aún no has seleccionado imágenes.</div>
              ) : null}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                data-bs-dismiss="modal"
                onClick={() => setTempPreviews([])}
                disabled={selecting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-bs-dismiss="modal"
                onClick={confirmAddImages}
                disabled={selecting || tempPreviews.length === 0}
              >
                Agregar {tempPreviews.length > 0 ? `(${tempPreviews.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal: Selector de Emojis ===== */}
      <div className="modal fade" id="emojiPickerModal" tabIndex="-1" aria-labelledby="emojiPickerLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content" style={{ background: "#0f141b", color: "var(--text)" }}>
            <div className="modal-header">
              <h5 className="modal-title" id="emojiPickerLabel">Elige un emoji</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div className="modal-body">
              <div className="emoji-grid">
                {EMOJIS.map((e, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="emoji-btn"
                    data-bs-dismiss="modal"
                    onClick={() => insertEmoji(e)}
                    title={e}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" data-bs-dismiss="modal">Listo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
