// Accès réservé aux délégués : code à 4 chiffres demandé à l'ouverture de l'Atelier.
// Seule l'empreinte SHA-256 du code figure ici (le code lui-même n'est écrit nulle part).
// Une fois le code saisi, l'appareil est reconnu pendant 90 jours.
(function(){
  "use strict";
  const EMPREINTE = "e24c003d840be1f0bee113cea77b5442448b0c347848c950bc4cc44bbe2bad65";
  const CLE = "atelier:acces", DUREE = 90 * 864e5;
  const base = new URL(".", document.currentScript.src).href;
  try{
    const v = JSON.parse(localStorage.getItem(CLE) || "null");
    if(v && v.h === EMPREINTE && Date.now() - v.t < DUREE) return;
  }catch(e){}

  const css = `
  html.verrou, html.verrou body{overflow:hidden!important}
  #verrou{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;
    background:#4f1a30 url("${base}img/fond-hebergement.jpg") center/cover no-repeat;color:#fff;
    font-family:"T1",Inter,system-ui,-apple-system,sans-serif}
  #verrou .vbox{width:100%;max-width:360px;text-align:center}
  #verrou .vlogo{height:78px;margin-bottom:22px}
  #verrou h2{font-size:20px;font-weight:700;letter-spacing:.04em;margin:0}
  #verrou p{font-size:14px;opacity:.82;margin:8px 0 26px;line-height:1.4}
  #verrou .vcases{display:flex;gap:12px;justify-content:center}
  #verrou input{width:58px;height:68px;border-radius:14px;border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);
    color:#fff;font-size:30px;font-weight:700;text-align:center;outline:none;caret-color:#fff;-webkit-text-security:disc;font-family:inherit}
  #verrou input:focus{border-color:#fff;background:rgba(255,255,255,.2)}
  #verrou .verr{min-height:20px;margin-top:16px;font-size:13px;color:#ffd0dd}
  #verrou .vbox.ko .vcases{animation:vko .4s}
  @keyframes vko{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  #verrou .vfoot{margin-top:28px;font-size:12px;opacity:.6}`;
  document.documentElement.classList.add("verrou");
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  async function empreinte(code){
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("atelier-unac:" + code));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
  }

  function monter(){
    const v = document.createElement("div"); v.id = "verrou";
    v.innerHTML = `<div class="vbox" role="dialog" aria-modal="true" aria-labelledby="vtitre">
      <img class="vlogo" src="${base}img/logo-unac-blanc.png" alt="UNAC">
      <h2 id="vtitre">Espace réservé aux délégués UNAC</h2>
      <p>Saisissez le code d'accès à 4 chiffres.</p>
      <div class="vcases">${[0,1,2,3].map(i => `<input inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="off" aria-label="Chiffre ${i+1}">`).join("")}</div>
      <div class="verr" aria-live="polite"></div>
      <div class="vfoot">Code oublié ? Demandez-le à votre section UNAC.</div></div>`;
    document.body.appendChild(v);
    const ins = [...v.querySelectorAll("input")], box = v.querySelector(".vbox"), err = v.querySelector(".verr");
    ins[0].focus();
    async function verifier(){
      const code = ins.map(i => i.value).join("");
      if(code.length < 4) return;
      if(await empreinte(code) === EMPREINTE){
        try{ localStorage.setItem(CLE, JSON.stringify({h:EMPREINTE, t:Date.now()})); }catch(e){}
        v.remove(); document.documentElement.classList.remove("verrou");
        window.dispatchEvent(new Event("resize"));
      } else {
        err.textContent = "Code incorrect.";
        box.classList.remove("ko"); void box.offsetWidth; box.classList.add("ko");
        ins.forEach(i => i.value = ""); ins[0].focus();
      }
    }
    ins.forEach((inp, k) => {
      inp.addEventListener("input", () => {
        inp.value = inp.value.replace(/\D/g, "").slice(-1);
        if(inp.value && k < 3) ins[k+1].focus();
        err.textContent = ""; verifier();
      });
      inp.addEventListener("keydown", e => { if(e.key === "Backspace" && !inp.value && k > 0){ ins[k-1].focus(); ins[k-1].value = ""; } });
      inp.addEventListener("paste", e => {
        const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
        if(t.length){ e.preventDefault(); t.split("").forEach((d, j) => { if(ins[j]) ins[j].value = d; }); ins[Math.min(t.length, 3)].focus(); verifier(); }
      });
    });
  }
  if(document.body) monter(); else document.addEventListener("DOMContentLoaded", monter);
})();
