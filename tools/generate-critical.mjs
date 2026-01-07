import { generate } from "critical";
import fs from "node:fs";
import path from "node:path";

// Fonction pour trouver les CSS générés par Hugo (avec le hash)
function getCssFiles(dir) {
  try {
    const files = fs.readdirSync(dir);
    return files
      .filter((name) => name.endsWith(".css"))
      .map((name) => path.join(dir, name));
  } catch (e) {
    return [];
  }
}

// On récupère TOUS les CSS locaux pour éviter les erreurs 404 pendant le build
const localCssFiles = [
  ...getCssFiles("public/css/"),
  ...getCssFiles("public/scss/"),
];

console.log("🎨 Fichiers CSS locaux trouvés :", localCssFiles);

(async () => {
  await generate({
    base: "public/",
    src: "index.html",
    target: "index.html",
    inline: true,
    extract: false, // On ne touche PAS au fichier CSS original (sécurité maximale)

    css: localCssFiles,

    // Configuration avancée pour le moteur de rendu
    penthouse: {
      keepLargerMediaQueries: true, // Garde les règles Desktop même si on scanne en mobile
      forceInclude: [".site-hero", ".navbar", ".grand-titre"],
    },

    dimensions: [
      { height: 800, width: 375 }, // Mobile
      { height: 900, width: 1440 }, // Laptop
      { height: 1080, width: 1920 }, // Grand écran
    ],

    // --- LA LISTE DE SÉCURITÉ ---
    include: [
      // 1. LES FONDATIONS & VARIABLES (Indispensable pour vos marges --site-margin)
      /:root/,
      /--site-margin/,
      /html/,
      /body/,

      // 2. LA GRILLE & STRUCTURE (Pour éviter que tout soit à gauche)
      /\.container/,
      /\.row/,
      /\.col-/,
      /\.d-block/, // Utilitaires d'affichage
      /\.d-none/, // Vital pour cacher le menu mobile sur desktop
      /\.d-lg-/,
      /\.img-fluid/, // Pour que les images ne débordent pas

      // 3. LA NAVIGATION (Pour éviter le "Flash" du menu déconstruit)
      /\.navbar/,
      /\.nav/,
      /\.site-navigation/,
      /\.icon-bar/, // Le burger menu
      /\.collapse/, // L'état fermé du menu

      // 4. LE HERO (Le haut de page visible immédiatement)
      /\.site-hero/,
      /\.site-hero::before/, // Souvent utilisé pour l'overlay sombre sur l'image
      /\.grand-titre/,
      /\.hero-description/,
      /\.hero-actions/,
      /\.btn-pixi/, // Vos boutons personnalisés
      /\.btn/, // Boutons Bootstrap

      /\.cookie-banner/, // Si la bannière s'affiche vite
    ],
  });
})();
