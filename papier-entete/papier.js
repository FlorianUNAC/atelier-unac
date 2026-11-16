"use strict";

const editeur = document.querySelector(".editeur");
const champs = Object.fromEntries(
  [...editeur.querySelectorAll("[data-champ]")].map(champ => [champ.dataset.champ, champ])
);
const papier = document.querySelector(".papier");
const filigrane = papier.querySelector(".filigrane");
const infoExemple = document.querySelector("#info-exemple");
const boutonImprimer = editeur.querySelector('[type="submit"]');
const exemple = {
  destinataire: "Madame la Directrice",
  fonction: "Direction des relations sociales",
  adresse: "Siège de la compagnie\n95700 Roissy-en-France",
  "date-lettre": "Roissy, le 16 novembre 2026",
  objet: "Objet : Demande de réunion sur les conditions de travail des PNC",
  courrier: "Madame la Directrice,\n\nNous souhaitons vous rencontrer pour échanger sur les conditions de travail des personnels navigants commerciaux.\n\nPlusieurs collègues nous ont fait part de difficultés liées à l’organisation des rotations. Nous aimerions vous présenter leurs retours et examiner avec vous les mesures envisageables.\n\nPourriez-vous nous proposer un créneau de réunion au cours des prochaines semaines ?\n\nNous vous prions d’agréer, Madame la Directrice, nos salutations respectueuses.",
  signataire: "Camille Martin",
  mandat: "Pour la section UNAC Air France"
};
const lieuInitial = champs.lieu.defaultValue.trim();
const apercus = [...document.querySelectorAll("[data-apercu]")];
const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function actualiser() {
  const valeurs = Object.fromEntries(
    Object.entries(champs).map(([nom, champ]) => [nom, champ.value.trim()])
  );
  const enExemple = !Object.entries(valeurs).some(([nom, valeur]) =>
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
