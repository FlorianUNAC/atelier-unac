// Export d'un document de l'Atelier en images (une PNG par page) pour Facebook / réseaux.
// La page hôte définit : renderPreview(), nomExport() (nom de fichier sans extension), titreExport(), toast(), esc().
"use strict";
(function(){
  const VENDOR = new URL("vendor/", document.currentScript.src).href;
  const LARGEUR = 1440;               // px de large par image (A4 portrait : 1440 × 2037)
  const loaded = {};
  const loadScript = src => loaded[src] || (loaded[src] = new Promise((ok, ko) => {
    const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("chargement impossible")); document.head.appendChild(s);
  }));

  const M = document.createElement("div");
  M.className = "modal"; M.id = "imgModal";
  M.innerHTML = `<div class="mbox" role="dialog" aria-modal="true" aria-labelledby="imTitle">
    <div class="mhead"><h3 id="imTitle">Images pour Facebook</h3><button class="mclose" data-x aria-label="Fermer">×</button></div>
    <div class="mbody" id="imBody"></div>
    <div class="mfoot" id="imFoot"></div></div>`;
  document.body.appendChild(M);
  const body = M.querySelector("#imBody"), foot = M.querySelector("#imFoot");
  let urls = [], files = [];
  const close = () => { M.classList.remove("on"); urls.forEach(u => URL.revokeObjectURL(u)); urls = []; files = []; };
  M.addEventListener("click", e => { if(e.target === M || e.target.hasAttribute("data-x")) close(); });

  const nomBase = () => window.nomExport();
  const telecharger = (blob, nom) => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  window.exportImages = async function(){
    body.innerHTML = `<p class="mintro">Préparation des images…</p>`; foot.innerHTML = "";
    M.classList.add("on");
    try{
      renderPreview();
      if(document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all([...document.querySelectorAll("#pages img")].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
      await loadScript(VENDOR + "html-to-image.js");
      const pages = [...document.querySelectorAll("#pages .page")];
      const opts = {pixelRatio: LARGEUR / 794, width: 794, height: 1123, style: {transform: "none", position: "static", margin: "0", left: "0", top: "0"}};
      try{ await htmlToImage.toBlob(pages[0], opts); }catch(e){} // 1er passage : charge polices et images (Safari)
      const blobs = [];
      for(let i = 0; i < pages.length; i++){
        body.innerHTML = `<p class="mintro">Préparation des images… page ${i+1} / ${pages.length}</p>`;
        blobs.push(await htmlToImage.toBlob(pages[i], opts));
      }
      const base = nomBase();
      files = blobs.map((b, i) => new File([b], `${base}${blobs.length > 1 ? "-" + (i+1) : ""}.png`, {type: "image/png"}));
      urls = blobs.map(b => URL.createObjectURL(b));
      const peutPartager = !!(navigator.canShare && navigator.canShare({files}));
      body.innerHTML = `<p class="mintro">${files.length} image${files.length>1?"s":""} (une par page, ${LARGEUR} px de large), prête${files.length>1?"s":""} pour une publication Facebook.
        ${peutPartager ? "« Partager » ouvre directement Facebook, Messages, WhatsApp… depuis le téléphone." : "Sur téléphone, un appui long sur une image permet aussi de l'enregistrer dans Photos."}</p>
        <div class="imgrid">${urls.map((u, i) => `<a href="${u}" download="${esc(files[i].name)}" title="Télécharger cette page"><img src="${u}" alt="Page ${i+1}"><span>Page ${i+1}</span></a>`).join("")}</div>`;
      foot.innerHTML = `<span></span><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        ${peutPartager ? `<button class="mbtn" id="imShare">Partager</button>` : ""}
        <button class="mbtn pri" id="imDl">${files.length > 1 ? "Tout télécharger (.zip)" : "Télécharger l'image"}</button></div>`;
      const sh = foot.querySelector("#imShare");
      if(sh) sh.addEventListener("click", async () => {
        try{ await navigator.share({files, title: window.titreExport()}); }
        catch(e){ if(e.name !== "AbortError") toast("Partage impossible : utilisez « Télécharger »"); }
      });
      foot.querySelector("#imDl").addEventListener("click", async () => {
        if(files.length === 1) return telecharger(files[0], files[0].name);
        await loadScript(VENDOR + "jszip.min.js");
        const zip = new JSZip(); files.forEach(f => zip.file(f.name, f));
        telecharger(await zip.generateAsync({type: "blob"}), base + "-images.zip");
      });
    }catch(e){
      body.innerHTML = `<p class="merr">Les images n'ont pas pu être générées (${esc(e.message || String(e))}). Réessayez, ou utilisez le PDF.</p>`;
      foot.innerHTML = `<span></span><button class="mbtn" data-x>Fermer</button>`;
    }
  };
})();
