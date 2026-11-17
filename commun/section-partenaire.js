// Sections partenaires (Transavia, Volotea, easyJet, La Compagnie, Aircalin) : les outils tournent
// sur la variante « section » (celle de HOP!) avec le logo, l'avion et le nom de la compagnie.
// À charger en premier dans chaque outil. Brouillons enregistrés à part pour chaque section.
"use strict";
(function(){
  const P = {transavia:"Transavia", volotea:"Volotea", easyjet:"easyJet", lacompagnie:"La Compagnie", aircalin:"Aircalin"};
  const id = new URLSearchParams(location.search).get("section");
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
    [/hop-mag\.png/, IMG + `sections/cie-${id}-rose-bandeau.png`],
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
})();
