"use strict";

const editeur = document.querySelector(".editeur");
const champs = Object.fromEntries(
  [...editeur.querySelectorAll("[data-champ]")].map(champ => [champ.dataset.champ, champ])
);
const apercus = [...document.querySelectorAll("[data-apercu]")];
const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function actualiser() {
  const valeurs = Object.fromEntries(
    Object.entries(champs).map(([nom, champ]) => [nom, champ.value.trim()])
  );
  const dateSaisie = champs.date.valueAsDate;
  const date = dateSaisie ? formatDate.format(dateSaisie) : "";
  valeurs["date-lettre"] = [valeurs.lieu, date ? `le ${date}` : ""].filter(Boolean).join(", ");
  valeurs.objet = valeurs.objet ? `Objet : ${valeurs.objet}` : "";

  for (const apercu of apercus) {
    const valeur = valeurs[apercu.dataset.apercu];
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
  imprimer(false);
});
document.querySelector("#modele-vierge").addEventListener("click", () => imprimer(true));
window.addEventListener("afterprint", () => document.documentElement.classList.remove("impression-vierge"));
actualiser();
