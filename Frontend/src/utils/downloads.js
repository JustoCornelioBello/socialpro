// src/utils/downloads.js
// Exporta historias a JSON, Word (.doc con HTML) y PDF (html2canvas + jsPDF, dinámico)

export function exportStoryAsJSON(story) {
  const blob = new Blob([JSON.stringify(story, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safe(story.title || "historia")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportStoryAsDoc(story) {
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(story.title || "historia")}</title>
<style>
  body{ font-family:${story.font}; font-size:${story.fontSize || 16}px; line-height:1.6; color:#000; }
  h1,h2,h3{ margin: 0.6em 0; }
  .cover{ margin-bottom:12px; }
  .cover img{ max-width:100%; height:auto; display:block; }
</style>
</head>
<body>
  <h1>${escapeHtml(story.title || "Sin título")}</h1>
  ${story.cover ? `<div class="cover"><img src="${story.cover}" /></div>` : ""}
  <div>${story.contentHTML || ""}</div>
</body>
</html>`;
  const blob = new Blob([html], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safe(story.title || "historia")}.doc`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportStoryAsPDF(story) {
  try {
    const [{ jsPDF }, html2canvas] = await Promise.all([
      import("jspdf"),
      import("html2canvas").then(m => m.default)
    ]);

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-99999px";
    wrapper.style.top = "0";
    wrapper.style.width = "794px";
    wrapper.style.padding = "24px";
    wrapper.style.background = "#fff";
    wrapper.style.color = "#000";
    wrapper.innerHTML = `
      <h1 style="margin-top:0">${escapeHtml(story.title || "Sin título")}</h1>
      ${story.cover ? `<div style="margin-bottom:12px"><img style="max-width:100%;height:auto" src="${story.cover}" /></div>` : ""}
      <div style="font-family:${story.font}; font-size:${story.fontSize || 16}px; line-height:1.6">${story.contentHTML || ""}</div>
    `;
    document.body.appendChild(wrapper);

    const canvas = await html2canvas(wrapper, { scale: 2 });
    document.body.removeChild(wrapper);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const ratio = canvas.height / canvas.width;
    const imgWidth = pageWidth;
    let imgHeight = imgWidth * ratio;

    let pos = 0;
    while (imgHeight > 0) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgWidth * ratio);
      imgHeight -= pdf.internal.pageSize.getHeight();
      if (imgHeight > 0) pdf.addPage();
      pos += 1;
    }
    pdf.save(`${safe(story.title || "historia")}.pdf`);
  } catch (e) {
    alert("Para exportar a PDF instala: npm i html2canvas jspdf");
    console.error(e);
  }
}


/* Utils */
function safe(s) { return (s||"").toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9\-_]/g,""); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
