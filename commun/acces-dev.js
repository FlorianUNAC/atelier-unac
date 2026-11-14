// Verrou des outils « en cours de développement » : code de déverrouillage (mot), demandé en plus du code d'accès.
// Seule l'empreinte du code figure ici. Majuscules et accents ignorés. Reconnu ensuite sur l'appareil.
(function(){
  "use strict";
  const EMPREINTE = "45b38e6da561fd44e42e7f966378db220c0232e0f2f13bc09626c6b1796e708b";
  const CLE = "atelier:dev";
  const base = new URL(".", document.currentScript.src).href;
  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  try{ if(localStorage.getItem(CLE) === EMPREINTE) return; }catch(e){}
  const css = `
  html.verrou-dev, html.verrou-dev body{overflow:hidden!important}
  #verrouDev{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:24px;
    background:#4f1a30 url("${base}img/fond-hebergement.jpg") center/cover no-repeat;color:#fff;font-family:"T1",Inter,system-ui,-apple-system,sans-serif}
  #verrouDev .vbox{width:100%;max-width:380px;text-align:center}
  #verrouDev .vlogo{height:70px;margin-bottom:20px}
  #verrouDev .tag{display:inline-block;background:#F7D160;color:#4f1a30;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:5px 12px;margin-bottom:14px}
  #verrouDev h2{font-size:20px;font-weight:700;margin:0}
  #verrouDev p{font-size:14px;opacity:.82;margin:8px 0 22px;line-height:1.4}
  #verrouDev form{display:flex;gap:8px}
  #verrouDev input{flex:1;min-width:0;height:48px;border-radius:12px;border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;font-size:17px;padding:0 14px;outline:none;font-family:inherit}
  #verrouDev input:focus{border-color:#fff}
  #verrouDev button{height:48px;border:0;border-radius:12px;background:#fff;color:#7a1f48;font-weight:700;padding:0 18px;cursor:pointer;font-family:inherit;font-size:15px}
  #verrouDev .verr{min-height:20px;margin-top:12px;font-size:13px;color:#ffd0dd}
  #verrouDev .ko form{animation:vko .4s}
  #verrouDev a{display:inline-block;margin-top:22px;color:#fff;opacity:.7;font-size:13px}
  @keyframes vko{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`;
  document.documentElement.classList.add("verrou-dev");
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  async function empreinte(code){
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("atelier-unac-dev:" + norm(code)));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
  }
  function monter(){
    const v = document.createElement("div"); v.id = "verrouDev";
    v.innerHTML = `<div class="vbox"><img class="vlogo" src="${base}img/logo-unac-blanc.png" alt="UNAC"><br>
      <span class="tag">En cours de développement</span><h2>Outil bientôt disponible</h2>
      <p>Cet outil est en préparation. Saisissez le code de déverrouillage pour y accéder.</p>
      <form><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Code de déverrouillage" aria-label="Code de déverrouillage"><button>Ouvrir</button></form>
      <div class="verr" aria-live="polite"></div><a href="../">← Retour à l'Atelier</a></div>`;
    document.body.appendChild(v);
    const inp = v.querySelector("input"), box = v.querySelector(".vbox"), err = v.querySelector(".verr");
    setTimeout(() => inp.focus(), 50);
    v.querySelector("form").addEventListener("submit", async e => {
      e.preventDefault();
      if(await empreinte(inp.value) === EMPREINTE){
        try{ localStorage.setItem(CLE, EMPREINTE); }catch(_){}
        v.remove(); document.documentElement.classList.remove("verrou-dev"); window.dispatchEvent(new Event("resize"));
      } else { err.textContent = "Code incorrect."; box.classList.remove("ko"); void box.offsetWidth; box.classList.add("ko"); inp.value = ""; inp.focus(); }
    });
  }
  if(document.body) monter(); else document.addEventListener("DOMContentLoaded", monter);
})();
