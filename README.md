# Atelier UNAC

Générateurs de documents pour les délégués UNAC Air France, mis en ligne sur **florianunac.github.io/atelier-unac/**.

## Organisation

| Dossier | Contenu |
|---|---|
| `index.html` | Page d'accueil : la liste des outils. |
| `commun/` | Charte partagée par tous les outils : polices (`polices/`), logo, avion, titres LC/MC, fond (`img/`), icônes, référentiel des escales (`escales.js`), globes des zones (`globes.js`), bibliothèques de lecture PDF/Word (`vendor/`). |
| `cr-hebergement/` | Compte rendu mensuel de la commission hébergement LC/MC. |
| `bloc-notes/` | Bloc’ Notes : bulletin d'informations utiles (encadré « Important à savoir », rubriques avec pictos). |

Pour ajouter un outil : créer un dossier à la racine, s'appuyer sur `commun/`, puis ajouter une tuile dans `index.html`.

## CR commission hébergement

- Saisie par zone (trigramme + texte) ou **import des notes** d'un délégué (PDF texte, Word, texte collé ; emojis ignorés).
- Mise en page A4 automatique (frame UNAC), pagination et export PDF.
- **Historique** : brouillons et CR publiés, mémorisés sur l'appareil. « Publier » fige un CR.
- **Publication pour tous** : si un jeton GitHub (droit « Contents : read and write » sur ce dépôt) est enregistré sur l'appareil de l'administrateur (Historique → Publication pour tous les délégués), chaque CR publié est déposé dans `cr-hebergement/publies/` et apparaît dans l'historique de tous.
- Visuel de fin facultatif : déposer une photo détourée en `commun/img/pnc-hebergement.png`.
