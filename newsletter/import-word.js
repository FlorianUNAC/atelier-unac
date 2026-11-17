// Newsletter : import d'un texte Word (.docx), texte brut ou collé, puis mise en forme automatique.
// Structure reconnue : Titre 1 = titre de la newsletter, Titre 2 = section, Titre 3 / ligne en gras = encadré,
// listes, tableaux, chiffres clés, « Attention / À noter » ; deux encadrés courts côte à côte = deux colonnes.
"use strict";
(function(){
  const $ = s => document.querySelector(s);
  const escH = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const sansEmoji = s => String(s||"").replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, "").replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
  const chargerScript = src => new Promise((ok, ko) => { if(window.mammoth && /mammoth/.test(src)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("chargement impossible")); document.head.appendChild(s); });

  // HTML (Word via mammoth) -> texte de bloc : **gras**, sans balises
  function texteDe(node){
    let out = "";
    node.childNodes.forEach(n => {
      if(n.nodeType === 3) out += n.nodeValue;
      else if(n.nodeType === 1){
        const t = n.tagName.toLowerCase();
        if(t === "br") out += "\n";
        else if(t === "strong" || t === "b"){ const raw = texteDe(n), x = raw.trim(); if(x) out += (/^\s/.test(raw) ? " " : "") + `**${x}**` + (/\s$/.test(raw) ? " " : ""); else out += raw; }
        else if(t === "em" || t === "i" || t === "u"){ const m = t === "u" ? "__" : "*", raw = texteDe(n), x = raw.trim(); if(x && !/^\*\*.*\*\*$/.test(x)) out += (/^\s/.test(raw) ? " " : "") + m + x + m + (/\s$/.test(raw) ? " " : ""); else out += raw; }
        else out += texteDe(n);
      }
    });
    return out.replace(/\*\*\s*\*\*/g, "").replace(/\*\*([^*]+)\*\*\*\*([^*]+)\*\*/g, "**$1$2**");
  }
  const toutGras = n => { const t = n.textContent.trim(); if(!t) return false; const b = [...n.querySelectorAll("strong,b")].map(x => x.textContent).join("").replace(/\s/g, ""); return b.length >= t.replace(/\s/g, "").length * 0.9; };
  // Titre en deux parties : la fin en couleur (dernier mot, ou ce qui suit « : »)
  function coupe(t){ t = sansEmoji(t).replace(/[.:]$/, ""); const i = t.indexOf(" : "); if(i > 0) return [t.slice(0, i), t.slice(i+3)]; const m = t.match(/^(.*\S)\s+(\S+)$/); return m ? [m[1], m[2]] : [t, ""]; }
  // Picto de section selon les mots du titre
  const PICTO_MOTS = [["appli",/appli|application|numerique|en ligne|espace adherent/],["lit",/hospital|hopital|clinique/],["etranger",/etranger|international|expatri|voyage/],["fonds",/fonds social|solidarit|aide|secours/],["reclamation",/reclamation|litige|recours|contest/],["elus",/elu|representant|delegue|conseil|assemblee|qui fait quoi/],["factures",/rembours|facture|document|devis|justificatif|tarif|cotisation/]];
  const pictoPour = t => { const n = norm(t); const p = PICTO_MOTS.find(([, re]) => re.test(n)); return p ? p[0] : ""; };

  // Ligne « chiffre clé » : 0,5 % de la masse salariale…
  const RE_CHIFFRE = /^\**\s*([+-]?\d[\d\s.,]*)\s*(%|€|k€|M€|euros?|jours?|mois|ans?|h|heures?|pts?)?\**\s+(.{3,140})$/i;
  const estAlerte = t => /^(\*\*)?\s*(attention|important|alerte|vigilance|a savoir|à savoir)\b/i.test(t);
  const estNote = t => /^(\*\*)?\s*(a noter|à noter|bon a savoir|bon à savoir|rappel|info|astuce|nb)\b/i.test(t);

  // Analyse : renvoie {titre, sous, sections:[{titre, blocs:[...]}]}
  // Document sans titres (un mail, par exemple) : les lignes en gras deviennent des sections,
  // les lignes qui suivent un « : » et finissent par « ; » forment une liste, la signature est regroupée.
  function structurerMail(div){
    if(div.querySelector("h1,h2,h3")) return;
    const ps = [...div.children];
    const gras = n => n.tagName === "P" && toutGras(n) && n.textContent.trim().length <= 90;
    const nbGras = ps.filter(gras).length;
    ps.forEach((n, i) => {
      if(!gras(n)) return;
      // signature : lignes en gras après « Bien amicalement / Cordialement… »
      const prev = ps.slice(0, i).reverse().find(x => x.textContent.trim());
      if(prev && (/^(bien )?(amicalement|cordialement|a bientot|bien a vous|salutations)/i.test(norm(prev.textContent.trim())) || prev.dataset.sign)){ n.dataset.sign = "1"; return; }
      if(nbGras >= 1){ const h = document.createElement("h2"); h.textContent = n.textContent.trim(); n.replaceWith(h); }
    });
    // listes implicites
    const kids = [...div.children];
    for(let i = 0; i < kids.length; i++){
      const n = kids[i]; if(n.tagName !== "P" || !/:\s*$/.test(n.textContent.trim())) continue;
      const items = []; let j = i + 1;
      while(j < kids.length && kids[j].tagName === "P"){ const t = kids[j].textContent.trim(); if(t.length > 160 || !/[;.]$/.test(t)) break; items.push(kids[j]); j++; if(/\.$/.test(t)) break; }
      if(items.length >= 2 && items.slice(0, -1).every(x => /;$/.test(x.textContent.trim()))){
        const ul = document.createElement("ul"); items.forEach(x => { const li = document.createElement("li"); li.innerHTML = x.innerHTML.replace(/[;.]\s*$/, ""); ul.appendChild(li); x.remove(); }); n.after(ul); i = j - 1;
      }
    }
  }
  function analyserHTML(html){
    const div = document.createElement("div"); div.innerHTML = html;
    structurerMail(div);
    const res = {titre:null, sous:"", sections:[]}; let sec = null, encadre = null;
    const nouvelleSection = titre => { sec = {titre:titre ? sansEmoji(titre) : "", blocs:[]}; res.sections.push(sec); encadre = null; };
    const blocs = () => { if(!sec) nouvelleSection(""); return sec.blocs; };
    const ajouterTexte = (t, dansEncadre = true) => {
      if(encadre && dansEncadre){ encadre.texte += (encadre.texte ? "\n" : "") + t; return; }
      const bl = blocs(), der = bl[bl.length-1];
      if(der && der.type === "texte") der.texte += "\n" + t; else bl.push({type:"texte", texte:t});
    };
    [...div.children].forEach(n => {
      const tag = n.tagName.toLowerCase(), brut = sansEmoji(texteDe(n));
      if(!brut && tag !== "table") return;
      if(tag === "h1"){ if(!res.titre) res.titre = n.textContent.trim(); else nouvelleSection(n.textContent); return; }
      if(tag === "h2"){ nouvelleSection(n.textContent); return; }
      if(n.dataset && n.dataset.sign){ const bl = blocs(), d = bl[bl.length-1]; if(d && d.type === "texte") d.texte += "\n" + brut; else bl.push({type:"texte", texte:brut}); return; }
      if(/^h[3-6]$/.test(tag) || (tag === "p" && toutGras(n) && n.textContent.trim().length <= 90)){
        const t = sansEmoji(n.textContent).replace(/:$/, "");
        if(!sec && !res.sous && res.titre && t.length < 120){ res.sous = t; return; }
        encadre = {type:"encadre", style: estAlerte(t) ? "alerte" : estNote(t) ? "fonce" : "clair", titre:t, texte:""}; blocs().push(encadre); return;
      }
      if(tag === "p"){
        if(!sec && res.titre && !res.sous && brut.length < 140 && !res.sections.length){ res.sous = brut.replace(/\*\*/g, ""); return; }
        if(estAlerte(brut) || estNote(brut)){
          encadre = null; const m = brut.replace(/\*\*/g, "").match(/^([^:!.]{2,30})\s*[:!]\s*(.+)$/);
          blocs().push({type:"encadre", style: estAlerte(brut) ? "alerte" : "fonce", titre: m ? m[1].trim() : "", texte: m ? m[2].trim().replace(/^./, c => c.toUpperCase()) : brut}); return;
        }
        // consigne introduite par « : » et suivie d'une liste -> encadré d'action
        const suiv = n.nextElementSibling;
        if(/:\s*$/.test(brut) && suiv && /^(ul|ol)$/i.test(suiv.tagName) && !encadre){ encadre = {type:"encadre", style:"clair", titre:"", texte:brut, action:true}; blocs().push(encadre); return; }
        if(encadre && encadre.action && encadre.listeFaite){
          if(brut.length < 260 && /repon|adress|contact|envoy|transmet|retour/i.test(norm(brut))){ encadre.texte += "\n" + brut; encadre = null; return; }
          encadre = null;
        }
        ajouterTexte(brut); return;
      }
      if(tag === "ul" || tag === "ol"){
        const items = [...n.querySelectorAll(":scope > li")].map(li => sansEmoji(texteDe(li)).replace(/\n+/g, " ")).filter(Boolean);
        if(!items.length) return;
        const titreBold = items.every(x => /^\*\*[^*]+\*\*/.test(x));
        if(tag === "ol" && items.length >= 2 && items.length <= 4 && items.every(x => x.length < 220)){
          // étapes : « **Titre** suite » ou « Titre : suite »
          encadre = null;
          blocs().push({type:"etapes", texte: items.map(x => { let m = x.match(/^\*\*([^*]+)\*\*\s*[:–-]?\s*(.*)$/) || x.match(/^([^:]{2,60})\s*:\s*(.+)$/); return m ? `${m[1].trim()} | ${m[2].trim()}` : x; }).join("\n")});
          return;
        }
        if(!encadre && titreBold && items.length >= 3 && items.every(x => x.length < 160)){ blocs().push({type:"enbref", titreA:"En", titreB:"bref", texte:items.join("\n")}); return; }
        ajouterTexte(items.map((x, i) => tag === "ol" ? `${i+1}) ${x}` : `- ${x}`).join("\n")); if(encadre) encadre.listeFaite = true; return;
      }
      if(tag === "table"){
        const rangs = [...n.querySelectorAll("tr")].map(tr => [...tr.children].map(td => sansEmoji(texteDe(td)).replace(/\n+/g, " ").replace(/\|/g, "/")));
        const r = rangs.filter(x => x.some(c => c));
        if(!r.length) return; encadre = null;
        const nb = r.slice(1).flat().filter(c => /\d/.test(c)).length, tot = r.slice(1).flat().length || 1;
        if(r[0].length === 2 && r.length >= 3 && nb / tot < .3 && !r[0].every(c => /^\*\*/.test(c))) blocs().push({type:"roles", titre:"", texte:r.map(x => x.join(" | ")).join("\n")});
        else blocs().push({type:"tableau", texte:r.map(x => x.map(c => c.replace(/\*\*/g, "")).join(" | ")).join("\n"), grand: nb / tot > .6});
        return;
      }
      ajouterTexte(brut);
    });
    return optimiser(res);
  }

  // Optimisation de la mise en forme
  function optimiser(res){
    res.sections.forEach(s => {
      const out = [];
      s.blocs.forEach(b => {
        if(b.type === "encadre" && !b.texte.trim() && b.titre){ out.push({type:"texte", texte:`**${b.titre}**`}); return; }
        // paragraphes « chiffre clé » consécutifs -> bloc Chiffres clés (2 à 4)
        if(b.type === "texte"){
          const lignes = b.texte.split("\n"), groupes = []; let cur = [];
          const push = () => { if(cur.length){ groupes.push(cur); cur = []; } };
          lignes.forEach(l => { const m = l.replace(/\*\*/g, "").match(RE_CHIFFRE); if(m && !/^\d{4}$/.test(m[1].trim())){ if(cur.type !== "c"){ push(); cur.type = "c"; } cur.push(m); } else { if(cur.type !== "t"){ push(); cur.type = "t"; } cur.push(l); } });
          push();
          groupes.forEach(g => {
            if(g.type === "c" && g.length >= 2 && g.length <= 4) out.push({type:"chiffres", texte:g.map(m => `${m[1].trim()} | ${(m[2]||"").trim()} | ${m[3].trim()}`).join("\n")});
            else out.push({type:"texte", texte: g.type === "c" ? g.map(m => m.input).join("\n") : g.join("\n")});
          });
          return;
        }
        out.push(b);
      });
      // fusion des textes consécutifs
      const f = [];
      out.forEach(b => { const d = f[f.length-1]; if(d && d.type === "texte" && b.type === "texte") d.texte += "\n" + b.texte; else f.push(b); });
      // deux encadrés courts qui se suivent -> deux colonnes
      const g = [];
      for(let i = 0; i < f.length; i++){
        const a = f[i], b = f[i+1], court = x => x && x.type === "encadre" && (x.titre.length + x.texte.length) < 420;
        if(court(a) && court(b)){ g.push({type:"colonnes", gStyle:a.style === "alerte" ? "alerte" : "clair", gTitre:a.titre, gTexte:a.texte, dStyle:b.style === "clair" ? "fonce" : b.style, dTitre:b.titre, dTexte:b.texte, dAlerteTitre:"", dAlerteTexte:""}); i++; }
        else g.push(a);
      }
      s.blocs = g;
    });
    res.sections = res.sections.filter(s => s.titre || s.blocs.length);
    return res;
  }

  // Texte brut (collé, .txt) : lignes en MAJUSCULES ou « # » = section, ligne finissant par « : » = encadré
  function texteVersHTML(t){
    const L = sansEmoji(t).split(/\r?\n/), h = []; let ul = null, ol = null;
    const fl = () => { if(ul){ h.push(`<ul>${ul.map(x => `<li>${escH(x)}</li>`).join("")}</ul>`); ul = null; } if(ol){ h.push(`<ol>${ol.map(x => `<li>${escH(x)}</li>`).join("")}</ol>`); ol = null; } };
    L.map(l => l.trim()).forEach((l, i) => {
      let m;
      if(!l){ fl(); return; }
      if((m = l.match(/^[-•*]\s+(.*)/))){ if(ol) fl(); (ul = ul || []).push(m[1]); return; }
      if((m = l.match(/^\d+[).]\s+(.*)/))){ if(ul) fl(); (ol = ol || []).push(m[1]); return; }
      fl();
      if((m = l.match(/^(#{1,3})\s*(.*)/))) h.push(`<h${m[1].length}>${escH(m[2])}</h${m[1].length}>`);
      else if(l.length <= 70 && l === l.toUpperCase() && /[A-Z]/.test(l)) h.push(i === 0 ? `<h1>${escH(l)}</h1>` : `<h2>${escH(l)}</h2>`);
      else if(l.length <= 80 && /:$/.test(l)) h.push(`<h3>${escH(l)}</h3>`);
      else h.push(`<p>${escH(l)}</p>`);
    });
    fl(); return h.join("");
  }

  /* ---------- Interface ---------- */
  let RES = null;
  const NOMS = {texte:"Texte", enbref:"En bref", encadre:"Encadré", colonnes:"Deux colonnes", etapes:"Étapes", chiffres:"Chiffres clés", tableau:"Tableau", roles:"Tableau clé / valeur"};
  function resume(r){
    const nb = r.sections.reduce((n, s) => n + s.blocs.length, 0);
    return `<p class="hint" style="color:#23764a;margin:12px 0 8px">✓ ${r.sections.length} section${r.sections.length>1?"s":""}, ${nb} bloc${nb>1?"s":""} mis en forme automatiquement${r.titre ? ` · titre : « ${escH(r.titre)} »` : ""}</p>
      <div class="ires">${r.sections.map((s, i) => `<div><span>${escH(s.titre || `Section ${i+1}`)}</span><span>${s.blocs.map(b => `<i class="tagb">${NOMS[b.type]||b.type}${b.type === "encadre" && b.style === "alerte" ? " (attention)" : ""}</i>`).join(" ")}</span></div>`).join("")}</div>
      ${r.titre ? `<label class="chk" style="margin-top:10px"><input type="checkbox" id="nwTitre"> Utiliser « ${escH(r.titre)} » comme titre de la newsletter</label>` : ""}`;
  }
  function montrer(r){ RES = r; $("#nwRes").innerHTML = r.sections.length ? resume(r) : `<p class="mintro" style="color:#a3263b">Aucun contenu reconnu.</p>`; $("#nwOk").disabled = $("#nwAdd").disabled = !r.sections.length; }
  async function lireFichier(f){
    if(!f) return; $("#nwRes").innerHTML = `<p class="mintro">Lecture de « ${escH(f.name)} »…</p>`;
    try{
      let html;
      if(/\.docx$/i.test(f.name)){
        await chargerScript("../commun/vendor/mammoth.browser.min.js");
        html = (await mammoth.convertToHtml({arrayBuffer: await f.arrayBuffer()}, {styleMap:["p[style-name='Title'] => h1:fresh","p[style-name='Titre'] => h1:fresh","p[style-name='Subtitle'] => h3:fresh","p[style-name='Sous-titre'] => h3:fresh"]})).value;
      } else if(/\.(txt|md)$/i.test(f.name) || /^text\//.test(f.type)) html = texteVersHTML(await f.text());
      else throw new Error("format non pris en charge : utilisez un fichier Word (.docx) ou texte");
      $("#nwTxt").value = ""; montrer(analyserHTML(html));
    }catch(e){ $("#nwRes").innerHTML = `<p class="mintro" style="color:#a3263b">Fichier illisible : ${escH(e.message)}</p>`; }
  }
  function appliquer(ajout){
    const r = RES; if(!r) return;
    const mk = window.NL_API;
    const sections = r.sections.map(s => { const [a, b] = coupe(s.titre || ""); return {id:mk.uid(), titreA:a, titreB:b, picto:pictoPour(s.titre), fond:"auto", blocs:s.blocs.map(b => Object.assign(mk.nouveauBloc(b.type), b, {id:mk.uid()}))}; });
    const S = mk.etat();
    if(ajout) S.sections.push(...sections);
    else S.sections = sections;
    if($("#nwTitre") && $("#nwTitre").checked){ const [a, b] = coupe(r.titre); S.titreA = a; S.titreB = b; if(r.sous) S.sous = r.sous; }
    $("#nwModal").classList.remove("on"); mk.changed(true);
    mk.toast(ajout ? "Texte ajouté à la suite : mise en page recalculée" : "Texte importé : mise en page optimisée automatiquement");
  }
  function monter(){
    const css = document.createElement("style"); css.textContent = `
      .importbtn{width:100%;display:flex;gap:12px;align-items:center;text-align:left;border:0;cursor:pointer;margin-bottom:12px;padding:13px 14px;border-radius:14px;color:#fff;background:linear-gradient(100deg,#a8376a,#7a2a4e)}
      .importbtn svg{width:26px;height:26px;flex:none}.importbtn b{display:block;font-size:14.5px}.importbtn small{display:block;font-size:12px;opacity:.85;margin-top:2px}
      #nwModal .drop{display:flex;flex-direction:column;align-items:center;gap:4px;border:2px dashed #e7dbe2;border-radius:14px;padding:22px;cursor:pointer;text-align:center;color:#8b6f80}
      #nwModal .drop b{color:#7a2a4e;font-size:15px}#nwModal .drop.over{border-color:#c8487f;background:#fdf3f7}
      #nwModal textarea{width:100%;min-height:120px;border:1px solid #e7dbe2;border-radius:9px;padding:8px 10px;font:inherit}
      #nwModal .ires{border:1px solid #e7dbe2;border-radius:12px;overflow:hidden}
      #nwModal .ires div{display:grid;grid-template-columns:200px 1fr;gap:10px;padding:8px 12px;border-top:1px solid #e7dbe2;font-size:13px}
      #nwModal .ires div:first-child{border-top:0}#nwModal .ires div > span:first-child{font-weight:700;color:#7a2a4e}
      #nwModal .tagb{display:inline-block;font-style:normal;background:#f6eef2;border-radius:6px;padding:2px 7px;margin:0 4px 4px 0;font-size:12px}
      #nwModal .hint{font-size:12.5px;color:#8b6f80;line-height:1.45}`;
    document.head.appendChild(css);
    const m = document.createElement("div"); m.className = "modal"; m.id = "nwModal";
    m.innerHTML = `<div class="mbox" role="dialog" aria-modal="true">
      <div class="mhead"><h3>Importer le texte de la newsletter</h3><button class="mclose" data-x aria-label="Fermer">×</button></div>
      <div class="mbody">
        <p class="mintro">Déposez le document Word de la newsletter. Les <b>titres</b> du document deviennent les sections, les <b>sous-titres</b> ou lignes en gras des encadrés, les <b>listes</b> des puces, étapes ou « En bref », les <b>tableaux</b> des tableaux, les chiffres en début de ligne des <b>chiffres clés</b>, « Attention » ou « À noter » des encadrés colorés. La mise en page (pages, densité, colonnes) est ensuite optimisée automatiquement. Rien ne quitte l'appareil.</p>
        <label class="drop" id="nwDrop"><input type="file" id="nwFile" accept=".docx,.txt,.md" hidden><b>Choisir le fichier Word</b><span>ou le glisser ici · .docx, ou texte</span></label>
        <label class="f" style="margin-top:14px">… ou coller le texte</label>
        <textarea id="nwTxt" placeholder="TITRE DE SECTION EN MAJUSCULES&#10;Paragraphe…&#10;Sous-titre d'encadré :&#10;- puce&#10;1) étape"></textarea>
        <div id="nwRes"></div>
      </div>
      <div class="mfoot"><button class="mbtn" id="nwAnalyse">Analyser le texte collé</button><span style="flex:1"></span><button class="mbtn" id="nwAdd" disabled>Ajouter à la suite</button><button class="mbtn pri" id="nwOk" disabled>Remplacer le contenu</button></div></div>`;
    document.body.appendChild(m);
    m.addEventListener("click", e => { if(e.target === m || e.target.hasAttribute("data-x")) m.classList.remove("on"); });
    $("#nwFile").addEventListener("change", e => { lireFichier(e.target.files[0]); e.target.value = ""; });
    const dz = $("#nwDrop");
    ["dragenter","dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave","drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", e => lireFichier(e.dataTransfer.files[0]));
    $("#nwAnalyse").addEventListener("click", () => { const t = $("#nwTxt").value; if(!t.trim()) return window.NL_API.toast("Collez d'abord le texte"); montrer(analyserHTML(texteVersHTML(t))); });
    $("#nwOk").addEventListener("click", () => { if(window.NL_API.aDuContenu() && !confirm("Remplacer les sections actuelles par le texte importé ?")) return; appliquer(false); });
    $("#nwAdd").addEventListener("click", () => appliquer(true));
    document.addEventListener("click", e => { if(e.target.closest("#nwOpen")){ RES = null; $("#nwRes").innerHTML = ""; $("#nwTxt").value = ""; $("#nwOk").disabled = $("#nwAdd").disabled = true; m.classList.add("on"); } });
  }
  window.NL_IMPORT = {bouton: () => `<button class="importbtn" id="nwOpen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6M9 14l3-3 3 3"/></svg><span><b>Importer le texte depuis Word</b><small>Sections, encadrés, listes, tableaux et chiffres clés mis en forme automatiquement</small></span></button>`, analyserHTML, texteVersHTML};
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", monter); else monter();
})();
