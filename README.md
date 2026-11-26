# Atelier UNAC

Générateurs de documents pour les délégués UNAC Air France, mis en ligne sur **florianunac.github.io/atelier-unac/**.

## Organisation

| Dossier | Contenu |
|---|---|
| `index.html` | Page d'accueil : la liste des outils. |
| `commun/` | Charte partagée par tous les outils : polices (`polices/`), logo, avion, titres LC/MC, fond (`img/`), icônes, référentiel des escales (`escales.js`), globes des zones (`globes.js`), bibliothèques de lecture PDF/Word (`vendor/`). |
| `cr-hebergement/` | Compte rendu mensuel de la commission hébergement LC/MC. |
| `newsletter/` | Newsletter par sections et blocs (modèle : lettre Mutuelle MNPAF de novembre 2026). Pictos dans `commun/img/pictos/`. |
| `chrono/` | Chrono’ : posts Facebook / Instagram (carré, 4:5, story ; plusieurs visuels pour un carrousel), export PNG 1080 px. |
| `bloc-notes/` | Bloc’ Notes : bulletin d'informations utiles (encadré « Important à savoir », rubriques avec pictos). |

Pour ajouter un outil : créer un dossier à la racine, s'appuyer sur `commun/`, puis ajouter une tuile dans `index.html`.

## CR commission hébergement

- Saisie par zone (trigramme + texte) ou **import des notes** d'un délégué (PDF texte, Word, texte collé ; emojis ignorés).
- Mise en page A4 automatique (frame UNAC), pagination et export PDF.
- **Historique** : brouillons et CR publiés, mémorisés sur l'appareil. « Publier » fige un CR.
- **Publication pour tous** : si un jeton GitHub (droit « Contents : read and write » sur ce dépôt) est enregistré sur l'appareil de l'administrateur (Historique → Publication pour tous les délégués), chaque CR publié est déposé dans `cr-hebergement/publies/` et apparaît dans l'historique de tous.
- Visuel de fin facultatif : déposer une photo détourée en `commun/img/pnc-hebergement.png`.

## Newsletter : formulaire de contribution

- `formulaires/newsletter-contribution.pdf` : PDF remplissable pour un rédacteur (en-tête, « En bref », message de la section, 8 rubriques avec encadré et mise en garde, remarques non publiées).
- Le PDF rempli se dépose dans l'outil Newsletter (bouton d'import) : champs `nl_*` lus dans le navigateur, mise en page automatique.
- Régénérer : `UNAC_PDF_FONT_DIR=… python3 scripts/generate-formulaire-newsletter.py`.
