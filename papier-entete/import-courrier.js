"use strict";

(() => {
  const fichierCourrier = document.querySelector("#fichier-courrier");
  const etat = document.querySelector("#etat-import-courrier");
  const corps = document.querySelector('[data-champ="courrier"]');
  const objet = document.querySelector('[data-champ="objet"]');
  const bibliotheques = new Map();

  function chargerBibliotheque(nom) {
    if (!bibliotheques.has(nom)) {
      bibliotheques.set(nom, new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `../commun/vendor/${nom}`;
        script.onload = resolve;
        script.onerror = () => {
          bibliotheques.delete(nom);
          script.remove();
          reject(new Error("L’outil de lecture n’a pas pu se charger. Réessayez."));
        };
        document.head.appendChild(script);
      }));
    }
    return bibliotheques.get(nom);
  }

  function textePage(items) {
    const paragraphes = [];
    let lignes = [];
    let ligne = "";
    let yPrecedent;
    let hauteurPrecedente = 0;
    let xPrecedent = 0;
    for (const item of items) {
      if (!item.str) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      const ecart = yPrecedent === undefined ? 0 : Math.abs(yPrecedent - y);
      if (ecart > 2 || (yPrecedent !== undefined && ligne === "")) {
        if (ligne.trim()) lignes.push(ligne.trim());
        ligne = "";
        if (ecart > 1.55 * Math.max(hauteurPrecedente, item.height, 1) ||
            (lignes.length === 1 && /^Objet\s*:/i.test(lignes[0]))) {
          if (lignes.length) paragraphes.push(lignes.join(" "));
          lignes = [];
        }
      }
      const espace = ligne && !/\s$/.test(ligne) && !/^\s/.test(item.str) &&
        x - xPrecedent > Math.max(item.height, 1) * .18;
      ligne += espace ? ` ${item.str}` : item.str;
      if (item.hasEOL && ligne.trim()) {
        lignes.push(ligne.trim());
        ligne = "";
      }
      yPrecedent = y;
      hauteurPrecedente = item.height;
      xPrecedent = x + item.width;
    }
    if (ligne.trim()) lignes.push(ligne.trim());
    if (lignes.length) paragraphes.push(lignes.join(" "));
    return paragraphes.join("\n\n");
  }

  async function extraire(fichier) {
    const nom = fichier.name.toLowerCase();
    if (nom.endsWith(".docx")) {
      await chargerBibliotheque("mammoth.browser.min.js");
      return (await mammoth.extractRawText({arrayBuffer: await fichier.arrayBuffer()})).value;
    }
    if (nom.endsWith(".doc")) {
      throw new Error("Pour importer un ancien fichier Word .doc, enregistrez-le d’abord au format .docx.");
    }
    if (!nom.endsWith(".pdf")) {
      throw new Error("Choisissez un fichier Word (.docx) ou PDF.");
    }

    await chargerBibliotheque("pdf.min.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "../commun/vendor/pdf.worker.min.js";
    const lecture = pdfjsLib.getDocument({data: new Uint8Array(await fichier.arrayBuffer()), isEvalSupported: false});
    try {
      const documentPdf = await lecture.promise;
      const pages = [];
      for (let numero = 1; numero <= documentPdf.numPages; numero++) {
        const page = await documentPdf.getPage(numero);
        pages.push(textePage((await page.getTextContent()).items));
      }
      const texte = pages.filter(Boolean).join("\n\n");
      if (!texte.trim()) {
        throw new Error("Ce PDF ne contient pas de texte sélectionnable. S’il s’agit d’un scan, convertissez-le d’abord en PDF avec reconnaissance de texte.");
      }
      return texte;
    } finally {
      await lecture.destroy();
    }
  }

  function afficherEtat(message, erreur = false) {
    etat.hidden = false;
    etat.textContent = message;
    etat.toggleAttribute("data-erreur", erreur);
  }

  fichierCourrier.addEventListener("change", async () => {
    const fichier = fichierCourrier.files[0];
    if (!fichier) return;
    afficherEtat("Lecture du courrier en cours…");
    fichierCourrier.disabled = true;
    try {
      let texte = (await extraire(fichier)).trim();
      if (!texte) throw new Error("Le document ne contient pas de texte à importer.");
      const ligneObjet = texte.match(/^Objet[ \t]*:[ \t]*([^\r\n]+)$/im);
      if (!objet.value.trim() && ligneObjet && ligneObjet[1].trim().length <= objet.maxLength) {
        objet.value = ligneObjet[1].trim();
        texte = texte.replace(ligneObjet[0], "").replace(/\n{3,}/g, "\n\n").trim();
      }
      corps.value = [corps.value.trim(), texte].filter(Boolean).join("\n\n");
      corps.dispatchEvent(new Event("input", {bubbles: true}));
      afficherEtat("Courrier importé. Relisez le texte et complétez les champs utiles avant impression.");
    } catch (erreur) {
      const message = erreur instanceof Error && erreur.message.endsWith(".")
        ? erreur.message
        : "Impossible de lire ce document. Vérifiez qu’il s’ouvre correctement et qu’il est accessible sans mot de passe.";
      afficherEtat(message, true);
    } finally {
      fichierCourrier.value = "";
      fichierCourrier.disabled = false;
    }
  });
})();
