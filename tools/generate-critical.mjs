import { generate } from "critical";
import fs from "node:fs";
import path from "node:path";

// Fonction pour trouver les CSS générés par Hugo
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
    extract: false,

    css: localCssFiles,

    penthouse: {
      keepLargerMediaQueries: true,
      blockJSRequests: false,
      forceInclude: [
        ".navbar",
        ".site-navigation",
        ".navbar-brand",
        ".navbar-brand img",
        ".site-hero",
        ".site-hero *", // Force tout le contenu interne (titre, img, description)
        ".grand-titre",
        ".column-section",
        ".hero-description",
        ".btn",
        ".btn-area", // Pour l'effet de survol du bouton
        ".approach-container",
        ".connecting-line-svg",
        ".about-section", // Stabilise la section suivante
      ],
    },

    // ON AUGMENTE LA HAUTEUR (height) pour que Penthouse "voie" bien tout le hero
    dimensions: [
      { height: 1200, width: 375 }, // Mobile (plus haut pour capturer le flux)
      { height: 1200, width: 1440 }, // Desktop
      { height: 1200, width: 1920 }, // Ultra-wide
    ],

    include: [
      // 1. FONDATIONS & TYPO
      /:root/,
      /html/,
      /body/,
      /\.grand-titre/,
      /line-height/, // Force la conservation des hauteurs de ligne

      // 2. STRUCTURE (VITAL POUR LE REBOND)
      /\.container/,
      /\.row/,
      /\.col-/,
      /\.d-flex/,
      /\.d-block/,
      /\.position-relative/,
      /\.about-section/, // Sécurité pour empêcher la remontée

      // 3. NAVIGATION & LOGO
      /\.site-navigation/,
      /\.navbar/,
      /\.navbar-brand/,
      /\.nav-link/,
      /\.btn-sm-rounded/,

      // 4. HERO SECTION (Correction précise)
      /\.site-hero/,
      /\.site-hero img/,
      /\.column-section/,
      /\.hero-description/,
      /\.hero-actions/,
      /\.btn-pixi/,

      // 5. SECTION APPROCHE
      /\.approach-wrapper/,
      /\.approach-container/,
      /\.connecting-line-svg/,
      /\.approach-card/,
      /\.icon-wrapper/,

      // 6. ÉLÉMENTS DYNAMIQUES
      /\.embla/,
      /\.embla__container/,
      /\.cookie-banner/,
    ],
  });
})();
