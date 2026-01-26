import { generate } from "critical";
import fs from "node:fs";
import path from "node:path";

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
        // 1. STRUCTURE GLOBALE (Empêche le tag <main> de sauter)
        "body",
        "main",
        ".container",
        ".row",

        // 3. HERO SECTION (Fixe l'image 'screens.webp' et le texte)
        ".site-hero",
        ".site-hero img",
        ".column-section",
        ".grand-titre",
        ".hero-description",
        ".hero-actions",

        // 6. CLASSES UTILITAIRES
        ".img-fluid",
        ".d-block",
        ".d-flex",
        ".position-relative",
        ".background-size",
      ],
    },

    // Dimensions augmentées pour capturer le layout sur écrans 2K et stabiliser le flux
    dimensions: [
      { height: 900, width: 375 }, // Mobile
      { height: 1200, width: 1440 }, // Desktop FHD
      { height: 1440, width: 2560 }, // Écran 2K
    ],

    include: [
      /:root/,
      /html/,
      /body/,
      /main/,
      // Force la capture des règles de dimensionnement critique
      /aspect-ratio/,
      /padding-top/, // Vital pour compenser le menu fixe
      /min-height/,
      /\.site-hero/,
      /\.about-section/,
      /\.portfolio-card/,
      /\.navbar/,
      /\.col-/,
    ],
  });
})();
