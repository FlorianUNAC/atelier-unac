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

  const st = document.createElement("style");
  st.textContent = `.immodes{display:inline-flex;background:#f1ecef;border-radius:999px;padding:3px;margin-bottom:12px;gap:2px}
  .immodes button{border:0;background:none;border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;font-weight:700;color:#7d5a6e;cursor:pointer}
  .immodes button.on{background:#fff;color:#9b2e5f;box-shadow:0 1px 4px rgba(0,0,0,.12)}
  .imgrid.car{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}`;
  document.head.appendChild(st);
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
  let CAR = false; try{ CAR = localStorage.getItem("atelier:imgCar:" + location.pathname) === "1"; }catch(e){}
  /* Carrousel Instagram / Facebook : chaque page est découpée en diapositives 1080 × 1350 (4:5),
     en coupant dans les espaces vides (entre deux blocs), jamais au milieu d'une ligne de texte. */
  const CW = 1080, CH = 1350, MARGE = 70;
  function energie(cx, w, h){
    const d = cx.getImageData(0, 0, w, h).data, x0 = Math.round(w * .035), x1 = Math.round(w * .965), en = new Float32Array(h);
    const L = (x, y) => { const i = (y * w + x) * 4; return d[i] * .3 + d[i+1] * .59 + d[i+2] * .11; };
    for(let y = 0; y < h; y++){ let e = 0, prev = -1; for(let x = x0; x < x1; x += 2){ const l = L(x, y); if(prev >= 0 && Math.abs(l - prev) > 18) e++; if(x - x0 >= 24 && Math.abs(l - L(x - 24, y)) > 30) e++; prev = l; } en[y] = e; }
    return en;
  }
  async function decouper(blobs){
    // toutes les pages bout à bout (une diapositive peut finir une page et commencer la suivante), marges latérales rognées
    const imgs = await Promise.all(blobs.map(b => createImageBitmap(b))), W0 = imgs[0].width, cut = Math.round(W0 * .03), w = W0 - 2 * cut;
    const FONDU = Math.round(W0 * .06); // raccord en fondu entre deux pages (pas de marche dans le dégradé du fond)
    const h0 = imgs.reduce((a, i) => a + i.height, 0) - FONDU * (imgs.length - 1);
    const src = document.createElement("canvas"); src.width = w; src.height = h0; const scx = src.getContext("2d");
    { let o = 0; imgs.forEach((im, n) => {
        if(n === 0){ scx.drawImage(im, cut, 0, w, im.height, 0, 0, w, im.height); o = im.height; return; }
        o -= FONDU;
        const t = document.createElement("canvas"); t.width = w; t.height = FONDU; const tx = t.getContext("2d");
        tx.drawImage(im, cut, 0, w, FONDU, 0, 0, w, FONDU);
        const g = tx.createLinearGradient(0, 0, 0, FONDU); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
        tx.globalCompositeOperation = "destination-in"; tx.fillStyle = g; tx.fillRect(0, 0, w, FONDU);
        scx.drawImage(t, 0, o);
        scx.drawImage(im, cut, FONDU, w, im.height - FONDU, 0, o + FONDU, w, im.height - FONDU); o += im.height;
      }); }
    // 1. on resserre les grands vides de la page (entre deux sections, au-dessus des photos…) à 90 px au plus
    const e0 = energie(scx, w, h0), V0 = y => e0[y] < 2, GAP = 90, morceaux = [];
    for(let y = 0; y < h0;){ const v = V0(y); let z = y; while(z < h0 && V0(z) === v) z++;
      if(v && z - y > GAP){ morceaux.push([y, y + GAP / 2]); morceaux.push([z - GAP / 2, z]); } else morceaux.push([y, z]); y = z; }
    const h = morceaux.reduce((a, [p, q]) => a + q - p, 0);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const cx = cv.getContext("2d");
    let o = 0; for(const [p, q] of morceaux){ cx.drawImage(src, 0, p, w, q - p, 0, o, w, q - p); o += q - p; }
    // 2. découpe en diapositives, en coupant dans le plus grand espace vide
    const en = energie(cx, w, h), vide = y => en[y] < 2;
    const slides = [], maxH = Math.round((CH - 2 * MARGE) * w / CW);
    let y = 0; while(y < h && vide(y)) y++;
    while(y < h){
      let fin = Math.min(h, y + maxH);
      if(fin < h){
        let best = -1, bestLen = 0, run = 0;
        for(let k = y + Math.round(maxH * .45); k < fin; k++){ if(vide(k)){ run++; if(run >= bestLen){ bestLen = run; best = k - Math.floor(run / 2); } } else run = 0; }
        if(best > 0 && bestLen >= 3) fin = best;
      }
      let a = y, b = fin; while(b > a && vide(b - 1)) b--;
      let plein = 0; for(let k = a; k < b; k++) if(!vide(k)) plein++;
      if(plein > 14){
        const s = document.createElement("canvas"); s.width = CW; s.height = CH; const sx = s.getContext("2d"), k = CW / w;
        const hh = (b - a) * k, rh = Math.max(0, a - 3), rb = Math.min(h - 1, b + 2);
        const hautLibre = a >= 3 && vide(rh), basLibre = b + 2 < h && vide(rb);
        const top = !basLibre ? CH - hh : !hautLibre ? 0 : Math.max(MARGE, Math.round((CH - hh) / 2));
        sx.drawImage(cv, 0, a, w, b - a, 0, top, CW, hh);
        const fond = r => { const t = document.createElement("canvas"); t.width = 12; t.height = 1; t.getContext("2d").drawImage(cv, 0, r, w, 1, 0, 0, 12, 1); return t; }; // ligne de fond lissée
        sx.imageSmoothingQuality = "high";
        if(top > 0) sx.drawImage(fond(hautLibre ? rh : rb), 0, 0, 12, 1, 0, 0, CW, top + 1);
        if(top + hh < CH) sx.drawImage(fond(basLibre ? rb : rh), 0, 0, 12, 1, 0, top + hh - 1, CW, CH - top - hh + 1);
        slides.push(await new Promise(r => s.toBlob(r, "image/png")));
      }
      y = fin; while(y < h && vide(y)) y++;
    }
    return slides;
  }
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
      const opts = {pixelRatio: (CAR ? CW : largeur()) / W, width: W, height: H, style: {transform: "none", position: "static", margin: "0", left: "0", top: "0"}};
      try{ await htmlToImage.toBlob(pages[0], opts); }catch(e){} // 1er passage : charge polices et images (Safari)
      const blobs = [], brutes = [];
      for(let i = 0; i < pages.length; i++){
        body.innerHTML = `<p class="mintro">Préparation ${CAR ? "du carrousel" : "des images" + (HD ? " haute définition" : "")}… page ${i+1} / ${pages.length}</p>`;
        const bl = await htmlToImage.toBlob(pages[i], CAR ? {...opts, pixelRatio: CW / (W * .94), filter: n => !(n.classList && n.classList.contains("foot"))} : opts);
        if(CAR) brutes.push(bl);
        else blobs.push(HD && !window.EXPORT_LARGEUR ? await png300(bl) : bl);
      }
      if(CAR){ body.innerHTML = `<p class="mintro">Découpage du carrousel…</p>`; blobs.push(...await decouper(brutes)); }
      const base = nomBase();
      const pad = n => String(n).padStart(2, "0");
      files = blobs.map((b, i) => new File([b], CAR ? `${base}-carrousel-${pad(i+1)}.png` : `${base}${blobs.length > 1 ? "-" + (i+1) : ""}${HD ? "-HD" : ""}.png`, {type: "image/png"}));
      urls = blobs.map(b => URL.createObjectURL(b));
      const peutPartager = !!(navigator.canShare && navigator.canShare({files}));
      const modes = `<div class="immodes" role="tablist"><button class="${CAR ? "" : "on"}" data-mode="pages">Pages A4</button><button class="${CAR ? "on" : ""}" data-mode="car">Carrousel Instagram / Facebook</button></div>`;
      if(CAR) body.innerHTML = modes + `<p class="mintro">${files.length} diapositive${files.length>1?"s":""} au format carrousel <b>1080 × 1350 (4:5)</b>, pour Instagram et Facebook : chaque page est découpée entre deux blocs, sans couper le texte. Publiez-les dans l'ordre (jusqu'à 20 par publication sur Instagram).
        ${peutPartager ? "« Partager » les envoie directement vers Instagram, Facebook… depuis le téléphone." : "Sur téléphone, un appui long sur une image permet de l'enregistrer dans Photos."}</p>
        <div class="imgrid car">${urls.map((u, i) => `<a href="${u}" download="${esc(files[i].name)}" title="Télécharger cette diapositive"><img src="${u}" alt="Diapositive ${i+1}"><span>${i+1} / ${urls.length}</span></a>`).join("")}</div>`;
      else body.innerHTML = modes + `<p class="mintro">${files.length} image${files.length>1?"s":""} (une par page, ${largeur()} px de large${HD && !window.EXPORT_LARGEUR ? ", soit 300 dpi en A4" : ""}), prête${files.length>1?"s":""} ${HD ? "pour l'impression" : "pour une publication Facebook"}.${HD ? " <b>Pour Meljet ou un imprimeur, préférez « Télécharger le PDF »</b> : le texte y reste vectoriel, donc net à toutes les tailles, alors qu'une image peut être recompressée par la plateforme." : ""}
        ${peutPartager ? "« Partager » ouvre directement Facebook, Messages, WhatsApp… depuis le téléphone." : "Sur téléphone, un appui long sur une image permet aussi de l'enregistrer dans Photos."}</p>
        <div class="imgrid">${urls.map((u, i) => `<a href="${u}" download="${esc(files[i].name)}" title="Télécharger cette page"><img src="${u}" alt="Page ${i+1}"><span>Page ${i+1}</span></a>`).join("")}</div>`;
      body.querySelectorAll("[data-mode]").forEach(bt => bt.addEventListener("click", () => { const c = bt.dataset.mode === "car"; if(c === CAR) return; CAR = c; try{ localStorage.setItem("atelier:imgCar:" + location.pathname, CAR ? "1" : "0"); }catch(e){} urls.forEach(u => URL.revokeObjectURL(u)); urls = []; files = []; window.exportImages(); }));
      foot.innerHTML = (CAR ? `<span></span>` : `<button class="mbtn" id="imHD" title="${HD ? "Images plus légères, pour Facebook et l'écran" : "300 dpi : impression"}">${HD ? "Version standard (Facebook)" : "Version haute définition (300 dpi)"}</button>`) + `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        ${peutPartager ? `<button class="mbtn" id="imShare">Partager</button>` : ""}
        <button class="mbtn pri" id="imDl">${files.length > 1 ? "Tout télécharger (.zip)" : "Télécharger l'image"}</button></div>`;
      if(!CAR) foot.querySelector("#imHD").addEventListener("click", () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; files = []; window.exportImages(!HD); });
      const sh = foot.querySelector("#imShare");
      if(sh) sh.addEventListener("click", async () => {
        try{ await navigator.share({files, title: window.titreExport()}); }
        catch(e){ if(e.name !== "AbortError") toast("Partage impossible : utilisez « Télécharger »"); }
      });
      foot.querySelector("#imDl").addEventListener("click", async () => {
        if(files.length === 1) return telecharger(files[0], files[0].name);
        await loadScript(VENDOR + "jszip.min.js");
        const zip = new JSZip(); files.forEach(f => zip.file(f.name, f));
        telecharger(await zip.generateAsync({type: "blob"}), base + (CAR ? "-carrousel.zip" : "-images.zip"));
      });
    }catch(e){
      body.innerHTML = `<p class="merr">Les images n'ont pas pu être générées (${esc(e.message || String(e))}). Réessayez, ou utilisez le PDF.</p>`;
      foot.innerHTML = `<span></span><button class="mbtn" data-x>Fermer</button>`;
    }
  };
})();
