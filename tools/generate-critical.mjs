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
        // 1. NAVIGATION & LOGO (Vital pour le score CLS)
        ".navbar",
        ".navbar-brand",
        ".navbar-brand img", // Force le style du logo
        ".site-navigation",
        ".navbar-collapse",
        ".navbar-nav",

        // 2. HERO IMAGE & TEXTE
        ".site-hero",
        ".site-hero img", // Force le style de l'image hero (aspect-ratio)
        ".grand-titre",
        ".hero-description",
        ".hero-actions",

        // 3. ABOUT IMAGE
        ".about-section",
        ".about-decor-img", // Force le style de l'image about

        // 4. CLASSES UTILITAIRES
        ".img-fluid",
        ".d-block",
        ".d-none",
      ],
    },

    // On garde les grandes dimensions pour bien capturer le layout desktop
    dimensions: [
      { height: 1200, width: 375 },
      { height: 1200, width: 1440 },
      { height: 1200, width: 1920 },
    ],

    include: [
      /:root/,
      /html/,
      /body/,
      // Regex pour capturer toutes les règles d'aspect-ratio
      /aspect-ratio/,
      /\.site-hero/,
      /\.about-section/,
      /\.navbar/,
      /\.container/,
      /\.row/,
      /\.col-/,
    ],
  });
})();
