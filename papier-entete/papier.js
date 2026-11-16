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
  if (urlSignature) URL.revokeObjectURL(urlSignature);
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
