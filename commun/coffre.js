// Coffre chiffré (AES-GCM 256, clé dérivée d'une phrase secrète par PBKDF2-SHA256).
// Le fichier publié sur le site ne contient que des données chiffrées ; la phrase secrète n'est jamais publiée.
"use strict";
window.COFFRE = (function(){
  const ITER = 600000;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const norm = p => String(p||"").normalize("NFC").trim();
  async function rawKey(phrase, salt, iter){
    const base = await crypto.subtle.importKey("raw", enc.encode(norm(phrase)), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2", hash:"SHA-256", salt, iterations:iter||ITER}, base, 256));
  }
  const aes = raw => crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt","decrypt"]);
  async function chiffrer(obj, phrase){
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const k = await aes(await rawKey(phrase, salt, ITER));
    const data = await crypto.subtle.encrypt({name:"AES-GCM", iv}, k, enc.encode(JSON.stringify(obj)));
    return {v:1, alg:"PBKDF2-SHA256/AES-GCM-256", iter:ITER, salt:b64(salt), iv:b64(iv), data:b64(data)};
  }
  // Renvoie {obj, cle} ; cle (base64) peut être gardée sur l'appareil pour ne pas redemander la phrase.
  async function ouvrir(fichier, phrase){
    const raw = await rawKey(phrase, unb64(fichier.salt), fichier.iter);
    return {obj: await ouvrirAvecCle(fichier, b64(raw)), cle: b64(raw)};
  }
  async function ouvrirAvecCle(fichier, cle){
    const k = await aes(unb64(cle));
    const clair = await crypto.subtle.decrypt({name:"AES-GCM", iv:unb64(fichier.iv)}, k, unb64(fichier.data));
    return JSON.parse(dec.decode(clair));
  }
  return {chiffrer, ouvrir, ouvrirAvecCle};
})();
