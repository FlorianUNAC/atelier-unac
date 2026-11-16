"use strict";

const editeur = document.querySelector(".editeur");
const champs = Object.fromEntries(
  [...editeur.querySelectorAll("[data-champ]")].map(champ => [champ.dataset.champ, champ])
);
const papier = document.querySelector(".papier");
const filigrane = papier.querySelector(".filigrane");
const infoExemple = document.querySelector("#info-exemple");
const fichierSignature = document.querySelector("#fichier-signature");
const imageSignature = document.querySelector("#image-signature");
const retirerSignature = document.querySelector("#retirer-signature");
const erreurSignature = document.querySelector("#erreur-signature");
let urlSignature;
let selectionSignature = 0;
const boutonImprimer = editeur.querySelector('[type="submit"]');
const exemple = {
  destinataire: "Lorem ipsum",
  fonction: "Dolor sit amet",
  adresse: "Consectetur adipiscing elit\nSed do eiusmod tempor",
  "date-lettre": "Lorem ipsum, 16 novembre 2026",
  objet: "Objet : Lorem ipsum dolor sit amet",
  courrier: "Lorem ipsum dolor sit amet,\n\nConsectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.",
  signataire: "Lorem ipsum",
  mandat: "Dolor sit amet"
};
const lieuInitial = champs.lieu.defaultValue.trim();
const apercus = [...document.querySelectorAll("[data-apercu]")];
const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function actualiser() {
  const valeurs = Object.fromEntries(
    Object.entries(champs).map(([nom, champ]) => [nom, champ.value.trim()])
  );
  const enExemple = !urlSignature && !Object.entries(valeurs).some(([nom, valeur]) =>
    nom === "lieu" ? valeur !== lieuInitial : Boolean(valeur)
  );
  papier.classList.toggle("en-exemple", enExemple);
  filigrane.hidden = !enExemple;
  infoExemple.hidden = !enExemple;
  boutonImprimer.disabled = enExemple;

  const dateSaisie = champs.date.valueAsDate;
  const date = dateSaisie ? formatDate.format(dateSaisie) : "";
  valeurs["date-lettre"] = [valeurs.lieu, date ? `le ${date}` : ""].filter(Boolean).join(", ");
  valeurs.objet = valeurs.objet ? `Objet : ${valeurs.objet}` : "";

  const contenu = enExemple ? exemple : valeurs;
  for (const apercu of apercus) {
    const valeur = contenu[apercu.dataset.apercu];
    apercu.textContent = valeur;
    apercu.hidden = !valeur;
  }
}

function afficherSignature(url) {
  if (urlSignature?.startsWith("blob:")) URL.revokeObjectURL(urlSignature);
  urlSignature = url;
  imageSignature.hidden = !url;
  retirerSignature.hidden = !url;
  if (url) imageSignature.src = url;
  else imageSignature.removeAttribute("src");
  actualiser();
}

fichierSignature.addEventListener("change", async () => {
  const fichier = fichierSignature.files[0];
  if (!fichier) return;
  erreurSignature.hidden = true;
  const selection = ++selectionSignature;
  const formats = ["image/png", "image/jpeg", "image/webp"];
  const url = formats.includes(fichier.type) ? URL.createObjectURL(fichier) : null;
  try {
    if (!url) throw new Error("Format non pris en charge");
    const image = new Image();
    image.src = url;
    await image.decode();
  } catch {
    if (url) URL.revokeObjectURL(url);
    if (selection !== selectionSignature) return;
    fichierSignature.value = "";
    erreurSignature.textContent = "Image illisible. Choisissez un fichier PNG, JPEG ou WebP.";
    erreurSignature.hidden = false;
    return;
  }
  if (selection === selectionSignature) afficherSignature(url);
  else URL.revokeObjectURL(url);
});

retirerSignature.addEventListener("click", () => {
  selectionSignature++;
  fichierSignature.value = "";
  erreurSignature.hidden = true;
  afficherSignature();
  fichierSignature.focus();
});

