import { useState, useMemo } from "react";
import { FiImage, FiSmile, FiSend, FiX } from "react-icons/fi";

// Emojis simples (puedes extender la lista)
const EMOJIS = ["😀","😁","😂","🤣","😊","😍","🤩","😘","😎","😇","🤓","😴","🤯","🤔","🙌","👏","👍","👎","🔥","💯","🎉","🚀","✨","🧠","❤️","💡"];

export default function PostBox({ onPost }) {
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);          // dataURLs definitivas para el post
  const [tempPreviews, setTempPreviews] = useState([]); // previews dentro del modal

  const canPublish = useMemo(() => text.trim() || images.length > 0, [text, images]);

  // Helpers: leer archivos como dataURL
  const readFilesAsDataURLs = async (fileList) => {
    const files = Array.from(fileList || []);
    const readers = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(file);
        })
    );
    return Promise.all(readers);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value && images.length === 0) return;

    onPost?.({
      text: value,
      images, // array de dataURLs
    });

    // Reset
    setText("");
    setImages([]);
  };

  // --- Modal de Imágenes ---
  const onPickImages = async (e) => {
    const urls = await readFilesAsDataURLs(e.target.files);
    setTempPreviews((prev) => [...prev, ...urls]);
    e.target.value = ""; // reset input (para poder elegir lo mismo otra vez si quiere)
  };
  const removeTempPreview = (idx) => {
    setTempPreviews((prev) => prev.filter((_, i) => i !== idx));
  };
  const confirmAddImages = () => {
    setImages((prev) => [...prev, ...tempPreviews]);
    setTempPreviews([]);
  };

  // Quitar imagen ya agregada al post
  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- Modal de Emoji ---
  const insertEmoji = (emoji) => {
    // Inserta en la posición final (simple). Si quieres, puedes insertar donde esté el cursor.
    setText((t) => (t ? `${t}${emoji}` : emoji));
  };

  return (
    <div className="card postbox">
      <form onSubmit={handleSubmit} className="postbox-form">
        <div className="postbox-row">
          <div className="postbox-avatar" aria-hidden>🧑‍🚀</div>

          <div className="w-100">
            <textarea
              className="postbox-input"
              placeholder="¿En qué estás pensando?"
              value={text}
              onChange={(e) => setText(e.target.value)}
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
            >
              <FiSmile size={18} />
            </button>
          </div>

          <button type="submit" className="btn btn-primary" disabled={!canPublish}>
            <FiSend size={16} style={{ marginRight: 6 }} /> Publicar
          </button>
        </div>
      </form>

      {/* ===== Modal: Selector de Imágenes ===== */}
      <div
        className="modal fade"
        id="imagePickerModal"
        tabIndex="-1"
        aria-labelledby="imagePickerLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content" style={{ background: "#0f141b", color: "var(--text)" }}>
            <div className="modal-header">
              <h5 className="modal-title" id="imagePickerLabel">Selecciona imágenes</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div className="modal-body">
              <input
                type="file"
                accept="image/*"
                multiple
                className="form-control bg-transparent text-light border-secondary-subtle"
                onChange={onPickImages}
              />

              {tempPreviews.length > 0 ? (
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
              ) : (
                <div className="text-secondary small mt-3">
                  Aún no has seleccionado imágenes.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                data-bs-dismiss="modal"
                onClick={() => setTempPreviews([])}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-bs-dismiss="modal"
                onClick={confirmAddImages}
                disabled={tempPreviews.length === 0}
              >
                Agregar {tempPreviews.length > 0 ? `(${tempPreviews.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal: Selector de Emojis ===== */}
      <div
        className="modal fade"
        id="emojiPickerModal"
        tabIndex="-1"
        aria-labelledby="emojiPickerLabel"
        aria-hidden="true"
      >
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
              <button type="button" className="btn btn-primary" data-bs-dismiss="modal">
                Listo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
