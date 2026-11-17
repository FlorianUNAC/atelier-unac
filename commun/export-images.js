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
    <div class="mhead"><h3 id="imTitle">Images</h3><button class="mclose" data-x aria-label="Fermer">×</button></div>
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

  let HD = false; try{ HD = localStorage.getItem("atelier:imgHD:" + location.pathname) === "1"; }catch(e){}
  const largeur = () => HD ? (window.EXPORT_LARGEUR ? window.EXPORT_LARGEUR * 2 : 2480) : (window.EXPORT_LARGEUR || LARGEUR);
  // Déclare 300 dpi dans le PNG (bloc pHYs) pour que l'imprimeur lise la bonne résolution
  const CRC = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  async function png300(blob){
    const src = new Uint8Array(await blob.arrayBuffer()), ppm = 11811; // 300 dpi
    const ch = new Uint8Array(21), dv = new DataView(ch.buffer);
    dv.setUint32(0, 9); ch.set([112,72,89,115], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); ch[16] = 1;
    let c = 0xFFFFFFFF; for(let i = 4; i < 17; i++) c = CRC[(c ^ ch[i]) & 255] ^ (c >>> 8); dv.setUint32(17, (c ^ 0xFFFFFFFF) >>> 0);
    const ihdrFin = 8 + 25; // signature + IHDR
    return new Blob([src.slice(0, ihdrFin), ch, src.slice(ihdrFin)], {type: "image/png"});
  }
  window.exportImages = async function(hd){
    if(typeof hd === "boolean"){ HD = hd; try{ localStorage.setItem("atelier:imgHD:" + location.pathname, HD ? "1" : "0"); }catch(e){} }
    body.innerHTML = `<p class="mintro">Préparation des images…</p>`; foot.innerHTML = "";
    M.classList.add("on");
    try{
      renderPreview();
      if(document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all([...document.querySelectorAll("#pages img")].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
      await loadScript(VENDOR + "html-to-image.js");
      const pages = [...document.querySelectorAll("#pages .page")];
      const W = pages[0].offsetWidth || 794, H = pages[0].offsetHeight || 1123;
      const opts = {pixelRatio: largeur() / W, width: W, height: H, style: {transform: "none", position: "static", margin: "0", left: "0", top: "0"}};
      try{ await htmlToImage.toBlob(pages[0], opts); }catch(e){} // 1er passage : charge polices et images (Safari)
      const blobs = [];
      for(let i = 0; i < pages.length; i++){
        body.innerHTML = `<p class="mintro">Préparation des images${HD ? " haute définition" : ""}… page ${i+1} / ${pages.length}</p>`;
        const bl = await htmlToImage.toBlob(pages[i], opts);
        blobs.push(HD && !window.EXPORT_LARGEUR ? await png300(bl) : bl);
      }
      const base = nomBase();
      files = blobs.map((b, i) => new File([b], `${base}${blobs.length > 1 ? "-" + (i+1) : ""}${HD ? "-HD" : ""}.png`, {type: "image/png"}));
      urls = blobs.map(b => URL.createObjectURL(b));
      const peutPartager = !!(navigator.canShare && navigator.canShare({files}));
      body.innerHTML = `<p class="mintro">${files.length} image${files.length>1?"s":""} (une par page, ${largeur()} px de large${HD && !window.EXPORT_LARGEUR ? ", soit 300 dpi en A4" : ""}), prête${files.length>1?"s":""} ${HD ? "pour l'impression" : "pour une publication Facebook"}.${HD ? " <b>Pour Meljet ou un imprimeur, préférez « Télécharger le PDF »</b> : le texte y reste vectoriel, donc net à toutes les tailles, alors qu'une image peut être recompressée par la plateforme." : ""}
        ${peutPartager ? "« Partager » ouvre directement Facebook, Messages, WhatsApp… depuis le téléphone." : "Sur téléphone, un appui long sur une image permet aussi de l'enregistrer dans Photos."}</p>
        <div class="imgrid">${urls.map((u, i) => `<a href="${u}" download="${esc(files[i].name)}" title="Télécharger cette page"><img src="${u}" alt="Page ${i+1}"><span>Page ${i+1}</span></a>`).join("")}</div>`;
      foot.innerHTML = `<button class="mbtn" id="imHD" title="${HD ? "Images plus légères, pour Facebook et l'écran" : "300 dpi : impression"}">${HD ? "Version standard (Facebook)" : "Version haute définition (300 dpi)"}</button><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        ${peutPartager ? `<button class="mbtn" id="imShare">Partager</button>` : ""}
        <button class="mbtn pri" id="imDl">${files.length > 1 ? "Tout télécharger (.zip)" : "Télécharger l'image"}</button></div>`;
      foot.querySelector("#imHD").addEventListener("click", () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; files = []; window.exportImages(!HD); });
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