const dialogueDessin = document.querySelector("#dessin-signature");
const zoneDessin = dialogueDessin.querySelector("canvas");
const trace = zoneDessin.getContext("2d");
const validerDessin = document.querySelector("#valider-dessin");
const effacerDessin = document.querySelector("#effacer-dessin");
const epaisseur = 5;
let pointeurActif = null;
let dernierPoint;
let limites;

function effacerTrace() {
  trace.clearRect(0, 0, zoneDessin.width, zoneDessin.height);
  pointeurActif = null;
  limites = null;
  validerDessin.disabled = true;
  effacerDessin.disabled = true;
}

function tracerPoint(event) {
  const cadre = zoneDessin.getBoundingClientRect();
  const x = Math.max(0, Math.min(zoneDessin.width, (event.clientX - cadre.left) * zoneDessin.width / cadre.width));
  const y = Math.max(0, Math.min(zoneDessin.height, (event.clientY - cadre.top) * zoneDessin.height / cadre.height));
  trace.beginPath();
  if (dernierPoint) {
    trace.moveTo(dernierPoint.x, dernierPoint.y);
    trace.lineTo(x, y);
    trace.stroke();
  } else {
    trace.arc(x, y, epaisseur / 2, 0, Math.PI * 2);
    trace.fill();
  }
  dernierPoint = {x, y};
  limites = limites ? {
    gauche: Math.min(limites.gauche, x), droite: Math.max(limites.droite, x),
    haut: Math.min(limites.haut, y), bas: Math.max(limites.bas, y)
  } : {gauche: x, droite: x, haut: y, bas: y};
  validerDessin.disabled = false;
  effacerDessin.disabled = false;
}

trace.lineWidth = epaisseur;
trace.lineCap = "round";
trace.strokeStyle = trace.fillStyle = "#201823";

zoneDessin.addEventListener("pointerdown", event => {
  if (pointeurActif !== null || event.button !== 0) return;
  pointeurActif = event.pointerId;
  dernierPoint = null;
  zoneDessin.setPointerCapture(event.pointerId);
  tracerPoint(event);
});
zoneDessin.addEventListener("pointermove", event => {
  if (event.pointerId === pointeurActif) tracerPoint(event);
});
zoneDessin.addEventListener("pointerup", event => {
  if (event.pointerId === pointeurActif) tracerPoint(event);
});
zoneDessin.addEventListener("lostpointercapture", event => {
  if (event.pointerId === pointeurActif) pointeurActif = null;
});

document.querySelector("#dessiner-signature").addEventListener("click", () => {
  effacerTrace();
  dialogueDessin.showModal();
});
document.querySelector("#annuler-dessin").addEventListener("click", () => dialogueDessin.close());
effacerDessin.addEventListener("click", effacerTrace);
validerDessin.addEventListener("click", () => {
  if (!limites) return;
  const marge = 12;
  const x = Math.max(0, Math.floor(limites.gauche) - marge);
  const y = Math.max(0, Math.floor(limites.haut) - marge);
  const sortie = document.createElement("canvas");
  sortie.width = Math.min(zoneDessin.width, Math.ceil(limites.droite) + marge) - x;
  sortie.height = Math.min(zoneDessin.height, Math.ceil(limites.bas) + marge) - y;
  sortie.getContext("2d").drawImage(zoneDessin, x, y, sortie.width, sortie.height, 0, 0, sortie.width, sortie.height);
  selectionSignature++;
  fichierSignature.value = "";
  erreurSignature.hidden = true;
  afficherSignature(sortie.toDataURL("image/png"));
  dialogueDessin.close();
});

async function imprimer(vierge) {
  if (document.documentElement.classList.contains("verrou")) return;
  await document.fonts.ready;
  document.documentElement.classList.toggle("impression-vierge", vierge);
  window.print();
}

editeur.addEventListener("input", actualiser);
editeur.addEventListener("submit", event => {
  event.preventDefault();
  if (!boutonImprimer.disabled) imprimer(false);
});
document.querySelector("#modele-vierge").addEventListener("click", () => imprimer(true));
window.addEventListener("afterprint", () => document.documentElement.classList.remove("impression-vierge"));
actualiser();
