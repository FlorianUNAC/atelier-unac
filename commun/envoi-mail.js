// Envoi par e-mail d'un document de l'Atelier : génère le PDF dans le navigateur, puis
//  - téléphone / tablette / Mac : partage natif avec le PDF en pièce jointe (appli Mail, Gmail, Outlook…)
//  - ordinateur : télécharge le PDF et ouvre un e-mail prérempli (messagerie, Gmail ou Outlook web) où il suffit de glisser le fichier.
// Le site est statique : aucun serveur n'envoie le message, rien ne transite par l'Atelier.
// La page hôte définit : renderPreview(), nomExport(), titreExport(), toast(), esc() ; facultatif : enExemple(), mailDefaut().
"use strict";
(function(){
  const VENDOR = new URL("vendor/", document.currentScript.src).href;
  const CLE = "atelier:mailDest";
  const loaded = {};
  const loadScript = src => loaded[src] || (loaded[src] = new Promise((ok, ko) => {
    const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("chargement impossible")); document.head.appendChild(s);
  }));
  const st = document.createElement("style");
  st.textContent = `#mailModal .mbox{width:min(560px,100%)}
    #mailModal .mbody{padding:16px 18px;overflow:auto}
    #mailModal label.f{display:block;font-size:12px;font-weight:700;color:#7a5a6a;margin:10px 0 4px}
    #mailModal input,#mailModal textarea,#mailModal select{width:100%}
    #mailModal textarea{min-height:110px}
    #mailModal .aide{font-size:12px;color:#7a5a6a;line-height:1.45;margin-top:12px;background:#faf3f6;border-radius:10px;padding:10px 12px}
    #mailModal .ok{font-size:13.5px;line-height:1.5;color:#3b2430}
    #mailModal .ok b{color:#B33866}
    #mailModal a.mbtn{text-decoration:none;display:inline-flex;align-items:center}
    #mailModal a.mbtn:not(.pri){color:#3b2430}
    #mailModal .web{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}`;
  document.head.appendChild(st);

  const M = document.createElement("div");
  M.className = "modal"; M.id = "mailModal";
  M.innerHTML = `<div class="mbox" role="dialog" aria-modal="true" aria-labelledby="mlTitle">
    <div class="mhead"><h3 id="mlTitle">Envoyer par e-mail</h3><button class="mclose" data-x aria-label="Fermer">×</button></div>
    <div class="mbody" id="mlBody"></div><div class="mfoot" id="mlFoot"></div></div>`;
  document.body.appendChild(M);
  const body = M.querySelector("#mlBody"), foot = M.querySelector("#mlFoot");
  M.addEventListener("click", e => { if(e.target === M || e.target.hasAttribute("data-x")) M.classList.remove("on"); });
  const e_ = s => window.esc ? window.esc(s) : String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  /* ---- PDF minimal : une image JPEG pleine page par page A4 ---- */
  function pdfDepuisJpeg(pages){ // pages : [{bytes:Uint8Array, w, h}]
    const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
    const push = x => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, s) => { offs[n] = len; push(`${n} 0 obj\n${s}\nendobj\n`); };
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const n = pages.length, kids = pages.map((_, i) => `${3 + i*3} 0 R`).join(" ");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
    pages.forEach((p, i) => {
      const pg = 3 + i*3, ct = pg + 1, im = pg + 2, W = 595.28, H = +(W * p.h / p.w).toFixed(2);
      obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /I${i} ${im} 0 R >> >> /Contents ${ct} 0 R >>`);
      const c = `q ${W} 0 0 ${H} 0 0 cm /I${i} Do Q`;
      obj(ct, `<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
      offs[im] = len;
      push(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);
      push(p.bytes); push("\nendstream\nendobj\n");
    });
    const total = 3 + n*3, xref = len;
    let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for(let k = 1; k < total; k++) x += String(offs[k]).padStart(10, "0") + " 00000 n \n";
    push(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, {type: "application/pdf"});
  }
  async function genererPdf(etat, hd){
    renderPreview();
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    await Promise.all([...document.querySelectorAll("#pages img")].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    await loadScript(VENDOR + "html-to-image.js");
    const pages = [...document.querySelectorAll("#pages .page")];
    const W = pages[0].offsetWidth || 794, H = pages[0].offsetHeight || 1123, ratio = (hd ? 2480 : 1600) / W; // HD = A4 à 300 dpi (2480 × 3508 px)
    const opts = {pixelRatio: ratio, width: W, height: H, quality: hd ? .96 : .9, backgroundColor: "#ffffff", style: {transform: "none", position: "static", margin: "0", left: "0", top: "0"}};
    try{ await htmlToImage.toJpeg(pages[0], opts); }catch(e){} // 1er passage : polices et images (Safari)
    const out = [];
    for(let i = 0; i < pages.length; i++){
      etat(`Préparation du PDF… page ${i+1} / ${pages.length}`);
      const url = await htmlToImage.toJpeg(pages[i], opts), bin = atob(url.split(",")[1]), bytes = new Uint8Array(bin.length);
      for(let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
      out.push({bytes, w: Math.round(W * ratio), h: Math.round(H * ratio)});
    }
    return new File([pdfDepuisJpeg(out)], window.nomExport() + ".pdf", {type: "application/pdf"});
  }
  const telecharger = f => { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); };
  const valide = s => s.split(/[;,\s]+/).filter(Boolean).every(a => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a));
  const liens = (to, sujet, msg) => {
    const q = encodeURIComponent, dest = to.split(/[;,\s]+/).filter(Boolean).join(",");
    return {
      mailto: `mailto:${dest}?subject=${q(sujet)}&body=${q(msg)}`,
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${q(dest)}&su=${q(sujet)}&body=${q(msg)}`,
      outlook: `https://outlook.office.com/mail/deeplink/compose?to=${q(dest)}&subject=${q(sujet)}&body=${q(msg)}`
    };
  };

  window.envoyerMail = function(){
    if(window.enExemple && enExemple()) return toast("Remplissez d’abord le document : l’aperçu n’est qu’un exemple");
    let dest = ""; try{ dest = localStorage.getItem(CLE) || ""; }catch(e){}
    let qDef = "std"; try{ qDef = localStorage.getItem(CLE + "Q") || "std"; }catch(e){}
    const titre = window.titreExport ? window.titreExport() : document.title;
    const msgDef = (window.mailDefaut && mailDefaut()) || `Bonjour,\n\nVous trouverez ci-joint « ${titre} ».\n\nBien cordialement,\nVos délégués UNAC`;
    body.innerHTML = `<label class="f" for="mlTo">Destinataire(s)</label>
      <input type="text" id="mlTo" inputmode="email" autocomplete="email" placeholder="prenom.nom@exemple.fr ; autre@exemple.fr" value="${e_(dest)}">
      <label class="f" for="mlSub">Objet</label><input type="text" id="mlSub" value="${e_(titre)}">
      <label class="f" for="mlQ">Qualité du PDF</label>
      <select id="mlQ"><option value="std">Standard · fichier léger, pour lecture à l'écran</option><option value="hd" ${qDef === "hd" ? "selected" : ""}>Haute définition 300 dpi · impression</option></select>
      <p class="aide" style="margin-top:6px">Pour <b>Meljet</b> ou un imprimeur, le plus net reste « Télécharger le PDF » puis « Enregistrer au format PDF » : le texte y reste vectoriel, net à toutes les tailles.</p>
      <label class="f" for="mlMsg">Message</label><textarea id="mlMsg">${e_(msgDef)}</textarea>
      <p class="aide">Le PDF est fabriqué sur votre appareil puis joint au message dans votre propre messagerie : l'e-mail part de votre adresse, rien ne transite par l'Atelier.</p>`;
    foot.innerHTML = `<span></span><div style="display:flex;gap:8px"><button class="mbtn" data-x>Annuler</button><button class="mbtn pri" id="mlGo">Préparer l'envoi</button></div>`;
    M.classList.add("on"); setTimeout(() => M.querySelector("#mlTo").focus(), 50);
    foot.querySelector("#mlGo").addEventListener("click", async () => {
      const to = M.querySelector("#mlTo").value.trim(), sujet = M.querySelector("#mlSub").value.trim(), msg = M.querySelector("#mlMsg").value;
      if(to && !valide(to)){ toast("Adresse e-mail invalide"); M.querySelector("#mlTo").focus(); return; }
      const hd = M.querySelector("#mlQ").value === "hd";
      try{ localStorage.setItem(CLE, to); localStorage.setItem(CLE + "Q", hd ? "hd" : "std"); }catch(e){}
      body.innerHTML = `<p class="ok" id="mlEtat">Préparation du PDF…</p>`; foot.innerHTML = "";
      let f;
      try{ f = await genererPdf(t => { const x = M.querySelector("#mlEtat"); if(x) x.textContent = t + (hd ? " (haute définition)" : ""); }, hd);
        if(hd) f = new File([f], f.name.replace(/\.pdf$/, "-HD.pdf"), {type: "application/pdf"}); }
      catch(err){ body.innerHTML = `<p class="merr">Le PDF n'a pas pu être généré (${e_(err.message || String(err))}). Utilisez « Télécharger le PDF » puis joignez-le à votre e-mail.</p>`; foot.innerHTML = `<span></span><button class="mbtn" data-x>Fermer</button>`; return; }
      const L = liens(to, sujet, msg), Ko = Math.round(f.size / 1024);
      const ua = navigator.userAgent, mobile = navigator.maxTouchPoints > 0 && /Mobi|Android|iPhone|iPad|Macintosh/.test(ua), safariMac = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Edg/.test(ua);
      const partage = !!(navigator.canShare && navigator.canShare({files: [f]})) && (mobile || safariMac);
      const etapeOrdi = `<p class="ok">Le PDF <b>${e_(f.name)}</b> (${Ko < 1024 ? Ko + " Ko" : (Ko/1024).toFixed(1) + " Mo"}) vient d'être téléchargé.<br>
        Ouvrez votre messagerie : le message est prérempli${to ? ` pour <b>${e_(to)}</b>` : ""}, il reste à <b>glisser le PDF</b> en pièce jointe puis envoyer.</p>
        <div class="web"><a class="mbtn pri" href="${L.mailto}">Messagerie de l'ordinateur</a><a class="mbtn" href="${L.gmail}" target="_blank" rel="noopener">Gmail</a><a class="mbtn" href="${L.outlook}" target="_blank" rel="noopener">Outlook</a></div>`;
      if(partage){
        body.innerHTML = `<p class="ok">Le PDF <b>${e_(f.name)}</b> est prêt.<br>« Envoyer » ouvre le choix de l'application (Mail, Gmail, Outlook…) avec le PDF déjà joint${to ? ` ; le destinataire <b>${e_(to)}</b> est copié, collez-le dans « À »` : ""}.</p>`;
        foot.innerHTML = `<button class="mbtn" id="mlDl">Plutôt sur ordinateur</button><button class="mbtn pri" id="mlShare">Envoyer</button>`;
        foot.querySelector("#mlShare").addEventListener("click", async () => {
          try{ if(to && navigator.clipboard) await navigator.clipboard.writeText(to).catch(() => {}); await navigator.share({files: [f], title: sujet, text: msg}); M.classList.remove("on"); }
          catch(err){ if(err.name !== "AbortError") toast("Partage impossible : utilisez « Plutôt sur ordinateur »"); }
        });
        foot.querySelector("#mlDl").addEventListener("click", () => { telecharger(f); body.innerHTML = etapeOrdi; foot.innerHTML = `<span></span><button class="mbtn" data-x>Terminé</button>`; });
      } else {
        telecharger(f); body.innerHTML = etapeOrdi; foot.innerHTML = `<span></span><button class="mbtn" data-x>Terminé</button>`;
      }
    });
  };
})();
