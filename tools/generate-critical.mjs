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
      forceInclude: [
        ".navbar",
        ".navbar-expand-lg",
        ".site-navigation",
        ".fixed-top",
        ".navbar-brand",
        ".navbar-collapse",
        ".site-hero",
        ".grand-titre",
        ".btn-primary",
        ".btn-sm",
      ],
    },

    dimensions: [
      { height: 800, width: 375 }, // Mobile
      { height: 900, width: 1440 }, // Laptop
      { height: 1080, width: 1920 }, // Grand écran
    ],

    // --- LA LISTE DE SÉCURITÉ ---
    include: [
      // 1. LES FONDATIONS
      /:root/,
      /--site-margin/,
      /html/,
      /body/, // Contient souvent le padding-top pour le menu fixe

      // 2. STRUCTURE & GRILLE
      /\.container/,
      /\.row/,
      /\.col-/,
      /\.d-block/,
      /\.d-none/,
      /\.d-lg-/,
      /\.img-fluid/,
      /\.position-relative/, // TRES IMPORTANT pour vos éléments absolus
      /\.z-/, // Les z-index (z-1, z-2...)

      // 3. NAVIGATION (Menu Fixe)
      /\.navbar/,
      /\.nav/,
      /\.site-navigation/, // Contient position: fixed
      /\.icon-bar/,
      /\.collapse/,
      /\.scrolled/, // Si vous avez une classe quand on scroll

      // 4. HERO SECTION
      /\.site-hero/,
      /\.site-hero::before/,
      /\.grand-titre/,
      /\.hero-description/,
      /\.hero-actions/,
      /\.btn-pixi/,
      /\.btn/,

      // 5. SECTION APPROCHE (C'est ici que le SVG sautait !)
      /\.approach-section/, // Le conteneur global
      /\.approach-wrapper/, // Wrapper
      /\.approach-container/, // Le parent RELATIF du SVG (VITAL)
      /\.connecting-line-svg/, // Le SVG lui-même
      /\.bg-hashtag/, // Le gros # en fond
      /\.approach-card/, // Les cartes
      /\.icon-wrapper/, // Les icônes
      /\.section-headline/, // Les titres de section

      // 6. ÉLÉMENTS DYNAMIQUES
      /\.embla/,
      /\.embla__container/,
      /\.embla__slide/,
      /\.card/,
      /\.testimonial/,
      /\.cookie-banner/,

      /\.approach-section/,
      /\.approach-wrapper/,
      /\.approach-container/,
      /\.connecting-line-svg/,
      /overflow-hidden/, // Si tu l'utilises
      /position-relative/,
    ],
  });
})();
