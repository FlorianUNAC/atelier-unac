// Sections partenaires (Transavia, Volotea, easyJet, La Compagnie, Aircalin) : les outils tournent
// sur la variante « section » (celle de HOP!) avec le logo, l'avion et le nom de la compagnie.
// À charger en premier dans chaque outil. Brouillons enregistrés à part pour chaque section.
"use strict";
(function(){
  const P = {transavia:"Transavia", volotea:"Volotea", easyjet:"easyJet", lacompagnie:"La Compagnie", aircalin:"Aircalin"};
  const id = new URLSearchParams(location.search).get("section");
  // Couleurs des compagnies : les roses UNAC des documents prennent la teinte de la compagnie
  const COUL = {hop:"#E4002B", transavia:"#0ACF78", volotea:"#E4183F", easyjet:"#FF6600", lacompagnie:"#2F86D1", aircalin:"#0D4A9B"};
  if(COUL[id]) teinter(COUL[id]);
  if(!P[id]) return;
  const nom = P[id], IMG = new URL("img/", document.currentScript.src).href;
  window.SECTION_PARTENAIRE = {id, nom};
  // 1) les outils voient une section « hop » (variante section)
  const get0 = URLSearchParams.prototype.get;
  URLSearchParams.prototype.get = function(k){ const v = get0.call(this, k); return k === "section" && v === id ? "hop" : v; };
  // 2) brouillons séparés : les clés « …hop… » deviennent « …<section>… »
  const cle = k => typeof k === "string" && /hop/i.test(k) ? k.replace(/hop/gi, id) : k;
  for(const m of ["getItem", "setItem", "removeItem"]){
    const f = Storage.prototype[m];
    Storage.prototype[m] = function(k, ...r){ return f.call(this, cle(k), ...r); };
  }
  // 3) images et textes HOP! remplacés par ceux de la section
  const REMPL = [
    [/logo-unac-hop-couleur\.png/, IMG + `sections/logo-unac-${id}-couleur.png`],
    [/logo-unac-hop-blanc\.png/, IMG + `sections/logo-unac-${id}-blanc.png`],
    [/(^|\/)hop-blanc\.png/, IMG + `sections/cie-${id}-blanc.png`],
    [/hop-mag\.png/, IMG + `sections/cie-${id}-couleur-bandeau.png`],
    [/avion-hop\.png/, IMG + `avion-${id}.png`],
    [/derive-hop\.png/, IMG + `derives/derive-${id}.png`]
  ];
  const CACHER = /hop-excl\.png|hop-blanc-excl\.png|laure-desrentes\.jpg/;
  const TEXTES = [[/HOP\s?!/g, nom], [/Laure Desrentes/g, "Prénom NOM"]];
  const img = el => {
    const s = el.getAttribute("src") || "";
    if(CACHER.test(s)){ if(el.style.display !== "none") el.style.display = "none"; return; }
    for(const [re, v] of REMPL) if(re.test(s) && s !== v){ el.setAttribute("src", v); if(el.alt) el.alt = el.alt.replace(/HOP\s?!/g, nom); return; }
  };
  const texte = n => { let t = n.nodeValue, u = t; for(const [re, v] of TEXTES) u = u.replace(re, v); if(u !== t) n.nodeValue = u; };
  const passe = root => {
    if(root.nodeType === 3) return texte(root);
    if(root.nodeType !== 1) return;
    if(root.tagName === "IMG") img(root);
    root.querySelectorAll && root.querySelectorAll("img").forEach(img);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while((n = w.nextNode())) texte(n);
    if(root.querySelectorAll) root.querySelectorAll("input[type=text],textarea").forEach(f => { let v = f.value, u = v; for(const [re, r] of TEXTES) u = u.replace(re, r); if(u !== v) f.value = u; });
  };
  const go = () => {
    passe(document.body); document.title = document.title.replace(/HOP\s?!/g, nom);
    new MutationObserver(ms => { for(const m of ms){ if(m.type === "attributes") img(m.target); else if(m.type === "characterData") texte(m.target); else m.addedNodes.forEach(passe); } })
      .observe(document.body, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:["src"]});
  };
  if(document.body) go(); else document.addEventListener("DOMContentLoaded", go);

  function teinter(cible){
    const hx = h => { h = h.replace("#", ""); if(h.length === 3) h = h.split("").map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
    const T = hx(cible), L0 = 0.46; // luminosité du rose UNAC #B33866
    const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m;
      if(!d) return [0, 0, l]; const s = d / (1 - Math.abs(2*l - 1)); let h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if(h < 0) h += 360; return [h, s, l]; };
    const map = rgb => { const [h, s, l] = hsl(rgb); if(s < 0.15 || h < 312 || h > 352) return null;
      const k = l <= L0 ? l / L0 : (l - L0) / (1 - L0), base = l <= L0 ? [0, 0, 0] : [255, 255, 255];
      return l <= L0 ? T.map((c, i) => Math.round(base[i] + (c - base[i]) * k)) : T.map((c, i) => Math.round(c + (255 - c) * k)); };
    const out = v => "#" + v.map(c => c.toString(16).padStart(2, "0")).join("");
    const conv = txt => txt
      .replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, m0 => { const v = map(hx(m0)); return v ? out(v) : m0; })
      .replace(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*,\s*[\d.]+)?\)/g, (m0, r, g, b, a) => { const v = map([+r, +g, +b]); return v ? (a ? `rgba(${v.join(",")}${a})` : `rgb(${v.join(",")})`) : m0; });
    window.TEINTE_SECTION = conv;
    // fonds photo roses (CR hébergement) : recolorés dans la teinte de la compagnie
    const st = document.createElement("style");
    st.textContent = `.page > .fond::after{content:"";position:absolute;inset:0;background:${cible};mix-blend-mode:color;pointer-events:none}`;
    (document.head || document.documentElement).appendChild(st);
    const ATTR = ["style", "fill", "stroke", "stop-color", "color"];
    const fait = new WeakMap(); // ce qui a déjà été teinté (évite de teinter deux fois)
    const el = e => { if(e.nodeType !== 1) return;
      const f = fait.get(e) || {}; fait.set(e, f);
      if(e.tagName === "STYLE"){ const t = e.textContent; if(t !== f._style){ const u = conv(t); f._style = u; if(u !== t) e.textContent = u; } }
      for(const a of ATTR){ const v = e.getAttribute && e.getAttribute(a); if(v && v !== f[a] && /#|rgb/.test(v)){ const u = conv(v); f[a] = u; if(u !== v) e.setAttribute(a, u); } } };
    const tout = r => { el(r); r.querySelectorAll && r.querySelectorAll("style,[style],[fill],[stroke],[stop-color]").forEach(el); };
    const go = () => { tout(document.documentElement);
      new MutationObserver(ms => { for(const m of ms){ if(m.type === "attributes") el(m.target); else m.addedNodes.forEach(n => n.nodeType === 1 ? tout(n) : (n.parentNode && n.parentNode.tagName === "STYLE" && el(n.parentNode))); } })
        .observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:ATTR}); };
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }
})();
