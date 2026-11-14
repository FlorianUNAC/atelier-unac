// Délégués référents par commission. Photos détourées dans commun/img/referents/.
// h = hauteur d'affichage de la photo en bas de page (px, page A4 = 1123 px) ; les photos sont dessinées
// de gauche à droite dans l'ordre de la liste, la suivante passant devant la précédente.
window.REFERENTS = {
  hebergement: {
    LC: { titre: "Vos référentes hébergement long-courrier",
          personnes: [ {prenom:"Manelle", nom:"Boumenikra", photo:"lc-manelle.png", h:300},
                       {prenom:"Elsa", nom:"Gilardi", photo:"lc-elsa.png", h:281} ] },
    MC: { titre: "Vos référents hébergement moyen-courrier",
          noms: [ {prenom:"Chrystel", nom:"Marin"}, {prenom:"Bruno", nom:"Phebidias"} ],
          personnes: [ {prenom:"Bruno", nom:"Phebidias", photo:"mc-bruno.png", h:314},
                       {prenom:"Chrystel", nom:"Marin", photo:"mc-chrystel.png", h:289, chevauche:34} ] }
  }
};
